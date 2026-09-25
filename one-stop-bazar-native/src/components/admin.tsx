/**
 * Admin flow — RN port of web src/components/admin.tsx.
 * Deltas (rest-state pixels identical):
 * - framer-motion (AnimatePresence/motion/layoutId) → Reanimated entering FadeIn or plain Views.
 * - div/button/input → View/Pressable/TextInput/ScrollView; tab underline pill → conditional bg View.
 * - <input type="color"> has no RN equivalent → preset accent swatches row (same published CategoryDef shape).
 * - lucide-react icons → lucide-react-native with color prop; Img from ./ui; fonts F from ./ui.
 */
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Globe2,
  LayoutGrid,
  LineChart,
  LogOut,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react-native";
import { CATEGORIES, STORES, inr, type CategoryDef } from "@/lib/data";
import { blip, useOSB } from "@/lib/osb-store";
import { useTheme } from "@/theme/ThemeProvider";
import { AreaGraph, F, Img, SectionHead } from "./ui";

const TABS = [
  { k: "overview", t: "Overview", i: LayoutGrid },
  { k: "providers", t: "Providers", i: Building2 },
  { k: "catalog", t: "Catalog", i: LineChart },
  { k: "finance", t: "Finance", i: Wallet },
  { k: "risk", t: "Risk", i: ShieldAlert },
  { k: "cms", t: "CMS", i: Globe2 },
];

const CITY_ROWS = [
  { c: "Bengaluru", o: "18,204", r: 984000, g: 32, p: 842 },
  { c: "Hyderabad", o: "11,870", r: 612000, g: 24, p: 517 },
  { c: "Pune", o: "8,430", r: 438000, g: 19, p: 396 },
  { c: "Delhi NCR", o: "6,120", r: 355000, g: 14, p: 331 },
  { c: "Jaipur", o: "3,577", r: 188000, g: 11, p: 212 },
];

const ACCENTS = ["#7C5CFF", "#0C831F", "#E23744", "#E8830C", "#1573FF", "#0E3B2E"];

