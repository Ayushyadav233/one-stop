import { Hono } from "hono";
import { db } from "../db/index.js";
import { categoryRequests } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";
import { auth } from "../middleware/auth.js";

export const categoryRequestsRoute = new Hono();

categoryRequestsRoute.get("/", async (c) => {
  const status = c.req.query("status");
  try {
    const rows = await db.select().from(categoryRequests).orderBy(desc(categoryRequests.createdAt)).limit(100);
    const list = status ? rows.filter((r) => r.status === status) : rows;
    return c.json({ requests: list });
  } catch {
    return c.json({ requests: [] });
  }
});

categoryRequestsRoute.post("/", async (c) => {
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const name = String(b.name ?? "").trim().slice(0, 120);
  if (!name) return c.json({ ok: false, error: "name required" }, 400);
  const rows = await db
    .insert(categoryRequests)
    .values({
      name,
      kind: typeof b.kind === "string" ? String(b.kind).slice(0, 32) : "food",
      requestedBy: typeof b.requestedBy === "string" ? String(b.requestedBy).slice(0, 20) : null,
      status: "pending",
    })
    .returning();
  return c.json({ ok: true, request: rows[0] });
});

// Admin approve/reject (auth required for now; TODO: role check)
categoryRequestsRoute.patch("/:id", auth, async (c) => {
  const id = c.req.param("id") ?? "";
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const status = String(b.status ?? "");
  if (!["pending", "approved", "rejected"].includes(status)) return c.json({ ok: false, error: "bad status" }, 400);
  const rows = await db.update(categoryRequests).set({ status }).where(eq(categoryRequests.id, id)).returning();
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  return c.json({ ok: true, request: rows[0] });
});
