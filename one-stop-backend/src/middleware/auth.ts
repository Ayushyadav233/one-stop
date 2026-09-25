import type { Context, Next } from "hono";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export type AuthedUser = { id: string; phone: string; name: string | null };

export async function auth(c: Context, next: Next) {
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return c.json({ ok: false, error: "unauthorized" }, 401);
  try {
    const rows = await db.select().from(users).where(eq(users.token, token)).limit(1);
    if (!rows[0]) return c.json({ ok: false, error: "unauthorized" }, 401);
    c.set("user", { id: rows[0].id, phone: rows[0].phone, name: rows[0].name } as AuthedUser);
    await next();
  } catch {
    return c.json({ ok: false, error: "unauthorized" }, 401);
  }
}

export function getUser(c: Context): AuthedUser {
  return c.get("user") as AuthedUser;
}
