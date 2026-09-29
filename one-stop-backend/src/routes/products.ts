import { Hono } from "hono";
import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { PRODUCTS } from "../db/static-data.js";
import { sql } from "drizzle-orm";

export const productsRoute = new Hono();

let ensuredProdEta = false;
/** eta_mins on old DBs + backfill unknowns from the parent store's own time. */
async function ensureProdEta() {
  if (ensuredProdEta) return;
  ensuredProdEta = true;
  try {
    await db.execute(sql`ALTER TABLE "osb_products" ADD COLUMN IF NOT EXISTS "eta_mins" integer`);
    await db.execute(sql`
      UPDATE "osb_products" p SET "eta_mins" = s."eta_mins"
      FROM "osb_stores" s WHERE p."store_id" = s."id" AND p."eta_mins" IS NULL
    `);
  } catch { /* fail-soft: static fallback below still carries eta strings */ }
}

// GET /api/products?storeId= — same contract: { products, source: db|static }
productsRoute.get("/", async (c) => {
  const storeId = c.req.query("storeId");
  try {
    await ensureProdEta();
    const rows = await db.select().from(products).limit(100);
    if (rows.length === 0) {
      const list = storeId ? (PRODUCTS as unknown as Record<string, unknown>[]).filter((p) => (p as { storeId?: string }).storeId === storeId) : PRODUCTS;
      return c.json({ products: list, source: "static" });
    }
    const list = storeId ? rows.filter((r) => (r as { storeId?: string }).storeId === storeId) : rows;
    return c.json({ products: list, source: "db" });
  } catch {
    const list = storeId ? (PRODUCTS as unknown as Record<string, unknown>[]).filter((p) => (p as { storeId?: string }).storeId === storeId) : PRODUCTS;
    return c.json({ products: list, source: "static" });
  }
});
