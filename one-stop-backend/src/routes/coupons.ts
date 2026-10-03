import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { coupons } from "../db/schema.js";
import { auth, getUser } from "../middleware/auth.js";
import { checkCoupon, userQualifiedOrders } from "../lib/coupons.js";
import { logInfo, logWarn } from "../lib/logger.js";

export const couponsRoute = new Hono();

function publicCoupon(r: typeof coupons.$inferSelect) {
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    detail: r.detail,
    offPct: r.offPct,
    maxOff: r.maxOff,
    minOrder: r.minOrder,
    kind: r.kind,
    fundedBy: r.fundedBy ?? "platform",
    storeKey: r.storeKey ?? null,
    active: r.active ?? true,
    startsAt: r.startsAt ?? null,
    expiresAt: r.expiresAt ?? null,
    maxUsesPerUser: r.maxUsesPerUser ?? 1,
    firstOrderOnly: r.firstOrderOnly ?? false,
    minOrders: Number(r.minOrders ?? 0),
    minOrderValue: Number(r.minOrderValue ?? 0),
  };
}

// GET /api/coupons — sirf live coupons (active + window). ?storeKey= se us store ke offers bhi.
couponsRoute.get("/", async (c) => {
  const storeKey = (c.req.query("storeKey") ?? "").slice(0, 40);
  try {
    const rows = await db.select().from(coupons).limit(100);
    const now = Date.now();
    const live = rows.filter((r) => {
      if (r.active === false) return false;
      if (r.startsAt && new Date(r.startsAt).getTime() > now) return false;
      if (r.expiresAt && new Date(r.expiresAt).getTime() < now) return false;
      // Milestone wale /milestones endpoint pe (locked progress ke saath) — yaha sirf usable.
      if (Number(r.minOrders ?? 0) > 0) return false;
      // Seller coupon: ya to uske store ke liye manga ho, ya chhupao.
      if (r.fundedBy === "seller" && r.storeKey && storeKey && r.storeKey !== storeKey) return false;
      if (r.fundedBy === "seller" && r.storeKey && !storeKey) return true; // list me "store offer" tag ke saath
      if (r.maxUsesTotal != null && Number(r.usesTotal ?? 0) >= Number(r.maxUsesTotal)) return false;
      return true;
    });
    return c.json({ coupons: live.map(publicCoupon) });
  } catch {
    return c.json({ coupons: [] });
  }
});

function num(v: unknown, d: number): number {
  return Number.isFinite(Number(v)) ? Math.round(Number(v)) : d;
}

// POST /api/coupons — platform campaign (admin). Limits yahi set hote hain.
couponsRoute.post("/", auth, async (c) => {
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const code = String(b.code ?? "").trim().slice(0, 32);
  const title = String(b.title ?? "").trim().slice(0, 180);
  if (!code || !title) return c.json({ ok: false, error: "code+title required" }, 400);
  const rows = await db
    .insert(coupons)
    .values({
      code: code.toUpperCase(),
      title,
      detail: typeof b.detail === "string" ? String(b.detail).slice(0, 320) : null,
      offPct: Math.max(1, Math.min(90, num(b.offPct, 20))),
      maxOff: Math.max(1, num(b.maxOff, 120)),
      minOrder: Math.max(0, num(b.minOrder, 149)),
      kind: typeof b.kind === "string" ? String(b.kind).slice(0, 32) : "all",
      fundedBy: "platform",
      active: typeof b.active === "boolean" ? b.active : true,
      startsAt: typeof b.startsAt === "string" && b.startsAt ? new Date(b.startsAt) : null,
      expiresAt: typeof b.expiresAt === "string" && b.expiresAt ? new Date(b.expiresAt) : null,
      maxUsesTotal: b.maxUsesTotal != null && Number.isFinite(Number(b.maxUsesTotal)) ? Math.round(Number(b.maxUsesTotal)) : null,
      maxUsesPerUser: b.maxUsesPerUser != null ? Math.max(1, Math.round(Number(b.maxUsesPerUser))) : 1,
      firstOrderOnly: !!b.firstOrderOnly,
      minOrders: b.minOrders != null && Number.isFinite(Number(b.minOrders)) ? Math.max(0, Math.round(Number(b.minOrders))) : 0,
      minOrderValue: b.minOrderValue != null && Number.isFinite(Number(b.minOrderValue)) ? Math.max(0, Math.round(Number(b.minOrderValue))) : 0,
      maxBudget: b.maxBudget != null && Number.isFinite(Number(b.maxBudget)) ? Math.round(Number(b.maxBudget)) : null,
    })
    .returning();
  logInfo(`[coupon] launched ${rows[0].code}`, `funded=platform firstOnly=${!!b.firstOrderOnly}`);
  return c.json({ ok: true, coupon: publicCoupon(rows[0]) });
});

