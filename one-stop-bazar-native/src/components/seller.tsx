/**
 * Seller screens — RN port of web src/components/seller.tsx.
 * Deltas: framer-motion → Reanimated entering; inputs → TextInput; range sliders → steppers;
 * file upload → pool-sample picker (Phase 7: expo-image-picker); tables → card rows.
 */
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, SlideInDown, SlideInRight } from "react-native-reanimated";
import {
  BadgePercent,
  Bell,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Megaphone,
  Minus,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  Star,
  Store as StoreIcon,
  Ticket,
  Trash2,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react-native";
import { CATEGORIES, PRODUCTS, STORES, inr, type Product } from "@/lib/data";
import { blip, useOSB, DEFAULT_RIDER_PERMS, type RiderPerms } from "@/lib/osb-store";
import { timeAgo } from "@/lib/commerce";
import { useTheme } from "@/theme/ThemeProvider";
import { F, Img, SectionHead, VegMark } from "./ui";
import { ProviderCatalogSheet } from "./provider-catalog";

/* ── shared bits ── */
export function Tog({ on, onTap, small }: { on: boolean; onTap: () => void; small?: boolean }) {
  const { name } = useTheme();
  return (
    <Pressable
      onPress={() => {
        onTap();
        blip(on ? 420 : 760);
      }}
      style={{
        height: small ? 24 : 28,
        width: small ? 42 : 50,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 999,
        padding: 3,
        justifyContent: on ? "flex-end" : "flex-start",
        backgroundColor: on ? "#0C831F" : name === "dark" ? "rgba(255,255,255,.15)" : "rgba(0,0,0,.15)",
      }}
    >
      <View style={{ height: small ? 18 : 22, width: small ? 18 : 22, borderRadius: 999, backgroundColor: "#fff" }} />
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10 }}>
      <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.2, color: colors.ink3 }}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

interface FormCfg {
  placeholder: string;
  desc: string;
  units: string[];
  stock: string;
  showVeg: boolean;
  pool: string[];
  cover: string;
}

function formConfig(label: string, sellerCats: string[]): FormCfg {
  const def =
    CATEGORIES.find((c) => c.t === label || c.subs.includes(label)) ??
    CATEGORIES.find((c) => sellerCats.includes(c.k)) ??
    CATEGORIES[0];
  const storeIds = new Set(STORES.filter((s) => def.kinds.includes(s.kind)).map((s) => s.id));
  const pool = [...new Set(PRODUCTS.filter((x) => storeIds.has(x.storeId)).map((x) => x.image))].filter(Boolean);
  const byK: Record<string, Omit<FormCfg, "pool" | "cover">> = {
    food: { placeholder: "e.g. Chicken Dum Biryani", desc: "Describe taste, serves & spice level…", units: ["1 pc", "Serves 1", "Serves 2", "500 g", "1 kg"], stock: "20", showVeg: true },
    grocery: { placeholder: "e.g. Farm Fresh Tomatoes (1 kg)", desc: "Brand, weight, packaging & expiry…", units: ["500 g", "1 kg", "2 kg", "1 L", "1 pack"], stock: "50", showVeg: true },
    medical: { placeholder: "e.g. Paracetamol 500mg (10 tabs)", desc: "Dosage, prescription needed? manufacturer…", units: ["1 strip", "1 bottle", "1 kit", "60 tabs"], stock: "100", showVeg: false },
    bakery: { placeholder: "e.g. Chocolate Truffle Cake (500g)", desc: "Flavour, weight, eggless option, serves…", units: ["1 pc", "500 g", "1 box", "6 pcs"], stock: "15", showVeg: true },
    sweets: { placeholder: "e.g. Kaju Katli Box (500g)", desc: "Ingredients, weight, gift box option…", units: ["250 g", "500 g", "1 kg", "1 box"], stock: "20", showVeg: true },
    flowers: { placeholder: "e.g. Mixed Roses Bouquet (12 stems)", desc: "Flowers, stems, occasion & freshness…", units: ["1 bouquet", "10 stems", "12 stems"], stock: "12", showVeg: false },
    fashion: { placeholder: "e.g. Cotton Straight Kurti — Navy", desc: "Sizes available, material, colour, fit…", units: ["XS", "S", "M", "L", "XL", "XXL", "1 pc"], stock: "15", showVeg: false },
    beauty: { placeholder: "e.g. Vitamin C Face Serum 30ml", desc: "Brand, skin type, volume, vegan?…", units: ["30 ml", "50 ml", "1 pc", "Set of 3"], stock: "25", showVeg: false },
    electronics: { placeholder: "e.g. Wireless Headphones Pro", desc: "Brand, model, warranty & key specs…", units: ["1 unit", "1 pc", "1 set"], stock: "10", showVeg: false },
    mobile: { placeholder: "e.g. 65W Fast Charger + Type-C Cable", desc: "Brand, wattage, connector, warranty…", units: ["1 unit", "1 pc", "1 set"], stock: "20", showVeg: false },
    homekitchen: { placeholder: "e.g. Non-Stick Kadhai 24cm", desc: "Material, capacity, induction ready?…", units: ["1 pc", "Set of 3", "1 L"], stock: "12", showVeg: false },
    furniture: { placeholder: "e.g. Solid Wood Dining Chair", desc: "Material, dimensions, assembly, colour…", units: ["1 pc", "Set of 2", "Set of 4"], stock: "6", showVeg: false },
    hardware: { placeholder: "e.g. Cordless Drill Kit 18V", desc: "Brand, model, warranty, contents…", units: ["1 kit", "1 pc", "1 L"], stock: "8", showVeg: false },
    books: { placeholder: "e.g. Hardbound A5 Journal (200 pages)", desc: "Author/brand, pages, language…", units: ["1 pc", "Pack of 2", "Set"], stock: "30", showVeg: false },
    toys: { placeholder: "e.g. Soft Plush Bear 40cm", desc: "Age group, material, safety certified…", units: ["1 pc", "1 set"], stock: "20", showVeg: false },
    pets: { placeholder: "e.g. Adult Dog Food — Chicken 3kg", desc: "Brand, flavour, life stage, weight…", units: ["500 g", "1 kg", "3 kg", "1 pc"], stock: "18", showVeg: false },
    sports: { placeholder: "e.g. PVC Dumbbell Set (20kg)", desc: "Weight, material, grip, in-box items…", units: ["1 pc", "1 set", "2 kg"], stock: "10", showVeg: false },
    auto: { placeholder: "e.g. Magnetic Car Phone Mount", desc: "Compatibility, brand, warranty…", units: ["1 pc", "1 kit", "Set of 2"], stock: "20", showVeg: false },
    household: { placeholder: "e.g. Liquid Detergent Family Pack 2L", desc: "Brand, volume, machine type…", units: ["1 L", "2 L", "1 pack", "3 pcs"], stock: "40", showVeg: false },
    service: { placeholder: "e.g. 60-min Signature Facial", desc: "Duration, what’s included, requirements…", units: ["30 min", "60 min", "1 visit"], stock: "99", showVeg: false },
  };
  const base = byK[def.k] ?? { placeholder: "e.g. Product name", desc: "Describe material, size & key details…", units: ["1 pc", "1 pack", "1 set"], stock: "20", showVeg: false };
  return { ...base, pool: pool.length ? pool : def.img ? [def.img] : [], cover: def.img };
}

/* ═══════════ CATALOG ═══════════ */
export function SellerCatalog() {
  const catalog = useOSB((s) => s.catalog);
  const ensureCatalog = useOSB((s) => s.ensureCatalog);
  const { colors, name } = useTheme();
  const [tab, setTab] = useState<"items" | "cats">("items");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    ensureCatalog();
  }, [ensureCatalog]);

  const list = useMemo(() => {
    return catalog.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "live") return !p.hidden && p.stock > 0;
      if (filter === "hidden") return !!p.hidden;
      if (filter === "low") return p.stock > 0 && p.stock <= 15;
      if (filter === "out") return p.stock === 0;
      return true;
    });
  }, [catalog, q, filter]);

  const live = catalog.filter((p) => !p.hidden).length;
  const stockVal = catalog.reduce((a, p) => a + p.price * p.stock, 0);
  const activeTabBg = name === "dark" ? "#fff" : "#111114";
  const activeTabFg = name === "dark" ? "#111114" : "#fff";

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 176 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5, color: colors.ink }}>Catalog</Text>
        <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>
          {catalog.length} products • {live} live • stock worth {inr(stockVal)}
        </Text>
        <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
          {(["items", "cats"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{ flex: 1, borderRadius: 13, paddingVertical: 10, alignItems: "center", backgroundColor: tab === t ? activeTabBg : colors.card, borderWidth: 1, borderColor: colors.line }}
            >
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: tab === t ? activeTabFg : colors.ink2 }}>
                {t === "items" ? "My products" : "Store categories"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === "items" && (
        <View>
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Search size={15} color={colors.ink3} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search your products…" placeholderTextColor={colors.ink3} style={{ flex: 1, fontFamily: F.semi, fontSize: 13, color: colors.ink, paddingVertical: 8 }} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginTop: 8, gap: 6 }}>
              {[["all", "All"], ["live", "Live"], ["low", "Low stock"], ["out", "Out of stock"], ["hidden", "Hidden"]].map(([k, t]) => (
                <Pressable key={k} onPress={() => setFilter(k)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: filter === k ? "#0C831F" : colors.card, borderWidth: 1, borderColor: colors.line }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 11, color: filter === k ? "#fff" : colors.ink2 }}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
            {list.map((p) => (
              <ProductRow key={p.id} p={p} onEdit={() => setEditing(p)} />
            ))}
            {list.length === 0 && (
              <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 32, alignItems: "center" }}>
                <Text style={{ fontSize: 44 }}>📦</Text>
                <Text style={{ marginTop: 8, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>No products here</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: colors.ink3 }}>{q ? "Try a different search." : "Add your first product with AI in 30 seconds."}</Text>
              </View>
            )}
          </View>
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <Pressable onPress={() => setAiOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: "#7C5CFF", padding: 14 }}>
              <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center" }}>
                <Bot size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: "#fff" }}>Add product with AI</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,.75)" }}>Auto category + attributes</Text>
              </View>
              <Plus size={18} strokeWidth={3} color="#fff" />
            </Pressable>
            <Pressable onPress={() => setEditing("new")} style={{ marginTop: 8, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>＋ Add manually</Text>
            </Pressable>
          </View>
        </View>
      )}

      {tab === "cats" && <StoreCategories />}

      {editing && <ProductSheet p={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {aiOpen && <ProviderCatalogSheet open={aiOpen} onClose={() => setAiOpen(false)} />}
    </ScrollView>
  );
}

