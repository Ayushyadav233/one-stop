/**
 * Categories tab — RN port of web src/components/categories.tsx.
 * Deltas (rest-state pixels identical):
 * - Sticky web header → fixed header above ScrollView (same look).
 * - motion entrance → entering FadeIn (plays on mount).
 * - Featured rail: horizontal ScrollView with snapToInterval (same).
 * - Grid: flexWrap 2-col (same).
 * - CategoryDetail: full-screen overlay with SlideInRight (web: full-screen sheet).
 * - card/shadow-card → colors.card + border + soft shadow (theme-aware).
 */
import { useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Mic,
  Package,
  ScanSearch,
  Search,
  Sparkles,
  Store as StoreIcon,
} from "lucide-react-native";
import { type CategoryDef } from "@/lib/data";
import { activeCategories, blip, useMarketplace, useOSB } from "@/lib/osb-store";
import { useTheme } from "@/theme/ThemeProvider";
import { F, Img, SectionHead } from "./ui";
import { BlinkitCard, ZomatoCard } from "./customer";

export function CategoriesTab({ onStore }: { onStore: (id: string) => void }) {
  const set = useOSB((s) => s.set);
  const extraCategories = useOSB((s) => s.extraCategories);
  const hiddenCategories = useOSB((s) => s.hiddenCategories);
  const { colors } = useTheme();
  const [open, setOpen] = useState<CategoryDef | null>(null);
  const list = useMemo(() => activeCategories(), [extraCategories, hiddenCategories]);
  const featured = list.filter((c) => c.featured);
  const { stores } = useMarketplace();

  const openCat = (c: CategoryDef) => {
    setOpen(c);
    blip(640);
  };

  const countFor = (c: CategoryDef) => stores.filter((s) => c.kinds.includes(s.kind)).length;

  const W = Dimensions.get("window").width;
  const featW = Math.round(W * 0.78);

  return (
    <View style={{ flex: 1, backgroundColor: colors.app }}>
      {/* fixed header (web: sticky) */}
      <View style={{ backgroundColor: colors.surface, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5, color: colors.ink }}>Categories</Text>
          <Text style={{ marginTop: 2, fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>
            {list.length} categories • new ones added without app updates
          </Text>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Pressable
            onPress={() => set({ tab: "search" })}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderRadius: 14,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.line,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Search size={18} strokeWidth={2.6} color={colors.brand} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.medium, fontSize: 13.5, color: colors.ink3 }}>
              Search any category, store or product…
            </Text>
            <Mic size={16} color={colors.ink2} />
            <ScanSearch size={16} color={colors.ink2} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        {/* featured mega cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={featW + 10}
          decelerationRate="fast"
          contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 12 }}
        >
          {featured.map((c, i) => (
            <Animated.View key={c.k} entering={FadeIn.delay(i * 50)} style={{ width: featW, height: 132, borderRadius: 20, overflow: "hidden" }}>
              <Pressable onPress={() => openCat(c)} style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                  {c.img ? (
                    <Img src={c.img} eager={i < 2} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} />
                  ) : (
                    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#111" }}>
                      <Text style={{ fontSize: 60 }}>{c.emoji}</Text>
                    </View>
                  )}
                  <LinearGradient colors={["rgba(0,0,0,.8)", "rgba(0,0,0,.35)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                  <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "62%", justifyContent: "center", padding: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Sparkles size={11} color="rgba(255,255,255,.7)" />
                      <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.6, color: "rgba(255,255,255,.7)" }}>
                        {c.dynamic ? "Just added" : "Featured"}
                      </Text>
                    </View>
                    <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 21, lineHeight: 22, color: "#fff" }}>{c.t}</Text>
                    <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 11.5, color: "rgba(255,255,255,.75)" }}>
                      {countFor(c)} stores • {c.eta}
                    </Text>
                    <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#000" }}>Explore</Text>
                      <ArrowRight size={12} color="#000" />
                    </View>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>

        {/* full grid */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <SectionHead title="All categories" sub="Tap to see stores, products & subcategories" />
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {list.map((c, i) => {
              const n = countFor(c);
              return (
                <Animated.View
                  key={c.k}
                  entering={FadeIn.delay(Math.min((i % 6) * 40, 200))}
                  style={{
                    width: "48%",
                    flexGrow: 1,
                    borderRadius: 18,
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.line,
                    overflow: "hidden",
                  }}
                >
                  <Pressable onPress={() => openCat(c)}>
                    <View style={{ position: "relative", height: 92 }}>
                      {c.img ? (
                        <Img src={c.img} style={{ width: "100%", height: "100%" }} />
                      ) : (
                        <View style={{ height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: `${c.accent}22` }}>
                          <Text style={{ fontSize: 44 }}>{c.emoji}</Text>
                        </View>
                      )}
                      <View style={{ position: "absolute", right: 8, top: 8, height: 28, width: 28, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "rgba(255,255,255,.92)" }}>
                        <Text style={{ fontSize: 13 }}>{c.emoji}</Text>
                      </View>
                      {c.dynamic ? (
                        <View style={{ position: "absolute", left: 8, top: 8, borderRadius: 6, backgroundColor: "#7C5CFF", paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontFamily: F.extra, fontSize: 9, letterSpacing: 0.8, color: "#fff" }}>NEW</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ padding: 12 }}>
                      <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 13.5, lineHeight: 16, color: colors.ink }}>{c.t}</Text>
                      <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{c.sub}</Text>
                      <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: `${c.accent}22`, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <StoreIcon size={10} color={c.accent} />
                          <Text style={{ fontFamily: F.extra, fontSize: 10, color: c.accent }}>{n} stores</Text>
                        </View>
                        <Text style={{ fontFamily: F.bold, fontSize: 10, color: colors.ink3 }}>⚡ {c.eta}</Text>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
          <Pressable
            onPress={() => set({ tab: "profile" })}
            style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: colors.line, padding: 16 }}
          >
            <View style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(124,92,255,.12)" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 18, color: "#7C5CFF" }}>＋</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Missing a category?</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>Local providers can request one — CEO approves it live.</Text>
            </View>
            <ChevronRight size={16} color={colors.ink3} />
          </Pressable>
        </View>
      </ScrollView>

      {/* category detail sheet */}
      {open && <CategoryDetail c={open} onClose={() => setOpen(null)} onStore={onStore} />}
    </View>
  );
}

function CategoryDetail({ c, onClose, onStore }: { c: CategoryDef; onClose: () => void; onStore: (id: string) => void }) {
  const [sub, setSub] = useState<string>("All");
  const { colors } = useTheme();
  const { stores: allStores, products: allProducts } = useMarketplace();
  const stores = useMemo(() => allStores.filter((s) => c.kinds.includes(s.kind)), [c, allStores]);
  const products = useMemo(() => {
    const ids = new Set(stores.map((s) => s.id));
    return allProducts.filter((p) => ids.has(p.storeId)).slice(0, 12);
  }, [stores, allProducts]);

  return (
    <Animated.View
      entering={SlideInRight.springify().stiffness(210).damping(28)}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: colors.app }}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={{ position: "relative", height: 190 }}>
          {c.img ? (
            <Img src={c.img} eager style={{ width: "100%", height: "100%" }} />
          ) : (
            <View style={{ height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#111" }}>
              <Text style={{ fontSize: 90 }}>{c.emoji}</Text>
            </View>
          )}
          <LinearGradient colors={["rgba(0,0,0,.3)", "rgba(0,0,0,.2)", "rgba(0,0,0,.75)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <Pressable
            onPress={onClose}
            style={{ position: "absolute", left: 12, top: 16, height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "rgba(255,255,255,.95)" }}
          >
            <ArrowLeft size={17} color="#111" />
          </Pressable>
          <View style={{ position: "absolute", left: 16, right: 16, bottom: 12 }}>
            <View style={{ alignSelf: "flex-start", borderRadius: 6, backgroundColor: c.accent, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.4, color: "#fff" }}>{c.eta} delivery</Text>
            </View>
            <Text style={{ marginTop: 6, fontFamily: F.extra, fontSize: 26, lineHeight: 28, color: "#fff" }}>{c.t}</Text>
            <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,.8)" }}>
              {c.sub} • {stores.length} stores near you
            </Text>
          </View>
        </View>

        {c.subs.length > 0 && (
          <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
              {["All", ...c.subs].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => {
                    setSub(s);
                    blip(580);
                  }}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    backgroundColor: sub === s ? c.accent : colors.card,
                    borderWidth: 1,
                    borderColor: sub === s ? c.accent : colors.line,
                  }}
                >
                  <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: sub === s ? "#fff" : colors.ink2 }}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, backgroundColor: `${c.accent}1F`, padding: 12 }}>
            <Package size={16} color={c.accent} />
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: colors.ink }}>
              {products.length} products & {stores.length} local businesses
            </Text>
          </View>
        </View>

        {products.length > 0 && (
          <View style={{ paddingTop: 16 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <SectionHead title={`Top picks in ${c.t}`} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 10 }}>
              {products.map((p, i) => (
                <BlinkitCard key={p.id} pid={p.id} index={i} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <SectionHead title="Stores" sub="Delivered by the store's own team" />
          <View style={{ marginTop: 12, gap: 16 }}>
            {stores.map((s, i) => (
              <ZomatoCard key={s.id} id={s.id} index={i} onOpen={() => onStore(s.id)} />
            ))}
          </View>
          {stores.length === 0 && (
            <View style={{ marginTop: 8, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 32, alignItems: "center" }}>
              <Text style={{ fontSize: 44 }}>{c.emoji}</Text>
              <Text style={{ marginTop: 8, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>Stores joining soon</Text>
              <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12, color: colors.ink3, textAlign: "center" }}>
                Local {c.t.toLowerCase()} businesses are being onboarded in HSR.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
}
