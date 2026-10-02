import { Linking } from "react-native";
import { STORES } from "@/lib/data";
import type { CartLine, LiveOrder, OrderStatus, SellerCoupon, SellerSettings } from "@/lib/osb-store";

export const CUSTOMER = { name: "Aarav Mehta", phone: "+91 98450 12345" };

export function isMyStore(storeId: string, seller: SellerSettings) {
  return !!storeId && storeId === (seller.storeId || "mine");
}

export function getStoreLocation(storeId: string) {
  const seed = [...(storeId || "store")].reduce((a, c) => a + c.charCodeAt(0), 0);
  return { lat: 12.9121 + ((seed % 9) - 4) * 0.0035, lng: 77.6446 + ((seed % 7) - 3) * 0.0035 };
}

export function getCustomerLocation(address?: string) {
  const seed = [...(address || "HSR")].reduce((a, c) => a + c.charCodeAt(0), 0);
  return { lat: 12.9169 + ((seed % 5) - 2) * 0.002, lng: 77.6386 + ((seed % 7) - 3) * 0.002 };
}

export function openGoogleMapsNav(originAddr: string, destAddr: string, destLat?: number, destLng?: number) {
  let url: string;
  if (destLat && destLng) {
    url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=two_wheeler`;
  } else {
    url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originAddr || "HSR Layout")}&destination=${encodeURIComponent(destAddr || "HSR Layout")}&travelmode=two_wheeler`;
  }
  Linking.openURL(url).catch(() => {});
}

export interface StoreQuote {
  storeId: string;
  storeName: string;
  subtotal: number;
  fee: number;
  discount: number;
  total: number;
  minOrder: number;
  freeAbove: number;
  deliveryFee: number;
  etaMins: number;
  belowMin: boolean;
  freeDelivery: boolean;
  storeOpen: boolean;
}

export interface CartQuote {
  groups: { storeId: string; storeName: string; items: CartLine[]; quote: StoreQuote }[];
  subtotal: number;
  fee: number;
  discount: number;
  total: number;
  blocked: boolean;
  reason?: string;
}

