// One-time Diwali festive hero seed (run: node seed-showcase-diwali.mjs). Idempotent.
import { Client } from "pg";
import "dotenv/config";

const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const ex = await c.query("SELECT count(*)::int AS n FROM osb_home_blocks WHERE kind='showcase'");
if (ex.rows[0].n > 0) {
  console.log("showcase-already-exists");
  await c.end();
  process.exit(0);
}
await c.query(
  `INSERT INTO osb_home_blocks
   (kind,tag,title,sub,cta,image,video,c1,c2,theme,anim,link_kind,link_value,slot,active,sort)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
  [
    "showcase",
    "ORDER NOW",
    "DIWALI DHAMAKA",
    "Sweets, diyas & gifts from nearby shops",
    "Order now",
    "", // backdrop art (optional — paste URL from editor to test)
    "", // video URL (paste mp4 from editor to test video)
    "rgba(74,14,46,.95)",
    "rgba(180,80,20,.55)",
    "diwali",
    "confetti",
    "search",
    "sweets",
    "top",
    true,
    0,
  ]
);
console.log("showcase-seeded=1");
await c.end();
