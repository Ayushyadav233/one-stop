/**
 * API layer — RN port of web src/app/api/* (stores, products, orders, health, seed).
 * Web used relative "/api/…"; on-device we need an absolute base URL:
 * - Set EXPO_PUBLIC_API_URL to your dev machine LAN URL (e.g. http://192.168.1.5:8787)
 * - Android emulator default: http://10.0.2.2:8787 (backend PORT=8787)
 * All calls fail soft (null/[]) so the app works fully offline on local store data.
 *
 * Auth: backend /api/auth/* (mock OTP, no SMS yet). Token lives in memory
 * (setApiToken) + expo-secure-store (osb-token, written by login screen,
 * restored at boot in shell.tsx). json() attaches it as Bearer automatically.
 */

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8787";

let API_TOKEN = "";
export function setApiToken(t: string) {
  API_TOKEN = t;
}
export function getApiToken() {
  return API_TOKEN;
}

/* 401 watcher — server ne token thukraya (stale/rotated session) to app
   silent-fail ki jagah "dobara login" UX dikhaye. osb-store register karta
   hai (cycle se bachne ke liye callback, direct import nahi). */
let authFailHandler: (() => void) | null = null;
export function onAuthFailure(cb: (() => void) | null) {
  authFailHandler = cb;
}

