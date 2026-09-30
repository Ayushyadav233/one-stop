import { Hono } from "hono";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { auth, getUser } from "../middleware/auth.js";
import { logInfo, maskPhone } from "../lib/logger.js";

export const usersRoute = new Hono();

function publicUser(r: typeof users.$inferSelect) {
  return {
    id: r.id,
    phone: r.phone,
    name: r.name,
    email: r.email,
    gender: r.gender,
    avatar: r.avatar,
    address: r.address,
    addressArea: r.addressArea,
    userLat: r.userLat != null ? Number(r.userLat) : null,
    userLng: r.userLng != null ? Number(r.userLng) : null,
    role: r.role,
    walletPoints: Number((r as { walletPoints?: unknown }).walletPoints ?? 0),
    referralCode: (r as { referralCode?: unknown }).referralCode as string | null ?? null,
    referredBy: (r as { referredBy?: unknown }).referredBy as string | null ?? null,
  };
}

usersRoute.get("/me", auth, async (c) => {
  const u = getUser(c);
  const rows = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  return c.json({ ok: true, user: publicUser(rows[0]) });
});

usersRoute.patch("/me", auth, async (c) => {
  const u = getUser(c);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string" && b.name.trim()) patch.name = String(b.name).slice(0, 120);
  if (typeof b.email === "string") patch.email = String(b.email).trim().slice(0, 160) || null;
  if (typeof b.gender === "string") patch.gender = String(b.gender).slice(0, 24) || null;
  if (typeof b.avatar === "string") patch.avatar = String(b.avatar).slice(0, 16) || null;
  if (typeof b.address === "string") patch.address = String(b.address).slice(0, 320) || null;
  if (typeof b.addressArea === "string") patch.addressArea = String(b.addressArea).slice(0, 160) || null;
  if (Number.isFinite(Number(b.userLat))) patch.userLat = String(Number(b.userLat));
  if (Number.isFinite(Number(b.userLng))) patch.userLng = String(Number(b.userLng));
  if (Object.keys(patch).length === 0) return c.json({ ok: false, error: "empty" }, 400);
  const rows = await db.update(users).set(patch).where(eq(users.id, u.id)).returning();
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  logInfo(`[profile] updated ${maskPhone(rows[0].phone)}`, Object.keys(patch).join(","));
  return c.json({ ok: true, user: publicUser(rows[0]) });
});
