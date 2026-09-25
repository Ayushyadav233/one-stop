import { NextResponse } from "next/server";
import { db } from "@/db";
import { coupons, orders, products, stores } from "@/db/schema";
import { COUPONS, PRODUCTS, STORES } from "@/lib/data";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    await db.execute(sql`select 1`);
    const existing = await db.select({ id: stores.id }).from(stores).limit(1);
    if (existing.length > 0) return NextResponse.json({ ok: true, seeded: false, note: "already seeded" });
    const idMap = new Map<string, string>();
    for (const s of STORES) {
      const rows = await db
        .insert(stores)
        .values({
          name: s.name,
          slug: s.slug,
          kind: s.kind,
          tagline: s.tagline,
          image: (s as unknown as { image: string }).image ?? s.emoji,
          rating: String(s.rating),
          ratingsCount: 1200,
          etaMins: s.etaMins,
          deliveryFee: s.deliveryFee,
          distanceKm: String(s.distanceKm),
          address: s.address,
          isOpen: true,
          isPureVeg: !!s.isPureVeg,
          offers: s.offers,
          tags: s.tags,
          openHours: s.openHours,
          healthScore: s.healthScore,
        })
        .returning({ id: stores.id });
      if (rows[0]) idMap.set(s.id, rows[0].id);
    }
    for (const p of PRODUCTS) {
      await db.insert(products).values({
        storeId: idMap.get(p.storeId) as never,
        name: p.name,
        description: p.description,
        price: p.price,
        mrp: p.mrp,
        image: (p as unknown as { image: string }).image ?? p.emoji,
        emoji: p.emoji,
        category: p.category,
        rating: String(p.rating),
        isVeg: p.isVeg,
        isBestseller: !!p.isBestseller,
        stock: p.stock,
        unit: p.unit,
      });
    }
    for (const cp of COUPONS) {
      await db.insert(coupons).values({ code: cp.code, title: cp.title, detail: cp.detail, offPct: cp.offPct, maxOff: cp.maxOff, minOrder: cp.minOrder });
    }
    return NextResponse.json({ ok: true, seeded: true, stores: STORES.length, products: PRODUCTS.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 500) }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
