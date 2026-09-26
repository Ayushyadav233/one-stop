/**
 * API layer — RN port of web src/app/api/* (stores, products, orders, health, seed).
 * Web used relative "/api/…"; on-device we need an absolute base URL:
 * - Set EXPO_PUBLIC_API_URL to your dev machine LAN URL (e.g. http://192.168.1.5:8787)
 * - Android emulator default: http://10.0.2.2:3000
 * All calls fail soft (null/[]) so the app works fully offline on local store data.
 *
 * Auth: backend /api/auth/* (mock OTP, no SMS yet). Token lives in memory
 * (setApiToken) + expo-secure-store (osb-token, written by login screen,
 * restored at boot in shell.tsx). json() attaches it as Bearer automatically.
 */

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";

let API_TOKEN = "";
export function setApiToken(t: string) {
  API_TOKEN = t;
}
export function getApiToken() {
  return API_TOKEN;
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
  return json<{ ok?: boolean; token?: string; error?: string }>(
    "/api/auth/verify-otp",
    { method: "POST", body: JSON.stringify({ phone, otp, name }) },
    10000
  );
}

/**
 * Firebase Phone Auth — flip to true ONLY after google-services.json lands
 * in the project AND backend has FIREBASE_PROJECT_ID. Until then the app
 * uses the backend-OTP flow above (unchanged).
 */
export const FIREBASE_AUTH_ENABLED = false;

/** Firebase ID token → backend app token (same shape as verify-otp). */
export function apiFirebaseLogin(idToken: string, name?: string) {
  return json<{ ok?: boolean; token?: string; error?: string }>(
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
