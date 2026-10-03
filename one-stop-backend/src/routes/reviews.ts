import { Hono } from "hono";
import { db } from "../db/index.js";
import { reviews } from "../db/schema.js";
import { and, desc, eq } from "drizzle-orm";
import { auth, getUser } from "../middleware/auth.js";
import { logInfo, logOk } from "../lib/logger.js";

export const reviewsRoute = new Hono();

reviewsRoute.get("/", async (c) => {
  const storeId = c.req.query("storeId");
  const productId = c.req.query("productId");
  try {
    const rows = await db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(100);
    let list = rows;
    if (storeId) list = list.filter((r) => String(r.storeId ?? "") === storeId);
    if (productId) list = list.filter((r) => String(r.productId ?? "") === productId);
    return c.json({ reviews: list });
  } catch {
    return c.json({ reviews: [] });
  }
});

reviewsRoute.post("/", auth, async (c) => {
  const u = getUser(c);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const rating = Math.min(5, Math.max(1, Math.round(Number(b.rating ?? 5))));
  const storeId = typeof b.storeId === "string" ? b.storeId : null;
  const productId = typeof b.productId === "string" ? b.productId : null;
  const orderId = typeof b.orderId === "string" ? b.orderId : null;
  const text = typeof b.text === "string" ? String(b.text).slice(0, 500) : null;

  const rows = await db
    .insert(reviews)
    .values({
      storeId: storeId as never,
      productId: productId as never,
      userId: u.id as never,
      rating,
      text,
      reply: null,
    })
    .returning();

  // Update store average rating & count if storeId provided
  if (storeId) {
    try {
      const { stores } = await import("../db/schema.js");
      const storeRev = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.storeId, storeId));
      if (storeRev.length > 0) {
        const avg = (storeRev.reduce((a, r) => a + Number(r.rating ?? 5), 0) / storeRev.length).toFixed(1);
        await db.update(stores).set({ rating: String(avg), ratingsCount: storeRev.length }).where(eq(stores.id, storeId));
      }
    } catch { /* best-effort */ }
  }

  logOk(`[review] new ${rating}★`, String(storeId ?? productId ?? orderId ?? "").slice(0, 8));
  return c.json({ ok: true, review: rows[0] });
});

// My reviews (ProfileTab) — sirf apne, newest first.
reviewsRoute.get("/mine", auth, async (c) => {
  const u = getUser(c);
  try {
    const rows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, u.id))
      .orderBy(desc(reviews.createdAt))
      .limit(50);
    return c.json({ reviews: rows });
  } catch {
    return c.json({ reviews: [] });
  }
});

// Apni review delete (seller reply wala bhi hata sakta hai apna).
reviewsRoute.delete("/:id", auth, async (c) => {
  const u = getUser(c);
  const id = c.req.param("id") ?? "";
  const rows = await db.delete(reviews).where(and(eq(reviews.id, id), eq(reviews.userId, u.id))).returning({ id: reviews.id });
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  logInfo(`[review] deleted ${id.slice(0, 8)}`);
  return c.json({ ok: true, id });
});

// Seller reply to review
reviewsRoute.patch("/:id", auth, async (c) => {
  const id = c.req.param("id") ?? "";
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  if (typeof b.reply !== "string") return c.json({ ok: false, error: "reply required" }, 400);
  const rows = await db.update(reviews).set({ reply: String(b.reply).slice(0, 500) }).where(eq(reviews.id, id)).returning();
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  return c.json({ ok: true, review: rows[0] });
});
