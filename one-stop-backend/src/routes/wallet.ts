import { Hono } from "hono";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { referrals, users, walletTx } from "../db/schema.js";
import { auth, getUser } from "../middleware/auth.js";
import { logError, logOk, maskPhone } from "../lib/logger.js";

export const walletRoute = new Hono();

// Conversion: 10 points = ₹1. 1 successful refer = 100 pts (₹10).
export const POINTS_PER_RUPEE = 10;
export const REFER_REWARD_POINTS = 100;
export const REFEREE_BONUS_POINTS = 50;

export function makeReferralCode(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-6);
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 3; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `OSB${d.slice(-4)}${s}`;
}

function publicWallet(u: typeof users.$inferSelect) {
  const points = Number(u.walletPoints ?? 0);
  return {
    points,
    rupees: Math.floor(points / POINTS_PER_RUPEE),
    referralCode: u.referralCode ?? null,
    referredBy: u.referredBy ?? null,
  };
}

// Sab tables/columns naye hain — purani DB pe fail-soft (500 nahi, empty state).
async function ensureReferralCode(u: typeof users.$inferSelect): Promise<string | null> {
  if (u.referralCode) return u.referralCode;
  try {
    const code = makeReferralCode(u.phone);
    await db.update(users).set({ referralCode: code }).where(eq(users.id, u.id));
    return code;
  } catch {
    return null;
  }
}

// GET /api/wallet/me -> { ok, points, rupees, referralCode, tx[] }
walletRoute.get("/me", auth, async (c) => {
  const u = getUser(c);
  try {
    const rows = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    const me = rows[0];
    if (!me) return c.json({ ok: false, error: "not found" }, 404);
    const code = await ensureReferralCode(me);
    let tx: typeof walletTx.$inferSelect[] = [];
    try {
      tx = await db.select().from(walletTx).where(eq(walletTx.userId, u.id)).orderBy(desc(walletTx.createdAt)).limit(30);
    } catch { /* table abhi migrate nahi — empty */ }
    return c.json({ ok: true, ...publicWallet({ ...me, referralCode: code ?? me.referralCode }), tx });
  } catch (e) {
    // Column hi nahi (migrate pending) → purana app na toote, zero wallet.
    return c.json({ ok: true, points: 0, rupees: 0, referralCode: null, tx: [], pendingMigration: true });
  }
});

// POST /api/wallet/redeem { points, orderCode? } -> points ghatao (checkout pe cash ki tarah)
walletRoute.post("/redeem", auth, async (c) => {
  const u = getUser(c);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const points = Math.floor(Number(b.points ?? 0));
  if (!Number.isFinite(points) || points < 10) return c.json({ ok: false, error: "min 10 points (₹1)" }, 400);
  try {
    const rows = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    const me = rows[0];
    if (!me) return c.json({ ok: false, error: "not found" }, 404);
    const bal = Number(me.walletPoints ?? 0);
    if (points > bal) return c.json({ ok: false, error: "insufficient balance" }, 400);
    await db.update(users).set({ walletPoints: bal - points }).where(eq(users.id, u.id));
    try {
      await db.insert(walletTx).values({
        userId: u.id,
        kind: "redeem",
        points: -points,
        orderCode: String(b.orderCode ?? "").slice(0, 24) || null,
        note: `Redeemed ₹${Math.floor(points / POINTS_PER_RUPEE)} on order`,
      });
    } catch { /* ledger optional */ }
    logOk(`[wallet] redeem -${points}pts`, maskPhone(me.phone));
    return c.json({ ok: true, points: bal - points, rupees: Math.floor((bal - points) / POINTS_PER_RUPEE) });
  } catch (e) {
    logError("[wallet] redeem failed", String(e).slice(0, 200));
    return c.json({ ok: false, error: "wallet unavailable (migration pending?)" }, 500);
  }
});

