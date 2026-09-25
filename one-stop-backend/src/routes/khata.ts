import { Hono } from "hono";
import { db } from "../db/index.js";
import { khataEntries, khataParties } from "../db/schema.js";
import { and, desc, eq } from "drizzle-orm";
import { auth, getUser } from "../middleware/auth.js";

export const khataRoute = new Hono();

khataRoute.get("/parties", auth, async (c) => {
  const u = getUser(c);
  const rows = await db.select().from(khataParties).where(eq(khataParties.ownerId, u.id)).limit(200);
  return c.json({ parties: rows });
});

khataRoute.post("/parties", auth, async (c) => {
  const u = getUser(c);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const name = String(b.name ?? "").trim().slice(0, 160);
  if (!name) return c.json({ ok: false, error: "name required" }, 400);
  const rows = await db
    .insert(khataParties)
    .values({
      ownerId: u.id,
      name,
      phone: typeof b.phone === "string" ? String(b.phone).slice(0, 20) : null,
      type: typeof b.type === "string" ? String(b.type).slice(0, 16) : "sale",
      balance: 0,
    })
    .returning();
  return c.json({ ok: true, party: rows[0] });
});

khataRoute.get("/entries", auth, async (c) => {
  const u = getUser(c);
  const partyId = c.req.query("partyId");
  if (!partyId) return c.json({ ok: false, error: "partyId required" }, 400);
  // ownership check
  const own = await db.select().from(khataParties).where(and(eq(khataParties.id, partyId), eq(khataParties.ownerId, u.id))).limit(1);
  if (!own[0]) return c.json({ ok: false, error: "not found" }, 404);
  const rows = await db.select().from(khataEntries).where(eq(khataEntries.partyId, partyId)).orderBy(desc(khataEntries.createdAt)).limit(200);
  return c.json({ entries: rows, balance: own[0].balance });
});

khataRoute.post("/entries", auth, async (c) => {
  const u = getUser(c);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const partyId = String(b.partyId ?? "");
  const amount = Math.round(Number(b.amount ?? NaN));
  if (!partyId || !Number.isFinite(amount) || amount <= 0) return c.json({ ok: false, error: "partyId+amount required" }, 400);
  const kind = String(b.kind ?? "credit") === "debit" ? "debit" : "credit";
  const own = await db.select().from(khataParties).where(and(eq(khataParties.id, partyId), eq(khataParties.ownerId, u.id))).limit(1);
  if (!own[0]) return c.json({ ok: false, error: "not found" }, 404);
  const rows = await db.insert(khataEntries).values({ partyId: partyId as never, kind, amount, note: typeof b.note === "string" ? String(b.note).slice(0, 240) : null }).returning();
  const delta = kind === "credit" ? amount : -amount;
  const updated = await db.update(khataParties).set({ balance: (own[0].balance ?? 0) + delta }).where(eq(khataParties.id, partyId)).returning();
  return c.json({ ok: true, entry: rows[0], balance: updated[0]?.balance });
});