export function AdminPanel() {
  const set = useOSB((s) => s.set);
  const [tab, setTab] = useState("overview");
  return (
    <View style={{ flex: 1 }}>
      {/* header */}
      <View style={{ backgroundColor: "#0B0B0F", paddingHorizontal: 16, paddingBottom: 16, paddingTop: 20, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -64, top: -80, height: 224, width: 224, borderRadius: 112, backgroundColor: "rgba(124,92,255,.3)" }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 18, color: "#000" }}>◈</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 15, letterSpacing: -0.3, color: "#fff" }}>Global Admin</Text>
              <View style={{ borderRadius: 6, backgroundColor: "#F8CB46", paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9, letterSpacing: 1, color: "#000" }}>CEO</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: "#34D399" }} />
              <Text style={{ fontFamily: F.bold, fontSize: 11, color: "rgba(255,255,255,.55)" }}>Full control • marketplace live • no app update needed</Text>
            </View>
          </View>
          <View style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,.1)", alignItems: "center", justifyContent: "center" }}>
            <Bell size={17} color="#fff" />
            <View style={{ position: "absolute", right: -2, top: -2, height: 16, width: 16, borderRadius: 8, backgroundColor: "#FF5C69", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 9, color: "#fff" }}>7</Text>
            </View>
          </View>
          <Pressable onPress={() => { set({ mode: "customer", tab: "home" }); blip(500); }} style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,.1)", alignItems: "center", justifyContent: "center" }}>
            <LogOut size={16} color="#fff" />
          </Pressable>
        </View>
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,.1)", paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: "rgba(255,255,255,.5)" }}>Search providers, orders, payouts, users…</Text>
        </View>
        {/* tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 12 }}>
          {TABS.map((t) => {
            const I = t.i;
            const on = tab === t.k;
            return (
              <Pressable
                key={t.k}
                onPress={() => { setTab(t.k); blip(660); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: on ? "#fff" : "transparent" }}
              >
                <I size={13} color={on ? "#000" : "rgba(255,255,255,.6)"} />
                <Text style={{ fontFamily: F.extra, fontSize: 12, color: on ? "#000" : "rgba(255,255,255,.6)" }}>{t.t}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 176 }}>
        <Animated.View entering={FadeIn.duration(240)} key={tab}>
          {tab === "overview" && <Overview />}
          {tab === "providers" && <Providers />}
          {tab === "catalog" && <Catalog />}
          {tab === "finance" && <Finance />}
          {tab === "risk" && <Risk />}
          {tab === "cms" && <Cms />}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function Kpi({ l, v, d, up, accent }: { l: string; v: string; d: string; up?: boolean; accent: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.4, color: colors.ink3 }}>{l.toUpperCase()}</Text>
        <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: accent }} />
      </View>
      <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 21, letterSpacing: -0.4, color: colors.ink }}>{v}</Text>
      <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 2 }}>
        {up === false ? (
          <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#E23744" }}>▼ {d}</Text>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <ArrowUpRight size={12} color={colors.green} />
            <Text style={{ fontFamily: F.extra, fontSize: 11, color: colors.green }}>{d}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Overview() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, gap: 10 }}>
          <Kpi l="MRR" v="₹24.1L" d="+12.4% MoM" accent="#7C5CFF" />
          <Kpi l="Active providers" v="2,204" d="+64 this week" accent="#1573FF" />
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <Kpi l="Orders today" v="48,201" d="+8.1%" accent="#0C831F" />
          <Kpi l="Take rate" v="₹0" d="Subscription only" accent="#E8830C" />
        </View>
      </View>

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>Platform GMV</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink3 }}>Last 7 days • ₹2.4 Cr</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "rgba(12,131,31,.1)", paddingHorizontal: 8, paddingVertical: 4 }}>
            <TrendingUp size={12} color={colors.green} />
            <Text style={{ fontFamily: F.extra, fontSize: 11, color: colors.green }}>+32%</Text>
          </View>
        </View>
        <AreaGraph values={[30, 42, 38, 55, 62, 84, 96]} color="#7C5CFF" height={96} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <Text key={i} style={{ fontFamily: F.extra, fontSize: 10, color: colors.ink3 }}>{d}</Text>
          ))}
        </View>
      </View>

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <SectionHead title="Category split" sub={`${CATEGORIES.length} live categories`} />
        <View style={{ marginTop: 12, gap: 10 }}>
          {CATEGORIES.slice(0, 6).map((c, i) => {
            const pct = [34, 28, 12, 9, 8, 9][i];
            return (
              <View key={c.k} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ height: 32, width: 32, borderRadius: 8, overflow: "hidden" }}>
                  <Img src={c.img} style={{ width: "100%", height: "100%" }} />
                </View>
                <Text numberOfLines={1} style={{ width: 74, fontFamily: F.extra, fontSize: 11.5, color: colors.ink }}>{c.t}</Text>
                <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.chip, overflow: "hidden" }}>
                  <View style={{ height: "100%", borderRadius: 4, width: `${pct * 2.6}%` as never, backgroundColor: c.accent }} />
                </View>
                <Text style={{ width: 36, fontFamily: F.extra, fontSize: 11, color: colors.ink, textAlign: "right" }}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>City performance</Text>
          <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#E23744" }}>Export ›</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 4 }}>
          <Text style={{ flex: 1, fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1, color: colors.ink3 }}>CITY</Text>
          <Text style={{ width: 56, fontFamily: F.extra, fontSize: 9.5, color: colors.ink3, textAlign: "right" }}>ORDERS</Text>
          <Text style={{ width: 64, fontFamily: F.extra, fontSize: 9.5, color: colors.ink3, textAlign: "right" }}>REVENUE</Text>
          <Text style={{ width: 48, fontFamily: F.extra, fontSize: 9.5, color: colors.ink3, textAlign: "right" }}>GROWTH</Text>
        </View>
        {CITY_ROWS.map((r) => (
          <View key={r.c} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 16, paddingVertical: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{r.c}</Text>
              <Text style={{ fontFamily: F.semi, fontSize: 10, color: colors.ink3 }}>{r.p} providers</Text>
            </View>
            <Text style={{ width: 56, fontFamily: F.bold, fontSize: 12, color: colors.ink, textAlign: "right" }}>{r.o}</Text>
            <Text style={{ width: 64, fontFamily: F.bold, fontSize: 12, color: colors.ink, textAlign: "right" }}>{inr(r.r)}</Text>
            <Text style={{ width: 48, fontFamily: F.extra, fontSize: 12, color: colors.green, textAlign: "right" }}>+{r.g}%</Text>
          </View>
        ))}
      </View>

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Activity size={15} color={colors.ink} />
          <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Live monitoring</Text>
        </View>
        <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[["API latency", "128 ms", "#0C831F"], ["Payment success", "99.2%", "#0C831F"], ["Order failures", "0.4%", "#E8830C"], ["Open tickets", "23", "#1573FF"]].map(([l, v, c]) => (
            <View key={l} style={{ width: "48%", borderRadius: 12, backgroundColor: colors.card2, padding: 10 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 10, color: colors.ink3 }}>{l}</Text>
              <Text style={{ fontFamily: F.extra, fontSize: 15, color: c as string }}>{v}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Providers() {
  const { colors } = useTheme();
  const [f, setF] = useState("all");
  const list = STORES.filter((s) => (f === "all" ? true : f === "top" ? s.rating >= 4.7 : s.healthScore < 91));
  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[["all", "All 2,418"], ["top", "Top rated"], ["risk", "Needs help"]].map(([k, t]) => (
          <Pressable key={k} onPress={() => { setF(k); blip(620); }} style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: f === k ? colors.ink : colors.card, borderWidth: f === k ? 0 : 1, borderColor: colors.line }}>
            <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: f === k ? colors.app : colors.ink2 }}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
        {list.map((s, i) => (
          <Animated.View entering={FadeIn.duration(200)} key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: i === list.length - 1 ? 0 : 1, borderBottomColor: colors.line, paddingHorizontal: 12, paddingVertical: 12 }}>
            <Text style={{ width: 16, fontFamily: F.extra, fontSize: 11, color: colors.ink3 }}>{i + 1}</Text>
            <View style={{ height: 44, width: 44, borderRadius: 12, overflow: "hidden" }}>
              <Img src={s.image} style={{ width: "100%", height: "100%" }} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{s.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Star size={9} color="#E8830C" />
                <Text style={{ fontFamily: F.semi, fontSize: 10.5, color: colors.ink3 }}>{s.rating} • {s.kind} • {s.address.split(" ")[0]}</Text>
              </View>
              <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ height: 6, width: 64, borderRadius: 3, backgroundColor: colors.chip, overflow: "hidden" }}>
                  <View style={{ height: "100%", borderRadius: 3, width: `${s.healthScore}%` as never, backgroundColor: s.healthScore >= 93 ? "#0C831F" : s.healthScore >= 89 ? "#E8830C" : "#E23744" }} />
                </View>
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: colors.ink3 }}>{s.healthScore} health</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{inr(21000 - i * 1200)}</Text>
              <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: colors.green }}>Pro • active</Text>
            </View>
          </Animated.View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {([["Approve", CheckCircle2, "#0C831F", "14 pending"], ["Suspend", Ban, "#E23744", "2 flagged"], ["Audit", Eye, "#1573FF", "log trail"]] as const).map(([t, Ic, c, s]) => (
          <Pressable key={t} style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: "center" }}>
            <Ic size={18} color={c} />
            <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 11.5, color: colors.ink }}>{t}</Text>
            <Text style={{ fontFamily: F.semi, fontSize: 9.5, color: colors.ink3 }}>{s}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Catalog() {
  const { colors } = useTheme();
  const catRequests = useOSB((s) => s.catRequests);
  const approveRequest = useOSB((s) => s.approveRequest);
  const rejectRequest = useOSB((s) => s.rejectRequest);
  const addCategory = useOSB((s) => s.addCategory);
  const toggleCategoryVisible = useOSB((s) => s.toggleCategoryVisible);
  const extraCategories = useOSB((s) => s.extraCategories);
  const hiddenCategories = useOSB((s) => s.hiddenCategories);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [sub, setSub] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [accent, setAccent] = useState("#7C5CFF");
  const pending = catRequests.filter((r) => r.status === "pending");
  const all = [...CATEGORIES, ...extraCategories];
  const create = () => {
    if (!name.trim()) return;
    const c: CategoryDef = { k: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28), t: name.trim(), sub: sub.trim() || "New on Bazar", img: "", kinds: [], accent, eta: "Soon", emoji, subs: [], dynamic: true, featured: true };
    addCategory(c);
    blip(920, 0.15);
    setName(""); setSub(""); setCreating(false);
  };
  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
      {/* requests */}
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <SectionHead title="Category requests" sub="From local providers" />
          <View style={{ borderRadius: 999, backgroundColor: "#7C5CFF", paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>{pending.length} new</Text>
          </View>
        </View>
        <View style={{ marginTop: 10, gap: 8 }}>
          {pending.length === 0 && (
            <View style={{ borderRadius: 12, backgroundColor: colors.card2, padding: 16, alignItems: "center" }}>
              <Text style={{ fontFamily: F.semi, fontSize: 12, color: colors.ink3 }}>All caught up ✓ — providers’ requests appear here live.</Text>
            </View>
          )}
          {pending.map((r) => (
            <Animated.View entering={FadeIn.duration(200)} key={r.id} style={{ borderRadius: 14, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(124,92,255,.45)", backgroundColor: "rgba(124,92,255,.08)", padding: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>“{r.category}” <Text style={{ fontFamily: F.semi, color: colors.ink3 }}>for {r.productName}</Text></Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{r.description}</Text>
                  <Text style={{ marginTop: 2, fontFamily: F.bold, fontSize: 10, color: "#7C5CFF" }}>Requested by {r.storeName}{r.parent ? ` • under ${r.parent}` : ""}</Text>
                </View>
              </View>
              <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => { approveRequest(r.id); blip(960, 0.15); }} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 10, backgroundColor: "#0C831F", paddingVertical: 10 }}>
                  <Check size={14} color="#fff" />
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#fff" }}>Approve & publish</Text>
                </Pressable>
                <Pressable onPress={() => { rejectRequest(r.id); blip(420, 0.1); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 10, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <X size={14} color="#E23744" />
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#E23744" }}>Decline</Text>
                </Pressable>
              </View>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* create */}
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <Pressable onPress={() => setCreating(!creating)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
            <Plus size={18} strokeWidth={3} color={colors.app} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>Create category</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>Appears in app instantly — no APK update, no dev</Text>
          </View>
          <ChevronRight size={16} color={colors.ink3} style={{ transform: [{ rotate: creating ? "90deg" : "0deg" }] }} />
        </Pressable>
        {creating && (
          <Animated.View entering={FadeIn.duration(200)}>
            <View style={{ marginTop: 12, gap: 8 }}>
              <TextInput value={name} onChangeText={setName} placeholder="Category name e.g. Pet Supplies" placeholderTextColor={colors.ink3} style={{ borderRadius: 12, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semi, fontSize: 13, color: colors.ink }} />
              <TextInput value={sub} onChangeText={setSub} placeholder="Tagline e.g. Food, toys & grooming" placeholderTextColor={colors.ink3} style={{ borderRadius: 12, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semi, fontSize: 13, color: colors.ink }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {["✨", "🐾", "🚗", "🧘", "🎸", "🧩", "🪴", "👜"].map((e) => (
                  <Pressable key={e} onPress={() => setEmoji(e)} style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: emoji === e ? "#7C5CFF" : colors.card2, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 18 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {ACCENTS.map((a) => (
                  <Pressable key={a} onPress={() => setAccent(a)} style={{ height: 32, width: 32, borderRadius: 16, backgroundColor: a, borderWidth: accent === a ? 3 : 0, borderColor: colors.ink }} />
                ))}
              </View>
              <Pressable onPress={create} style={{ borderRadius: 12, backgroundColor: "#0C831F", paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>Publish category live</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>

      {/* taxonomy list */}
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>Taxonomy ({all.length})</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: colors.ink3 }}>Tap eye to hide in app</Text>
        </View>
        {all.map((c) => {
          const hidden = hiddenCategories.includes(c.k);
          const stores = STORES.filter((s) => c.kinds.includes(s.kind)).length;
          return (
            <View key={c.k} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 12, paddingVertical: 10 }}>
              <View style={{ height: 36, width: 36, borderRadius: 8, overflow: "hidden", backgroundColor: `${c.accent}18`, alignItems: "center", justifyContent: "center" }}>
                {c.img ? <Img src={c.img} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 16 }}>{c.emoji}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{c.t}</Text>
                  {c.dynamic && (
                    <View style={{ borderRadius: 6, backgroundColor: "#7C5CFF", paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 8.5, color: "#fff" }}>CEO-ADDED</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontFamily: F.medium, fontSize: 10, color: colors.ink3 }}>{c.subs.length} subcategories • {stores} stores{hidden && " • hidden"}</Text>
              </View>
              <Pressable onPress={() => { toggleCategoryVisible(c.k); blip(hidden ? 760 : 480); }} style={{ height: 32, width: 32, borderRadius: 8, backgroundColor: hidden ? colors.card2 : "rgba(12,131,31,.12)", alignItems: "center", justifyContent: "center" }}>
                {hidden ? <EyeOff size={15} color={colors.ink3} /> : <Eye size={15} color="#0C831F" />}
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <SectionHead title="Attribute templates" sub="Auto-applied per category" />
        <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {["Electronics → Brand, Warranty, Color", "Fashion → Size, Color, Fit", "Grocery → Weight, Brand, Veg", "Furniture → Material, Dimensions"].map((t) => (
            <View key={t} style={{ borderRadius: 999, backgroundColor: colors.card2, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: colors.ink }}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Finance() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ borderRadius: 18, backgroundColor: "#111117", padding: 16, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -40, top: -40, height: 160, width: 160, borderRadius: 80, backgroundColor: "rgba(124,92,255,.3)" }} />
        <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1.8, color: "rgba(255,255,255,.5)" }}>SUBSCRIPTION REVENUE</Text>
        <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 32, color: "#fff" }}>₹24,18,400</Text>
        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 999, backgroundColor: "rgba(52,211,153,.15)", paddingHorizontal: 10, paddingVertical: 4 }}>
          <ArrowUpRight size={12} color="#6EE7B7" />
          <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#6EE7B7" }}>+12.4% vs last month</Text>
        </View>
        <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
          {[["Basic ₹499", "612"], ["Growth ₹999", "1,284"], ["Scale ₹2499", "308"]].map(([p, n]) => (
            <View key={p} style={{ flex: 1, borderRadius: 12, backgroundColor: "rgba(255,255,255,.08)", padding: 10 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: "rgba(255,255,255,.55)" }}>{p}</Text>
              <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>{n}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Settlements queue</Text>
        <View style={{ marginTop: 10, gap: 8 }}>
          {[["Meghana Foods", "₹1,84,200", "Processing", "#E8830C"], ["FreshKart Daily", "₹96,400", "Settled", "#0C831F"], ["Glow Salon", "₹64,100", "Settled", "#0C831F"], ["Volt Electronics", "₹41,800", "On hold", "#E23744"]].map(([n, a, st, c]) => (
            <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, backgroundColor: colors.card2, padding: 10 }}>
              <CreditCard size={16} color={c as string} />
              <Text style={{ flex: 1, fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{n}</Text>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{a}</Text>
              <View style={{ borderRadius: 999, backgroundColor: c as string, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: "#fff" }}>{st}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Churn & renewals</Text>
          <Text style={{ fontFamily: F.extra, fontSize: 11, color: colors.green }}>94% retained</Text>
        </View>
        <AreaGraph values={[88, 90, 89, 92, 93, 94, 94]} color="#0C831F" height={80} />
      </View>
    </View>
  );
}

function Risk() {
  const { colors } = useTheme();
  const items = [
    { e: ShieldAlert, t: "Refund spike — Spice Route Mart", s: "14 refunds/hr • possible pricing bug", a: "Hold payout", c: "#E23744" },
    { e: AlertTriangle, t: "Rating dip — FixIt Home Pros", s: "4.9 → 4.6 • 3 late arrivals today", a: "Nudge", c: "#E8830C" },
    { e: CreditCard, t: "2 failed UPI settlements", s: "₹4,120 stuck • retry queued", a: "Retry", c: "#1573FF" },
    { e: Users, t: "Duplicate GST detected", s: "2 provider accounts, same PAN", a: "Review", c: "#7C5CFF" },
  ];
  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[["Open flags", "7", "#E23744"], ["Auto-held", "₹1.2L", "#E8830C"], ["Resolved 7d", "38", "#0C831F"]].map(([l, v, c]) => (
          <View key={l} style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1, color: colors.ink3 }}>{l.toUpperCase()}</Text>
            <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 18, color: c as string }}>{v}</Text>
          </View>
        ))}
      </View>
      {items.map((it, i) => {
        const I = it.e;
        return (
          <Animated.View entering={FadeIn.duration(200)} key={it.t} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: `${it.c}18`, alignItems: "center", justifyContent: "center" }}>
              <I size={18} color={it.c} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{it.t}</Text>
              <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{it.s}</Text>
            </View>
            <View style={{ borderRadius: 999, backgroundColor: it.c, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: "#fff" }}>{it.a}</Text>
            </View>
          </Animated.View>
        );
      })}
      <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={15} color={colors.green} />
          <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>Fraud engine</Text>
        </View>
        <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>
          ML scoring on refunds, velocity, device fingerprint & GST duplication. 3 rules triggered today, 0 false positives this week.
        </Text>
      </View>
    </View>
  );
}

const CMS_ROWS: [string, string, string][] = [
  ["🏙️", "Cities & zones", "18 live • 4 pending"],
  ["🎟️", "Coupons engine", "24 active codes"],
  ["🔔", "Push campaigns", "3 scheduled today"],
  ["📜", "Policies & legal", "Updated 2 Oct"],
  ["👤", "Roles & permissions", "6 admins • 2 analysts"],
];

function Cms() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <SectionHead title="Categories" sub="Toggle live on the customer app" />
        <View style={{ marginTop: 12, gap: 8 }}>
          {CATEGORIES.map((c, i) => (
            <View key={c.k} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, backgroundColor: colors.card2, padding: 10 }}>
              <View style={{ height: 36, width: 36, borderRadius: 8, overflow: "hidden" }}>
                <Img src={c.img} style={{ width: "100%", height: "100%" }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{c.t}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 10, color: colors.ink3 }}>{c.sub} • {c.eta}</Text>
              </View>
              <View style={{ height: 20, width: 36, borderRadius: 10, backgroundColor: i < 8 ? colors.green : colors.chip, padding: 2, alignItems: i < 8 ? "flex-end" : "flex-start", justifyContent: "center" }}>
                <View style={{ height: 16, width: 16, borderRadius: 8, backgroundColor: "#fff" }} />
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <SectionHead title="Home banners" sub="Live on 2.4L devices" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
          {STORES.slice(0, 5).map((s) => (
            <View key={s.id} style={{ position: "relative", height: 78, width: 130, borderRadius: 12, overflow: "hidden" }}>
              <Img src={s.image} style={{ width: "100%", height: "100%" }} />
              <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 8, paddingBottom: 4, paddingTop: 16, backgroundColor: "rgba(0,0,0,.35)" }}>
                <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 9.5, color: "#fff" }}>{s.offers[0]}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
        {CMS_ROWS.map(([e, t, s], ix) => (
          <Pressable key={t} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: ix === CMS_ROWS.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
            <View style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 17 }}>{e}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{t}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{s}</Text>
            </View>
            <ChevronRight size={15} color={colors.ink3} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* Deviations from web admin.tsx:
 * - Tab active pill: plain conditional background (no layoutId spring animation).
 * - Category split bars + provider rows + risk rows: FadeIn on mount (no width/x animation).
 * - Create-category accent <input type="color"> → preset ACCENTS swatch row (same CategoryDef.accent string).
 * - Search bar is static text (web is also a static placeholder span, not a real input).
 * - Unused web imports (CheckCircle2/Ban/Eye used; Wallet/TrendingUp/etc. kept where rendered).
 */
