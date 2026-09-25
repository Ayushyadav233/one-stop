import "dotenv/config";
import { pool } from "./index.js";

const r = await pool.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'osb_%' ORDER BY 1"
);
console.log("TABLES:", r.rows.map((x) => x.table_name).join(", "));
const c = await pool.query(
  "SELECT table_name, column_name FROM information_schema.columns WHERE table_name LIKE 'osb_%' ORDER BY table_name, ordinal_position"
);
for (const row of c.rows) console.log(row.table_name + "." + row.column_name);
await pool.end();
