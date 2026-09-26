import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS osb_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES osb_users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform varchar(16) DEFAULT 'android',
  created_at timestamptz DEFAULT now()
);`;
await pool.query(sql);
console.log("osb_push_tokens ready");
await pool.end();
