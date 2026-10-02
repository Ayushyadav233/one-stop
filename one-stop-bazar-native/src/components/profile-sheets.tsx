/**
 * You-tab sheets — Coupons, Reviews, Settings, Help, Wallet.
 * Same bottom-sheet pattern as EditProfileSheet (overlay + SlideInDown).
 * Backend-first, fail-soft: offline me static/empty state, kabhi crash nahi.
 */
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Share, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Bell, BellOff, Check, ChevronDown, Copy, Globe, Moon, Phone, Send, Star, Sun, Trash2, Users, X } from "lucide-react-native";
import { blip, useOSB } from "@/lib/osb-store";
import { useSheetBackCloser } from "@/lib/back";
import { COUPONS } from "@/lib/data";
import {
  apiDeleteReview,
  apiGetCoupons,
  apiGetReferrals,
  apiMyReviews,
  apiValidateCoupon,
  POINTS_PER_RUPEE,
  REFER_REWARD_POINTS,
  type ApiCoupon,
  type ApiReview,
} from "@/lib/api";
import { registerForPush, unregisterForPush } from "@/lib/push";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/lib/i18n";
import { F } from "./ui";

/** Support number — single source ab @/lib/contact (real helpline se badlo). */
import { SUPPORT_PHONE, SUPPORT_WA } from "@/lib/contact";
export { SUPPORT_PHONE, SUPPORT_WA };

/* ── shared sheet chrome ── */
export function PSheet({ onClose, children, zIndex = 60 }: { onClose: () => void; children: React.ReactNode; zIndex?: number }) {
  const { colors } = useTheme();
  useSheetBackCloser(true, onClose);
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex }}>
      <Animated.View entering={FadeIn} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.5)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.app, overflow: "hidden" }}>
        <Animated.View entering={SlideInDown.springify().stiffness(tokens.ui.sheetSpring.stiffness).damping(tokens.ui.sheetSpring.damping)} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

function PHead({ title, onClose }: { title: string; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <View>
      <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 999, backgroundColor: "rgba(0,0,0,.15)" }} />
      <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3, color: colors.ink }}>{title}</Text>
        <Pressable onPress={onClose} style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.chip }}>
          <X size={17} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

function Stars({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} color={i <= Math.round(n) ? "#F8CB46" : "rgba(0,0,0,.18)"} fill={i <= Math.round(n) ? "#F8CB46" : "transparent"} />
      ))}
    </View>
  );
}

/* ═══════════ CouponsSheet ═══════════ */
type CouponVM = { code: string; title: string; detail: string; minOrder: number };

