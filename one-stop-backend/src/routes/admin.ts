import { Hono } from "hono";
import { asc, eq, desc } from "drizzle-orm";
import { auth, getUser } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { users, stores, products, coupons, orders, categoryRequests, homeBlocks, homeConfig, homeVersions } from "../db/schema.js";
import { ensureHomeTables, readHomeConfig, HOME_CONFIG_DEFAULTS } from "./home.js";
import { randomBytes } from "node:crypto";
import { logError, logInfo, logOk, logWarn, maskPhone } from "../lib/logger.js";

export const adminRoute = new Hono();

function requireSuper(c: any) {
  const u = getUser(c);
  if (u.role !== "super_admin") return c.json({ ok: false, error: "forbidden" }, 403);
  return null;
}

adminRoute.get("/me", auth, (c: any) => {
  const u = getUser(c);
  return c.json({ ok: true, user: { id: u.id, phone: u.phone, name: u.name, role: u.role } });
});

adminRoute.patch("/users/:phone/role", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  // Canonical 10-digit (app OTP login bhi yahi format bhejta hai).
  const phone = String(c.req.param("phone") ?? "").replace(/\D/g, "").slice(-10);
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const role = String(b.role ?? "customer");
  if (!["customer", "store_admin", "super_admin"].includes(role)) return c.json({ ok: false, error: "invalid role" }, 400);
  if (phone.length !== 10) return c.json({ ok: false, error: "invalid phone" }, 400);
  const rows = await db.update(users).set({ role }).where(eq(users.phone, phone)).returning({ id: users.id, phone: users.phone, name: users.name, role: users.role });
  if (!rows[0]) return c.json({ ok: false, error: "user not found" }, 404);
  logOk(`[admin] role ${maskPhone(phone)} → ${role}`);
  return c.json({ ok: true, user: rows[0] });
});

adminRoute.get("/users", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(200);
  return c.json({ users: rows.map((r) => ({ id: r.id, phone: r.phone, name: r.name, role: r.role ?? "customer", createdAt: r.createdAt })) });
});

adminRoute.post("/seed", async (c: any) => {
  // Pehla super_admin banane ka ek-time darwaza — setup key ke bina 403.
  // Key sirf server env me hoti hai (kabhi app me mat daalo).
  const setupKey = (process.env.ADMIN_SETUP_KEY ?? "").trim();
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  if (!setupKey || String(b.setupKey ?? "") !== setupKey) {
    logWarn("[admin] /seed blocked (bad/missing setup key)");
    return c.json({ ok: false, error: "forbidden" }, 403);
  }
  const phone = String(b.phone ?? "").replace(/\D/g, "").slice(-10);
  if (phone.length !== 10) return c.json({ ok: false, error: "invalid phone" }, 400);
  const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (existing[0]?.role === "super_admin") return c.json({ ok: false, error: "super admin already exists" }, 400);
  const token = randomBytes(24).toString("hex");
  const name = String(b.name ?? "Super Admin").slice(0, 120);
  try {
    if (existing[0]) {
      const rows = await db.update(users).set({ role: "super_admin", name }).where(eq(users.id, existing[0].id)).returning({ id: users.id, phone: users.phone, name: users.name, role: users.role });
      logOk(`[admin] promoted ${maskPhone(phone)} → super_admin`);
      return c.json({ ok: true, user: rows[0], token });
    }
    const rows = await db.insert(users).values({ phone, name, token, role: "super_admin" }).returning({ id: users.id, phone: users.phone, name: users.name, role: users.role });
    logOk(`[admin] seeded super_admin ${maskPhone(phone)}`);
    return c.json({ ok: true, user: rows[0], token });
  } catch (e) {
    logError("[admin] /seed failed", String(e).slice(0, 200));
    return c.json({ ok: false, error: "seed failed" }, 500);
  }
});

adminRoute.get("/stats", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const [storeCount, productCount, orderRows, couponRows, userRows] = await Promise.all([
    db.select().from(stores),
    db.select().from(products),
    db.select().from(orders),
    db.select().from(coupons),
    db.select().from(users),
  ]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = orderRows.filter((o) => new Date(o.createdAt ?? 0) >= today);
  const gmv = todayOrders.reduce((a, o) => a + Number(o.total ?? 0), 0);
  return c.json({ ok: true, stats: { users: userRows.length, stores: storeCount.length, products: productCount.length, ordersToday: todayOrders.length, gmvToday: gmv, coupons: couponRows.filter((cc) => cc.createdAt != null && cc.createdAt > new Date(Date.now() - 30 * 86400000)).length } });
});

