/**
 * Provider flow — RN port of web src/components/provider.tsx.
 * Deltas (rest-state pixels identical):
 * - framer-motion enter/exit → Animated FadeIn entering (plays on mount).
 * - Revenue hero grain overlay skipped (visual-only, no RN equivalent).
 * - Tables/none — orders render as stacked card rows (same as web).
 * - Call buttons blip only (web `call` helper also only blips).
 * - ProviderMore renders SellerManage from ./seller (lands in parallel).
 */
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  ArrowUpRight,
  Bell,
  Bike,
  Bot,
  Check,
  ChevronRight,
  Clock,
  Eye,
  MapPin,
  Phone,
  Plus,
  Power,
  Search,
  Star,
  Truck,
  Wallet,
  X,
} from "lucide-react-native";
import { WEEKLY, inr } from "@/lib/data";
import { blip, useOSB, type SellerOrder, type SellerOrderStatus } from "@/lib/osb-store";
import { useTheme } from "@/theme/ThemeProvider";
import { AreaGraph, F, Glass, Img, LiveDot, Ring, SectionHead, SpringBtn } from "./ui";
import { ProviderCatalogSheet } from "./provider-catalog";
import { SellerManage } from "./seller";

export function ProviderDash() {
  const { colors } = useTheme();
  const { set, seller, catalog, ensureCatalog, sellerOrders, team } = useOSB();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const pendingReq = useOSB((s) => s.catRequests.filter((r) => r.status === "pending").length);
  const vacation = seller.vacationUntil !== "";

  useEffect(() => { ensureCatalog(); }, [ensureCatalog]);

  const live = sellerOrders.filter((o) => o.status !== "cancelled");
  const revenue = live.reduce((a, o) => a + o.total, 0);
  const newOrders = sellerOrders.filter((o) => o.status === "new");
  const activeOrders = sellerOrders.filter((o) => ["accepted", "preparing", "ready", "onway"].includes(o.status));
  const lowStock = catalog.filter((p) => p.stock <= 15 && p.stock > 0);
  const outStock = catalog.filter((p) => p.stock === 0);
  const codPending = sellerOrders.filter((o) => o.payment === "COD" && o.status !== "delivered" && o.status !== "cancelled").reduce((a, o) => a + o.total, 0);

  const quick: [string, string, string, string, number?][] = [
    ["🧾", "Orders", "porders", `${newOrders.length} new`, newOrders.length],
    ["📦", "Catalog", "catalog", `${catalog.length} items`],
    ["📒", "Khata", "khata", "Sales • Udhaar"],
    ["🎟️", "Marketing", "marketing", "Coupons live"],
    ["🛵", "Delivery", "more", `${seller.radiusKm} km range`],
    ["👥", "Team", "more", `${team.filter((t) => t.active).length} active`],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.app }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 176 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Glass strong style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
            <Pressable onPress={() => set({ tab: "more" })} style={{ height: 44, width: 44, borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(0,0,0,.1)", alignItems: "center", justifyContent: "center" }}>
              {seller.coverImage ? <Img src={seller.coverImage} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 18 }}>🛍️</Text>}
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{seller.name}</Text>
              <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 11.5, color: colors.ink3 }}>
                {seller.storeOpen && !vacation ? `Open • till ${seller.closeTime}` : vacation ? `Vacation till ${seller.vacationUntil}` : "Closed"} • {seller.radiusKm} km live
              </Text>
            </View>
            <Pressable onPress={() => set({ tab: "porders" })} style={{ position: "relative", height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.chip }}>
              <Bell size={17} color={colors.ink} />
              {newOrders.length > 0 && (
                <View style={{ position: "absolute", right: -4, top: -4, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#E23744", paddingHorizontal: 4 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#fff" }}>{newOrders.length}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => useOSB.getState().setSeller({ storeOpen: !seller.storeOpen })}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: seller.storeOpen ? "#0C831F" : "rgba(0,0,0,.15)", paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Power size={13} color={seller.storeOpen ? "#fff" : colors.ink2} />
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: seller.storeOpen ? "#fff" : colors.ink2 }}>{seller.storeOpen ? "Live" : "Off"}</Text>
            </Pressable>
          </Glass>
          {vacation && (
            <Animated.View entering={FadeIn} style={{ marginTop: 8, borderRadius: 16, backgroundColor: "rgba(251,191,36,.2)", borderWidth: 1, borderColor: "rgba(251,191,36,.4)", padding: 12 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: "#92400E" }}>🏖️ Vacation till {seller.vacationUntil} — store hidden from customers. Change in Manage → Hours.</Text>
            </Animated.View>
          )}
        </View>

        {/* revenue hero — live */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={{ position: "relative", borderRadius: 26, backgroundColor: "#111117", padding: 20, overflow: "hidden" }}>
            <View style={{ position: "absolute", right: -40, top: -40, height: 176, width: 176, borderRadius: 88, backgroundColor: "rgba(248,203,70,.2)" }} />
            <View style={{ position: "absolute", left: -40, bottom: -48, height: 176, width: 176, borderRadius: 88, backgroundColor: "rgba(124,92,255,.25)" }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <LiveDot color="#34D399" />
                  <Text style={{ fontFamily: F.extra, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,.55)" }}>TODAY • LIVE</Text>
                </View>
                <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 36, letterSpacing: -1, color: "#fff" }}>{inr(revenue)}</Text>
                <View style={{ marginTop: 6, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "rgba(31,182,124,.2)", paddingHorizontal: 10, paddingVertical: 4 }}>
                  <ArrowUpRight size={13} color="#7DFFB8" />
                  <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#7DFFB8" }}>{live.length} orders • avg {inr(live.length ? Math.round(revenue / live.length) : 0)}</Text>
                </View>
              </View>
              <Ring pct={94} size={92} />
            </View>
            <View style={{ marginTop: 16, flexDirection: "row", gap: 8 }}>
              {[
                ["New", String(newOrders.length), newOrders.length ? "needs accept" : "all clear", "#F8CB46"],
                ["Active", String(activeOrders.length), "in kitchen/way", "#7DFFB8"],
                ["COD due", inr(codPending), "collect on delivery", "#FFB86B"],
              ].map(([l, v, d, c]) => (
                <Pressable key={l as string} onPress={() => set({ tab: "porders" })} style={{ flex: 1, borderRadius: 16, backgroundColor: "rgba(255,255,255,.08)", padding: 12 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1, color: "rgba(255,255,255,.55)" }}>{(l as string).toUpperCase()}</Text>
                  <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 16, color: c as string }}>{v}</Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 10, color: "rgba(255,255,255,.6)" }}>{d}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* new order alert */}
        {newOrders.length > 0 && (
          <Animated.View entering={FadeIn} style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <Pressable onPress={() => set({ tab: "porders" })} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, backgroundColor: "#E23744", padding: 14 }}>
              <View style={{ position: "relative", height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(255,255,255,.15)" }}>
                <Text style={{ fontSize: 20 }}>🛎️</Text>
                <View style={{ position: "absolute", right: -4, top: -4, height: 20, width: 20, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#fff" }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#E23744" }}>{newOrders.length}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: "#fff" }}>{newOrders.length} new order{newOrders.length > 1 ? "s" : ""} waiting!</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,.75)" }}>Accept fast — customers see live status</Text>
              </View>
              <ChevronRight size={18} color="#fff" />
            </Pressable>
          </Animated.View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={{ borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>This week</Text>
                <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>Peak Fri 8 PM • self-delivered</Text>
              </View>
              <View style={{ borderRadius: 999, backgroundColor: "rgba(12,131,31,.1)", paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#0C831F" }}>+18.2%</Text>
              </View>
            </View>
            <View style={{ marginTop: 8 }}>
              <AreaGraph values={WEEKLY.map((w) => w.v)} color="#0C831F" />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {WEEKLY.map((w, i) => (
                <Text key={i} style={{ fontFamily: F.extra, fontSize: 10.5, color: colors.ink3 }}>{w.d}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Business Khata entry */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <SpringBtn onPress={() => { set({ tab: "khata" }); blip(700); }} style={{ position: "relative", borderRadius: 20, backgroundColor: "#0E3B2E", padding: 16, overflow: "hidden" }}>
            <View style={{ position: "absolute", right: -32, top: -32, height: 128, width: 128, borderRadius: 64, backgroundColor: "rgba(216,243,78,.2)" }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#D8F34E" }}>
                <Text style={{ fontSize: 20 }}>📒</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 14.5, color: "#fff" }}>Business Khata</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,.7)" }}>Sales • Purchases • Udhaar • Expenses • Reports</Text>
              </View>
              <ChevronRight size={18} color="#fff" />
            </View>
          </SpringBtn>
        </View>

        {/* quick nav */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <SectionHead title="Manage" sub="Everything a shopkeeper needs" />
          <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {quick.map(([e, l, t, s, badge]) => (
              <Pressable key={l} onPress={() => { set({ tab: t }); blip(660); }} style={{ position: "relative", width: "31.5%", borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: "center" }}>
                {badge ? (
                  <View style={{ position: "absolute", right: 8, top: 8, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#E23744", paddingHorizontal: 4 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#fff" }}>{badge}</Text>
                  </View>
                ) : null}
                <Text style={{ fontSize: 24 }}>{e}</Text>
                <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{l}</Text>
                <Text style={{ fontFamily: F.semi, fontSize: 10, color: colors.ink3, textAlign: "center" }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {catalog.length === 0 && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 20, alignItems: "center" }}>
              <Text style={{ fontSize: 40 }}>📦</Text>
              <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>Your shelf is empty</Text>
              <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12, color: colors.ink2, textAlign: "center" }}>
                Customers won’t see your store until you list at least one product in {seller.categories.join(", ") || "your category"}.
              </Text>
              <Pressable onPress={() => set({ tab: "catalog" })} style={{ marginTop: 12, borderRadius: 999, backgroundColor: "#0C831F", paddingHorizontal: 20, paddingVertical: 10 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#fff" }}>Add first product</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* low stock */}
        {(lowStock.length > 0 || outStock.length > 0) && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <SectionHead
              title="Needs restock"
              sub={`${lowStock.length + outStock.length} items`}
              action={
                <Pressable onPress={() => set({ tab: "catalog" })}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#E8830C" }}>Fix now ›</Text>
                </Pressable>
              }
            />
            <View style={{ marginTop: 10, gap: 8 }}>
              {[...outStock, ...lowStock].slice(0, 3).map((p) => (
                <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
                  <View style={{ height: 44, width: 44, borderRadius: 12, overflow: "hidden", backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
                    {p.image ? <Img src={p.image} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 20 }}>{p.emoji}</Text>}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{p.name}</Text>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: p.stock === 0 ? "#E23744" : "#E8830C" }}>
                      {p.stock === 0 ? "Out of stock — hidden from buyers" : `${p.stock} left — low`}
                    </Text>
                  </View>
                  <Pressable onPress={() => { useOSB.getState().bumpStock(p.id, 20); blip(820); }} style={{ borderRadius: 999, backgroundColor: "#0C831F", paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>+20</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* self delivery strip */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Pressable onPress={() => set({ tab: "more" })} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: "#111117", padding: 16 }}>
            <View style={{ height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#F8CB46" }}>
              <Text style={{ fontSize: 22 }}>🛵</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: "#fff" }}>Self-delivery • {seller.radiusKm} km range</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,.6)" }}>{seller.riders.length} riders • ₹{seller.deliveryFee} fee • free above ₹{seller.freeAbove}</Text>
            </View>
            <ChevronRight size={17} color="rgba(255,255,255,.6)" />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <SpringBtn onPress={() => setCatalogOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: "#7C5CFF", padding: 16 }}>
            <View style={{ height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "rgba(255,255,255,.16)" }}>
              <Bot size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Add a product with AI</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: "rgba(255,255,255,.75)" }}>Auto category, attributes & variants</Text>
            </View>
            <View style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "#fff" }}>
              <Plus size={18} strokeWidth={3} color="#7C5CFF" />
            </View>
          </SpringBtn>
          {pendingReq > 0 && (
            <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, backgroundColor: "rgba(124,92,255,.1)", padding: 12 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: "#5A44D6" }}>🕒 {pendingReq} category request{pendingReq > 1 ? "s" : ""} awaiting CEO approval</Text>
            </View>
          )}
          <SpringBtn onPress={() => set({ mode: "customer", tab: "home" })} style={{ marginTop: 12, borderRadius: 999, backgroundColor: colors.chip, paddingVertical: 14, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>← Back to Customer view</Text>
          </SpringBtn>
        </View>
      </ScrollView>
      <ProviderCatalogSheet open={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </View>
  );
}

/* ═══════ ORDERS — self-delivery manager ═══════ */
const STAGE_META: Record<SellerOrderStatus, { t: string; c: string }> = {
  new: { t: "New", c: "#E23744" },
  accepted: { t: "Accepted", c: "#1573FF" },
  preparing: { t: "Preparing", c: "#7C5CFF" },
  ready: { t: "Ready", c: "#E8830C" },
  onway: { t: "On the way", c: "#0C831F" },
  delivered: { t: "Delivered", c: "#0C831F" },
  cancelled: { t: "Cancelled", c: "#8C8C99" },
};

export function ProviderOrders() {
  const { colors } = useTheme();
  const { sellerOrders, seller } = useOSB();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const counts = {
    all: sellerOrders.length,
    new: sellerOrders.filter((o) => o.status === "new").length,
    active: sellerOrders.filter((o) => ["accepted", "preparing", "ready", "onway"].includes(o.status)).length,
    delivered: sellerOrders.filter((o) => o.status === "delivered").length,
    cancelled: sellerOrders.filter((o) => o.status === "cancelled").length,
  };
  const list = sellerOrders.filter((o) => {
    if (filter === "new" && o.status !== "new") return false;
    if (filter === "active" && !["accepted", "preparing", "ready", "onway"].includes(o.status)) return false;
    if (filter === "delivered" && o.status !== "delivered") return false;
    if (filter === "cancelled" && o.status !== "cancelled") return false;
    if (q && !(o.code.toLowerCase().includes(q.toLowerCase()) || o.customer.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  const codDue = sellerOrders.filter((o) => o.payment === "COD" && o.status !== "delivered" && o.status !== "cancelled").reduce((a, o) => a + o.total, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.app }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 176 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5, color: colors.ink }}>Orders</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>You pack it • your staff delivers it</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: "#111114", paddingHorizontal: 12, paddingVertical: 8 }}>
            <Bike size={13} color="#fff" />
            <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>{seller.riders.length} riders</Text>
          </View>
        </View>
        <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
          {[["New", counts.new, "#E23744"], ["Active", counts.active, "#7C5CFF"], ["COD due", inr(codDue), "#E8830C"]].map(([l, v, c]) => (
            <View key={l as string} style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: "center" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1, color: colors.ink3 }}>{(l as string).toUpperCase()}</Text>
              <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 17, color: c as string }}>{v as string | number}</Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Search size={15} color={colors.ink3} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search order id or customer…"
            placeholderTextColor={colors.ink3}
            style={{ flex: 1, fontFamily: F.semi, fontSize: 13, color: colors.ink, paddingVertical: 8 }}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginTop: 8, gap: 6 }}>
          {[["all", `All ${counts.all}`], ["new", `New ${counts.new}`], ["active", `Active ${counts.active}`], ["delivered", `Delivered ${counts.delivered}`], ["cancelled", `Cancelled ${counts.cancelled}`]].map(([k, t]) => (
            <Pressable
              key={k}
              onPress={() => setFilter(k)}
              style={{
                borderRadius: 999,
                backgroundColor: filter === k ? colors.ink : colors.card,
                borderWidth: 1,
                borderColor: filter === k ? colors.ink : colors.line,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: filter === k ? colors.app : colors.ink2 }}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ marginTop: 12, gap: 10 }}>
          {list.map((o, i) => {
            const m = STAGE_META[o.status];
            const expanded = open === o.id;
            const outOfRange = o.distanceKm > seller.radiusKm;
            return (
              <Animated.View entering={FadeIn.delay(Math.min(i * 40, 250))} key={o.id} style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
                <Pressable onPress={() => { setOpen(expanded ? null : o.id); blip(560); }} style={{ padding: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: m.c }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 16, color: "#fff" }}>{o.customer[0]}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{o.code}</Text>
                        <View style={{ borderRadius: 999, backgroundColor: m.c, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: "#fff" }}>{m.t}</Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} style={{ marginTop: 2, fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>
                        {o.customer} • {o.items.map((it) => `${it.qty}× ${it.name}`).join(", ").slice(0, 44)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>{inr(o.total)}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                        <Clock size={9} color={colors.ink3} />
                        <Text style={{ fontFamily: F.bold, fontSize: 10, color: colors.ink3 }}>{o.placedAt}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <View style={{ borderRadius: 6, backgroundColor: o.payment === "COD" ? "rgba(251,191,36,.25)" : "rgba(12,131,31,.12)", paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 10, color: o.payment === "COD" ? "#92400E" : "#0C831F" }}>
                        {o.payment}{o.payment === "COD" ? " • collect cash" : " • prepaid"}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2, borderRadius: 6, backgroundColor: outOfRange ? "rgba(226,55,68,.12)" : "rgba(0,0,0,.06)", paddingHorizontal: 6, paddingVertical: 2 }}>
                      <MapPin size={9} color={outOfRange ? "#E23744" : colors.ink2} />
                      <Text style={{ fontFamily: F.extra, fontSize: 10, color: outOfRange ? "#E23744" : colors.ink2 }}>
                        {o.distanceKm} km{outOfRange ? " • outside range!" : ""}
                      </Text>
                    </View>
                    {o.rider && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 2, borderRadius: 6, backgroundColor: "rgba(21,115,255,.12)", paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Truck size={9} color="#1573FF" />
                        <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#1573FF" }}>{o.rider.split(" ")[0]}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>

                {expanded && (
                  <Animated.View entering={FadeIn} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 14, paddingVertical: 12 }}>
                    {o.note ? (
                      <View style={{ marginBottom: 8, borderRadius: 10, backgroundColor: "rgba(226,55,68,.08)", padding: 10 }}>
                        <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: "#E23744" }}>⚠️ {o.note}</Text>
                      </View>
                    ) : null}
                    <View style={{ gap: 4 }}>
                      {o.items.map((it, idx) => (
                        <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: colors.ink }}>{it.qty} × {it.name}</Text>
                          <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{inr(it.qty * it.price)}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{ marginTop: 8, gap: 2, borderTopWidth: 1, borderTopColor: colors.line, borderStyle: "dashed", paddingTop: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>Subtotal</Text>
                        <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: colors.ink2 }}>{inr(o.subtotal)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>Your delivery fee</Text>
                        <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: colors.ink2 }}>{o.fee === 0 ? "FREE" : inr(o.fee)}</Text>
                      </View>
                      {o.discount > 0 && (
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: "#0C831F" }}>Coupon OFF</Text>
                          <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: "#0C831F" }}>−{inr(o.discount)}</Text>
                        </View>
                      )}
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>Total</Text>
                        <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>{inr(o.total)}</Text>
                      </View>
                    </View>
                    <View style={{ marginTop: 10, borderRadius: 12, backgroundColor: colors.chip, padding: 12 }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: colors.ink }}>{o.customer} • {o.phone}</Text>
                      <Text style={{ marginTop: 2, fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>{o.address}</Text>
                    </View>
                    {(o.status === "ready" || o.status === "onway") && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ marginBottom: 6, fontFamily: F.extra, fontSize: 10, letterSpacing: 1, color: colors.ink3 }}>ASSIGN MY RIDER</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                          {seller.riders.map((r) => (
                            <Pressable
                              key={r.name}
                              onPress={() => { useOSB.getState().assignRider(o.id, r.name); blip(700); }}
                              style={{ borderRadius: 999, backgroundColor: o.rider === r.name ? "#1573FF" : colors.chip, paddingHorizontal: 12, paddingVertical: 6 }}
                            >
                              <Text style={{ fontFamily: F.extra, fontSize: 11, color: o.rider === r.name ? "#fff" : colors.ink2 }}>
                                {o.rider === r.name ? "✓ " : ""}{r.name}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                    <OrderActions o={o} />
                    {o.status === "delivered" && (
                      <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, backgroundColor: "rgba(12,131,31,.1)", padding: 10 }}>
                        <Check size={14} color="#0C5B21" />
                        <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 11.5, color: "#0C5B21" }}>
                          Delivered{o.rider ? ` by ${o.rider}` : ""}{o.rating ? ` • rated ${o.rating}` : " • awaiting rating"}
                        </Text>
                        {o.rating ? <Star size={11} fill="#0C5B21" color="#0C5B21" /> : null}
                      </View>
                    )}
                  </Animated.View>
                )}
              </Animated.View>
            );
          })}
          {list.length === 0 && (
            <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 32, alignItems: "center" }}>
              <Text style={{ fontSize: 44 }}>🧾</Text>
              <Text style={{ marginTop: 8, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>No orders here</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 12, color: colors.ink3 }}>New orders pop up automatically with sound.</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
          <Wallet size={16} color="#0C831F" />
          <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 11.5, lineHeight: 17, color: colors.ink2 }}>
            Prepaid money settles to your bank next day. <Text style={{ fontFamily: F.extra, color: colors.ink }}>COD cash stays with your rider</Text> — no platform cut, ever.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function OrderActions({ o }: { o: SellerOrder }) {
  const { colors } = useTheme();
  const { updateOrderStatus, assignRider, seller } = useOSB();
  const go = (s: SellerOrderStatus, f = 880) => { updateOrderStatus(o.id, s); blip(f, 0.12); };
  const call = () => blip(660);
  const btnBase = { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 6, borderRadius: 12, paddingVertical: 12 };
  const btnLabel = (c: string) => ({ fontFamily: F.extra, fontSize: 12.5, color: c });
  if (o.status === "new") return (
    <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
      <Pressable onPress={() => go("cancelled", 400)} style={[btnBase, { backgroundColor: colors.chip }]}>
        <X size={15} color="#E23744" />
        <Text style={btnLabel("#E23744")}>Reject</Text>
      </Pressable>
      <Pressable onPress={call} style={[btnBase, { backgroundColor: colors.chip }]}>
        <Phone size={14} color={colors.ink} />
        <Text style={btnLabel(colors.ink)}>Call</Text>
      </Pressable>
      <Pressable onPress={() => go("preparing")} style={[btnBase, { backgroundColor: "#0C831F" }]}>
        <Check size={15} color="#fff" />
        <Text style={btnLabel("#fff")}>Accept</Text>
      </Pressable>
    </View>
  );
  if (o.status === "accepted" || o.status === "preparing") return (
    <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
      <Pressable onPress={call} style={[btnBase, { backgroundColor: colors.chip }]}>
        <Phone size={14} color={colors.ink} />
        <Text style={btnLabel(colors.ink)}>Call</Text>
      </Pressable>
      <Pressable onPress={() => go(o.status === "accepted" ? "preparing" : "ready")} style={[btnBase, { flex: 2, backgroundColor: "#7C5CFF" }]}>
        <Text style={btnLabel("#fff")}>{o.status === "accepted" ? "Start preparing" : "Mark ready for pickup"}</Text>
        <ChevronRight size={15} color="#fff" />
      </Pressable>
    </View>
  );
  if (o.status === "ready") return (
    <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
      <Pressable onPress={call} style={[btnBase, { backgroundColor: colors.chip }]}>
        <Phone size={14} color={colors.ink} />
        <Text style={btnLabel(colors.ink)}>Call</Text>
      </Pressable>
      <Pressable onPress={() => { if (!o.rider && seller.riders[0]) assignRider(o.id, seller.riders[0].name); go("onway"); }} style={[btnBase, { flex: 2, backgroundColor: "#E8830C" }]}>
        <Truck size={15} color="#fff" />
        <Text style={btnLabel("#fff")}>Start delivery (self)</Text>
      </Pressable>
    </View>
  );
  if (o.status === "onway") return (
    <View style={{ marginTop: 10 }}>
      {o.payment === "COD" && (
        <View style={{ marginBottom: 8, borderRadius: 10, backgroundColor: "rgba(251,191,36,.2)", padding: 10, alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#92400E" }}>💵 Collect {inr(o.total)} cash from customer</Text>
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={call} style={[btnBase, { backgroundColor: colors.chip }]}>
          <Phone size={14} color={colors.ink} />
          <Text style={btnLabel(colors.ink)}>Call</Text>
        </Pressable>
        <Pressable onPress={() => go("delivered", 990)} style={[btnBase, { flex: 2, backgroundColor: "#0C831F" }]}>
          <Check size={15} color="#fff" />
          <Text style={btnLabel("#fff")}>Mark delivered</Text>
        </Pressable>
      </View>
    </View>
  );
  return null;
}

export function ProviderMore() {
  return <SellerManage />;
}

export function EyeToggle({ hidden }: { hidden?: boolean }) {
  void hidden;
  return <Eye size={15} color="#8C8C99" />;
}
