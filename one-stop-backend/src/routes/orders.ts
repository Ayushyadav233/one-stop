import { Hono } from "hono";
import { db } from "../db/index.js";
import { orders, users } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";
import { notifyUserPhones } from "../lib/push.js";
import { checkCoupon, consumeCoupon } from "../lib/coupons.js";
import { logError, logInfo, logOk, logWarn } from "../lib/logger.js";

export const ordersRoute = new Hono();

// Order status → customer push copy (phase-2 scope: status updates only).
const STATUS_PUSH: Record<string, { title: string; body: (code: string) => string }> = {
  accepted: { title: "Order accepted ✅", body: (code) => `Store ne ${code} accept kiya — taiyaari shuru!` },
  ready: { title: "Order ready 📦", body: (code) => `${code} pickup ke liye ready hai.` },
  onway: { title: "Rider on the way 🛵", body: (code) => `${code} lekar rider nikal chuka hai.` },
  delivered: { title: "Delivered 🎉", body: (code) => `${code} deliver ho gaya. Enjoy!` },
};
// Service bookings (Amazon style): confirm → hold → out for service → reached → done.
const SERVICE_PUSH: Record<string, { title: string; body: (code: string) => string }> = {
  accepted: { title: "Booking confirmed 🗓", body: (code) => `${code} ka slot lock ho gaya — pro time pe aayega!` },
  ready: { title: "Pro has reached ✓", body: (code) => `Aapka pro pahunch gaya hai (${code}).` },
  onway: { title: "Pro is on the way 🛠️", body: (code) => `${code} ke liye pro nikal chuka hai — live dekho.` },
  delivered: { title: "Service completed 🎉", body: (code) => `${code} poori ho gayi. Pro ko rate karo!` },
};

// GET /api/orders — same contract: { orders: rows[80] }, fail-soft []
ordersRoute.get("/", async (c) => {
  try {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(80);
    return c.json({ orders: rows });
  } catch {
    return c.json({ orders: [] });
  }
});

// POST /api/orders — coupon ho to server verify (client discount blind accept NAHI).
// couponCode bina login ke kabhi nahi lagega (fail-closed: 400).
ordersRoute.post("/", async (c) => {
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const code = String(b.code ?? "#OSB-" + Math.floor(1000 + Math.random() * 9000)).slice(0, 24);
  const subtotal = Math.max(0, Math.round(Number(b.subtotal ?? 0)));
  const deliveryFee = Math.max(0, Math.round(Number(b.deliveryFee ?? 0)));
  let discount = Math.max(0, Math.round(Number(b.discount ?? 0)));
  const couponCode = String(b.couponCode ?? "").trim().toUpperCase().slice(0, 32);
  // extraDiscount = dukandaar ke apne offers (storewide/offline seller coupon).
  // Server verify nahi kar sakta → 30% cap (bade offers backend seller-coupon se aao).
  const extraClaimed = Math.max(0, Math.round(Number(b.extraDiscount ?? 0)));
  const walletUsed = Math.max(0, Math.round(Number(b.walletUsed ?? 0)));
  const storeKey = String(b.storeId ?? b.storeKey ?? "").slice(0, 40);
  if (couponCode) {
    // Identity: Bearer token se user (app json() auto-attach karta hai).
    const header = c.req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    let uid = "";
    let phone = String(b.customerPhone ?? "");
    if (token) {
      try {
        const u = await db.select().from(users).where(eq(users.token, token)).limit(1);
        if (u[0]) { uid = u[0].id; phone = u[0].phone; }
      } catch { /* db down — neeche reject */ }
    }
    if (!uid) {
      logWarn(`[order] coupon ${couponCode} without login — rejected`);
      return c.json({ ok: false, error: "coupon ke liye login chahiye" }, 401);
    }
    const chk = await checkCoupon(couponCode, subtotal, { id: uid, phone }, { storeKey });
    if (!chk.ok) {
      logWarn(`[order] coupon ${couponCode} invalid`, chk.error);
      return c.json({ ok: false, error: chk.error }, 400);
    }
    discount = Math.min(chk.discount, subtotal);
  }
  // Wallet server-ledger se verify nahi (redeem endpoint pehle hi ghata chuka) —
  // bas bill se zyada na ho.
  const walletApplied = Math.min(walletUsed, Math.max(0, subtotal + deliveryFee - discount));
  const total = Math.max(0, subtotal + deliveryFee - discount - walletApplied);
  // Service booking (0013 migration). Bina columns ke insert fail-soft hoga.
  const kind = String(b.kind ?? "product").slice(0, 16) === "service" ? "service" : "product";
  const slotLabel = typeof b.slotLabel === "string" ? b.slotLabel.slice(0, 80) : null;
  const payStatus = String(b.payStatus ?? "paid").slice(0, 16) === "pending" ? "pending" : "paid";
  let scheduledAt: Date | null = null;
  if (typeof b.scheduledAt === "string" && b.scheduledAt) {
    const t = new Date(b.scheduledAt).getTime();
    if (Number.isFinite(t) && t > Date.now() - 24 * 3600 * 1000) scheduledAt = new Date(t);
  }
  const payload = {
    code,
    storeKey,
    storeName: String(b.storeName ?? "One Stop Bazar").slice(0, 160),
    customerName: String(b.customerName ?? "Aarav Mehta").slice(0, 120),
    customerPhone: String(b.customerPhone ?? "").slice(0, 40),
    items: (Array.isArray(b.items) ? (b.items as unknown[]).slice(0, 30) : []) as never,
    subtotal,
    deliveryFee,
    discount,
    total,
    couponCode: couponCode || null,
    walletUsed: walletApplied,
    kind,
    scheduledAt,
    slotLabel,
    payStatus,
    status: String(b.status ?? "new").slice(0, 32),
    payment: String(b.payment ?? "UPI").slice(0, 32),
    address: String(b.address ?? "HSR Layout").slice(0, 320),
    etaMins: Number(b.etaMins ?? 28),
    rider: String(b.rider ?? "").slice(0, 80),
    riderPhone: String(b.riderPhone ?? "").slice(0, 40),
    otp: String(b.otp ?? "").slice(0, 8),
    note: String(b.note ?? "").slice(0, 240),
    distanceKm: Math.round(Number(b.distanceKm ?? 1)),
  };
  try {
    const rows = await db
      .insert(orders)
      .values(payload)
      .returning({ id: orders.id, code: orders.code, status: orders.status });
    const itemCount = Array.isArray(b.items) ? b.items.length : 0;
    logOk(`[order] new ${rows[0]?.code ?? code}`, `₹${payload.total} · ${itemCount} items · ${payload.storeName}${couponCode ? ` · coupon ${couponCode} −₹${discount}` : ""}`);
    // Quota sirf successful order pe jalta hai.
    if (couponCode && discount > 0) {
      const header = c.req.header("authorization") ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
      if (token) {
        try {
          const u = await db.select().from(users).where(eq(users.token, token)).limit(1);
          if (u[0]) {
            const chk = await checkCoupon(couponCode, subtotal, { id: u[0].id, phone: u[0].phone }, { storeKey });
            if (chk.ok) await consumeCoupon(chk.coupon, u[0].id, rows[0]?.code ?? code, discount);
          }
        } catch { /* best-effort */ }
      }
    }
    return c.json({ id: rows[0]?.id, code: rows[0]?.code ?? code, status: rows[0]?.status ?? "new" });
  } catch {
    return c.json({ id: "local-" + Date.now(), code, status: payload.status, offline: true });
  }
});

