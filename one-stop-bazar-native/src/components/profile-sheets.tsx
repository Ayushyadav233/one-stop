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
import { STAGE_FALLBACK } from "@/lib/data";
import {
  apiDeleteReview,
  apiGetReferrals,
  apiGetStages,
  apiMyReviews,
  apiValidateCoupon,
  POINTS_PER_RUPEE,
  REFER_REWARD_POINTS,
  type ApiCoupon,
  type ApiReview,
  type ApiStage,
  type ApiStageItem,
} from "@/lib/api";
import { registerForPush, unregisterForPush } from "@/lib/push";
import { copyText } from "@/lib/clipboard";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useT, useTx, type StrKey } from "@/lib/i18n";
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

/* ═══════════ CouponsSheet — STRICT reward stages ═══════════
 * Bina requirement poore koi coupon select nahi hota: LOCKED/USED/EXPIRED
 * cards ke buttons dead hain (sirf reason msg). Server pe bhi guard
 * (validate fail-closed) — UI + API dono strict. */

/** /stages offline ho tab locked fallback (sab LOCKED, login pe live). */
export function fallbackStages(): ApiStage[] {
  return STAGE_FALLBACK.map((s) => ({
    need: s.need, have: 0, unlockedCount: 0, total: s.coupons.length,
    items: s.coupons.map((f) => ({
      coupon: {
        code: f.code, title: f.title, detail: f.detail,
        minOrder: f.minOrder, minOrderValue: f.minOrderValue ?? 0,
        firstOrderOnly: s.need === 0,
      },
      need: s.need, have: 0, unlocked: false, state: "LOCKED" as const,
    })),
  }));
}

