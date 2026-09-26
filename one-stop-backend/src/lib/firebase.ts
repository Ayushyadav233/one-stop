import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Firebase Admin — sirf ID-token VERIFY ke liye (private key nahi chahiye,
// public certs se verify hota hai). Push sending Expo Push API se hai,
// isliye FCM service-account key ki zaroorat nahi.
// Env: FIREBASE_PROJECT_ID (unset → firebase endpoints 503, baaki app chalta rahe).

let app: App | null = null;

export function firebaseProjectId(): string {
  return (process.env.FIREBASE_PROJECT_ID ?? "").trim();
}

export function firebaseEnabled(): boolean {
  return firebaseProjectId().length > 0;
}

function getApp(): App {
  if (app) return app;
  app = initializeApp({ projectId: firebaseProjectId() });
  return app;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; phone: string }> {
  const decoded = await getAuth(getApp()).verifyIdToken(idToken);
  return { uid: decoded.uid, phone: String((decoded as { phone_number?: unknown }).phone_number ?? "") };
}

/** India-only normalize: "+919876543210" → "9876543210". Else "" (reject). */
export function normalizeIndianPhone(phone: string): string {
  const d = String(phone ?? "").replace(/\D/g, "");
  if (/^\d{10}$/.test(d)) return d;
  if (/^91\d{10}$/.test(d)) return d.slice(-10);
  return "";
}
