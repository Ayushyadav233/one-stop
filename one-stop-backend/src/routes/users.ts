import { Hono } from "hono";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { auth, getUser } from "../middleware/auth.js";

export const usersRoute = new Hono();

usersRoute.get("/me", auth, async (c) => {
  const u = getUser(c);
  const rows = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  return c.json({ ok: true, user: { id: rows[0].id, phone: rows[0].phone, name: rows[0].name } });
});

usersRoute.patch("/me", auth, async (c) => {
  const u = getUser(c);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string" && b.name.trim()) patch.name = String(b.name).slice(0, 120);
  if (Object.keys(patch).length === 0) return c.json({ ok: false, error: "empty" }, 400);
  const rows = await db.update(users).set(patch).where(eq(users.id, u.id)).returning({ id: users.id, phone: users.phone, name: users.name });
  return c.json({ ok: true, user: rows[0] });
});
