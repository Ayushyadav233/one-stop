/**
 * App Shell — RN port of web src/components/shell.tsx (specs in docs/design.md §6).
 * Deltas (rest-state pixels identical):
 * - Sheet enter via SlideInDown spring (240/30 etc.); exit animation skipped (conditional mount).
 * - Onboarding slide change uses entering SlideInRight only.
 * - BottomNav active pill fades in place (no shared-layout slide yet).
 * - LiveMap (leaflet) → react-native-maps inline in TrackingSheet.
 * - LiveDot pulse via withRepeat (1.6s yoyo ≈ liveDot).
 * - AuthGate is a Phase-6 placeholder for Login/ProfileSetup/LocationSetup.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, Polyline } from "react-native-maps";
import {
  ArrowRight,
  Banknote,
  Battery,
  Bike,
  BookText,
  Camera,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  Heart,
  Home,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  Package,
  Phone,
  Plus,
  Receipt,
  Settings2,
  ShieldCheck,
  Signal,
  Smartphone,
  Store,
  User,
  Wifi,
  X,
  PartyPopper,
  type LucideIcon,
} from "lucide-react-native";
import { COUPONS, STORES, inr } from "@/lib/data";
import { blip, useOSB, type LiveOrder } from "@/lib/osb-store";
import {
  CUSTOMER,
  getCustomerLocation,
  getStoreLocation,
  openGoogleMapsNav,
  quoteCart,
  statusLabel,
  statusStep,
  timeAgo,
} from "@/lib/commerce";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { F, Img, LiveDot } from "./ui";
import { CustomerHome, OrdersTab, ProfileTab, SavedTab, SearchTab, StoreSheet } from "./customer";
import { CategoriesTab } from "./categories";
import { ProviderDash, ProviderMore, ProviderOrders } from "./provider";
import { SellerCatalog, SellerMarketing, SellerOnboarding } from "./seller";
import { BusinessHub } from "./business";
import { RiderPanel } from "./rider";
import { AdminPanel } from "./admin";
import { LoginScreen } from "./login";
import { ProfileSetupScreen } from "./profile-setup";
import { LocationSetupScreen } from "./location-setup";
import * as SecureStore from "expo-secure-store";
import { apiGetOrders, apiPostOrder, apiSeed, setApiToken } from "@/lib/api";
import { registerForPush } from "@/lib/push";
import { fromApiOrder } from "@/lib/commerce";

/* ── Android status bar (web page.tsx:90-94; notch skipped — real device notch) ── */
export function AndroidStatusBar() {
  const { colors } = useTheme();
  const dark = useOSB((s) => s.dark);
  const [time, setTime] = useState("10:28");
  useEffect(() => {
    const f = () => {
      const d = new Date();
      let h = d.getHours() % 12;
      if (h === 0) h = 12;
      setTime(`${h}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    f();
    const t = setInterval(f, 20000);
    return () => clearInterval(t);
  }, []);
  return (
    <View>
      <StatusBar style={dark ? "light" : "dark"} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 4,
        }}
      >
        <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{time}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, opacity: 0.8 }}>
          <Signal size={14} color={colors.ink} />
          <Wifi size={14} color={colors.ink} />
          <Battery size={16} color={colors.ink} />
        </View>
      </View>
    </View>
  );
}

/* ── Splash (2000ms, bg #E23744 → #7A0E1E) ── */
export function Splash({ done }: { done: () => void }) {
  useEffect(() => {
    const t = setTimeout(done, tokens.animation.splashMs);
    return () => clearTimeout(t);
  }, [done]);
  const scale = useSharedValue(0.6);
  const rotate = useSharedValue(-10);
  const op = useSharedValue(0);
  const bar = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { stiffness: 200, damping: 16 });
    rotate.value = withSpring(0, { stiffness: 200, damping: 16 });
    op.value = withTiming(1, { duration: 300 });
    bar.value = withDelay(300, withTiming(1, { duration: 1400 }));
  }, []);
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
    opacity: op.value,
  }));
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: bar.value }] }));
  return (
    <Animated.View
      exiting={FadeOut.duration(200)}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 80, backgroundColor: "#E23744" }}
    >
      <Img src={STORES[0].image} style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.2 }} eager />
      <LinearGradient
        colors={["rgba(226,55,68,.7)", "rgba(226,55,68,.85)", "#7A0E1E"]}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <Animated.View
          style={[
            logoStyle,
            {
              height: 88,
              width: 88,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 26,
              backgroundColor: "#fff",
            },
          ]}
        >
          <Text style={{ fontSize: 44 }}>🛍️</Text>
        </Animated.View>
        <Text style={{ marginTop: 16, fontFamily: F.extra, fontSize: 30, letterSpacing: -0.7, color: "#fff" }}>
          One Stop Bazar
        </Text>
        <Text style={{ marginTop: 4, fontFamily: F.semi, fontSize: 13, color: "rgba(255,255,255,.8)" }}>
          Everything Around You • By Local Businesses
        </Text>
        <View style={{ marginTop: 24, height: 6, width: 176, borderRadius: 999, backgroundColor: "rgba(255,255,255,.2)", overflow: "hidden" }}>
          <Animated.View style={[barStyle, { height: "100%", width: "100%", borderRadius: 999, backgroundColor: "#fff" }]} />
        </View>
      </View>
    </Animated.View>
  );
}

/* ── Onboarding (4 slides, web shell.tsx:32-101) ── */
const SLIDES = [
  {
    collage: [0, 4, 18, 8],
    emojis: ["🍛", "🥬", "👕", "🛠️"],
    chips: ["20+ categories", "1,000+ local shops"],
    t: "One app for everything nearby",
    s: "Food, groceries, fashion, electronics, medicines, gifts & home services — from the businesses around you.",
  },
  {
    collage: [4, 11, 12, 16],
    emojis: ["🥬", "💊", "🍬", "🐾"],
    chips: ["Fresh stock", "Trusted kiranas"],
    t: "Shop from stores you already trust",
    s: "Every product comes from a real neighbourhood shop — pricing, stock and offers set by the shopkeeper.",
  },
  {
    collage: [8, 9, 10, 15],
    emojis: ["🔧", "💅", "🧹", "🎧"],
    chips: ["Verified pros", "Upfront pricing"],
    t: "Products, services & specialists",
    s: "Book a repair, a facial or buy gadgets and furniture — local pros with ratings, transparent prices and real reviews.",
  },
  {
    collage: [0, 18, 2, 7],
    emojis: ["🏪", "🛵", "💳", "🤝"],
    chips: ["No commission", "One account"],
    t: "Shops deliver, not a middleman",
    s: "Local businesses set their own range and deliver themselves. One account lets you shop — and run your own store too.",
  },
];

export function Onboarding() {
  const set = useOSB((s) => s.set);
  const { colors } = useTheme();
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 70, backgroundColor: colors.app }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 28 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#E23744" }}>
            <Text style={{ fontSize: 16 }}>🛍️</Text>
          </View>
          <Text style={{ fontFamily: F.extra, fontSize: 12, letterSpacing: 2.2, color: colors.ink2 }}>ONE STOP BAZAR</Text>
        </View>
        <Pressable
          onPress={() => set({ onboarded: true })}
          style={{ backgroundColor: colors.chip, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6 }}
        >
          <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20 }}>
        <Animated.View key={i} entering={SlideInRight.springify().stiffness(200).damping(26)}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[0, 1].map((col) => (
              <View key={col} style={{ flex: 1, gap: 10 }}>
                {[0, 1].map((row) => {
                  const ci = col * 2 + row;
                  const store = STORES[s.collage[ci] % STORES.length];
                  return (
                    <Animated.View
                      key={ci}
                      entering={FadeIn.delay(ci * 70).springify().stiffness(180).damping(18)}
                      style={{
                        height: 172,
                        borderRadius: 24,
                        borderTopRightRadius: ci % 2 === 0 ? 8 : 24,
                        borderTopLeftRadius: ci % 2 === 0 ? 24 : 8,
                        overflow: "hidden",
                        backgroundColor: colors.chip,
                      }}
                    >
                      <Img src={store.image} style={{ position: "absolute", width: "100%", height: "100%" }} eager={ci < 2} />
                      <LinearGradient colors={["transparent", "rgba(0,0,0,.35)"]} style={{ position: "absolute", width: "100%", height: "100%" }} />
                      <View
                        style={{
                          position: "absolute",
                          left: 10,
                          bottom: 10,
                          height: 36,
                          width: 36,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 12,
                          backgroundColor: "rgba(255,255,255,.92)",
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>{s.emojis[ci]}</Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {s.chips.map((c) => (
              <View key={c} style={{ backgroundColor: "rgba(226,55,68,.1)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#E23744" }}>✓ {c}</Text>
              </View>
            ))}
          </View>
          <Text style={{ marginTop: 12, fontFamily: F.extra, fontSize: 26, lineHeight: 30, letterSpacing: -0.6, color: colors.ink }}>
            {s.t}
          </Text>
          <Text style={{ marginTop: 8, maxWidth: 320, fontFamily: F.medium, fontSize: 13.5, lineHeight: 20, color: colors.ink2 }}>
            {s.s}
          </Text>
        </Animated.View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 36 }}>
        <View style={{ marginBottom: 16, flexDirection: "row", justifyContent: "center", gap: 6 }}>
          {SLIDES.map((_, d) => (
            <View
              key={d}
              style={{
                height: 6,
                width: d === i ? 32 : 12,
                borderRadius: 999,
                backgroundColor: d === i ? "#E23744" : colors.line,
              }}
            />
          ))}
        </View>
        <Pressable
          onPress={() => {
            blip(700);
            if (i < SLIDES.length - 1) setI(i + 1);
            else set({ onboarded: true });
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 16,
            backgroundColor: "#E23744",
            paddingVertical: 16,
          }}
        >
          <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>
            {i < SLIDES.length - 1 ? "Continue" : "Enter the Bazar 🛍️"}
          </Text>
          {i < SLIDES.length - 1 && <ArrowRight size={18} color="#fff" />}
        </Pressable>
      </View>
    </View>
  );
}

/* ── AuthGate (Phase-6 placeholder: Login / ProfileSetup / LocationSetup) ── */
export function AuthGate({ kind }: { kind: "login" | "profile" | "location" }) {
  const set = useOSB((s) => s.set);
  const { colors } = useTheme();
  const copy = {
    login: { t: "Welcome to the Bazar 🛍️", s: "Login screen lands in Phase 6 — continue as demo user for now.", b: "Continue • +91 98450 12345" },
    profile: { t: "Quick profile", s: "Profile setup lands in Phase 6 — one tap to continue.", b: "Save profile" },
    location: { t: "Where to deliver?", s: "GPS setup lands in Phase 6 — using HSR Layout for now.", b: "Use HSR Layout" },
  }[kind];
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 65, backgroundColor: colors.app, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
      <View style={{ height: 88, width: 88, alignItems: "center", justifyContent: "center", borderRadius: 26, backgroundColor: "#E23744" }}>
        <Text style={{ fontSize: 44 }}>🛍️</Text>
      </View>
      <Text style={{ marginTop: 16, fontFamily: F.extra, fontSize: 24, letterSpacing: -0.5, color: colors.ink, textAlign: "center" }}>{copy.t}</Text>
      <Text style={{ marginTop: 8, fontFamily: F.medium, fontSize: 13.5, lineHeight: 20, color: colors.ink2, textAlign: "center" }}>{copy.s}</Text>
      <Pressable
        onPress={() => {
          blip(760);
          if (kind === "login") set({ loggedIn: true, phone: "+91 98450 12345", userName: "Aarav" });
          else if (kind === "profile") set({ profileComplete: true });
          else set({ locationSet: true, addressArea: "HSR Layout", address: "27th Main, HSR Layout, Bengaluru", userLat: 12.9169, userLng: 77.6386 });
        }}
        style={{ marginTop: 24, width: "100%", borderRadius: 16, backgroundColor: "#E23744", paddingVertical: 16, alignItems: "center" }}
      >
        <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>{copy.b}</Text>
      </Pressable>
    </View>
  );
}

/* ── BottomNav (4 variants, active pill spring 420/32) ── */
const NAV: Record<string, [string, string, LucideIcon][] | undefined> = {
  customer: [
    ["home", "Home", Home],
    ["cats", "Categories", LayoutGrid],
    ["orders", "Orders", Receipt],
    ["saved", "Saved", Heart],
    ["profile", "You", User],
  ],
  provider: [
    ["dash", "Home", LayoutDashboard],
    ["porders", "Orders", Receipt],
    ["catalog", "Catalog", Store],
    ["khata", "Khata", BookText],
    ["more", "Manage", Settings2],
  ],
  admin: [
    ["overview", "Overview", LayoutDashboard],
    ["profile", "You", User],
  ],
  rider: [["rides", "Deliveries", Bike]],
};

export function BottomNav() {
  const tab = useOSB((s) => s.tab);
  const set = useOSB((s) => s.set);
  const mode = useOSB((s) => s.mode);
  const cart = useOSB((s) => s.cart);
  const { colors } = useTheme();
  const count = cart.reduce((a, c) => a + c.qty, 0);
  const total = cart.reduce((a, c) => a + c.qty * c.price, 0);
  const items = NAV[mode] ?? NAV.customer!;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 40, paddingHorizontal: 12, paddingBottom: 16 }}>
      {mode === "customer" && count > 0 && (
        <Animated.View entering={SlideInDown.springify().stiffness(240).damping(26)}>
          <Pressable
            onPress={() => set({ showCart: true })}
            style={{
              marginBottom: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderRadius: 16,
              backgroundColor: "#0C831F",
              padding: 10,
              paddingLeft: 12,
            }}
          >
            <View style={{ flexDirection: "row" }}>
              {cart.slice(0, 3).map((c, ix) => (
                <View
                  key={c.productId}
                  style={{
                    height: 36,
                    width: 36,
                    borderRadius: 18,
                    borderWidth: 2,
                    borderColor: "#fff",
                    backgroundColor: "#fff",
                    overflow: "hidden",
                    marginLeft: ix === 0 ? 0 : -8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {c.image ? <Img src={c.image} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 16 }}>{c.emoji}</Text>}
                </View>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>
                {count} items • ₹{total}
              </Text>
              <Text style={{ fontFamily: F.semi, fontSize: 11, color: "rgba(255,255,255,.75)" }}>Extra ₹100 OFF • View bill</Text>
            </View>
            <View style={{ borderRadius: 12, backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#0C831F" }}>View cart →</Text>
            </View>
          </Pressable>
        </Animated.View>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 6,
          paddingVertical: 6,
          borderRadius: tokens.layout.bottomNav.radius,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.line,
        }}
      >
        {items.map(([k, label, Icon]) => {
          const active = tab === k;
          return (
            <Pressable
              key={k}
              onPress={() => {
                set({ tab: k });
                blip(active ? 500 : 680);
              }}
              style={{ position: "relative", flex: 1, alignItems: "center", gap: 2, borderRadius: 16, paddingVertical: 8 }}
            >
              {active && (
                <Animated.View
                  entering={FadeIn.duration(150)}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16, backgroundColor: colors.brand }}
                />
              )}
              <Icon size={tokens.layout.bottomNav.icon} strokeWidth={active ? 2.6 : 2} color={active ? "#fff" : colors.ink3} />
              <Text style={{ fontFamily: F.extra, fontSize: 10, color: active ? "#fff" : colors.ink3 }}>{label}</Text>
              {k === "orders" && count > 0 && (
                <View style={{ position: "absolute", right: 16, top: 4, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#E23744", paddingHorizontal: 4 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 9, color: "#fff" }}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ── Sheet primitive (overlay + bottom sheet, spring 240/30) ── */
function Sheet({
  onClose,
  children,
  zIndex = 50,
  top,
  maxH = "88%",
  radius = 26,
}: {
  onClose: () => void;
  children: ReactNode;
  zIndex?: number;
  top?: number;
  maxH?: DimensionValue;
  radius?: number;
}) {
  const { colors } = useTheme();
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex }}>
      <Animated.View entering={FadeIn} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.45)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          top,
          maxHeight: maxH,
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
          backgroundColor: colors.app,
          overflow: "hidden",
        }}
      >
        <Animated.View
          entering={SlideInDown.springify().stiffness(tokens.ui.sheetSpring.stiffness).damping(tokens.ui.sheetSpring.damping)}
          style={{ flex: 1 }}
        >
          {children}
        </Animated.View>
      </View>
    </View>
  );
}

function Handle() {
  return <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 999, backgroundColor: "rgba(0,0,0,.15)" }} />;
}

function Row({ l, v, green }: { l: string; v: string; green?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
      <Text style={{ fontFamily: F.semi, fontSize: 13, color: colors.ink2 }}>{l}</Text>
      <Text style={{ fontFamily: F.extra, fontSize: 13, color: green ? "#0C831F" : colors.ink }}>{v}</Text>
    </View>
  );
}

/* ── CouponStrip (web customer.tsx:669) ── */
export function CouponStrip() {
  const coupon = useOSB((s) => s.coupon);
  const set = useOSB((s) => s.set);
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
      {COUPONS.map((c) => {
        const on = coupon === c.code;
        return (
          <Pressable
            key={c.code}
            onPress={() => {
              set({ coupon: c.code });
              blip(760);
            }}
            style={{
              width: 210,
              borderRadius: 14,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: on ? "#0C831F" : colors.line,
              backgroundColor: on ? "rgba(12,131,31,.06)" : colors.card,
              padding: 12,
            }}
          >
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{c.code}</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: colors.ink }}>{c.title}</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{c.detail}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ── CartSheet (web shell.tsx:146-214) ── */
export function CartSheet() {
  const showCart = useOSB((s) => s.showCart);
  const set = useOSB((s) => s.set);
  const cart = useOSB((s) => s.cart);
  const decCart = useOSB((s) => s.decCart);
  const addToCart = useOSB((s) => s.addToCart);
  const coupon = useOSB((s) => s.coupon);
  const seller = useOSB((s) => s.seller);
  const sellerCoupons = useOSB((s) => s.sellerCoupons);
  const storewideOff = useOSB((s) => s.storewideOff);
  const { colors } = useTheme();
  if (!showCart) return null;
  const q = quoteCart(cart, seller, storewideOff, coupon, sellerCoupons);
  return (
    <Sheet onClose={() => set({ showCart: false })} zIndex={50} maxH="88%">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 }}>
        <Handle />
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 19, letterSpacing: -0.4, color: colors.ink }}>
            Your cart 🧺 <Text style={{ fontFamily: F.bold, fontSize: 12, color: colors.ink3 }}> {q.groups.length} store{q.groups.length === 1 ? "" : "s"}</Text>
          </Text>
          <Pressable
            onPress={() => set({ showCart: false })}
            style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.chip }}
          >
            <X size={17} color={colors.ink} />
          </Pressable>
        </View>
        {cart.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <View style={{ height: 140, width: 200, borderRadius: 20, overflow: "hidden", opacity: 0.7 }}>
              <Img src={STORES[4].image} style={{ width: "100%", height: "100%" }} />
            </View>
            <Text style={{ marginTop: 12, fontFamily: F.extra, fontSize: 17, color: colors.ink }}>Cart’s empty</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: colors.ink2 }}>Add biryani, milk, veggies…</Text>
          </View>
        ) : (
          <>
            <View style={{ marginTop: 12, gap: 12 }}>
              {q.groups.map((g) => (
                <View key={g.storeId} style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                    <View>
                      <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{g.storeName}</Text>
                      <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: colors.ink3 }}>
                        Self-delivery • {g.quote.etaMins} mins • min ₹{g.quote.minOrder}
                      </Text>
                    </View>
                    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: g.quote.freeDelivery ? "rgba(12,131,31,.12)" : colors.chip }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 10, color: g.quote.freeDelivery ? "#0C831F" : colors.ink2 }}>
                        {g.quote.freeDelivery ? "FREE delivery" : `₹${g.quote.fee} delivery`}
                      </Text>
                    </View>
                  </View>
                  <View style={{ gap: 8, padding: 10 }}>
                    {g.items.map((l) => (
                      <View key={l.productId} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ height: 54, width: 54, borderRadius: 12, backgroundColor: "#f2f2f2", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                          {l.image ? <Img src={l.image} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 24 }}>{l.emoji}</Text>}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{l.name}</Text>
                          <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{l.unit} • ₹{l.price}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1.5, borderColor: "#0C831F", backgroundColor: colors.surface, paddingHorizontal: 4, paddingVertical: 4 }}>
                          <Pressable onPress={() => decCart(l.productId)} hitSlop={6} style={{ height: 24, width: 24, alignItems: "center", justifyContent: "center" }}>
                            <Minus size={13} strokeWidth={3} color="#0C831F" />
                          </Pressable>
                          <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#0C831F", minWidth: 14, textAlign: "center" }}>{l.qty}</Text>
                          <Pressable onPress={() => addToCart({ ...l, qty: 1 } as never)} hitSlop={6} style={{ height: 24, width: 24, alignItems: "center", justifyContent: "center" }}>
                            <Plus size={13} strokeWidth={3} color="#0C831F" />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                  {g.quote.belowMin && (
                    <View style={{ backgroundColor: "rgba(226,55,68,.08)", paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 11, color: "#E23744" }}>
                        Add ₹{g.quote.minOrder - (g.quote.subtotal - g.quote.discount)} more for this store’s minimum.
                      </Text>
                    </View>
                  )}
                  {!g.quote.freeDelivery && g.quote.freeAbove > 0 && (
                    <View style={{ backgroundColor: "rgba(12,131,31,.08)", paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 11, color: "#0C5B21" }}>
                        Free delivery from this store above ₹{g.quote.freeAbove} (shopkeeper rule).
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
            <Text style={{ marginTop: 16, fontFamily: F.extra, fontSize: 11, letterSpacing: 1.5, color: colors.ink3 }}>BEST COUPON FOR YOU</Text>
            <View style={{ marginTop: 8 }}>
              <CouponStrip />
            </View>
            <View style={{ marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 16 }}>
              <Row l="Subtotal" v={inr(q.subtotal)} />
              <Row l={`Discount (${coupon ?? "—"})`} v={"−" + inr(q.discount)} green />
              <Row l="Delivery (by each store)" v={q.fee === 0 ? "FREE" : inr(q.fee)} green={q.fee === 0} />
              <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line, borderStyle: "dashed", paddingTop: 8 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink }}>To pay</Text>
                <Text style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{inr(q.total)}</Text>
              </View>
              <Text style={{ marginTop: 4, fontFamily: F.bold, fontSize: 11, color: "#0C831F" }}>
                You save {inr(q.discount + (q.fee === 0 ? q.groups.reduce((a, g) => a + g.quote.deliveryFee, 0) : 0))} on this order 🎉
              </Text>
            </View>
            {q.blocked ? (
              <View style={{ marginTop: 8, borderRadius: 12, backgroundColor: "rgba(226,55,68,.1)", padding: 12 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: "#E23744" }}>{q.reason}</Text>
              </View>
            ) : null}
            <Pressable
              disabled={q.blocked}
              onPress={() => {
                if (q.blocked) return;
                set({ showCart: false, checkoutOpen: true });
                blip(820);
              }}
              style={{
                marginTop: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: 16,
                backgroundColor: "#E23744",
                padding: 8,
                paddingLeft: 16,
                opacity: q.blocked ? 0.5 : 1,
              }}
            >
              <View>
                <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>{inr(q.total)}</Text>
                <Text style={{ fontFamily: F.semi, fontSize: 11, color: "rgba(255,255,255,.8)" }}>
                  {q.groups.length > 1 ? `${q.groups.length} store orders` : "TOTAL"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 12 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: "#E23744" }}>Checkout</Text>
                <ArrowRight size={16} color="#E23744" />
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

/* ── CheckoutSheet (web shell.tsx:220-335) ── */
const PAY_METHODS = [
  ["UPI", Smartphone, "GPay • PhonePe"],
  ["Card", CreditCard, "•••• 4421"],
  ["COD", Banknote, "Cash"],
] as const;

export function CheckoutSheet() {
  const checkoutOpen = useOSB((s) => s.checkoutOpen);
  const set = useOSB((s) => s.set);
  const cart = useOSB((s) => s.cart);
  const address = useOSB((s) => s.address);
  const addressArea = useOSB((s) => s.addressArea);
  const coupon = useOSB((s) => s.coupon);
  const placeLiveOrder = useOSB((s) => s.placeLiveOrder);
  const seller = useOSB((s) => s.seller);
  const sellerCoupons = useOSB((s) => s.sellerCoupons);
  const storewideOff = useOSB((s) => s.storewideOff);
  const userName = useOSB((s) => s.userName);
  const phone = useOSB((s) => s.phone);
  const { colors } = useTheme();
  const [pay, setPay] = useState("UPI");
  const [placing, setPlacing] = useState(false);
  if (!checkoutOpen) return null;
  const q = quoteCart(cart, seller, storewideOff, coupon, sellerCoupons);
  const grand = q.total;
  const eta = Math.max(...q.groups.map((g) => g.quote.etaMins), 20);
  const doPlace = async () => {
    if (q.blocked || cart.length === 0) return;
    setPlacing(true);
    blip(880, 0.12);
    let last: LiveOrder | null = null;
    for (const g of q.groups) {
      const localId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "ord-" + Date.now() + Math.random().toString(36).slice(2, 6);
      const code = "#OSB-" + Math.floor(1000 + Math.random() * 9000);
      const live: LiveOrder = {
        id: localId,
        code,
        storeId: g.storeId,
        storeName: g.storeName,
        customer: userName || CUSTOMER.name,
        phone: phone || CUSTOMER.phone,
        address,
        items: g.items,
        subtotal: g.quote.subtotal,
        fee: g.quote.fee,
        discount: g.quote.discount,
        total: g.quote.total,
        payment: pay,
        status: "new",
        etaMins: g.quote.etaMins,
        otp: String(Math.floor(1000 + Math.random() * 9000)),
        createdAt: Date.now(),
        distanceKm: g.storeId === (seller.storeId || "mine") ? Math.min(seller.radiusKm, 2.1) : 1.4,
      };
      try {
        const j = await apiPostOrder({
            code: live.code,
            storeId: live.storeId,
            storeName: live.storeName,
            customerName: live.customer,
            customerPhone: live.phone,
            address: live.address,
            items: live.items,
            subtotal: live.subtotal,
            deliveryFee: live.fee,
            discount: live.discount,
            total: live.total,
            payment: live.payment,
            status: "new",
            etaMins: live.etaMins,
            distanceKm: live.distanceKm,
            otp: live.otp,
        });
        if (j?.id) live.id = j.id;
        if (j?.code) live.code = j.code;
      } catch {
        /* local fallback */
      }
      placeLiveOrder(live);
      last = live;
    }
    if (last) useOSB.setState({ orderSuccess: last, checkoutOpen: false, showCart: false, cart: [] });
    setPlacing(false);
    blip(990, 0.18);
  };
  return (
    <Sheet onClose={() => !placing && set({ checkoutOpen: false })} zIndex={55} maxH="90%">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 }}>
        <Handle />
        <Text style={{ marginTop: 12, fontFamily: F.extra, fontSize: 19, letterSpacing: -0.4, color: colors.ink }}>Checkout</Text>
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 14 }}>
          <View style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#FFE9E9" }}>
            <MapPin size={18} color="#E23744" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Deliver to {addressArea || "Home"} • ~{eta} mins</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 12, color: colors.ink2 }}>{address || "Address set from GPS"}</Text>
          </View>
          <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#E23744" }}>Change</Text>
        </View>
        <View style={{ marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 14 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Pay with</Text>
          <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
            {PAY_METHODS.map(([m, Icon, s]) => {
              const on = pay === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    setPay(m);
                    blip(640);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: on ? "#0C831F" : colors.line,
                    backgroundColor: on ? "rgba(12,131,31,.06)" : colors.surface,
                    padding: 12,
                    alignItems: "center",
                  }}
                >
                  <Icon size={20} color={colors.ink} />
                  <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{m}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 10, color: colors.ink3 }}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, backgroundColor: "rgba(12,131,31,.08)", padding: 10 }}>
            <ShieldCheck size={15} color="#0C831F" />
            <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 11.5, color: "#0C5B21" }}>100% safe • Stores never see card details</Text>
          </View>
        </View>
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, backgroundColor: "#111117", padding: 14 }}>
          <View style={{ flexDirection: "row" }}>
            {cart.slice(0, 3).map((x, ix) => (
              <View key={x.productId} style={{ height: 40, width: 40, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,.3)", backgroundColor: "rgba(255,255,255,.1)", overflow: "hidden", marginLeft: ix === 0 ? 0 : -8, alignItems: "center", justifyContent: "center" }}>
                {x.image ? <Img src={x.image} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 16 }}>{x.emoji}</Text>}
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 11, color: "rgba(255,255,255,.6)" }}>
              {cart.reduce((a, c) => a + c.qty, 0)} items • {q.groups.length} store{q.groups.length === 1 ? "" : "s"} • −{inr(q.discount)}
            </Text>
            <Text style={{ fontFamily: F.extra, fontSize: 20, color: "#fff" }}>{inr(grand)}</Text>
          </View>
        </View>
        <View style={{ marginTop: 10, gap: 6, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
          {q.groups.map((g) => (
            <View key={g.storeId} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink2 }}>
                {g.storeName} • {g.quote.freeDelivery ? "FREE delivery" : `₹${g.quote.fee} delivery`}
              </Text>
              <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: colors.ink }}>{inr(g.quote.total)}</Text>
            </View>
          ))}
          <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: colors.ink3 }}>
            Each store delivers with its own staff. Free delivery is set by the shopkeeper.
          </Text>
        </View>
        {q.blocked ? (
          <View style={{ marginTop: 8, borderRadius: 12, backgroundColor: "rgba(226,55,68,.1)", padding: 12 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: "#E23744" }}>{q.reason}</Text>
          </View>
        ) : null}
        <Pressable
          disabled={placing || q.blocked}
          onPress={doPlace}
          style={{
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 16,
            backgroundColor: "#0C831F",
            paddingVertical: 16,
            opacity: placing || q.blocked ? 0.6 : 1,
          }}
        >
          {placing ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>Sending to store…</Text>
            </>
          ) : (
            <>
              <Bike size={19} color="#fff" />
              <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>Place order • {inr(grand)}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

/* ── Confetti (2.6s fall, 540° spin) ── */
const CONFETTI = ["🎉", "✦", "🪔", "💛", "💚"];
function ConfettiPiece({ left, delay, glyph }: { left: string | number; delay: number; glyph: string }) {
  const y = useSharedValue(-20);
  const r = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    const ease = Easing.bezier(0.2, 0.7, 0.3, 1);
    y.value = withDelay(delay, withTiming(420, { duration: tokens.animation.confettiFallMs, easing: ease }));
    r.value = withDelay(delay, withTiming(540, { duration: tokens.animation.confettiFallMs }));
    o.value = withDelay(delay, withTiming(0, { duration: tokens.animation.confettiFallMs }));
  }, []);
  const s = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${r.value}deg` }],
    opacity: o.value,
  }));
  return (
    <View style={{ position: "absolute", top: 0, left: left as `${number}%` }}>
      <Animated.Text style={[s, { fontSize: 16 }]}>{glyph}</Animated.Text>
    </View>
  );
}

