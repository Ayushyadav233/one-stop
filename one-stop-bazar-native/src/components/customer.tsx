/**
 * Customer flow — RN port of web src/components/customer.tsx (specs in docs/design.md §7).
 * Deltas (rest-state pixels identical):
 * - Sticky web header → fixed header above ScrollView (same look).
 * - whileInView entrance → entering FadeIn (plays on mount).
 * - Banner carousel: ScrollView snap + 3800ms auto-advance + dots (same).
 * - Category active outline → borderWidth 2.5 (outline has no RN equivalent).
 * - Nested press (heart inside card): timestamp-suppress flag (RN has no stopPropagation).
 * - EditProfileSheet/ChangeLocationSheet → StubSheet (Phase 6 real screens).
 * - StoreSheet tabs render menu content for all tabs (same as web).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import {
  BadgePercent,
  Bike,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Heart,
  Leaf,
  Mic,
  Moon,
  Pencil,
  ScanSearch,
  Search,
  Sparkles,
  Star,
  Sun,
  Ticket,
  Truck,
  Wallet,
} from "lucide-react-native";
import { CATEGORIES, CATS, PRODUCTS, STORES, TRENDING, greetingForHour, inr, type CategoryDef } from "@/lib/data";
import { blip, useMarketplace, useOSB } from "@/lib/osb-store";
import { statusLabel } from "@/lib/commerce";
import { useTheme } from "@/theme/ThemeProvider";
import { AddStepper, F, Glass, Img, LiveDot, Rating, SectionHead, SpringBtn, VegMark } from "./ui";

function useGreeting() {
  const h = new Date().getHours();
  return greetingForHour(h);
}

/* ── Phase-6 stub for EditProfileSheet / ChangeLocationSheet ── */
function StubSheet({ title, sub, onClose }: { title: string; sub: string; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,.45)", padding: 24 }}>
      <View style={{ width: "100%", borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 24, alignItems: "center" }}>
        <Text style={{ fontFamily: F.extra, fontSize: 17, color: colors.ink, textAlign: "center" }}>{title}</Text>
        <Text style={{ marginTop: 6, fontFamily: F.medium, fontSize: 12.5, color: colors.ink2, textAlign: "center" }}>{sub}</Text>
        <Pressable onPress={onClose} style={{ marginTop: 16, width: "100%", borderRadius: 14, backgroundColor: "#E23744", paddingVertical: 13, alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ═══════════ CustomerHome ═══════════ */
export function CustomerHome({ onStore }: { onStore: (id: string) => void }) {
  const set = useOSB((s) => s.set);
  const query = useOSB((s) => s.query);
  const category = useOSB((s) => s.category);
  const userName = useOSB((s) => s.userName);
  const userAvatar = useOSB((s) => s.userAvatar);
  const addressArea = useOSB((s) => s.addressArea);
  const address = useOSB((s) => s.address);
  const dark = useOSB((s) => s.dark);
  const { colors } = useTheme();
  const g = useGreeting();
  const [banner, setBanner] = useState(0);
  const [locOpen, setLocOpen] = useState(false);
  const bannerRef = useRef<ScrollView>(null);

  const W = Dimensions.get("window").width;
  const cardW = Math.round((W - 32) * 0.88);
  const step = cardW + 10;

  useEffect(() => {
    const t = setInterval(() => {
      setBanner((b) => {
        const next = (b + 1) % 3;
        bannerRef.current?.scrollTo({ x: next * step, animated: true });
        return next;
      });
    }, 3800);
    return () => clearInterval(t);
  }, [step]);

  const { stores, products } = useMarketplace();
  const extraCategories = useOSB((s) => s.extraCategories);
  const hiddenCategories = useOSB((s) => s.hiddenCategories);
  const allCats = useMemo<CategoryDef[]>(
    () => [...CATEGORIES, ...extraCategories].filter((c) => !hiddenCategories.includes(c.k)),
    [extraCategories, hiddenCategories]
  );
  const activeCat = allCats.find((c) => c.k === category) ?? null;

  const filtered = useMemo(() => {
    return stores.filter((s) => {
      const okCat = !activeCat ? true : activeCat.kinds.includes(s.kind);
      const q = query.trim().toLowerCase();
      if (!q) return okCat;
      return okCat && (s.name.toLowerCase().includes(q) || s.tags.join(" ").toLowerCase().includes(q) || products.some((p) => p.storeId === s.id && p.name.toLowerCase().includes(q)));
    });
  }, [query, activeCat, stores, products]);

  const catStoreIds = new Set(filtered.map((s) => s.id));
  const quickPicks = activeCat
    ? products.filter((p) => catStoreIds.has(p.storeId)).slice(0, 12)
    : products.filter((p) => ["Vegetables", "Fruits", "Dairy", "Staples", "Bakery", "Sweets", "Ice Cream", "Pharmacy"].includes(p.category)).slice(0, 12);
  const grocery = quickPicks;
  const restList = filtered.slice(0, 10);

  const banners = [
    { img: STORES[0].image, tag: "MEGHANA FEST", title: "50% OFF Biryani", sub: "Code BAZAR50 • Free delivery", cta: "Order now", colors: ["rgba(10,10,10,.78)", "rgba(10,10,10,.15)", "transparent"] as const },
    { img: STORES[4].image, tag: "FRESH AT 6 AM", title: "Veggies in 12 mins", sub: "Farm direct • 20% OFF", cta: "Shop fresh", colors: ["rgba(14,59,46,.85)", "rgba(14,59,46,.15)", "transparent"] as const },
    { img: STORES[9].image, tag: "GLOW AT HOME", title: "Salon @ ₹1499", sub: "O3+ facial • 4.9★ pros", cta: "Book now", colors: ["rgba(60,20,60,.8)", "rgba(60,20,60,.1)", "transparent"] as const },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.app }}>
      {/* fixed header (web: sticky) */}
      <View style={{ backgroundColor: colors.surface, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 }}>
            <View style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "#FFE9E9" }}>
              <Text style={{ fontSize: 17 }}>📍</Text>
            </View>
            <Pressable onPress={() => { setLocOpen(true); blip(560); }} style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 14.5, letterSpacing: -0.3, color: colors.ink, maxWidth: 150 }}>
                  {addressArea || "Set location"}
                </Text>
                <ChevronDown size={15} strokeWidth={2.8} color={colors.ink} />
              </View>
              <Text numberOfLines={1} style={{ marginTop: 2, fontFamily: F.medium, fontSize: 11.5, color: colors.ink3 }}>
                {address || "Tap to add delivery address"}
              </Text>
            </Pressable>
          </View>
          <Pressable onPress={() => set({ tab: "profile" })} style={{ height: 40, width: 40, borderRadius: 20, overflow: "hidden" }}>
            <LinearGradient colors={["#0E3B2E", "#1FB67C"]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 17, color: "#fff" }}>{userAvatar || (userName ? userName[0].toUpperCase() : "👤")}</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => { set({ dark: !dark }); blip(700); }} style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: colors.chip }}>
            {dark ? <Sun size={17} color={colors.ink} /> : <Moon size={17} color={colors.ink} />}
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Pressable
            onPress={() => set({ tab: "search" })}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 12 }}
          >
            <Search size={18} strokeWidth={2.6} color="#E23744" />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.medium, fontSize: 13.5, color: colors.ink3 }}>
              Search “biryani”, “A2 milk”, “plumber”…
            </Text>
            <View style={{ height: 20, width: 1, backgroundColor: colors.line }} />
            <Mic size={17} color={colors.ink2} />
            <ScanSearch size={17} color={colors.ink2} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        {/* greeting */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12 }}>
          <View>
            <Text style={{ fontFamily: F.extra, fontSize: 19, letterSpacing: -0.4, color: colors.ink }}>
              {g.label}, {userName || "there"} 👋
            </Text>
            <Text style={{ fontFamily: F.medium, fontSize: 12, color: colors.ink2 }}>
              {g.sub} • <Text style={{ fontFamily: F.bold, color: "#0C831F" }}>12 min</Text> fastest
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "#0E3B2E", paddingHorizontal: 10, paddingVertical: 6 }}>
            <LiveDot color="#34D399" />
            <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: "#D8F34E" }}>LIVE</Text>
          </View>
        </View>

        {/* category grid */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={{ marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13, letterSpacing: -0.2, color: colors.ink }}>Explore {allCats.length} categories</Text>
            {activeCat && (
              <Pressable onPress={() => { set({ category: "all" }); blip(480); }}>
                <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#E23744" }}>Clear ✕</Text>
              </Pressable>
            )}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12 }}>
            {allCats.slice(0, 9).map((c, i) => {
              const on = category === c.k;
              return (
                <Animated.View key={c.k} entering={FadeIn.delay(Math.min(i * 35, 300))} style={{ width: "20%", alignItems: "center", gap: 6 }}>
                  <SpringBtn
                    onPress={() => { set({ category: on ? "all" : c.k }); blip(600 + i * 25); }}
                    style={{ alignItems: "center", gap: 6 }}
                  >
                    <View style={{ position: "relative", height: 58, width: 58, borderRadius: 18, overflow: "hidden", borderWidth: on ? 2.5 : 0, borderColor: c.accent }}>
                      <Img src={c.img} style={{ width: "100%", height: "100%" }} eager={i < 5} />
                      <LinearGradient colors={on ? ["transparent", `${c.accent}CC`] : ["transparent", "rgba(0,0,0,.35)"]} locations={[0.45, 1]} style={{ position: "absolute", width: "100%", height: "100%" }} />
                      {on && (
                        <View style={{ position: "absolute", right: 4, bottom: 4, height: 16, width: 16, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontFamily: F.extra, fontSize: 9, color: c.accent }}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: on ? c.accent : colors.ink2 }}>{c.t}</Text>
                  </SpringBtn>
                </Animated.View>
              );
            })}
            <Animated.View entering={FadeIn.delay(300)} style={{ width: "20%", alignItems: "center", gap: 6 }}>
              <SpringBtn onPress={() => { set({ tab: "cats" }); blip(680); }} style={{ alignItems: "center", gap: 6 }}>
                <View style={{ height: 58, width: 58, borderRadius: 18, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
                  <View style={{ height: 32, width: 32, borderRadius: 16, backgroundColor: "#E23744", alignItems: "center", justifyContent: "center" }}>
                    <ChevronRight size={16} strokeWidth={3} color="#fff" />
                  </View>
                </View>
                <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: colors.ink2 }}>See all</Text>
              </SpringBtn>
            </Animated.View>
          </View>
        </View>

        {/* active-cat banner */}
        {activeCat && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 12, backgroundColor: `${activeCat.accent}15`, borderWidth: 1, borderColor: `${activeCat.accent}35` }}>
              <View style={{ height: 44, width: 44, borderRadius: 12, overflow: "hidden" }}>
                <Img src={activeCat.img} style={{ width: "100%", height: "100%" }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: activeCat.accent }}>{activeCat.t} • {filtered.length} stores</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>{activeCat.sub} • avg {activeCat.eta}</Text>
              </View>
              <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: activeCat.accent }}>
                <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: "#fff" }}>⚡ {activeCat.eta}</Text>
              </View>
            </View>
          </View>
        )}

        {/* banner carousel */}
        <View style={{ paddingTop: 12 }}>
          <ScrollView
            ref={bannerRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={step}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            onMomentumScrollEnd={(e) => setBanner(Math.min(2, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / step))))}
          >
            {banners.map((b, i) => (
              <SpringBtn key={i} onPress={() => {}} style={{ width: cardW, height: 148, borderRadius: 20, overflow: "hidden" }}>
                <Img src={b.img} style={{ position: "absolute", width: "100%", height: "100%" }} eager={i === 0} />
                <LinearGradient colors={[b.colors[0], b.colors[1], b.colors[2]]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", width: "100%", height: "100%" }} />
                <View style={{ width: "62%", justifyContent: "center", height: "100%", padding: 16 }}>
                  <View style={{ alignSelf: "flex-start", borderRadius: 6, backgroundColor: "#D8F34E", paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: "#111114" }}>{b.tag}</Text>
                  </View>
                  <Text style={{ marginTop: 6, fontFamily: F.display, fontSize: 24, lineHeight: 25, color: "#fff" }}>{b.title}</Text>
                  <Text style={{ marginTop: 2, fontFamily: F.semi, fontSize: 12, color: "rgba(255,255,255,.8)" }}>{b.sub}</Text>
                  <View style={{ marginTop: 8, alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 6 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#111114" }}>{b.cta} →</Text>
                  </View>
                </View>
              </SpringBtn>
            ))}
          </ScrollView>
          <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "center", gap: 6 }}>
            {banners.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  setBanner(i);
                  bannerRef.current?.scrollTo({ x: i * step, animated: true });
                }}
                style={{ height: 6, width: i === banner ? 24 : 6, borderRadius: 999, backgroundColor: i === banner ? "#0E3B2E" : "rgba(0,0,0,.15)" }}
              />
            ))}
          </View>
        </View>

        {/* CATS circles */}
        <View style={{ paddingTop: 12 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHead title="Shop by craving" sub="Blinkit-fast • Zomato-tasty" action={<Text style={{ fontFamily: F.extra, fontSize: 12, color: "#E23744" }}>see all ›</Text>} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginTop: 10, gap: 12, paddingHorizontal: 16, paddingBottom: 4 }}>
            {CATS.map((c) => (
              <SpringBtn key={c.k} onPress={() => set({ query: c.t, tab: "search" })} style={{ width: 68, alignItems: "center" }}>
                <View style={{ height: 68, width: 68, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
                  <Img src={c.img} style={{ width: "100%", height: "100%" }} />
                </View>
                <Text style={{ marginTop: 6, fontFamily: F.extra, fontSize: 11, color: colors.ink }}>{c.t}</Text>
              </SpringBtn>
            ))}
          </ScrollView>
        </View>

        {/* essentials */}
        <View style={{ paddingTop: 16 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHead
              title={activeCat ? `Top picks in ${activeCat.t}` : "⚡ Essentials in minutes"}
              sub={activeCat ? `${quickPicks.length} items • delivered by local stores` : "From FreshKart • Milk & More • MediCare"}
              action={
                <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: activeCat?.accent ?? "#0C831F" }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>{activeCat?.eta ?? "12 MIN"}</Text>
                </View>
              }
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginTop: 10, gap: 10, paddingHorizontal: 16, paddingBottom: 16 }}>
            {grocery.map((p, i) => (
              <BlinkitCard key={p.id} pid={p.id} index={i} />
            ))}
          </ScrollView>
        </View>

        {/* offer strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 4 }}>
          {["50% OFF up to ₹100", "Free delivery over ₹199", "20% cashback", "₹200 OFF services"].map((t) => (
            <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(14,59,46,.3)", backgroundColor: "rgba(216,243,78,.25)", paddingHorizontal: 12, paddingVertical: 6 }}>
              <BadgePercent size={13} color="#0E3B2E" />
              <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#0E3B2E" }}>{t}</Text>
            </View>
          ))}
        </ScrollView>

        {/* active-cat feed */}
        {activeCat && (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <SectionHead title={`${activeCat.t} near you`} sub={`${restList.length} places • delivering now`} action={<Text style={{ fontFamily: F.extra, fontSize: 12, color: "#E23744" }}>Sort ▾</Text>} />
            <View style={{ marginTop: 12, gap: 16 }}>
              {restList.map((s, i) => (
                <ZomatoCard key={s.id} id={s.id} index={i} onOpen={() => onStore(s.id)} />
              ))}
            </View>
          </View>
        )}

        {/* rails */}
        {!activeCat && <CategoryRails cats={allCats} onStore={onStore} />}

        {/* festive */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <View style={{ borderRadius: 22, overflow: "hidden" }}>
            <Img src={STORES[7].image} style={{ position: "absolute", width: "100%", height: "100%" }} />
            <LinearGradient colors={["rgba(74,14,46,.92)", "rgba(74,14,46,.55)", "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", width: "100%", height: "100%" }} />
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Sparkles size={12} color="#FFD166" />
                <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 2, color: "#FFD166" }}>DIWALI EDIT IS LIVE</Text>
              </View>
              <Text style={{ marginTop: 4, fontFamily: F.display, fontSize: 21, lineHeight: 26, color: "#fff" }}>Sweets, diyas & gifts{"\n"}from 14 local shops 🪔</Text>
              <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                <View style={{ borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#111114" }}>Shop festive</Text>
                </View>
                <View style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,.2)", paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: "#fff" }}>Send gift</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      {locOpen && <StubSheet title="Delivery address" sub="GPS location setup lands in Phase 6." onClose={() => setLocOpen(false)} />}
    </View>
  );
}

