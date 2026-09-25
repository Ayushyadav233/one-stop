import "dotenv/config";
import { readFileSync } from "node:fs";
import { pool } from "./index.js";

const sql = readFileSync(new URL("../../drizzle/0000_light_penance.sql", import.meta.url), "utf8");
const stmts = sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);

let ok = 0;
let skipped = 0;
for (let s of stmts) {
  s = s.replace(/CREATE TABLE "/g, 'CREATE TABLE IF NOT EXISTS "');
  try {
    await pool.query(s);
    ok++;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // already-exists / duplicate constraint errors are fine (4 purani tables)
    if (/already exists|duplicate|42P07|42710|42701/i.test(msg)) {
      skipped++;
      continue;
    }
    console.error("STATEMENT FAILED:", msg.slice(0, 300), "\n", s.slice(0, 200));
    process.exitCode = 1;
  }
}
console.log(`apply done: ok=${ok} skipped=${skipped} total=${stmts.length}`);
await pool.end();
