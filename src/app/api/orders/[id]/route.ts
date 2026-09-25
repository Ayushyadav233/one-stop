import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof b.status === "string") patch.status = String(b.status).slice(0, 32);
  if (typeof b.rider === "string") patch.rider = String(b.rider).slice(0, 80);
  if (typeof b.riderPhone === "string") patch.riderPhone = String(b.riderPhone).slice(0, 40);
  if (typeof b.riderLat === "number") patch.riderLat = String(b.riderLat);
  if (typeof b.riderLng === "number") patch.riderLng = String(b.riderLng);
  if (typeof b.riderLat === "number" || typeof b.riderLng === "number") patch.riderLastSeen = new Date();
  if (typeof b.proofPhoto === "string") patch.proofPhoto = String(b.proofPhoto);
  if (typeof b.deliveredBy === "string") patch.deliveredBy = String(b.deliveredBy).slice(0, 24);
  if (typeof b.note === "string") patch.note = String(b.note).slice(0, 240);
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  try {
    const rows = await db.update(orders).set(patch).where(eq(orders.id, id)).returning({ id: orders.id, status: orders.status, rider: orders.rider });
    if (!rows[0]) return NextResponse.json({ ok: true, local: true, id, ...patch });
    return NextResponse.json({ ok: true, ...rows[0] });
  } catch {
    return NextResponse.json({ ok: true, local: true, id, ...patch });
  }
}