/* ── CategoryRails ── */
export function CategoryRails({ cats, onStore }: { cats: CategoryDef[]; onStore: (id: string) => void }) {
  const set = useOSB((s) => s.set);
  const { colors } = useTheme();
  const { stores: allStores, products: allProducts } = useMarketplace();
  return (
    <View>
      {cats.map((c) => {
        const stores = allStores.filter((s) => c.kinds.includes(s.kind)).slice(0, 6);
        const ids = new Set(stores.map((s) => s.id));
        const products = allProducts.filter((p) => ids.has(p.storeId)).slice(0, 8);
        return (
          <View key={c.k} style={{ paddingTop: 20 }}>
            <Pressable onPress={() => set({ category: c.k })} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ height: 36, width: 36, borderRadius: 12, overflow: "hidden", backgroundColor: `${c.accent}18`, alignItems: "center", justifyContent: "center" }}>
                  {c.img ? <Img src={c.img} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 18 }}>{c.emoji}</Text>}
                </View>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 15, letterSpacing: -0.3, color: colors.ink }}>{c.t}</Text>
                    {c.dynamic && (
                      <View style={{ borderRadius: 6, backgroundColor: "#7C5CFF", paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 8.5, letterSpacing: 0.5, color: "#fff" }}>NEW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{stores.length} stores • ⚡ {c.eta}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: c.accent }}>See all</Text>
                <ChevronRight size={13} color={c.accent} />
              </View>
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginTop: 10, gap: 10, paddingHorizontal: 16 }}>
              {stores.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => onStore(s.id)}
                  style={{ width: 152, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}
                >
                  <View style={{ position: "relative", height: 92 }}>
                    <Img src={s.image} style={{ width: "100%", height: "100%" }} />
                    <View style={{ position: "absolute", left: 6, bottom: 6, borderRadius: 6, backgroundColor: "rgba(0,0,0,.68)", paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 9, color: "#fff" }}>⚡ {s.etaMins} MINS</Text>
                    </View>
                    {s.offers[0] && (
                      <View style={{ position: "absolute", left: 6, top: 6, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: c.accent }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 8.5, color: "#fff" }}>OFFER</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ padding: 10 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{s.name}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10, color: colors.ink3 }}>{s.tagline}</Text>
                    <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Rating v={s.rating} />
                      <Text style={{ fontFamily: F.bold, fontSize: 10, color: colors.ink3 }}>{s.distanceKm} km</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
              {products.slice(0, 4).map((p) => (
                <BlinkitCard key={p.id} pid={p.id} index={0} />
              ))}
              {stores.length === 0 && (
                <View style={{ width: 170, borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: colors.line, padding: 16, justifyContent: "center" }}>
                  <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
                  <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{c.t} soon</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>Local stores being onboarded</Text>
                </View>
              )}
              <Pressable
                onPress={() => set({ category: c.k })}
                style={{ width: 86, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", paddingVertical: 16 }}
              >
                <View style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
                  <ChevronRight size={17} color="#fff" />
                </View>
                <Text style={{ marginTop: 6, fontFamily: F.extra, fontSize: 10.5, color: colors.ink }}>View all</Text>
              </Pressable>
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

/* ── BlinkitCard ── */
export function BlinkitCard({ pid, index }: { pid: string; index: number }) {
  const { products, stores } = useMarketplace();
  const p = products.find((x) => x.id === pid);
  const cart = useOSB((s) => s.cart);
  const addToCart = useOSB((s) => s.addToCart);
  const decCart = useOSB((s) => s.decCart);
  const { colors } = useTheme();
  if (!p) return null;
  const qty = cart.find((c) => c.productId === pid)?.qty ?? 0;
  const store = stores.find((s) => s.id === p.storeId);
  const off = p.mrp ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const line = { productId: p.id, name: p.name, emoji: p.emoji, image: p.image, price: p.price, qty: 1, storeId: p.storeId, storeName: store?.name ?? "", unit: p.unit, tint: p.tint } as never;
  return (
    <Animated.View entering={FadeIn.delay(Math.min(index * 40, 250))} style={{ width: 138, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
      <View style={{ position: "relative", height: 118, backgroundColor: "#F6F6F6" }}>
        <Img src={p.image} style={{ width: "100%", height: "100%" }} />
        {off > 0 && (
          <View style={{ position: "absolute", left: 6, top: 6, borderRadius: 6, backgroundColor: "#256FEF", paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#fff" }}>{off}% OFF</Text>
          </View>
        )}
        {p.isBestseller && (
          <View style={{ position: "absolute", left: 6, bottom: 6, borderRadius: 6, backgroundColor: "rgba(0,0,0,.65)", paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 9, letterSpacing: 0.5, color: "#fff" }}>★ BESTSELLER</Text>
          </View>
        )}
      </View>
      <View style={{ padding: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Clock size={10} color={colors.ink3} />
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: colors.ink3 }}>{p.eta ?? "12 MINS"}</Text>
        </View>
        <Text numberOfLines={2} style={{ marginTop: 2, minHeight: 30, fontFamily: F.bold, fontSize: 12, lineHeight: 15, color: colors.ink }}>{p.name}</Text>
        <Text style={{ marginTop: 2, fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{p.unit}</Text>
        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 4 }}>
          <View>
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>₹{p.price}</Text>
            {p.mrp && <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3, textDecorationLine: "line-through" }}>₹{p.mrp}</Text>}
          </View>
          <AddStepper small qty={qty} onAdd={() => addToCart(line)} onInc={() => addToCart(line)} onDec={() => decCart(p.id)} />
        </View>
      </View>
    </Animated.View>
  );
}
export const FlashCard = BlinkitCard;

/* ── ZomatoCard ── */
export function StoreCard({ id, index, onOpen }: { id: string; index: number; onOpen: () => void }) {
  return <ZomatoCard id={id} index={index} onOpen={onOpen} />;
}

export function ZomatoCard({ id, index, onOpen }: { id: string; index: number; onOpen: () => void }) {
  const { stores } = useMarketplace();
  const s = stores.find((x) => x.id === id);
  const wish = useOSB((x) => x.wishlist);
  const toggleWish = useOSB((x) => x.toggleWish);
  const { colors } = useTheme();
  const suppress = useRef(0);
  if (!s) return null;
  const liked = wish.includes(s.id);
  return (
    <Animated.View entering={FadeIn.delay(Math.min(index * 50, 300))} style={{ width: "100%" }}>
      <Pressable
        onPress={() => {
          if (Date.now() - suppress.current < 350) return;
          onOpen();
        }}
        style={{ borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}
      >
        <View style={{ position: "relative", height: 168, backgroundColor: "#eee" }}>
          <Img src={s.image} style={{ width: "100%", height: "100%" }} />
          {s.offers[0] ? (
            <LinearGradient colors={["transparent", "rgba(37,111,239,.85)", "#256FEF"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingBottom: 8, paddingTop: 32, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <BadgePercent size={14} color="#fff" />
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#fff" }}>{s.offers[0]}</Text>
            </LinearGradient>
          ) : null}
          <Pressable
            onPress={() => {
              suppress.current = Date.now();
              toggleWish(s.id);
              blip(720);
            }}
            style={{ position: "absolute", right: 10, top: 10, height: 36, width: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.95)", alignItems: "center", justifyContent: "center" }}
          >
            <Heart size={17} fill={liked ? "#E23744" : "transparent"} color={liked ? "#E23744" : "#333"} />
          </Pressable>
          {s.isPureVeg && (
            <View style={{ position: "absolute", left: 10, top: 10, borderRadius: 6, backgroundColor: "rgba(255,255,255,.95)", paddingHorizontal: 6, paddingVertical: 4 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#0C831F" }}>PURE VEG</Text>
            </View>
          )}
          <View style={{ position: "absolute", right: 10, bottom: 36, borderRadius: 8, backgroundColor: "rgba(255,255,255,.95)", paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: "#111114" }}>⏱ {s.etaMins} min • {s.distanceKm} km</Text>
          </View>
        </View>
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3, color: colors.ink }}>{s.name}</Text>
              <Text numberOfLines={1} style={{ marginTop: 2, fontFamily: F.medium, fontSize: 12, color: colors.ink2 }}>{s.cuisine ?? s.tagline}</Text>
            </View>
            <Rating v={s.rating} count={s.ratingsCount} />
          </View>
          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line, borderStyle: "dashed", paddingTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Bike size={13} color={colors.ink3} />
              <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>
                {s.deliveryFee === 0 ? "FREE delivery" : `₹${s.deliveryFee} delivery`} • {s.priceForTwo} for two
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#E23744" }}>MENU</Text>
              <ChevronRight size={13} color="#E23744" />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ═══════════ SearchTab ═══════════ */
export function SearchTab() {
  const set = useOSB((s) => s.set);
  const query = useOSB((s) => s.query);
  const cart = useOSB((s) => s.cart);
  const addToCart = useOSB((s) => s.addToCart);
  const decCart = useOSB((s) => s.decCart);
  const { colors } = useTheme();
  const { stores, products } = useMarketplace();
  const [listening, setListening] = useState(false);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const ps = products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 6);
    const ss = stores.filter((s) => s.name.toLowerCase().includes(q) || s.tags.join(" ").toLowerCase().includes(q)).slice(0, 4);
    return [...ps.map((p) => ({ t: "product" as const, p })), ...ss.map((s) => ({ t: "store" as const, s }))];
  }, [query, stores, products]);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 160 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 6 }}>
        <Search size={18} strokeWidth={2.6} color="#E23744" />
        <TextInput
          autoFocus
          value={query}
          onChangeText={(t) => set({ query: t })}
          placeholder="Search biryani, milk, plumber…"
          placeholderTextColor={colors.ink3}
          style={{ flex: 1, fontFamily: F.semi, fontSize: 14.5, color: colors.ink, paddingVertical: 8 }}
        />
        <Pressable
          onPress={() => {
            setListening(!listening);
            blip(listening ? 400 : 880);
            setTimeout(() => setListening(false), 2200);
          }}
          style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: listening ? "#E23744" : colors.chip }}
        >
          <Mic size={16} color={listening ? "#fff" : colors.ink} />
        </Pressable>
        <View style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.chip }}>
          <ScanSearch size={16} color={colors.ink} />
        </View>
      </View>
      {listening && (
        <Animated.View entering={FadeIn} style={{ marginTop: 12, borderRadius: 20, backgroundColor: "#0E3B2E", padding: 20, alignItems: "center" }}>
          <View style={{ height: 64, width: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,.12)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#D8F34E" }}>
            <Mic size={26} color="#fff" />
          </View>
          <Text style={{ marginTop: 8, fontFamily: F.bold, fontSize: 14, color: "#fff" }}>Listening… “extra cheese dosa”</Text>
          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 4 }}>
            {[8, 16, 22, 12, 20, 10, 14].map((h, i) => (
              <View key={i} style={{ width: 4, height: h, borderRadius: 2, backgroundColor: "#D8F34E" }} />
            ))}
          </View>
        </Animated.View>
      )}
      {query.trim() === "" ? (
        <View>
          <View style={{ marginTop: 16 }}>
            <SectionHead title="Trending in HSR" sub="12k people searching now" />
          </View>
          <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TRENDING.map((t, i) => (
              <Animated.View key={t} entering={FadeIn.delay(i * 40)}>
                <Pressable onPress={() => set({ query: t })} style={{ flexDirection: "row", alignItems: "center", borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: colors.ink3 }}>↗ </Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: colors.ink }}>{t}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
          <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[
              { t: "Midnight biryani", s: "4 places open", img: STORES[0].image },
              { t: "Milk in 12 min", s: "Subscribe & save", img: STORES[5].image },
              { t: "Plumber today", s: "4.9★ pros", img: STORES[8].image },
              { t: "Cake in 30 min", s: "Free card", img: STORES[7].image },
            ].map((c, i) => (
              <Animated.View key={c.t} entering={FadeIn.delay(100 + i * 60)} style={{ width: "48%" }}>
                <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
                  <View style={{ height: 86 }}>
                    <Img src={c.img} style={{ width: "100%", height: "100%" }} />
                  </View>
                  <View style={{ padding: 10 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{c.t}</Text>
                    <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>{c.s}</Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 12, gap: 10 }}>
          {results.length === 0 && (
            <Glass style={{ padding: 32, alignItems: "center" }}>
              <Text style={{ fontSize: 44 }}>🍳</Text>
              <Text style={{ marginTop: 8, fontFamily: F.display, fontSize: 17, color: colors.ink }}>No match for “{query}”</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: colors.ink2 }}>Try biryani, milk, plumber…</Text>
            </Glass>
          )}
          {results.map((r, i) => (
            <Animated.View key={i} entering={FadeIn.delay(i * 40)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 10 }}>
              <View style={{ height: 56, width: 56, borderRadius: 12, overflow: "hidden", backgroundColor: colors.chip }}>
                <Img src={r.t === "product" ? r.p.image : r.s.image} style={{ width: "100%", height: "100%" }} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>{r.t === "product" ? r.p.name : r.s.name}</Text>
                <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>
                  {r.t === "product" ? `₹${r.p.price} • ${r.p.category} • ⭐ ${r.p.rating}` : r.s.tagline}
                </Text>
              </View>
              {r.t === "product" ? (
                <AddStepper
                  small
                  qty={cart.find((c) => c.productId === r.p.id)?.qty ?? 0}
                  onAdd={() => addToCart({ productId: r.p.id, name: r.p.name, emoji: r.p.emoji, image: r.p.image, price: r.p.price, qty: 1, storeId: r.p.storeId, storeName: "", unit: r.p.unit, tint: r.p.tint } as never)}
                  onInc={() => addToCart({ productId: r.p.id, name: r.p.name, emoji: r.p.emoji, image: r.p.image, price: r.p.price, qty: 1, storeId: r.p.storeId, storeName: "", unit: r.p.unit, tint: r.p.tint } as never)}
                  onDec={() => decCart(r.p.id)}
                />
              ) : (
                <ChevronRight size={16} color={colors.ink3} style={{ opacity: 0.4 }} />
              )}
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/* ═══════════ OrdersTab ═══════════ */
export function OrdersTab({ onTrack }: { onTrack: (id: string) => void }) {
  const orders = useOSB((s) => s.orders);
  const set = useOSB((s) => s.set);
  const { colors } = useTheme();
  if (orders.length === 0)
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 160 }}>
        <Text style={{ paddingHorizontal: 4, fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5, color: colors.ink }}>Your orders</Text>
        <View style={{ marginTop: 12, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden", alignItems: "center" }}>
          <View style={{ position: "relative", height: 190, width: "100%" }}>
            <Img src={STORES[0].image} style={{ width: "100%", height: "100%" }} />
            <LinearGradient colors={["transparent", "rgba(0,0,0,.55)"]} style={{ position: "absolute", width: "100%", height: "100%" }} />
            <Text style={{ position: "absolute", left: 24, bottom: 16, fontSize: 52 }}>🛵</Text>
            <View style={{ position: "absolute", right: 16, bottom: 16, borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#111114" }}>30 min avg</Text>
            </View>
          </View>
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 17, color: colors.ink }}>No orders yet — bhook lagi?</Text>
            <Text style={{ marginTop: 4, maxWidth: 260, fontFamily: F.medium, fontSize: 12.5, lineHeight: 18, color: colors.ink2, textAlign: "center" }}>
              Hot biryani, cold milk or fixed tap — all 20 mins away.
            </Text>
            <Pressable onPress={() => set({ tab: "home" })} style={{ marginTop: 16, borderRadius: 999, backgroundColor: "#E23744", paddingHorizontal: 24, paddingVertical: 12 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>Explore nearby</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ marginTop: 16, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Truck size={16} color={colors.ink} />
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>How delivery works here</Text>
          </View>
          <Text style={{ marginTop: 6, fontFamily: F.medium, fontSize: 12.5, lineHeight: 19, color: colors.ink2 }}>
            Every store delivers with <Text style={{ fontFamily: F.extra, color: colors.ink }}>its own team</Text>. One Stop Bazar gives ordering, payments & analytics — fresher, faster.
          </Text>
        </View>
      </ScrollView>
    );
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 160 }}>
      <Text style={{ paddingHorizontal: 4, fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5, color: colors.ink }}>
        Orders <Text style={{ fontSize: 14, color: colors.ink3 }}>({orders.length})</Text>
      </Text>
      <View style={{ marginTop: 12, gap: 12 }}>
        {orders.map((o, i) => (
          <Animated.View key={o.id} entering={FadeIn.delay(i * 60)}>
            <Pressable onPress={() => onTrack(o.id)} style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ height: 48, width: 48, borderRadius: 12, backgroundColor: colors.chip, overflow: "hidden" }}>
                  {o.items[0] && <Img src={(o.items[0] as unknown as { image?: string }).image ?? STORES[0].image} style={{ width: "100%", height: "100%" }} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>{o.storeName}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink3 }}>{o.code} • {o.items.length} items • {inr(o.total)}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: o.status === "cancelled" ? "rgba(226,55,68,.1)" : o.status === "new" ? "#FEF3C7" : "rgba(12,131,31,.08)" }}>
                  <LiveDot color={o.status === "cancelled" ? "#E23744" : o.status === "new" ? "#E8830C" : "#0C831F"} />
                  <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: o.status === "cancelled" ? "#E23744" : o.status === "new" ? "#92400E" : "#0C831F" }}>
                    {statusLabel(o.status)}
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line, borderStyle: "dashed", paddingTop: 10 }}>
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.bold, fontSize: 11.5, color: colors.ink3 }}>
                  {o.items.map((x) => `${x.qty}× ${x.name}`).join(" • ").slice(0, 64)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#E23744" }}>Track</Text>
                  <ChevronRight size={14} color="#E23744" />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

/* ═══════════ SavedTab ═══════════ */
export function SavedTab({ onStore }: { onStore: (id: string) => void }) {
  const wishlist = useOSB((s) => s.wishlist);
  const toggleWish = useOSB((s) => s.toggleWish);
  const { colors } = useTheme();
  const items = PRODUCTS.filter((p) => wishlist.includes(p.id));
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 160 }}>
      <Text style={{ paddingHorizontal: 4, fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5, color: colors.ink }}>Favourites ❤️</Text>
      <Text style={{ paddingHorizontal: 4, fontFamily: F.medium, fontSize: 12, color: colors.ink2 }}>{items.length} saved • {wishlist.length} stores followed</Text>
      {items.length === 0 ? (
        <Glass style={{ marginTop: 12, padding: 32, alignItems: "center" }}>
          <Text style={{ fontSize: 52 }}>💌</Text>
          <Text style={{ marginTop: 8, fontFamily: F.extra, fontSize: 17, color: colors.ink }}>Nothing saved yet</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: colors.ink2 }}>Tap the heart on anything you love.</Text>
        </Glass>
      ) : (
        <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {items.map((p, i) => (
            <Animated.View key={p.id} entering={FadeIn.delay(i * 50)} style={{ width: "48%" }}>
              <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
                <View style={{ position: "relative", height: 110 }}>
                  <Img src={p.image} style={{ width: "100%", height: "100%" }} />
                  <Pressable onPress={() => toggleWish(p.id)} style={{ position: "absolute", right: 8, top: 8, height: 32, width: 32, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                    <Heart size={15} fill="#E23744" color="#E23744" />
                  </Pressable>
                </View>
                <View style={{ padding: 10 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{p.name}</Text>
                  <View style={{ marginTop: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>₹{p.price}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <Star size={10} fill="#0C831F" color="#0C831F" />
                      <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.ink }}>{p.rating}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>
      )}
      <View style={{ marginTop: 16 }}>
        <SectionHead title="Stores you love" />
      </View>
      <View style={{ marginTop: 8, gap: 16 }}>
        {STORES.slice(0, 3).map((s) => (
          <ZomatoCard key={s.id} id={s.id} index={0} onOpen={() => onStore(s.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

/* ═══════════ ProfileTab ═══════════ */
const PROFILE_ROWS = [
  ["🙋", "Edit profile", "Name, avatar, email, gender", "edit"],
  ["📍", "Delivery address", "", "loc"],
  ["🎟️", "Coupons & offers", "4 active • 1 expiring", ""],
  ["⭐", "My reviews", "23 reviews • 4.8 avg", ""],
  ["🛡️", "Super Admin demo", "Platform control centre", "admin"],
  ["⚙️", "Settings & privacy", "Language, notifications", ""],
  ["💬", "Help & support", "Chat in 30 sec", ""],
] as const;

export function ProfileTab() {
  const set = useOSB((s) => s.set);
  const mode = useOSB((s) => s.mode);
  const dark = useOSB((s) => s.dark);
  const address = useOSB((s) => s.address);
  const addressArea = useOSB((s) => s.addressArea);
  const coupon = useOSB((s) => s.coupon);
  const seller = useOSB((s) => s.seller);
  const userName = useOSB((s) => s.userName);
  const userEmail = useOSB((s) => s.userEmail);
  const userAvatar = useOSB((s) => s.userAvatar);
  const phone = useOSB((s) => s.phone);
  const logout = useOSB((s) => s.logout);
  const riderCtx = useOSB((s) => s.riderCtx);
  const backToDeliveries = useOSB((s) => s.backToDeliveries);
  const { colors } = useTheme();
  const [editOpen, setEditOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 160 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
          <View style={{ position: "relative" }}>
            <LinearGradient colors={["#E23744", "#FF7A45"]} style={{ height: 56, width: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 24, color: "#fff" }}>{userAvatar || (userName ? userName[0].toUpperCase() : "👤")}</Text>
            </LinearGradient>
            <View style={{ position: "absolute", right: -2, bottom: -2, height: 20, width: 20, borderRadius: 10, backgroundColor: "#0C831F", borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 10, color: "#fff" }}>✓</Text>
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 16, color: colors.ink }}>{userName || "You"}</Text>
            <Text numberOfLines={1} style={{ marginTop: 4, fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>{phone || "Logged in"}{userEmail ? ` • ${userEmail}` : ""}</Text>
          </View>
          <Pressable onPress={() => { setEditOpen(true); blip(600); }} style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.chip }}>
            <Pencil size={15} color={colors.ink} />
          </Pressable>
          <Pressable onPress={() => set({ dark: !dark })} style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: colors.chip }}>
            {dark ? <Sun size={17} color={colors.ink} /> : <Moon size={17} color={colors.ink} />}
          </Pressable>
        </View>

        {riderCtx && (
          <Pressable onPress={() => { backToDeliveries(); blip(700); }} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: "#111117", padding: 14 }}>
            <View style={{ height: 44, width: 44, borderRadius: 16, backgroundColor: "#F8CB46", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 20 }}>🛵</Text>
              <View style={{ position: "absolute", right: -2, bottom: -2, height: 12, width: 12, borderRadius: 6, borderWidth: 2, borderColor: "#111117", backgroundColor: riderCtx.online ? "#34D399" : "rgba(255,255,255,.3)" }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: "#fff" }}>You deliver for {riderCtx.storeName}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,.6)" }}>{riderCtx.online ? "Online" : "Offline"} • tap to open deliveries</Text>
            </View>
            <ChevronRight size={18} color="rgba(255,255,255,.6)" />
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            set({ mode: mode === "customer" ? "provider" : "customer", tab: mode === "customer" ? (seller.onboarded ? "dash" : "onboard") : "home" });
            blip(880, 0.12);
          }}
          style={{ marginTop: 12, borderRadius: 22, overflow: "hidden" }}
        >
          <LinearGradient colors={["#F8CB46", "#0C831F", "#E23744"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 1.5, borderRadius: 22 }}>
            <View style={{ borderRadius: 21, backgroundColor: "#111117", overflow: "hidden" }}>
              <View style={{ position: "relative", height: 110 }}>
                <Img src={seller.coverImage || STORES[0].image} style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.6 }} />
                <LinearGradient colors={["transparent", "rgba(17,17,23,.4)", "#111117"]} style={{ position: "absolute", width: "100%", height: "100%" }} />
                <View style={{ position: "absolute", left: 16, right: 16, bottom: 8 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 2.4, color: "#F8CB46" }}>
                    {seller.onboarded ? "✦ SAVED TO YOUR NUMBER" : "✦ ONE ACCOUNT • TWO WORLDS"}
                  </Text>
                  <Text style={{ fontFamily: F.extra, fontSize: 19, color: "#fff" }}>{seller.onboarded ? seller.name : "Become a Provider 🚀"}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 16, paddingTop: 12 }}>
                <View style={{ borderRadius: 999, backgroundColor: "#F8CB46", paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#111114" }}>
                    {seller.onboarded ? (mode === "provider" ? "Back to shopping →" : "Enter my shop →") : "Register store →"}
                  </Text>
                </View>
                <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 11, color: "rgba(255,255,255,.6)" }}>
                  {seller.onboarded ? `${seller.categories.length} categor${seller.categories.length === 1 ? "y" : "ies"} • linked to ${phone || "your number"}` : "₹999/mo • zero commission"}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Wallet size={13} color={colors.ink3} />
              <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1, color: colors.ink3 }}>WALLET</Text>
            </View>
            <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 22, color: colors.ink }}>₹486</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 11, color: "#0C831F" }}>+ ₹48 cashback pending</Text>
          </View>
          <View style={{ flex: 1, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ticket size={13} color={colors.ink3} />
              <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1, color: colors.ink3 }}>COUPON</Text>
            </View>
            <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ borderRadius: 8, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(14,59,46,.4)", backgroundColor: "rgba(248,203,70,.3)", paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{coupon ?? "—"}</Text>
              </View>
              <Copy size={13} color={colors.ink3} style={{ opacity: 0.5 }} />
            </View>
            <Text style={{ marginTop: 4, fontFamily: F.bold, fontSize: 11, color: colors.ink3 }}>Tap to copy</Text>
          </View>
        </View>

        <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
          {PROFILE_ROWS.map(([e, t, s, kind], ix) => (
            <Pressable
              key={t}
              onPress={() => {
                if (kind === "admin") set({ mode: "admin", tab: "overview" });
                else if (kind === "edit") setEditOpen(true);
                else if (kind === "loc") setLocOpen(true);
                blip(600);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: ix === PROFILE_ROWS.length - 1 ? 0 : 1, borderBottomColor: colors.line }}
            >
              <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18 }}>{e}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{t}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>
                  {kind === "loc" ? (address ? (addressArea ? addressArea + " • tap to change" : address.slice(0, 34)) : "Set your location") : s}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.ink3} style={{ opacity: 0.35 }} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => { logout(); blip(400); }} style={{ marginTop: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#E23744" }}>Log out</Text>
        </Pressable>
        <Text style={{ marginTop: 16, fontFamily: F.semi, fontSize: 11, color: colors.ink3, textAlign: "center" }}>One Stop Bazar • OTP login only 🇮🇳</Text>
      </ScrollView>
      {editOpen && <StubSheet title="Edit profile" sub="Profile editor lands in Phase 6." onClose={() => setEditOpen(false)} />}
      {locOpen && <StubSheet title="Delivery address" sub="GPS location setup lands in Phase 6." onClose={() => setLocOpen(false)} />}
    </View>
  );
}

