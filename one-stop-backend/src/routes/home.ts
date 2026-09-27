import { Hono } from "hono";
import { db } from "../db/index.js";
import { homeBlocks } from "../db/schema.js";
import { asc, and, eq, or, isNull, lte, gte } from "drizzle-orm";

export const homeRoute = new Hono();

function liveFilter() {
  const now = new Date();
  return and(
    eq(homeBlocks.active, true),
    or(isNull(homeBlocks.startsAt), lte(homeBlocks.startsAt, now)),
    or(isNull(homeBlocks.endsAt), gte(homeBlocks.endsAt, now))
  );
}

function pub(r: typeof homeBlocks.$inferSelect) {
  return {
    id: r.id,
    kind: r.kind,
    tag: r.tag ?? "",
    title: r.title ?? "",
    sub: r.sub ?? "",
    cta: r.cta ?? "",
    image: r.image ?? "",
    c1: r.c1 ?? "rgba(10,10,10,.78)",
    c2: r.c2 ?? "rgba(10,10,10,.15)",
    linkKind: r.linkKind ?? "none",
    linkValue: r.linkValue ?? "",
    sort: r.sort ?? 0,
  };
}

// GET /api/home — live homepage blocks (active + scheduled). Fail-soft [].
homeRoute.get("/", async (c) => {
  try {
    const rows = await db
      .select()
      .from(homeBlocks)
      .where(liveFilter())
      .orderBy(asc(homeBlocks.sort), asc(homeBlocks.createdAt))
      .limit(30);
    return c.json({ blocks: rows.map(pub) });
  } catch {
    return c.json({ blocks: [] });
  }
});
