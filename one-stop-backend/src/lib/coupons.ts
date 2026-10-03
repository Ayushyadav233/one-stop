import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { coupons, couponUses, orders } from "../db/schema.js";

export type CouponRow = typeof coupons.$inferSelect;

/** Discount math — app quoteStore ke same formula (single source yahi). */
export function couponDiscount(cp: CouponRow, subtotal: number): number {
  const d = Math.min(
    Math.round((subtotal * Number(cp.offPct ?? 0)) / 100),
    Number(cp.maxOff ?? 0),
    subtotal,
  );
  return Math.max(0, d);
}

function inWindow(cp: CouponRow, now = Date.now()): boolean {
  if (cp.startsAt && new Date(cp.startsAt).getTime() > now) return false;
  if (cp.expiresAt && new Date(cp.expiresAt).getTime() < now) return false;
  return true;
}

async function userUseCount(userId: string, couponId: string): Promise<number> {
  try {
    const r = await db.execute(
      sql`select count(*)::int as n from osb_coupon_uses where user_id = ${userId} and coupon_id = ${couponId}`,
    );
    return Number((r.rows?.[0] as { n?: number } | undefined)?.n ?? 0);
  } catch {
    return 0;
  }
}

async function userOrderCount(phone: string): Promise<number> {
  try {
    const r = await db.execute(sql`select count(*)::int as n from osb_orders where customer_phone = ${phone}`);
    return Number((r.rows?.[0] as { n?: number } | undefined)?.n ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Milestone progress: kitne DELIVERED orders (cancelled/refund nahi ginte).
 * minValue > 0 ho to sirf utne+ total wale orders (e.g. "₹199+ ke 5 order").
 * Phone dono taraf normalize (app "+91 ..." bhejta hai, users me 10-digit).
 */
export async function userQualifiedOrders(phone: string, minValue = 0): Promise<number> {
  try {
    const digits = String(phone ?? "").replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) return 0;
    const r = await db.execute(
      sql`select count(*)::int as n from osb_orders where right(regexp_replace(customer_phone, '\\D', '', 'g'), 10) = ${digits} and status = 'delivered' and total >= ${Math.max(0, Math.round(minValue))}`,
    );
    return Number((r.rows?.[0] as { n?: number } | undefined)?.n ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Full guard check (validate + order dono yahi use karte hain).
 * Returns { ok, discount } ya { ok:false, error } with user-facing Hindi reason.
 */
export async function checkCoupon(
  code: string,
  subtotal: number,
  user: { id: string; phone: string },
  opts?: { storeKey?: string },
): Promise<{ ok: true; coupon: CouponRow; discount: number } | { ok: false; error: string }> {
  const c = code.trim().toUpperCase().slice(0, 32);
  if (!c) return { ok: false, error: "code required" };
  let rows: CouponRow[];
  try {
    rows = await db.select().from(coupons);
  } catch {
    return { ok: false, error: "coupons unavailable" };
  }
  const cp = rows.find((r) => String(r.code ?? "").toUpperCase() === c);
  if (!cp) return { ok: false, error: "invalid code" };
  if (cp.active === false) return { ok: false, error: "ye coupon ab bandh hai" };
  if (!inWindow(cp)) {
    if (cp.startsAt && new Date(cp.startsAt).getTime() > Date.now()) return { ok: false, error: "ye coupon abhi live nahi hua" };
    return { ok: false, error: "ye coupon expire ho gaya" };
  }
  // Seller coupon sirf usi store pe.
  if (cp.fundedBy === "seller" && cp.storeKey && opts?.storeKey && cp.storeKey !== opts.storeKey) {
    return { ok: false, error: "ye coupon is store pe valid nahi" };
  }
  const minOrder = Number(cp.minOrder ?? 0);
  if (subtotal < minOrder) return { ok: false, error: `min order ₹${minOrder} pe lagega` };
  // Per-user limit.
  const perUser = Number(cp.maxUsesPerUser ?? 1);
  if (perUser > 0) {
    const used = await userUseCount(user.id, cp.id);
    if (used >= perUser) return { ok: false, error: "tum ye coupon use kar chuke ho" };
  }
  // First-order-only (BAZAR50).
  if (cp.firstOrderOnly) {
    const n = await userOrderCount(user.phone);
    if (n > 0) return { ok: false, error: "ye coupon sirf pehle order pe lagta hai" };
  }
  // Milestone lock (loyalty ladder): N delivered orders ke baad unlock.
  // Server-side guard — app me code type karke bypass impossible.
  const needOrders = Number(cp.minOrders ?? 0);
  if (needOrders > 0) {
    const minVal = Number(cp.minOrderValue ?? 0);
    const have = await userQualifiedOrders(user.phone, minVal);
    if (have < needOrders) {
      const more = needOrders - have;
      return {
        ok: false,
        error: minVal > 0
          ? `locked — ${more} aur ₹${minVal}+ order pe unlock`
          : `locked — ${more} aur order pe unlock`,
      };
    }
  }
  // Total uses cap.
  if (cp.maxUsesTotal != null && Number(cp.usesTotal ?? 0) >= Number(cp.maxUsesTotal)) {
    return { ok: false, error: "coupon limit khatm — agla offer dekho" };
  }
  const discount = couponDiscount(cp, subtotal);
  // Budget cap (projected discount milake).
  if (cp.maxBudget != null && Number(cp.budgetUsed ?? 0) + discount > Number(cp.maxBudget)) {
    return { ok: false, error: "coupon budget khatm — agla offer dekho" };
  }
  return { ok: true, coupon: cp, discount };
}

/** Order success pe counters + ledger row (validate pe NAHI — quota sirf kharid pe jale). */
export async function consumeCoupon(
  cp: CouponRow,
  userId: string,
  orderCode: string,
  discount: number,
): Promise<void> {
  try {
    await db.insert(couponUses).values({
      userId,
      couponId: cp.id,
      code: cp.code,
      orderCode: orderCode.slice(0, 24),
      discount,
      fundedBy: cp.fundedBy ?? "platform",
      storeKey: cp.storeKey ?? null,
    });
  } catch { /* ledger best-effort */ }
  try {
    await db
      .update(coupons)
      .set({
        usesTotal: Number(cp.usesTotal ?? 0) + 1,
        budgetUsed: Number(cp.budgetUsed ?? 0) + discount,
      })
      .where(eq(coupons.id, cp.id));
  } catch { /* counter best-effort */ }
}

/** Milestone ladder idempotent seed — code ho to skip, nahi to banao. */
export async function ensureMilestoneCoupons(list: {
  code: string; title: string; detail: string; offPct: number; maxOff: number;
  minOrder: number; minOrders: number; minOrderValue: number; maxBudget: number;
}[]): Promise<number> {
  let added = 0;
  for (const m of list) {
    try {
      const code = String(m.code ?? "").trim().toUpperCase().slice(0, 32);
      if (!code) continue;
      const rows = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, code)).limit(1);
      if (rows[0]) continue;
      await db.insert(coupons).values({
        code,
        title: String(m.title ?? code).slice(0, 180),
        detail: String(m.detail ?? "").slice(0, 320),
        offPct: Math.max(1, Math.min(90, Math.round(m.offPct))),
        maxOff: Math.max(1, Math.round(m.maxOff)),
        minOrder: Math.max(0, Math.round(m.minOrder)),
        kind: "all",
        fundedBy: "platform",
        active: true,
        maxUsesPerUser: 1,
        minOrders: Math.max(0, Math.round(m.minOrders)),
        minOrderValue: Math.max(0, Math.round(m.minOrderValue)),
        maxBudget: Math.max(1, Math.round(m.maxBudget)),
      });
      added++;
    } catch { /* next */ }
  }
  return added;
}

/** Seller apne store ka coupon banaye — kharcha uske hisse (fundedBy=seller). */
export async function createSellerCoupon(
  ownerStoreKey: string,
  input: { code: string; title: string; detail?: string | null; offPct: number; maxOff: number; minOrder: number },
): Promise<CouponRow> {
  const rows = await db
    .insert(coupons)
    .values({
      code: input.code.trim().toUpperCase().slice(0, 32),
      title: input.title.trim().slice(0, 180),
      detail: (input.detail ?? `Sirf is store pe • min ₹${input.minOrder}`).slice(0, 320),
      offPct: Math.max(1, Math.min(90, Math.round(input.offPct))),
      maxOff: Math.max(1, Math.round(input.maxOff)),
      minOrder: Math.max(0, Math.round(input.minOrder)),
      kind: "store",
      fundedBy: "seller",
      storeKey: ownerStoreKey.slice(0, 40),
      active: true,
      maxUsesPerUser: 1,
    })
    .returning();
  return rows[0];
}

export async function sellerCouponsByStore(storeKey: string): Promise<CouponRow[]> {
  try {
    const rows = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.fundedBy, "seller"), eq(coupons.storeKey, storeKey)));
    const now = Date.now();
    return rows.filter((r) => r.active !== false && inWindow(r, now));
  } catch {
    return [];
  }
}
