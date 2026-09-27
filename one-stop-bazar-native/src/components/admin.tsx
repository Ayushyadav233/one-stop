/**
 * Admin flow — super_admin control centre. EVERYTHING here is live:
 * Overview = /api/admin/stats, Providers = /api/admin/users+stores,
 * Catalog = /api/admin/categories, Finance = /api/admin/orders,
 * Risk = computed from live orders, CMS = coupons API + local toggles.
 * Auto-refresh 20s + manual refresh + reload after every mutation.
 */
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  AlertTriangle,
  ArrowUpRight,
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
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react-native";
import { CATEGORIES, STORES, inr, type CategoryDef } from "@/lib/data";
import { blip, useOSB } from "@/lib/osb-store";
import { AreaGraph, F, Img, SectionHead } from "./ui";
import { useTheme } from "@/theme/ThemeProvider";
import {
  apiAdminCatRequests,
  apiAdminCoupons,
  apiAdminDeleteCoupon,
  apiAdminDeleteHomeBlock,
  apiAdminDeleteStore,
  apiAdminHomeBlocks,
  apiAdminOrders,
  apiAdminPatchCatRequest,
  apiAdminPatchHomeBlock,
  apiAdminPatchOrder,
  apiAdminPatchStore,
  apiAdminPatchUserRole,
  apiAdminPostCoupon,
  apiAdminPostHomeBlock,
  apiAdminPostStore,
  apiAdminStats,
  apiAdminStores,
  apiAdminUsers,
  type ApiHomeBlock,
} from "@/lib/api";

const TABS = [
  { k: "overview", t: "Overview", i: LayoutGrid },
  { k: "providers", t: "Providers", i: Building2 },
  { k: "catalog", t: "Catalog", i: LineChart },
  { k: "finance", t: "Finance", i: Wallet },
  { k: "risk", t: "Risk", i: ShieldAlert },
  { k: "cms", t: "CMS", i: Globe2 },
];

type R = Record<string, unknown>;
const S = (v: unknown, d = ""): string => (v == null ? d : String(v));
const N = (v: unknown, d = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const digits10 = (p: string) => p.replace(/\D/g, "").slice(-10);
const ORDER_FLOW = ["new", "accepted", "ready", "onway", "delivered"] as const;
const nextStatus = (s: string) => {
  const i = ORDER_FLOW.indexOf(s as (typeof ORDER_FLOW)[number]);
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null;
};
const dayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/* ── shared live data (one fetch, all tabs) ── */
export function useAdminData(refreshKey: number) {
  const [users, setUsers] = useState<R[]>([]);
  const [stores, setStores] = useState<R[]>([]);
  const [orders, setOrders] = useState<R[]>([]);
  const [coupons, setCoupons] = useState<R[]>([]);
  const [requests, setRequests] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [u, st, o, cp, rq] = await Promise.all([
        apiAdminUsers().catch(() => null),
        apiAdminStores().catch(() => null),
        apiAdminOrders().catch(() => null),
        apiAdminCoupons().catch(() => null),
        apiAdminCatRequests().catch(() => null),
      ]);
      if (u?.users) setUsers(u.users as R[]);
      if (st?.stores) setStores(st.stores as R[]);
      if (o?.orders) setOrders(o.orders as R[]);
      if (cp?.coupons) setCoupons(cp.coupons as R[]);
      if (rq?.categoryRequests) setRequests(rq.categoryRequests as R[]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, refreshKey]);
  return { users, stores, orders, coupons, requests, loading, reload: load };
}
export type AdminData = ReturnType<typeof useAdminData>;

