import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
try {
  await pool.query("ALTER TABLE osb_users ADD COLUMN IF NOT EXISTS role varchar(32) DEFAULT 'customer'");
  console.log("role column added");
  // seed super admin
  await pool.query(
    `INSERT INTO osb_users (phone, name, token, role) VALUES ($1, $2, $3, $4)
     ON CONFLICT (phone) DO UPDATE SET role = $4`,
    ["7988125778", "Super Admin", "sa-setup-token", "super_admin"]
  );
  console.log("super admin seeded");
} catch (e) { console.error(e); } finally { await pool.end(); }
