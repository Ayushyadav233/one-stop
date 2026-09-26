import { db } from "../db/index.js";
import { pushTokens, users } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { normalizeIndianPhone } from "./firebase.js";

// Expo Push API se bhejo (FCM service key nahi chahiye — Expo ka push
// service handle karta hai; prod Android pe FCM key `expo credentials` me
// upload karna hota hai, wo alag step). Hamesha fail-soft: kabhi throw nahi.
export async function notifyUserPhones(
  phones: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<number> {
  try {
    const normalized = [...new Set(phones.map(normalizeIndianPhone).filter(Boolean))];
    if (normalized.length === 0) return 0;
    const matched = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.phone, normalized));
    if (matched.length === 0) return 0;
    const rows = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(
        inArray(
          pushTokens.userId,
          matched.map((u) => u.id)
        )
      );
    const tokens = [...new Set(rows.map((r) => String(r.token ?? "")).filter((t) => t.startsWith("ExponentPushToken[")))];
    if (tokens.length === 0) return 0;
    const messages = tokens.slice(0, 100).map((to) => ({
      to,
      title: title.slice(0, 120),
      body: body.slice(0, 240),
      data: data ?? {},
      sound: "default" as const,
      priority: "high" as const,
      channelId: "orders",
    }));
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      console.error(`[push] expo api http ${res.status}`);
      return 0;
    }
    return messages.length;
  } catch (e) {
    console.error(`[push] send failed: ${String(e).slice(0, 200)}`);
    return 0;
  }
}

export async function deletePushToken(userId: string, token: string): Promise<void> {
  try {
    if (!token) return;
    const rows = await db.select().from(pushTokens).where(eq(pushTokens.token, token)).limit(1);
    if (rows[0] && (!userId || rows[0].userId === userId)) {
      await db.delete(pushTokens).where(eq(pushTokens.id, rows[0].id));
    }
  } catch (e) {
    console.error(`[push] delete failed: ${String(e).slice(0, 200)}`);
  }
}
