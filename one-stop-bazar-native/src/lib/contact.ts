/**
 * Call/chat contact helpers — real numbers only, no fake seeds.
 * - Own shop → seller.phone (onboarding me mandatory + 10-digit).
 * - Static/demo store bina phone ke → support relay (honest label ke saath).
 * - Pro ka direct number booking confirm (accepted+) ke baad unlock (UC model).
 * - tel: dialer intent = no CALL_PHONE permission needed.
 */
import { Alert, Linking } from "react-native";
import { blip } from "./osb-store";

export const SUPPORT_PHONE = "18001234567";
export const SUPPORT_WA = `https://wa.me/91${SUPPORT_PHONE}?text=${encodeURIComponent("Hi One Stop Bazar, mujhe help chahiye")}`;

export function digits10(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "").slice(-10);
}

export function isValidPhone(phone: string | null | undefined): boolean {
  return digits10(phone).length === 10;
}

export interface ResolvedCall {
  phone: string;
  /** Support relay se connect hoga (store ka real number nahi hai). */
  viaRelay: boolean;
  /** Abhi locked — confirm hone pe unlock. */
  locked: boolean;
}

export function resolveStoreCall(o: {
  storePhone?: string | null;
  isOwnShop: boolean;
  sellerPhone?: string | null;
  orderStatus?: string | null;
}): ResolvedCall {
  const own = isValidPhone(o.sellerPhone) && o.isOwnShop ? digits10(o.sellerPhone) : "";
  const listed = isValidPhone(o.storePhone) ? digits10(o.storePhone) : "";
  const direct = own || listed;
  const confirmed = !!o.orderStatus && o.orderStatus !== "new";
  if (direct) return { phone: direct, viaRelay: false, locked: !confirmed };
  return { phone: SUPPORT_PHONE, viaRelay: true, locked: false };
}

/** Green call button ka single entry point. Returns false jab dial na hua ho. */
export async function placeCall(r: ResolvedCall, storeName: string): Promise<boolean> {
  if (r.locked) {
    Alert.alert(
      "Confirmation ke baad available",
      `${storeName} ka number booking confirm hote hi unlock hoga. Urgent hai to support se baat karo.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Call support", onPress: () => void Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {}) },
      ],
    );
    return false;
  }
  if (!r.phone) {
    Alert.alert("Number nahi mila", "Support se connect kar rahe hain.", [
      { text: "Cancel", style: "cancel" },
      { text: "Call support", onPress: () => void Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {}) },
    ]);
    return false;
  }
  blip(760);
  try {
    await Linking.openURL(`tel:${r.phone}`);
    return true;
  } catch {
    Alert.alert("Call nahi lagi", r.viaRelay ? "Support line busy hai, thodi der me retry karo." : `Dialer nahi khula — number: ${r.phone}`);
    return false;
  }
}

/** Chat thread id = order-scoped (1 order = 1 customer↔store thread). */
export function threadIdFor(orderId: string): string {
  return `ord-${orderId}`;
}