couponsRoute.patch("/:id", auth, async (c) => {
  const id = c.req.param("id") ?? "";
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};
  // Kill-switch + limits — leak hote hi yahi se bandh karo.
  if (typeof b.active === "boolean") patch.active = b.active;
  if (typeof b.title === "string" && b.title.trim()) patch.title = String(b.title).slice(0, 180);
  if (typeof b.detail === "string") patch.detail = String(b.detail).slice(0, 320);
  if (b.offPct !== undefined && Number.isFinite(Number(b.offPct))) patch.offPct = Math.max(1, Math.min(90, Math.round(Number(b.offPct))));
  if (b.maxOff !== undefined && Number.isFinite(Number(b.maxOff))) patch.maxOff = Math.max(1, Math.round(Number(b.maxOff)));
  if (b.minOrder !== undefined && Number.isFinite(Number(b.minOrder))) patch.minOrder = Math.max(0, Math.round(Number(b.minOrder)));
  if (b.maxUsesTotal !== undefined) patch.maxUsesTotal = b.maxUsesTotal == null ? null : Math.max(1, Math.round(Number(b.maxUsesTotal)));
  if (b.maxUsesPerUser !== undefined && Number.isFinite(Number(b.maxUsesPerUser))) patch.maxUsesPerUser = Math.max(1, Math.round(Number(b.maxUsesPerUser)));
  if (typeof b.firstOrderOnly === "boolean") patch.firstOrderOnly = b.firstOrderOnly;
  if (b.minOrders !== undefined && Number.isFinite(Number(b.minOrders))) patch.minOrders = Math.max(0, Math.round(Number(b.minOrders)));
  if (b.minOrderValue !== undefined && Number.isFinite(Number(b.minOrderValue))) patch.minOrderValue = Math.max(0, Math.round(Number(b.minOrderValue)));
  if (b.maxBudget !== undefined) patch.maxBudget = b.maxBudget == null ? null : Math.max(1, Math.round(Number(b.maxBudget)));
  if (typeof b.expiresAt === "string") patch.expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
  if (typeof b.startsAt === "string") patch.startsAt = b.startsAt ? new Date(b.startsAt) : null;
  if (Object.keys(patch).length === 0) return c.json({ ok: false, error: "empty" }, 400);
  const rows = await db.update(coupons).set(patch).where(eq(coupons.id, id)).returning();
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  return c.json({ ok: true, coupon: publicCoupon(rows[0]) });
});

couponsRoute.delete("/:id", auth, async (c) => {
  const id = c.req.param("id") ?? "";
  await db.delete(coupons).where(eq(coupons.id, id));
  return c.json({ ok: true, id });
});

// GET /api/coupons/milestones (auth) — loyalty ladder + per-user progress.
// Locked coupons bhi dikhte hain (progress ke saath) taaki motivation bane;
// apply sirf unlocked pe (validate me server guard hai).
couponsRoute.get("/milestones", auth, async (c) => {
  const u = getUser(c);
  try {
    const rows = await db.select().from(coupons).limit(100);
    const now = Date.now();
    const live = rows.filter((r) => {
      if (r.active === false) return false;
      if (Number(r.minOrders ?? 0) <= 0) return false;
      if (r.startsAt && new Date(r.startsAt).getTime() > now) return false;
      if (r.expiresAt && new Date(r.expiresAt).getTime() < now) return false;
      if (r.maxUsesTotal != null && Number(r.usesTotal ?? 0) >= Number(r.maxUsesTotal)) return false;
      return true;
    });
    const out: { coupon: ReturnType<typeof publicCoupon>; need: number; have: number; unlocked: boolean }[] = [];
    for (const r of live) {
      const need = Number(r.minOrders ?? 0);
      const have = await userQualifiedOrders(u.phone, Number(r.minOrderValue ?? 0));
      out.push({ coupon: publicCoupon(r), need, have: Math.min(have, need), unlocked: have >= need });
    }
    out.sort((a, b) => a.need - b.need);
    return c.json({ milestones: out });
  } catch {
    return c.json({ milestones: [] });
  }
});

// Validate — LOGIN REQUIRED (fail-closed). Saare guardrails yahi check hote hain.
// Body: { code, subtotal, storeKey? } -> { ok, coupon, discount } ya { ok:false, error }
couponsRoute.post("/validate", auth, async (c) => {
  const u = getUser(c);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const code = String(b.code ?? "").trim().toUpperCase().slice(0, 32);
  const subtotal = Math.max(0, Math.round(Number(b.subtotal ?? 0)));
  const storeKey = typeof b.storeKey === "string" ? b.storeKey.slice(0, 40) : undefined;
  if (!code) return c.json({ ok: false, error: "code required" }, 400);
  const r = await checkCoupon(code, subtotal, { id: u.id, phone: u.phone }, { storeKey });
  if (!r.ok) {
    logWarn(`[coupon] reject ${code}`, r.error);
    return c.json({ ok: false, error: r.error }, 400);
  }
  logInfo(`[coupon] ${code} → −₹${r.discount}`, `on ₹${subtotal} funded=${r.coupon.fundedBy ?? "platform"}`);
  return c.json({ ok: true, coupon: publicCoupon(r.coupon), discount: r.discount });
});
