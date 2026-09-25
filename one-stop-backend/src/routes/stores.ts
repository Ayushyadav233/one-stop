import { Hono } from "hono";
import { db } from "../db/index.js";
import { stores } from "../db/schema.js";
import { STORES } from "../db/static-data.js";

export const storesRoute = new Hono();

// GET /api/stores — same contract: { stores, source: db|static }
storesRoute.get("/", async (c) => {
  try {
    const rows = await db.select().from(stores).limit(30);
    if (rows.length === 0) return c.json({ stores: STORES, source: "static" });
    return c.json({ stores: rows, source: "db" });
  } catch {
    return c.json({ stores: STORES, source: "static" });
  }
});