function ProductRow({ p, onEdit }: { p: Product; onEdit: () => void }) {
  const toggleProduct = useOSB((s) => s.toggleProduct);
  const bumpStock = useOSB((s) => s.bumpStock);
  const removeProduct = useOSB((s) => s.removeProduct);
  const { colors } = useTheme();
  const [confirm, setConfirm] = useState(false);
  const off = p.mrp ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const badgeBg = p.hidden ? colors.chip : p.stock === 0 ? "rgba(226,55,68,.12)" : "rgba(12,131,31,.12)";
  const badgeFg = p.hidden ? colors.ink3 : p.stock === 0 ? "#E23744" : "#0C831F";
  return (
    <Animated.View entering={FadeIn} style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 10, opacity: p.hidden ? 0.7 : 1 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ position: "relative", height: 68, width: 68, borderRadius: 12, backgroundColor: colors.chip, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
          {p.image ? <Img src={p.image} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 30 }}>{p.emoji}</Text>}
          {off > 0 && (
            <View style={{ position: "absolute", left: 4, top: 4, borderRadius: 6, backgroundColor: "#256FEF", paddingHorizontal: 4, paddingVertical: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 9, color: "#fff" }}>{off}%</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <VegMark veg={p.isVeg} />
            <View style={{ borderRadius: 6, backgroundColor: badgeBg, paddingHorizontal: 4, paddingVertical: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 9, color: badgeFg }}>{p.hidden ? "HIDDEN" : p.stock === 0 ? "OUT OF STOCK" : "LIVE"}</Text>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 10, color: colors.ink3 }}>{p.category}</Text>
          </View>
          <Text numberOfLines={1} style={{ marginTop: 2, fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{p.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>₹{p.price}</Text>
            {p.mrp && <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3, textDecorationLine: "line-through" }}>₹{p.mrp}</Text>}
            <Text style={{ fontFamily: F.medium, fontSize: 10, color: colors.ink3 }}>• {p.unit}</Text>
          </View>
        </View>
      </View>
      <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: colors.chip, padding: 4 }}>
          <Pressable onPress={() => bumpStock(p.id, -1)} style={{ height: 24, width: 24, borderRadius: 12, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <Minus size={12} strokeWidth={3} color={colors.ink} />
          </Pressable>
          <Text style={{ fontFamily: F.extra, fontSize: 11, color: p.stock <= 15 ? "#E8830C" : colors.ink, minWidth: 52, textAlign: "center" }}>{p.stock} left</Text>
          <Pressable onPress={() => { bumpStock(p.id, 1); blip(700); }} style={{ height: 24, width: 24, borderRadius: 12, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <Plus size={12} strokeWidth={3} color={colors.ink} />
          </Pressable>
        </View>
        <Pressable onPress={() => toggleProduct(p.id)} style={{ height: 32, width: 32, borderRadius: 16, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
          {p.hidden ? <EyeOff size={15} color={colors.ink} /> : <Eye size={15} color={colors.ink} />}
        </Pressable>
        <Pressable onPress={onEdit} style={{ height: 32, width: 32, borderRadius: 16, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
          <Pencil size={14} color={colors.ink} />
        </Pressable>
        {confirm ? (
          <View style={{ marginLeft: "auto", flexDirection: "row", gap: 6 }}>
            <Pressable onPress={() => { removeProduct(p.id); blip(400); }} style={{ borderRadius: 999, backgroundColor: "#E23744", paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>Delete?</Text>
            </Pressable>
            <Pressable onPress={() => setConfirm(false)} style={{ borderRadius: 999, backgroundColor: colors.chip, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: colors.ink }}>No</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setConfirm(true)} style={{ marginLeft: "auto", height: 32, width: 32, borderRadius: 16, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={14} color="#E23744" />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

function StoreCategories() {
  const seller = useOSB((s) => s.seller);
  const setSeller = useOSB((s) => s.setSeller);
  const requestCategory = useOSB((s) => s.requestCategory);
  void requestCategory;
  const { colors } = useTheme();
  const [reqOpen, setReqOpen] = useState(false);
  const toggle = (k: string) => {
    const has = seller.categories.includes(k);
    setSeller({ categories: has ? seller.categories.filter((x) => x !== k) : [...seller.categories, k] });
    blip(has ? 420 : 760);
  };
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ borderRadius: 16, backgroundColor: "rgba(21,115,255,.1)", padding: 14 }}>
        <Text style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 18, color: "#0B5BD3" }}>
          Your store appears under <Text style={{ fontFamily: F.extra }}>{seller.categories.length} categor{seller.categories.length === 1 ? "y" : "ies"}</Text>. Pick everything you sell — customers find you through each one.
        </Text>
      </View>
      <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {CATEGORIES.map((c) => {
          const on = seller.categories.includes(c.k);
          return (
            <Pressable
              key={c.k}
              onPress={() => toggle(c.k)}
              style={{ width: "48%", flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : colors.line, padding: 10 }}
            >
              <View style={{ height: 40, width: 40, borderRadius: 12, overflow: "hidden", backgroundColor: `${c.accent}18`, alignItems: "center", justifyContent: "center" }}>
                {c.img ? <Img src={c.img} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 18 }}>{c.emoji}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{c.t}</Text>
                <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10, color: colors.ink3 }}>{c.subs.length} sub-cats</Text>
              </View>
              <View style={{ height: 20, width: 20, borderRadius: 10, backgroundColor: on ? c.accent : colors.chip, alignItems: "center", justifyContent: "center" }}>
                {on ? <Check size={12} strokeWidth={3.5} color="#fff" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={() => setReqOpen(true)} style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(124,92,255,.5)", backgroundColor: "rgba(124,92,255,.08)", padding: 14 }}>
        <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: "#7C5CFF", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18, color: "#fff" }}>＋</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#7C5CFF" }}>Request a new category</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>CEO approves → live in app instantly</Text>
        </View>
      </Pressable>
      {reqOpen && <QuickRequest onClose={() => setReqOpen(false)} />}
    </View>
  );
}

function QuickRequest({ onClose }: { onClose: () => void }) {
  const requestCategory = useOSB((s) => s.requestCategory);
  const seller = useOSB((s) => s.seller);
  const { colors } = useTheme();
  const [cat, setCat] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 58, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,.5)", padding: 16 }}>
      <Animated.View entering={FadeIn} style={{ width: "100%", borderRadius: 22, backgroundColor: colors.app, padding: 16 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink }}>Suggest new category</Text>
        <TextInput autoFocus value={cat} onChangeText={setCat} placeholder="e.g. Eco Living" placeholderTextColor={colors.ink3} style={{ marginTop: 10, borderRadius: 12, backgroundColor: colors.card2 ?? colors.chip, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semi, fontSize: 13, color: colors.ink }} />
        <TextInput value={desc} onChangeText={setDesc} placeholder="What will it contain? (optional)" placeholderTextColor={colors.ink3} style={{ marginTop: 8, borderRadius: 12, backgroundColor: colors.card2 ?? colors.chip, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semi, fontSize: 13, color: colors.ink }} />
        <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
          <Pressable onPress={onClose} style={{ flex: 1, borderRadius: 12, backgroundColor: colors.chip, paddingVertical: 12, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!cat.trim()) return;
              requestCategory({ productName: "Store catalog", category: cat.trim(), description: desc || "Requested from store categories.", emoji: "✨", storeName: seller.name });
              blip(920);
              onClose();
            }}
            style={{ flex: 1, borderRadius: 12, backgroundColor: "#7C5CFF", paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>Send to CEO</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

function ProductSheet({ p, onClose }: { p: Product | null; onClose: () => void }) {
  const addProduct = useOSB((s) => s.addProduct);
  const updateProduct = useOSB((s) => s.updateProduct);
  const seller = useOSB((s) => s.seller);
  const { colors } = useTheme();
  const primaryDef = CATEGORIES.find((c) => seller.categories.includes(c.k)) ?? CATEGORIES[0];
  const initialCat = p?.category ?? primaryDef.subs[0] ?? primaryDef.t;
  const initialCfg = useMemo(() => formConfig(initialCat, seller.categories), [initialCat, seller.categories]);
  const [name, setName] = useState(p?.name ?? "");
  const [desc, setDesc] = useState(p?.description ?? "");
  const [price, setPrice] = useState(String(p?.price ?? ""));
  const [mrp, setMrp] = useState(String(p?.mrp ?? ""));
  const [cat, setCat] = useState(initialCat);
  const cfg = useMemo(() => formConfig(cat, seller.categories), [cat, seller.categories]);
  const [stock, setStock] = useState(String(p?.stock ?? initialCfg.stock));
  const [unit, setUnit] = useState(p?.unit ?? initialCfg.units[0] ?? "1 pc");
  const [gallery, setGallery] = useState<string[]>(() => {
    const initial = p?.images?.length ? p.images : p?.image ? [p.image] : initialCfg.pool[0] ? [initialCfg.pool[0]] : initialCfg.cover ? [initialCfg.cover] : [];
    return initial.slice(0, 5);
  });
  const [imgTouched, setImgTouched] = useState(!!p);
  const img = gallery[0] ?? "";
  const MAX_PHOTOS = 5;

  const toggleImg = (u: string) => {
    setImgTouched(true);
    setGallery((prev) => {
      if (prev.includes(u)) return prev.filter((x) => x !== u);
      if (prev.length >= MAX_PHOTOS) return prev;
      return [...prev, u];
    });
    blip(660);
  };

  const makeCover = (u: string) => {
    setImgTouched(true);
    setGallery((prev) => [u, ...prev.filter((x) => x !== u)]);
    blip(760);
  };

  const [emoji, setEmoji] = useState(p?.emoji ?? primaryDef.emoji ?? "✨");
  const [veg, setVeg] = useState(p?.isVeg ?? initialCfg.showVeg);
  const [best, setBest] = useState(p?.isBestseller ?? false);
  const off = mrp && price && +mrp > +price ? Math.round(((+mrp - +price) / +mrp) * 100) : 0;
  const activeDef = CATEGORIES.find((c) => c.t === cat || c.subs.includes(cat)) ?? primaryDef;

  const chooseSub = (s: string) => {
    setCat(s);
    const next = formConfig(s, seller.categories);
    setUnit(next.units[0] ?? unit);
    if (!imgTouched) {
      const fallback = next.pool[0] ?? next.cover ?? "";
      setGallery(fallback ? [fallback] : []);
    }
    blip(620);
  };

  const save = () => {
    if (!name.trim() || !price) return;
    const shots = gallery.slice(0, MAX_PHOTOS);
    const cover = shots[0] ?? "";
    if (p)
      updateProduct(p.id, { name: name.trim(), description: desc, price: +price, mrp: mrp ? +mrp : undefined, stock: Math.max(0, +stock || 0), unit, category: cat, image: cover, images: shots, emoji, isVeg: veg, isBestseller: best });
    else
      addProduct({ id: "cp-" + Math.random().toString(36).slice(2, 8), storeId: useOSB.getState().seller.storeId || "mine", name: name.trim(), description: desc || "Fresh from our store.", price: +price, mrp: mrp ? +mrp : undefined, emoji, image: cover, images: shots, category: cat, rating: 4.5, isVeg: veg, isBestseller: best, stock: Math.max(0, +stock || 0), unit: unit || "1 pc", tint: "#FFE7C2", eta: "30 mins" });
    blip(920, 0.15);
    onClose();
  };

  const inputBg = colors.card2 ?? colors.chip;
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 58 }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.5)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
      <Animated.View entering={SlideInDown.springify().stiffness(240).damping(30)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.app, overflow: "hidden" }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 }}>
          <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 999, backgroundColor: "rgba(0,0,0,.15)" }} />
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3, color: colors.ink }}>{p ? "Edit product" : "New product"}</Text>
            <Pressable onPress={onClose} style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
              <X size={17} color={colors.ink} />
            </Pressable>
          </View>
          <View style={{ marginTop: 12, flexDirection: "row", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
            <View style={{ position: "relative", height: 76, width: 76, borderRadius: 12, backgroundColor: colors.chip, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
              {img ? <Img src={img} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 26 }}>{emoji || activeDef?.emoji}</Text>}
              {off > 0 && (
                <View style={{ position: "absolute", left: 4, top: 4, borderRadius: 6, backgroundColor: "#256FEF", paddingHorizontal: 4, paddingVertical: 1 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 9, color: "#fff" }}>{off}%</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>{name || "Product name"}</Text>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>
                ₹{price || "0"} {mrp ? <Text style={{ fontFamily: F.medium, color: colors.ink3, textDecorationLine: "line-through" }}>₹{mrp}</Text> : null}
              </Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{cat} • {unit} • {stock || 0} in stock</Text>
            </View>
          </View>
          <View style={{ marginTop: 12, gap: 10 }}>
            {activeDef && activeDef.subs.length > 0 && (
              <View>
                <Text style={{ marginBottom: 6, fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.2, color: colors.ink3 }}>TYPE IN {activeDef.t.toUpperCase()}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {[activeDef.t, ...activeDef.subs].map((s) => (
                    <Pressable key={s} onPress={() => chooseSub(s)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: cat === s ? activeDef.accent : colors.card, borderWidth: 1, borderColor: colors.line }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: cat === s ? "#fff" : colors.ink2 }}>{s}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <Field label="Product name *">
              <TextInput value={name} onChangeText={setName} placeholder={cfg.placeholder} placeholderTextColor={colors.ink3} style={{ fontFamily: F.semi, fontSize: 13.5, color: colors.ink, paddingVertical: 4 }} />
            </Field>
            <Field label="Description">
              <TextInput value={desc} onChangeText={setDesc} placeholder={cfg.desc} placeholderTextColor={colors.ink3} style={{ fontFamily: F.medium, fontSize: 13, color: colors.ink, paddingVertical: 4 }} />
            </Field>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="Price ₹ *">
                  <TextInput keyboardType="numeric" value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, ""))} placeholder="0" placeholderTextColor={colors.ink3} style={{ fontFamily: F.bold, fontSize: 13, color: colors.ink, paddingVertical: 4 }} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="MRP ₹">
                  <TextInput keyboardType="numeric" value={mrp} onChangeText={(t) => setMrp(t.replace(/\D/g, ""))} placeholder="0" placeholderTextColor={colors.ink3} style={{ fontFamily: F.bold, fontSize: 13, color: colors.ink, paddingVertical: 4 }} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label={cfg.showVeg ? "Stock" : "Quantity"}>
                  <TextInput keyboardType="numeric" value={stock} onChangeText={(t) => setStock(t.replace(/\D/g, ""))} placeholder={cfg.stock} placeholderTextColor={colors.ink3} style={{ fontFamily: F.bold, fontSize: 13, color: colors.ink, paddingVertical: 4 }} />
                </Field>
              </View>
            </View>
            <Field label="Unit / variant">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginTop: 4, gap: 6 }}>
                {cfg.units.map((u) => (
                  <Pressable key={u} onPress={() => setUnit(u)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: unit === u ? "#0C831F" : colors.chip }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: unit === u ? "#fff" : colors.ink2 }}>{u}</Text>
                  </Pressable>
                ))}
                <TextInput value={unit} onChangeText={setUnit} placeholder="Custom" placeholderTextColor={colors.ink3} style={{ width: 80, borderRadius: 999, backgroundColor: colors.chip, paddingHorizontal: 12, paddingVertical: 6, fontFamily: F.bold, fontSize: 11.5, color: colors.ink }} />
              </ScrollView>
            </Field>
            <View>
              <View style={{ marginBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.2, color: colors.ink3 }}>PHOTOS — {gallery.length}/{MAX_PHOTOS}</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: colors.ink3 }}>First photo = cover</Text>
              </View>
              {gallery.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginBottom: 8, gap: 8 }}>
                  {gallery.map((u, i) => (
                    <View key={u} style={{ position: "relative", height: 72, width: 72, borderRadius: 12, overflow: "hidden", borderWidth: 2.5, borderColor: "#0C831F" }}>
                      <Img src={u} style={{ width: "100%", height: "100%" }} />
                      {i === 0 ? (
                        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#0C831F", paddingVertical: 2, alignItems: "center" }}>
                          <Text style={{ fontFamily: F.extra, fontSize: 8.5, color: "#fff" }}>COVER</Text>
                        </View>
                      ) : (
                        <Pressable onPress={() => makeCover(u)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.65)", paddingVertical: 2, alignItems: "center" }}>
                          <Text style={{ fontFamily: F.extra, fontSize: 8.5, color: "#fff" }}>Make cover</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => {
                          setGallery((prev) => prev.filter((x) => x !== u));
                          setImgTouched(true);
                          blip(420);
                        }}
                        style={{ position: "absolute", right: 2, top: 2, height: 20, width: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,.7)", alignItems: "center", justifyContent: "center" }}
                      >
                        <X size={11} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <Pressable
                  onPress={() => {
                    // Phase 7: expo-image-picker. For now pick next category sample.
                    const next = cfg.pool.find((x) => !gallery.includes(x));
                    if (next && gallery.length < MAX_PHOTOS) toggleImg(next);
                    else Alert.alert("Photos", "Gallery upload lands in Phase 7 — sample photos work for now.");
                    blip(700);
                  }}
                  style={{ height: 72, width: 72, borderRadius: 12, borderWidth: 2, borderStyle: "dashed", borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: gallery.length >= MAX_PHOTOS ? 0.4 : 1 }}
                >
                  <Plus size={16} strokeWidth={3} color="#0C831F" />
                  <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 9.5, color: colors.ink2 }}>Upload</Text>
                </Pressable>
                {cfg.pool
                  .filter((u) => !gallery.includes(u))
                  .map((u) => (
                    <Pressable key={u} onPress={() => toggleImg(u)} style={{ height: 72, width: 72, borderRadius: 12, overflow: "hidden", opacity: 0.7 }}>
                      <Img src={u} style={{ width: "100%", height: "100%" }} />
                    </Pressable>
                  ))}
              </ScrollView>
              {gallery.length === 0 && <Text style={{ marginTop: 6, fontFamily: F.semi, fontSize: 10.5, color: colors.ink3 }}>Upload your own photo or pick a {cat} sample above.</Text>}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {cfg.showVeg && (
                <Pressable onPress={() => setVeg(!veg)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 12 }}>
                  <VegMark veg={veg} />
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{veg ? "Veg" : "Non-veg"}</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setBest(!best)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: best ? "rgba(232,131,12,.15)" : colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 12 }}>
                <Star size={14} fill={best ? "#E8830C" : "none"} color={best ? "#E8830C" : colors.ink3} />
                <Text style={{ fontFamily: F.extra, fontSize: 12, color: best ? "#E8830C" : colors.ink3 }}>Bestseller</Text>
              </Pressable>
            </View>
          </View>
          <Pressable onPress={save} style={{ marginTop: 16, borderRadius: 14, backgroundColor: "#0C831F", paddingVertical: 16, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>{p ? "Save changes" : "List product live"}</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

/* ═══════════ MARKETING ═══════════ */
export function SellerMarketing() {
  const sellerCoupons = useOSB((s) => s.sellerCoupons);
  const storewideOff = useOSB((s) => s.storewideOff);
  const set = useOSB((s) => s.set);
  const storeReviews = useOSB((s) => s.storeReviews);
  const replyReview = useOSB((s) => s.replyReview);
  const seller = useOSB((s) => s.seller);
  const { colors } = useTheme();
  const [sheet, setSheet] = useState<"new" | string | null>(null);
  const [ann, setAnn] = useState(seller.announcement);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyTxt, setReplyTxt] = useState("");
  const active = sellerCoupons.filter((c) => c.active);
  const avg = (storeReviews.reduce((a, r) => a + r.rating, 0) / storeReviews.length).toFixed(1);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 176 }}>
      <Text style={{ fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5, color: colors.ink }}>Marketing</Text>
      <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>
        {active.length} live coupons • {storeReviews.length} reviews • {avg}★ avg
      </Text>

      <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: "rgba(226,55,68,.12)", alignItems: "center", justifyContent: "center" }}>
            <BadgePercent size={19} color="#E23744" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>Store-wide sale</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>Flat OFF on everything, shown on your store</Text>
          </View>
        </View>
        <View style={{ marginTop: 10, flexDirection: "row", gap: 6 }}>
          {[0, 5, 10, 15, 20, 25].map((v) => (
            <Pressable key={v} onPress={() => { set({ storewideOff: v }); blip(v ? 760 : 420); }} style={{ flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: "center", backgroundColor: storewideOff === v ? "#E23744" : colors.chip }}>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: storewideOff === v ? "#fff" : colors.ink2 }}>{v === 0 ? "Off" : `${v}%`}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <SectionHead
          title="Coupons"
          sub="Customers apply these at checkout"
          action={
            <Pressable onPress={() => setSheet("new")} style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "#111114", paddingHorizontal: 12, paddingVertical: 6 }}>
              <Plus size={13} color="#fff" />
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>New</Text>
            </Pressable>
          }
        />
      </View>
      <View style={{ marginTop: 10, gap: 8 }}>
        {sellerCoupons.map((c) => (
          <CouponCard key={c.id} id={c.id} onEdit={() => setSheet(c.id)} />
        ))}
      </View>

      <View style={{ marginTop: 16 }}>
        <SectionHead title="Store banner" sub="Shows on top of your store page" />
      </View>
      <View style={{ marginTop: 10, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, backgroundColor: "rgba(248,203,70,.25)", padding: 12 }}>
          <Megaphone size={15} color={colors.ink} />
          <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 12, color: colors.ink }}>{ann || "No banner — customers see nothing extra."}</Text>
        </View>
        <TextInput value={ann} onChangeText={setAnn} placeholder="e.g. Free gulab jamun with biryani 🪔" placeholderTextColor={colors.ink3} style={{ marginTop: 10, borderRadius: 12, backgroundColor: colors.card2 ?? colors.chip, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semi, fontSize: 12.5, color: colors.ink }} />
        <Pressable onPress={() => { useOSB.getState().setSeller({ announcement: ann }); blip(880); }} style={{ marginTop: 8, borderRadius: 12, backgroundColor: "#111114", paddingVertical: 12, alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#fff" }}>Publish banner</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 16 }}>
        <SectionHead title="Reviews" sub="Reply to keep rating high" />
      </View>
      <View style={{ marginTop: 10, gap: 8 }}>
        {storeReviews.map((r) => (
          <View key={r.name} style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ height: 32, width: 32, borderRadius: 16, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{r.name[0]}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>
                {r.name} <Text style={{ fontFamily: F.semi, color: colors.ink3 }}>• {r.when}</Text>
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2, borderRadius: 6, backgroundColor: "#0C831F", paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>{r.rating}</Text>
                <Star size={9} fill="#fff" color="#fff" />
              </View>
            </View>
            <Text style={{ marginTop: 6, fontFamily: F.medium, fontSize: 12.5, lineHeight: 18, color: colors.ink }}>{r.text}</Text>
            {r.reply ? (
              <View style={{ marginTop: 8, borderRadius: 10, backgroundColor: colors.chip, padding: 10 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}><Text style={{ fontFamily: F.extra, color: colors.ink }}>Your reply:</Text> {r.reply}</Text>
              </View>
            ) : replyFor === r.name ? (
              <View style={{ marginTop: 8, flexDirection: "row", gap: 6 }}>
                <TextInput autoFocus value={replyTxt} onChangeText={setReplyTxt} placeholder="Write a reply…" placeholderTextColor={colors.ink3} style={{ flex: 1, borderRadius: 10, backgroundColor: colors.card2 ?? colors.chip, paddingHorizontal: 12, paddingVertical: 8, fontFamily: F.semi, fontSize: 12, color: colors.ink }} />
                <Pressable
                  onPress={() => {
                    if (replyTxt.trim()) replyReview(r.name, replyTxt.trim());
                    setReplyFor(null);
                    setReplyTxt("");
                    blip(760);
                  }}
                  style={{ borderRadius: 10, backgroundColor: "#0C831F", paddingHorizontal: 14, justifyContent: "center" }}
                >
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#fff" }}>Send</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setReplyFor(r.name)} style={{ marginTop: 8 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#1573FF" }}>Reply →</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {sheet && <CouponSheet id={sheet === "new" ? null : sheet} onClose={() => setSheet(null)} />}
    </ScrollView>
  );
}

function CouponCard({ id, onEdit }: { id: string; onEdit: () => void }) {
  const c = useOSB((s) => s.sellerCoupons.find((x) => x.id === id)!);
  const updateCoupon = useOSB((s) => s.updateCoupon);
  const removeCoupon = useOSB((s) => s.removeCoupon);
  const { colors } = useTheme();
  const [del, setDel] = useState(false);
  return (
    <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden", opacity: c.active ? 1 : 0.6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
        <View style={{ height: 44, width: 44, borderRadius: 12, backgroundColor: "rgba(124,92,255,.12)", alignItems: "center", justifyContent: "center" }}>
          <Ticket size={20} color="#7C5CFF" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ borderRadius: 6, borderWidth: 1, borderStyle: "dashed", borderColor: colors.ink3, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{c.code}</Text>
            </View>
            <Pressable onPress={() => blip(700)} hitSlop={8}>
              <Copy size={12} color={colors.ink3} style={{ opacity: 0.5 }} />
            </Pressable>
          </View>
          <Text numberOfLines={1} style={{ marginTop: 2, fontFamily: F.bold, fontSize: 11.5, color: colors.ink }}>{c.title} • min ₹{c.minOrder}</Text>
          <Text style={{ fontFamily: F.semi, fontSize: 10.5, color: colors.ink3 }}>{c.used} used • expires {c.expiry}</Text>
        </View>
        <Tog small on={c.active} onTap={() => updateCoupon(c.id, { active: !c.active })} />
      </View>
      <View style={{ flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 14, paddingVertical: 8 }}>
        <Pressable onPress={onEdit} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 8, backgroundColor: colors.chip, paddingVertical: 8 }}>
          <Pencil size={12} color={colors.ink} />
          <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: colors.ink }}>Edit</Text>
        </Pressable>
        {del ? (
          <Pressable onPress={() => removeCoupon(c.id)} style={{ flex: 1, borderRadius: 8, backgroundColor: "#E23744", paddingVertical: 8, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#fff" }}>Confirm delete</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setDel(true)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 8, backgroundColor: colors.chip, paddingVertical: 8 }}>
            <Trash2 size={12} color="#E23744" />
            <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#E23744" }}>Delete</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function CouponSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const exist = useOSB((s) => s.sellerCoupons.find((x) => x.id === id));
  const addCoupon = useOSB((s) => s.addCoupon);
  const updateCoupon = useOSB((s) => s.updateCoupon);
  const { colors } = useTheme();
  const [code, setCode] = useState(exist?.code ?? "");
  const [kind, setKind] = useState<"pct" | "flat">(exist?.kind ?? "pct");
  const [value, setValue] = useState(String(exist?.value ?? "20"));
  const [maxOff, setMaxOff] = useState(String(exist?.maxOff ?? "100"));
  const [minOrder, setMinOrder] = useState(String(exist?.minOrder ?? "199"));
  const [expiry, setExpiry] = useState(exist?.expiry ?? "31 Dec");
  const save = () => {
    const cd = (code || `SAVE${value}`).toUpperCase().replace(/\s+/g, "");
    const title = kind === "pct" ? `${value}% OFF up to ₹${maxOff}` : `Flat ₹${value} OFF`;
    if (id && exist) updateCoupon(id, { code: cd, title, kind, value: +value || 0, maxOff: +maxOff || 0, minOrder: +minOrder || 0, expiry });
    else addCoupon({ id: "sc-" + Math.random().toString(36).slice(2, 7), code: cd, title, detail: `On orders above ₹${minOrder}`, kind, value: +value || 0, maxOff: +maxOff || 0, minOrder: +minOrder || 0, active: true, used: 0, expiry });
    blip(920, 0.15);
    onClose();
  };
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 58 }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.5)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
      <Animated.View entering={SlideInDown.springify().stiffness(250).damping(30)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.app, overflow: "hidden" }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 }}>
          <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 999, backgroundColor: "rgba(0,0,0,.15)" }} />
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 17, color: colors.ink }}>{id ? "Edit coupon" : "New coupon"}</Text>
            <Pressable onPress={onClose} style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={colors.ink} />
            </Pressable>
          </View>
          <View style={{ marginTop: 12, gap: 10 }}>
            <Field label="Coupon code">
              <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="e.g. DIWALI20" placeholderTextColor={colors.ink3} autoCapitalize="characters" style={{ fontFamily: F.extra, fontSize: 14, letterSpacing: 2, color: colors.ink, paddingVertical: 4 }} />
            </Field>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["pct", "flat"] as const).map((k) => (
                <Pressable key={k} onPress={() => setKind(k)} style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: kind === k ? "#7C5CFF" : colors.card, borderWidth: 1, borderColor: colors.line }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: kind === k ? "#fff" : colors.ink }}>{k === "pct" ? "% Percentage" : "₹ Flat OFF"}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label={kind === "pct" ? "Off %" : "₹ OFF"}>
                  <TextInput keyboardType="numeric" value={value} onChangeText={(t) => setValue(t.replace(/\D/g, ""))} style={{ fontFamily: F.bold, fontSize: 13, color: colors.ink, paddingVertical: 4 }} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Max ₹">
                  <TextInput keyboardType="numeric" value={maxOff} onChangeText={(t) => setMaxOff(t.replace(/\D/g, ""))} style={{ fontFamily: F.bold, fontSize: 13, color: colors.ink, paddingVertical: 4 }} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Min order ₹">
                  <TextInput keyboardType="numeric" value={minOrder} onChangeText={(t) => setMinOrder(t.replace(/\D/g, ""))} style={{ fontFamily: F.bold, fontSize: 13, color: colors.ink, paddingVertical: 4 }} />
                </Field>
              </View>
            </View>
            <Field label="Expiry">
              <TextInput value={expiry} onChangeText={setExpiry} style={{ fontFamily: F.semi, fontSize: 13, color: colors.ink, paddingVertical: 4 }} />
            </Field>
            <View style={{ borderRadius: 12, backgroundColor: "rgba(12,131,31,.1)", padding: 12 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: "#0C5B21" }}>
                Preview: <Text style={{ fontFamily: F.extra }}>{code || "CODE"}</Text> — {kind === "pct" ? `${value || 0}% OFF up to ₹${maxOff}` : `Flat ₹${value} OFF`} on orders above ₹{minOrder || 0}
              </Text>
            </View>
          </View>
          <Pressable onPress={save} style={{ marginTop: 16, borderRadius: 14, backgroundColor: "#0C831F", paddingVertical: 16, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>{id ? "Save coupon" : "Launch coupon"}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

/* ═══════════ MANAGE ═══════════ */
export function SellerManage() {
  const seller = useOSB((s) => s.seller);
  const setSeller = useOSB((s) => s.setSeller);
  const team = useOSB((s) => s.team);
  const addTeam = useOSB((s) => s.addTeam);
  const toggleTeam = useOSB((s) => s.toggleTeam);
  const set = useOSB((s) => s.set);
  const catalog = useOSB((s) => s.catalog);
  const addRider = useOSB((s) => s.addRider);
  const { colors } = useTheme();
  const [riderForm, setRiderForm] = useState(false);
  const [permFor, setPermFor] = useState<string | null>(null);
  const [rn, setRn] = useState("");
  const [rp, setRp] = useState("");
  const [rv, setRv] = useState("");
  const [tmForm, setTmForm] = useState(false);
  const [tn, setTn] = useState("");
  const [tr, setTr] = useState("Staff");
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const plans = [
    { k: "basic", t: "Basic ₹499/mo", f: ["50 products", "Basic analytics", "1 staff login"], c: "#1573FF" },
    { k: "growth", t: "Growth ₹999/mo", f: ["200 products", "AI insights + coupons", "5 staff logins"], c: "#0C831F" },
    { k: "scale", t: "Scale ₹2499/mo", f: ["Unlimited products", "Marketing suite", "Unlimited staff"], c: "#7C5CFF" },
  ];
  const darkInput = { backgroundColor: "rgba(255,255,255,.1)", color: "#fff" };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 176 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ height: 52, width: 52, borderRadius: 16, backgroundColor: colors.chip, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
          {seller.coverImage ? <Img src={seller.coverImage} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 22 }}>🛍️</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 19, letterSpacing: -0.4, color: colors.ink }}>{seller.name}</Text>
          <Text style={{ marginTop: 4, fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>{seller.plan.toUpperCase()} plan • Health 94 • Since 2023</Text>
        </View>
        <Pressable onPress={() => set({ tab: "profile" })} style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: "#E23744", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>A</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: seller.storeOpen ? "rgba(12,131,31,.12)" : "rgba(226,55,68,.12)", alignItems: "center", justifyContent: "center" }}>
          <Power size={18} color={seller.storeOpen ? "#0C831F" : "#E23744"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>{seller.storeOpen ? "Store is LIVE" : "Store is CLOSED"}</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>
            {seller.storeOpen ? `Visible within ${seller.radiusKm} km • ${seller.openTime}–${seller.closeTime}` : "Customers see you as closed"}
          </Text>
        </View>
        <Tog on={seller.storeOpen} onTap={() => setSeller({ storeOpen: !seller.storeOpen })} />
      </View>

      {/* self delivery */}
      <View style={{ marginTop: 12, borderRadius: 20, backgroundColor: "#111117", padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: "#F8CB46", alignItems: "center", justifyContent: "center" }}>
            <Truck size={18} color="#111114" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>My Delivery — I deliver myself 🛵</Text>
            <Text style={{ fontFamily: F.semi, fontSize: 10.5, color: "rgba(255,255,255,.6)" }}>No platform riders. Your staff, your control.</Text>
          </View>
          <Tog on={seller.deliveryOn} onTap={() => setSeller({ deliveryOn: !seller.deliveryOn })} />
        </View>

        <View style={{ alignSelf: "center", marginTop: 12, height: 168, width: 168 }}>
          {[1, 0.72, 0.45].map((sc, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: 84 - (160 * sc) / 2,
                top: 84 - (160 * sc) / 2,
                width: 160 * sc,
                height: 160 * sc,
                borderRadius: (160 * sc) / 2,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: i === 0 ? "#F8CB46" : "rgba(255,255,255,.25)",
                backgroundColor: i === 0 ? "rgba(248,203,70,.10)" : "transparent",
              }}
            />
          ))}
          <View style={{ position: "absolute", left: 62, top: 62, height: 44, width: 44, borderRadius: 16, backgroundColor: "#F8CB46", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 22 }}>🏪</Text>
          </View>
          <View style={{ position: "absolute", right: -4, top: 8, borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#111114" }}>~{(seller.radiusKm * 3.14 * seller.radiusKm).toFixed(0)} km²</Text>
          </View>
          <Text style={{ position: "absolute", left: -8, bottom: 12, fontSize: 20 }}>🏠</Text>
          <Text style={{ position: "absolute", right: 24, bottom: 24, fontSize: 16 }}>🏠</Text>
        </View>
        <View style={{ marginTop: 8, alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 26, color: "#F8CB46" }}>{seller.radiusKm} km</Text>
          <Text style={{ fontFamily: F.semi, fontSize: 11, color: "rgba(255,255,255,.6)" }}>Customers inside this circle see your store LIVE</Text>
        </View>
        <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => setSeller({ radiusKm: Math.max(1, seller.radiusKm - 1) })} style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.1)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 18, color: "#fff" }}>−</Text>
          </Pressable>
          <View style={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,.15)", overflow: "hidden" }}>
            <View style={{ height: "100%", borderRadius: 999, backgroundColor: "#F8CB46", width: `${((seller.radiusKm - 1) / 14) * 100}%` }} />
          </View>
          <Pressable onPress={() => setSeller({ radiusKm: Math.min(15, seller.radiusKm + 1) })} style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.1)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 18, color: "#fff" }}>+</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 4, flexDirection: "row", justifyContent: "space-between" }}>
          {["1 KM", "5 KM", "10 KM", "15 KM"].map((t) => (
            <Text key={t} style={{ fontFamily: F.extra, fontSize: 10, color: "rgba(255,255,255,.5)" }}>{t}</Text>
          ))}
        </View>

        <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[
            ["Delivery fee ₹", String(seller.deliveryFee), (t: string) => setSeller({ deliveryFee: +t.replace(/\D/g, "") || 0 })],
            ["Free above ₹", String(seller.freeAbove), (t: string) => setSeller({ freeAbove: +t.replace(/\D/g, "") || 0 })],
            ["Min order ₹", String(seller.minOrder), (t: string) => setSeller({ minOrder: +t.replace(/\D/g, "") || 0 })],
            ["Avg time (min)", String(seller.avgTime), (t: string) => setSeller({ avgTime: +t.replace(/\D/g, "") || 0 })],
          ].map(([label, val, fn]) => (
            <View key={label as string} style={{ width: "48%", borderRadius: 12, backgroundColor: "rgba(255,255,255,.08)", padding: 10 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 0.8, color: "rgba(255,255,255,.5)" }}>{(label as string).toUpperCase()}</Text>
              <TextInput keyboardType="numeric" value={val as string} onChangeText={fn as (t: string) => void} placeholderTextColor="rgba(255,255,255,.4)" style={{ fontFamily: F.extra, fontSize: 16, color: "#fff", paddingVertical: 2 }} />
            </View>
          ))}
        </View>
        <Pressable onPress={() => setSeller({ pickup: !seller.pickup })} style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,.08)", padding: 12 }}>
          <View style={{ height: 24, width: 24, borderRadius: 6, backgroundColor: seller.pickup ? "#0C831F" : "rgba(255,255,255,.15)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: seller.pickup ? "#fff" : "transparent" }}>✓</Text>
          </View>
          <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 12, color: "#fff" }}>
            Also allow store pickup <Text style={{ color: "rgba(255,255,255,.55)" }}>(customers collect, zero delivery cost)</Text>
          </Text>
        </Pressable>

        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#fff" }}>My delivery staff ({seller.riders.length})</Text>
          {seller.riders.length > 0 && (
            <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: "#6EE7B7" }}>
              {seller.riders.filter((r) => r.online).length} online now
            </Text>
          )}
        </View>
        <Text style={{ marginTop: 2, fontFamily: F.semi, fontSize: 10.5, color: "rgba(255,255,255,.5)" }}>Staff log in with their own number — no password. You control what they can see.</Text>
        <View style={{ marginTop: 6, gap: 6 }}>
          {seller.riders.map((r) => (
            <Pressable key={r.phone + r.name} onPress={() => { setPermFor(r.phone); blip(620); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,.08)", padding: 10 }}>
              <View style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: "#F8CB46", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#111114" }}>{r.name[0]}</Text>
                <View style={{ position: "absolute", right: -2, bottom: -2, height: 12, width: 12, borderRadius: 6, borderWidth: 2, borderColor: "#111117", backgroundColor: r.online ? "#34D399" : "rgba(255,255,255,.25)" }} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12, color: "#fff" }}>
                  {r.name} {r.active === false && <Text style={{ color: "rgba(255,255,255,.45)" }}>• paused</Text>}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10.5, color: "rgba(255,255,255,.55)" }}>{r.vehicle} • {r.phone}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: r.online ? "rgba(52,211,153,.2)" : "rgba(255,255,255,.1)" }}>
                <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: r.online ? "#34D399" : "rgba(255,255,255,.4)" }} />
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: r.online ? "#6EE7B7" : "rgba(255,255,255,.5)" }}>{r.online ? "Online" : "Offline"}</Text>
              </View>
              <ChevronRight size={15} color="rgba(255,255,255,.45)" />
            </Pressable>
          ))}
        </View>
        {riderForm ? (
          <View style={{ marginTop: 8, gap: 6 }}>
            <TextInput value={rn} onChangeText={setRn} placeholder="Rider name" placeholderTextColor="rgba(255,255,255,.4)" style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.semi, fontSize: 12, ...darkInput }} />
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TextInput value={rp} onChangeText={(t) => setRp(t.replace(/[^\d+ ]/g, ""))} keyboardType="phone-pad" placeholder="Login phone (10 digits)" placeholderTextColor="rgba(255,255,255,.4)" style={{ flex: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.semi, fontSize: 12, ...darkInput }} />
              <TextInput value={rv} onChangeText={setRv} placeholder="Vehicle + no." placeholderTextColor="rgba(255,255,255,.4)" style={{ flex: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.semi, fontSize: 12, ...darkInput }} />
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pressable onPress={() => setRiderForm(false)} style={{ flex: 1, borderRadius: 10, backgroundColor: "rgba(255,255,255,.1)", paddingVertical: 10, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#fff" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!rn.trim() || rp.replace(/\D/g, "").length < 10) return;
                  addRider({ name: rn.trim(), phone: rp, vehicle: rv || "Bike" });
                  setRn("");
                  setRp("");
                  setRv("");
                  setRiderForm(false);
                  blip(820);
                }}
                style={{ flex: 1, borderRadius: 10, backgroundColor: "#F8CB46", paddingVertical: 10, alignItems: "center" }}
              >
                <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#111114" }}>Add rider</Text>
              </Pressable>
            </View>
            <Text style={{ fontFamily: F.semi, fontSize: 10, color: "rgba(255,255,255,.45)" }}>This number becomes their login — they get a delivery-only panel.</Text>
          </View>
        ) : (
          <Pressable onPress={() => setRiderForm(true)} style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(255,255,255,.3)", paddingVertical: 10, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 12, color: "rgba(255,255,255,.8)" }}>＋ Add delivery staff</Text>
          </Pressable>
        )}
      </View>

      {permFor && <RiderAccessSheet phone={permFor} onClose={() => setPermFor(null)} />}

      <View style={{ marginTop: 16 }}>
        <SectionHead title="Business profile" />
      </View>
      <View style={{ marginTop: 10, gap: 10, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <Field label="Store name">
          <TextInput value={seller.name} onChangeText={(t) => setSeller({ name: t })} style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink, paddingVertical: 4 }} />
        </Field>
        <Field label="Tagline">
          <TextInput value={seller.tagline} onChangeText={(t) => setSeller({ tagline: t })} style={{ fontFamily: F.semi, fontSize: 13, color: colors.ink, paddingVertical: 4 }} />
        </Field>
        <Field label="Phone">
          <TextInput value={seller.phone} onChangeText={(t) => setSeller({ phone: t })} keyboardType="phone-pad" style={{ fontFamily: F.semi, fontSize: 13, color: colors.ink, paddingVertical: 4 }} />
        </Field>
        <Field label="Address">
          <TextInput value={seller.address} onChangeText={(t) => setSeller({ address: t })} style={{ fontFamily: F.medium, fontSize: 12.5, color: colors.ink, paddingVertical: 4 }} />
        </Field>
        <Field label="About store">
          <TextInput value={seller.description} onChangeText={(t) => setSeller({ description: t })} multiline numberOfLines={2} style={{ fontFamily: F.medium, fontSize: 12.5, color: colors.ink, paddingVertical: 4, minHeight: 44 }} />
        </Field>
      </View>

      <View style={{ marginTop: 16 }}>
        <SectionHead title="Hours & vacation" sub="Customers see accurate open status" />
      </View>
      <View style={{ marginTop: 10, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field label="Opens">
              <TextInput value={seller.openTime} onChangeText={(t) => setSeller({ openTime: t })} placeholder="11:00" placeholderTextColor={colors.ink3} style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink, paddingVertical: 4 }} />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Closes">
              <TextInput value={seller.closeTime} onChangeText={(t) => setSeller({ closeTime: t })} placeholder="23:00" placeholderTextColor={colors.ink3} style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink, paddingVertical: 4 }} />
            </Field>
          </View>
        </View>
        <Text style={{ marginTop: 10, fontFamily: F.extra, fontSize: 11, letterSpacing: 1.2, color: colors.ink3 }}>WEEKLY OFF</Text>
        <View style={{ marginTop: 6, flexDirection: "row", gap: 6 }}>
          {days.map((d) => {
            const off = seller.closedDays.includes(d);
            return (
              <Pressable key={d} onPress={() => setSeller({ closedDays: off ? seller.closedDays.filter((x) => x !== d) : [...seller.closedDays, d] })} style={{ flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: "center", backgroundColor: off ? "#E23744" : colors.chip }}>
                <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: off ? "#fff" : colors.ink2 }}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, backgroundColor: "rgba(251,191,36,.15)", padding: 12 }}>
          <CalendarDays size={16} color="#B45309" />
          <TextInput value={seller.vacationUntil} onChangeText={(t) => setSeller({ vacationUntil: t })} placeholder="Vacation until (e.g. 20 Oct) — empty = no vacation" placeholderTextColor={colors.ink3} style={{ flex: 1, fontFamily: F.semi, fontSize: 12, color: colors.ink }} />
        </View>
        {seller.vacationUntil !== "" && (
          <View style={{ marginTop: 8, borderRadius: 12, backgroundColor: "rgba(251,191,36,.2)", padding: 10, alignItems: "center" }}>
            <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: "#92400E" }}>🏖️ Vacation ON till {seller.vacationUntil} — store hidden, subscription safe</Text>
          </View>
        )}
      </View>

      <View style={{ marginTop: 16 }}>
        <SectionHead
          title="Team"
          sub={`${team.filter((t) => t.active).length} active`}
          action={
            <Pressable onPress={() => setTmForm(!tmForm)} style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "#111114", paddingHorizontal: 12, paddingVertical: 6 }}>
              <Plus size={12} color="#fff" />
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>Add</Text>
            </Pressable>
          }
        />
      </View>
      {tmForm && (
        <View style={{ marginTop: 8, flexDirection: "row", gap: 6, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 10 }}>
          <TextInput autoFocus value={tn} onChangeText={setTn} placeholder="Name" placeholderTextColor={colors.ink3} style={{ flex: 1, minWidth: 0, borderRadius: 10, backgroundColor: colors.card2 ?? colors.chip, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.semi, fontSize: 12, color: colors.ink }} />
          <TextInput value={tr} onChangeText={setTr} placeholder="Role" placeholderTextColor={colors.ink3} style={{ width: 110, borderRadius: 10, backgroundColor: colors.card2 ?? colors.chip, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.semi, fontSize: 12, color: colors.ink }} />
          <Pressable
            onPress={() => {
              if (!tn.trim()) return;
              addTeam({ name: tn.trim(), role: tr || "Staff", phone: "—", active: true });
              setTn("");
              setTmForm(false);
              blip(820);
            }}
            style={{ borderRadius: 10, backgroundColor: "#0C831F", paddingHorizontal: 16, justifyContent: "center" }}
          >
            <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#fff" }}>Add</Text>
          </Pressable>
        </View>
      )}
      <View style={{ marginTop: 10, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
        {team.map((m, ix) => (
          <View key={m.name} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: ix === team.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
            <View style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{m.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{m.name}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{m.role} • {m.phone}</Text>
            </View>
            <Tog small on={m.active} onTap={() => toggleTeam(m.name)} />
          </View>
        ))}
      </View>

      <View style={{ marginTop: 16 }}>
        <SectionHead title="Subscription" sub="Zero commission, always" />
      </View>
      <View style={{ marginTop: 10, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontFamily: F.extra, fontSize: 11, letterSpacing: 1.2, color: colors.ink3 }}>{seller.plan.toUpperCase()} PLAN</Text>
            <Text style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink }}>Renews 12 Nov • Auto-pay ON</Text>
          </View>
          <View style={{ borderRadius: 999, backgroundColor: "#0C831F", paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>Active</Text>
          </View>
        </View>
        <View style={{ marginTop: 10, gap: 8 }}>
          <Usage label="Products" used={catalog.length} max={seller.plan === "basic" ? 50 : seller.plan === "growth" ? 200 : 999} />
          <Usage label="Orders this month" used={312} max={seller.plan === "basic" ? 500 : 2000} />
        </View>
        <View style={{ marginTop: 12, gap: 6 }}>
          {plans.map((pl) => {
            const on = seller.plan === pl.k;
            return (
              <Pressable key={pl.k} onPress={() => { setSeller({ plan: pl.k as "basic" | "growth" | "scale" }); blip(820); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, backgroundColor: colors.card2 ?? colors.chip, borderWidth: on ? 2 : 0, borderColor: pl.c, padding: 12 }}>
                <View style={{ height: 36, width: 6, borderRadius: 999, backgroundColor: pl.c }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{pl.t} {on && "✓"}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{pl.f.join(" • ")}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <SectionHead title="Payouts" />
      </View>
      <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#0E3B2E", padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Wallet size={12} color="#D8F34E" />
            <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1, color: "#D8F34E" }}>AVAILABLE</Text>
          </View>
          <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 21, color: "#fff" }}>₹18,204</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: "rgba(255,255,255,.6)" }}>Settles tomorrow • HDFC ••4421</Text>
        </View>
        <View style={{ flex: 1, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1, color: colors.ink3 }}>THIS MONTH</Text>
          <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 21, color: colors.ink }}>₹2.4L</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: "#0C831F" }}>12 payouts • on time</Text>
        </View>
      </View>

      <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
        {[["🖥️", "CEO Admin demo", "See platform view"], ["💬", "Seller support", "Chat • 2 min reply"], ["📄", "Bills & invoices", "GST-ready downloads"]].map(([e, t, s], ix, arr) => (
          <Pressable key={t} onPress={() => { if (t.includes("CEO")) set({ mode: "admin", tab: "overview" }); else blip(600); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: ix === arr.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
            <View style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 17 }}>{e}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{t}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{s}</Text>
            </View>
            <ChevronRight size={15} color={colors.ink3} style={{ opacity: 0.35 }} />
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => set({ mode: "customer", tab: "home" })} style={{ marginTop: 12, borderRadius: 999, backgroundColor: colors.chip, paddingVertical: 14, alignItems: "center" }}>
        <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>← Back to Customer view</Text>
      </Pressable>
    </ScrollView>
  );
}

