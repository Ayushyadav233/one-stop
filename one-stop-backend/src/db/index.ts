import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

export const db = drizzle(pool);