export function timeAgo(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function statusStep(status: OrderStatus): number {
  if (status === "cancelled") return -1;
  if (status === "new") return 0;
  if (status === "accepted" || status === "preparing") return 1;
  if (status === "ready" || status === "onway") return 2;
  return 3;
}

export function statusLabel(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    new: "Waiting for store",
    accepted: "Accepted",
    preparing: "Preparing",
    ready: "Ready for pickup",
    onway: "On the way",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return map[status];
}

/**
 * Service-booking lifecycle (Amazon style) — same statuses, service matlab:
 * new = confirmation pending → accepted = schedule confirmed (yahi atka rehta hai)
 * → onway = pro out for service (tabhi map live) → ready = pro reached
 * → delivered = service done. `preparing` service flow me skip hota hai.
 */
export function serviceStatusText(o: { status: OrderStatus; slotLabel?: string | null }): string {
  switch (o.status) {
    case "new": return "Booking sent — waiting for confirmation";
    case "accepted": return o.slotLabel ? `Schedule confirmed • ${o.slotLabel}` : "Schedule confirmed";
    case "preparing": return o.slotLabel ? `Schedule confirmed • ${o.slotLabel}` : "Schedule confirmed";
    case "onway": return "Pro is out for service";
    case "ready": return "Pro has reached your location ✓";
    case "delivered": return "Service completed 🎉";
    case "cancelled": return "Booking cancelled";
  }
}

/** Status pill — service me booking vocabulary. */
export function serviceStatusPill(status: OrderStatus): string {
  switch (status) {
    case "new": return "BOOKING SENT";
    case "accepted": return "CONFIRMED";
    case "preparing": return "CONFIRMED";
    case "onway": return "PRO ON THE WAY";
    case "ready": return "PRO REACHED";
    case "delivered": return "COMPLETED";
    case "cancelled": return "CANCELLED";
  }
}

/** Tracking headline — product purana, service naya vocabulary. */
export function trackingHeadline(o: { kind?: string | null; status: OrderStatus; slotLabel?: string | null; rider?: string | null }): string | null {
  if (o.kind !== "service") return null;
  if (o.status === "onway" && o.rider) return `${o.rider.split(" ")[0]} is on the way`;
  return serviceStatusText(o);
}

export function storeRules(storeId: string, seller: SellerSettings, storewideOff: number) {
  if (isMyStore(storeId, seller)) {
    return {
      storeId,
      storeName: seller.name,
      deliveryFee: seller.deliveryOn ? seller.deliveryFee : 0,
      freeAbove: seller.freeAbove,
      minOrder: seller.minOrder,
      etaMins: seller.avgTime,
      radiusKm: seller.radiusKm,
      storeOpen: seller.storeOpen && !seller.vacationUntil && seller.deliveryOn,
      storewideOff,
      pickup: seller.pickup,
    };
  }
  const s = STORES.find((x) => x.id === storeId);
  return {
    storeId,
    storeName: s?.name ?? "Local store",
    deliveryFee: s?.deliveryFee ?? 29,
    freeAbove: s?.deliveryFee === 0 ? 0 : 199,
    minOrder: 99,
    etaMins: s?.etaMins ?? 30,
    radiusKm: 8,
    storeOpen: s?.isOpen ?? true,
    storewideOff: 0,
    pickup: false,
  };
}

export interface CouponProof { code: string; discount: number; fundedBy?: string | null; storeKey?: string | null; at: number }
/** Proof 5 min fresh + same code + seller-scope match — warna discount ZERO (fail-closed). */
export function proofDiscount(proof: CouponProof | null, couponCode: string | null, storeId: string, subtotal: number): number {
  if (!proof || !couponCode || proof.code !== couponCode) return 0;
  if (Date.now() - proof.at > 5 * 60 * 1000) return 0;
  if (proof.fundedBy === "seller" && proof.storeKey && proof.storeKey !== storeId) return 0;
  return Math.min(Math.max(0, Math.round(proof.discount)), subtotal);
}

export function quoteStore(
  storeId: string,
  items: CartLine[],
  seller: SellerSettings,
  storewideOff: number,
  couponCode: string | null,
  sellerCoupons: SellerCoupon[],
  proof?: CouponProof | null,
): StoreQuote {
  const r = storeRules(storeId, seller, storewideOff);
  const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
  let discount = 0;
  // Platform/seller coupon: SIRF server proof pe (offline/static list se discount nahi).
  discount += proofDiscount(proof ?? null, couponCode, storeId, subtotal);
  if (isMyStore(storeId, seller)) {
    if (r.storewideOff > 0) discount += Math.round((subtotal * r.storewideOff) / 100);
    const sc = sellerCoupons.find((c) => c.active && c.code === couponCode);
    if (sc && subtotal >= sc.minOrder) {
      const extra = sc.kind === "pct" ? Math.min(Math.round((subtotal * sc.value) / 100), sc.maxOff) : sc.value;
      discount += extra;
    }
  }
  discount = Math.min(discount, subtotal);
  const payable = subtotal - discount;
  const freeDelivery = r.freeAbove > 0 ? payable >= r.freeAbove : r.deliveryFee === 0;
  const fee = freeDelivery ? 0 : r.deliveryFee;
  const belowMin = payable < r.minOrder;
  return {
    storeId: r.storeId,
    storeName: r.storeName,
    subtotal,
    fee,
    discount,
    total: payable + fee,
    minOrder: r.minOrder,
    freeAbove: r.freeAbove,
    deliveryFee: r.deliveryFee,
    etaMins: r.etaMins,
    belowMin,
    freeDelivery,
    storeOpen: r.storeOpen,
  };
}

export function quoteCart(
  cart: CartLine[],
  seller: SellerSettings,
  storewideOff: number,
  couponCode: string | null,
  sellerCoupons: SellerCoupon[],
  proof?: CouponProof | null,
): CartQuote {
  const map = new Map<string, CartLine[]>();
  for (const l of cart) {
    const k = l.storeId || "unknown";
    map.set(k, [...(map.get(k) ?? []), l]);
  }
  const groups = [...map.entries()].map(([storeId, items]) => {
    const quote = quoteStore(storeId, items, seller, storewideOff, couponCode, sellerCoupons, proof);
    return { storeId, storeName: quote.storeName, items, quote };
  });
  const subtotal = groups.reduce((a, g) => a + g.quote.subtotal, 0);
  const fee = groups.reduce((a, g) => a + g.quote.fee, 0);
  const discount = groups.reduce((a, g) => a + g.quote.discount, 0);
  const total = groups.reduce((a, g) => a + g.quote.total, 0);
  const closed = groups.find((g) => !g.quote.storeOpen);
  const under = groups.find((g) => g.quote.belowMin);
  let blocked = false;
  let reason: string | undefined;
  if (closed) {
    blocked = true;
    reason = `${closed.storeName} is closed or not delivering right now.`;
  } else if (under) {
    blocked = true;
    reason = `${under.storeName} needs min ₹${under.quote.minOrder} (you're at ₹${under.quote.subtotal - under.quote.discount}).`;
  }
  return { groups, subtotal, fee, discount, total, blocked, reason };
}

export function toApiOrder(o: LiveOrder) {
  return {
    id: o.id,
    code: o.code,
    storeId: o.storeId,
    storeName: o.storeName,
    customerName: o.customer,
    customerPhone: o.phone,
    address: o.address,
    items: o.items,
    subtotal: o.subtotal,
    deliveryFee: o.fee,
    discount: o.discount,
    total: o.total,
    payment: o.payment,
    couponCode: o.couponCode ?? null,
    walletUsed: o.walletUsed ?? 0,
    extraDiscount: o.extraDiscount ?? 0,
    kind: o.kind ?? "product",
    scheduledAt: o.scheduledAt ? new Date(o.scheduledAt).toISOString() : null,
    slotLabel: o.slotLabel ?? null,
    payStatus: o.payStatus ?? "paid",
    status: o.status,
    etaMins: o.etaMins,
    rider: o.rider ?? "",
    riderPhone: o.riderPhone ?? "",
    riderLat: o.riderLat,
    riderLng: o.riderLng,
    otp: o.otp ?? "",
    proofPhoto: o.proofPhoto ?? "",
    deliveredBy: o.deliveredBy ?? "",
    note: o.note ?? "",
    distanceKm: o.distanceKm,
    createdAt: o.createdAt,
  };
}

export function fromApiOrder(row: Record<string, unknown>): LiveOrder {
  const items = Array.isArray(row.items) ? (row.items as CartLine[]) : [];
  const created = row.createdAt ? new Date(String(row.createdAt)).getTime() : Date.now();
  return {
    id: String(row.id ?? ""),
    code: String(row.code ?? ""),
    storeId: String(row.storeKey ?? row.storeId ?? ""),
    storeName: String(row.storeName ?? ""),
    customer: String(row.customerName ?? CUSTOMER.name),
    phone: String(row.customerPhone ?? CUSTOMER.phone),
    address: String(row.address ?? ""),
    items,
    subtotal: Number(row.subtotal ?? 0),
    fee: Number(row.deliveryFee ?? 0),
    discount: Number(row.discount ?? 0),
    total: Number(row.total ?? 0),
    payment: String(row.payment ?? "UPI"),
    kind: String(row.kind ?? "product") === "service" ? "service" : "product",
    scheduledAt: row.scheduledAt ? new Date(String(row.scheduledAt)).getTime() : null,
    slotLabel: row.slotLabel ? String(row.slotLabel) : null,
    payStatus: String(row.payStatus ?? "paid") === "pending" ? "pending" : "paid",
    status: (String(row.status ?? "new") as OrderStatus),
    etaMins: Number(row.etaMins ?? 30),
    createdAt: Number.isFinite(created) ? created : Date.now(),
    rider: row.rider ? String(row.rider) : undefined,
    riderPhone: row.riderPhone ? String(row.riderPhone) : undefined,
    riderLat: row.riderLat != null ? Number(row.riderLat) : undefined,
    riderLng: row.riderLng != null ? Number(row.riderLng) : undefined,
    riderLastSeen: row.riderLastSeen ? new Date(String(row.riderLastSeen)).getTime() : undefined,
    otp: row.otp ? String(row.otp) : undefined,
    proofPhoto: row.proofPhoto ? String(row.proofPhoto) : undefined,
    deliveredBy: row.deliveredBy ? String(row.deliveredBy) : undefined,
    note: row.note ? String(row.note) : undefined,
    distanceKm: Number(row.distanceKm ?? 1.2),
  };
}
