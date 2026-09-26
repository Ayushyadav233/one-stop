import { Hono } from "hono";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";
import { notifyUserPhones } from "../lib/push.js";

export const ordersRoute = new Hono();

// Order status → customer push copy (phase-2 scope: status updates only).
const STATUS_PUSH: Record<string, { title: string; body: (code: string) => string }> = {
  accepted: { title: "Order accepted ✅", body: (code) => `Store ne ${code} accept kiya — taiyaari shuru!` },
  ready: { title: "Order ready 📦", body: (code) => `${code} pickup ke liye ready hai.` },
  onway: { title: "Rider on the way 🛵", body: (code) => `${code} lekar rider nikal chuka hai.` },
  delivered: { title: "Delivered 🎉", body: (code) => `${code} deliver ho gaya. Enjoy!` },
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

// POST /api/orders — same contract as Next route
ordersRoute.post("/", async (c) => {
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const code = String(b.code ?? "#OSB-" + Math.floor(1000 + Math.random() * 9000)).slice(0, 24);
  const payload = {
    code,
    storeKey: String(b.storeId ?? b.storeKey ?? "").slice(0, 40),
    storeName: String(b.storeName ?? "One Stop Bazar").slice(0, 160),
    customerName: String(b.customerName ?? "Aarav Mehta").slice(0, 120),
    customerPhone: String(b.customerPhone ?? "").slice(0, 40),
    items: (Array.isArray(b.items) ? (b.items as unknown[]).slice(0, 30) : []) as never,
    subtotal: Number(b.subtotal ?? 0),
    deliveryFee: Number(b.deliveryFee ?? 0),
    discount: Number(b.discount ?? 0),
    total: Number(b.total ?? 0),
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
    // Fail-soft customer push on status change (order update kabhi na toote).
    const tpl = typeof b.status === "string" ? STATUS_PUSH[b.status] : undefined;
    if (tpl) {
      const full = await db.select().from(orders).where(eq(orders.id, id)).limit(1).catch(() => []);
      const phone = String(full[0]?.customerPhone ?? "");
      const code = String(full[0]?.code ?? rows[0].id.slice(0, 8));
      if (phone) void notifyUserPhones([phone], tpl.title, tpl.body(code), { orderId: id, status: String(b.status) });
    }
    return c.json({ ok: true, ...rows[0] });
  } catch {
    return c.json({ ok: true, local: true, id, ...patch });
  }
});
