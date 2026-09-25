import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(80);
    return NextResponse.json({ orders: rows });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const code = String(b.code ?? "#OSB-" + Math.floor(1000 + Math.random() * 9000)).slice(0, 24);
  const payload = {
    code,
    storeKey: String(b.storeId ?? b.storeKey ?? "").slice(0, 40),
    storeName: String(b.storeName ?? "One Stop Bazar").slice(0, 160),
    customerName: String(b.customerName ?? "Aarav Mehta").slice(0, 120),
    customerPhone: String(b.customerPhone ?? "").slice(0, 40),
    items: Array.isArray(b.items) ? b.items.slice(0, 30) : [],
    subtotal: Number(b.subtotal ?? 0),
    deliveryFee: Number(b.deliveryFee ?? 0),
    discount: Number(b.discount ?? 0),
    total: Number(b.total ?? 0),
    status: String(b.status ?? "new").slice(0, 32),
    payment: String(b.payment ?? "UPI").slice(0, 32),
    address: String(b.address ?? "HSR Layout").slice(0, 320),
    etaMins: Number(b.etaMins ?? 28),
    rider: String(b.rider ?? "").slice(0, 80),
    riderPhone: String(b.riderPhone ?? "").slice(0, 40),
    otp: String(b.otp ?? "").slice(0, 8),
    note: String(b.note ?? "").slice(0, 240),
    distanceKm: Math.round(Number(b.distanceKm ?? 1)),
  };
  try {
    const rows = await db.insert(orders).values(payload).returning({ id: orders.id, code: orders.code, status: orders.status });
    return NextResponse.json({ id: rows[0]?.id, code: rows[0]?.code ?? code, status: rows[0]?.status ?? "new" });
  } catch {
    return NextResponse.json({ id: "local-" + Date.now(), code, status: payload.status, offline: true });
  }
}
