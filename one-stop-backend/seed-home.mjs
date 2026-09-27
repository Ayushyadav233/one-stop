// One-time seed for osb_home_blocks (run: node seed-home.mjs). Idempotent.
import { Client } from "pg";
import "dotenv/config";

const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const ex = await c.query("SELECT count(*)::int AS n FROM osb_home_blocks");
if (ex.rows[0].n > 0) {
  console.log("already-seeded");
  await c.end();
  process.exit(0);
}
const st = await c.query("SELECT slug,name,image FROM osb_stores ORDER BY created_at LIMIT 8");
const img = (i) => st.rows[i % st.rows.length]?.image || "";
const seeds = [
  ["banner", "MEGHANA FEST", "50% OFF Biryani", "Code BAZAR50 - Free delivery", "Order now", img(0), "rgba(10,10,10,.78)", "rgba(10,10,10,.15)", "search", "biryani", 1],
  ["banner", "FRESH AT 6 AM", "Veggies in 12 mins", "Farm direct - 20% OFF", "Shop fresh", img(4), "rgba(14,59,46,.85)", "rgba(14,59,46,.15)", "search", "vegetables", 2],
  ["banner", "GLOW AT HOME", "Salon @ Rs.1499", "O3+ facial - 4.9 rated pros", "Book now", img(7) || img(1), "rgba(60,20,60,.8)", "rgba(60,20,60,.1)", "search", "salon", 3],
  ["festival", "DIWALI EDIT IS LIVE", "Sweets, diyas & gifts", "from 14 local shops", "Shop festive", img(7) || img(0), "rgba(74,14,46,.92)", "rgba(74,14,46,.55)", "search", "sweets", 4],
  ["strip", "", "50% OFF up to Rs.100", "", "", "", "", "", "none", "", 5],
  ["strip", "", "Free delivery over Rs.199", "", "", "", "", "", "none", "", 6],
  ["strip", "", "20% cashback", "", "", "", "", "", "none", "", 7],
  ["strip", "", "Rs.200 OFF services", "", "", "", "", "", "none", "", 8],
];
for (const s of seeds) {
  await c.query(
    "INSERT INTO osb_home_blocks (kind,tag,title,sub,cta,image,c1,c2,link_kind,link_value,sort) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
    s
  );
}
console.log("seeded=" + seeds.length);
await c.end();
