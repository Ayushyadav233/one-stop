/**
 * Tiny en/hi dictionary — Settings → Language actually changes visible strings.
 * Scope: bottom nav + You tab + profile sheets (headers/rows/buttons).
 * New strings must be added here in BOTH languages.
 */
import { useOSB } from "./osb-store";

export type Lang = "en" | "hi";

const STR = {
  // bottom nav
  navHome: { en: "Home", hi: "होम" },
  navCategories: { en: "Categories", hi: "श्रेणियाँ" },
  navOrders: { en: "Orders", hi: "ऑर्डर" },
  navSaved: { en: "Saved", hi: "सेव्ड" },
  navYou: { en: "You", hi: "आप" },
  // you tab rows
  youEditProfile: { en: "Edit profile", hi: "प्रोफ़ाइल बदलें" },
  youEditProfileSub: { en: "Name, avatar, email, gender", hi: "नाम, अवतार, ईमेल, लिंग" },
  youAddress: { en: "Delivery address", hi: "डिलीवरी पता" },
  youAddressSet: { en: "Set your location", hi: "अपनी लोकेशन सेट करें" },
  youAddressChange: { en: "tap to change", hi: "बदलने के लिए टैप करें" },
  youCoupons: { en: "Coupons & offers", hi: "कूपन और ऑफर" },
  youReviews: { en: "My reviews", hi: "मेरी समीक्षाएँ" },
  youSettings: { en: "Settings & privacy", hi: "सेटिंग और प्राइवेसी" },
  youSettingsSub: { en: "Language, notifications", hi: "भाषा, नोटिफिकेशन" },
  youHelp: { en: "Help & support", hi: "मदद और सपोर्ट" },
  youHelpSub: { en: "Chat in 30 sec", hi: "30 सेकंड में चैट" },
  youLogout: { en: "Log out", hi: "लॉग आउट" },
  youLogoutConfirm: { en: "Log out of this device?", hi: "इस डिवाइस से लॉग आउट करें?" },
  youCancel: { en: "Cancel", hi: "रद्द करें" },
  // sheets
  shCoupons: { en: "Coupons & offers", hi: "कूपन और ऑफर" },
  shReviews: { en: "My reviews", hi: "मेरी समीक्षाएँ" },
  shSettings: { en: "Settings & privacy", hi: "सेटिंग और प्राइवेसी" },
  shHelp: { en: "Help & support", hi: "मदद और सपोर्ट" },
  shWallet: { en: "Wallet", hi: "वॉलेट" },
} as const;

export type StrKey = keyof typeof STR;

/** Component hook — re-renders on language change. */
export function useT(): (k: StrKey) => string {
  const language = useOSB((s) => s.language);
  return (k) => STR[k][language] ?? STR[k].en;
}

/** Non-hook read (event handlers, NAV table). */
export function tFor(language: Lang, k: StrKey): string {
  return STR[k][language] ?? STR[k].en;
}