// PATCH /api/orders/:id — same contract as Next route
ordersRoute.patch("/:id", async (c) => {
  const id = c.req.param("id") ?? "";
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};
  if (typeof b.status === "string") patch.status = String(b.status).slice(0, 32);
  if (typeof b.rider === "string") patch.rider = String(b.rider).slice(0, 80);
  if (typeof b.riderPhone === "string") patch.riderPhone = String(b.riderPhone).slice(0, 40);
  if (typeof b.riderLat === "number") patch.riderLat = String(b.riderLat);
  if (typeof b.riderLng === "number") patch.riderLng = String(b.riderLng);
  if (typeof b.riderLat === "number" || typeof b.riderLng === "number") patch.riderLastSeen = new Date();
  // Reschedule allowlist (future: customer slot change without cancel).
  if (typeof b.scheduledAt === "string" && b.scheduledAt) {
    const t = new Date(b.scheduledAt).getTime();
    if (Number.isFinite(t)) patch.scheduledAt = new Date(t);
  }
  if (typeof b.slotLabel === "string" && b.slotLabel.trim()) patch.slotLabel = b.slotLabel.slice(0, 80);
  if (typeof b.proofPhoto === "string") patch.proofPhoto = String(b.proofPhoto);
  if (typeof b.deliveredBy === "string") patch.deliveredBy = String(b.deliveredBy).slice(0, 24);
  if (typeof b.note === "string") patch.note = String(b.note).slice(0, 240);
  if (Object.keys(patch).length === 0) return c.json({ ok: false, error: "empty" }, 400);
  try {
    const rows = await db
      .update(orders)
      .set(patch)
      .where(eq(orders.id, id))
      .returning({ id: orders.id, status: orders.status, rider: orders.rider });
    if (!rows[0]) return c.json({ ok: true, local: true, id, ...patch });
    if (typeof b.status === "string") logInfo(`[order] ${id.slice(0, 8)} → ${b.status}`, rows[0].rider ? `rider=${rows[0].rider}` : "");
    // Fail-soft customer push on status change (order update kabhi na toote).
    if (typeof b.status === "string") {
      const full = await db.select().from(orders).where(eq(orders.id, id)).limit(1).catch(() => []);
      const isSvc = String((full[0] as Record<string, unknown> | undefined)?.kind ?? "") === "service";
      const tpl = (isSvc ? SERVICE_PUSH[b.status] : undefined) ?? STATUS_PUSH[b.status];
      if (!tpl) return c.json({ ok: true, ...rows[0] });
      const phone = String(full[0]?.customerPhone ?? "");
      const code = String(full[0]?.code ?? rows[0].id.slice(0, 8));
      if (phone) {
        const status = String(b.status);
        // Fire-and-forget (response slow na ho), result log me aayega.
        void notifyUserPhones([phone], tpl.title, tpl.body(code), { orderId: id, status }).then((sent) =>
          logInfo(`[push] ${sent > 0 ? `sent ×${sent}` : "no devices"}`, `${status} → ${code}`),
        );
      }
    }
    return c.json({ ok: true, ...rows[0] });
  } catch {
    logError(`[order] patch failed ${id.slice(0, 8)}`);
    return c.json({ ok: true, local: true, id, ...patch });
  }
});
