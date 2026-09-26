import { Hono } from "hono";
import { randomBytes, randomInt } from "node:crypto";
import { db } from "../db/index.js";
import { otpCodes, users } from "../db/schema.js";
import { and, desc, eq } from "drizzle-orm";

export const authRoute = new Hono();

// OTP config: OTP response me wapas bhejo sirf dev me.
// - `OTP_DEV_MODE=false` (Render prod) → otp chhupao, SMS hi ek rasta.
// - default (env set nahi / "true") → otp return (dev + current APK testing).
// Rollout rule: MSG91 live hone ke BAAD hi Render pe OTP_DEV_MODE=false karo,
// warna koi login nahi kar payega.
const OTP_DEV_MODE = process.env.OTP_DEV_MODE !== "false";

// Rate-limit (in-memory; Render free = single instance, isliye kaafi):
// - same phone: min 60s gap between requests
// - same phone: max 3 requests per 10 min (SMS cost-bachao)
const RESEND_COOLDOWN_MS = 60 * 1000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const otpHits = new Map<string, number[]>();

function otpRateLimited(phone: string): "ok" | "cooldown" | "window" {
  const now = Date.now();
  const hits = (otpHits.get(phone) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) {
    otpHits.set(phone, hits);
    return "window";
  }
  if (hits.length > 0 && now - hits[hits.length - 1] < RESEND_COOLDOWN_MS) return "cooldown";
  hits.push(now);
  otpHits.set(phone, hits);
  return "ok";
}

// SMS provider hook (MSG91 Flow API v5).
// Env: MSG91_AUTH_KEY, MSG91_SENDER_ID, MSG91_FLOW_ID (template me OTP variable ho).
// Key set nahi → no-op (dev), taaki deploy kabhi na toote. Fail-soft: SMS fail
// hone pe OTP row pehle se bani hoti hai, user Resend kar sakta hai.
async function sendSms(phone: string, otp: string): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY ?? "";
  const sender = process.env.MSG91_SENDER_ID ?? "";
  const flowId = process.env.MSG91_FLOW_ID ?? "";
  if (!authKey || !sender || !flowId) return false;
  const digits = phone.replace(/\D/g, "");
  const mobiles = digits.length === 10 ? `91${digits}` : digits;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { authkey: authKey, "Content-Type": "application/json" },
      body: JSON.stringify({ flow_id: flowId, sender, mobiles, OTP: otp }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      console.error(`[sms] msg91 http ${res.status} for ${mobiles.slice(-4).padStart(mobiles.length, "*")}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[sms] send failed: ${String(e).slice(0, 200)}`);
    return false;
  }
}

function isValidPhone(phone: string) {
  return /^[0-9+\-\s]{6,20}$/.test(phone);
}

// POST /api/auth/request-otp { phone } -> { ok, otp?, note }
authRoute.post("/request-otp", async (c) => {
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const phone = String(b.phone ?? "").trim().slice(0, 20);
  if (!isValidPhone(phone)) return c.json({ ok: false, error: "invalid phone" }, 400);
  const limit = otpRateLimited(phone);
  if (limit === "cooldown")
    return c.json({ ok: false, error: "otp already sent, wait 60s before resend" }, 429);
  if (limit === "window")
    return c.json({ ok: false, error: "too many requests, try again in 10 minutes" }, 429);
  const otp = String(randomInt(100000, 999999));
  try {
    await db.insert(otpCodes).values({
      phone,
      code: otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      consumed: false,
    });
    const smsSent = await sendSms(phone, otp);
    if (OTP_DEV_MODE) return c.json({ ok: true, otp, note: "dev-mock: use this otp" });
    return c.json({ ok: true, note: smsSent ? "otp sent via SMS" : "otp sent" });
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
