import { Hono } from "hono";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatMessages, chatThreads, orders, sellerStores, users } from "../db/schema.js";
import { auth, getUser, type AuthedUser } from "../middleware/auth.js";
import { notifyUserPhones } from "../lib/push.js";
import { logInfo } from "../lib/logger.js";

export const chatRoute = new Hono();

function digits(p: unknown): string {
  return String(p ?? "").replace(/\D/g, "").slice(-10);
}

type OrderRow = typeof orders.$inferSelect;

/** Thread access: customer (phone match) ya store side (apni sellerStore slug / mine-<digits>). */
async function accessAs(u: AuthedUser, o: OrderRow): Promise<"customer" | "store" | null> {
  const mine = digits(u.phone);
  if (mine && mine === digits(o.customerPhone)) return "customer";
  if (u.role === "super_admin") return "store";
  try {
    const myStores = await db.select().from(sellerStores).where(eq(sellerStores.ownerId, u.id)).limit(20);
    const keys = new Set(myStores.map((s) => String(s.slug ?? "")));
    const sk = String(o.storeKey ?? "");
    if (sk && (keys.has(sk) || (mine && sk === `mine-${mine}`))) return "store";
  } catch { /* db down — neeche 404/local */ }
  return null;
}

function pubMsg(r: typeof chatMessages.$inferSelect) {
  return {
    id: r.id,
    sender: r.sender ?? "customer",
    text: r.text ?? "",
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
  };
}

// GET /api/chat/:orderId — thread + last 50 (thread auto-create on first open).
chatRoute.get("/:orderId", auth, async (c) => {
  const u = getUser(c);
  const orderId = (c.req.param("orderId") ?? "").slice(0, 64);
  if (!orderId) return c.json({ ok: false, error: "orderId required" }, 400);
  try {
    const found = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const o = found[0];
    // Backend me order nahi (local-only booking) → app local thread use karega.
    if (!o) return c.json({ ok: false, local: true, error: "order not on server" }, 404);
    const role = await accessAs(u, o);
    if (!role) return c.json({ ok: false, error: "not your order" }, 403);
    let th = (await db.select().from(chatThreads).where(eq(chatThreads.orderId, o.id)).limit(1))[0];
    if (!th) {
      const ins = await db
        .insert(chatThreads)
        .values({ orderId: o.id, orderCode: o.code ?? null, storeKey: o.storeKey ?? null, customerPhone: o.customerPhone ?? null })
        .returning();
      th = ins[0];
    }
    const msgs = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.threadId, th.id))
      .orderBy(asc(chatMessages.createdAt))
      .limit(50);
    return c.json({ ok: true, thread: { id: th.id, orderCode: th.orderCode }, role, messages: msgs.map(pubMsg) });
  } catch {
    return c.json({ ok: false, local: true, error: "chat unavailable" });
  }
});

// POST /api/chat/:orderId — { text } bhejo (500 chars). Doosri side ko push (best-effort).
chatRoute.post("/:orderId", auth, async (c) => {
  const u = getUser(c);
  const orderId = (c.req.param("orderId") ?? "").slice(0, 64);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const text = String(b.text ?? "").trim().slice(0, 500);
  if (!orderId || !text) return c.json({ ok: false, error: "text required" }, 400);
  try {
    const found = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const o = found[0];
    if (!o) return c.json({ ok: false, local: true, error: "order not on server" }, 404);
    const role = await accessAs(u, o);
    if (!role) return c.json({ ok: false, error: "not your order" }, 403);
    let th = (await db.select().from(chatThreads).where(eq(chatThreads.orderId, o.id)).limit(1))[0];
    if (!th) {
      const ins = await db
        .insert(chatThreads)
        .values({ orderId: o.id, orderCode: o.code ?? null, storeKey: o.storeKey ?? null, customerPhone: o.customerPhone ?? null })
        .returning();
      th = ins[0];
    }
    const ins = await db.insert(chatMessages).values({ threadId: th.id, sender: role, text }).returning();
    // Doosri side ko push — fail-soft, response nahi rukega.
    void (async () => {
      try {
        if (role === "customer") {
          const sk = String(o.storeKey ?? "");
          const mine = await db.select().from(sellerStores).where(eq(sellerStores.slug, sk)).limit(1).catch(() => []);
          const owner = mine[0]?.ownerId;
          if (owner) {
            const ou = await db.select().from(users).where(eq(users.id, owner)).limit(1).catch(() => []);
            if (ou[0]?.phone) {
              await notifyUserPhones(
                [ou[0].phone],
                `💬 New Message from Customer (#${o.code ?? "Order"})`,
                `${o.customerName || "Customer"}: "${text.slice(0, 80)}"`,
                { orderId: o.id, kind: "chat", screen: "chat" }
              );
            }
          }
        } else if (o.customerPhone) {
          await notifyUserPhones(
            [o.customerPhone],
            `💬 New Message from Store Partner (#${o.code ?? "Order"})`,
            `${o.storeName || "Store Partner"}: "${text.slice(0, 80)}"`,
            { orderId: o.id, kind: "chat", screen: "chat" }
          );
        }
      } catch { /* best-effort */ }
    })();
    logInfo(`[chat] ${o.code ?? orderId.slice(0, 8)} ← ${role}`, `${text.length} chars`);
    return c.json({ ok: true, message: pubMsg(ins[0]) });
  } catch {
    return c.json({ ok: false, local: true, error: "chat unavailable" });
  }
});

// GET /api/chat/unread/counts — ping-polling ke liye halka endpoint (thread ids do).
chatRoute.post("/unread/counts", auth, async (c) => {
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const ids = Array.isArray(b.threadIds) ? (b.threadIds as unknown[]).map((x) => String(x)).slice(0, 20) : [];
  if (ids.length === 0) return c.json({ ok: true, counts: {} });
  try {
    const out: Record<string, number> = {};
    for (const tid of ids) {
      const rows = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.threadId, tid))
        .orderBy(desc(chatMessages.createdAt))
        .limit(1);
      out[tid] = rows[0]?.createdAt ? new Date(rows[0].createdAt).getTime() : 0;
    }
    return c.json({ ok: true, counts: out });
  } catch {
    return c.json({ ok: true, counts: {} });
  }
});

export type ChatRoute = typeof chatRoute;