adminRoute.get("/stores", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const rows = await db.select().from(stores).orderBy(desc(stores.createdAt)).limit(500);
  return c.json({ stores: rows });
});
adminRoute.patch("/stores/:id", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};
  for (const k of ["name", "slug", "kind", "tagline", "image", "address", "isOpen", "isPureVeg", "offers", "tags", "openHours", "healthScore", "rating", "ratingsCount", "etaMins", "deliveryFee", "distanceKm"]) {
    if (typeof b[k] !== "undefined") patch[k] = b[k];
  }
  if (Object.keys(patch).length === 0) return c.json({ ok: false, error: "empty" }, 400);
  const rows = await db.update(stores).set(patch).where(eq(stores.id, id)).returning();
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  logInfo(`[admin] store ${String(rows[0].name).slice(0, 30)} patched`, Object.keys(patch).join(","));
  return c.json({ ok: true, store: rows[0] });
});
adminRoute.post("/stores", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const name = String(b.name ?? "").trim();
  if (!name) return c.json({ ok: false, error: "name required" }, 400);
  const rows = await db.insert(stores).values({ name, slug: String(b.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).slice(0, 180), kind: String(b.kind ?? "food"), tagline: String(b.tagline ?? ""), image: b.image ? String(b.image) : null, address: b.address ? String(b.address) : null, isOpen: typeof b.isOpen === "boolean" ? b.isOpen : true }).returning();
  logOk(`[admin] store created: ${name.slice(0, 40)}`);
  return c.json({ ok: true, store: rows[0] });
});
adminRoute.delete("/stores/:id", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const id = c.req.param("id");
  await db.delete(stores).where(eq(stores.id, id));
  logInfo(`[admin] store deleted ${String(id).slice(0, 8)}`);
  return c.json({ ok: true });
});

adminRoute.get("/products", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const storeId = c.req.query("storeId");
  const rows = await db.select().from(products).limit(500);
  const list = storeId ? rows.filter((r) => String((r as { storeId?: string }).storeId ?? "") === storeId) : rows;
  return c.json({ products: list });
});
adminRoute.patch("/products/:id", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};
  for (const k of ["name", "description", "price", "mrp", "image", "emoji", "category", "rating", "isVeg", "isBestseller", "stock", "unit", "hidden"]) {
    if (typeof b[k] !== "undefined") patch[k] = b[k];
  }
  if (b.etaMins !== undefined && Number.isFinite(Number(b.etaMins))) patch.etaMins = Math.min(1440, Math.max(1, Math.round(Number(b.etaMins))));
  if (Object.keys(patch).length === 0) return c.json({ ok: false, error: "empty" }, 400);
  const rows = await db.update(products).set(patch).where(eq(products.id, id)).returning();
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  return c.json({ ok: true, product: rows[0] });
});
adminRoute.post("/products", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const name = String(b.name ?? "").trim();
  if (!name) return c.json({ ok: false, error: "name required" }, 400);
  const rows = await db.insert(products).values({ name, description: String(b.description ?? ""), price: Number(b.price ?? 0), mrp: b.mrp ? Number(b.mrp) : undefined, image: b.image ? String(b.image) : null, emoji: String(b.emoji ?? "🍔"), category: String(b.category ?? ""), rating: Number(b.rating ?? 4.4), isVeg: typeof b.isVeg === "boolean" ? b.isVeg : true, isBestseller: typeof b.isBestseller === "boolean" ? b.isBestseller : false, stock: Number(b.stock ?? 50), unit: String(b.unit ?? "1 pc"), etaMins: Number.isFinite(Number(b.etaMins)) ? Math.min(1440, Math.max(1, Math.round(Number(b.etaMins)))) : undefined } as any).returning();
  return c.json({ ok: true, product: rows[0] });
});
adminRoute.delete("/products/:id", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const id = c.req.param("id");
  await db.delete(products).where(eq(products.id, id));
  return c.json({ ok: true });
});

