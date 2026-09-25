/**
 * Core UI — RN port of web src/components/ui.tsx (pixel specs in docs/design.md §4).
 * Geometry (h/w/radius/padding/fontSize) is 1:1 with web. Known mobile-only deltas:
 * - SpringBtn whileHover (1.015) skipped — no hover on touch.
 * - AreaGraph pathLength draw-on replaced with opacity fade (rest state identical).
 * - tabular-nums has no RN equivalent — qty uses 800ExtraBold (same visual width class).
 * - grain overlay skipped (visual-only, no RN equivalent).
 */
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Star } from "lucide-react-native";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Pressable, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Polygon, Polyline, Stop } from "react-native-svg";
import { cn } from "@/lib/cn";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

/** Loaded font families (see src/app/_layout.tsx). */
export const F = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semi: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extra: "PlusJakartaSans_800ExtraBold",
  display: "Fraunces_700Bold",
  displaySemi: "Fraunces_600SemiBold",
} as const;

/* ── Glass (web .glass/.glass-strong, radius 24) ── */
export function Glass({
  children,
  style,
  strong,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean;
}) {
  const { name } = useTheme();
  const g = name === "dark" ? tokens.glass.dark : tokens.glass.light;
  return (
    <BlurView
      intensity={strong ? tokens.blur.glassStrong : tokens.blur.glass}
      tint={name}
      style={[
        {
          borderRadius: tokens.radius.r24,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: strong ? g.strongBorder : g.border,
          backgroundColor: strong ? g.strongBg : g.bg,
          ...tokens.shadow.rn.soft.ios,
          elevation: tokens.shadow.rn.soft.elevation,
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

/* ── Pill (11px bold, rounded-full, px-10/py-4) ── */
export function Pill({
  children,
  style,
  textStyle,
  tint,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<ViewStyle>;
  tint?: string;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 4,
          backgroundColor: tint ?? "rgba(20,19,24,.06)",
        },
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Text style={[{ fontFamily: F.bold, fontSize: 11, letterSpacing: -0.2 }, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

/* ── Rating (Zomato-style, thresholds from ui.tsx:24) ── */
export function Rating({ v, count, style }: { v: number; count?: string; style?: StyleProp<ViewStyle> }) {
  const bg = tokens.ui.ratingBg(v);
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          borderRadius: tokens.ui.rating.radius,
          paddingHorizontal: tokens.ui.rating.padH,
          paddingVertical: tokens.ui.rating.padV,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#fff" }}>{v.toFixed(1)}</Text>
      <Star size={tokens.ui.rating.starSize} fill="currentColor" strokeWidth={0} color="#fff" />
      {count ? <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: "#fff", opacity: 0.8 }}>({count})</Text> : null}
    </View>
  );
}

/* ── SectionHead (title 17 extrabold, sub 12 medium) ── */
export function SectionHead({
  title,
  sub,
  action,
  light,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  light?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 4 }}>
      <View>
        <Text
          style={{
            fontFamily: F.extra,
            fontSize: 17,
            lineHeight: 20,
            letterSpacing: -0.4,
            color: light ? "#fff" : colors.ink,
          }}
        >
          {title}
        </Text>
        {sub ? (
          <Text
            style={{
              marginTop: 4,
              fontFamily: F.medium,
              fontSize: 12,
              color: light ? "rgba(255,255,255,.7)" : colors.ink2,
            }}
          >
            {sub}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

/* ── Press-scale helper (spring 500/28, web SpringBtn parity) ── */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePressScale(to = 0.94) {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return {
    style,
    pressIn: () => {
      s.value = withSpring(to, { stiffness: tokens.ui.springBtn.stiffness, damping: tokens.ui.springBtn.damping });
    },
    pressOut: () => {
      s.value = withSpring(1, { stiffness: tokens.ui.springBtn.stiffness, damping: tokens.ui.springBtn.damping });
    },
  };
}

export function SpringBtn({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePressScale(tokens.ui.springBtn.tapScale);
  return (
    <AnimatedPressable onPress={onPress} onPressIn={p.pressIn} onPressOut={p.pressOut} style={[p.style, style]}>
      {children}
    </AnimatedPressable>
  );
}

/* ── AddStepper (Blinkit-style, exact h/w from ui.tsx:62) ── */
export function AddStepper({
  qty,
  onAdd,
  onInc,
  onDec,
  small,
}: {
  qty: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  small?: boolean;
}) {
  const spec = small ? tokens.ui.addStepper.small : tokens.ui.addStepper.regular;
  const p = usePressScale(0.88);
  if (qty === 0)
    return (
      <AnimatedPressable
        onPress={onAdd}
        onPressIn={p.pressIn}
        onPressOut={p.pressOut}
        style={[
          p.style,
          {
            height: spec.h,
            width: spec.w,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: tokens.ui.addStepper.radius,
            borderWidth: tokens.ui.addStepper.borderWidth,
            borderColor: tokens.ui.addStepper.borderColor,
            backgroundColor: "#fff",
            // shadow 0 4px 12px rgba(12,131,31,.18)
            shadowColor: "#0C831F",
            shadowOpacity: 0.24,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
          },
        ]}
      >
        <Text
          style={{
            fontFamily: F.extra,
            fontSize: spec.fontSize,
            letterSpacing: 0.5,
            color: tokens.ui.addStepper.borderColor,
          }}
        >
          ADD
        </Text>
      </AnimatedPressable>
    );
  return (
    <View
      style={{
        height: spec.h,
        width: spec.w,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: tokens.ui.addStepper.radius,
        backgroundColor: tokens.ui.addStepper.filledBg,
        paddingHorizontal: small ? 4 : 6,
        // shadow 0 6px 16px rgba(12,131,31,.35)
        shadowColor: "#0C831F",
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      <Pressable
        onPress={onDec}
        hitSlop={6}
        style={{ height: 24, width: 24, alignItems: "center", justifyContent: "center", borderRadius: 6 }}
      >
        <Text style={{ fontFamily: F.extra, fontSize: 18, lineHeight: 20, color: "#fff" }}>−</Text>
      </Pressable>
      <Text style={{ fontFamily: F.extra, fontSize: spec.qtySize, color: "#fff", minWidth: 16, textAlign: "center" }}>
        {qty}
      </Text>
      <Pressable
        onPress={onInc}
        hitSlop={6}
        style={{ height: 24, width: 24, alignItems: "center", justifyContent: "center", borderRadius: 6 }}
      >
        <Text style={{ fontFamily: F.extra, fontSize: 18, lineHeight: 20, color: "#fff" }}>+</Text>
      </Pressable>
    </View>
  );
}

/* ── Img (expo-image, cover) ── */
export function Img({
  src,
  style,
  eager,
}: {
  src: string;
  style?: StyleProp<ImageStyle>;
  eager?: boolean;
}) {
  return (
    <Image
      source={{ uri: src }}
      style={style}
      contentFit="cover"
      priority={eager ? "high" : "low"}
      cachePolicy="memory-disk"
    />
  );
}

/* ── AreaGraph (react-native-svg, default pine/88) ── */
export function AreaGraph({
  values,
  color = "#0E3B2E",
  height = 88,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 300},${height - 8 - (v / max) * (height - 24)}`).join(" ");
  const id = "g" + Math.abs(values.reduce((a, b) => a + b, 0)).toString(36);
  const opacity = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  opacity.value = withTiming(1, { duration: 1200, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  return (
    <Animated.View style={[{ width: "100%", height }, animStyle]}>
      <Svg width="100%" height={height} viewBox={`0 0 300 ${height}`}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Polygon points={`0,${height} ${pts} 300,${height}`} fill={`url(#${id})`} />
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => (
          <Circle
            key={i}
            cx={(i / (values.length - 1)) * 300}
            cy={height - 8 - (v / max) * (height - 24)}
            r={i === values.length - 2 ? 4.5 : 2.4}
            fill={i === values.length - 2 ? color : "#fff"}
            stroke={color}
            strokeWidth={2}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

/* ── Ring (default 92, track .18 grey, progress #1FB67C) ── */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function Ring({ pct, size = 92, label }: { pct: number; size?: number; label?: string }) {
  const { colors } = useTheme();
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const offset = useSharedValue(c);
  offset.value = withTiming(c - (c * pct) / 100, {
    duration: 1400,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(127,127,140,.18)" strokeWidth={9} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#1FB67C"
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ fontFamily: F.display, fontSize: 22, lineHeight: 24, color: colors.ink }}>{pct}</Text>
        <Text
          style={{
            fontFamily: F.bold,
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: colors.ink3,
          }}
        >
          {label ?? "health"}
        </Text>
      </View>
    </View>
  );
}

/* ── VegMark (15x15 box, 7 dot / triangle) ── */
export function VegMark({ veg }: { veg: boolean }) {
  const color = veg ? tokens.ui.veg.veg : tokens.ui.veg.nonVeg;
  return (
    <View
      style={{
        height: tokens.ui.veg.box,
        width: tokens.ui.veg.box,
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 4,
        borderWidth: tokens.ui.veg.borderWidth,
        borderColor: color,
        backgroundColor: "#fff",
      }}
    >
      {veg ? (
        <View style={{ height: tokens.ui.veg.dot, width: tokens.ui.veg.dot, borderRadius: 999, backgroundColor: color }} />
      ) : (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 4,
            borderRightWidth: 4,
            borderBottomWidth: 7,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: color,
          }}
        />
      )}
    </View>
  );
}

/* ── LiveDot (1.6s yoyo pulse, web .live-dot) ── */
export function LiveDot({ color = "#0C831F", size = 6 }: { color?: string; size?: number }) {
  const s = useSharedValue(1);
  const o = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(withTiming(0.82, { duration: tokens.animation.liveDotMs / 2 }), -1, true);
    o.value = withRepeat(withTiming(0.55, { duration: tokens.animation.liveDotMs / 2 }), -1, true);
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: o.value }));
  return <Animated.View style={[{ height: size, width: size, borderRadius: size / 2, backgroundColor: color }, st]} />;
}

export { cn };
