import { Hono } from "hono";
import { db } from "../db/index.js";
import { pushTokens } from "../db/schema.js";
import { auth, getUser } from "../middleware/auth.js";
import { deletePushToken } from "../lib/push.js";

export const pushRoute = new Hono();

// POST /api/push-tokens { token, platform? } (auth) — upsert device token.
pushRoute.post("/", auth, async (c) => {
  const u = getUser(c);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const token = String(b.token ?? "").slice(0, 512);
  if (!token.startsWith("ExponentPushToken[")) return c.json({ ok: false, error: "invalid token" }, 400);
  const platform = String(b.platform ?? "android").slice(0, 16);
  try {
    await db
      .insert(pushTokens)
      .values({ userId: u.id, token, platform })
      .onConflictDoNothing({ target: pushTokens.token });
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: String(e).slice(0, 300) }, 500);
  }
});

// DELETE /api/push-tokens { token } (auth) — logout/device-change pe hatao.
pushRoute.delete("/", auth, async (c) => {
  const u = getUser(c);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  await deletePushToken(u.id, String(b.token ?? ""));
  return c.json({ ok: true });
});