adminRoute.get("/coupons", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(200);
  return c.json({ coupons: rows });
});
adminRoute.patch("/coupons/:id", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};
  for (const k of ["code", "title", "detail", "offPct", "maxOff", "minOrder", "kind"]) {
    if (typeof b[k] !== "undefined") patch[k] = b[k];
  }
  if (Object.keys(patch).length === 0) return c.json({ ok: false, error: "empty" }, 400);
  const rows = await db.update(coupons).set(patch).where(eq(coupons.id, id)).returning();
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  return c.json({ ok: true, coupon: rows[0] });
});
adminRoute.post("/coupons", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const code = String(b.code ?? "").trim();
  if (!code) return c.json({ ok: false, error: "code required" }, 400);
  const rows = await db.insert(coupons).values({ code, title: String(b.title ?? code), detail: String(b.detail ?? ""), offPct: Number(b.offPct ?? 20), maxOff: Number(b.maxOff ?? 120), minOrder: Number(b.minOrder ?? 149), kind: String(b.kind ?? "all") }).returning();
  logOk(`[admin] coupon created: ${code.slice(0, 32)}`);
  return c.json({ ok: true, coupon: rows[0] });
});
adminRoute.delete("/coupons/:id", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const id = c.req.param("id");
  await db.delete(coupons).where(eq(coupons.id, id));
  logInfo(`[admin] coupon deleted ${String(id).slice(0, 8)}`);
  return c.json({ ok: true });
});

adminRoute.get("/orders", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const status = c.req.query("status");
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(500);
  const list = status ? rows.filter((r) => r.status === status) : rows;
  return c.json({ orders: list });
});
adminRoute.patch("/orders/:id", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};
  for (const k of ["status", "rider", "riderPhone", "note", "riderLat", "riderLng", "otp", "proofPhoto", "deliveredBy"]) {
    if (typeof b[k] !== "undefined") patch[k] = b[k];
  }
  if (Object.keys(patch).length === 0) return c.json({ ok: false, error: "empty" }, 400);
  const rows = await db.update(orders).set(patch).where(eq(orders.id, id)).returning();
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  if (patch.status) logInfo(`[admin] order ${String(rows[0].code ?? id).slice(0, 12)} → ${patch.status}`);
  return c.json({ ok: true, order: rows[0] });
});

adminRoute.get("/categories", auth, async (c: any) => {  const err = requireSuper(c); if (err) return err;
  const all = await db.select().from(categoryRequests).orderBy(desc(categoryRequests.createdAt)).limit(200);
  return c.json({ categoryRequests: all });
});
adminRoute.patch("/categories/:id", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};
  for (const k of ["status"]) {
    if (typeof b[k] === "string") patch[k] = b[k];
  }
  if (Object.keys(patch).length === 0) return c.json({ ok: false, error: "empty" }, 400);
  const rows = await db.update(categoryRequests).set(patch).where(eq(categoryRequests.id, id)).returning();
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  logInfo(`[admin] category request ${String(rows[0].name).slice(0, 30)} → ${patch.status}`);
  return c.json({ ok: true, request: rows[0] });
});

// ---- Homepage CMS (super_admin only) ----

const HOME_KINDS = ["banner", "festival", "ad", "strip", "showcase"];
const HOME_LINKS = ["none", "store", "category", "search"];
const HOME_SLOTS = ["top", "banners", "strips", "mid", "festival", "bottom", "feed"];
const HOME_THEMES = ["none", "concert", "diwali", "christmas", "holi", "newyear", "monsoon"];
const HOME_ANIMS = ["floaters", "confetti", "spotlight", "none"];
const HOME_FONTS = ["serif", "heavy", "bold"];
const HOME_POS = ["top", "center", "bottom"];
const HOME_CTA_SIZE = ["s", "m", "l"];

