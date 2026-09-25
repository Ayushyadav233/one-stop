import "dotenv/config";
import { pool } from "./index.js";

await pool.query(`ALTER TABLE "osb_users" ADD COLUMN IF NOT EXISTS "token" text`);
console.log("users.token ok");
await pool.query(
  `DROP TABLE IF EXISTS "osb_category_requests", "osb_khata_entries", "osb_khata_parties", "osb_reviews", "osb_seller_stores" CASCADE`
);
console.log("dropped 5 divergent tables");
await pool.end();
