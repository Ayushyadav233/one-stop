import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { STORES } from "@/lib/data";
import { useOSB } from "@/lib/osb-store";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { AddStepper, AreaGraph, Glass, Img, Pill, Rating, Ring, SectionHead, SpringBtn, VegMark } from "@/components/ui";

/** Visual QA route: render every core component for web (430px) vs RN side-by-side check. */
export default function UiTest() {
  const { colors } = useTheme();
  const dark = useOSB((s) => s.dark);
  const set = useOSB((s) => s.set);
  const [qty, setQty] = useState(0);
  const [qtySm, setQtySm] = useState(2);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.app }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 19, color: colors.ink }}>
            UI QA • {dark ? "dark" : "light"}
          </Text>
          <Pressable
            onPress={() => set({ dark: !dark })}
            style={{ backgroundColor: colors.chip, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}
          >
            <Text style={{ fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 12.5, color: colors.ink }}>
              Toggle theme
            </Text>
          </Pressable>
        </View>

        <Glass style={{ padding: 16 }}>
          <Text style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 13, color: colors.ink }}>
            Glass (blur {tokens.blur.glass}) — subtitle over imagery in Phase 5
          </Text>
        </Glass>
        <Glass strong style={{ padding: 16 }}>
          <Text style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: 13, color: colors.ink }}>
            GlassStrong (blur {tokens.blur.glassStrong})
          </Text>
        </Glass>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pill>20+ categories</Pill>
          <Pill tint="rgba(226,55,68,.1)">✓ Fresh stock</Pill>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Rating v={4.7} count="2.1k" />
          <Rating v={4.2} />
          <Rating v={3.8} />
          <Rating v={3.1} />
        </View>

        <SectionHead
          title="Shop by craving"
          sub="Blinkit-fast • Zomato-tasty"
          action={<Text style={{ fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 12, color: colors.brand }}>see all ›</Text>}
        />

        <SpringBtn
          onPress={() => {}}
          style={{ backgroundColor: "#E23744", borderRadius: 16, paddingVertical: 16, alignItems: "center" }}
        >
          <Text style={{ fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 15, color: "#fff" }}>SpringBtn (tap → .94)</Text>
        </SpringBtn>

        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <AddStepper qty={qty} onAdd={() => setQty(1)} onInc={() => setQty(qty + 1)} onDec={() => setQty(Math.max(0, qty - 1))} />
          <AddStepper small qty={qtySm} onAdd={() => setQtySm(1)} onInc={() => setQtySm(qtySm + 1)} onDec={() => setQtySm(Math.max(0, qtySm - 1))} />
          <Text style={{ fontFamily: "PlusJakartaSans_500Medium", fontSize: 12, color: colors.ink2 }}>default 88×36 / small 72×30</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <VegMark veg />
          <VegMark veg={false} />
          <Text style={{ fontFamily: "PlusJakartaSans_500Medium", fontSize: 12, color: colors.ink2 }}>15×15 box, 7 dot/triangle</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          <Ring pct={72} />
          <Ring pct={92} size={64} label="fresh" />
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 12 }}>
          <AreaGraph values={[12, 19, 9, 24, 17, 30, 22]} />
        </View>

        <View style={{ height: 148, borderRadius: 20, overflow: "hidden" }}>
          <Img src={STORES[0].image} style={{ width: "100%", height: "100%" }} eager />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