/* ── SuccessOverlay (web shell.tsx:337-364) ── */
export function SuccessOverlay({ onTrack }: { onTrack: () => void }) {
  const o = useOSB((s) => s.orderSuccess);
  const set = useOSB((s) => s.set);
  useEffect(() => {
    if (o) blip(990, 0.2);
  }, [o]);
  if (!o) return null;
  const cover = (o.items[0] as unknown as { image?: string })?.image ?? STORES[0].image;
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,.7)", padding: 24 }}>
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        {Array.from({ length: 26 }).map((_, i) => (
          <ConfettiPiece key={i} left={`${(i * 37) % 100}%`} delay={(i % 10) * 0.14 * 1000} glyph={CONFETTI[i % 5]} />
        ))}
      </View>
      <Animated.View
        entering={FadeIn.springify().stiffness(180).damping(18)}
        style={{ width: "100%", maxWidth: 330, borderRadius: 26, backgroundColor: "#fff", overflow: "hidden", alignItems: "center" }}
      >
        <View style={{ height: 130, width: "100%" }}>
          <Img src={cover} style={{ width: "100%", height: "100%" }} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,.6)"]} style={{ position: "absolute", width: "100%", height: "100%" }} />
          <View style={{ position: "absolute", bottom: -22, left: "50%", marginLeft: -28, height: 56, width: 56, borderRadius: 28, backgroundColor: "#0C831F", borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 26, color: "#fff" }}>✓</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 24, paddingBottom: 24, paddingTop: 32, width: "100%", alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 21, letterSpacing: -0.4, color: "#111114", textAlign: "center" }}>Order sent to store! 🎉</Text>
          <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12.5, lineHeight: 18, color: "#4E4E59", textAlign: "center" }}>
            {o.storeName} just got your order.{"\n"}They’ll accept it — then you can track live.
          </Text>
          <View style={{ marginTop: 12, width: "100%", borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(0,0,0,.12)", backgroundColor: "#F7F7F8", padding: 12, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.5, color: "#8C8C99" }}>ORDER ID</Text>
            <Text style={{ fontFamily: F.extra, fontSize: 17, color: "#111114" }}>{o.code}</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: "#0C831F" }}>{inr(o.total)} • {o.payment}</Text>
          </View>
          <Pressable
            onPress={() => {
              set({ orderSuccess: null, tab: "orders" });
              onTrack();
            }}
            style={{ marginTop: 12, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, backgroundColor: "#E23744", paddingVertical: 14 }}
          >
            <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Track live</Text>
            <ChevronRight size={16} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => set({ orderSuccess: null })}
            style={{ marginTop: 8, width: "100%", borderRadius: 14, backgroundColor: "rgba(0,0,0,.05)", paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#111114" }}>Continue shopping</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

/* ── Tracking context (web kept id in page state) ── */
const TrackingCtx = createContext<{ trackingId: string | null; track: (id: string | null) => void }>({ trackingId: null, track: () => {} });
export function useTracking() {
  return useContext(TrackingCtx);
}
export function TrackingProvider({ children }: { children: ReactNode }) {
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const value = useMemo(() => ({ trackingId, track: setTrackingId }), [trackingId]);
  return <TrackingCtx.Provider value={value}>{children}</TrackingCtx.Provider>;
}

/* ── TrackingSheet (web shell.tsx:366-599, map → react-native-maps) ── */
export function TrackingSheet() {
  const { trackingId: id, track } = useTracking();
  const onClose = () => track(null);
  const orders = useOSB((s) => s.orders);
  const seller = useOSB((s) => s.seller);
  const address = useOSB((s) => s.address);
  const { colors } = useTheme();
  const o = orders.find((x) => x.id === id) ?? orders[0];
  if (!id || !o) return null;

  const step = statusStep(o.status);
  const cancelled = o.status === "cancelled";
  const delivered = o.status === "delivered";
  const onway = o.status === "onway" || o.status === "ready";
  const rider = o.rider ? seller.riders.find((r) => r.name === o.rider) : undefined;
  const cover = (o.items[0] as { image?: string } | undefined)?.image || STORES.find((s) => s.id === o.storeId)?.image || STORES[0].image;
  const etaLeft = cancelled || delivered ? 0 : Math.max(4, o.etaMins - (onway ? 8 : step >= 1 ? 4 : 0));
  const headline = cancelled
    ? "Order cancelled"
    : delivered
      ? "Delivered. Enjoy your order"
      : o.status === "new"
        ? "Waiting for the store to accept"
        : o.status === "accepted"
          ? "Store accepted — packing soon"
          : o.status === "preparing"
            ? "Kitchen is preparing your order"
            : o.status === "ready"
              ? "Packed. Rider leaving the store"
              : o.rider
                ? `${o.rider.split(" ")[0]} is on the way`
                : "Out for delivery";
  const steps = [
    { t: "Placed", s: `Order sent • ${timeAgo(o.createdAt)}`, Icon: Receipt },
    { t: "Preparing", s: o.status === "accepted" ? "Accepted — starting the kitchen" : o.status === "new" ? "Waiting for the shopkeeper" : "Being packed at the store", Icon: Package },
    { t: "On the way", s: o.rider ? `${o.rider} • store’s own delivery` : "Store assigns their rider — no platform fleet", Icon: Bike },
    { t: "Delivered", s: delivered ? "Handed over at your door" : "We’ll ask you to rate the store", Icon: Check },
  ];
  const progress = cancelled ? 6 : delivered ? 100 : Math.min(92, 12 + (step + 1) * 22);
  const riderT = cancelled ? 0 : delivered ? 1 : step <= 0 ? 0.04 : step === 1 ? 0.18 : 0.62;
  const storeLoc = getStoreLocation(o.storeId);
  const homeLoc = getCustomerLocation(o.address);
  const gps = o.riderLat != null && o.riderLng != null ? { latitude: o.riderLat, longitude: o.riderLng } : undefined;
  const storeC = { latitude: storeLoc.lat, longitude: storeLoc.lng };
  const homeC = { latitude: homeLoc.lat, longitude: homeLoc.lng };
  const riderC = gps ?? { latitude: storeC.latitude + (homeC.latitude - storeC.latitude) * riderT, longitude: storeC.longitude + (homeC.longitude - storeC.longitude) * riderT };
  const routeColor = cancelled ? "#E23744" : "#0C831F";

  return (
    <Sheet onClose={onClose} zIndex={50} top={48} maxH="100%" radius={28}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ position: "relative", height: 258, backgroundColor: "#E8EDF2" }}>
          <MapView
            style={{ width: "100%", height: "100%" }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            initialRegion={{
              latitude: (storeC.latitude + homeC.latitude) / 2,
              longitude: (storeC.longitude + homeC.longitude) / 2,
              latitudeDelta: Math.max(Math.abs(storeC.latitude - homeC.latitude) * 1.8, 0.012),
              longitudeDelta: Math.max(Math.abs(storeC.longitude - homeC.longitude) * 1.8, 0.012),
            }}
          >
            <Polyline coordinates={[storeC, homeC]} strokeColor={routeColor} strokeWidth={4} lineDashPattern={cancelled ? [6, 6] : undefined} />
            <Marker coordinate={storeC} title={o.storeName}>
              <View style={{ height: 30, width: 30, borderRadius: 15, backgroundColor: "#0C831F", borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Store size={13} color="#fff" />
              </View>
            </Marker>
            <Marker coordinate={homeC} title="You">
              <View style={{ height: 30, width: 30, borderRadius: 15, backgroundColor: "#E23744", borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Home size={13} color="#fff" />
              </View>
            </Marker>
            {!cancelled && (
              <Marker coordinate={riderC} title={o.rider ?? "Rider"}>
                <View style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#0C831F" }}>
                  <Text style={{ fontSize: 18 }}>🛵</Text>
                </View>
              </Marker>
            )}
          </MapView>
          <LinearGradient colors={["transparent", "rgba(0,0,0,.25)", "rgba(0,0,0,.75)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120 }} pointerEvents="none" />
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {gps && <LiveDot color="#34D399" />}
                <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.6, color: "rgba(255,255,255,.7)" }}>
                  {gps ? "GPS LIVE BROADCAST" : o.storeName.toUpperCase()}
                </Text>
              </View>
              <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 16, lineHeight: 20, color: "#fff" }}>{headline}</Text>
            </View>
            {!cancelled && !delivered && (
              <View style={{ borderRadius: 16, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9, letterSpacing: 1.2, color: colors.ink3 }}>ETA</Text>
                <Text style={{ fontFamily: F.extra, fontSize: 16, lineHeight: 18, color: "#111114" }}>
                  {etaLeft}<Text style={{ fontFamily: F.bold, fontSize: 10 }}> min</Text>
                </Text>
              </View>
            )}
          </View>
          <Pressable onPress={onClose} style={{ position: "absolute", right: 12, top: 12, height: 36, width: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.95)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 16, color: "#111114" }}>✕</Text>
          </Pressable>
          <View style={{ position: "absolute", left: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: cancelled ? "#E23744" : delivered ? "#0C831F" : "#fff" }}>
              <LiveDot color={cancelled ? "#fff" : delivered ? "#D8F34E" : "#0C831F"} />
              <Text style={{ fontFamily: F.extra, fontSize: 10, color: cancelled || delivered ? "#fff" : "#111114" }}>
                {cancelled ? "CANCELLED" : delivered ? "DELIVERED" : statusLabel(o.status).toUpperCase()}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                openGoogleMapsNav(o.storeName, o.address, homeLoc.lat, homeLoc.lng);
                blip(720);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,.95)", paddingHorizontal: 10, paddingVertical: 4 }}
            >
              <Navigation size={11} color="#1573FF" />
              <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#111114" }}>Maps</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <View style={{ marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.ink3 }}>{o.distanceKm} km • self delivery</Text>
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: colors.ink2 }}>{o.code}</Text>
            </View>
            <View style={{ height: 6, borderRadius: 999, backgroundColor: colors.chip, overflow: "hidden" }}>
              <View style={{ height: "100%", borderRadius: 999, backgroundColor: cancelled ? "#E23744" : "#0C831F", width: `${progress}%` }} />
            </View>
          </View>

          {cancelled && (
            <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: "rgba(226,55,68,.1)", padding: 16 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#E23744" }}>Store declined this order</Text>
              <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12.5, lineHeight: 18, color: colors.ink2 }}>
                {o.note || "The shopkeeper rejected it. No payment was captured."}
              </Text>
            </View>
          )}

          {!cancelled && !delivered && o.otp && (
            <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: "#111117", padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={12} color="#F8CB46" />
                <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 2, color: "#F8CB46" }}>DELIVERY OTP</Text>
              </View>
              <View style={{ marginTop: 6, flexDirection: "row", gap: 8 }}>
                {o.otp.split("").map((d, ix) => (
                  <View key={ix} style={{ height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(255,255,255,.1)" }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 20, color: "#fff" }}>{d}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ marginTop: 8, fontFamily: F.semi, fontSize: 11.5, lineHeight: 17, color: "rgba(255,255,255,.65)" }}>
                Share this only after you receive the parcel. The order is marked delivered <Text style={{ color: "#fff" }}>only</Text> when the rider enters it.
              </Text>
            </View>
          )}

          {o.proofPhoto ? (
            <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingTop: 12 }}>
                <Camera size={15} color="#0C831F" />
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>Delivery proof photo</Text>
              </View>
              <View style={{ marginTop: 8, height: 160 }}>
                <Img src={o.proofPhoto} style={{ width: "100%", height: "100%" }} />
              </View>
            </View>
          ) : null}

          {!cancelled && !delivered && (o.status === "onway" || o.status === "ready") && (
            <Pressable
              onPress={() => {
                useOSB.getState().customerConfirmDelivery(o.id);
                blip(960, 0.16);
              }}
              style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, borderWidth: 2, borderColor: "#0C831F", paddingVertical: 14 }}
            >
              <Check size={17} strokeWidth={3} color="#0C831F" />
              <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: "#0C831F" }}>I’ve received my order</Text>
            </Pressable>
          )}

          <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ height: 48, width: 48, borderRadius: 16, overflow: "hidden" }}>
                <Img src={cover} style={{ width: "100%", height: "100%" }} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>{o.storeName}</Text>
                <Text style={{ marginTop: 2, fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>
                  {o.rider ? `${o.rider} • ${rider?.vehicle ?? "Store rider"}` : "Store delivers with its own staff"}
                </Text>
              </View>
              <Pressable onPress={() => Linking.openURL(`tel:${rider?.phone || seller.phone || ""}`).catch(() => {})} style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "#0C831F" }}>
                <Phone size={16} color="#fff" />
              </Pressable>
              <View style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: colors.chip }}>
                <MessageCircle size={16} color={colors.ink} />
              </View>
            </View>
          </View>

          {!cancelled && (
            <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
              {steps.map((st, ix) => {
                const done = ix < step || (delivered && ix <= 3);
                const now = ix === step && !delivered;
                return (
                  <View key={st.t} style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ alignItems: "center" }}>
                      <View style={{ height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: done || now ? "#0C831F" : colors.chip }}>
                        {done && !now ? <Check size={14} strokeWidth={3} color="#fff" /> : <st.Icon size={14} color={done || now ? "#fff" : colors.ink3} />}
                      </View>
                      {ix < 3 && <View style={{ width: 2, flex: 1, minHeight: 18, borderRadius: 999, backgroundColor: ix < step ? "#0C831F" : colors.line }} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: ix < 3 ? 16 : 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: done || now ? colors.ink : colors.ink3 }}>{st.t}</Text>
                        {now && (
                          <View style={{ borderRadius: 999, backgroundColor: "#F8CB46", paddingHorizontal: 8, paddingVertical: 2 }}>
                            <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: "#111114" }}>LIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ marginTop: 2, fontFamily: F.medium, fontSize: 11.5, lineHeight: 16, color: colors.ink3 }}>{st.s}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <View style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(226,55,68,.1)" }}>
              <MapPin size={18} color="#E23744" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: colors.ink3 }}>DELIVERING TO</Text>
              <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 13, lineHeight: 18, color: colors.ink }}>{o.address || address}</Text>
              <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Clock size={12} color={colors.ink3} />
                <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.ink3 }}>Placed {timeAgo(o.createdAt)}</Text>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>Bill details</Text>
              <View style={{ borderRadius: 999, backgroundColor: colors.chip, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 10, color: colors.ink }}>{o.payment}</Text>
              </View>
            </View>
            <View style={{ marginTop: 10, gap: 8 }}>
              {o.items.map((it, ix) => (
                <View key={ix} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: colors.chip, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                    {(it as { image?: string }).image ? (
                      <Img src={(it as { image?: string }).image!} style={{ width: "100%", height: "100%" }} />
                    ) : (
                      <Text style={{ fontSize: 16 }}>{it.emoji || "🛍️"}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{it.name}</Text>
                    <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>{it.qty} × {inr(it.price)}</Text>
                  </View>
                  <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{inr(it.qty * it.price)}</Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 12, gap: 4, borderTopWidth: 1, borderTopColor: colors.line, borderStyle: "dashed", paddingTop: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: colors.ink2 }}>Item total</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: colors.ink }}>{inr(o.subtotal)}</Text>
              </View>
              {o.discount > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 12, color: "#0C831F" }}>Discount</Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: "#0C831F" }}>−{inr(o.discount)}</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: colors.ink2 }}>Delivery (by store)</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: colors.ink }}>{o.fee === 0 ? "FREE" : inr(o.fee)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 4 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>Paid</Text>
                <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>{inr(o.total)}</Text>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, backgroundColor: "rgba(12,131,31,.08)", padding: 14 }}>
            <PartyPopper size={16} color="#E23744" />
            <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 12, lineHeight: 17, color: "#0C5B21" }}>
              Tip goes 100% to the store’s rider — One Stop Bazar never takes a cut.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Sheet>
  );
}