export function CouponsSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const tr = useTx();
  const { colors } = useTheme();
  const set = useOSB((s) => s.set);
  const activeCoupon = useOSB((s) => s.coupon);
  const setCouponProof = useOSB((s) => s.setCouponProof);
  const cartTotal = useOSB((s) => s.cartTotal);
  const [copied, setCopied] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  // STRICT stages — server single source, offline pe locked fallback.
  const [stages, setStages] = useState<ApiStage[] | null>(null);
  const [delivered, setDelivered] = useState(0);

  useEffect(() => {
    let live = true;
    apiGetStages()
      .then((r) => {
        if (live && r.stages.length > 0) {
          setStages(r.stages);
          setDelivered(Number(r.delivered ?? 0));
        }
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const eff: ApiStage[] = stages ?? fallbackStages();
  const liveMode = stages !== null;
  const totalCoupons = eff.reduce((a, s) => a + s.total, 0);
  const totalOpen = eff.reduce((a, s) => a + s.unlockedCount, 0);
  const nextLocked = eff
    .flatMap((s) => s.items)
    .filter((i) => i.state === "LOCKED")
    .sort((a, b) => a.need - b.need)[0] ?? null;

  const copy = useCallback(async (code: string) => {
    // Safe copy — stale APK me native module nahi hota, waha false milta hai (no redbox).
    if (await copyText(code)) {
      setCopied(code);
      blip(760);
      setTimeout(() => setCopied(""), 1600);
    } else {
      setMsg(tr("cpnCopyFail", { code }));
    }
  }, [tr]);

  const applyItem = useCallback(async (item: ApiStageItem) => {
    const code = String(item.coupon.code ?? "").toUpperCase();
    setBusy(code);
    setMsg("");
    try {
      // STRICT — UNLOCKED ke bina select bhi nahi (empty cart pe bhi nahi).
      if (item.state !== "UNLOCKED" || !item.unlocked) {
        const mv = Number(item.coupon.minOrderValue ?? 0);
        if (item.state === "USED") setMsg(tr("stgUsedMsg", { code }));
        else if (item.state === "EXPIRED") setMsg(tr("stgExpiredMsg", { code }));
        else if (item.need <= 0) setMsg(tr("stgReqFirst"));
        else setMsg(mv > 0
          ? tr("msLockedMsgVal", { code, need: item.need, v: mv })
          : tr("msLockedMsg", { code, need: item.need }));
        blip(320);
        return;
      }
      const sub = cartTotal();
      if (sub > 0) {
        const v = await apiValidateCoupon(code, sub);
        if (!v?.ok) {
          setCouponProof(null);
          setMsg(v?.error || tr("cpnApplyFail"));
          blip(320);
          return;
        }
        // Server proof save — bina iske checkout me discount ZERO (fail-closed).
        setCouponProof({ code, discount: Number(v.discount ?? 0), fundedBy: (v.coupon as ApiCoupon | undefined)?.fundedBy ?? null, storeKey: (v.coupon as ApiCoupon | undefined)?.storeKey ?? null, at: Date.now() });
      } else {
        // Empty cart: select only, proof checkout pe CouponStrip se verify hoga.
        setCouponProof(null);
      }
      set({ coupon: code });
      blip(920, 0.15);
      onClose();
    } finally {
      setBusy("");
    }
  }, [cartTotal, onClose, set, setCouponProof, tr]);

  return (
    <PSheet onClose={onClose}>
      <PHead title={t("shCoupons")} onClose={onClose} />
      {msg ? <Text style={{ marginTop: 10, fontFamily: F.bold, fontSize: 12, color: "#E23744" }}>{msg}</Text> : null}
      {/* Hero — kitne successful orders, kitne open, agla kya */}
      <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: "#111117", padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ height: 48, width: 48, borderRadius: 15, backgroundColor: "#F8CB46", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 24 }}>🏆</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>{tr("stgRewards")}</Text>
            <Text style={{ marginTop: 2, fontFamily: F.medium, fontSize: 11.5, color: "rgba(255,255,255,.7)" }}>
              {tr("stgDelivered", { d: delivered })} • {tr("stgOpenCount", { u: totalOpen, t: totalCoupons })}
            </Text>
          </View>
          <View style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,.15)", paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#F8CB46" }}>{totalOpen}/{totalCoupons} 🏆</Text>
          </View>
        </View>
        <View style={{ marginTop: 10, height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,.15)", overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${totalCoupons ? Math.round((totalOpen / totalCoupons) * 100) : 0}%`, borderRadius: 999, backgroundColor: "#34D399" }} />
        </View>
        <Text style={{ marginTop: 8, fontFamily: F.bold, fontSize: 11.5, color: "#F8CB46" }}>
          {!nextLocked
            ? tr("msAllDone")
            : nextLocked.need <= 0
              ? `${String(nextLocked.coupon.code ?? "").toUpperCase()} • ${tr("stgFirstOrder")}`
              : tr("msNextShort", {
                  code: String(nextLocked.coupon.code ?? "").toUpperCase(),
                  have: nextLocked.have, need: nextLocked.need,
                  n: Math.max(0, nextLocked.need - Number(nextLocked.have ?? 0)),
                })}
        </Text>
        {!liveMode ? (
          <Text style={{ marginTop: 4, fontFamily: F.bold, fontSize: 11, color: "rgba(255,255,255,.55)" }}>{tr("stgOffline")}</Text>
        ) : null}
      </View>
      {/* Reward table — kitne successful orders pe kaunsa coupon */}
      <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 11, letterSpacing: 1.5, color: colors.ink3 }}>{tr("stgTable")}</Text>
        <Text style={{ marginTop: 2, fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{tr("stgTableSub")}</Text>
        <View style={{ marginTop: 6 }}>
          {eff.map((s, six) => {
            const done = s.total > 0 && s.unlockedCount === s.total;
            const codes = s.items.map((i) => String(i.coupon.code ?? "").toUpperCase()).join("  •  ");
            return (
              <View key={s.need} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: six === eff.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
                <View style={{ height: 42, width: 42, borderRadius: 13, backgroundColor: done ? "rgba(12,131,31,.12)" : s.unlockedCount > 0 ? "rgba(232,163,61,.18)" : colors.chip, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: F.extra, fontSize: s.need === 0 ? 18 : 15, color: done ? "#0C831F" : s.unlockedCount > 0 ? "#9A6A12" : colors.ink3 }}>
                    {s.need === 0 ? "🎁" : String(s.need)}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={2} style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{codes}</Text>
                  <Text style={{ marginTop: 1, fontFamily: F.bold, fontSize: 10.5, color: colors.ink3 }}>
                    {s.need <= 0 ? tr("stgFirstOrder") : tr("stgNeedN", { need: s.need })}
                  </Text>
                </View>
                {done ? (
                  <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#0C831F" }}>✓</Text>
                ) : s.unlockedCount > 0 ? (
                  <View style={{ borderRadius: 999, backgroundColor: "rgba(232,163,61,.18)", paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#9A6A12" }}>{s.unlockedCount}/{s.total}</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 14 }}>🔒</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
      {eff.map((s, six) => {
        const allOpen = s.total > 0 && s.unlockedCount === s.total;
        const stageLabel = s.need === 0
          ? `${tr("stgWelcome").toUpperCase()} • ${tr("stgFirstOrder").toUpperCase()}`
          : `${tr("stgStageN", { n: six }).toUpperCase()} • ${tr("stgNeedN", { need: s.need }).toUpperCase()}`;
        return (
          <View key={s.need} style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: F.extra, fontSize: 11, letterSpacing: 1.2, color: colors.ink3 }}>{stageLabel}</Text>
              <View style={{ borderRadius: 999, backgroundColor: allOpen ? "rgba(12,131,31,.12)" : s.unlockedCount > 0 ? "rgba(232,163,61,.18)" : colors.chip, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: allOpen ? "#0C831F" : s.unlockedCount > 0 ? "#9A6A12" : colors.ink3 }}>
                  {tr("stgOpenCount", { u: s.unlockedCount, t: s.total })}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 8, gap: 10 }}>
              {s.items.map((item) => {
                const cc = item.coupon;
                const code = String(cc.code ?? "").toUpperCase();
                const on = activeCoupon === code;
                const open = item.state === "UNLOCKED" && item.unlocked;
                const locked = item.state === "LOCKED";
                const used = item.state === "USED";
                const expired = item.state === "EXPIRED";
                const haveN = Number(item.have ?? 0);
                const pct = item.need > 0 ? Math.min(100, Math.round((haveN / item.need) * 100)) : open ? 100 : 0;
                return (
                  <View key={code} style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: open || on ? 2 : 1, borderColor: open || on ? "#0C831F" : colors.line, borderStyle: locked ? "dashed" : "solid", opacity: locked ? 0.66 : 1, padding: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 16, color: colors.ink }}>{locked ? "🔒 " : ""}{code}</Text>
                      {on && open ? <Check size={15} color="#0C831F" /> : null}
                      {copied === code && open ? <Text style={{ fontFamily: F.bold, fontSize: 11, color: "#0C831F" }}>{tr("comCopied")}</Text> : null}
                      {open ? (
                        <View style={{ borderRadius: 999, backgroundColor: "rgba(12,131,31,.12)", paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: "#0C831F" }}>{tr("msUnlocked")}</Text>
                        </View>
                      ) : locked ? (
                        <View style={{ borderRadius: 999, backgroundColor: colors.chip, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: colors.ink3 }}>{tr("msLockedTag")}</Text>
                        </View>
                      ) : used ? (
                        <View style={{ borderRadius: 999, backgroundColor: colors.chip, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: colors.ink3 }}>{tr("stgUsedTag")}</Text>
                        </View>
                      ) : (
                        <View style={{ borderRadius: 999, backgroundColor: colors.chip, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: colors.ink3 }}>{tr("stgExpiredTag")}</Text>
                        </View>
                      )}
                      {(item.cycles ?? 0) > 0 ? (
                        <View style={{ borderRadius: 999, backgroundColor: "rgba(232,163,61,.18)", paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: "#9A6A12" }}>🔁×{item.cycles}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ marginTop: 4, fontFamily: F.bold, fontSize: 12.5, color: colors.ink }}>{String(cc.title ?? code)}</Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink3 }}>{String(cc.detail ?? "")}</Text>
                    <Text style={{ marginTop: 2, fontFamily: F.bold, fontSize: 11, color: colors.ink3 }}>
                      {tr("stgMinOrder", { x: Number(cc.minOrder ?? 0) })}
                    </Text>
                    {item.need > 0 ? (
                      <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: colors.chip, overflow: "hidden" }}>
                          <View style={{ height: "100%", width: `${pct}%`, borderRadius: 999, backgroundColor: open ? "#0C831F" : "#E8A33D" }} />
                        </View>
                        <Text style={{ fontFamily: F.extra, fontSize: 11, color: colors.ink2 }}>{tr("msProgress", { have: haveN, need: item.need })}</Text>
                      </View>
                    ) : null}
                    <Text style={{ marginTop: 4, fontFamily: F.semi, fontSize: 11, color: open ? "#0C831F" : colors.ink3 }}>
                      {open
                        ? (item.need <= 0 ? `✓ ${tr("stgFirstOrder")}` : `✓ ${tr("stgNeedN", { need: item.need })}`)
                        : locked
                          ? (item.need <= 0 ? tr("stgReqFirst") : tr("stgReqN", { need: item.need }))
                          : used
                            ? tr("stgUsedNote")
                            : tr("stgExpiredNote")}
                    </Text>
                    {open ? (
                      <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                        <Pressable onPress={() => void copy(code)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: colors.chip, paddingVertical: 11 }}>
                          <Copy size={14} color={colors.ink} />
                          <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{tr("cpnCopyBtn")}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void applyItem(item)}
                          disabled={!!busy}
                          style={{ flex: 1, borderRadius: 12, backgroundColor: on ? "#0C831F" : "#E23744", paddingVertical: 11, alignItems: "center", opacity: busy ? 0.6 : 1 }}
                        >
                          <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#fff" }}>{busy === code ? tr("cartChecking") : on ? tr("cpnApplied") : tr("cpnApply")}</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => void applyItem(item)}
                        disabled={!!busy}
                        style={{ marginTop: 10, borderRadius: 12, backgroundColor: colors.chip, paddingVertical: 11, alignItems: "center", opacity: busy ? 0.6 : 1 }}
                      >
                        <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink3 }}>
                          {busy === code ? tr("cartChecking") : locked ? tr("stgLockedBtn") : used ? tr("stgUsedTag") : tr("stgExpiredTag")}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
      <Text style={{ marginTop: 12, fontFamily: F.medium, fontSize: 11, color: colors.ink3, textAlign: "center" }}>
        {tr("cpnNote")}
      </Text>
    </PSheet>
  );
}

/* ═══════════ ReviewsSheet ═══════════ */
export function ReviewsSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const tr = useTx();
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
        <Text style={{ marginTop: 16, fontFamily: F.medium, fontSize: 12.5, color: colors.ink3, textAlign: "center" }}>{tr("comLoading")}</Text>
      ) : list.length === 0 ? (
        <View style={{ marginTop: 16, alignItems: "center", paddingVertical: 20 }}>
          <Text style={{ fontSize: 40 }}>⭐</Text>
          <Text style={{ marginTop: 8, fontFamily: F.extra, fontSize: 14, color: colors.ink }}>{tr("revEmptyT")}</Text>
          <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12, color: colors.ink3, textAlign: "center" }}>
            {tr("revEmptyS")}
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 12, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Stars n={avg} size={15} />
            <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{tr("revCount", { n: list.length, a: avg.toFixed(1) })}</Text>
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
                  <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1, color: colors.ink3 }}>{tr("revStoreReply")}</Text>
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
  const tr = useTx();
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
          sub={language === "hi" ? tr("setLangHi") : tr("setLangEn")}
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
          title={tr("setNotifT")}
          sub={notifBusy ? tr("setNotifBusy") : notifEnabled ? tr("setNotifOn") : tr("setNotifOff")}
          right={<Toggle on={notifEnabled} onFlip={() => void flipNotif()} />}
        />
        <SettingRow
          icon={dark ? <Sun size={18} color={colors.ink} /> : <Moon size={18} color={colors.ink} />}
          title={tr("setDarkT")}
          sub={dark ? tr("setDarkOn") : tr("setDarkOff")}
          right={<Toggle on={dark} onFlip={() => { set({ dark: !dark }); blip(700); }} />}
        />
        <SettingRow
          icon={<Text style={{ fontSize: 18 }}>🛍️</Text>}
          title="One Stop Bazar"
          sub={tr("setAboutSub")}
          right={<View />}
        />
      </View>
    </PSheet>
  );
}

