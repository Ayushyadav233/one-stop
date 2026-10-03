/**
 * Push notifications (expo-notifications) — fail-soft everywhere.
 * Flow: login success → registerForPush() → ExpoPushToken → backend.
 * NOTE: real device + google-services.json + EAS rebuild ke baad hi
 * token milega. Expo Go / emulator bina FCM ke null return karta hai.
 */
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { apiRegisterPushToken, apiUnregisterPushToken, getApiToken } from "@/lib/api";

// Foreground me aaya notification kaise dikhe.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let cachedToken: string | null = null;

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Order updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#E23744",
    });
  } catch {
    /* noop */
  }
}

/** Permission + token + backend register. Returns token or null. Never throws. */
export async function registerForPush(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    await ensureAndroidChannel();
    const { status: existing } = await Notifications.getPermissionsAsync();
    const status =
      existing === "granted"
        ? existing
        : (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return null;
    const t = (await Notifications.getExpoPushTokenAsync()).data;
    if (!t) return null;
    cachedToken = t;
    if (getApiToken()) await apiRegisterPushToken(t, Platform.OS);
    return t;
  } catch {
    return null;
  }
}

export function getCachedPushToken(): string | null {
  return cachedToken;
}

/**
 * Foreground chat pushes → unread badge. Background-tap / notification tap → deep link.
 * Never throws.
 */
export function watchChatPushes(onChat: (orderId: string) => void): () => void {
  return watchPushNotifications({ onChat });
}

export function watchPushNotifications(callbacks: {
  onChat?: (orderId: string) => void;
  onProviderOrder?: (orderId: string) => void;
  onCustomerOrder?: (orderId: string) => void;
  onRateOrder?: (orderId: string) => void;
}): () => void {
  try {
    const subs: { remove: () => void }[] = [];
    const handleData = (data: Record<string, unknown>, isTap: boolean) => {
      const orderId = String(data.orderId ?? "");
      const kind = String(data.kind ?? "");
      const screen = String(data.screen ?? "");

      if (kind === "chat" || screen === "chat") {
        if (orderId && callbacks.onChat) callbacks.onChat(orderId);
      } else if (screen === "rate_order" || kind === "rate_order") {
        if (orderId && callbacks.onRateOrder) callbacks.onRateOrder(orderId);
      } else if (screen === "provider_orders" || kind === "provider_order") {
        if (orderId && callbacks.onProviderOrder) callbacks.onProviderOrder(orderId);
      } else if (orderId) {
        if (isTap && callbacks.onCustomerOrder) callbacks.onCustomerOrder(orderId);
      }
    };

    subs.push(
      Notifications.addNotificationReceivedListener((n) => {
        try {
          const d = (n.request.content.data ?? {}) as Record<string, unknown>;
          handleData(d, false);
        } catch { /* noop */ }
      })
    );
    subs.push(
      Notifications.addNotificationResponseReceivedListener((r) => {
        try {
          const d = (r.notification.request.content.data ?? {}) as Record<string, unknown>;
          handleData(d, true);
        } catch { /* noop */ }
      })
    );
    return () => subs.forEach((s) => { try { s.remove(); } catch { /* noop */ } });
  } catch {
    return () => {};
  }
}

/** Logout/device-change: backend se token hatao. Never throws. */
export async function unregisterForPush(): Promise<void> {
  try {
    if (cachedToken && getApiToken()) await apiUnregisterPushToken(cachedToken);
  } catch {
    /* noop */
  } finally {
    cachedToken = null;
  }
}
