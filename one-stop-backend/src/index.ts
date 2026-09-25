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

const app = new Hono();
app.use("*", cors());

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

const port = Number(process.env.PORT ?? 8787);
console.log(`one-stop-backend listening on :${port}`);
serve({ fetch: app.fetch, port });
