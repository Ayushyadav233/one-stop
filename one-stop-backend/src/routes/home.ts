import { Hono } from "hono";
import { db } from "../db/index.js";
import { homeBlocks, homeConfig, homeVersions } from "../db/schema.js";
import { asc, and, eq, or, isNull, lte, gte, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const homeRoute = new Hono();

/** Editable home-screen texts with safe defaults (app offline bhi same dikhe). */
export const HOME_CONFIG_DEFAULTS: Record<string, string> = {
  searchPlaceholder: "Search “biryani”, “A2 milk”, “plumber”…",
  greetingSub: "Sab kuch, ek app me",
  liveBadge: "LIVE",
  categoriesTitle: "Explore categories",
  festivalTitle: "Festive picks for you",
  festivalSub: "Sweets, gifts & more from nearby shops",
  festivalCta: "Send gift",
  stripsDefault: "50% OFF up to ₹100|Free delivery over ₹199|20% cashback|₹200 OFF services",
  showFestival: "1",
  showAds: "1",
  showStrips: "1",
  showCategories: "1",
};

/** Render-safe: nayi tables purane DB pe na hon to bana lo (Neon push ke bina bhi kaam kare). */
let ensured = false;
export async function ensureHomeTables() {
  if (ensured) return;
  ensured = true;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "osb_home_config" ("key" varchar(64) PRIMARY KEY, "value" text, "updated_at" timestamp DEFAULT now());
      CREATE TABLE IF NOT EXISTS "osb_home_versions" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "note" varchar(240) DEFAULT '', "snapshot" jsonb DEFAULT '{"blocks":[],"config":{}}', "created_by" varchar(40) DEFAULT '', "created_at" timestamp DEFAULT now());
      ALTER TABLE "osb_home_blocks" ADD COLUMN IF NOT EXISTS "slot" varchar(16) DEFAULT 'banners';
      ALTER TABLE "osb_home_blocks" ADD COLUMN IF NOT EXISTS "theme" varchar(16) DEFAULT 'none';
      ALTER TABLE "osb_home_blocks" ADD COLUMN IF NOT EXISTS "video" text;
      ALTER TABLE "osb_home_blocks" ADD COLUMN IF NOT EXISTS "anim" varchar(16) DEFAULT 'floaters';
    `);
  } catch { /* fail-soft: purana DB bhi chalega */ }
}

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
    slot: (r as { slot?: string }).slot ?? "banners",
    theme: (r as { theme?: string }).theme ?? "none",
    video: (r as { video?: string }).video ?? "",
    anim: (r as { anim?: string }).anim ?? "floaters",
    sort: r.sort ?? 0,
  };
}

export async function readHomeConfig(): Promise<Record<string, string>> {
  await ensureHomeTables();
  try {
    const rows = await db.select().from(homeConfig).limit(100);
    const out: Record<string, string> = { ...HOME_CONFIG_DEFAULTS };
    for (const r of rows) out[r.key] = r.value ?? out[r.key] ?? "";
    return out;
  } catch {
    return { ...HOME_CONFIG_DEFAULTS };
  }
}

// GET /api/home — live blocks (active + scheduled) + editable texts + version.
// Purane app jo sirf blocks padhte hain wo bhi chalte rahenge.
homeRoute.get("/", async (c) => {
  await ensureHomeTables();
  try {
    const [rows, config] = await Promise.all([
      db.select().from(homeBlocks).where(liveFilter()).orderBy(asc(homeBlocks.sort), asc(homeBlocks.createdAt)).limit(60),
      readHomeConfig(),
    ]);
    let version: string | null = null;
    try {
      const v = await db.select().from(homeVersions).orderBy(desc(homeVersions.createdAt)).limit(1);
      version = v[0]?.id ?? null;
    } catch { /* ignore */ }
    return c.json({ blocks: rows.map(pub), config, version });
  } catch {
    return c.json({ blocks: [], config: { ...HOME_CONFIG_DEFAULTS }, version: null });
  }
});
