import "dotenv/config";
import { pool } from "./index.js";

for (const t of ["osb_users", "osb_category_requests", "osb_khata_entries", "osb_khata_parties", "osb_reviews", "osb_seller_stores", "osb_sessions", "osb_stores", "osb_products", "osb_orders", "osb_coupons", "osb_otp_codes"]) {
  try {
    const r = await pool.query(`SELECT count(*)::int AS n FROM "${t}"`);
    console.log(t + ": " + r.rows[0].n);
  } catch (e) {
    console.log(t + ": ERR " + String(e).slice(0, 120));
  }
}
await pool.end();
