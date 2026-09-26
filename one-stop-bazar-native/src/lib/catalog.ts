/**
 * Remote catalog adapter (Phase-2 P2) — backend stores/products → app types.
 * Bridge: backend `slug` === app static `id` ("meghana"). Product ke paas koi
 * slug nahi, isliye dedupe (storeSlug + normalized name) se hota hai.
 * Fail-soft: offline / backend down / bad rows → null (static catalog chalta rahe).
 */
import { API_BASE } from "@/lib/api";
import type { Kind, Product, Store } from "@/lib/data";

export interface CatalogMaps {
  slugToUuid: Record<string, string>;
  uuidToSlug: Record<string, string>;
}

export interface RemoteCatalog {
  stores: Store[];
  products: Product[];
  maps: CatalogMaps;
}

const KIND_EMOJI: Record<string, string> = {
  food: "🍛",
  grocery: "🥬",
  service: "🔧",
  medical: "💊",
  bakery: "🧁",
  flowers: "💐",
  electronics: "🔌",
  hardware: "🧰",
  pets: "🐾",
  sweets: "🍬",
  fashion: "👗",
  beauty: "💄",
  homekitchen: "🍳",
  furniture: "🪑",
  books: "📚",
  toys: "🧸",
  sports: "🏏",
  auto: "🚗",
  mobile: "📱",
  household: "🧹",
};

const KIND_TINT: Record<string, string> = {
  food: "#FFE7C2",
  grocery: "#DFF5D1",
  service: "#E3F2FD",
  medical: "#E8F5E9",
  bakery: "#FCE4EC",
  flowers: "#FCE4EC",
  electronics: "#E8EAF6",
  hardware: "#FFF3E0",
  pets: "#FFF8E1",
  sweets: "#FFF3E0",
  fashion: "#F3E5F5",
  beauty: "#FCE4EC",
  homekitchen: "#FFF8E1",
  furniture: "#EFEBE9",
  books: "#E8EAF6",
  toys: "#FFF3E0",
  sports: "#E0F7FA",
  auto: "#ECEFF1",
  mobile: "#E8EAF6",
  household: "#F1F8E9",
};

const KNOWN_KINDS = new Set(Object.keys(KIND_EMOJI));

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Dedupe key: storeSlug + normalized name. */
export function productKey(storeSlug: string, name: string): string {
  return `${storeSlug}::${name.toLowerCase().trim().replace(/\s+/g, " ")}`;
}

interface BackendStore {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  kind?: unknown;
  tagline?: unknown;
  image?: unknown;
  rating?: unknown;
  ratingsCount?: unknown;
  etaMins?: unknown;
  deliveryFee?: unknown;
  distanceKm?: unknown;
  address?: unknown;
  isOpen?: unknown;
  isPureVeg?: unknown;
  offers?: unknown;
  tags?: unknown;
  openHours?: unknown;
  healthScore?: unknown;
}

interface BackendProduct {
  id?: unknown;
  storeId?: unknown;
  store_id?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  mrp?: unknown;
  emoji?: unknown;
  image?: unknown;
  images?: unknown;
  category?: unknown;
  rating?: unknown;
  isVeg?: unknown;
  isBestseller?: unknown;
  stock?: unknown;
  unit?: unknown;
  tint?: unknown;
  hidden?: unknown;
}

function toStore(r: BackendStore): Store | null {
  const slug = str(r.slug).trim();
  const name = str(r.name).trim();
  if (!slug || !name) return null;
  const kind = (KNOWN_KINDS.has(str(r.kind)) ? str(r.kind) : "grocery") as Kind;
  const tags = strArr(r.tags);
  return {
    id: slug,
    name,
    slug,
    kind,
    tagline: str(r.tagline),
    emoji: KIND_EMOJI[kind] ?? "🛍️",
    image: str(r.image),
    tint: KIND_TINT[kind] ?? "#FCE4EC",
    rating: num(r.rating, 4.5),
    ratingsCount: String(r.ratingsCount ?? 0),
    etaMins: num(r.etaMins, 30),
    deliveryFee: num(r.deliveryFee, 29),
    distanceKm: num(r.distanceKm, 1.2),
    address: str(r.address),
    isOpen: r.isOpen !== false,
    isPureVeg: r.isPureVeg === true,
    offers: strArr(r.offers),
    tags,
    openHours: str(r.openHours),
    healthScore: num(r.healthScore, 88),
    cuisine: tags.join(" • "),
  };
}

function toProduct(r: BackendProduct, storeSlug: string): Product | null {
  const id = str(r.id).trim();
  const name = str(r.name).trim();
  if (!id || !name || !storeSlug) return null;
  if (r.hidden === true) return null;
  const images = strArr(r.images);
  const image = str(r.image) || images[0] || "";
  return {
    id,
    storeId: storeSlug,
    name,
    description: str(r.description),
    price: num(r.price, 0),
    mrp: r.mrp == null ? undefined : num(r.mrp, 0),
    emoji: str(r.emoji, "🍔"),
    image,
    images: images.length ? images : undefined,
    category: str(r.category, "General"),
    rating: num(r.rating, 4.4),
    isVeg: r.isVeg !== false,
    isBestseller: r.isBestseller === true,
    stock: num(r.stock, 99),
    unit: str(r.unit, "1 pc"),
    tint: str(r.tint, "#FCE4EC"),
  };
}

async function getJSON(path: string, timeoutMs = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Backend catalog fetch + convert. Null = static fallback use karo. */
export async function fetchRemoteCatalog(): Promise<RemoteCatalog | null> {
  try {
    const [sj, pj] = await Promise.all([getJSON("/api/stores"), getJSON("/api/products")]);
    const sRows = (sj as { stores?: unknown } | null)?.stores;
    const pRows = (pj as { products?: unknown } | null)?.products;
    if (!Array.isArray(sRows) || !Array.isArray(pRows)) return null;
    const slugToUuid: Record<string, string> = {};
    const uuidToSlug: Record<string, string> = {};
    const stores: Store[] = [];
    for (const r of sRows as BackendStore[]) {
      const s = toStore(r ?? {});
      if (!s) continue;
      const uuid = str((r as BackendStore).id);
      if (uuid) {
        slugToUuid[s.slug] = uuid;
        uuidToSlug[uuid] = s.slug;
      }
      stores.push(s);
    }
    if (stores.length === 0) return null;
    const products: Product[] = [];
    for (const r of pRows as BackendProduct[]) {
      const row = r ?? {};
      const storeUuid = str(row.storeId ?? row.store_id);
      const slug = uuidToSlug[storeUuid] ?? "";
      const p = toProduct(row, slug);
      if (p) products.push(p);
    }
    return { stores, products, maps: { slugToUuid, uuidToSlug } };
  } catch {
    return null;
  }
}
