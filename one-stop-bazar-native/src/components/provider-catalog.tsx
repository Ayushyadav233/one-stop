/**
 * Provider catalog sheet — RN port of web src/components/provider-catalog.tsx.
 * Deltas (rest-state pixels identical):
 * - AnimatePresence bottom-sheet → absolute overlay + SlideInUp entering sheet.
 * - Thinking spinner rotate loop → static Bot tile + progress track (rest state identical).
 * - textarea → multiline TextInput; Enter key → onSubmitEditing.
 * Web usage: imported by provider.tsx (ProviderDash) and seller.tsx (SellerManage).
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react-native";
import { CATEGORIES, type CategoryDef } from "@/lib/data";
import { blip, useOSB } from "@/lib/osb-store";
import { useTheme } from "@/theme/ThemeProvider";
import { F, Img } from "./ui";

type Stage = "name" | "thinking" | "suggest" | "pick" | "request" | "attrs" | "published";

const KEYWORDS: { keys: string[]; cat: string; sub: string; attrs: string[] }[] = [
  { keys: ["dog", "cat", "pet", "puppy", "kibble", "leash"], cat: "Pet Supplies", sub: "Pet Supplies → Dog Food", attrs: ["Brand", "Weight", "Flavor", "Life stage"] },
  { keys: ["charger", "cable", "phone", "earbuds", "headphone", "adapter", "power bank"], cat: "Mobile & Computer", sub: "Mobile & Computer → Chargers", attrs: ["Brand", "Wattage", "Connector", "Warranty"] },
  { keys: ["shoe", "shoes", "sneaker", "kurti", "shirt", "tshirt", "dress", "jeans"], cat: "Fashion", sub: "Fashion → Footwear / Apparel", attrs: ["Brand", "Size", "Color", "Material", "Gender"] },
  { keys: ["cream", "serum", "shampoo", "makeup", "lipstick", "sunscreen"], cat: "Beauty & Care", sub: "Beauty & Care → Skincare", attrs: ["Brand", "Skin type", "Volume", "Vegan"] },
  { keys: ["milk", "atta", "rice", "oil", "vegetable", "fruit", "bread", "egg"], cat: "Grocery", sub: "Grocery → Staples / Dairy", attrs: ["Brand", "Weight", "Pack size", "Veg status"] },
  { keys: ["biryani", "dosa", "burger", "pizza", "meal", "thali"], cat: "Food", sub: "Food → Restaurant menu", attrs: ["Serves", "Veg status", "Spice level"] },
  { keys: ["chair", "table", "bed", "sofa", "furniture"], cat: "Furniture", sub: "Furniture → Chairs", attrs: ["Material", "Dimensions", "Color", "Assembly", "Warranty"] },
  { keys: ["drill", "paint", "pipe", "switch", "bulb", "wrench"], cat: "Hardware & Electrical", sub: "Hardware → Power tools", attrs: ["Brand", "Model", "Warranty", "Specifications"] },
  { keys: ["toy", "diaper", "baby", "bottle", "rattle"], cat: "Toys, Baby & Kids", sub: "Toys, Baby & Kids", attrs: ["Age group", "Brand", "Safety cert"] },
  { keys: ["dumbbell", "yoga", "cricket", "gym", "fitness"], cat: "Sports & Fitness", sub: "Sports & Fitness → Fitness", attrs: ["Brand", "Weight", "Material"] },
  { keys: ["car", "bike", "freshener", "mount"], cat: "Automobile", sub: "Automobile → Car accessories", attrs: ["Compatibility", "Brand", "Warranty"] },
];

export function ProviderCatalogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { requestCategory, addProduct, ensureCatalog } = useOSB();
  const { colors } = useTheme();
  const [stage, setStage] = useState<Stage>("name");
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState<CategoryDef | null>(null);
  const [attrs, setAttrs] = useState<string[]>([]);
  const [breadcrumb, setBreadcrumb] = useState("");
  const [conf, setConf] = useState(0);
  const [reqName, setReqName] = useState("");
  const [reqParent, setReqParent] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqEmoji, setReqEmoji] = useState("✨");
  const [price, setPrice] = useState("");

  const suggestion = useMemo(() => {
    const q = name.toLowerCase();
    return KEYWORDS.find((k) => k.keys.some((w) => q.includes(w)));
  }, [name]);

  const reset = () => { setStage("name"); setName(""); setChosen(null); setAttrs([]); setReqName(""); setPrice(""); };
  const close = () => { onClose(); setTimeout(reset, 250); };

  const runAi = () => {
    if (!name.trim()) return;
    setStage("thinking");
    blip(880, 0.1);
    setTimeout(() => {
      if (suggestion) {
        const cat = CATEGORIES.find((c) => c.t === suggestion.cat);
        setChosen(cat ?? null);
        setAttrs(suggestion.attrs);
        setBreadcrumb(suggestion.sub);
        setConf(92 + (name.length % 6));
      } else {
        setBreadcrumb("General → Uncategorized");
        setAttrs(["Brand", "Description"]);
        setConf(64);
      }
      setStage("suggest");
    }, 1600);
  };

  const publish = () => {
    ensureCatalog();
    addProduct({
      id: "cp-" + Math.random().toString(36).slice(2, 8),
      storeId: useOSB.getState().seller.storeId || "mine",
      name: name.trim() || "New product",
      description: attrs.length ? `Specs: ${attrs.join(", ")}.` : "Fresh from our store.",
      price: Math.max(1, +price || 99),
      emoji: "✨",
      image: chosen?.img ?? "",
      category: chosen?.t ?? "General",
      rating: 4.5,
      isVeg: true,
      isBestseller: false,
      stock: 20,
      unit: "1 pc",
      tint: "#F1F0EA",
      eta: "30 mins",
    });
    setStage("published");
    blip(990, 0.2);
  };

  if (!open) return null;

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 58 }}>
      <Animated.View entering={FadeIn} style={{ position: "absolute", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,.5)" }}>
        <Pressable onPress={close} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        entering={SlideInUp.springify().stiffness(230).damping(30)}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "92%",
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          backgroundColor: colors.app,
          overflow: "hidden",
        }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 }}>
          <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 999, backgroundColor: "rgba(0,0,0,.15)" }} />
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontFamily: F.extra, fontSize: 19, letterSpacing: -0.4, color: colors.ink }}>Add product</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>AI places it in the right category automatically</Text>
            </View>
            <Pressable onPress={close} style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.chip }}>
              <X size={17} color={colors.ink} />
            </Pressable>
          </View>

          {stage === "name" && (
            <Animated.View entering={FadeIn} style={{ marginTop: 16 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 11, letterSpacing: 1.2, color: colors.ink3 }}>PRODUCT NAME</Text>
              <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 6 }}>
                <Search size={16} color={colors.ink3} />
                <TextInput
                  autoFocus
                  value={name}
                  onChangeText={setName}
                  onSubmitEditing={runAi}
                  returnKeyType="done"
                  placeholder="e.g. Samsung 25W Fast Charger"
                  placeholderTextColor={colors.ink3}
                  style={{ flex: 1, fontFamily: F.semi, fontSize: 14, color: colors.ink, paddingVertical: 8 }}
                />
              </View>
              <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {["Royal Canin Dog Food 2KG", "Handmade Jute Bags", "Black Running Shoes", "Cold Pressed Coconut Oil 1L"].map((e) => (
                  <Pressable key={e} onPress={() => setName(e)} style={{ borderRadius: 999, backgroundColor: colors.chip, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: colors.ink2 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={runAi} style={{ marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, backgroundColor: colors.ink, paddingVertical: 16 }}>
                <Bot size={18} color={colors.app} />
                <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.app }}>Auto-detect category</Text>
              </Pressable>
              <Pressable onPress={() => setStage("pick")} style={{ marginTop: 8, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Choose category manually</Text>
              </Pressable>
            </Animated.View>
          )}

          {stage === "thinking" && (
            <View style={{ alignItems: "center", paddingVertical: 56 }}>
              <View style={{ height: 64, width: 64, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "rgba(124,92,255,.12)" }}>
                <Bot size={30} color="#7C5CFF" />
              </View>
              <Text style={{ marginTop: 16, fontFamily: F.extra, fontSize: 14, color: colors.ink }}>Reading catalog taxonomy…</Text>
              <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12, color: colors.ink3 }}>Matching “{name}” across {CATEGORIES.length} categories</Text>
              <View style={{ marginTop: 16, height: 6, width: 192, borderRadius: 999, backgroundColor: colors.chip, overflow: "hidden" }}>
                <View style={{ height: "100%", width: "33%", borderRadius: 999, backgroundColor: "#7C5CFF" }} />
              </View>
            </View>
          )}

          {stage === "suggest" && (
            <Animated.View entering={FadeIn} style={{ marginTop: 16 }}>
              <View style={{ borderRadius: 18, padding: 16, backgroundColor: "rgba(124,92,255,.09)", borderWidth: 1, borderColor: "rgba(124,92,255,.2)" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Sparkles size={12} color="#7C5CFF" />
                  <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1, color: "#7C5CFF" }}>SUGGESTED CATEGORY • {conf}% MATCH</Text>
                </View>
                <Text style={{ marginTop: 6, fontFamily: F.extra, fontSize: 15, lineHeight: 21, color: colors.ink }}>{breadcrumb}</Text>
                <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {attrs.map((a) => (
                    <View key={a} style={{ borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: colors.ink2 }}>{a}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => setStage("pick")} style={{ flex: 1, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 12, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>Change</Text>
                </Pressable>
                <Pressable onPress={() => { setStage("attrs"); blip(760); }} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 13, backgroundColor: "#0C831F", paddingVertical: 12 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#fff" }}>Confirm</Text>
                  <Check size={15} color="#fff" />
                </Pressable>
              </View>
              <Pressable onPress={() => setStage("request")} style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 13, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(124,92,255,.5)", backgroundColor: "rgba(124,92,255,.08)", paddingVertical: 14 }}>
                <Lightbulb size={15} color="#7C5CFF" />
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#7C5CFF" }}>Suggest a new category</Text>
              </Pressable>
              {conf < 75 && <Text style={{ marginTop: 8, fontFamily: F.medium, fontSize: 11, color: colors.ink3, textAlign: "center" }}>Low confidence — requesting a new category helps us improve.</Text>}
            </Animated.View>
          )}

          {stage === "pick" && (
            <View style={{ marginTop: 16 }}>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <Pressable key={c.k} onPress={() => { setChosen(c); setAttrs(c.subs.slice(0, 4)); setBreadcrumb(c.t); setStage("attrs"); blip(640); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 10 }}>
                    <View style={{ height: 40, width: 40, borderRadius: 12, overflow: "hidden", backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
                      {c.img ? <Img src={c.img} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 18 }}>{c.emoji}</Text>}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{c.t}</Text>
                      <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{c.subs.slice(0, 3).join(" • ")}</Text>
                    </View>
                    <ChevronRight size={15} color={colors.ink3} style={{ opacity: 0.4 }} />
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable onPress={() => setStage("request")} style={{ marginTop: 8, borderRadius: 13, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(124,92,255,.5)", paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#7C5CFF" }}>＋ Can’t find it? Suggest new category</Text>
              </Pressable>
            </View>
          )}

          {stage === "request" && (
            <Animated.View entering={FadeIn} style={{ marginTop: 16 }}>
              <View style={{ borderRadius: 16, backgroundColor: "rgba(124,92,255,.1)", padding: 14 }}>
                <Text style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 19, color: "#5A44D6" }}>
                  Your request goes to the <Text style={{ fontFamily: F.extra }}>Global Admin (CEO)</Text>. Once approved, the category appears in every customer’s app instantly — no app update needed.
                </Text>
              </View>
              <View style={{ marginTop: 12, gap: 10 }}>
                <Field label="Product / item name" colors={{ card: colors.card, ink: colors.ink, ink3: colors.ink3 }}>
                  <TextInput value={name} onChangeText={setName} placeholder="Product that needs a new category" placeholderTextColor={colors.ink3} style={{ fontFamily: F.semi, fontSize: 13.5, color: colors.ink, paddingVertical: 2 }} />
                </Field>
                <Field label="Suggested category *" colors={{ card: colors.card, ink: colors.ink, ink3: colors.ink3 }}>
                  <TextInput autoFocus value={reqName} onChangeText={setReqName} placeholder="e.g. Eco Living" placeholderTextColor={colors.ink3} style={{ fontFamily: F.semi, fontSize: 13.5, color: colors.ink, paddingVertical: 2 }} />
                </Field>
                <Field label="Parent category (optional)" colors={{ card: colors.card, ink: colors.ink, ink3: colors.ink3 }}>
                  <TextInput value={reqParent} onChangeText={setReqParent} placeholder="e.g. Lifestyle" placeholderTextColor={colors.ink3} style={{ fontFamily: F.semi, fontSize: 13.5, color: colors.ink, paddingVertical: 2 }} />
                </Field>
                <Field label="Why it’s needed" colors={{ card: colors.card, ink: colors.ink, ink3: colors.ink3 }}>
                  <TextInput value={reqDesc} onChangeText={setReqDesc} multiline numberOfLines={2} placeholder="Describe items this category will contain…" placeholderTextColor={colors.ink3} style={{ fontFamily: F.medium, fontSize: 13, color: colors.ink, paddingVertical: 2, minHeight: 40, textAlignVertical: "top" }} />
                </Field>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {["✨", "👜", "🧘", "🪴", "🎸", "🧩"].map((e) => (
                    <EmojiPick key={e} emoji={e} selected={reqEmoji === e} onPress={() => setReqEmoji(e)} />
                  ))}
                </View>
              </View>
              <Pressable
                onPress={() => {
                  if (!reqName.trim()) return;
                  requestCategory({ productName: name || reqName, category: reqName.trim(), parent: reqParent.trim() || undefined, description: reqDesc.trim() || "Requested from provider app.", emoji: reqEmoji, storeName: "Meghana Foods" });
                  blip(920, 0.15);
                  reset();
                  setStage("published");
                }}
                style={{ marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, backgroundColor: "#7C5CFF", paddingVertical: 16 }}
              >
                <Send size={16} color="#fff" />
                <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Send request to Global Admin</Text>
              </Pressable>
            </Animated.View>
          )}

          {stage === "attrs" && (
            <Animated.View entering={FadeIn} style={{ marginTop: 16 }}>
              <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1, color: colors.ink3 }}>PRODUCT</Text>
                <Text style={{ fontFamily: F.extra, fontSize: 14.5, color: colors.ink }}>{name}</Text>
                <View style={{ marginTop: 4, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "rgba(12,131,31,.1)", paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Check size={11} color="#0C831F" />
                  <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: "#0C831F" }}>{breadcrumb}</Text>
                </View>
              </View>
              <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {attrs.map((a) => (
                  <View key={a} style={{ width: "48%", borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 0.8, color: colors.ink3 }}>{a.toUpperCase()}</Text>
                    <TextInput placeholder="Tap to add" placeholderTextColor={colors.ink3} style={{ fontFamily: F.bold, fontSize: 12.5, color: colors.ink, paddingVertical: 2 }} />
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: colors.ink3 }}>PRICE ₹</Text>
                  <TextInput keyboardType="numeric" value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor={colors.ink3} style={{ fontFamily: F.bold, fontSize: 12.5, color: colors.ink, paddingVertical: 2 }} />
                </View>
                <View style={{ flex: 1, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: colors.ink3 }}>MRP ₹</Text>
                  <TextInput keyboardType="numeric" placeholder="0" placeholderTextColor={colors.ink3} style={{ fontFamily: F.bold, fontSize: 12.5, color: colors.ink, paddingVertical: 2 }} />
                </View>
                <View style={{ flex: 1, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: colors.ink3 }}>STOCK</Text>
                  <TextInput keyboardType="numeric" placeholder="0" placeholderTextColor={colors.ink3} style={{ fontFamily: F.bold, fontSize: 12.5, color: colors.ink, paddingVertical: 2 }} />
                </View>
              </View>
              <View style={{ marginTop: 10, borderRadius: 13, borderWidth: 2, borderStyle: "dashed", borderColor: colors.line, padding: 16, alignItems: "center" }}>
                <Text style={{ fontSize: 24 }}>📷</Text>
                <Text style={{ marginTop: 2, fontFamily: F.bold, fontSize: 11.5, color: colors.ink2 }}>Add up to 5 photos</Text>
              </View>
              <Pressable onPress={publish} style={{ marginTop: 16, borderRadius: 14, backgroundColor: "#0C831F", paddingVertical: 16, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Publish product</Text>
              </Pressable>
            </Animated.View>
          )}

          {stage === "published" && (
            <Animated.View entering={FadeIn} style={{ alignItems: "center", paddingVertical: 48 }}>
              <View style={{ height: 80, width: 80, alignItems: "center", justifyContent: "center", borderRadius: 40, backgroundColor: "#0C831F" }}>
                <CheckCircle2 size={40} color="#fff" />
              </View>
              <Text style={{ marginTop: 16, fontFamily: F.extra, fontSize: 19, color: colors.ink }}>Submitted! 🎉</Text>
              <Text style={{ marginTop: 4, maxWidth: 270, fontFamily: F.medium, fontSize: 12.5, lineHeight: 19, color: colors.ink2, textAlign: "center" }}>
                {reqName ? <>Your request for <Text style={{ fontFamily: F.extra, color: colors.ink }}>“{reqName}”</Text> is now in the Global Admin queue. You’ll be notified the moment it’s approved.</> : <>Your product is live and searchable. The AI catalog updates instantly.</>}
              </Text>
              <Pressable onPress={close} style={{ marginTop: 20, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: colors.ink, paddingHorizontal: 32, paddingVertical: 12 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.app }}>Done</Text>
                <ArrowRight size={14} color={colors.app} />
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function EmojiPick({ selected, onPress, emoji }: { selected: boolean; onPress: () => void; emoji: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 36,
        width: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        backgroundColor: selected ? "#7C5CFF" : colors.card,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? "rgba(124,92,255,.4)" : colors.line,
      }}
    >
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
    </Pressable>
  );
}

function Field({ label, children, colors }: { label: string; children: React.ReactNode; colors: { card: string; ink: string; ink3: string } }) {
  return (
    <View style={{ borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(17,17,20,0.08)", paddingHorizontal: 14, paddingVertical: 10 }}>
      <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.2, color: colors.ink3 }}>{label.toUpperCase()}</Text>
      <View style={{ marginTop: 2 }}>{children}</View>
    </View>
  );
}