async function json<T>(path: string, init?: RequestInit, timeoutMs = 8000): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.status === 401 && authFailHandler) {
      try { authFailHandler(); } catch { /* noop */ }
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function apiSeed() {
  return json("/api/seed", { method: "POST", body: "{}" });
}

export function apiHealth() {
  return json<{ ok?: boolean }>("/api/health");
}

export function apiGetOrders() {
  return json<{ orders?: Record<string, unknown>[] }>("/api/orders").then((j) =>
    Array.isArray(j?.orders) ? j!.orders! : []
  );
}

export function apiPostOrder(payload: Record<string, unknown>) {
  return json<{ id?: string; code?: string }>("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Order PATCH (status / rider / GPS / photo / note) — was relative fetch, now base URL. */
export function apiPatchOrder(id: string, patch: Record<string, unknown>) {
  return json<{ ok?: boolean }>(`/api/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** Auth (mock OTP) — fail-soft null when backend unreachable. */
export function apiRequestOtp(phone: string) {
  return json<{ ok?: boolean; otp?: string }>(
    "/api/auth/request-otp",
    { method: "POST", body: JSON.stringify({ phone }) },
    10000
  );
}

export function apiVerifyOtp(phone: string, otp: string, name?: string) {
  return json<{ ok?: boolean; token?: string; error?: string; user?: ApiProfile }>(
    "/api/auth/verify-otp",
    { method: "POST", body: JSON.stringify({ phone, otp, name }) },
    10000
  );
}

/**
 * Firebase Phone Auth — google-services.json landed (project rudra-omniverse),
 * isliye ON. Backend me FIREBASE_PROJECT_ID set hona chahiye, warna
 * /api/auth/firebase 503 dega aur login screen error dikhayegi (fail-closed).
 */
export const FIREBASE_AUTH_ENABLED = true;

/** Firebase ID token → backend app token (same shape as verify-otp). */
export function apiFirebaseLogin(idToken: string, name?: string) {
  return json<{ ok?: boolean; token?: string; error?: string; user?: ApiProfile }>(
    "/api/auth/firebase",
    { method: "POST", body: JSON.stringify({ idToken, name }) },
    10000
  );
}

/** Push token register/unregister (needs login Bearer token). Fail-soft null. */
export function apiRegisterPushToken(token: string, platform = "android") {
  return json<{ ok?: boolean }>(
    "/api/push-tokens",
    { method: "POST", body: JSON.stringify({ token, platform }) },
    10000
  );
}

export function apiUnregisterPushToken(token: string) {
  return json<{ ok?: boolean }>(
    "/api/push-tokens",
    { method: "DELETE", body: JSON.stringify({ token }) },
    10000
  );
}

/** Profile — backend /api/users/me (fail-soft null when offline). */
export type ApiProfile = {
  id?: string; phone?: string; name?: string | null; email?: string | null;
  gender?: string | null; avatar?: string | null; address?: string | null;
  addressArea?: string | null; userLat?: number | null; userLng?: number | null;
  role?: string; walletPoints?: number | null; referralCode?: string | null; referredBy?: string | null;
};
export function apiGetMe() {
  return json<{ ok?: boolean; user?: ApiProfile }>("/api/users/me", undefined, 10000);
}
export function apiPatchMe(patch: Partial<ApiProfile>) {
  return json<{ ok?: boolean; user?: ApiProfile }>("/api/users/me", {
    method: "PATCH", body: JSON.stringify(patch),
  }, 10000);
}

/** Wallet + referral — backend /api/wallet/* (fail-soft null when offline/migration pending). */
// Conversion: 10 points = ₹1. 1 successful refer = 100 pts (₹10), referee ko 50 welcome.
export const POINTS_PER_RUPEE = 10;
export const REFER_REWARD_POINTS = 100;
export type ApiWalletTx = {
  id: string; kind?: string | null; points?: number | null; orderCode?: string | null;
  note?: string | null; createdAt?: string;
};
export function apiGetWallet() {
  return json<{ ok?: boolean; points?: number; rupees?: number; referralCode?: string | null; tx?: ApiWalletTx[] }>(
    "/api/wallet/me", undefined, 10000
  );
}
export function apiRedeemWallet(points: number, orderCode?: string) {
  return json<{ ok?: boolean; points?: number; rupees?: number; error?: string }>(
    "/api/wallet/redeem",
    { method: "POST", body: JSON.stringify({ points, orderCode }) },
    10000
  );
}
export function apiGetReferrals() {
  return json<{ ok?: boolean; code?: string | null; link?: string | null; count?: number; earnedPoints?: number; earnedRupees?: number }>(
    "/api/wallet/referrals/me", undefined, 10000
  );
}
export function apiApplyReferral(code: string) {
  return json<{ ok?: boolean; error?: string; referrerReward?: number; refereeBonus?: number; points?: number }>(
    "/api/wallet/referrals/apply",
    { method: "POST", body: JSON.stringify({ code }) },
    10000
  );
}
/** Coupons — guardrailed (auth validate, limits server-side). Fail-closed: no net = no discount. */
export type ApiCoupon = {
  id?: string; code: string; title: string; detail?: string | null;
  offPct?: number | null; maxOff?: number | null; minOrder?: number | null; kind?: string | null;
  fundedBy?: string | null; storeKey?: string | null; active?: boolean | null;
  startsAt?: string | null; expiresAt?: string | null;
  maxUsesPerUser?: number | null; firstOrderOnly?: boolean | null;
};
export function apiGetCoupons(storeKey?: string) {
  const q = storeKey ? `?storeKey=${encodeURIComponent(storeKey)}` : "";
  return json<{ coupons?: ApiCoupon[] }>(`/api/coupons${q}`).then((j) =>
    Array.isArray(j?.coupons) ? j!.coupons! : []
  );
}
export function apiValidateCoupon(code: string, subtotal: number, storeKey?: string) {
  return json<{ ok?: boolean; coupon?: ApiCoupon; discount?: number; error?: string }>(
    "/api/coupons/validate",
    { method: "POST", body: JSON.stringify({ code, subtotal, storeKey }) },
    10000
  );
}
/** Seller apne store ka offer (apni jeb se) — list/create/toggle/delete. */
export function apiSellerCoupons(storeKey?: string) {
  const q = storeKey ? `?storeKey=${encodeURIComponent(storeKey)}` : "";
  return json<{ coupons?: ApiCoupon[] }>(`/api/seller/coupons${q}`).then((j) =>
    Array.isArray(j?.coupons) ? j!.coupons! : []
  );
}
export function apiSellerPostCoupon(p: { storeKey: string; code: string; title: string; detail?: string; offPct: number; maxOff: number; minOrder: number }) {
  return json<{ ok?: boolean; coupon?: ApiCoupon; error?: string }>(
    "/api/seller/coupons",
    { method: "POST", body: JSON.stringify(p) },
    10000
  );
}
export function apiSellerPatchCoupon(id: string, patch: Record<string, unknown>) {
  return json<{ ok?: boolean; coupon?: ApiCoupon }>(`/api/seller/coupons/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(patch),
  }, 10000);
}
export function apiSellerDeleteCoupon(id: string) {
  return json<{ ok?: boolean }>(`/api/seller/coupons/${encodeURIComponent(id)}`, { method: "DELETE" }, 10000);
}
/** Seller store — dukaan ka server record (reinstall/phone-change pe restore). Fail-soft null. */
export type ApiSellerStore = {
  id?: string; ownerId?: string; name?: string; slug?: string; kind?: string | null;
  tagline?: string | null; image?: string | null; address?: string | null;
  isOpen?: boolean | null; profile?: Record<string, unknown> | null;
  createdAt?: string;
};
export function apiSellerGetStores() {
  return json<{ stores?: ApiSellerStore[] }>("/api/seller/store", undefined, 10000).then((j) =>
    Array.isArray(j?.stores) ? j!.stores! : []
  );
}
export function apiSellerPostStore(p: { name: string; slug?: string; kind?: string; tagline?: string; image?: string; address?: string; isOpen?: boolean; profile?: Record<string, unknown> }) {
  return json<{ ok?: boolean; store?: ApiSellerStore; error?: string }>(
    "/api/seller/store",
    { method: "POST", body: JSON.stringify(p) },
    10000
  );
}
export function apiSellerPatchStore(id: string, patch: { name?: string; kind?: string; tagline?: string; image?: string; address?: string; isOpen?: boolean; profile?: Record<string, unknown> }) {
  return json<{ ok?: boolean; store?: ApiSellerStore; error?: string }>(
    `/api/seller/store/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
    10000
  );
}

/** Reviews — mine (auth) + post + delete own (fail-soft). */
export type ApiReview = {
  id: string; storeId?: string | null; productId?: string | null; rating?: number | null;
  text?: string | null; reply?: string | null; createdAt?: string;
};
export function apiMyReviews() {
  return json<{ reviews?: ApiReview[] }>("/api/reviews/mine", undefined, 10000).then((j) =>
    Array.isArray(j?.reviews) ? j!.reviews! : []
  );
}
export function apiPostReview(r: { storeId?: string; productId?: string; rating: number; text?: string }) {
  return json<{ ok?: boolean; review?: ApiReview }>("/api/reviews", {
    method: "POST", body: JSON.stringify(r),
  }, 10000);
}
export function apiDeleteReview(id: string) {
  return json<{ ok?: boolean }>(`/api/reviews/${encodeURIComponent(id)}`, { method: "DELETE" }, 10000);
}

/** Order chat — 1 order = 1 thread. Null = server nahi (local-only thread mode). */
export type ApiChatMsg = { id: string; sender: string; text: string; createdAt: string };
export function apiGetChat(orderId: string) {
  return json<{ ok?: boolean; thread?: { id: string; orderCode?: string }; role?: string; messages?: ApiChatMsg[] }>(
    `/api/chat/${encodeURIComponent(orderId)}`, undefined, 10000
  );
}
export function apiSendChat(orderId: string, text: string) {
  return json<{ ok?: boolean; local?: boolean; message?: ApiChatMsg }>(
    `/api/chat/${encodeURIComponent(orderId)}`,
    { method: "POST", body: JSON.stringify({ text }) },
    10000
  );
}

/** Homepage CMS — public live blocks + editable texts + version (fail-soft defaults). */
export type ApiHomeBlock = {
  id: string; kind: "banner" | "festival" | "ad" | "strip" | "showcase";
  tag?: string; title?: string; sub?: string; cta?: string; image?: string;
  c1?: string; c2?: string; linkKind?: string; linkValue?: string; sort?: number;
  slot?: "top" | "banners" | "strips" | "mid" | "festival" | "bottom" | "feed" | string;
  theme?: "none" | "concert" | "diwali" | "christmas" | "holi" | "newyear" | "monsoon" | string;
  video?: string;
  anim?: "floaters" | "confetti" | "spotlight" | "none" | string;
  font?: "serif" | "heavy" | "bold" | string;
  tcolor?: string;
  artpos?: "top" | "center" | "bottom" | string;
  zoom?: number;
  align?: "top" | "center" | "bottom" | string;
  stageh?: number;
  ctapos?: "left" | "center" | "right" | string;
  ctasize?: "s" | "m" | "l" | string;
  ctacolor?: string;
  layout?: { hx?: number; hy?: number; hs?: string; cx?: number; cy?: number; ax?: number; ay?: number };
  fit?: "cover" | "contain" | string;
  active?: boolean; startsAt?: string | null; endsAt?: string | null;
};
export type ApiHomeConfig = Record<string, string>;
export const HOME_CONFIG_DEFAULTS: ApiHomeConfig = {
  searchPlaceholder: "Search “biryani”, “A2 milk”, “plumber”…",
  greetingSub: "Sab kuch, ek app me",
  liveBadge: "LIVE",
  categoriesTitle: "Explore categories",
  festivalTitle: "Festive picks for you",
  festivalSub: "Sweets, gifts & more from nearby shops",
  festivalCta: "Send gift",
  stripsDefault: "50% OFF up to ₹100|Free delivery over ₹199|20% cashback|₹200 OFF services",
  showFestival: "1",
  showAds: "1",
  showStrips: "1",
  showCategories: "1",
};
export type ApiHomeVersion = { id: string; note?: string; createdBy?: string; createdAt?: string; blockCount?: number };
export function apiGetHome() {
  return json<{ blocks?: ApiHomeBlock[]; config?: ApiHomeConfig; version?: string | null }>("/api/home").then((j) => ({
    blocks: Array.isArray(j?.blocks) ? j!.blocks! : [],
    config: { ...HOME_CONFIG_DEFAULTS, ...(j?.config ?? {}) },
    version: j?.version ?? null,
  }));
}
export function apiGetHomeBlocks() {
  return apiGetHome().then((h) => h.blocks);
}

/** Admin-only endpoints — role checked on backend (super_admin only). */
export function apiAdminMe() {
  return json<{ ok?: boolean; user?: { id: string; phone: string; name: string; role: string } }>("/api/admin/me");
}
export function apiAdminUsers() {
  return json<{ users?: { id: string; phone: string; name: string; role: string; createdAt: string }[] }>("/api/admin/users");
}
export function apiAdminPatchUserRole(phone: string, role: string) {
  return json<{ ok?: boolean; user?: { id: string; phone: string; name: string; role: string } }>(
    `/api/admin/users/${encodeURIComponent(phone)}/role`,
    { method: "PATCH", body: JSON.stringify({ role }) }
  );
}
export function apiAdminStats() {
  return json<{ ok?: boolean; stats?: Record<string, unknown> }>("/api/admin/stats");
}
export function apiAdminStores() {
  return json<{ stores?: Record<string, unknown>[] }>("/api/admin/stores");
}
export function apiAdminPatchStore(id: string, patch: Record<string, unknown>) {
  return json<{ ok?: boolean; store?: Record<string, unknown> }>(`/api/admin/stores/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(patch),
  });
}
export function apiAdminPostStore(payload: Record<string, unknown>) {
  return json<{ ok?: boolean; store?: Record<string, unknown> }>("/api/admin/stores", {
    method: "POST", body: JSON.stringify(payload),
  });
}
export function apiAdminDeleteStore(id: string) {
  return json<{ ok?: boolean }>(`/api/admin/stores/${encodeURIComponent(id)}`, { method: "DELETE" });
}
export function apiAdminProducts(storeId?: string) {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  return json<{ products?: Record<string, unknown>[] }>(`/api/admin/products${q}`);
}
export function apiAdminPatchProduct(id: string, patch: Record<string, unknown>) {
  return json<{ ok?: boolean; product?: Record<string, unknown> }>(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(patch),
  });
}
export function apiAdminPostProduct(payload: Record<string, unknown>) {
  return json<{ ok?: boolean; product?: Record<string, unknown> }>("/api/admin/products", {
    method: "POST", body: JSON.stringify(payload),
  });
}
export function apiAdminDeleteProduct(id: string) {
  return json<{ ok?: boolean }>(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
}
export function apiAdminCoupons() {
  return json<{ coupons?: Record<string, unknown>[] }>("/api/admin/coupons");
}
export function apiAdminPatchCoupon(id: string, patch: Record<string, unknown>) {
  return json<{ ok?: boolean; coupon?: Record<string, unknown> }>(`/api/admin/coupons/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(patch),
  });
}
export function apiAdminPostCoupon(payload: Record<string, unknown>) {
  return json<{ ok?: boolean; coupon?: Record<string, unknown> }>("/api/admin/coupons", {
    method: "POST", body: JSON.stringify(payload),
  });
}
export function apiAdminDeleteCoupon(id: string) {
  return json<{ ok?: boolean }>(`/api/admin/coupons/${encodeURIComponent(id)}`, { method: "DELETE" });
}
export function apiAdminOrders(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return json<{ orders?: Record<string, unknown>[] }>(`/api/admin/orders${q}`);
}
export function apiAdminPatchOrder(id: string, patch: Record<string, unknown>) {
  return json<{ ok?: boolean; order?: Record<string, unknown> }>(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(patch),
  });
}
export function apiAdminCatRequests() {
  return json<{ categoryRequests?: Record<string, unknown>[] }>("/api/admin/categories");
}
export function apiAdminPatchCatRequest(id: string, status: string) {
  return json<{ ok?: boolean }>(`/api/admin/categories/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify({ status }),
  });
}
export function apiAdminHomeBlocks() {
  return json<{ blocks?: ApiHomeBlock[] }>("/api/admin/home").then((j) =>
    Array.isArray(j?.blocks) ? j!.blocks! : []
  );
}
export function apiAdminPostHomeBlock(payload: Partial<ApiHomeBlock>) {
  return json<{ ok?: boolean; block?: ApiHomeBlock }>("/api/admin/home", {
    method: "POST", body: JSON.stringify(payload),
  });
}
export function apiAdminPatchHomeBlock(id: string, patch: Partial<ApiHomeBlock>) {
  return json<{ ok?: boolean; block?: ApiHomeBlock }>(`/api/admin/home/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(patch),
  });
}
export function apiAdminDeleteHomeBlock(id: string) {
  return json<{ ok?: boolean }>(`/api/admin/home/${encodeURIComponent(id)}`, { method: "DELETE" });
}
export function apiAdminGetHomeConfig() {
  return json<{ ok?: boolean; config?: ApiHomeConfig }>(`/api/admin/home-config`).then((j) => ({
    ...HOME_CONFIG_DEFAULTS,
    ...(j?.config ?? {}),
  }));
}
export function apiAdminPatchHomeConfig(patch: Partial<ApiHomeConfig>) {
  return json<{ ok?: boolean; config?: ApiHomeConfig }>(`/api/admin/home-config`, {
    method: "PATCH", body: JSON.stringify(patch),
  });
}
export function apiAdminPublishHome(note?: string) {
  return json<{ ok?: boolean; version?: ApiHomeVersion }>(`/api/admin/home/publish`, {
    method: "POST", body: JSON.stringify({ note: note ?? "" }),
  });
}
export function apiAdminHomeVersions() {
  return json<{ versions?: (ApiHomeVersion & { snapshot?: unknown })[] }>(`/api/admin/home-versions`).then((j) =>
    Array.isArray(j?.versions) ? j!.versions! : []
  );
}
export function apiAdminRevertHome(versionId: string) {
  return json<{ ok?: boolean; version?: ApiHomeVersion }>(`/api/admin/home/revert`, {
    method: "POST", body: JSON.stringify({ versionId }),
  });
}
