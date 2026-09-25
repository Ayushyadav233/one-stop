import { Hono } from "hono";
import { db } from "../db/index.js";
import { coupons } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { auth } from "../middleware/auth.js";

export const couponsRoute = new Hono();

couponsRoute.get("/", async (c) => {
  try {
    const rows = await db.select().from(coupons).limit(50);
    return c.json({ coupons: rows });
  } catch {
    return c.json({ coupons: [] });
  }
});

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
      offPct: Number.isFinite(Number(b.offPct)) ? Math.round(Number(b.offPct)) : 20,
      maxOff: Number.isFinite(Number(b.maxOff)) ? Math.round(Number(b.maxOff)) : 120,
      minOrder: Number.isFinite(Number(b.minOrder)) ? Math.round(Number(b.minOrder)) : 149,
      kind: typeof b.kind === "string" ? String(b.kind).slice(0, 32) : "all",
    })
    .returning();
  return c.json({ ok: true, coupon: rows[0] });
});

couponsRoute.delete("/:id", auth, async (c) => {
  const id = c.req.param("id") ?? "";
  await db.delete(coupons).where(eq(coupons.id, id));
  return c.json({ ok: true, id });
});