function RiderAccessSheet({ phone, onClose }: { phone: string; onClose: () => void }) {
  const seller = useOSB((s) => s.seller);
  const setRiderPerm = useOSB((s) => s.setRiderPerm);
  const updateRider = useOSB((s) => s.updateRider);
  const removeRider = useOSB((s) => s.removeRider);
  const { colors } = useTheme();
  const key = phone.replace(/\D/g, "").slice(-10);
  const r = seller.riders.find((x) => x.phone.replace(/\D/g, "").slice(-10) === key);
  const [confirmDel, setConfirmDel] = useState(false);
  if (!r) return null;
  const perms = { ...DEFAULT_RIDER_PERMS, ...(r.perms ?? {}) };
  const rows: [keyof RiderPerms, string, string][] = [
    ["customerAddress", "Customer address", "Needed to reach the door"],
    ["customerPhone", "Customer phone", "Lets rider call the buyer"],
    ["itemList", "Parcel contents", "What is inside the order"],
    ["orderAmount", "Order amount", "Bill value of the order"],
    ["collectCash", "Collect COD cash", "Can accept cash payments"],
    ["selfAssign", "Pick any ready order", "Otherwise you assign orders"],
  ];
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 60 }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.55)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
      <Animated.View entering={SlideInDown.springify().stiffness(240).damping(30)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.app, overflow: "hidden" }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 }}>
          <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 999, backgroundColor: "rgba(0,0,0,.15)" }} />
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ height: 44, width: 44, borderRadius: 22, backgroundColor: "#F8CB46", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#111114" }}>{r.name[0]}</Text>
              <View style={{ position: "absolute", right: -2, bottom: -2, height: 14, width: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.app, backgroundColor: r.online ? "#34D399" : "rgba(0,0,0,.2)" }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{r.name}</Text>
              <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>{r.vehicle} • logs in with {r.phone}</Text>
            </View>
            <Pressable onPress={onClose} style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={colors.ink} />
            </Pressable>
          </View>

          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: r.online ? 1 : 0, borderColor: "rgba(52,211,153,.4)", padding: 14 }}>
            <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: r.online ? "rgba(52,211,153,.15)" : colors.chip, alignItems: "center", justifyContent: "center" }}>
              <Power size={18} color={r.online ? "#10B981" : colors.ink3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{r.online ? "Online now" : "Offline"}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>
                {r.online ? "Available to receive deliveries" : r.lastOnlineAt ? `Last online ${timeAgo(r.lastOnlineAt)}` : "Hasn't gone online yet"}
              </Text>
            </View>
            <View style={{ height: 10, width: 10, borderRadius: 5, backgroundColor: r.online ? "#34D399" : colors.chip }} />
          </View>

          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: r.active === false ? colors.chip : "rgba(12,131,31,.12)", alignItems: "center", justifyContent: "center" }}>
              <Truck size={18} color={r.active === false ? colors.ink3 : "#0C831F"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{r.active === false ? "Login paused" : "Can log in & deliver"}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>Turn off to block this staff instantly</Text>
            </View>
            <Tog on={r.active !== false} onTap={() => updateRider(r.phone, { active: r.active === false })} />
          </View>

          <View style={{ marginTop: 16 }}>
            <SectionHead title="What this rider can see" sub="Everything else stays private" />
          </View>
          <View style={{ marginTop: 10, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
            {rows.map(([k, t, s], ix) => (
              <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: ix === rows.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
                <View style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
                  {perms[k] ? <Eye size={15} color={colors.ink} /> : <EyeOff size={15} color={colors.ink3} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{t}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{s}</Text>
                </View>
                <Tog small on={perms[k]} onTap={() => setRiderPerm(r.phone, k, !perms[k])} />
              </View>
            ))}
          </View>

          <View style={{ marginTop: 12, borderRadius: 14, backgroundColor: "rgba(21,115,255,.1)", padding: 14 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 11.5, lineHeight: 17, color: "#0B5BD3" }}>
              Riders never see your catalog, khata, revenue or other customers — only the orders you mark <Text style={{ fontFamily: F.extra }}>Ready</Text>.
            </Text>
          </View>

          {confirmDel ? (
            <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => setConfirmDel(false)} style={{ flex: 1, borderRadius: 13, backgroundColor: colors.chip, paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => { removeRider(r.name); blip(400); onClose(); }} style={{ flex: 1, borderRadius: 13, backgroundColor: "#E23744", paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#fff" }}>Remove rider</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmDel(true)} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 12 }}>
              <Trash2 size={14} color="#E23744" />
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#E23744" }}>Remove from staff</Text>
            </Pressable>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function Usage({ label, used, max }: { label: string; used: number; max: number }) {
  const { colors } = useTheme();
  const pct = Math.min(100, Math.round((used / max) * 100));
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.ink2 }}>{label}</Text>
        <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.ink }}>{used}/{max}</Text>
      </View>
      <View style={{ marginTop: 4, height: 6, borderRadius: 999, backgroundColor: colors.chip, overflow: "hidden" }}>
        <View style={{ height: "100%", borderRadius: 999, backgroundColor: "#0C831F", width: `${pct}%` }} />
      </View>
    </View>
  );
}

/* ═══════════ ONBOARDING ═══════════ */
export function SellerOnboarding() {
  const setSeller = useOSB((s) => s.setSeller);
  const seller = useOSB((s) => s.seller);
  const set = useOSB((s) => s.set);
  const addTeam = useOSB((s) => s.addTeam);
  const phone = useOSB((s) => s.phone);
  const userName = useOSB((s) => s.userName);
  const saveAccount = useOSB((s) => s.saveAccount);
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(seller.name);
  const [ph, setPh] = useState(seller.phone || phone);
  const [addr, setAddr] = useState(seller.address);
  const [err, setErr] = useState("");
  const steps = ["Business", "Categories", "Delivery", "Hours", "Plan"];
  const primary = CATEGORIES.find((c) => seller.categories[0] === c.k) ?? CATEGORIES.find((c) => seller.categories.includes(c.k));
  const done = () => {
    const digits = (phone || ph).replace(/\D/g, "").slice(-10);
    const storeName = name.trim() || (primary ? `My ${primary.t}` : "My Store");
    setSeller({
      onboarded: true,
      storeOpen: true,
      storeId: seller.storeId && seller.storeId !== "mine" ? seller.storeId : "mine-" + (digits || "shop"),
      name: storeName,
      phone: ph.trim() || phone,
      address: addr.trim() || "HSR Layout, Bengaluru",
      tagline: primary?.sub || "Local store",
      coverImage: primary?.img || "",
      description: primary ? `${primary.t} from a neighbourhood business in HSR.` : "Local store on One Stop Bazar.",
      announcement: "",
    });
    if (useOSB.getState().team.length === 0) addTeam({ name: userName || "You", role: "Owner", phone: ph.trim() || phone || "—", active: true });
    useOSB.setState({ catalogInit: true, tab: "dash", mode: "provider" });
    saveAccount();
    blip(990, 0.2);
  };
  const next = () => {
    if (step === 0 && !name.trim()) {
      setErr("Give your store a name.");
      return;
    }
    if (step === 1 && seller.categories.length === 0) {
      setErr("Pick at least one category you sell in.");
      return;
    }
    setErr("");
    blip(720);
    if (step < 4) setStep(step + 1);
    else done();
  };
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {steps.map((_, i) => (
            <View key={i} style={{ height: 6, borderRadius: 999, width: i === step ? 32 : 12, backgroundColor: i <= step ? "#0C831F" : colors.line }} />
          ))}
        </View>
        <Pressable onPress={() => set({ mode: "customer", tab: "home" })}>
          <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink3 }}>Exit</Text>
        </Pressable>
      </View>
      <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 11, letterSpacing: 2, color: "#0C831F" }}>
        STEP {step + 1} OF {steps.length} • {steps[step].toUpperCase()}
      </Text>

      <Animated.View key={step} entering={SlideInRight.springify().stiffness(200).damping(26)} style={{ marginTop: 16, flex: 1 }}>
        {step === 0 && (
          <View>
            <Text style={{ fontFamily: F.extra, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: colors.ink }}>Tell us about{"\n"}your business 🏪</Text>
            <View style={{ marginTop: 16, gap: 10 }}>
              <Field label="Business name">
                <TextInput value={name} onChangeText={setName} placeholder="e.g. Mira’s Wardrobe" placeholderTextColor={colors.ink3} style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink, paddingVertical: 4 }} />
              </Field>
              <Field label="Owner phone">
                <TextInput value={ph} onChangeText={setPh} placeholder="+91 98xxx xxxxx" placeholderTextColor={colors.ink3} keyboardType="phone-pad" style={{ fontFamily: F.semi, fontSize: 14, color: colors.ink, paddingVertical: 4 }} />
              </Field>
              <Field label="Store address">
                <TextInput value={addr} onChangeText={setAddr} placeholder="Street, HSR Layout" placeholderTextColor={colors.ink3} style={{ fontFamily: F.medium, fontSize: 13, color: colors.ink, paddingVertical: 4 }} />
              </Field>
            </View>
          </View>
        )}
        {step === 1 && (
          <View>
            <Text style={{ fontFamily: F.extra, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: colors.ink }}>What do you sell? 🛍️</Text>
            <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12.5, color: colors.ink2 }}>Pick all that apply — you appear under each.</Text>
            <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map((c) => {
                const on = seller.categories.includes(c.k);
                return (
                  <Pressable
                    key={c.k}
                    onPress={() => {
                      const nextCats = on ? seller.categories.filter((x) => x !== c.k) : [...seller.categories, c.k];
                      const prim = CATEGORIES.find((x) => x.k === nextCats[0]);
                      setSeller({ categories: nextCats, coverImage: prim?.img || "", tagline: prim?.sub || seller.tagline });
                      setErr("");
                    }}
                    style={{ width: "48%", flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: on ? 2 : 1, borderColor: on ? "#0C831F" : colors.line, padding: 10 }}
                  >
                    <View style={{ height: 36, width: 36, borderRadius: 8, overflow: "hidden", backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
                      {c.img ? <Img src={c.img} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 16 }}>{c.emoji}</Text>}
                    </View>
                    <Text style={{ flex: 1, fontFamily: F.extra, fontSize: 12, lineHeight: 15, color: colors.ink }}>{c.t}</Text>
                    {on && <Check size={14} strokeWidth={3} color="#0C831F" />}
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ marginTop: 8, fontFamily: F.bold, fontSize: 11, color: colors.ink3, textAlign: "center" }}>
              {seller.categories.length ? `Selling in ${seller.categories.map((k) => CATEGORIES.find((c) => c.k === k)?.t).filter(Boolean).join(", ")}` : "Select every category you actually sell"}
            </Text>
          </View>
        )}
        {step === 2 && (
          <View>
            <Text style={{ fontFamily: F.extra, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: colors.ink }}>You deliver it{"\n"}yourself 🛵</Text>
            <View style={{ marginTop: 8, borderRadius: 14, backgroundColor: "rgba(248,203,70,.25)", padding: 12 }}>
              <Text style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 18, color: colors.ink }}>
                One Stop Bazar has <Text style={{ fontFamily: F.extra }}>no delivery fleet</Text>. Orders come to you — your staff delivers. Set how far your store shows LIVE:
              </Text>
            </View>
            <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16, alignItems: "center" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 34, color: "#0C831F" }}>{seller.radiusKm} km</Text>
              <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 12, width: "100%" }}>
                <Pressable onPress={() => setSeller({ radiusKm: Math.max(1, seller.radiusKm - 1) })} style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 18, color: colors.ink }}>−</Text>
                </Pressable>
                <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: colors.chip, overflow: "hidden" }}>
                  <View style={{ height: "100%", backgroundColor: "#0C831F", width: `${((seller.radiusKm - 1) / 14) * 100}%` }} />
                </View>
                <Pressable onPress={() => setSeller({ radiusKm: Math.min(15, seller.radiusKm + 1) })} style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 18, color: colors.ink }}>+</Text>
                </Pressable>
              </View>
              <View style={{ marginTop: 8, flexDirection: "row", gap: 8, width: "100%" }}>
                <View style={{ flex: 1 }}>
                  <Field label="Delivery fee ₹">
                    <TextInput keyboardType="numeric" value={String(seller.deliveryFee)} onChangeText={(t) => setSeller({ deliveryFee: +t.replace(/\D/g, "") || 0 })} style={{ fontFamily: F.bold, fontSize: 14, color: colors.ink, paddingVertical: 4 }} />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Free above ₹">
                    <TextInput keyboardType="numeric" value={String(seller.freeAbove)} onChangeText={(t) => setSeller({ freeAbove: +t.replace(/\D/g, "") || 0 })} style={{ fontFamily: F.bold, fontSize: 14, color: colors.ink, paddingVertical: 4 }} />
                  </Field>
                </View>
              </View>
            </View>
          </View>
        )}
        {step === 3 && (
          <View>
            <Text style={{ fontFamily: F.extra, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: colors.ink }}>When are you open? ⏰</Text>
            <View style={{ marginTop: 16, flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="Opens">
                  <TextInput value={seller.openTime} onChangeText={(t) => setSeller({ openTime: t })} style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink, paddingVertical: 4 }} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Closes">
                  <TextInput value={seller.closeTime} onChangeText={(t) => setSeller({ closeTime: t })} style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink, paddingVertical: 4 }} />
                </Field>
              </View>
            </View>
            <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Clock size={15} color={colors.ink} />
                <Text style={{ flex: 1, fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Same hours all days?</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 11, color: "#0C831F" }}>Yes, flexible ✓</Text>
              </View>
              <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 11.5, color: colors.ink3 }}>Change per-day hours & holidays anytime from Manage.</Text>
            </View>
          </View>
        )}
        {step === 4 && (
          <View>
            <Text style={{ fontFamily: F.extra, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: colors.ink }}>Pick your plan 💳</Text>
            <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12.5, color: colors.ink2 }}>Zero commission on every plan. Cancel anytime.</Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {[["basic", "Basic", "₹499/mo", "50 products • basic analytics"], ["growth", "Growth", "₹999/mo", "200 products • AI + coupons • most popular"], ["scale", "Scale", "₹2499/mo", "Unlimited • marketing suite"]].map(([k, t, pr, f]) => (
                <Pressable key={k} onPress={() => setSeller({ plan: k as "basic" | "growth" | "scale" })} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: seller.plan === k ? 2 : 1, borderColor: seller.plan === k ? "#0C831F" : colors.line, padding: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>{t} • {pr}</Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink3 }}>{f}</Text>
                  </View>
                  {seller.plan === k && (
                    <View style={{ height: 24, width: 24, borderRadius: 12, backgroundColor: "#0C831F", alignItems: "center", justifyContent: "center" }}>
                      <Check size={13} strokeWidth={3} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </Animated.View>

      {err ? (
        <View style={{ marginTop: 12, borderRadius: 12, backgroundColor: "rgba(226,55,68,.1)", padding: 12, alignItems: "center" }}>
          <Text style={{ fontFamily: F.bold, fontSize: 12, color: "#E23744" }}>{err}</Text>
        </View>
      ) : null}
      <View style={{ marginTop: 16, flexDirection: "row", gap: 8 }}>
        {step > 0 && (
          <Pressable onPress={() => { setErr(""); setStep(step - 1); }} style={{ borderRadius: 14, backgroundColor: colors.chip, paddingHorizontal: 20, paddingVertical: 16, justifyContent: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>Back</Text>
          </Pressable>
        )}
        <Pressable onPress={next} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, backgroundColor: "#0C831F", paddingVertical: 16 }}>
          {step < 4 ? (
            <>
              <Text style={{ fontFamily: F.extra, fontSize: 14.5, color: "#fff" }}>Continue</Text>
              <ChevronRight size={17} color="#fff" />
            </>
          ) : (
            <Text style={{ fontFamily: F.extra, fontSize: 14.5, color: "#fff" }}>🚀 Open my store</Text>
          )}
        </Pressable>
      </View>
      <Pressable onPress={() => set({ tab: "profile" })} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Bell size={13} color={colors.ink3} />
        <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: colors.ink3 }}>Notifications allowed • order alerts ON</Text>
      </Pressable>
      <View style={{ marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Phone size={15} color={colors.ink3} />
        <Users size={15} color={colors.ink3} />
        <StoreIcon size={15} color={colors.ink3} />
      </View>
    </ScrollView>
  );
}