function homePatchFrom(b: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (typeof b.kind === "string" && HOME_KINDS.includes(b.kind)) patch.kind = b.kind;
  for (const k of ["tag", "title", "sub", "cta"] as const) {
    if (typeof b[k] === "string") patch[k] = String(b[k]).slice(0, k === "tag" ? 80 : k === "title" ? 160 : k === "sub" ? 240 : 40);
  }
  if (typeof b.image === "string") patch.image = String(b.image).slice(0, 2000) || null;
  for (const k of ["c1", "c2"] as const) {
    if (typeof b[k] === "string") patch[k] = String(b[k]).slice(0, 32);
  }
  if (typeof b.linkKind === "string" && HOME_LINKS.includes(b.linkKind)) patch.linkKind = b.linkKind;
  if (typeof b.linkValue === "string") patch.linkValue = String(b.linkValue).slice(0, 120);
  if (typeof b.slot === "string" && HOME_SLOTS.includes(b.slot)) patch.slot = b.slot;
  if (typeof b.theme === "string" && HOME_THEMES.includes(b.theme)) patch.theme = b.theme;
  if (typeof b.video === "string") patch.video = String(b.video).slice(0, 2000) || null;
  if (typeof b.anim === "string" && HOME_ANIMS.includes(b.anim)) patch.anim = b.anim;
  if (typeof b.font === "string" && HOME_FONTS.includes(b.font)) patch.font = b.font;
  if (typeof b.tcolor === "string" && /^#[0-9a-fA-F]{6}$/.test(String(b.tcolor))) patch.tcolor = String(b.tcolor);
  for (const k of ["artpos", "align"] as const) {
    if (typeof b[k] === "string" && HOME_POS.includes(b[k] as string)) patch[k] = b[k];
  }
  if (b.zoom !== undefined && Number.isFinite(Number(b.zoom))) {
    patch.zoom = String(Math.min(2.5, Math.max(1, Number(b.zoom))));
  }
  if (b.stageh !== undefined && Number.isFinite(Number(b.stageh))) {
    patch.stageh = Math.min(700, Math.max(280, Math.round(Number(b.stageh))));
  }
  if (typeof b.ctapos === "string" && ["left", "center", "right"].includes(b.ctapos)) patch.ctapos = b.ctapos;
  if (typeof b.ctasize === "string" && HOME_CTA_SIZE.includes(b.ctasize)) patch.ctasize = b.ctasize;
  if (typeof b.ctacolor === "string" && /^#[0-9a-fA-F]{6}$/.test(String(b.ctacolor))) patch.ctacolor = String(b.ctacolor);
  if (b.layout && typeof b.layout === "object" && !Array.isArray(b.layout)) {
    const src = b.layout as Record<string, unknown>;
    const clean: Record<string, number | string> = {};
    for (const k of ["hx", "hy", "cx", "cy", "ax", "ay"] as const) {
      if (Number.isFinite(Number(src[k]))) clean[k] = Math.min(300, Math.max(-300, Math.round(Number(src[k]))));
    }
    if (typeof src.hs === "string" && ["s", "m", "l"].includes(src.hs)) clean.hs = src.hs;
    patch.layout = clean;
  }
  if (typeof b.fit === "string" && ["cover", "contain"].includes(b.fit)) patch.fit = b.fit;
  if (typeof b.active === "boolean") patch.active = b.active;
  if (Number.isFinite(Number(b.sort))) patch.sort = Math.round(Number(b.sort));
  for (const k of ["startsAt", "endsAt"] as const) {
    if (b[k] === null || b[k] === "") patch[k] = null;
    else if (typeof b[k] === "string" && !Number.isNaN(Date.parse(b[k] as string))) patch[k] = new Date(b[k] as string);
  }
  return patch;
}

adminRoute.get("/home", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const rows = await db.select().from(homeBlocks).orderBy(asc(homeBlocks.sort), asc(homeBlocks.createdAt)).limit(100);
  return c.json({ blocks: rows });
});

adminRoute.post("/home", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch = homePatchFrom(b);
  if (!patch.kind) patch.kind = "banner";
  const rows = await db.insert(homeBlocks).values(patch as typeof homeBlocks.$inferInsert).returning();
  logOk(`[admin] home block created: ${String(patch.kind ?? "banner")}/${String(patch.title).slice(0, 30)}`);
  return c.json({ ok: true, block: rows[0] });
});

adminRoute.patch("/home/:id", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const patch = homePatchFrom(b);
  if (Object.keys(patch).length === 0) return c.json({ ok: false, error: "empty" }, 400);
  const rows = await db.update(homeBlocks).set(patch).where(eq(homeBlocks.id, id)).returning();
  if (!rows[0]) return c.json({ ok: false, error: "not found" }, 404);
  logInfo(`[admin] home block ${String(id).slice(0, 8)} patched`, Object.keys(patch).join(","));
  return c.json({ ok: true, block: rows[0] });
});

adminRoute.delete("/home/:id", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const id = c.req.param("id");
  await db.delete(homeBlocks).where(eq(homeBlocks.id, id));
  logInfo(`[admin] home block deleted ${String(id).slice(0, 8)}`);
  return c.json({ ok: true });
});

// ---- Home texts (search/greeting/festival/sections) — simple key-value ----
adminRoute.get("/home-config", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const config = await readHomeConfig();
  return c.json({ ok: true, config, defaults: HOME_CONFIG_DEFAULTS });
});

