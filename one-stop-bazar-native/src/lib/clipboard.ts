/**
 * Safe clipboard copy — kabhi throw nahi, kabhi redbox nahi.
 * Purani dev-build APK me ExpoClipboard native code nahi hota; waha
 * requireNativeModule throw karta hai (aur metro stack galat jagah
 * attribute karta hai). requireOptionalNativeModule missing pe null deta
 * hai, throw nahi — isliye expo-clipboard package ko require hi nahi karte.
 */
import { requireOptionalNativeModule } from "expo-modules-core";

type ClipboardNative = { setStringAsync?: (s: string) => Promise<unknown> };

/** true = copied, false = unavailable (caller fallback dikhaye, crash nahi). */
export async function copyText(text: string): Promise<boolean> {
  try {
    const mod = requireOptionalNativeModule<ClipboardNative>("ExpoClipboard");
    if (typeof mod?.setStringAsync !== "function") return false;
    await mod.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
