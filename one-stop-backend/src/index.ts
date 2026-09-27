import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { healthRoute } from "./routes/health.js";
import { ordersRoute } from "./routes/orders.js";
import { productsRoute } from "./routes/products.js";
import { storesRoute } from "./routes/stores.js";
import { seedRoute } from "./routes/seed.js";
import { authRoute } from "./routes/auth.js";
import { usersRoute } from "./routes/users.js";
import { sellerRoute } from "./routes/seller.js";
import { couponsRoute } from "./routes/coupons.js";
import { categoryRequestsRoute } from "./routes/categoryRequests.js";
import { reviewsRoute } from "./routes/reviews.js";
import { khataRoute } from "./routes/khata.js";
import { pushRoute } from "./routes/push.js";
import { adminRoute } from "./routes/admin.js";
import { homeRoute } from "./routes/home.js";
import { logError, logInfo, logOk, logWarn, requestLogger } from "./lib/logger.js";

const app = new Hono();
app.use("*", cors());
app.use("*", requestLogger);

app.get("/", (c) => c.json({ ok: true, name: "one-stop-backend", version: "1.0.0" }));

// Same-contract routes (app me 1 line nahi badlegi — sirf EXPO_PUBLIC_API_URL point karo)
app.route("/api/health", healthRoute);
app.route("/api/orders", ordersRoute);
app.route("/api/products", productsRoute);
app.route("/api/stores", storesRoute);
app.route("/api/seed", seedRoute);

// New sync routes (multi-device gaps)
app.route("/api/auth", authRoute);
app.route("/api/users", usersRoute);
app.route("/api/seller", sellerRoute);
app.route("/api/coupons", couponsRoute);
app.route("/api/category-requests", categoryRequestsRoute);
app.route("/api/reviews", reviewsRoute);
app.route("/api/khata", khataRoute);
app.route("/api/push-tokens", pushRoute);
app.route("/api/admin", adminRoute);
app.route("/api/home", homeRoute);

// 404 bhi log me dikhe (warna "empty" lagta hai — galat URL silent tha)
app.notFound((c) => {
  logWarn(`404 ${c.req.method} ${c.req.path}`);
  return c.json({ ok: false, error: "not found" }, 404);
});

// 500 bhi log me dikhe + request-id ke saath
app.onError((err, c) => {
  const id = (() => {
    try {
      return String((c.get as unknown as (k: string) => unknown).call(c, "reqId") ?? "");
    } catch {
      return "";
    }
  })();
  logError(`500 ${c.req.method} ${c.req.path}${id ? ` [${id}]` : ""}`, String(err).slice(0, 300));
  return c.json({ ok: false, error: "internal error" }, 500);
});

const port = Number(process.env.PORT ?? 8787);

function maskDbUrl(url: string): string {
  // password + full host chhupao, sirf host-tail + db name dikhao
  try {
    const u = new URL(url);
    const host = u.hostname.length > 12 ? `…${u.hostname.slice(-12)}` : u.hostname;
    return `${u.protocol}//${host}${u.pathname}`;
  } catch {
    return "(unparseable)";
  }
}

function printBanner() {
  const otpDev = process.env.OTP_DEV_MODE !== "false";
  const firebase = (process.env.FIREBASE_PROJECT_ID ?? "").trim();
  const msg91 = Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_FLOW_ID);
  const dbUrl = process.env.DATABASE_URL ?? "";
  console.log("──────────────────────────────────────────────");
  logOk(`one-stop-backend listening on :${port}`);
  logInfo(`env      : ${process.env.NODE_ENV || "development"} | OTP_DEV_MODE=${otpDev ? "true(dev)" : "false(prod)"}`);
  logInfo(`db       : ${dbUrl ? maskDbUrl(dbUrl) : "(DATABASE_URL missing!)"}`);
  logInfo(`firebase : ${firebase ? `on (${firebase})` : "OFF (503 on /api/auth/firebase)"}`);
  logInfo(`sms      : ${msg91 ? "MSG91 configured" : "dev-mock (no MSG91 keys)"}`);
  logInfo("routes   : /, /api/health, /api/orders, /api/products, /api/stores, /api/seed,");
  logInfo("           /api/auth, /api/users, /api/seller, /api/coupons, /api/category-requests,");
  logInfo("           /api/reviews, /api/khata, /api/push-tokens, /api/admin, /api/home");
  console.log("──────────────────────────────────────────────");
}

// DB ping — fail hua to bhi server uthe (fail-soft), lekin LOG me laal dikhe
async function pingDb() {
  try {
    const { db } = await import("./db/index.js");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`select 1`);
    logOk("db ping ok");
  } catch (e) {
    logWarn("db ping FAILED — server chal raha, DB wale routes 500 denge", String(e).slice(0, 200));
  }
}

printBanner();
void pingDb();
serve({ fetch: app.fetch, port });
