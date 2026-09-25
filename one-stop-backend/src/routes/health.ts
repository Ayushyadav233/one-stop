import { Hono } from "hono";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

export const healthRoute = new Hono();

healthRoute.get("/", async (c) => {
  try {
    await db.execute(sql`select 1`);
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false }, 500);
  }
});