export function CouponsSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { colors } = useTheme();
  const set = useOSB((s) => s.set);
  const activeCoupon = useOSB((s) => s.coupon);
  const setCouponProof = useOSB((s) => s.setCouponProof);
  const cartTotal = useOSB((s) => s.cartTotal);
  const [list, setList] = useState<CouponVM[]>(COUPONS.map((c) => ({ code: c.code, title: c.title, detail: c.detail, minOrder: c.minOrder })));
  const [copied, setCopied] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let live = true;
    apiGetCoupons()
      .then((rows) => {
        if (!live || rows.length === 0) return;
        const seen = new Set<string>();
        const merged: CouponVM[] = [];
        for (const r of rows as ApiCoupon[]) {
          const code = String(r.code ?? "").toUpperCase();
          if (!code || seen.has(code)) continue;
          seen.add(code);
          merged.push({
            code,
            title: String(r.title ?? code),
            detail: String(r.detail ?? `Min order ₹${r.minOrder ?? 0}`),
            minOrder: Number(r.minOrder ?? 0),
          });
        }
        for (const c of COUPONS) {
          if (seen.has(c.code)) continue;
          seen.add(c.code);
          merged.push({ code: c.code, title: c.title, detail: c.detail, minOrder: c.minOrder });
        }
        setList(merged);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const copy = useCallback(async (code: string) => {
    try {
      // Lazy require — purani binary me native module missing ho to
      // static import bundle gira deta hai; yaha catch me code dikha do.
      const Clipboard = require("expo-clipboard") as { setStringAsync(s: string): Promise<void> };
      await Clipboard.setStringAsync(code);
      setCopied(code);
      blip(760);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      setMsg(`${code} — sorry, copy not supported in this build, code yaad rakh lo`);
    }
  }, []);

  const apply = useCallback(async (c: CouponVM) => {
    setBusy(c.code);
    setMsg("");
    try {
      const sub = cartTotal();
      if (sub > 0) {
        const v = await apiValidateCoupon(c.code, sub);
        if (!v?.ok) {
          setCouponProof(null);
          setMsg(v?.error || "Coupon apply nahi hua");
          blip(320);
          return;
        }
        // Server proof save — bina iske checkout me discount ZERO (fail-closed).
        setCouponProof({ code: c.code, discount: Number(v.discount ?? 0), fundedBy: (v.coupon as ApiCoupon | undefined)?.fundedBy ?? null, storeKey: (v.coupon as ApiCoupon | undefined)?.storeKey ?? null, at: Date.now() });
      } else {
        // Empty cart: select only, proof checkout pe CouponStrip se verify hoga.
        setCouponProof(null);
      }
      set({ coupon: c.code });
      blip(920, 0.15);
      onClose();
    } finally {
      setBusy("");
    }
  }, [cartTotal, onClose, set, setCouponProof]);

  return (
    <PSheet onClose={onClose}>
      <PHead title={t("shCoupons")} onClose={onClose} />
      {msg ? <Text style={{ marginTop: 10, fontFamily: F.bold, fontSize: 12, color: "#E23744" }}>{msg}</Text> : null}
      <View style={{ marginTop: 12, gap: 10 }}>
        {list.map((c) => {
          const on = activeCoupon === c.code;
          return (
            <View key={c.code} style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: on ? 2 : 1, borderColor: on ? "#0C831F" : colors.line, borderStyle: on ? "solid" : "dashed", padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{c.code}</Text>
                {on ? <Check size={15} color="#0C831F" /> : null}
                {copied === c.code ? <Text style={{ fontFamily: F.bold, fontSize: 11, color: "#0C831F" }}>Copied ✓</Text> : null}
              </View>
              <Text style={{ marginTop: 2, fontFamily: F.bold, fontSize: 12.5, color: colors.ink }}>{c.title}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink3 }}>{c.detail}</Text>
              <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => void copy(c.code)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: colors.chip, paddingVertical: 11 }}>
                  <Copy size={14} color={colors.ink} />
                  <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>Copy</Text>
                </Pressable>
                <Pressable
                  onPress={() => void apply(c)}
                  disabled={!!busy}
                  style={{ flex: 1, borderRadius: 12, backgroundColor: on ? "#0C831F" : "#E23744", paddingVertical: 11, alignItems: "center", opacity: busy ? 0.6 : 1 }}
                >
                  <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#fff" }}>{busy === c.code ? "Checking…" : on ? "Applied" : "Apply"}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={{ marginTop: 12, fontFamily: F.medium, fontSize: 11, color: colors.ink3, textAlign: "center" }}>
        Applied coupon cart + checkout me auto-discount deta hai.
      </Text>
    </PSheet>
  );
}

/* ═══════════ ReviewsSheet ═══════════ */
export function ReviewsSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { colors } = useTheme();
  const [list, setList] = useState<ApiReview[] | null>(null);

  useEffect(() => {
    let live = true;
    apiMyReviews()
      .then((r) => { if (live) setList(r); })
      .catch(() => { if (live) setList([]); });
    return () => { live = false; };
  }, []);

  const remove = useCallback(async (id: string) => {
    const r = await apiDeleteReview(id);
    if (r?.ok) {
      setList((p) => (p ?? []).filter((x) => x.id !== id));
      blip(700);
    }
  }, []);

  const avg = list?.length ? list.reduce((a, r) => a + Number(r.rating ?? 5), 0) / list.length : 0;

  return (
    <PSheet onClose={onClose}>
      <PHead title={t("shReviews")} onClose={onClose} />
      {list === null ? (
        <Text style={{ marginTop: 16, fontFamily: F.medium, fontSize: 12.5, color: colors.ink3, textAlign: "center" }}>Loading…</Text>
      ) : list.length === 0 ? (
        <View style={{ marginTop: 16, alignItems: "center", paddingVertical: 20 }}>
          <Text style={{ fontSize: 40 }}>⭐</Text>
          <Text style={{ marginTop: 8, fontFamily: F.extra, fontSize: 14, color: colors.ink }}>No reviews yet</Text>
          <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12, color: colors.ink3, textAlign: "center" }}>
            Delivered order kholo → store ko rate karo,{"\n"}wo yaha dikhega.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 12, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Stars n={avg} size={15} />
            <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{list.length} reviews • {avg.toFixed(1)} avg</Text>
          </View>
          {list.map((r) => (
            <View key={r.id} style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Stars n={Number(r.rating ?? 5)} />
                <Pressable onPress={() => void remove(r.id)} style={{ height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.chip }}>
                  <Trash2 size={14} color="#E23744" />
                </Pressable>
              </View>
              {r.text ? <Text style={{ marginTop: 6, fontFamily: F.medium, fontSize: 12.5, color: colors.ink }}>{r.text}</Text> : null}
              {r.reply ? (
                <View style={{ marginTop: 8, borderRadius: 10, backgroundColor: colors.chip, padding: 10 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1, color: colors.ink3 }}>STORE REPLY</Text>
                  <Text style={{ marginTop: 2, fontFamily: F.medium, fontSize: 12, color: colors.ink2 }}>{r.reply}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </PSheet>
  );
}

/* ═══════════ SettingsSheet ═══════════ */
function SettingRow({ icon, title, sub, right }: { icon: React.ReactNode; title: string; sub: string; right: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
      <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{title}</Text>
        <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{sub}</Text>
      </View>
      {right}
    </View>
  );
}

function Toggle({ on, onFlip }: { on: boolean; onFlip: () => void }) {
  return (
    <Pressable onPress={onFlip} style={{ height: 30, width: 52, borderRadius: 15, backgroundColor: on ? "#0C831F" : "rgba(0,0,0,.2)", justifyContent: "center", paddingHorizontal: 3 }}>
      <View style={{ height: 24, width: 24, borderRadius: 12, backgroundColor: "#fff", alignSelf: on ? "flex-end" : "flex-start" }} />
    </Pressable>
  );
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { colors } = useTheme();
  const set = useOSB((s) => s.set);
  const language = useOSB((s) => s.language);
  const notifEnabled = useOSB((s) => s.notifEnabled);
  const dark = useOSB((s) => s.dark);
  const [notifBusy, setNotifBusy] = useState(false);

  const flipNotif = useCallback(async () => {
    const cur = useOSB.getState().notifEnabled;
    if (cur) {
      await unregisterForPush();
      set({ notifEnabled: false });
      blip(600);
    } else {
      setNotifBusy(true);
      try {
        const tok = await registerForPush();
        set({ notifEnabled: !!tok });
        blip(tok ? 920 : 320);
      } finally {
        setNotifBusy(false);
      }
    }
  }, [set]);

  return (
    <PSheet onClose={onClose}>
      <PHead title={t("shSettings")} onClose={onClose} />
      <View style={{ marginTop: 12, gap: 10 }}>
        <SettingRow
          icon={<Globe size={18} color={colors.ink} />}
          title="Language / भाषा"
          sub={language === "hi" ? "हिंदी (app me Hindi)" : "English (app in English)"}
          right={
            <View style={{ flexDirection: "row", gap: 6 }}>
              {(["en", "hi"] as const).map((l) => (
                <Pressable key={l} onPress={() => { set({ language: l }); blip(700); }} style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: language === l ? "#E23744" : colors.chip }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: language === l ? "#fff" : colors.ink2 }}>{l === "en" ? "EN" : "हिं"}</Text>
                </Pressable>
              ))}
            </View>
          }
        />
        <SettingRow
          icon={notifEnabled ? <Bell size={18} color={colors.ink} /> : <BellOff size={18} color={colors.ink} />}
          title="Order notifications"
          sub={notifBusy ? "Setting up…" : notifEnabled ? "Accepted / ready / delivered alerts ON" : "All push alerts OFF"}
          right={<Toggle on={notifEnabled} onFlip={() => void flipNotif()} />}
        />
        <SettingRow
          icon={dark ? <Sun size={18} color={colors.ink} /> : <Moon size={18} color={colors.ink} />}
          title="Dark mode"
          sub={dark ? "Dark theme active" : "Light theme active"}
          right={<Toggle on={dark} onFlip={() => { set({ dark: !dark }); blip(700); }} />}
        />
        <SettingRow
          icon={<Text style={{ fontSize: 18 }}>🛍️</Text>}
          title="One Stop Bazar"
          sub="v1.0.0 • OTP login only • Made in India 🇮🇳"
          right={<View />}
        />
      </View>
    </PSheet>
  );
}

/* ═══════════ HelpSheet ═══════════ */
const FAQS: [string, string][] = [
  ["OTP nahi aa raha?", "10-digit number check karo, 60 sec ruko phir Resend dabao. Test number pe dev-code screen pe dikhta hai."],
  ["Order late ho gaya?", "Orders tab → order kholo → live status + rider location dekho. 45 min ke baad support pe chat karo."],
  ["Refund kaise milega?", "Cancelled/damaged order ka paisa 24–48 hrs me wallet me cashback banke aata hai."],
  ["Coupon apply nahi ho raha?", "Min order value check karo (har coupon pe likha hai). Ek order pe ek hi coupon lagta hai."],
  ["Store register karna hai?", "You tab → Register store banner → 2 min me apni dukaan live. ₹999/mo, zero commission."],
];

export function HelpSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { colors } = useTheme();
  const [open, setOpen] = useState(-1);
  return (
    <PSheet onClose={onClose}>
      <PHead title={t("shHelp")} onClose={onClose} />
      <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => { void Linking.openURL(`tel:${SUPPORT_PHONE}`); blip(700); }} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, backgroundColor: "#0C831F", paddingVertical: 14 }}>
          <Phone size={16} color="#fff" />
          <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>Call support</Text>
        </Pressable>
        <Pressable onPress={() => { void Linking.openURL(SUPPORT_WA); blip(700); }} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, backgroundColor: "#25D366", paddingVertical: 14 }}>
          <Text style={{ fontSize: 16 }}>💬</Text>
          <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>WhatsApp chat</Text>
        </Pressable>
      </View>
      <Text style={{ marginTop: 6, fontFamily: F.medium, fontSize: 11, color: colors.ink3, textAlign: "center" }}>Avg reply time ~30 sec • 9am–11pm</Text>
      <View style={{ marginTop: 12, gap: 8 }}>
        {FAQS.map(([q, a], ix) => {
          const isOpen = open === ix;
          return (
            <Pressable key={q} onPress={() => { setOpen(isOpen ? -1 : ix); blip(500); }} style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ flex: 1, fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{q}</Text>
                <ChevronDown size={15} color={colors.ink3} style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }} />
              </View>
              {isOpen ? <Text style={{ marginTop: 6, fontFamily: F.medium, fontSize: 12, color: colors.ink2 }}>{a}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </PSheet>
  );
}

/* ═══════════ WalletSheet (real-time backend) ═══════════ */
export function WalletSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { colors } = useTheme();
  const walletPoints = useOSB((s) => s.walletPoints);
  const walletTx = useOSB((s) => s.walletTx);
  const syncWallet = useOSB((s) => s.syncWallet);
  const myReferralCode = useOSB((s) => s.myReferralCode);
  const [refCount, setRefCount] = useState<number | null>(null);
  const [refLink, setRefLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshRefer = () => {
    setSyncing(true);
    blip(600);
    syncWallet();
    apiGetReferrals().then((j) => {
      if (j?.ok) {
        if (typeof j.count === "number") setRefCount(j.count);
        if (j.link) setRefLink(j.link);
        if (j.code) useOSB.getState().setWallet({ referralCode: j.code });
      }
    }).catch(() => {}).finally(() => setSyncing(false));
    setTimeout(() => setSyncing(false), 4000);
  };

  useEffect(() => {
    refreshRefer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rupees = Math.floor(walletPoints / POINTS_PER_RUPEE);
  const code = myReferralCode || "";

  const copyCode = async () => {
    if (!code) return;
    try {
      const Clipboard = require("expo-clipboard") as { setStringAsync(s: string): Promise<void> };
      await Clipboard.setStringAsync(code);
    } catch { /* visible anyway */ }
    setCopied(true);
    blip(760);
    setTimeout(() => setCopied(false), 1600);
  };

  const shareRefer = async () => {
    if (!code) return;
    blip(700);
    const link = refLink ?? `https://onestopbazar.app/r/${code}`;
    try {
      await Share.share({
        message: `One Stop Bazar pe aao! Mera refer code ${code} use karo aur ₹5 welcome bonus pao. Link: ${link}`,
      });
    } catch { /* dismissed */ }
  };

  return (
    <PSheet onClose={onClose}>
      <PHead title={t("shWallet")} onClose={onClose} />
      <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: "#111117", padding: 18, alignItems: "center" }}>
        <Text style={{ fontFamily: F.extra, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,.6)" }}>WALLET BALANCE</Text>
        <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 34, color: "#fff" }}>₹{rupees}</Text>
        <Text style={{ fontFamily: F.bold, fontSize: 12, color: "#34D399" }}>{walletPoints} points • 10 pts = ₹1</Text>
        <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
          Shopping pe cash ki tarah use hota hai
        </Text>
      </View>

      {/* Refer card */}
      <View style={{ marginTop: 10, borderRadius: 18, backgroundColor: "rgba(12,131,31,.08)", borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(12,131,31,.45)", padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Users size={18} color="#0C831F" />
          <Text style={{ flex: 1, fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Refer & earn {REFER_REWARD_POINTS} pts (₹{REFER_REWARD_POINTS / POINTS_PER_RUPEE})</Text>
        </View>
        <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 11, color: colors.ink2 }}>
          1 friend join kare = tumhe {REFER_REWARD_POINTS} points. Friend ko bhi ₹5 welcome bonus.
          {refCount != null ? ` Ab tak ${refCount} friend${refCount === 1 ? "" : "s"} 🎉` : ""}
        </Text>
        {code ? (
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable onPress={copyCode} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 12 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 16, letterSpacing: 2, color: colors.ink }}>{code}</Text>
              <Copy size={14} color={colors.ink3} />
            </Pressable>
            <Pressable onPress={shareRefer} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, backgroundColor: "#0C831F", paddingHorizontal: 16, paddingVertical: 12 }}>
              <Send size={14} color="#fff" />
              <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>Share</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginTop: 8, gap: 6 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.ink3 }}>
              Code load nahi hua (internet/server sync pending).
            </Text>
            <Pressable onPress={refreshRefer} style={{ alignSelf: "flex-start", borderRadius: 10, backgroundColor: "#0C831F", paddingHorizontal: 14, paddingVertical: 9 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#fff" }}>{syncing ? "Loading…" : "↻ Code nikalo"}</Text>
            </Pressable>
          </View>
        )}
        <Text style={{ marginTop: 6, fontFamily: F.bold, fontSize: 11, color: copied ? "#0C831F" : colors.ink3 }}>
          {copied ? "Code copied ✓ — WhatsApp pe bhejo" : "Tap code to copy • Share se link bhejo"}
        </Text>
      </View>

      {/* Tx history */}
      <Text style={{ marginTop: 14, fontFamily: F.extra, fontSize: 11, letterSpacing: 1.5, color: colors.ink3 }}>TRANSACTIONS</Text>
      <View style={{ marginTop: 8, gap: 8 }}>
        {walletTx.length === 0 ? (
          <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14, alignItems: "center" }}>
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: colors.ink2 }}>Abhi koi transaction nahi</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>Friend refer karo ya shopping pe use karo — yahi dikhega.</Text>
          </View>
        ) : (
          walletTx.slice(0, 20).map((tx) => {
            const pts = Number(tx.points ?? 0);
            const pos = pts >= 0;
            return (
              <View key={tx.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
                <Text style={{ fontSize: 20 }}>{pos ? "💰" : "🛒"}</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{tx.note || (pos ? "Earned" : "Redeemed")}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 10, color: colors.ink3 }}>
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                    {tx.kind ? ` • ${tx.kind}` : ""}
                  </Text>
                </View>
                <Text style={{ fontFamily: F.extra, fontSize: 13, color: pos ? "#0C831F" : "#E23744" }}>
                  {pos ? "+" : ""}{pts} pts
                </Text>
              </View>
            );
          })
        )}
      </View>
      <Text style={{ marginTop: 12, fontFamily: F.medium, fontSize: 11, color: colors.ink3, textAlign: "center" }}>
        Checkout pe wallet auto-apply hota hai • Refund 24–48 hrs me yahi aata hai
      </Text>
    </PSheet>
  );
}
