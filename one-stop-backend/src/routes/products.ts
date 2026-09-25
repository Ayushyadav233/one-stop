import { Hono } from "hono";
import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { PRODUCTS } from "../db/static-data.js";

export const productsRoute = new Hono();

// GET /api/products?storeId= — same contract: { products, source: db|static }
productsRoute.get("/", async (c) => {
  const storeId = c.req.query("storeId");
  try {
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