/* ═══════════ StoreSheet ═══════════ */
export function StoreSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { stores, products } = useMarketplace();
  const s = stores.find((x) => x.id === id);
  const menu = products.filter((p) => p.storeId === id);
  const cart = useOSB((x) => x.cart);
  const addToCart = useOSB((x) => x.addToCart);
  const decCart = useOSB((x) => x.decCart);
  const toggleWish = useOSB((x) => x.toggleWish);
  const wish = useOSB((x) => x.wishlist);
  const { colors } = useTheme();
  const [tab, setTab] = useState("menu");
  if (!s) return null;
  const liked = wish.includes(s.id);
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.45)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
      <Animated.View entering={SlideInRight.springify().stiffness(210).damping(28)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 46, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.app, overflow: "hidden" }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 176 }}>
          <View style={{ position: "relative", height: 210, backgroundColor: "#111114" }}>
            <Img src={s.image} style={{ width: "100%", height: "100%" }} eager />
            <LinearGradient colors={["rgba(0,0,0,.25)", "rgba(0,0,0,.15)", "rgba(0,0,0,.75)"]} style={{ position: "absolute", width: "100%", height: "100%" }} />
            <Pressable onPress={onClose} style={{ position: "absolute", left: 12, top: 12, height: 40, width: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.95)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 16, color: "#111114" }}>←</Text>
            </Pressable>
            <Pressable onPress={() => { toggleWish(s.id); blip(720); }} style={{ position: "absolute", right: 12, top: 12, height: 40, width: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.95)", alignItems: "center", justifyContent: "center" }}>
              <Heart size={17} fill={liked ? "#E23744" : "transparent"} color={liked ? "#E23744" : "#111114"} />
            </Pressable>
            <View style={{ position: "absolute", left: 16, right: 16, bottom: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5, color: "#fff" }}>{s.name}</Text>
                <Text style={{ marginTop: 4, fontFamily: F.semi, fontSize: 12, color: "rgba(255,255,255,.85)" }}>{s.cuisine ?? s.tagline} • {s.priceForTwo} for two</Text>
              </View>
              <Rating v={s.rating} count={s.ratingsCount} />
            </View>
          </View>
          <View style={{ marginHorizontal: 16, marginTop: -14, flexDirection: "row", gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: colors.ink }}>⏱ {s.etaMins} mins</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Bike size={12} color={colors.ink} />
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: colors.ink }}>{s.deliveryFee === 0 ? "FREE" : `₹${s.deliveryFee}`}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: colors.ink }}>📍 {s.distanceKm} km</Text>
            </View>
          </View>
          {s.offers.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginTop: 12, gap: 8, paddingHorizontal: 16 }}>
              {s.offers.map((o) => (
                <View key={o} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, backgroundColor: "#256FEF", paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Ticket size={13} color="#fff" />
                  <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#fff" }}>{o}</Text>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={{ marginHorizontal: 16, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, backgroundColor: "rgba(12,131,31,.08)", paddingHorizontal: 14, paddingVertical: 10 }}>
            <Leaf size={15} color="#0C831F" />
            <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 12, color: "#0C5B21" }}>Delivered by {s.name}’s own team • No middleman</Text>
          </View>
          <View style={{ marginHorizontal: 16, marginTop: 12, flexDirection: "row", gap: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 4 }}>
            {["menu", "reviews", "info"].map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1, borderRadius: 999, paddingVertical: 8, backgroundColor: tab === t ? "#111114" : "transparent", alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: tab === t ? "#fff" : colors.ink3 }}>
                  {t === "menu" ? `Menu (${menu.length})` : t[0].toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13, letterSpacing: 1.5, color: colors.ink3 }}>RECOMMENDED ({menu.length})</Text>
            <View style={{ marginTop: 10, gap: 12 }}>
              {menu.map((p, i) => {
                const qty = cart.find((c) => c.productId === p.id)?.qty ?? 0;
                const line = { productId: p.id, name: p.name, emoji: p.emoji, image: p.image, price: p.price, qty: 1, storeId: p.storeId, storeName: s.name, unit: p.unit, tint: p.tint } as never;
                return (
                  <Animated.View key={p.id} entering={FadeIn.delay(Math.min(i * 40, 300))} style={{ marginBottom: 8, flexDirection: "row", gap: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 10 }}>
                    <View style={{ flex: 1, minWidth: 0, paddingVertical: 4, paddingLeft: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <VegMark veg={p.isVeg} />
                        {p.isBestseller && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                            <Star size={9} fill="#E23744" color="#E23744" />
                            <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#E23744" }}>Bestseller</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 14, lineHeight: 18, color: colors.ink }}>{p.name}</Text>
                      <View style={{ marginTop: 2, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>₹{p.price}</Text>
                        {p.mrp && <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3, textDecorationLine: "line-through" }}>₹{p.mrp}</Text>}
                        <View style={{ borderRadius: 6, backgroundColor: "rgba(12,131,31,.08)", paddingHorizontal: 4, paddingVertical: 1 }}>
                          <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#0C831F" }}>⭐ {p.rating}</Text>
                        </View>
                      </View>
                      <Text numberOfLines={2} style={{ marginTop: 4, fontFamily: F.medium, fontSize: 11.5, lineHeight: 16, color: colors.ink2 }}>{p.description}</Text>
                    </View>
                    <View style={{ width: 118 }}>
                      <View style={{ position: "relative", height: 104, width: 118, borderRadius: 14, backgroundColor: "#f2f2f2", overflow: "hidden" }}>
                        <Img src={p.image} style={{ width: "100%", height: "100%" }} />
                        {(p.images?.length ?? 0) > 1 && (
                          <View style={{ position: "absolute", right: 6, top: 6, borderRadius: 6, backgroundColor: "rgba(0,0,0,.65)", paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontFamily: F.extra, fontSize: 9, color: "#fff" }}>📷 {p.images!.length}</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ position: "absolute", bottom: 22, left: "50%", marginLeft: -36 }}>
                        <AddStepper small qty={qty} onAdd={() => addToCart(line)} onInc={() => addToCart(line)} onDec={() => decCart(p.id)} />
                      </View>
                      <Text style={{ marginTop: 20, fontFamily: F.bold, fontSize: 9.5, color: colors.ink3, textAlign: "center" }}>{p.unit} • customizable</Text>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
