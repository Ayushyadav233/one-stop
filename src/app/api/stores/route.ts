import { NextResponse } from "next/server";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { STORES } from "@/lib/data";

export async function GET() {
  try {
    const rows = await db.select().from(stores).limit(30);
    if (rows.length === 0) return NextResponse.json({ stores: STORES, source: "static" });
    return NextResponse.json({ stores: rows, source: "db" });
  } catch {
    return NextResponse.json({ stores: STORES, source: "static" });
  }
}