// GET /api/wallet/referrals/me -> { ok, code, link, count, earnedPoints }
walletRoute.get("/referrals/me", auth, async (c) => {
  const u = getUser(c);
  try {
    const rows = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    const me = rows[0];
    if (!me) return c.json({ ok: false, error: "not found" }, 404);
    const code = (await ensureReferralCode(me)) ?? me.referralCode;
    let refs: typeof referrals.$inferSelect[] = [];
    try {
      refs = await db.select().from(referrals).where(eq(referrals.referrerId, u.id));
    } catch { /* table pending */ }
    const earned = refs.reduce((a, r) => a + Number(r.rewardPoints ?? 0), 0);
    return c.json({
      ok: true,
      code,
      link: code ? `https://onestopbazar.app/r/${code}` : null,
      count: refs.length,
      earnedPoints: earned,
      earnedRupees: Math.floor(earned / POINTS_PER_RUPEE),
      referrals: refs.slice(0, 30),
    });
  } catch {
    return c.json({ ok: true, code: null, link: null, count: 0, earnedPoints: 0, earnedRupees: 0, referrals: [] });
  }
});

// POST /api/wallet/referrals/apply { code } -> naya user apna code lagaye (register-time)
walletRoute.post("/referrals/apply", auth, async (c) => {
  const u = getUser(c);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const code = String(b.code ?? "").trim().toUpperCase().slice(0, 16);
  if (!code) return c.json({ ok: false, error: "code required" }, 400);
  try {
    const meRows = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    const me = meRows[0];
    if (!me) return c.json({ ok: false, error: "not found" }, 404);
    if (me.referredBy) return c.json({ ok: false, error: "referral already applied" }, 400);
    const refRows = await db.select().from(users).where(eq(users.referralCode, code)).limit(1);
    const referrer = refRows[0];
    if (!referrer) return c.json({ ok: false, error: "invalid code" }, 400);
    if (referrer.id === u.id) return c.json({ ok: false, error: "own code not allowed" }, 400);
    // Repeat check: ye user pehle reward ho chuka?
    try {
      const dup = await db.execute(sql`select 1 from osb_referrals where referee_id = ${u.id} limit 1`);
      if ((dup.rows?.length ?? 0) > 0) return c.json({ ok: false, error: "referral already applied" }, 400);
    } catch { /* table pending — neeche insert fail hoga, wahi error */ }
    await db.update(users).set({ referredBy: code }).where(eq(users.id, u.id));
    // Referrer +100, referee +50 — dono ke ledger me row.
    const refBal = Number(referrer.walletPoints ?? 0);
    await db.update(users).set({ walletPoints: refBal + REFER_REWARD_POINTS }).where(eq(users.id, referrer.id));
    const myBal = Number(me.walletPoints ?? 0);
    await db.update(users).set({ walletPoints: myBal + REFEREE_BONUS_POINTS }).where(eq(users.id, u.id));
    try {
      await db.insert(referrals).values({ referrerId: referrer.id, refereeId: u.id, code, rewardPoints: REFER_REWARD_POINTS });
      await db.insert(walletTx).values([
        { userId: referrer.id, kind: "earn", points: REFER_REWARD_POINTS, note: `Referral bonus (${maskPhone(me.phone)})` },
        { userId: u.id, kind: "earn", points: REFEREE_BONUS_POINTS, note: `Welcome bonus (code ${code})` },
      ]);
    } catch { /* ledger optional */ }
    logOk(`[referral] ${code} applied`, `${maskPhone(referrer.phone)} +${REFER_REWARD_POINTS}pts`);
    return c.json({ ok: true, referrerReward: REFER_REWARD_POINTS, refereeBonus: REFEREE_BONUS_POINTS, points: myBal + REFEREE_BONUS_POINTS });
  } catch (e) {
    logError("[referral] apply failed", String(e).slice(0, 200));
    return c.json({ ok: false, error: "referral unavailable" }, 500);
  }
});