/* ═══════════ HelpSheet ═══════════ */
function helpFaqs(tr: (k: StrKey, vars?: Record<string, string | number>) => string): [string, string][] {
  return [
    [tr("helpQ1"), tr("helpA1")],
    [tr("helpQ2"), tr("helpA2")],
    [tr("helpQ3"), tr("helpA3")],
    [tr("helpQ4"), tr("helpA4")],
    [tr("helpQ5"), tr("helpA5")],
  ];
}

export function HelpSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const tr = useTx();
  const { colors } = useTheme();
  const [open, setOpen] = useState(-1);
  const FAQS = helpFaqs(tr);
  return (
    <PSheet onClose={onClose}>
      <PHead title={t("shHelp")} onClose={onClose} />
      <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => { void Linking.openURL(`tel:${SUPPORT_PHONE}`); blip(700); }} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, backgroundColor: "#0C831F", paddingVertical: 14 }}>
          <Phone size={16} color="#fff" />
          <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>{tr("helpCall")}</Text>
        </Pressable>
        <Pressable onPress={() => { void Linking.openURL(SUPPORT_WA); blip(700); }} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, backgroundColor: "#25D366", paddingVertical: 14 }}>
          <Text style={{ fontSize: 16 }}>💬</Text>
          <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>{tr("helpWa")}</Text>
        </Pressable>
      </View>
      <Text style={{ marginTop: 6, fontFamily: F.medium, fontSize: 11, color: colors.ink3, textAlign: "center" }}>{tr("helpAvg")}</Text>
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
  const tr = useTx();
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
    await copyText(code); // false = stale build, code waise bhi screen pe visible hai
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
        message: tr("refShare", { code, link }),
      });
    } catch { /* dismissed */ }
  };

  return (
    <PSheet onClose={onClose}>
      <PHead title={t("shWallet")} onClose={onClose} />
      <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: "#111117", padding: 18, alignItems: "center" }}>
        <Text style={{ fontFamily: F.extra, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,.6)" }}>{tr("walBalance")}</Text>
        <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 34, color: "#fff" }}>₹{rupees}</Text>
        <Text style={{ fontFamily: F.bold, fontSize: 12, color: "#34D399" }}>{tr("walRate", { n: walletPoints })}</Text>
        <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
          {tr("walHint")}
        </Text>
      </View>

      {/* Refer card */}
      <View style={{ marginTop: 10, borderRadius: 18, backgroundColor: "rgba(12,131,31,.08)", borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(12,131,31,.45)", padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Users size={18} color="#0C831F" />
          <Text style={{ flex: 1, fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{tr("refTitle", { pts: REFER_REWARD_POINTS, rs: REFER_REWARD_POINTS / POINTS_PER_RUPEE })}</Text>
        </View>
        <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 11, color: colors.ink2 }}>
          {tr("walSub", { pts: REFER_REWARD_POINTS })}
          {refCount != null ? (refCount === 1 ? tr("refJoinedOne") : tr("refJoinedMany", { n: refCount })) : ""}
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
              {tr("walNoCode")}
            </Text>
            <Pressable onPress={refreshRefer} style={{ alignSelf: "flex-start", borderRadius: 10, backgroundColor: "#0C831F", paddingHorizontal: 14, paddingVertical: 9 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#fff" }}>{syncing ? tr("comLoading") : tr("walGetCode")}</Text>
            </Pressable>
          </View>
        )}
        <Text style={{ marginTop: 6, fontFamily: F.bold, fontSize: 11, color: copied ? "#0C831F" : colors.ink3 }}>
          {copied ? tr("walCopiedHint") : tr("walTapHint")}
        </Text>
      </View>

      {/* Tx history */}
      <Text style={{ marginTop: 14, fontFamily: F.extra, fontSize: 11, letterSpacing: 1.5, color: colors.ink3 }}>{tr("walTxT")}</Text>
      <View style={{ marginTop: 8, gap: 8 }}>
        {walletTx.length === 0 ? (
          <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14, alignItems: "center" }}>
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: colors.ink2 }}>{tr("walTxEmptyT")}</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{tr("walTxEmptyS")}</Text>
          </View>
        ) : (
          walletTx.slice(0, 20).map((tx) => {
            const pts = Number(tx.points ?? 0);
            const pos = pts >= 0;
            return (
              <View key={tx.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
                <Text style={{ fontSize: 20 }}>{pos ? "💰" : "🛒"}</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{tx.note || (pos ? tr("walEarned") : tr("walRedeemed"))}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 10, color: colors.ink3 }}>
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                    {tx.kind ? ` • ${tx.kind}` : ""}
                  </Text>
                </View>
                <Text style={{ fontFamily: F.extra, fontSize: 13, color: pos ? "#0C831F" : "#E23744" }}>
                  {tr("walPtsN", { s: pos ? "+" : "", n: pts })}
                </Text>
              </View>
            );
          })
        )}
      </View>
      <Text style={{ marginTop: 12, fontFamily: F.medium, fontSize: 11, color: colors.ink3, textAlign: "center" }}>
        {tr("walFoot")}
      </Text>
    </PSheet>
  );
}
