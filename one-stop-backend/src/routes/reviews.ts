import { Hono } from "hono";
import { db } from "../db/index.js";
import { reviews } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";
import { auth, getUser } from "../middleware/auth.js";

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
  const rows = await db
    .insert(reviews)
    .values({
      storeId: (typeof b.storeId === "string" ? b.storeId : null) as never,
      productId: (typeof b.productId === "string" ? b.productId : null) as never,
      userId: u.id as never,
      rating,
      text: typeof b.text === "string" ? String(b.text).slice(0, 500) : null,
      reply: null,
    })
    .returning();
  return c.json({ ok: true, review: rows[0] });
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
