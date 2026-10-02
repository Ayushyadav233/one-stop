import { Hono } from "hono";
import { db } from "../db/index.js";
import { coupons, products, stores } from "../db/schema.js";
import { COUPONS, PRODUCTS, STORES } from "../db/static-data.js";
import { sql } from "drizzle-orm";
import { logOk } from "../lib/logger.js";

export const seedRoute = new Hono();

async function doSeed() {
  await db.execute(sql`select 1`);
  const existing = await db.select({ id: stores.id }).from(stores).limit(1);
  if (existing.length > 0) {
    // Resumable top-up: purana partial seed (stores bina products) khud heal ho.
    // Shell boot pe /api/seed hit karta hai — agle restart pe data poora.
    const topped = await topUpMissing().catch(() => ({ products: 0, coupons: 0 }));
    if ((topped.products ?? 0) > 0 || (topped.coupons ?? 0) > 0)
      return { ok: true as const, seeded: true as const, note: "topped-up partial seed", ...topped };
    return { ok: true as const, seeded: false as const, note: "already seeded" };
  }
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
    const etaStr = String((p as unknown as { eta?: unknown }).eta ?? "");
    const etaM = /(\d+)/.exec(etaStr)?.[1];
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
      etaMins: etaM ? Number(etaM) : undefined,
    });
  }
  for (const cp of COUPONS) {
    const ccode = (cp as unknown as { code: string }).code;
    await db.insert(coupons).values({
      code: ccode,
      title: (cp as unknown as { title?: string }).title ?? ccode,
      detail: (cp as unknown as { detail?: string }).detail,
      offPct: (cp as unknown as { offPct?: number }).offPct ?? 20,
      maxOff: (cp as unknown as { maxOff?: number }).maxOff ?? 120,
      minOrder: (cp as unknown as { minOrder?: number }).minOrder ?? 149,
    });
  }
  return { ok: true as const, seeded: true as const, stores: STORES.length, products: PRODUCTS.length };
}

/** Partial DB heal: products/coupons khaali ho to static seed se top-up (kuch delete nahi). */
async function topUpMissing(): Promise<{ products: number; coupons: number }> {
  const out = { products: 0, coupons: 0 };
  const prodRows = await db.select({ id: products.id }).from(products).limit(1);
  if (prodRows.length === 0) {
    const allStores = await db.select().from(stores);
    const bySlug = new Map(allStores.map((s) => [s.slug, s.id]));
    const byStaticId = new Map<string, string>();
    for (const s of STORES) {
      const uuid = bySlug.get(s.slug);
      if (uuid) byStaticId.set((s as unknown as { id: string }).id, uuid);
    }
    for (const p of PRODUCTS) {
      const sid = byStaticId.get((p as unknown as { storeId: string }).storeId);
      if (!sid) continue;
      const etaStr = String((p as unknown as { eta?: unknown }).eta ?? "");
      const etaM = /(\d+)/.exec(etaStr)?.[1];
      await db.insert(products).values({
        storeId: sid as never,
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
        etaMins: etaM ? Number(etaM) : undefined,
      });
      out.products++;
    }
    logOk(`[seed] topped-up ${out.products} products (partial DB tha)`);
  }
  const coupRows = await db.select({ id: coupons.id }).from(coupons).limit(1);
  if (coupRows.length === 0) {
    for (const cp of COUPONS) {
      const ccode = (cp as unknown as { code: string }).code;
      await db.insert(coupons).values({
        code: ccode,
        title: (cp as unknown as { title?: string }).title ?? ccode,
        detail: (cp as unknown as { detail?: string }).detail,
        offPct: (cp as unknown as { offPct?: number }).offPct ?? 20,
        maxOff: (cp as unknown as { maxOff?: number }).maxOff ?? 120,
        minOrder: (cp as unknown as { minOrder?: number }).minOrder ?? 149,
      });
      out.coupons++;
    }
    logOk(`[seed] topped-up ${out.coupons} coupons (partial DB tha)`);
  }
  return out;
}

// POST + GET both supported (same as Next route)
seedRoute.post("/", async (c) => {
  try {
    const r = await doSeed();
    logOk(`[seed] ${"seeded" in r && r.seeded ? `fresh 🌱 ${r.stores} stores · ${r.products} products` : "already seeded, skip"}`);
    return c.json(r);
  } catch (e) {
    return c.json({ ok: false, error: String(e).slice(0, 500) }, 500);
  }
});

seedRoute.get("/", async (c) => {
  try {
    const r = await doSeed();
    logOk(`[seed] ${"seeded" in r && r.seeded ? `fresh 🌱 ${r.stores} stores · ${r.products} products` : "already seeded, skip"}`);
    return c.json(r);
  } catch (e) {
    return c.json({ ok: false, error: String(e).slice(0, 500) }, 500);
  }
});
