import { NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { PRODUCTS } from "@/lib/data";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId");
  try {
    const rows = await db.select().from(products).limit(100);
    if (rows.length === 0) {
      const list = storeId ? PRODUCTS.filter((p) => p.storeId === storeId) : PRODUCTS;
      return NextResponse.json({ products: list, source: "static" });
    }
    const list = storeId ? rows.filter((r) => (r as { storeId?: string }).storeId === storeId) : rows;
    return NextResponse.json({ products: list, source: "db" });
  } catch {
    const list = storeId ? PRODUCTS.filter((p) => p.storeId === storeId) : PRODUCTS;
    return NextResponse.json({ products: list, source: "static" });
  }
}
