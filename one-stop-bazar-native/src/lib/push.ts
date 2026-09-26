/**
 * Push notifications (expo-notifications) — fail-soft everywhere.
 * Flow: login success → registerForPush() → ExpoPushToken → backend.
 * NOTE: real device + google-services.json + EAS rebuild ke baad hi
 * token milega. Expo Go / emulator bina FCM ke null return karta hai.
 */
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { apiRegisterPushToken, getApiToken } from "@/lib/api";

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