export function AdminPanel() {
  const set = useOSB((s) => s.set);
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const data = useAdminData(refreshKey);
  const { colors } = useTheme();
  // Real-time: background refresh while admin is open.
  useEffect(() => {
    const t = setInterval(() => setRefreshKey((k) => k + 1), 20000);
    return () => clearInterval(t);
  }, []);
  const pendingReq = data.requests.filter((r) => S(r.status) === "pending").length;
  const cancelledToday = data.orders.filter(
    (o) => S(o.status) === "cancelled" && new Date(S(o.createdAt) || 0).getTime() >= dayStart()
  ).length;
  const badge = pendingReq + cancelledToday;
  const go = (t: string) => {
    setTab(t);
    blip(660);
  };
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
              <Text style={{ fontFamily: F.bold, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
                {data.loading ? "Syncing…" : `${data.orders.length} orders • ${data.users.length} users • live`}
              </Text>
            </View>
          </View>
          <Pressable onPress={() => go("risk")} style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,.1)", alignItems: "center", justifyContent: "center" }}>
            <Bell size={17} color="#fff" />
            {badge > 0 && (
              <View style={{ position: "absolute", right: -2, top: -2, height: 16, minWidth: 16, borderRadius: 8, backgroundColor: "#FF5C69", alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9, color: "#fff" }}>{badge}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => { setRefreshKey((k) => k + 1); blip(600); }} style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,.1)", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={16} color="#fff" />
          </Pressable>
          <Pressable onPress={() => { set({ mode: "customer", tab: "home" }); blip(500); }} style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,.1)", alignItems: "center", justifyContent: "center" }}>
            <LogOut size={16} color="#fff" />
          </Pressable>
        </View>
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,.1)", paddingHorizontal: 12, paddingVertical: 4 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search users, stores, orders…"
            placeholderTextColor="rgba(255,255,255,.4)"
            style={{ flex: 1, fontFamily: F.semi, fontSize: 12.5, color: "#fff", paddingVertical: 8 }}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")}>
              <X size={15} color="rgba(255,255,255,.6)" />
            </Pressable>
          ) : null}
        </View>
        {/* tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 12 }}>
          {TABS.map((t) => {
            const I = t.i;
            const on = tab === t.k;
            return (
              <Pressable
                key={t.k}
                onPress={() => go(t.k)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: on ? "#fff" : "transparent" }}
              >
                <I size={13} color={on ? "#000" : "rgba(255,255,255,.6)"} />
                <Text style={{ fontFamily: F.extra, fontSize: 12, color: on ? "#000" : "rgba(255,255,255,.6)" }}>{t.t}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 176 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => setRefreshKey((k) => k + 1)} tintColor={colors.ink3} />}
      >
        <Animated.View entering={FadeIn.duration(240)} key={tab}>
          {tab === "overview" && <Overview data={data} go={go} />}
          {tab === "providers" && <Providers data={data} query={query} />}
          {tab === "catalog" && <Catalog data={data} />}
          {tab === "finance" && <Finance data={data} query={query} />}
          {tab === "risk" && <Risk data={data} go={go} />}
          {tab === "cms" && <Cms data={data} go={go} />}
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

function Empty({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderRadius: 12, backgroundColor: colors.card2, padding: 16, alignItems: "center" }}>
      <Text style={{ fontFamily: F.semi, fontSize: 12, color: colors.ink3, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

/* ═══════════ Overview — live stats + latest orders ═══════════ */
function Overview({ data, go }: { data: AdminData; go: (t: string) => void }) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    apiAdminStats()
      .then((j) => {
        if (j?.ok) setStats(j.stats ?? null);
      })
      .catch(() => {});
  }, [data.orders.length]);
  const s = stats ?? { users: data.users.length || "—", stores: data.stores.length || "—", products: "—", ordersToday: "—", gmvToday: 0 };
  const latest = [...data.orders]
    .sort((a, b) => new Date(S(b.createdAt)).getTime() - new Date(S(a.createdAt)).getTime())
    .slice(0, 5);
  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, gap: 10 }}>
          <Kpi l="Users" v={String(s.users)} d="registered" accent="#7C5CFF" />
          <Kpi l="Providers" v={String(s.stores)} d="live" accent="#1573FF" />
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <Kpi l="Products" v={String(s.products)} d="in catalog" accent="#0C831F" />
          <Kpi l="Orders today" v={String(s.ordersToday)} d="today" accent="#E8830C" />
        </View>
      </View>
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>GMV today</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink3 }}>Auto-refresh 20s</Text>
          </View>
          <Text style={{ fontFamily: F.extra, fontSize: 22, color: colors.ink }}>{inr(N(s.gmvToday))}</Text>
        </View>
      </View>
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>Latest orders</Text>
          <Pressable onPress={() => go("finance")}>
            <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#7C5CFF" }}>Manage →</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 10, gap: 8 }}>
          {latest.length === 0 && <Empty text="No orders yet — customer app se pehla order aate hi yaha dikhega." />}
          {latest.map((o) => (
            <View key={S(o.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, backgroundColor: colors.card2, padding: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{S(o.code, S(o.id).slice(0, 8))}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{S(o.storeName, "Store")} • {S(o.customerName, "Guest")}</Text>
              </View>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{inr(N(o.total))}</Text>
              <View style={{ borderRadius: 999, backgroundColor: S(o.status) === "cancelled" ? "#E23744" : S(o.status) === "delivered" ? "#0C831F" : "#E8830C", paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: "#fff" }}>{S(o.status, "new")}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ═══════════ Providers — real users (roles) + real stores ═══════════ */
const ROLES = ["customer", "store_admin", "super_admin"] as const;

function Providers({ data, query }: { data: AdminData; query: string }) {
  const { colors } = useTheme();
  const ownPhone = useOSB((s) => s.phone);
  const [section, setSection] = useState<"users" | "stores">("users");
  const [adding, setAdding] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeKind, setStoreKind] = useState("food");
  const q = query.trim().toLowerCase();
  const users = data.users.filter(
    (u) => !q || S(u.name).toLowerCase().includes(q) || S(u.phone).replace(/\D/g, "").includes(q.replace(/\D/g, ""))
  );
  const stores = data.stores.filter((s) => !q || S(s.name).toLowerCase().includes(q) || S(s.slug).toLowerCase().includes(q));

  const setRole = (u: R) => {
    const cur = S(u.role, "customer");
    const next = ROLES[(ROLES.indexOf(cur as (typeof ROLES)[number]) + 1) % ROLES.length];
    if (digits10(S(u.phone)) === digits10(ownPhone) && next !== "super_admin") {
      Alert.alert("Ruko", "Apna khud ka admin access mat hatao — lockout ho jaoge.");
      return;
    }
    Alert.alert("Change role", `${S(u.name, "User")} (${S(u.phone)}) → ${next}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          apiAdminPatchUserRole(S(u.phone), next).then(() => {
            blip(920, 0.15);
            void data.reload();
          });
        },
      },
    ]);
  };

  const toggleStore = (s: R) => {
    const open = !(s.isOpen ?? true);
    apiAdminPatchStore(S(s.id), { isOpen: open }).then(() => {
      blip(open ? 920 : 500);
      void data.reload();
    });
  };

  const deleteStore = (s: R) => {
    Alert.alert("Delete store", `"${S(s.name)}" hamesha ke liye hat jayega. Products bhi cascade honge.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          apiAdminDeleteStore(S(s.id)).then(() => {
            blip(420, 0.1);
            void data.reload();
          });
        },
      },
    ]);
  };

  const createStore = () => {
    if (!storeName.trim()) return;
    apiAdminPostStore({ name: storeName.trim(), kind: storeKind }).then((j) => {
      if (j?.ok) {
        blip(920, 0.15);
        setStoreName("");
        setAdding(false);
        void data.reload();
      }
    });
  };

  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {([["users", `Users (${data.users.length})`], ["stores", `Stores (${data.stores.length})`]] as const).map(([k, t]) => (
          <Pressable key={k} onPress={() => { setSection(k); blip(620); }} style={{ flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center", backgroundColor: section === k ? colors.ink : colors.card, borderWidth: section === k ? 0 : 1, borderColor: colors.line }}>
            <Text style={{ fontFamily: F.extra, fontSize: 12, color: section === k ? colors.app : colors.ink2 }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {section === "users" ? (
        <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
          {users.length === 0 && (
            <View style={{ padding: 16 }}>
              <Empty text={data.loading ? "Loading users…" : "Koi user nahi mila."} />
            </View>
          )}
          {users.map((u, i) => {
            const role = S(u.role, "customer");
            return (
              <View key={S(u.id, String(i))} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: i === users.length - 1 ? 0 : 1, borderBottomColor: colors.line, paddingHorizontal: 12, paddingVertical: 12 }}>
                <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: role === "super_admin" ? "#7C5CFF" : colors.chip, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 15, color: role === "super_admin" ? "#fff" : colors.ink }}>{S(u.name, "?").slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{S(u.name, "Guest")}</Text>
                  <Text style={{ fontFamily: F.semi, fontSize: 10.5, color: colors.ink3 }}>+91 {S(u.phone)}</Text>
                </View>
                <Pressable onPress={() => setRole(u)} style={{ borderRadius: 999, backgroundColor: role === "super_admin" ? "#7C5CFF" : role === "store_admin" ? "#1573FF" : colors.chip, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 10, color: role === "customer" ? colors.ink2 : "#fff" }}>{role} ⟳</Text>
                </Pressable>
              </View>
            );
          })}
          <Text style={{ paddingHorizontal: 16, paddingVertical: 10, fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>
            Role chip dabao → next role (customer → store_admin → super_admin). Change turant backend pe lagta hai.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Pressable onPress={() => setAdding(!adding)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
              <Plus size={18} strokeWidth={3} color={colors.app} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>Add store</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>Customer app me turant live</Text>
            </View>
            <ChevronRight size={16} color={colors.ink3} style={{ transform: [{ rotate: adding ? "90deg" : "0deg" }] }} />
          </Pressable>
          {adding && (
            <Animated.View entering={FadeIn.duration(200)} style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 8 }}>
              <TextInput value={storeName} onChangeText={setStoreName} placeholder="Store name e.g. Sharma Sweets" placeholderTextColor={colors.ink3} style={{ borderRadius: 12, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semi, fontSize: 13, color: colors.ink }} />
              <View style={{ flexDirection: "row", gap: 6 }}>
                {["food", "grocery", "pharmacy", "services"].map((k) => (
                  <Pressable key={k} onPress={() => setStoreKind(k)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: storeKind === k ? "#0C831F" : colors.chip }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 11, color: storeKind === k ? "#fff" : colors.ink2 }}>{k}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={createStore} style={{ borderRadius: 12, backgroundColor: "#0C831F", paddingVertical: 13, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>Publish store live</Text>
              </Pressable>
            </Animated.View>
          )}
          <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
            {stores.length === 0 && (
              <View style={{ padding: 16 }}>
                <Empty text={data.loading ? "Loading stores…" : "Koi store nahi."} />
              </View>
            )}
            {stores.map((s, i) => {
              const open = s.isOpen ?? true;
              const todayCount = data.orders.filter((o) => S(o.storeId) === S(s.id)).length;
              return (
                <View key={S(s.id, String(i))} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: i === stores.length - 1 ? 0 : 1, borderBottomColor: colors.line, paddingHorizontal: 12, paddingVertical: 12 }}>
                  <View style={{ height: 44, width: 44, borderRadius: 12, overflow: "hidden", backgroundColor: colors.chip }}>
                    {S(s.image) ? <Img src={S(s.image)} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 20, textAlign: "center", lineHeight: 44 }}>🏪</Text>}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{S(s.name)}</Text>
                    <Text style={{ fontFamily: F.semi, fontSize: 10.5, color: colors.ink3 }}>{S(s.kind)} • {todayCount} orders</Text>
                  </View>
                  <Pressable onPress={() => toggleStore(s)} style={{ borderRadius: 999, backgroundColor: open ? "#0C831F" : colors.chip, paddingHorizontal: 12, paddingVertical: 7 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: open ? "#fff" : colors.ink2 }}>{open ? "Open" : "Closed"}</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteStore(s)} style={{ height: 32, width: 32, borderRadius: 10, backgroundColor: "rgba(226,55,68,.1)", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={14} color="#E23744" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

/* ═══════════ Catalog — backend category requests + local taxonomy ═══════════ */
function Catalog({ data }: { data: AdminData }) {
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
  const pending: R[] = [
    ...data.requests.filter((r) => S(r.status) === "pending"),
    ...catRequests
      .filter((r) => r.status === "pending")
      .map((r) => ({ id: r.id, name: r.category, kind: "local", category: r.category, emoji: r.emoji, storeName: r.storeName, _local: true }) as R),
  ];
  const all = [...CATEGORIES, ...extraCategories];

  const approve = (r: R) => {
    if ((r as { _local?: boolean })._local) {
      approveRequest(S(r.id));
    } else {
      void apiAdminPatchCatRequest(S(r.id), "approved").then(() => void data.reload());
      // App me turant publish (local taxonomy).
      const k = S(r.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28);
      if (k && !all.some((c) => c.k === k)) {
        addCategory({ k, t: S(r.name), sub: "New on Bazar", img: "", kinds: [], accent: "#7C5CFF", eta: "Soon", emoji: "✨", subs: [], dynamic: true, featured: true });
      }
    }
    blip(960, 0.15);
  };
  const decline = (r: R) => {
    if ((r as { _local?: boolean })._local) rejectRequest(S(r.id));
    else void apiAdminPatchCatRequest(S(r.id), "rejected").then(() => void data.reload());
    blip(420, 0.1);
  };

  const create = () => {
    if (!name.trim()) return;
    const c: CategoryDef = { k: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28), t: name.trim(), sub: sub.trim() || "New on Bazar", img: "", kinds: [], accent, eta: "Soon", emoji, subs: [], dynamic: true, featured: true };
    addCategory(c);
    blip(920, 0.15);
    setName("");
    setSub("");
    setCreating(false);
  };
  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
      {/* requests */}
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <SectionHead title="Category requests" sub="Backend + provider app, live" />
          <View style={{ borderRadius: 999, backgroundColor: "#7C5CFF", paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>{pending.length} new</Text>
          </View>
        </View>
        <View style={{ marginTop: 10, gap: 8 }}>
          {pending.length === 0 && <Empty text="All caught up ✓ — nayi requests yaha live aayengi." />}
          {pending.map((r) => (
            <Animated.View entering={FadeIn.duration(200)} key={S(r.id)} style={{ borderRadius: 14, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(124,92,255,.45)", backgroundColor: "rgba(124,92,255,.08)", padding: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18 }}>{S((r as { emoji?: string }).emoji, "🏷️")}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>
                    “{S((r as { category?: string }).category || r.name)}”{" "}
                    <Text style={{ fontFamily: F.semi, color: colors.ink3 }}>• {S(r.kind, "general")}</Text>
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>
                    {(r as { _local?: boolean })._local ? `${S((r as { storeName?: string }).storeName, "Provider")} • this device` : `By ${S((r as { requestedBy?: string }).requestedBy, "provider")} • server`}
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => approve(r)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 10, backgroundColor: "#0C831F", paddingVertical: 10 }}>
                  <Check size={14} color="#fff" />
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#fff" }}>Approve & publish</Text>
                </Pressable>
                <Pressable onPress={() => decline(r)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 10, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 10 }}>
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
                {["#7C5CFF", "#0C831F", "#E23744", "#E8830C", "#1573FF", "#0E3B2E"].map((a) => (
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
    </View>
  );
}

/* ═══════════ Finance — real revenue + live orders queue ═══════════ */
const ORDER_FILTERS = ["all", "new", "accepted", "ready", "onway", "delivered", "cancelled"] as const;

function Finance({ data, query }: { data: AdminData; query: string }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<(typeof ORDER_FILTERS)[number]>("all");
  const today = data.orders.filter((o) => new Date(S(o.createdAt) || 0).getTime() >= dayStart());
  const revenue = today.filter((o) => S(o.status) !== "cancelled").reduce((a, o) => a + N(o.total), 0);
  const delivered = data.orders.filter((o) => S(o.status) === "delivered");
  const avgBill = delivered.length ? Math.round(delivered.reduce((a, o) => a + N(o.total), 0) / delivered.length) : 0;
  const q = query.trim().toLowerCase();
  const list = [...data.orders]
    .sort((a, b) => new Date(S(b.createdAt)).getTime() - new Date(S(a.createdAt)).getTime())
    .filter((o) => (filter === "all" ? true : S(o.status) === filter))
    .filter(
      (o) =>
        !q ||
        S(o.code).toLowerCase().includes(q) ||
        S(o.customerName).toLowerCase().includes(q) ||
        S(o.storeName).toLowerCase().includes(q) ||
        S(o.customerPhone).replace(/\D/g, "").includes(q.replace(/\D/g, ""))
    )
    .slice(0, 60);

  // Per-store GMV ranking (delivered + in-progress, cancelled excluded).
  const gmv = new Map<string, { name: string; total: number; count: number }>();
  for (const o of data.orders) {
    if (S(o.status) === "cancelled") continue;
    const k = S(o.storeId, S(o.storeName, "?"));
    const e = gmv.get(k) ?? { name: S(o.storeName, "Store"), total: 0, count: 0 };
    e.total += N(o.total);
    e.count += 1;
    gmv.set(k, e);
  }
  const ranking = [...gmv.values()].sort((a, b) => b.total - a.total).slice(0, 5);

  const advance = (o: R) => {
    const nx = nextStatus(S(o.status, "new"));
    if (!nx) return;
    apiAdminPatchOrder(S(o.id), { status: nx }).then(() => {
      blip(880);
      void data.reload();
    });
  };
  const cancel = (o: R) => {
    Alert.alert("Cancel order", `${S(o.code, "")} cancel ho jayega. Customer ko refund/wallet note jayega.`, [
      { text: "Back", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: () => {
          apiAdminPatchOrder(S(o.id), { status: "cancelled" }).then(() => {
            blip(420, 0.1);
            void data.reload();
          });
        },
      },
    ]);
  };

  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ borderRadius: 18, backgroundColor: "#111117", padding: 16, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -40, top: -40, height: 160, width: 160, borderRadius: 80, backgroundColor: "rgba(124,92,255,.3)" }} />
        <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1.8, color: "rgba(255,255,255,.5)" }}>REVENUE TODAY (EXCL. CANCELLED)</Text>
        <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 32, color: "#fff" }}>{inr(revenue)}</Text>
        <View style={{ marginTop: 6, flexDirection: "row", gap: 8 }}>
          {[[`${today.length} orders`, "today"], [`${inr(avgBill)} avg bill`, "delivered"], [`${delivered.length} delivered`, "total"]].map(([v, l]) => (
            <View key={l} style={{ flex: 1, borderRadius: 12, backgroundColor: "rgba(255,255,255,.08)", padding: 10 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>{v}</Text>
              <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: "rgba(255,255,255,.55)" }}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      {ranking.length > 0 && (
        <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Top stores by GMV</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {ranking.map((r, i) => (
              <View key={r.name + i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ width: 16, fontFamily: F.extra, fontSize: 11, color: colors.ink3 }}>{i + 1}</Text>
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{r.name}</Text>
                <Text style={{ fontFamily: F.semi, fontSize: 10.5, color: colors.ink3 }}>{r.count} orders</Text>
                <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#0C831F" }}>{inr(r.total)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>Orders queue ({list.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 10 }}>
          {ORDER_FILTERS.map((f) => (
            <Pressable key={f} onPress={() => { setFilter(f); blip(600); }} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: filter === f ? colors.ink : colors.chip }}>
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: filter === f ? colors.app : colors.ink2 }}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ marginTop: 10, gap: 8 }}>
          {list.length === 0 && <Empty text={data.loading ? "Loading orders…" : "Is filter me koi order nahi."} />}
          {list.map((o) => {
            const st = S(o.status, "new");
            const nx = nextStatus(st);
            const items = Array.isArray(o.items) ? (o.items as R[]) : [];
            const itemStr = items.slice(0, 3).map((i) => `${S(i.name)}×${N(i.qty)}`).join(", ");
            return (
              <View key={S(o.id)} style={{ borderRadius: 14, backgroundColor: colors.card2, padding: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{S(o.code, S(o.id).slice(0, 8))}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>
                      {S(o.storeName, "Store")} • {S(o.customerName, "Guest")} • {inr(N(o.total))}
                    </Text>
                    {itemStr ? <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{itemStr}</Text> : null}
                  </View>
                  <View style={{ borderRadius: 999, backgroundColor: st === "cancelled" ? "#E23744" : st === "delivered" ? "#0C831F" : "#E8830C", paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: "#fff" }}>{st}</Text>
                  </View>
                </View>
                {st !== "delivered" && st !== "cancelled" && (
                  <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
                    {nx && (
                      <Pressable onPress={() => advance(o)} style={{ flex: 1, borderRadius: 10, backgroundColor: "#0C831F", paddingVertical: 9, alignItems: "center" }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#fff" }}>→ {nx}</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => cancel(o)} style={{ borderRadius: 10, backgroundColor: "rgba(226,55,68,.12)", paddingHorizontal: 14, paddingVertical: 9, alignItems: "center" }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#E23744" }}>Cancel</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ═══════════ Risk — live flags computed from real orders ═══════════ */
function Risk({ data, go }: { data: AdminData; go: (t: string) => void }) {
  const { colors } = useTheme();
  const cancelsByStore = new Map<string, { name: string; n: number }>();
  for (const o of data.orders) {
    if (S(o.status) !== "cancelled") continue;
    const k = S(o.storeId, S(o.storeName, "?"));
    const e = cancelsByStore.get(k) ?? { name: S(o.storeName, "Store"), n: 0 };
    e.n += 1;
    cancelsByStore.set(k, e);
  }
  const cancelRows = [...cancelsByStore.values()].sort((a, b) => b.n - a.n);
  const pendingReq = data.requests.filter((r) => S(r.status) === "pending");
  const cancelledToday = data.orders.filter((o) => S(o.status) === "cancelled" && new Date(S(o.createdAt) || 0).getTime() >= dayStart());
  const openFlags = cancelRows.length + (pendingReq.length > 0 ? 1 : 0);

  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[["Open flags", String(openFlags), "#E23744"], ["Cancelled today", String(cancelledToday.length), "#E8830C"], ["Pending requests", String(pendingReq.length), "#0C831F"]].map(([l, v, c]) => (
          <View key={l} style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1, color: colors.ink3 }}>{l.toUpperCase()}</Text>
            <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 18, color: c as string }}>{v}</Text>
          </View>
        ))}
      </View>
      {openFlags === 0 && <Empty text="All clear ✓ — koi cancel spike ya pending request nahi." />}
      {cancelRows.map((r) => (
        <View key={r.name} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
          <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: "rgba(226,55,68,.1)", alignItems: "center", justifyContent: "center" }}>
            <ShieldAlert size={18} color="#E23744" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>Cancels — {r.name}</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{r.n} cancelled order{r.n === 1 ? "" : "s"} • menu/pricing check karo</Text>
          </View>
          <Pressable onPress={() => go("finance")} style={{ borderRadius: 999, backgroundColor: "#E23744", paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: "#fff" }}>View</Text>
          </Pressable>
        </View>
      ))}
      {pendingReq.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
          <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: "rgba(124,92,255,.12)", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={18} color="#7C5CFF" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>Category requests pending</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{pendingReq.length} approve/decline ke liye ruke hain</Text>
          </View>
          <Pressable onPress={() => go("catalog")} style={{ borderRadius: 999, backgroundColor: "#7C5CFF", paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: "#fff" }}>Review</Text>
          </Pressable>
        </View>
      )}
      <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={15} color={colors.green} />
          <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>Flags kaise bante hain</Text>
        </View>
        <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>
          Cancelled orders store-wise group hote hain, pending requests count hoti hai. Sab live DB se — 20s me auto-refresh. Koi nakli ML claim nahi.
        </Text>
      </View>
    </View>
  );
}

/* ═══════════ CMS — wired category toggles + live coupons manager ═══════════ */
function Cms({ data, go }: { data: AdminData; go: (t: string) => void }) {
  const { colors } = useTheme();
  const toggleCategoryVisible = useOSB((s) => s.toggleCategoryVisible);
  const hiddenCategories = useOSB((s) => s.hiddenCategories);
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [offPct, setOffPct] = useState("20");
  const pendingReq = data.requests.filter((r) => S(r.status) === "pending").length;

  const createCoupon = () => {
    if (!code.trim() || !title.trim()) return;
    apiAdminPostCoupon({ code: code.trim().toUpperCase(), title: title.trim(), offPct: N(offPct, 20) }).then((j) => {
      if (j?.ok) {
        blip(920, 0.15);
        setCode("");
        setTitle("");
        setOffPct("20");
        setAdding(false);
        void data.reload();
      }
    });
  };
  const removeCoupon = (c: R) => {
    Alert.alert("Delete coupon", `${S(c.code)} hata du? Customer app se turant gayab hoga.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          apiAdminDeleteCoupon(S(c.id)).then(() => {
            blip(420, 0.1);
            void data.reload();
          });
        },
      },
    ]);
  };

  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <SectionHead title="Coupons engine" sub="Customer app me turant live" />
          <View style={{ borderRadius: 999, backgroundColor: "#0C831F", paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>{data.coupons.length} live</Text>
          </View>
        </View>
        <View style={{ marginTop: 10, gap: 8 }}>
          {data.coupons.length === 0 && <Empty text={data.loading ? "Loading…" : "Koi coupon nahi — neeche se banao."} />}
          {data.coupons.map((c) => (
            <View key={S(c.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, backgroundColor: colors.card2, padding: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{S(c.code)}</Text>
                <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>
                  {S(c.title)} • {N(c.offPct)}% off, max ₹{N(c.maxOff)} • min ₹{N(c.minOrder)}
                </Text>
              </View>
              <Pressable onPress={() => removeCoupon(c)} style={{ height: 32, width: 32, borderRadius: 10, backgroundColor: "rgba(226,55,68,.1)", alignItems: "center", justifyContent: "center" }}>
                <Trash2 size={14} color="#E23744" />
              </Pressable>
            </View>
          ))}
        </View>
        <Pressable onPress={() => setAdding(!adding)} style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: colors.chip, paddingVertical: 12 }}>
          <Plus size={15} color={colors.ink} />
          <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>New coupon</Text>
        </Pressable>
        {adding && (
          <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 8, gap: 8 }}>
            <TextInput value={code} onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="CODE e.g. DIWALI25" placeholderTextColor={colors.ink3} autoCapitalize="characters" style={{ borderRadius: 12, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.extra, fontSize: 13, color: colors.ink }} />
            <TextInput value={title} onChangeText={setTitle} placeholder="Title e.g. Diwali 25% OFF" placeholderTextColor={colors.ink3} style={{ borderRadius: 12, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semi, fontSize: 13, color: colors.ink }} />
            <TextInput value={offPct} onChangeText={(v) => setOffPct(v.replace(/\D/g, "").slice(0, 2))} placeholder="OFF % e.g. 25" placeholderTextColor={colors.ink3} keyboardType="number-pad" style={{ borderRadius: 12, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semi, fontSize: 13, color: colors.ink }} />
            <Pressable onPress={createCoupon} style={{ borderRadius: 12, backgroundColor: "#0C831F", paddingVertical: 13, alignItems: "center" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>Launch coupon</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <SectionHead title="Categories" sub="Toggle = customer app me turant hide/show" />
        <View style={{ marginTop: 12, gap: 8 }}>
          {CATEGORIES.map((c) => {
            const hidden = hiddenCategories.includes(c.k);
            return (
              <View key={c.k} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, backgroundColor: colors.card2, padding: 10 }}>
                <View style={{ height: 36, width: 36, borderRadius: 8, overflow: "hidden", backgroundColor: colors.chip }}>
                  <Img src={c.img} style={{ width: "100%", height: "100%" }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{c.t}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 10, color: colors.ink3 }}>{hidden ? "Hidden in app" : "Live in app"}</Text>
                </View>
                <Pressable onPress={() => { toggleCategoryVisible(c.k); blip(hidden ? 760 : 480); }} style={{ height: 30, width: 52, borderRadius: 15, backgroundColor: hidden ? colors.chip : "#0C831F", justifyContent: "center", paddingHorizontal: 3 }}>
                  <View style={{ height: 24, width: 24, borderRadius: 12, backgroundColor: "#fff", alignSelf: hidden ? "flex-start" : "flex-end" }} />
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
        {(
          [
            ["👤", "Users & roles", `${data.users.length} users • tap to manage`, "providers"],
            ["🏷️", "Category requests", `${pendingReq} pending • tap to review`, "catalog"],
            ["💰", "Orders & revenue", `${data.orders.length} orders • tap to manage`, "finance"],
            ["🚨", "Risk flags", "Live cancels • tap to view", "risk"],
          ] as const
        ).map(([e, t, s, dest], ix, arr) => (
          <Pressable key={t} onPress={() => go(dest)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: ix === arr.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
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

      <HomeManager data={data} />
    </View>
  );
}

const HOME_KINDS = [
  ["banner", "Top carousel", "🖼️"],
  ["festival", "Festival spotlight", "🪔"],
  ["ad", "Mid-home ad card", "📢"],
  ["strip", "Offer strip text", "🏷️"],
] as const;
type HomeKind = (typeof HOME_KINDS)[number][0];
const HOME_LINKS = ["none", "store", "category", "search"] as const;

/* ═══════════ HomeManager — homepage CMS (banners/ads/festival/strips) ═══════════ */
function HomeManager({ data }: { data: AdminData }) {
  const { colors } = useTheme();
  const extraCategories = useOSB((s) => s.extraCategories);
  const syncHomeBlocks = useOSB((s) => s.syncHomeBlocks);
  const [blocks, setBlocks] = useState<ApiHomeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<HomeKind>("banner");
  const [tag, setTag] = useState("");
  const [title, setTitle] = useState("");
  const [sub, setSub] = useState("");
  const [cta, setCta] = useState("");
  const [image, setImage] = useState("");
  const [linkKind, setLinkKind] = useState<string>("none");
  const [linkValue, setLinkValue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [active, setActive] = useState(true);

  const load = useCallback(() => {
    apiAdminHomeBlocks()
      .then((b) => {
        setBlocks(b);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setKind("banner");
    setTag("");
    setTitle("");
    setSub("");
    setCta("");
    setImage("");
    setLinkKind("none");
    setLinkValue("");
    setStartsAt("");
    setEndsAt("");
    setActive(true);
  };
  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };
  const openEdit = (b: ApiHomeBlock) => {
    setEditingId(b.id);
    setKind((b.kind as HomeKind) || "banner");
    setTag(b.tag || "");
    setTitle(b.title || "");
    setSub(b.sub || "");
    setCta(b.cta || "");
    setImage(b.image || "");
    setLinkKind(b.linkKind || "none");
    setLinkValue(b.linkValue || "");
    setStartsAt((b.startsAt || "").slice(0, 16).replace("T", " "));
    setEndsAt((b.endsAt || "").slice(0, 16).replace("T", " "));
    setActive(b.active !== false);
    setFormOpen(true);
  };

  const parseDate = (v: string): string | null => {
    const t = v.trim().replace(" ", "T");
    if (!t) return null;
    const ms = Date.parse(t.length <= 10 ? `${t}T00:00:00` : t);
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
  };

  const save = () => {
    if (!title.trim()) {
      blip(320);
      return;
    }
    const payload: Partial<ApiHomeBlock> = {
      kind,
      tag: tag.trim(),
      title: title.trim(),
      sub: sub.trim(),
      cta: cta.trim(),
      image: image.trim(),
      linkKind,
      linkValue: linkValue.trim(),
      active,
      startsAt: parseDate(startsAt),
      endsAt: parseDate(endsAt),
    };
    const done = () => {
      blip(920, 0.15);
      setFormOpen(false);
      resetForm();
      load();
      syncHomeBlocks(); // customer home turant fresh
    };
    if (editingId) void apiAdminPatchHomeBlock(editingId, payload).then(done);
    else {
      const maxSort = blocks.reduce((a, b) => Math.max(a, b.sort ?? 0), 0);
      void apiAdminPostHomeBlock({ ...payload, sort: maxSort + 1 }).then(done);
    }
  };

  const remove = (b: ApiHomeBlock) => {
    Alert.alert("Delete block", `"${b.title || b.kind}" home se hat jayega.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void apiAdminDeleteHomeBlock(b.id).then(() => {
            blip(420, 0.1);
            load();
            syncHomeBlocks();
          });
        },
      },
    ]);
  };

  const flipActive = (b: ApiHomeBlock) => {
    void apiAdminPatchHomeBlock(b.id, { active: !(b.active !== false) }).then(() => {
      blip(700);
      load();
      syncHomeBlocks();
    });
  };

  const move = (b: ApiHomeBlock, dir: -1 | 1) => {
    const sorted = [...blocks].sort((a, c) => (a.sort ?? 0) - (c.sort ?? 0));
    const i = sorted.findIndex((x) => x.id === b.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const a = sorted[i];
    const c = sorted[j];
    void Promise.all([
      apiAdminPatchHomeBlock(a.id, { sort: c.sort ?? 0 }),
      apiAdminPatchHomeBlock(c.id, { sort: a.sort ?? 0 }),
    ]).then(() => {
      load();
      syncHomeBlocks();
    });
  };

  const storeImgs = data.stores.filter((s) => S(s.image));
  const catKeys = [...CATEGORIES.map((c) => c.k), ...extraCategories.map((c) => c.k)];

  const inputStyle = { borderRadius: 12, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semi, fontSize: 13, color: colors.ink } as const;

  return (
    <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <SectionHead title="Home content" sub="Banner • festival • ads • strips — app me live" />
        <View style={{ borderRadius: 999, backgroundColor: "#7C5CFF", paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>{blocks.filter((b) => b.active !== false).length}/{blocks.length} live</Text>
        </View>
      </View>

      <View style={{ marginTop: 10, gap: 8 }}>
        {loading && <Empty text="Loading…" />}
        {!loading && blocks.length === 0 && <Empty text="Koi block nahi — neeche se banao, home khali lagega." />}
        {[...blocks]
          .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
          .map((b, ix, arr) => {
            const on = b.active !== false;
            const kindLabel = HOME_KINDS.find(([k]) => k === b.kind)?.[1] ?? b.kind;
            return (
              <View key={b.id} style={{ borderRadius: 14, backgroundColor: colors.card2, padding: 10, opacity: on ? 1 : 0.55 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ height: 48, width: 72, borderRadius: 10, overflow: "hidden", backgroundColor: colors.chip }}>
                    {b.image ? <Img src={b.image} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 20, textAlign: "center", lineHeight: 48 }}>🏷️</Text>}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1, color: "#7C5CFF" }}>{kindLabel.toUpperCase()}{b.linkKind && b.linkKind !== "none" ? ` → ${b.linkKind}:${b.linkValue}` : ""}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{b.title || "(no title)"}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>
                      {b.sub || b.tag || "—"}{b.startsAt || b.endsAt ? ` • ⏰ ${S(b.startsAt, "…").slice(0, 10)} → ${S(b.endsAt, "…").slice(0, 10)}` : ""}
                    </Text>
                  </View>
                </View>
                <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Pressable onPress={() => move(b, -1)} disabled={ix === 0} style={{ height: 32, width: 32, borderRadius: 10, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center", opacity: ix === 0 ? 0.35 : 1 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>↑</Text>
                  </Pressable>
                  <Pressable onPress={() => move(b, 1)} disabled={ix === arr.length - 1} style={{ height: 32, width: 32, borderRadius: 10, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center", opacity: ix === arr.length - 1 ? 0.35 : 1 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>↓</Text>
                  </Pressable>
                  <Pressable onPress={() => flipActive(b)} style={{ flex: 1, borderRadius: 10, backgroundColor: on ? "#0C831F" : colors.chip, paddingVertical: 8, alignItems: "center" }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: on ? "#fff" : colors.ink2 }}>{on ? "Live ✓" : "Hidden"}</Text>
                  </Pressable>
                  <Pressable onPress={() => openEdit(b)} style={{ height: 32, width: 40, borderRadius: 10, backgroundColor: "#1573FF", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#fff" }}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => remove(b)} style={{ height: 32, width: 32, borderRadius: 10, backgroundColor: "rgba(226,55,68,.12)", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={14} color="#E23744" />
                  </Pressable>
                </View>
              </View>
            );
          })}
      </View>

      <Pressable onPress={() => (formOpen ? (setFormOpen(false), resetForm()) : openAdd())} style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: colors.chip, paddingVertical: 12 }}>
        <Plus size={15} color={colors.ink} />
        <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{formOpen ? "Close editor" : "New banner / ad / festival"}</Text>
      </Pressable>

      {formOpen && (
        <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 8, gap: 8 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.4, color: colors.ink3 }}>TYPE</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {HOME_KINDS.map(([k, label, e]) => (
              <Pressable key={k} onPress={() => { setKind(k); blip(600); }} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: kind === k ? "#7C5CFF" : colors.chip }}>
                <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: kind === k ? "#fff" : colors.ink2 }}>{e} {label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput value={title} onChangeText={setTitle} placeholder={kind === "strip" ? "Strip text e.g. 50% OFF up to ₹100" : "Title e.g. 50% OFF Biryani"} placeholderTextColor={colors.ink3} style={inputStyle} />
          {kind !== "strip" && (
            <>
              <TextInput value={tag} onChangeText={setTag} placeholder="Tag e.g. MEGHANA FEST" placeholderTextColor={colors.ink3} style={inputStyle} />
              <TextInput value={sub} onChangeText={setSub} placeholder="Sub e.g. Code BAZAR50 • Free delivery" placeholderTextColor={colors.ink3} style={inputStyle} />
              <TextInput value={cta} onChangeText={setCta} placeholder="Button e.g. Order now" placeholderTextColor={colors.ink3} style={inputStyle} />
              <TextInput value={image} onChangeText={setImage} placeholder="Image URL (ya neeche store se chuno)" placeholderTextColor={colors.ink3} autoCapitalize="none" style={inputStyle} />
              {storeImgs.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {storeImgs.slice(0, 12).map((s) => (
                    <Pressable key={S(s.id)} onPress={() => { setImage(S(s.image)); blip(600); }} style={{ height: 52, width: 76, borderRadius: 10, overflow: "hidden", borderWidth: image === S(s.image) ? 2 : 0, borderColor: "#7C5CFF" }}>
                      <Img src={S(s.image)} style={{ width: "100%", height: "100%" }} />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.4, color: colors.ink3 }}>TAP PE KAHAN JAYE</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {HOME_LINKS.map((l) => (
                  <Pressable key={l} onPress={() => { setLinkKind(l); setLinkValue(""); blip(600); }} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: linkKind === l ? "#0C831F" : colors.chip }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: linkKind === l ? "#fff" : colors.ink2 }}>{l}</Text>
                  </Pressable>
                ))}
              </View>
              {linkKind === "store" && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {data.stores.slice(0, 15).map((s) => (
                    <Pressable key={S(s.id)} onPress={() => setLinkValue(S(s.slug || s.id))} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: linkValue === S(s.slug || s.id) ? "#0C831F" : colors.chip }}>
                      <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 11, color: linkValue === S(s.slug || s.id) ? "#fff" : colors.ink2 }}>{S(s.name).slice(0, 18)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              {linkKind === "category" && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {catKeys.slice(0, 15).map((k) => (
                    <Pressable key={k} onPress={() => setLinkValue(k)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: linkValue === k ? "#0C831F" : colors.chip }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 11, color: linkValue === k ? "#fff" : colors.ink2 }}>{k}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              {linkKind === "search" && (
                <TextInput value={linkValue} onChangeText={setLinkValue} placeholder="Search text e.g. biryani" placeholderTextColor={colors.ink3} style={inputStyle} />
              )}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput value={startsAt} onChangeText={setStartsAt} placeholder="Start: 2026-12-01" placeholderTextColor={colors.ink3} style={{ ...inputStyle, flex: 1 }} />
                <TextInput value={endsAt} onChangeText={setEndsAt} placeholder="End: 2026-12-31" placeholderTextColor={colors.ink3} style={{ ...inputStyle, flex: 1 }} />
              </View>
              <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>Festival dates (Diwali/Christmas) yaha do — time pe auto on/off. Khali = hamesha live.</Text>
            </>
          )}
          <Pressable onPress={save} style={{ borderRadius: 12, backgroundColor: "#0C831F", paddingVertical: 13, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>{editingId ? "Save changes" : "Publish live"}</Text>
          </Pressable>
          <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3, textAlign: "center" }}>Save hote hi customer home pe dikhega (home khulne pe auto-refresh).</Text>
        </Animated.View>
      )}
    </View>
  );
}
