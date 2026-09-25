import { Hono } from "hono";
import { randomBytes, randomInt } from "node:crypto";
import { db } from "../db/index.js";
import { otpCodes, users } from "../db/schema.js";
import { and, desc, eq } from "drizzle-orm";

export const authRoute = new Hono();

// Mock-verify rule (demo, paisa-bachao):
// - "000000" kabhi valid nahi (negative test ke liye)
// - dev me OTP response me wapas bhejte hai taaki app bina SMS ke login kar sake
// - SMS provider (MSG91/Twilio) ka hook: yahi `sendSms()` me plug hoga
async function sendSms(_phone: string, _otp: string) {
  // TODO: plug MSG91/Twilio here when budget allows. Currently no-op (mock).
}

function isValidPhone(phone: string) {
  return /^[0-9+\-\s]{6,20}$/.test(phone);
}

// POST /api/auth/request-otp { phone } -> { ok, otp?, note }
authRoute.post("/request-otp", async (c) => {
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const phone = String(b.phone ?? "").trim().slice(0, 20);
  if (!isValidPhone(phone)) return c.json({ ok: false, error: "invalid phone" }, 400);
  const otp = String(randomInt(100000, 999999));
  try {
    await db.insert(otpCodes).values({
      phone,
      code: otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      consumed: false,
    });
    await sendSms(phone, otp);
    return c.json({ ok: true, otp, note: "dev-mock: use this otp" });
  } catch (e) {
    return c.json({ ok: false, error: String(e).slice(0, 300) }, 500);
  }
});

// POST /api/auth/verify-otp { phone, otp, name? } -> { ok, token, user }
authRoute.post("/verify-otp", async (c) => {
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const phone = String(b.phone ?? "").trim().slice(0, 20);
  const otp = String(b.otp ?? "").trim().slice(0, 8);
  if (!isValidPhone(phone) || !/^\d{6}$/.test(otp)) return c.json({ ok: false, error: "invalid input" }, 400);
  if (otp === "000000") return c.json({ ok: false, error: "wrong otp" }, 401);
  try {
    const rows = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), eq(otpCodes.code, otp), eq(otpCodes.consumed, false)))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    const row = rows[0];
    if (!row) return c.json({ ok: false, error: "wrong otp" }, 401);
    if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now())
      return c.json({ ok: false, error: "otp expired" }, 401);
    await db.update(otpCodes).set({ consumed: true }).where(eq(otpCodes.id, row.id));

    const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    const token = randomBytes(24).toString("hex");
    if (existing[0]) {
      await db.update(users).set({ token }).where(eq(users.id, existing[0].id));
      return c.json({ ok: true, token, user: { id: existing[0].id, phone, name: existing[0].name } });
    }
    const name = String(b.name ?? "Guest").slice(0, 120);
    const created = await db.insert(users).values({ phone, name, token }).returning({ id: users.id, phone: users.phone, name: users.name });
    return c.json({ ok: true, token, user: created[0] });
  } catch (e) {
    return c.json({ ok: false, error: String(e).slice(0, 300) }, 500);
  }
});