/* ── AppShell (web page.tsx phone body: status bar + content + nav + sheets + gates) ── */
function ShellBody() {
  const booted = useOSB((s) => s.booted);
  const onboarded = useOSB((s) => s.onboarded);
  const loggedIn = useOSB((s) => s.loggedIn);
  const profileComplete = useOSB((s) => s.profileComplete);
  const locationSet = useOSB((s) => s.locationSet);
  const set = useOSB((s) => s.set);
  const tab = useOSB((s) => s.tab);
  const mode = useOSB((s) => s.mode);
  const storeId = useOSB((s) => s.storeId);
  const sellerOnboarded = useOSB((s) => s.seller.onboarded);
  const hydrateOrders = useOSB((s) => s.hydrateOrders);
  const { colors } = useTheme();
  const { track } = useTracking();
  const authed = loggedIn && profileComplete && locationSet;
  const openStore = (id: string) => set({ storeId: id });

  useEffect(() => {
    apiSeed().catch(() => {});
    // Remote catalog sync (fail-soft: offline ho to static catalog chalta rahe).
    try {
      useOSB.getState().syncRemoteCatalog();
    } catch {
      /* noop */
    }
    // Restore backend auth token (login screen saves it in SecureStore).
    SecureStore.getItemAsync("osb-token")
      .then((t) => {
        if (t) {
          setApiToken(t);
          registerForPush().catch(() => {});
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    const pull = () => {
      apiGetOrders()
        .then((rows) => {
          if (rows.length) hydrateOrders(rows.map((row) => fromApiOrder(row)));
        })
        .catch(() => {});
    };
    pull();
    const t = setInterval(pull, 6000);
    return () => clearInterval(t);
  }, [hydrateOrders]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.app }}>
      <AndroidStatusBar />
      <View style={{ flex: 1 }}>
        {authed && mode === "customer" && tab === "home" && <CustomerHome onStore={openStore} />}
        {authed && mode === "customer" && tab === "cats" && <CategoriesTab onStore={openStore} />}
        {authed && mode === "customer" && tab === "search" && <SearchTab />}
        {authed && mode === "customer" && tab === "orders" && <OrdersTab onTrack={(id) => track(id)} />}
        {authed && mode === "customer" && tab === "saved" && <SavedTab onStore={openStore} />}
        {authed && mode === "customer" && tab === "profile" && <ProfileTab />}
        {authed && mode === "provider" && tab === "dash" && <ProviderDash />}
        {authed && mode === "provider" && tab === "porders" && <ProviderOrders />}
        {authed && mode === "provider" && tab === "catalog" && <SellerCatalog />}
        {authed && mode === "provider" && tab === "marketing" && <SellerMarketing />}
        {authed && mode === "provider" && tab === "khata" && <BusinessHub />}
        {authed && mode === "provider" && tab === "onboard" && !sellerOnboarded && <SellerOnboarding />}
        {authed && mode === "provider" && tab === "onboard" && sellerOnboarded && <ProviderDash />}
        {authed && mode === "provider" && tab === "more" && <ProviderMore />}
        {authed && mode === "provider" && tab === "profile" && <ProfileTab />}
        {authed && mode === "provider" && (tab === "home" || tab === "search" || tab === "orders" || tab === "saved") && <ProviderDash />}
        {authed && mode === "rider" && <RiderPanel />}
        {authed && mode === "admin" && tab === "overview" && <AdminPanel />}
        {authed && mode === "admin" && tab === "profile" && <ProfileTab />}
      </View>
      {authed && <BottomNav />}
      <TrackingSheet />
      {storeId ? <StoreSheet id={storeId} onClose={() => set({ storeId: null })} /> : null}
      <CartSheet />
      <CheckoutSheet />
      <SuccessOverlay onTrack={() => track(useOSB.getState().orders[0]?.id ?? null)} />
      {authed && !onboarded && booted && <Onboarding />}
      {loggedIn && profileComplete && !locationSet && <LocationSetupScreen />}
      {loggedIn && !profileComplete && <ProfileSetupScreen />}
      {booted && !loggedIn && <LoginScreen />}
      {!booted && <Splash done={() => set({ booted: true })} />}
    </View>
  );
}

export function AppShell() {
  return (
    <TrackingProvider>
      <ShellBody />
    </TrackingProvider>
  );
}

/** Tab placeholder helpers (Phase 5/6 replace with real screens). */
export function TabPlaceholder({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ padding: 24, alignItems: "center" }, style]}>
      <Text style={{ fontFamily: F.extra, fontSize: 17, color: colors.ink }}>{label}</Text>
    </View>
  );
}

export function ScreenWrap({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.app }} edges={["left", "right", "bottom"]}>
      {children}
    </SafeAreaView>
  );
}