adminRoute.patch("/home-config", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  await ensureHomeTables();
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const keys = Object.keys(HOME_CONFIG_DEFAULTS);
  let n = 0;
  for (const k of keys) {
    if (typeof b[k] === "string") {
      const v = String(b[k]).slice(0, 500);
      try {
        await db.insert(homeConfig).values({ key: k, value: v }).onConflictDoUpdate({ target: homeConfig.key, set: { value: v } });
        n++;
      } catch { /* ignore one key */ }
    }
  }
  if (!n) return c.json({ ok: false, error: "empty" }, 400);
  logOk(`[admin] home-config patched (${n} keys)`);
  return c.json({ ok: true, config: await readHomeConfig() });
});

// ---- Publish + history + revert (har jagah push = version bump, app poll pe fresh) ----
async function snapshotNow() {
  await ensureHomeTables();
  const [blocks, config] = await Promise.all([
    db.select().from(homeBlocks).orderBy(asc(homeBlocks.sort), asc(homeBlocks.createdAt)).limit(200),
    readHomeConfig(),
  ]);
  return { blocks, config };
}

adminRoute.post("/home/publish", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const note = String(b.note ?? "").slice(0, 240);
  const snap = await snapshotNow();
  const me = getUser(c);
  const rows = await db.insert(homeVersions).values({
    note: note || `Publish ${new Date().toLocaleString("en-IN")}`,
    snapshot: snap as unknown as { blocks: Record<string, unknown>[]; config: Record<string, string> },
    createdBy: String(me.phone ?? ""),
  }).returning();
  // purani history halki rakho — latest 20 rakho
  try {
    const all = await db.select({ id: homeVersions.id }).from(homeVersions).orderBy(desc(homeVersions.createdAt)).limit(100);
    if (all.length > 20) {
      const drop = all.slice(20);
      for (const d of drop) await db.delete(homeVersions).where(eq(homeVersions.id, d.id));
    }
  } catch { /* ignore */ }
  logOk(`[admin] home published: ${String(rows[0]?.id).slice(0, 8)} ${note.slice(0, 40)}`);
  return c.json({ ok: true, version: rows[0] });
});

adminRoute.get("/home-versions", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  await ensureHomeTables();
  try {
    const rows = await db.select().from(homeVersions).orderBy(desc(homeVersions.createdAt)).limit(20);
    return c.json({ versions: rows.map((r) => ({ ...r, blockCount: Array.isArray((r.snapshot as { blocks?: unknown[] })?.blocks) ? (r.snapshot as { blocks: unknown[] }).blocks.length : 0 })) });
  } catch {
    return c.json({ versions: [] });
  }
});

adminRoute.post("/home/revert", auth, async (c: any) => {
  const err = requireSuper(c); if (err) return err;
  const b = await c.req.json().catch(() => ({} as Record<string, unknown>));
  const versionId = String(b.versionId ?? "");
  if (!versionId) return c.json({ ok: false, error: "versionId required" }, 400);
  await ensureHomeTables();
  const found = await db.select().from(homeVersions).where(eq(homeVersions.id, versionId)).limit(1);
  const snap = found[0]?.snapshot as unknown as { blocks?: Record<string, unknown>[]; config?: Record<string, string> } | undefined;
  if (!snap) return c.json({ ok: false, error: "not found" }, 404);
  // blocks restore: sab hata ke snapshot wale daalo (ids naye banenge — app ko farak nahi, sort preserved)
  await db.delete(homeBlocks);
  const sblocks = Array.isArray(snap.blocks) ? snap.blocks : [];
  for (const sbo of sblocks) {
    try {
      const patch = homePatchFrom(sbo as Record<string, unknown>);
      await db.insert(homeBlocks).values(patch as typeof homeBlocks.$inferInsert);
    } catch { /* ek row fail to bhi baaki restore karo */ }
  }
  const sconfig = snap.config ?? {};
  for (const [k, v] of Object.entries(sconfig)) {
    if (!(k in HOME_CONFIG_DEFAULTS) || typeof v !== "string") continue;
    try {
      await db.insert(homeConfig).values({ key: k, value: String(v).slice(0, 500) }).onConflictDoUpdate({ target: homeConfig.key, set: { value: String(v).slice(0, 500) } });
    } catch { /* ignore */ }
  }
  const me = getUser(c);
  const cur = await snapshotNow();
  const rows = await db.insert(homeVersions).values({
    note: `Revert → ${String(found[0]?.note ?? versionId).slice(0, 60)}`,
    snapshot: cur as unknown as { blocks: Record<string, unknown>[]; config: Record<string, string> },
    createdBy: String(me.phone ?? ""),
  }).returning();
  logOk(`[admin] home reverted to ${versionId.slice(0, 8)}`);
  return c.json({ ok: true, version: rows[0] });
});