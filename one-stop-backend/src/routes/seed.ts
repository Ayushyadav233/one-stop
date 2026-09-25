import { Hono } from "hono";
import { db } from "../db/index.js";
import { coupons, products, stores } from "../db/schema.js";
import { COUPONS, PRODUCTS, STORES } from "../db/static-data.js";
import { sql } from "drizzle-orm";

export const seedRoute = new Hono();

async function doSeed() {
  await db.execute(sql`select 1`);
  const existing = await db.select({ id: stores.id }).from(stores).limit(1);
  if (existing.length > 0) return { ok: true as const, seeded: false as const, note: "already seeded" };
  const idMap = new Map<string, string>();
  for (const s of STORES) {
    const rows = await db
      .insert(stores)
      .values({
        name: s.name,
        slug: s.slug,
        kind: s.kind,
        tagline: s.tagline,
        image: (s as unknown as { image: string }).image ?? (s as unknown as { emoji: string }).emoji,
        rating: String(s.rating),
        ratingsCount: 1200,
        etaMins: s.etaMins,
        deliveryFee: s.deliveryFee,
        distanceKm: String(s.distanceKm),
        address: s.address,
        isOpen: true,
        isPureVeg: !!(s as unknown as { isPureVeg?: boolean }).isPureVeg,
        offers: s.offers,
        tags: s.tags,
        openHours: s.openHours,
        healthScore: s.healthScore,
      })
      .returning({ id: stores.id });
    if (rows[0]) idMap.set((s as unknown as { id: string }).id, rows[0].id);
  }
  for (const p of PRODUCTS) {
    await db.insert(products).values({
      storeId: idMap.get((p as unknown as { storeId: string }).storeId) as never,
      name: p.name,
      description: p.description,
      price: p.price,
      mrp: p.mrp,
      image: (p as unknown as { image: string }).image ?? (p as unknown as { emoji: string }).emoji,
      emoji: p.emoji,
      category: p.category,
      rating: String(p.rating),
      isVeg: p.isVeg,
      isBestseller: !!(p as unknown as { isBestseller?: boolean }).isBestseller,
      stock: p.stock,
      unit: p.unit,
    });
  }
  for (const cp of COUPONS) {
    await db.insert(coupons).values({
      code: (cp as unknown as { code: string }).code,
      title: (cp as unknown as { title: string }).title,
      detail: (cp as unknown as { detail?: string }).detail,
      offPct: (cp as unknown as { offPct?: number }).offPct ?? 20,
      maxOff: (cp as unknown as { maxOff?: number }).maxOff ?? 120,
      minOrder: (cp as unknown as { minOrder?: number }).minOrder ?? 149,
    });
  }
  return { ok: true as const, seeded: true as const, stores: STORES.length, products: PRODUCTS.length };
}

// POST + GET both supported (same as Next route)
seedRoute.post("/", async (c) => {
  try {
    return c.json(await doSeed());
  } catch (e) {
    return c.json({ ok: false, error: String(e).slice(0, 500) }, 500);
  }
});

seedRoute.get("/", async (c) => {
  try {
    return c.json(await doSeed());
  } catch (e) {
    return c.json({ ok: false, error: String(e).slice(0, 500) }, 500);
  }
});
