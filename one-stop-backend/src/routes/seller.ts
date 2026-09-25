import { Hono } from "hono";
import { db } from "../db/index.js";
import { products, sellerStores } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { auth, getUser } from "../middleware/auth.js";

export const sellerRoute = new Hono();

// ---- Seller store (provider device sync) ----
sellerRoute.get("/store", auth, async (c) => {
  const u = getUser(c);
  const rows = await db.select().from(sellerStores).where(eq(sellerStores.ownerId, u.id)).limit(20);
  return c.json({ stores: rows });
});

sellerRoute.post("/store", auth, async (c) => {
  const u = getUser(c);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const name = String(b.name ?? "").trim().slice(0, 160);
  if (!name) return c.json({ ok: false, error: "name required" }, 400);
  const slug = String(b.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).slice(0, 180);
  const rows = await db
    .insert(sellerStores)
    .values({
      ownerId: u.id,
      name,
      slug,
      kind: String(b.kind ?? "food").slice(0, 32),
      tagline: typeof b.tagline === "string" ? String(b.tagline).slice(0, 240) : null,
      image: typeof b.image === "string" ? b.image : null,
      address: typeof b.address === "string" ? String(b.address).slice(0, 320) : null,
      isOpen: typeof b.isOpen === "boolean" ? b.isOpen : true,
    })
    .returning();
  return c.json({ ok: true, store: rows[0] });
});

sellerRoute.patch("/store/:id", auth, async (c) => {
  const u = getUser(c);
  const id = c.req.param("id") ?? "";
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};
  for (const k of ["name", "tagline", "image", "address", "kind"]) if (typeof b[k] === "string") patch[k] = String(b[k]).slice(0, 320);
  if (typeof b.isOpen === "boolean") patch.isOpen = b.isOpen;
  if (Object.keys(patch).length === 0) return c.json({ ok: false, error: "empty" }, 400);
  const rows = await db.update(sellerStores).set(patch).where(and(eq(sellerStores.id, id), eq(sellerStores.ownerId, u.id))).returning();
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  return c.json({ ok: true, store: rows[0] });
});

// ---- Seller catalog (provider add/edit, dusre phone pe dikhega) ----
sellerRoute.get("/products", async (c) => {
  const storeId = c.req.query("storeId");
  try {
    const rows = await db.select().from(products).limit(200);
    const list = storeId ? rows.filter((r) => String((r as { storeId?: string }).storeId ?? "") === storeId) : rows;
    return c.json({ products: list });
  } catch (e) {
    return c.json({ ok: false, error: String(e).slice(0, 300) }, 500);
  }
});

sellerRoute.post("/products", auth, async (c) => {
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const name = String(b.name ?? "").trim().slice(0, 180);
  const price = Number(b.price ?? NaN);
  if (!name || !Number.isFinite(price)) return c.json({ ok: false, error: "name+price required" }, 400);
  try {
    const rows = await db
      .insert(products)
      .values({
        storeId: (typeof b.storeId === "string" ? b.storeId : null) as never,
        name,
        description: typeof b.description === "string" ? String(b.description).slice(0, 480) : null,
        price: Math.round(price),
        mrp: Number.isFinite(Number(b.mrp)) ? Math.round(Number(b.mrp)) : null,
        image: typeof b.image === "string" ? b.image : typeof b.emoji === "string" ? b.emoji : null,
        emoji: typeof b.emoji === "string" ? String(b.emoji).slice(0, 16) : "🍔",
        category: typeof b.category === "string" ? String(b.category).slice(0, 80) : null,
        rating: "4.4",
        isVeg: typeof b.isVeg === "boolean" ? b.isVeg : true,
        isBestseller: !!b.isBestseller,
        stock: Number.isFinite(Number(b.stock)) ? Math.round(Number(b.stock)) : 50,
        unit: typeof b.unit === "string" ? String(b.unit).slice(0, 40) : "1 pc",
      })
      .returning();
    return c.json({ ok: true, product: rows[0] });
  } catch (e) {
    return c.json({ ok: false, error: String(e).slice(0, 300) }, 500);
  }
});

sellerRoute.patch("/products/:id", auth, async (c) => {
  const id = c.req.param("id") ?? "";
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string") patch.name = String(b.name).slice(0, 180);
  if (typeof b.description === "string") patch.description = String(b.description).slice(0, 480);
  if (b.price !== undefined && Number.isFinite(Number(b.price))) patch.price = Math.round(Number(b.price));
  if (b.mrp !== undefined && Number.isFinite(Number(b.mrp))) patch.mrp = Math.round(Number(b.mrp));
  if (typeof b.image === "string") patch.image = b.image;
  if (typeof b.emoji === "string") patch.emoji = String(b.emoji).slice(0, 16);
  if (typeof b.category === "string") patch.category = String(b.category).slice(0, 80);
  if (typeof b.isVeg === "boolean") patch.isVeg = b.isVeg;
  if (typeof b.isBestseller === "boolean") patch.isBestseller = b.isBestseller;
  if (b.stock !== undefined && Number.isFinite(Number(b.stock))) patch.stock = Math.round(Number(b.stock));
  if (typeof b.unit === "string") patch.unit = String(b.unit).slice(0, 40);
  if (Object.keys(patch).length === 0) return c.json({ ok: false, error: "empty" }, 400);
  const rows = await db.update(products).set(patch).where(eq(products.id, id)).returning();
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  return c.json({ ok: true, product: rows[0] });
});

sellerRoute.delete("/products/:id", auth, async (c) => {
  const id = c.req.param("id") ?? "";
  const { eq: eq2 } = await import("drizzle-orm");
  await db.delete(products).where(eq2(products.id, id));
  return c.json({ ok: true, id });
});
