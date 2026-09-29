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
import { Image as ExpoImage } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Alert, Dimensions, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, FadeIn, SlideInRight, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
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
import { activeCategories, blip, useMarketplace, useOSB } from "@/lib/osb-store";
import { apiGetCoupons, apiMyReviews, HOME_CONFIG_DEFAULTS, apiAdminPatchHomeBlock, apiAdminDeleteHomeBlock, apiAdminPostHomeBlock, apiAdminPatchHomeConfig, apiAdminPublishHome, apiAdminRevertHome, apiAdminHomeVersions, type ApiHomeBlock, type ApiHomeVersion } from "@/lib/api";
import { useSheetBackCloser } from "@/lib/back";
import { unregisterForPush } from "@/lib/push";
import { useT } from "@/lib/i18n";
import { statusLabel } from "@/lib/commerce";
import { useTheme } from "@/theme/ThemeProvider";
import { AddStepper, F, Glass, Img, LiveDot, Rating, SectionHead, SpringBtn, VegMark } from "./ui";
import { EditProfileSheet } from "./profile-setup";
import { ChangeLocationSheet } from "./location-setup";
import { CouponsSheet, HelpSheet, ReviewsSheet, SettingsSheet, WalletSheet } from "./profile-sheets";

function useGreeting() {
  const h = new Date().getHours();
  return greetingForHour(h);
}

/* ═══════════ CustomerHome ═══════════ */
type Banner = { img: string; tag: string; title: string; sub: string; cta: string; colors: readonly [string, string, string]; linkKind?: string; linkValue?: string; font?: string; tcolor?: string };
const DEFAULT_BANNERS: Banner[] = [
  { img: STORES[0].image, tag: "MEGHANA FEST", title: "50% OFF Biryani", sub: "Code BAZAR50 • Free delivery", cta: "Order now", colors: ["rgba(10,10,10,.78)", "rgba(10,10,10,.15)", "transparent"] as const },
  { img: STORES[4].image, tag: "FRESH AT 6 AM", title: "Veggies in 12 mins", sub: "Farm direct • 20% OFF", cta: "Shop fresh", colors: ["rgba(14,59,46,.85)", "rgba(14,59,46,.15)", "transparent"] as const },
  { img: STORES[9].image, tag: "GLOW AT HOME", title: "Salon @ ₹1499", sub: "O3+ facial • 4.9★ pros", cta: "Book now", colors: ["rgba(60,20,60,.8)", "rgba(60,20,60,.1)", "transparent"] as const },
];
const BANNER_TINTS: Banner["colors"][] = [
  ["rgba(10,10,10,.78)", "rgba(10,10,10,.15)", "transparent"],
  ["rgba(14,59,46,.85)", "rgba(14,59,46,.15)", "transparent"],
  ["rgba(60,20,60,.8)", "rgba(60,20,60,.1)", "transparent"],
];
const DEFAULT_STRIPS = ["50% OFF up to ₹100", "Free delivery over ₹199", "20% cashback", "₹200 OFF services"];

/** Admin CMS block → carousel banner (fallback tints cycle). */
function blockToBanner(b: ApiHomeBlock, i: number): Banner {  const tints = BANNER_TINTS[i % BANNER_TINTS.length];
  return {
    img: b.image || "",
    tag: (b.tag || "OFFER").toUpperCase(),
    title: b.title || "",
    sub: b.sub || "",
    cta: b.cta || "Shop now",
    colors: [b.c1 || tints[0], b.c2 || tints[1], "transparent"] as const,
    linkKind: b.linkKind || "none",
    linkValue: b.linkValue || "",
    font: b.font || "serif",
    tcolor: b.tcolor || "",
  };
}
/* Card titles (banner/ad/festival): picked font + colour, else current look. */
export function cardTitleFamily(b: { font?: string }): string {
  if (b.font === "heavy") return F.extra;
  if (b.font === "bold") return F.bold;
  return F.display;
}
/* CTA button: sizes + auto text contrast (dark text on light bg, white on dark). */
export const CTA_SIZES = {
  s: { font: 12, padH: 16, padV: 7 },
  m: { font: 14, padH: 24, padV: 11 },
  l: { font: 16, padH: 30, padV: 14 },
} as const;
export const CTA_COLORS = ["#FFE45E", "#FFFFFF", "#FF7A00", "#E23744", "#0C831F", "#111114"];
export function ctaSize(b: { ctasize?: string }): { font: number; padH: number; padV: number } {
  if (b.ctasize === "s" || b.ctasize === "l") return CTA_SIZES[b.ctasize];
  return CTA_SIZES.m;
}
export function contrastOn(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex || "");
  if (!m) return "#1B0B4D";
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.45 ? "#FFFFFF" : "#1B0B4D";
}

/* Festival themes (Swiggy/Blinkit style seasonal takeovers) + card placement. */
export const FESTIVAL_THEMES: Record<string, { emoji: string; label: string; c1: string; c2: string }> = {
  none: { emoji: "✨", label: "Default", c1: "rgba(74,14,46,.92)", c2: "rgba(74,14,46,.55)" },
  concert: { emoji: "🎷", label: "Concert", c1: "rgba(30,8,70,.96)", c2: "rgba(150,30,150,.6)" },
  diwali: { emoji: "🪔", label: "Diwali", c1: "rgba(74,14,46,.95)", c2: "rgba(180,80,20,.55)" },
  christmas: { emoji: "🎄", label: "Christmas", c1: "rgba(10,60,40,.95)", c2: "rgba(180,30,40,.5)" },
  holi: { emoji: "🎨", label: "Holi", c1: "rgba(90,20,90,.92)", c2: "rgba(20,140,160,.5)" },
  newyear: { emoji: "🎆", label: "New Year", c1: "rgba(8,10,40,.95)", c2: "rgba(90,60,220,.55)" },
  monsoon: { emoji: "🌧️", label: "Monsoon", c1: "rgba(10,40,80,.94)", c2: "rgba(30,120,150,.5)" },
};
/* Headline fonts & colours — picked per banner in the editor (fully editable). */
export const HEADLINE_FONTS = [
  { k: "serif", label: "Festive Serif", family: "Fraunces_700Bold", italic: true },
  { k: "heavy", label: "Heavy Sans", family: "PlusJakartaSans_800ExtraBold", italic: false },
  { k: "bold", label: "Classic Bold", family: "PlusJakartaSans_700Bold", italic: false },
] as const;
export function headlineFont(b: { font?: string }) {
  return HEADLINE_FONTS.find((f) => f.k === (b.font || "serif")) ?? HEADLINE_FONTS[0];
}
export const HEADLINE_COLORS = ["#FFE45E", "#FFFFFF", "#FFD166", "#FF7A00", "#FF4D6D", "#7DF9A2"];
export const HEADLINE_SIZES = [
  { k: "s", label: "Small", px: 30 },
  { k: "m", label: "Medium", px: 38 },
  { k: "l", label: "Large", px: 48 },
] as const;
export function headlinePx(layout?: { hs?: string }): number {
  return HEADLINE_SIZES.find((s) => s.k === layout?.hs)?.px ?? 38;
}
/* Drag wrapper (edit arrange-mode): finger-drag moves the element, release saves.
   Gesture is memoized so unrelated re-renders (banner auto-advance timer) can't
   break a drag mid-way. Clamp applies LIVE while dragging so drop == saved. */
function Draggable({ ix, iy, minX, maxX, minY, maxY, onBegin, onEnd, style, children }: {
  ix: number; iy: number;
  minX: number; maxX: number; minY: number; maxY: number;
  onBegin?: () => void;
  onEnd: (x: number, y: number) => void;
  style?: object; children: React.ReactNode;
}) {
  const x = useSharedValue(ix);
  const y = useSharedValue(iy);
  const sx = useSharedValue(ix);
  const sy = useSharedValue(iy);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const beginRef = useRef(onBegin);
  beginRef.current = onBegin;
  useEffect(() => {
    x.value = ix;
    y.value = iy;
  }, [ix, iy]);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          sx.value = x.value;
          sy.value = y.value;
          if (beginRef.current) runOnJS(beginRef.current)();
        })
        .onUpdate((e) => {
          "worklet";
          x.value = Math.min(maxX, Math.max(minX, sx.value + e.translationX));
          y.value = Math.min(maxY, Math.max(minY, sy.value + e.translationY));
        })
        .onEnd(() => {
          runOnJS(endRef.current)(Math.round(x.value), Math.round(y.value));
        }),
    [minX, maxX, minY, maxY]
  );
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }] }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[style, st]}>{children}</Animated.View>
    </GestureDetector>
  );
}
/* Title colour: explicit pick wins, else kind default (showcase gold, others white). */
export function headlineColor(b: { kind: string; tcolor?: string }): string {
  if (b.tcolor) return b.tcolor;
  return b.kind === "showcase" ? "#FFE45E" : "#FFFFFF";
}
export const HOME_SLOTS = [  { k: "top", label: "Top announcement bar", hint: "Slim strip above everything" },
  { k: "banners", label: "Hero carousel", hint: "Big swipeable banners" },
  { k: "strips", label: "Offer ticker", hint: "Small scrolling offer pills" },
  { k: "mid", label: "Mid-home promos", hint: "Cards between sections" },
  { k: "festival", label: "Festival spotlight", hint: "Seasonal takeover card" },
  { k: "bottom", label: "Bottom promos", hint: "Cards at the end of home" },
  { k: "feed", label: "In-feed", hint: "Between store sections" },
] as const;
/** Placement of a block (old blocks without slot keep legacy positions). */
export function slotOf(b: ApiHomeBlock): string {
  if (b.kind === "showcase") return "showcase";
  if (b.slot) return b.slot;
  if (b.kind === "banner") return "banners";
  if (b.kind === "strip") return "strips";
  if (b.kind === "festival") return "festival";
  return "mid";
}
/* Stock: out-of-stock (stock<=0, missing stock counts as in-stock) sorts last. */
export function isOutOfStock(p: { stock?: number | null }): boolean {
  return (p.stock ?? 1) <= 0;
}
export function inStockFirst<T extends { stock?: number | null }>(list: T[]): T[] {
  return [...list].sort((a, b) => Number(isOutOfStock(a)) - Number(isOutOfStock(b)));
}
/* Empty draft cards (no text, no image, no playable GIF) never render for
   customers — they stay visible in admin lists so they can be completed. */
export function hasCardContent(b: ApiHomeBlock): boolean {
  if ((b.title || "").trim() || (b.tag || "").trim() || (b.sub || "").trim() || (b.cta || "").trim()) return true;
  if ((b.image || "").trim()) return true;
  if (isPlayableVideoUrl(b.video || "")) return true;
  return false;
}

/* ── Festive stage banner (Zomato-style): fixed template, animated floating
   objects. Admin uploads title/art/theme — mascots, beams & motion auto-fit. ── */
const SHOWCASE_OBJECTS: Record<string, string[]> = {
  concert: ["🎷", "🎺", "🎤", "🥁", "🎹", "✨", "🎸"],
  diwali: ["🪔", "✨", "🎆", "🌟", "💜", "🪔", "✨"],
  christmas: ["🎄", "❄️", "🎅", "⭐", "🔔", "❄️", "🎁"],
  holi: ["🎨", "💜", "💛", "💚", "✨", "🎉", "🌈"],
  newyear: ["🎆", "🥂", "✨", "🌟", "🎉", "💫", "🎇"],
  monsoon: ["🌧️", "☔", "⚡", "💧", "🌈", "✨", "🍵"],
  none: ["✨", "🎉", "⭐", "🎊", "💫", "🌟", "🎈"],
};
function showcaseObjects(theme?: string): string[] {
  return SHOWCASE_OBJECTS[theme ?? "none"] ?? SHOWCASE_OBJECTS.none;
}
/* Only direct media files can play — page links (pixabay.com/videos/…) are
   HTML, not video. Invalid URLs never reach the player (no crash, template
   shows instead) and the editor warns about them. */
const FLOAT_SPOTS = [
  { left: "6%", top: 226, size: 30, dur: 1500, delay: 0 },
  { left: "20%", top: 280, size: 24, dur: 1900, delay: 300 },
  { left: "34%", top: 214, size: 34, dur: 1700, delay: 150 },
  { left: "52%", top: 270, size: 26, dur: 2100, delay: 500 },
  { left: "66%", top: 222, size: 32, dur: 1600, delay: 250 },
  { left: "80%", top: 280, size: 28, dur: 2000, delay: 100 },
  { left: "90%", top: 234, size: 22, dur: 1800, delay: 400 },
] as const;
function Floater({ emoji, left, top, size, dur, delay }: { emoji: string; left: string; top: number; size: number; dur: number; delay: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(-14, { duration: dur, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: left as never, top }, st]}>
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
}
/* Stage animation — animated GIF via expo-image (native code ships in every
   build, no rebuild needed, plays instantly). MP4/video files are NOT played
   (expo-video removed: its JS fatals old binaries on load, uncatchably). */
export const DIWALI_GIF_PRESET = "https://media.giphy.com/media/l0IsI60BLJxcgNdkY/giphy.gif";
export function isPlayableVideoUrl(u: string): boolean {
  const s = (u || "").trim();
  return /^https?:\/\/.+\.(gif|webp)(\?|#|$)/i.test(s);
}
export function isMp4Url(u: string): boolean {
  return /^https?:\/\/.+\.(mp4|m3u8|mov)(\?|#|$)/i.test((u || "").trim());
}
function StageAnimation({ url }: { url: string }) {
  return (
    <ExpoImage
      source={{ uri: url.trim() }}
      style={{ position: "absolute", width: "100%", height: "100%" }}
      contentFit="cover"
      cachePolicy="memory-disk"
    />
  );
}
function ConfettiPiece({ emoji, left, size, dur, delay }: { emoji: string; left: string; size: number; dur: number; delay: number }) {
  const y = useSharedValue(-50);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(460, { duration: dur, easing: Easing.linear }), -1, false));
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: left as never, top: 0 }, st]}>
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
}
function SweepBeam() {  const W = Dimensions.get("window").width;
  const x = useSharedValue(-W / 2);
  useEffect(() => {
    x.value = withRepeat(withTiming(W / 2, { duration: 2600, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: "18deg" }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: "50%", top: -40, width: 90, height: 480, backgroundColor: "rgba(255,255,255,.12)", marginLeft: -45 }, st]} />
  );
}
export const MOTION_OPTS = [
  { k: "floaters", label: "Floating objects", desc: "Mascots gently bobbing" },
  { k: "confetti", label: "Falling confetti", desc: "Objects rain from the top" },
  { k: "spotlight", label: "Spotlight sweep", desc: "Light beam sweeping the stage" },
  { k: "none", label: "Static", desc: "Video/art only, no overlay motion" },
] as const;
/* Motion overlay for the stage — picked per banner in the editor. */
function MotionLayer({ preset, theme }: { preset?: string; theme?: string }) {  const objs = showcaseObjects(theme);
  if (preset === "confetti") {
    return (
      <>
        {FLOAT_SPOTS.map((s, i) => (
          <ConfettiPiece key={i} emoji={objs[i % objs.length]} left={s.left} size={Math.max(16, s.size - 8)} dur={s.dur + 1600} delay={s.delay + i * 350} />
        ))}
      </>
    );
  }
  if (preset === "spotlight") return <SweepBeam />;
  if (preset === "none") return null;
  return (
    <>
      {FLOAT_SPOTS.map((s, i) => (
        <Floater key={i} emoji={objs[i % objs.length]} left={s.left} top={s.top} size={s.size} dur={s.dur} delay={s.delay} />
      ))}
    </>
  );
}
/* Festive headline — 3D gold letters with staggered wave motion + twinkles.
   Fraunces display serif for the festive feel, maroon depth stack behind. */
function WaveLetter({ ch, i, family, italic, color, px }: { ch: string; i: number; family: string; italic: boolean; color: string; px: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      i * 90,
      withRepeat(withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true)
    );
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  if (ch === " ") return <Text style={{ fontFamily: family, fontSize: px }}> </Text>;
  return (
    <Animated.View style={st}>
      <Text
        style={{
          fontFamily: family,
          fontSize: px,
          letterSpacing: 1,
          color,
          fontStyle: italic ? "italic" : "normal",
          textShadowColor: "rgba(90,10,0,.9)",
          textShadowOffset: { width: 0, height: 3 },
          textShadowRadius: 0,
        }}
      >
        {ch}
      </Text>
    </Animated.View>
  );
}
function Twinkle({ left, top, size, delay, dur }: { left: string; top: number; size: number; delay: number; dur: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(delay, withRepeat(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: 0.15 + o.value * 0.85, transform: [{ scale: 0.7 + o.value * 0.5 }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: left as never, top }, st]}>
      <Text style={{ fontSize: size }}>✨</Text>
    </Animated.View>
  );
}
function AnimatedHeadline({ text, font, color, px }: { text: string; font?: string; color?: string; px?: number }) {
  const clean = (text || "FESTIVAL").toUpperCase();
  const letters = clean.split("");
  const face = headlineFont({ font });
  const ink = color || "#FFE45E";
  const size = px ?? 38;
  const glow = useSharedValue(1);
  useEffect(() => {
    glow.value = withRepeat(withTiming(1.03, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [text]);
  const glowSt = useAnimatedStyle(() => ({ transform: [{ scale: glow.value }] }));
  const depthStyle = {
    position: "absolute" as const,
    left: 0,
    right: 0,
    textAlign: "center" as const,
    fontFamily: face.family,
    fontSize: size,
    letterSpacing: 1,
    fontStyle: (face.italic ? "italic" : "normal") as "italic" | "normal",
  };
  return (
    <View style={{ position: "relative", alignItems: "center" }}>
      <Twinkle left="4%" top={-6} size={16} delay={0} dur={1100} />
      <Twinkle left="90%" top={-10} size={20} delay={500} dur={1300} />
      <Twinkle left="82%" top={30} size={13} delay={900} dur={1000} />
      <Twinkle left="10%" top={34} size={13} delay={300} dur={1200} />
      <Text accessible={false} style={[depthStyle, { top: 5, color: "rgba(0,0,0,.55)" }]}>
        {clean}
      </Text>
      <Text accessible={false} style={[depthStyle, { top: 2.5, color: "rgba(0,0,0,.3)" }]}>
        {clean}
      </Text>
      <Animated.View style={[{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }, glowSt]}>
        {letters.map((ch, i) => (
          <WaveLetter key={`${ch}-${i}`} ch={ch} i={i} family={face.family} italic={face.italic} color={ink} px={size} />
        ))}
      </Animated.View>
    </View>
  );
}
/* Festive hero (Zomato style): location + search live INSIDE the stage banner.
   Backdrop priority: uploaded video → uploaded art → theme gradient template.
   Motion overlay (floaters/confetti/spotlight) auto-fits on top of any backdrop. */
function ShowcaseHeroCard({ b, header, onTap, onEdit, editing, arrange, onMove, onToggleArrange, onDragStart }: { b: ApiHomeBlock; header: React.ReactNode; onTap: () => void; onEdit: () => void; editing: boolean; arrange: boolean; onMove: (patch: { hx?: number; hy?: number; cx?: number; cy?: number; ax?: number; ay?: number }) => void; onToggleArrange: () => void; onDragStart: () => void }) {
  const W = Dimensions.get("window").width;
  const th = FESTIVAL_THEMES[b.theme ?? "none"] ?? FESTIVAL_THEMES.none;
  const hasVideo = isPlayableVideoUrl(b.video || "");
  const hasArt = !!(b.image || "").trim();
  const hasBackdrop = hasVideo || hasArt;
  const z = Math.min(2.5, Math.max(1, Number(b.zoom) || 1));
  const pos = b.artpos === "top" || b.artpos === "bottom" ? b.artpos : "center";
  const contentJustify = b.align === "top" ? "flex-start" : b.align === "bottom" ? "flex-end" : "center";
  const stageH = Math.min(700, Math.max(280, Math.round(Number(b.stageh) || 460)));
  const L = b.layout ?? {};
  const hx = Number(L.hx) || 0;
  const hy = Number(L.hy) || 0;
  const cx = Number(L.cx) || 0;
  const cy = Number(L.cy) || 0;
  const ax = Number(L.ax) || 0;
  const ay = Number(L.ay) || 0;
  const [heroH, setHeroH] = useState(0);
  return (
    <View style={{ width: W, minHeight: stageH, overflow: "hidden", backgroundColor: "#1B0B4D" }} onLayout={(e) => setHeroH(e.nativeEvent.layout.height)}>
      {/* fitted artwork — pan (top/center/bottom) + zoom, set from the editor */}
      {hasBackdrop && heroH > 0 && (
        arrange && editing ? (
          <Draggable
            ix={ax}
            iy={ay}
            minX={-220}
            maxX={220}
            minY={-260}
            maxY={260}
            onBegin={() => onDragStart()}
            onEnd={(x, y) => onMove({ ax: x, ay: y })}
            style={{
              position: "absolute",
              left: (W - W * z) / 2,
              top: pos === "top" ? 0 : pos === "bottom" ? heroH - heroH * z : (heroH - heroH * z) / 2,
              width: W * z,
              height: heroH * z,
              overflow: "hidden",
            }}
          >
            {hasVideo ? (
              <ExpoImage source={{ uri: (b.video || "").trim() }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <Img src={(b.image || "").trim()} style={{ width: "100%", height: "100%" }} />
            )}
          </Draggable>
        ) : (
          <View
            style={{
              position: "absolute",
              left: (W - W * z) / 2,
              top: pos === "top" ? 0 : pos === "bottom" ? heroH - heroH * z : (heroH - heroH * z) / 2,
              width: W * z,
              height: heroH * z,
              overflow: "hidden",
              transform: [{ translateX: ax }, { translateY: ay }],
            }}
          >
            {hasVideo ? (
              <ExpoImage source={{ uri: (b.video || "").trim() }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <Img src={(b.image || "").trim()} style={{ width: "100%", height: "100%" }} />
            )}
          </View>
        )
      )}
      <LinearGradient
        colors={hasVideo || hasArt ? ["rgba(10,4,30,.55)", "transparent", "rgba(10,4,30,.45)"] : [b.c1 || th.c1, b.c2 || th.c2, "rgba(20,5,50,.55)"]}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />
      {/* static beams + curtains (only for the blank gradient template) */}
      {!hasVideo && !hasArt && (
        <>
          <View style={{ position: "absolute", left: "12%", top: -30, width: 54, height: 300, backgroundColor: "rgba(255,255,255,.10)", transform: [{ rotate: "18deg" }] }} />
          <View style={{ position: "absolute", right: "12%", top: -30, width: 54, height: 300, backgroundColor: "rgba(255,255,255,.10)", transform: [{ rotate: "-18deg" }] }} />
          <LinearGradient colors={["rgba(10,2,30,.75)", "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 44 }} />
          <LinearGradient colors={["transparent", "rgba(10,2,30,.75)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 44 }} />
        </>
      )}
      {/* motion overlay */}
      <MotionLayer preset={b.anim || "floaters"} theme={b.theme} />
      {/* header (location + search) + stage content (position set from editor) */}
      {header}
      <View style={{ flex: 1, justifyContent: contentJustify }}>
      <Pressable onPress={arrange ? undefined : onTap} style={{ alignItems: "center", paddingHorizontal: 24, paddingTop: 14, paddingBottom: 6 }}>
        {arrange && editing ? (
          <Draggable ix={hx} iy={hy} minX={-170} maxX={170} minY={-200} maxY={200} onBegin={() => onDragStart()} onEnd={(x, y) => onMove({ hx: x, hy: y })} style={{ alignItems: "center" }}>
            {!!b.tag && (
              <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 3, color: "#FFD166" }}>{b.tag.toUpperCase()}</Text>
            )}
            {!!(b.title || "").trim() && (
              <AnimatedHeadline text={b.title || ""} font={b.font} color={headlineColor(b)} px={headlinePx(b.layout)} />
            )}
            {!!b.sub && (
              <Text style={{ marginTop: 6, fontFamily: F.semi, fontSize: 12, color: "rgba(255,255,255,.9)", textAlign: "center", textShadowColor: "rgba(0,0,0,.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{b.sub}</Text>
            )}
            <View style={{ position: "absolute", top: -14, left: -6, borderRadius: 999, backgroundColor: "rgba(255,255,255,.2)", paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: "#fff" }}>⠿ drag headline</Text>
            </View>
          </Draggable>
        ) : (
          <View style={{ alignItems: "center", transform: [{ translateX: hx }, { translateY: hy }] }}>
            {!!b.tag && (
              <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 3, color: "#FFD166" }}>{b.tag.toUpperCase()}</Text>
            )}
            {!!(b.title || "").trim() && (
              <AnimatedHeadline text={b.title || ""} font={b.font} color={headlineColor(b)} px={headlinePx(b.layout)} />
            )}
            {!!b.sub && (
              <Text style={{ marginTop: 6, fontFamily: F.semi, fontSize: 12, color: "rgba(255,255,255,.9)", textAlign: "center", textShadowColor: "rgba(0,0,0,.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{b.sub}</Text>
            )}
          </View>
        )}
        {!!b.cta && (
          arrange && editing ? (
            <View style={{ marginTop: 14, flexDirection: "row", justifyContent: b.ctapos === "left" ? "flex-start" : b.ctapos === "right" ? "flex-end" : "center", width: "100%" }}>
              <Draggable ix={cx} iy={cy} minX={-180} maxX={180} minY={-200} maxY={200} onBegin={() => onDragStart()} onEnd={(x, y) => onMove({ cx: x, cy: y })}>
                <View style={{ borderRadius: 999, backgroundColor: b.ctacolor || "#FFE45E", paddingHorizontal: ctaSize(b).padH, paddingVertical: ctaSize(b).padV, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: ctaSize(b).font, color: contrastOn(b.ctacolor || "#FFE45E") }}>{b.cta}</Text>
                  <Text style={{ fontFamily: F.extra, fontSize: ctaSize(b).font, color: contrastOn(b.ctacolor || "#FFE45E") }}>›</Text>
                </View>
                <View style={{ position: "absolute", top: -18, left: -6, borderRadius: 999, backgroundColor: "rgba(255,255,255,.2)", paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: "#fff" }}>⠿ drag button</Text>
                </View>
              </Draggable>
            </View>
          ) : (
            <View style={{ marginTop: 14, flexDirection: "row", justifyContent: b.ctapos === "left" ? "flex-start" : b.ctapos === "right" ? "flex-end" : "center", width: "100%", transform: [{ translateX: cx }, { translateY: cy }] }}>
              <View style={{ borderRadius: 999, backgroundColor: b.ctacolor || "#FFE45E", paddingHorizontal: ctaSize(b).padH, paddingVertical: ctaSize(b).padV, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontFamily: F.extra, fontSize: ctaSize(b).font, color: contrastOn(b.ctacolor || "#FFE45E") }}>{b.cta}</Text>
                <Text style={{ fontFamily: F.extra, fontSize: ctaSize(b).font, color: contrastOn(b.ctacolor || "#FFE45E") }}>›</Text>
              </View>
            </View>
          )
        )}
      </Pressable>
      </View>
      {/* stage floor glow */}
      <View style={{ height: 44 }}>
        <LinearGradient colors={["transparent", "rgba(255,60,180,.30)"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }} />
      </View>
      {editing && (
        <Pressable onPress={onEdit} style={{ position: "absolute", right: 12, top: 118, height: 36, width: 36, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 16 }}>✏️</Text>
        </Pressable>
      )}
      {editing && (
        <Pressable onPress={onToggleArrange} style={{ position: "absolute", left: 12, top: 118, borderRadius: 999, backgroundColor: arrange ? "#D8F34E" : "rgba(255,255,255,.9)", paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#0B0B0F" }}>{arrange ? "✓ Arrange on — drag items" : "⠿ Arrange"}</Text>
        </Pressable>
      )}
    </View>
  );
}
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
   const role = useOSB((s) => s.role);
   const isSuper = role === "super_admin";
   const homeEditMode = useOSB((s) => s.homeEditMode);
   // Live edit state — which editor is open (block / texts / strips / new card)
   const [editTarget, setEditTarget] = useState<null | { t: "block"; block: ApiHomeBlock } | { t: "texts" } | { t: "strips" } | { t: "new"; kind: ApiHomeBlock["kind"]; slot: string }>(null);
   const [publishNote, setPublishNote] = useState("");
   const [versions, setVersions] = useState<ApiHomeVersion[]>([]);
   const [showHistory, setShowHistory] = useState(false);
   const [banner, setBanner] = useState(0);
   // Arrange mode: drag headline / button / art directly on the stage
   const [arrange, setArrange] = useState(false);
   // True while a finger-drag is active — outer scroll locks so the item follows freely
   const [dragging, setDragging] = useState(false);
   const saveLayout = (block: ApiHomeBlock, patch: { hx?: number; hy?: number; cx?: number; cy?: number; ax?: number; ay?: number }) => {
     setDragging(false);
     const ranges: Record<string, [number, number]> = { hx: [-170, 170], hy: [-200, 200], cx: [-180, 180], cy: [-200, 200], ax: [-220, 220], ay: [-260, 260] };
     const clean: Record<string, number> = {};
     for (const [k, v] of Object.entries(patch)) {
       if (v === undefined || !ranges[k]) continue;
       clean[k] = Math.min(ranges[k][1], Math.max(ranges[k][0], Math.round(v)));
     }
     if (!Object.keys(clean).length) return;
     const layout = { ...(block.layout ?? {}), ...clean };
     set({ homeBlocks: useOSB.getState().homeBlocks.map((h) => (h.id === block.id ? { ...h, layout } : h)) });
     // No full re-sync (would flash) — publish snapshots the saved layout.
     void apiAdminPatchHomeBlock(block.id, { layout }).catch(() => {});
   };
  const [locOpen, setLocOpen] = useState(false);
  const bannerRef = useRef<ScrollView>(null);

  const W = Dimensions.get("window").width;
  const cardW = Math.round((W - 32) * 0.88);
  const step = cardW + 10;

  const { stores, products } = useMarketplace();
  const homeBlocks = useOSB((s) => s.homeBlocks);
  const homeConfig = useOSB((s) => s.homeConfig);
  const cfg = { ...HOME_CONFIG_DEFAULTS, ...homeConfig };
  const showFestival = cfg.showFestival !== "0";
  const showAds = cfg.showAds !== "0";
  const showStrips = cfg.showStrips !== "0";
  const showCategories = cfg.showCategories !== "0";
  const syncHomeBlocks = useOSB((s) => s.syncHomeBlocks);
  // Home khulne pe CMS refresh (cheap, fail-soft) — admin edits turant dikhen.
  useEffect(() => {
    syncHomeBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    ? inStockFirst(products.filter((p) => catStoreIds.has(p.storeId))).slice(0, 12)
    : inStockFirst(products.filter((p) => ["Vegetables", "Fruits", "Dairy", "Staples", "Bakery", "Sweets", "Ice Cream", "Pharmacy"].includes(p.category))).slice(0, 12);
  const grocery = quickPicks;
  const restList = filtered.slice(0, 10);

  const banners: Banner[] = useMemo(() => {
    // Admin CMS live banners (default home view). Category filter pe purana auto-logic.
    if (!activeCat) {
      const live = homeBlocks.filter((b) => b.kind === "banner" && slotOf(b) === "banners" && hasCardContent(b));
      if (live.length > 0) return live.map((b, i) => blockToBanner(b, i));
      return DEFAULT_BANNERS;
    }
    const cats = activeCat.subs.length ? activeCat.subs : [activeCat.t];
    const seen = new Set<string>();
    const picked: typeof filtered = [];
    for (const s of filtered) {
      if (!s.image || seen.has(s.image)) continue;
      seen.add(s.image);
      picked.push(s);
      if (picked.length === 3) break;
    }
    // Store images kam hain to category image + subs se fill karo — koi unrelated image nahi.
    const base: Banner[] = picked.map((s, i) => ({
      img: s.image,
      tag: cats[i % cats.length].toUpperCase(),
      title: `${s.name}`,
      sub: `⚡ ${s.etaMins} min • ₹${s.deliveryFee === 0 ? "FREE" : s.deliveryFee} delivery`,
      cta: "Order now",
      colors: BANNER_TINTS[i % BANNER_TINTS.length],
    }));
    for (let i = base.length; i < 3; i++) {
      base.push({
        img: activeCat.img,
        tag: cats[i % cats.length].toUpperCase(),
        title: `${cats[i % cats.length]}`,
        sub: `⚡ ${activeCat.eta} • ${activeCat.sub}`,
        cta: "Explore",
        colors: BANNER_TINTS[i % BANNER_TINTS.length],
      });
    }
    return base;
  }, [activeCat, filtered, homeBlocks]);

  // Banner tap → admin link. Never dead: bad store/category falls back to search.
  const tapBanner = (b: Banner) => {
    const v = (b.linkValue || "").trim();
    if (!v || b.linkKind === "none") return;
    const fallbackSearch = () => set({ query: v, tab: "search" });
    if (b.linkKind === "store") {
      const lv = v.toLowerCase();
      const hit = stores.find(
        (s) => s.id === v || s.slug === v || s.name.toLowerCase() === lv || s.name.toLowerCase().includes(lv) || lv.includes(s.name.toLowerCase())
      );
      if (hit) onStore(hit.id);
      else fallbackSearch();
    } else if (b.linkKind === "category") {
      const ok = allCats.some((c) => c.k === v);
      if (ok) set({ category: v });
      else fallbackSearch();
    } else if (b.linkKind === "search") {
      fallbackSearch();
    }
    blip(700);
  };

  const liveFestival = !activeCat && showFestival ? homeBlocks.find((b) => b.kind === "festival") : undefined;
  const festivalTheme = FESTIVAL_THEMES[liveFestival?.theme ?? "none"] ?? FESTIVAL_THEMES.none;
  const topBars = !activeCat ? homeBlocks.filter((b) => slotOf(b) === "top" && ((b.title || "").trim() || (b.cta || "").trim())).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)) : [];
  const showcaseBlocks = !activeCat ? homeBlocks.filter((b) => b.kind === "showcase").sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)) : [];
  const [showcaseIdx, setShowcaseIdx] = useState(0);
  const showcaseRef = useRef<ScrollView>(null);
  const liveStripTitles = !activeCat && showStrips ? homeBlocks.filter((b) => b.kind === "strip" && (b.title || "").trim()).map((b) => b.title || "") : [];
  const stripTitles = liveStripTitles.length > 0 ? liveStripTitles : String(cfg.stripsDefault || "").split("|").map((s) => s.trim()).filter(Boolean);
  // Banner cards ↔ CMS blocks mapping (edit badge needs the right block)
  const liveBannerBlocks: (ApiHomeBlock | null)[] = useMemo(() => {
    if (activeCat) return banners.map(() => null);
    const live = homeBlocks.filter((b) => b.kind === "banner" && slotOf(b) === "banners" && hasCardContent(b));
    return banners.map((_, i) => live[i] ?? null);
  }, [banners, homeBlocks, activeCat]);
  const midCards = useMemo(() => {
    if (activeCat || !showAds) return [];
    return homeBlocks.filter((b) => (b.kind === "ad" || b.kind === "banner") && slotOf(b) === "mid" && hasCardContent(b)).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }, [homeBlocks, activeCat, showAds]);
  const bottomCards = useMemo(() => {
    if (activeCat || !showAds) return [];
    return homeBlocks.filter((b) => (b.kind === "ad" || b.kind === "banner") && slotOf(b) === "bottom" && hasCardContent(b)).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }, [homeBlocks, activeCat, showAds]);
  const feedAds = useMemo(() => {
    if (activeCat || !showAds) return [];
    return homeBlocks.filter((b) => (b.kind === "ad" || b.kind === "banner") && slotOf(b) === "feed" && hasCardContent(b)).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }, [homeBlocks, activeCat, showAds]);
  const editing = isSuper && homeEditMode && !activeCat;
  const heroLive = !activeCat && showcaseBlocks.length > 0;

  /* Header rows — shared by the fixed header and the festive hero (Zomato style).
     onDark = rendered over the stage backdrop (white text, white search bar). */
  const renderLocationRow = (onDark: boolean) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 }}>
        <View style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: onDark ? "rgba(255,255,255,.18)" : "#FFE9E9" }}>
          <Text style={{ fontSize: 17 }}>📍</Text>
        </View>
        <Pressable onPress={() => { setLocOpen(true); blip(560); }} style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 14.5, letterSpacing: -0.3, color: onDark ? "#fff" : colors.ink, maxWidth: 150 }}>
              {addressArea || "Set location"}
            </Text>
            <ChevronDown size={15} strokeWidth={2.8} color={onDark ? "#fff" : colors.ink} />
          </View>
          <Text numberOfLines={1} style={{ marginTop: 2, fontFamily: F.medium, fontSize: 11.5, color: onDark ? "rgba(255,255,255,.75)" : colors.ink3 }}>
            {address || "Tap to add delivery address"}
          </Text>
        </Pressable>
      </View>
      <Pressable onPress={() => set({ tab: "profile" })} style={{ height: 40, width: 40, borderRadius: 20, overflow: "hidden" }}>
        <LinearGradient colors={["#0E3B2E", "#1FB67C"]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 17, color: "#fff" }}>{userAvatar || (userName ? userName[0].toUpperCase() : "👤")}</Text>
        </LinearGradient>
      </Pressable>
      <Pressable onPress={() => { set({ dark: !dark }); blip(700); }} style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: onDark ? "rgba(255,255,255,.18)" : colors.chip }}>
        {dark ? <Sun size={17} color="#fff" /> : <Moon size={17} color={onDark ? "#fff" : colors.ink} />}
      </Pressable>
    </View>
  );
  const renderSearchRow = (onDark: boolean) => (
    <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
      <Pressable
        onPress={() => (editing ? setEditTarget({ t: "texts" }) : set({ tab: "search" }))}
        style={onDark
          ? { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, backgroundColor: "#fff", borderWidth: editing ? 2 : 0, borderColor: "#D8F34E", paddingHorizontal: 14, paddingVertical: 12 }
          : { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: editing ? "#D8F34E" : colors.line, paddingHorizontal: 14, paddingVertical: 12 }}
      >
        <Search size={18} strokeWidth={2.6} color="#E23744" />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.medium, fontSize: 13.5, color: onDark ? "#666" : colors.ink3 }}>
          {cfg.searchPlaceholder || "Search…"}
        </Text>
        <View style={{ height: 20, width: 1, backgroundColor: onDark ? "#eee" : colors.line }} />
        <Mic size={17} color={onDark ? "#888" : colors.ink2} />
        <ScanSearch size={17} color={onDark ? "#888" : colors.ink2} />
      </Pressable>
    </View>
  );

  // Auto-advance banner carousel (paused in arrange mode so the canvas stays still).
  useEffect(() => {
    if (arrange || banners.length < 2) return;
    const t = setInterval(() => {
      setBanner((b) => {
        const next = (b + 1) % banners.length;
        bannerRef.current?.scrollTo({ x: next * step, animated: true });
        return next;
      });
    }, 3800);
    return () => clearInterval(t);
  }, [step, banners.length, arrange]);

  useEffect(() => {
    setBanner(0);
    bannerRef.current?.scrollTo({ x: 0, animated: false });
  }, [activeCat?.k]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.app }}>
      {/* fixed header — hidden while the festive hero is live (header lives inside the stage) */}
      {!heroLive && (
      <View style={{ backgroundColor: colors.surface, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        {renderLocationRow(false)}
        {renderSearchRow(false)}
      </View>
      )}
        {/* Live edit toolbar (super admin only — entry via You tab → Super Admin → Edit live on Home) */}
        {editing && (
          <View style={{ marginHorizontal: 16, marginTop: 10, borderRadius: 14, backgroundColor: "#0B0B0F", paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#D8F34E" }}>● LIVE EDIT</Text>
            <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 10.5, color: "rgba(255,255,255,.65)" }}>Tap any edit icon to modify in place</Text>
            <Pressable onPress={() => setEditTarget({ t: "new", kind: "banner", slot: "banners" })} style={{ borderRadius: 999, backgroundColor: "#D8F34E", paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#0B0B0F" }}>+ Add</Text>
            </Pressable>
            <Pressable onPress={() => set({ homeEditMode: false })} style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,.15)", paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>Done</Text>
            </Pressable>
          </View>
        )}
       <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={!dragging && !arrange} contentContainerStyle={{ paddingBottom: 160 }}>
        {/* Festive hero — header (location + search) lives INSIDE the stage (Zomato style) */}
        {(showcaseBlocks.length > 0 || editing) && (
          <View style={{ position: "relative" }}>
            {showcaseBlocks.length > 0 && (
              <>
                <ScrollView
                  ref={showcaseRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled={!arrange}
                  scrollEnabled={!arrange}
                  snapToInterval={W}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  onMomentumScrollEnd={(e) => setShowcaseIdx(Math.min(showcaseBlocks.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / W))))}
                >
                  {showcaseBlocks.map((b) => (
                    <ShowcaseHeroCard
                      key={b.id}
                      b={b}
                      editing={editing}
                      arrange={arrange}
                      header={<>{renderLocationRow(true)}{renderSearchRow(true)}</>}
                      onTap={() => tapBanner(blockToBanner(b, 0))}
                      onEdit={() => setEditTarget({ t: "block", block: b })}
                      onMove={(patch) => saveLayout(b, patch)}
                      onToggleArrange={() => { setArrange(!arrange); blip(600); }}
                      onDragStart={() => setDragging(true)}
                    />
                  ))}
                </ScrollView>
                {showcaseBlocks.length > 1 && (
                  <View style={{ position: "absolute", left: 0, right: 0, bottom: 12, flexDirection: "row", justifyContent: "center", gap: 6 }}>
                    {showcaseBlocks.map((b, i) => (
                      <Pressable
                        key={b.id}
                        onPress={() => { setShowcaseIdx(i); showcaseRef.current?.scrollTo({ x: i * W, animated: true }); }}
                        style={{ height: 6, width: i === showcaseIdx ? 22 : 6, borderRadius: 999, backgroundColor: i === showcaseIdx ? "#FFE45E" : "rgba(255,255,255,.45)" }}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
            {editing && (
              <Pressable onPress={() => setEditTarget({ t: "new", kind: "showcase", slot: "top" })} style={{ marginHorizontal: 16, marginTop: showcaseBlocks.length ? 8 : 10, marginBottom: showcaseBlocks.length ? 0 : 4, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, backgroundColor: showcaseBlocks.length ? undefined : colors.card, paddingVertical: 10, alignItems: "center" }}>
                <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: showcaseBlocks.length ? "#fff" : colors.ink3 }}>+ Add festive stage banner (video / art / animated)</Text>
              </Pressable>
            )}
          </View>
        )}
        {/* Top announcement bar (slot=top) — Swiggy-style seasonal strip */}
        {topBars.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 10 }}>
            {topBars.map((b) => (
              <Pressable key={b.id} onPress={() => (editing ? setEditTarget({ t: "block", block: b }) : tapBanner(blockToBanner(b, 0)))} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: "#0B0B0F", paddingHorizontal: 12, paddingVertical: 7 }}>
                <Text style={{ fontSize: 12 }}>{FESTIVAL_THEMES[b.theme ?? "none"]?.emoji ?? "📢"}</Text>
                <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#fff" }}>{b.title}</Text>
                {!!b.cta && <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#D8F34E" }}>{b.cta} ›</Text>}
                {editing && <Text style={{ fontSize: 11 }}>✏️</Text>}
              </Pressable>
            ))}
          </ScrollView>
        )}
        {editing && topBars.length === 0 && (
          <Pressable onPress={() => setEditTarget({ t: "new", kind: "strip", slot: "top" })} style={{ marginHorizontal: 16, marginTop: 10, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, paddingVertical: 10, alignItems: "center" }}>
            <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>+ Add announcement bar (festival strip on top)</Text>
          </Pressable>
        )}
        {/* greeting — tap in edit mode to change words */}
        <Pressable onPress={() => { if (editing) setEditTarget({ t: "texts" }); }} disabled={!editing}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, opacity: 1 }}>
          <View>
            <Text style={{ fontFamily: F.extra, fontSize: 19, letterSpacing: -0.4, color: colors.ink }}>
              {g.label}, {userName || "there"} 👋{editing ? " ✏️" : ""}
            </Text>
            <Text style={{ fontFamily: F.medium, fontSize: 12, color: colors.ink2 }}>
              {cfg.greetingSub || g.sub} • <Text style={{ fontFamily: F.bold, color: "#0C831F" }}>12 min</Text> fastest
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "#0E3B2E", paddingHorizontal: 10, paddingVertical: 6 }}>
            <LiveDot color="#34D399" />
            <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: "#D8F34E" }}>{(cfg.liveBadge || "LIVE").toUpperCase()}</Text>
          </View>
        </View>
        </Pressable>

        {/* category grid */}
        {showCategories && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={{ marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13, letterSpacing: -0.2, color: colors.ink }}>{cfg.categoriesTitle || `Explore ${allCats.length} categories`}</Text>
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
        )}

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
            onMomentumScrollEnd={(e) => setBanner(Math.min(banners.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / step))))}
          >
            {banners.map((b, i) => (
              <View key={i} style={{ position: "relative" }}>
              <SpringBtn onPress={() => (editing && liveBannerBlocks[i] ? setEditTarget({ t: "block", block: liveBannerBlocks[i]! }) : tapBanner(b))} style={{ width: cardW, height: 148, borderRadius: 20, overflow: "hidden" }}>
                {b.img ? (
                  <Img src={b.img} style={{ position: "absolute", width: "100%", height: "100%" }} eager={i === 0} />
                ) : (
                  <View style={{ position: "absolute", width: "100%", height: "100%", backgroundColor: "#0E3B2E" }} />
                )}
                <LinearGradient colors={[b.colors[0], b.colors[1], b.colors[2]]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", width: "100%", height: "100%" }} />
                <View style={{ width: "62%", justifyContent: "center", height: "100%", padding: 16 }}>
                  <View style={{ alignSelf: "flex-start", borderRadius: 6, backgroundColor: "#D8F34E", paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: "#111114" }}>{b.tag}</Text>
                  </View>
                  <Text style={{ marginTop: 6, fontFamily: cardTitleFamily(b), fontSize: 24, lineHeight: 25, color: b.tcolor || "#fff" }}>{b.title}</Text>
                  <Text style={{ marginTop: 2, fontFamily: F.semi, fontSize: 12, color: "rgba(255,255,255,.8)" }}>{b.sub}</Text>
                  <View style={{ marginTop: 8, alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 6 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#111114" }}>{b.cta} →</Text>
                  </View>
                </View>
              </SpringBtn>
              {editing && liveBannerBlocks[i] && (
                <Pressable onPress={() => { setEditTarget({ t: "block", block: liveBannerBlocks[i]! }); blip(600); }} style={{ position: "absolute", right: 8, top: 8, height: 34, width: 34, borderRadius: 17, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", elevation: 4 }}>
                  <Text style={{ fontSize: 15 }}>✏️</Text>
                </Pressable>
              )}
              </View>
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
          {editing && (
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 8 }}>
              <Pressable onPress={() => setEditTarget({ t: "new", kind: "banner", slot: "banners" })} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, paddingVertical: 10, alignItems: "center" }}>
                <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>+ Add hero banner</Text>
              </Pressable>
              <Pressable onPress={() => setEditTarget({ t: "new", kind: "strip", slot: "top" })} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, paddingVertical: 10, alignItems: "center" }}>
                <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>+ Add top announcement</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* CATS circles */}
        <View style={{ paddingTop: 12 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHead
              title={activeCat ? activeCat.t : "Shop by craving"}
              sub={activeCat ? `${filtered.length} stores nearby` : "Blinkit-fast • Zomato-tasty"}
              action={
                activeCat ? (
                  <Pressable onPress={() => { set({ category: "all" }); blip(480); }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#E23744" }}>Clear ✕</Text>
                  </Pressable>
                ) : (
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#E23744" }}>see all ›</Text>
                )
              }
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginTop: 10, gap: 12, paddingHorizontal: 16, paddingBottom: 4 }}>
            {activeCat
              ? activeCat.subs.map((s, i) => {
                  const img = quickPicks[i % quickPicks.length]?.image ?? "";
                  return (
                    <SpringBtn key={s} onPress={() => { set({ query: s, tab: "search" }); blip(600); }} style={{ width: 68, alignItems: "center" }}>
                      <View style={{ height: 68, width: 68, borderRadius: 22, overflow: "hidden", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
                        {img ? <Img src={img} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontSize: 26, textAlign: "center", lineHeight: 68 }}>{activeCat.emoji}</Text>}
                      </View>
                      <Text numberOfLines={1} style={{ marginTop: 6, fontFamily: F.extra, fontSize: 11, color: colors.ink, textAlign: "center", maxWidth: 60 }}>{s}</Text>
                    </SpringBtn>
                  );
                })
              : CATS.map((c) => (
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

        {/* offer strip — tap ✏️ to edit lines live */}
        <View style={{ position: "relative" }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 4 }}>
          {stripTitles.map((t) => (
            <Pressable key={t} onPress={() => { if (editing) setEditTarget({ t: "strips" }); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(14,59,46,.3)", backgroundColor: "rgba(216,243,78,.25)", paddingHorizontal: 12, paddingVertical: 6 }}>
              <BadgePercent size={13} color="#0E3B2E" />
              <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#0E3B2E" }}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {editing && (
          <Pressable onPress={() => setEditTarget({ t: "strips" })} style={{ position: "absolute", right: 10, top: -14, height: 30, width: 30, borderRadius: 15, backgroundColor: "#0B0B0F", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 13 }}>✏️</Text>
          </Pressable>
        )}
        </View>

        {/* Mid-home promos (slot=mid) — add banners or ads here */}
        {(midCards.length > 0 || editing) && (
          <View style={{ paddingTop: 16 }}>
            {midCards.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }} snapToInterval={step} snapToAlignment="start" decelerationRate="fast">
              {midCards.map((a) => (
                <View key={a.id} style={{ position: "relative" }}>
                <SpringBtn onPress={() => (editing ? setEditTarget({ t: "block", block: a }) : tapBanner(blockToBanner(a, 1)))} style={{ width: cardW, height: 120, borderRadius: 20, overflow: "hidden" }}>
                  <CardMedia b={a} />
                  <LinearGradient colors={[a.c1 || "rgba(10,10,10,.8)", "rgba(10,10,10,.1)", "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", width: "100%", height: "100%" }} />
                  <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
                    {a.tag ? (
                      <View style={{ alignSelf: "flex-start", borderRadius: 6, backgroundColor: "#F8CB46", paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: "#111114" }}>{a.tag.toUpperCase()}</Text>
                      </View>
                    ) : null}
                    <Text style={{ marginTop: 6, fontFamily: cardTitleFamily(a), fontSize: 21, lineHeight: 23, color: a.tcolor || "#fff" }}>{a.title}</Text>
                    {a.sub ? <Text style={{ marginTop: 2, fontFamily: F.semi, fontSize: 12, color: "rgba(255,255,255,.85)" }}>{a.sub}</Text> : null}
                    {a.cta ? (
                      <View style={{ marginTop: 8, alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 6 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#111114" }}>{a.cta} →</Text>
                      </View>
                    ) : null}
                  </View>
                </SpringBtn>
                {editing && (
                  <Pressable onPress={() => setEditTarget({ t: "block", block: a })} style={{ position: "absolute", right: 8, top: 8, height: 34, width: 34, borderRadius: 17, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 15 }}>✏️</Text>
                  </Pressable>
                )}
                </View>
              ))}
            </ScrollView>
            )}
            {editing && (
              <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: midCards.length ? 8 : 0 }}>
                <Pressable onPress={() => setEditTarget({ t: "new", kind: "ad", slot: "mid" })} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, paddingVertical: 10, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>+ Add promo card here</Text>
                </Pressable>
                <Pressable onPress={() => setEditTarget({ t: "new", kind: "banner", slot: "mid" })} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, paddingVertical: 10, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>+ Add banner here</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

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
        {!activeCat && (
          <CategoryRails
            cats={allCats}
            onStore={onStore}
            feedAds={feedAds}
            editing={editing}
            onTapAd={(b) => tapBanner(blockToBanner(b, 1))}
            onEditAd={(b) => setEditTarget({ t: "block", block: b })}
            onAddFeed={() => setEditTarget({ t: "new", kind: "ad", slot: "feed" })}
          />
        )}

        {/* Festival spotlight — seasonal theme (Diwali / Christmas / Holi…) */}
        {showFestival && (
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <View style={{ position: "relative" }}>
          <SpringBtn onPress={() => { if (editing && liveFestival) setEditTarget({ t: "block", block: liveFestival }); else if (editing) setEditTarget({ t: "new", kind: "festival", slot: "festival" }); else if (liveFestival) tapBanner(blockToBanner(liveFestival, 2)); }} style={{ borderRadius: 22, overflow: "hidden" }}>
            <Img src={liveFestival?.image || STORES[7].image} style={{ position: "absolute", width: "100%", height: "100%" }} />
            <LinearGradient colors={[liveFestival?.c1 || festivalTheme.c1, liveFestival?.c2 || festivalTheme.c2, "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", width: "100%", height: "100%" }} />
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 12 }}>{festivalTheme.emoji}</Text>
                <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 2, color: "#FFD166" }}>{(liveFestival?.tag || cfg.festivalTitle || "FESTIVAL").toUpperCase()}</Text>
              </View>
              <Text style={{ marginTop: 4, fontFamily: cardTitleFamily(liveFestival ?? { font: "serif" }), fontSize: 21, lineHeight: 26, color: liveFestival?.tcolor || "#fff" }}>{liveFestival?.title || cfg.festivalTitle || "Festive picks for you"}{"\n"}{liveFestival?.sub || cfg.festivalSub || ""}</Text>
              <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                <View style={{ borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#111114" }}>{liveFestival?.cta || cfg.festivalCta || "Shop now"}</Text>
                </View>
              </View>
            </View>
          </SpringBtn>
          {editing && (
            <Pressable onPress={() => setEditTarget(liveFestival ? { t: "block", block: liveFestival } : { t: "new", kind: "festival", slot: "festival" })} style={{ position: "absolute", right: 10, top: 10, height: 34, width: 34, borderRadius: 17, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 15 }}>✏️</Text>
            </Pressable>
          )}
          </View>
        </View>
        )}

        {/* Bottom promos (slot=bottom) */}
        {(bottomCards.length > 0 || editing) && (
          <View style={{ paddingTop: 16 }}>
            {bottomCards.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }} snapToInterval={step} snapToAlignment="start" decelerationRate="fast">
              {bottomCards.map((a) => (
                <View key={a.id} style={{ position: "relative" }}>
                <SpringBtn onPress={() => (editing ? setEditTarget({ t: "block", block: a }) : tapBanner(blockToBanner(a, 1)))} style={{ width: cardW, height: 120, borderRadius: 20, overflow: "hidden" }}>
                  <CardMedia b={a} />
                  <LinearGradient colors={[a.c1 || "rgba(10,10,10,.8)", "rgba(10,10,10,.1)", "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", width: "100%", height: "100%" }} />
                  <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
                    {!!a.tag && (
                      <View style={{ alignSelf: "flex-start", borderRadius: 6, backgroundColor: "#F8CB46", paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: "#111114" }}>{a.tag.toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={{ marginTop: 6, fontFamily: cardTitleFamily(a), fontSize: 21, lineHeight: 23, color: a.tcolor || "#fff" }}>{a.title}</Text>
                    {!!a.sub && <Text style={{ marginTop: 2, fontFamily: F.semi, fontSize: 12, color: "rgba(255,255,255,.85)" }}>{a.sub}</Text>}
                    {!!a.cta && (
                      <View style={{ marginTop: 8, alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 6 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#111114" }}>{a.cta} →</Text>
                      </View>
                    )}
                  </View>
                </SpringBtn>
                {editing && (
                  <Pressable onPress={() => setEditTarget({ t: "block", block: a })} style={{ position: "absolute", right: 8, top: 8, height: 34, width: 34, borderRadius: 17, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 15 }}>✏️</Text>
                  </Pressable>
                )}
                </View>
              ))}
            </ScrollView>
            )}
            {editing && (
              <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: bottomCards.length ? 8 : 0 }}>
                <Pressable onPress={() => setEditTarget({ t: "new", kind: "ad", slot: "bottom" })} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, paddingVertical: 10, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>+ Add promo card here</Text>
                </Pressable>
                <Pressable onPress={() => setEditTarget({ t: "new", kind: "banner", slot: "bottom" })} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, paddingVertical: 10, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>+ Add banner here</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      {/* publish bar + editor sheet — home pe hi */}
      {editing && (
        <HomePublishBar
          note={publishNote} setNote={setPublishNote}
          versions={versions} setVersions={setVersions}
          showHistory={showHistory} setShowHistory={setShowHistory}
        />
      )}
      {editTarget && (
        <HomeLiveSheet
          target={editTarget}
          cfg={cfg}
          onClose={() => setEditTarget(null)}
        />
      )}
      {locOpen && <ChangeLocationSheet onClose={() => setLocOpen(false)} />}
    </View>
  );
}

/* ── Home live edit: publish bar + bottom editor (home screen pe hi) ── */
function HomePublishBar({ note, setNote, versions, setVersions, showHistory, setShowHistory }: {
  note: string; setNote: (v: string) => void;
  versions: ApiHomeVersion[]; setVersions: (v: ApiHomeVersion[]) => void;
  showHistory: boolean; setShowHistory: (v: boolean) => void;
}) {
  const syncHomeBlocks = useOSB((s) => s.syncHomeBlocks);
  const { colors } = useTheme();
  useEffect(() => {
    apiAdminHomeVersions().then(setVersions).catch(() => {});
  }, []);
  const publish = () => {
    void apiAdminPublishHome(note.trim()).then((j) => {
      if (j?.ok) {
        blip(920, 0.2);
        Alert.alert("Published", "The new home will reach all users on their next sync.");
        setNote("");
        apiAdminHomeVersions().then(setVersions).catch(() => {});
        syncHomeBlocks();
      } else Alert.alert("Publish failed", "Check your connection and retry.");
    });
  };
  return (
    <View style={{ marginHorizontal: 12, marginBottom: 8, borderRadius: 16, backgroundColor: "#0B0B0F", padding: 12 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput value={note} onChangeText={setNote} placeholder="Version note  e.g. Diwali sale live" placeholderTextColor="rgba(255,255,255,.4)" style={{ flex: 1, borderRadius: 10, backgroundColor: "rgba(255,255,255,.1)", paddingHorizontal: 12, paddingVertical: 9, fontFamily: F.semi, fontSize: 12, color: "#fff" }} />
        <Pressable onPress={publish} style={{ borderRadius: 10, backgroundColor: "#D8F34E", paddingHorizontal: 16, justifyContent: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#0B0B0F" }}>Publish</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => { setShowHistory(!showHistory); if (!showHistory) apiAdminHomeVersions().then(setVersions).catch(() => {}); }} style={{ marginTop: 8, alignItems: "center" }}>
        <Text style={{ fontFamily: F.semi, fontSize: 11, color: "rgba(255,255,255,.6)" }}>Version history ({versions.length}) {showHistory ? "▲" : "▼"}</Text>
      </Pressable>
      {showHistory && (
        <View style={{ marginTop: 6, gap: 6 }}>
          {versions.map((v) => (
            <View key={v.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,.08)", padding: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#fff" }}>{v.note || "Published version"}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 10, color: "rgba(255,255,255,.5)" }}>{v.blockCount ?? ""} cards • {String(v.createdAt ?? "").slice(0, 16).replace("T", " ")}</Text>
              </View>
              <Pressable onPress={() => {
                Alert.alert("Restore this version?", `Current home stays saved in history.`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Restore", onPress: () => { void apiAdminRevertHome(v.id).then(() => { syncHomeBlocks(); Alert.alert("Restored", "Previous home is live again."); }); } },
                ]);
              }} style={{ borderRadius: 8, backgroundColor: "#E8830C", paddingHorizontal: 10, paddingVertical: 7 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>Restore</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* Link target picker — full store / category lists, tap to select (no typing,
   no dead buttons). Search keeps a free keyword input. */
function LinkValuePicker({ linkKind, linkValue, setLinkValue }: { linkKind: string; linkValue: string; setLinkValue: (v: string) => void }) {
  const { colors } = useTheme();
  const { stores } = useMarketplace();
  const cats = activeCategories();
  const input = { borderRadius: 12, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semi, fontSize: 13.5, color: colors.ink } as const;
  if (linkKind === "search") {
    return (
      <TextInput value={linkValue} onChangeText={setLinkValue} placeholder="Search keyword  e.g. biryani" placeholderTextColor={colors.ink3} style={input} />
    );
  }
  if (linkKind === "category") {
    return (
      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>Pick a category — tap opens it. {cats.length} available.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {cats.map((c) => {
            const on = linkValue === c.k;
            return (
              <Pressable key={c.k} onPress={() => { setLinkValue(c.k); blip(600); }} style={{ flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: on ? "#0C831F" : colors.card2 }}>
                <Text style={{ fontSize: 12 }}>{c.emoji}</Text>
                <Text style={{ fontFamily: F.extra, fontSize: 11, color: on ? "#fff" : colors.ink2 }}>{c.t}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>Pick a store — tap opens it. {stores.length} available.</Text>
      <ScrollView nestedScrollEnabled style={{ maxHeight: 190, borderRadius: 12, backgroundColor: colors.card2 }} contentContainerStyle={{ gap: 2, padding: 6 }}>
        {stores.map((s) => {
          const key = s.slug || s.id;
          const on = linkValue === key || linkValue === s.id || linkValue.toLowerCase() === s.name.toLowerCase();
          return (
            <Pressable key={s.id} onPress={() => { setLinkValue(key); blip(600); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: on ? "#0C831F" : "transparent" }}>
              <Text style={{ fontSize: 18 }}>{s.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: on ? "#fff" : colors.ink }}>{s.name}</Text>
                <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10.5, color: on ? "rgba(255,255,255,.8)" : colors.ink3 }}>{s.tagline}</Text>
              </View>
              {on && <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#fff" }}>✓</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

type EditTarget = null | { t: "block"; block: ApiHomeBlock } | { t: "texts" } | { t: "strips" } | { t: "new"; kind: ApiHomeBlock["kind"]; slot: string };

const SHEET_KINDS = [
  { k: "banner", label: "Hero banner", desc: "Large swipeable card" },
  { k: "ad", label: "Promo card", desc: "Compact offer card" },
  { k: "showcase", label: "Festive stage", desc: "Animated full-width banner" },
  { k: "festival", label: "Festival spotlight", desc: "Seasonal takeover" },
  { k: "strip", label: "Offer ticker", desc: "Text-only pill" },
] as const;
const LINK_OPTS = [
  { k: "none", label: "No action" },
  { k: "store", label: "Open store" },
  { k: "category", label: "Open category" },
  { k: "search", label: "Search" },
] as const;

function HomeLiveSheet({ target, cfg, onClose }: { target: Exclude<EditTarget, null>; cfg: Record<string, string>; onClose: () => void }) {
  const set = useOSB((s) => s.set);
  const syncHomeBlocks = useOSB((s) => s.syncHomeBlocks);
  const { colors } = useTheme();
  useSheetBackCloser(true, onClose);
  const srcBlock = target.t === "block" ? target.block : null;
  const [kind, setKind] = useState<ApiHomeBlock["kind"]>(srcBlock?.kind ?? (target.t === "new" ? target.kind : "banner"));
  const [slot, setSlot] = useState<string>(srcBlock ? slotOf(srcBlock) : (target.t === "new" ? target.slot : "banners"));
  const [theme, setTheme] = useState<string>(srcBlock?.theme ?? "none");
  const [title, setTitle] = useState(srcBlock?.title || "");
  const [tag, setTag] = useState(srcBlock?.tag || "");
  const [sub, setSub] = useState(srcBlock?.sub || "");
  const [cta, setCta] = useState(srcBlock?.cta || "");
  const [image, setImage] = useState(srcBlock?.image || "");
  const [c1, setC1] = useState(srcBlock?.c1 || "rgba(10,10,10,.78)");
  const [linkKind, setLinkKind] = useState<string>(srcBlock?.linkKind || "none");
  const [linkValue, setLinkValue] = useState<string>(srcBlock?.linkValue || "");
  const [video, setVideo] = useState<string>(srcBlock?.video || "");
  const [anim, setAnim] = useState<string>(srcBlock?.anim || "floaters");
  const [fit, setFit] = useState<string>(srcBlock?.fit || "cover");
  const [font, setFont] = useState<string>(srcBlock?.font || "serif");
  const [tcolor, setTcolor] = useState<string>(srcBlock?.tcolor || "");
  const [hsize, setHsize] = useState<string>((srcBlock?.layout as { hs?: string } | undefined)?.hs || "m");
  const [artpos, setArtpos] = useState<string>(srcBlock?.artpos || "center");
  const [zoom, setZoom] = useState<number>(Number(srcBlock?.zoom) || 1);
  const [align, setAlign] = useState<string>(srcBlock?.align || "center");
  const [stageh, setStageh] = useState<number>(Number(srcBlock?.stageh) || 460);
  const [ctapos, setCtapos] = useState<string>(srcBlock?.ctapos || "center");
  const [ctasize, setCtasize] = useState<string>(srcBlock?.ctasize || "m");
  const [ctacolor, setCtacolor] = useState<string>(srcBlock?.ctacolor || "#FFE45E");
  const [startsAt, setStartsAt] = useState<string>((srcBlock?.startsAt || "").slice(0, 10));
  const [endsAt, setEndsAt] = useState<string>((srcBlock?.endsAt || "").slice(0, 10));
  const [texts, setTexts] = useState<Record<string, string>>({ ...cfg });
  const [strips, setStrips] = useState(() => {
    if (target.t === "strips") {
      const cur = useOSB.getState().homeBlocks.filter((b) => b.kind === "strip").map((b) => b.title || "").filter(Boolean);
      return (cur.length ? cur : String(cfg.stripsDefault || "").split("|")).join(" | ");
    }
    return "";
  });
  const input = { borderRadius: 12, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semi, fontSize: 13.5, color: colors.ink } as const;

  const saveBlock = () => {
    if (kind === "strip" && !title.trim()) { Alert.alert("Text required", "The ticker line is the whole card — write the offer text."); return; }
    // Title is optional for all other cards (art-only banners are valid).
    const patch = {
      kind, slot: kind === "showcase" ? "top" : slot, theme,
      tag: tag.trim(), title: title.trim(), sub: sub.trim(), cta: cta.trim(),
      image: image.trim(), c1, video: video.trim(), anim, font, fit,
      tcolor: /^#[0-9a-fA-F]{6}$/.test(tcolor.trim()) ? tcolor.trim() : "",
      artpos, zoom, align, stageh, ctapos, ctasize, ctacolor,
      layout: { ...((target.t === "block" ? target.block.layout : {}) ?? {}), hs: ["s", "m", "l"].includes(hsize) ? hsize : "m" },
      // Empty target with a picked action = dead button → fall back to no action.
      linkKind: linkValue.trim() ? linkKind : "none",
      linkValue: linkValue.trim(),
      startsAt: startsAt.trim() ? new Date(`${startsAt.trim()}T00:00:00`).toISOString() : null,
      endsAt: endsAt.trim() ? new Date(`${endsAt.trim()}T00:00:00`).toISOString() : null,
    };
    if (target.t === "new") {
      const blocks = useOSB.getState().homeBlocks;
      const maxSort = blocks.reduce((a, b) => Math.max(a, b.sort ?? 0), 0);
      void apiAdminPostHomeBlock({ ...patch, active: true, sort: maxSort + 1 }).then(() => {
        // Instant on-screen update (optimistic) + backend sync
        set({ homeBlocks: [...blocks, { id: `tmp-${Date.now()}`, sort: maxSort + 1, active: true, ...patch } as ApiHomeBlock] });
        syncHomeBlocks(); onClose(); blip(920, 0.15);
      });
    } else if (target.t === "block") {
      const id = target.block.id;
      void apiAdminPatchHomeBlock(id, patch).then(() => {
        const blocks = useOSB.getState().homeBlocks.map((b) => (b.id === id ? { ...b, ...patch } : b));
        set({ homeBlocks: blocks });
        syncHomeBlocks(); onClose(); blip(920, 0.15);
      });
    }
  };
  const hideBlock = () => {
    if (target.t !== "block") return;
    const id = target.block.id;
    const on = target.block.active !== false;
    void apiAdminPatchHomeBlock(id, { active: !on }).then(() => {
      set({ homeBlocks: useOSB.getState().homeBlocks.map((b) => (b.id === id ? { ...b, active: !on } : b)) });
      syncHomeBlocks(); onClose();
    });
  };
  const deleteBlock = () => {
    if (target.t !== "block") return;
    const id = target.block.id;
    Alert.alert("Remove card?", `"${target.block.title}" will be removed from home.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => {
        void apiAdminDeleteHomeBlock(id).then(() => {
          set({ homeBlocks: useOSB.getState().homeBlocks.filter((b) => b.id !== id) });
          syncHomeBlocks(); onClose();
        });
      } },
    ]);
  };
  const saveTexts = () => {
    const patch: Record<string, string> = {};
    for (const k of ["searchPlaceholder", "greetingSub", "categoriesTitle", "festivalTitle", "festivalSub", "festivalCta"]) {
      if (typeof texts[k] === "string") patch[k] = texts[k].slice(0, 200);
    }
    // turant screen pe
    set({ homeConfig: { ...useOSB.getState().homeConfig, ...patch } });
    void apiAdminPatchHomeConfig(patch).then(() => { syncHomeBlocks(); onClose(); blip(760); });
  };
  const saveStrips = () => {
    const lines = strips.split(/[|\n]/).map((s) => s.trim()).filter(Boolean);
    if (!lines.length) { Alert.alert("Add one line", "Example: 50% OFF up to ₹100"); return; }
    const cur = useOSB.getState().homeBlocks.filter((b) => b.kind === "strip");
    // simple: pehli N strips update, extra create, bachi delete
    const ops: Promise<unknown>[] = lines.map((t, i) => {
      if (cur[i]) return apiAdminPatchHomeBlock(cur[i].id, { title: t, active: true }).then(() => {});
      const maxSort = 100 + i;
      return apiAdminPostHomeBlock({ kind: "strip", title: t, active: true, sort: maxSort }).then(() => {});
    });
    cur.slice(lines.length).forEach((b) => { ops.push(apiAdminDeleteHomeBlock(b.id).then(() => {})); });
    void Promise.all(ops).then(() => { syncHomeBlocks(); onClose(); blip(760); });
  };

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.5)", justifyContent: "flex-end" }}>
      <Pressable onPress={onClose} style={{ flex: 1 }} />
      <Animated.View entering={SlideInRight.duration(220)} style={{ maxHeight: "82%", borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.surface, padding: 16 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink }}>
              {target.t === "texts" ? "Edit home text" : target.t === "strips" ? "Edit offer ticker" : target.t === "new" ? "Add new card" : "Edit card"}
            </Text>
            <Pressable onPress={onClose}><Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#E23744" }}>Close</Text></Pressable>
          </View>

          {(target.t === "block" || target.t === "new") && (
            <>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>Card type</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {SHEET_KINDS.map((o) => (
                  <Pressable key={o.k} onPress={() => { setKind(o.k as ApiHomeBlock["kind"]); blip(600); }} style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: kind === o.k ? "#0B0B0F" : colors.card2 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: kind === o.k ? "#D8F34E" : colors.ink2 }}>{o.label}</Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 9.5, color: kind === o.k ? "rgba(216,243,78,.7)" : colors.ink3 }}>{o.desc}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>Placement — where on home?</Text>
              {kind === "showcase" ? (
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>Fixed position: full-width animated stage directly below search (like Zomato).</Text>
              ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {HOME_SLOTS.map((s) => (
                  <Pressable key={s.k} onPress={() => { setSlot(s.k); blip(600); }} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: slot === s.k ? "#0C831F" : colors.card2 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 11, color: slot === s.k ? "#fff" : colors.ink2 }}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
              )}
              {(kind === "festival" || slot === "festival" || kind === "showcase") && (
                <>
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{kind === "showcase" ? "Stage theme — backdrop, objects & colours auto-fit" : "Festival theme"}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(FESTIVAL_THEMES).map(([tk, th]) => (
                      <Pressable key={tk} onPress={() => { setTheme(tk); if (tk !== "none") setC1(th.c1); blip(600); }} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme === tk ? "#0B0B0F" : colors.card2 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 11, color: theme === tk ? "#fff" : colors.ink2 }}>{th.emoji} {th.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              <TextInput value={title} onChangeText={setTitle} placeholder={kind === "showcase" ? "Stage headline (optional)  e.g. MONTH END" : kind === "strip" ? "Ticker text *  e.g. 50% OFF up to ₹100" : "Headline (optional)  e.g. 50% OFF Biryani"} placeholderTextColor={colors.ink3} style={input} />
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>Headline font</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {HEADLINE_FONTS.map((f) => (
                  <Pressable key={f.k} onPress={() => { setFont(f.k); blip(600); }} style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", backgroundColor: font === f.k ? "#0B0B0F" : colors.card2 }}>
                    <Text style={{ fontFamily: f.family, fontSize: 14, fontStyle: f.italic ? "italic" : "normal", color: font === f.k ? "#D8F34E" : colors.ink2 }}>Ag</Text>
                    <Text style={{ fontFamily: F.extra, fontSize: 10, color: font === f.k ? "#D8F34E" : colors.ink2 }}>{f.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>Headline colour</Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                {HEADLINE_COLORS.map((cc) => (
                  <Pressable key={cc} onPress={() => { setTcolor(tcolor === cc ? "" : cc); blip(600); }} style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: cc, borderWidth: tcolor === cc ? 3 : 1, borderColor: tcolor === cc ? "#0C831F" : colors.line }} />
                ))}
                <Pressable onPress={() => setTcolor("")} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: !tcolor ? "#0C831F" : colors.card2 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: !tcolor ? "#fff" : colors.ink2 }}>Auto</Text>
                </Pressable>
              </View>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>Headline size (bigger / smaller)</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {HEADLINE_SIZES.map((s) => (
                  <Pressable key={s.k} onPress={() => { setHsize(s.k); blip(600); }} style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", backgroundColor: hsize === s.k ? "#0B0B0F" : colors.card2 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: s.k === "s" ? 11 : s.k === "l" ? 16 : 13, color: hsize === s.k ? "#D8F34E" : colors.ink2 }}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>Tip: for exact placement, tap “Arrange” on the banner and drag the headline, button or art with your finger.</Text>
              {kind !== "strip" && (
                <>
                  <TextInput value={tag} onChangeText={setTag} placeholder={kind === "showcase" ? "Small kicker (optional)" : "Eyebrow tag  e.g. FESTIVE SALE"} placeholderTextColor={colors.ink3} style={input} />
                  <TextInput value={sub} onChangeText={setSub} placeholder={kind === "showcase" ? "One-line subtext (optional)" : "Subline  e.g. Code BAZAR50 · Free delivery"} placeholderTextColor={colors.ink3} style={input} />
              <TextInput value={cta} onChangeText={setCta} placeholder={kind === "showcase" ? "Pill button  e.g. Order now" : "Button label  e.g. Order now"} placeholderTextColor={colors.ink3} style={input} />
              <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>Tapping the button (or the whole card) opens whatever you pick in “On tap — open” below.</Text>
              {(kind === "showcase") && (
                <>
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>Button style — position, size, colour</Text>
                  <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>Position</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {[["left", "Left"], ["center", "Center"], ["right", "Right"]].map(([k, label]) => (
                      <Pressable key={k} onPress={() => { setCtapos(k); blip(600); }} style={{ flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: "center", backgroundColor: ctapos === k ? "#0C831F" : colors.card2 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 11, color: ctapos === k ? "#fff" : colors.ink2 }}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>Size</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {[["s", "Small"], ["m", "Medium"], ["l", "Large"]].map(([k, label]) => (
                      <Pressable key={k} onPress={() => { setCtasize(k); blip(600); }} style={{ flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: "center", backgroundColor: ctasize === k ? "#0C831F" : colors.card2 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 11, color: ctasize === k ? "#fff" : colors.ink2 }}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>Colour (text auto-adjusts)</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {CTA_COLORS.map((cc) => (
                      <Pressable key={cc} onPress={() => { setCtacolor(cc); blip(600); }} style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: cc, borderWidth: ctacolor === cc ? 3 : 1, borderColor: ctacolor === cc ? "#0C831F" : colors.line }} />
                    ))}
                  </View>
                </>
              )}
              {(kind === "showcase" || kind === "ad") && (
                <>
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{kind === "ad" ? "Video animation (GIF — plays on the card)" : "Background animation (plays instantly)"}</Text>
                  <TextInput value={video} onChangeText={setVideo} placeholder="Direct .gif link  https://…/file.gif" placeholderTextColor={colors.ink3} autoCapitalize="none" style={input} />
                  <Pressable onPress={() => { setVideo(DIWALI_GIF_PRESET); blip(700); }} style={{ borderRadius: 10, backgroundColor: "#0B0B0F", paddingVertical: 10, alignItems: "center" }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#D8F34E" }}>Use Diwali fireworks preset</Text>
                  </Pressable>
                  {!!video.trim() && !isPlayableVideoUrl(video) && !isMp4Url(video) && (
                    <Text style={{ fontFamily: F.semi, fontSize: 11, color: "#E23744" }}>This is a page link, not an animation file — it will not play. Use a direct link ending in .gif (Giphy/Tenor share → file link).</Text>
                  )}
                  {!!video.trim() && isMp4Url(video) && (
                    <Text style={{ fontFamily: F.semi, fontSize: 11, color: "#E8830C" }}>MP4 video is not supported in the current build — use a GIF link instead, it plays instantly with no app update.</Text>
                  )}
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>Artwork fit — slide & expand</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>Move the art up/down and zoom in until it sits perfectly. No fixed template.</Text>
                  <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>Stage height (GIF size)</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {[[340, "Compact"], [460, "Standard"], [600, "Grand"]].map(([hv, label]) => (
                      <Pressable key={label as string} onPress={() => { setStageh(hv as number); blip(600); }} style={{ flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: "center", backgroundColor: stageh === hv ? "#0C831F" : colors.card2 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 11, color: stageh === hv ? "#fff" : colors.ink2 }}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>Position</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {[["top", "Top"], ["center", "Center"], ["bottom", "Bottom"]].map(([k, label]) => (
                      <Pressable key={k} onPress={() => { setArtpos(k); blip(600); }} style={{ flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: "center", backgroundColor: artpos === k ? "#0C831F" : colors.card2 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 11, color: artpos === k ? "#fff" : colors.ink2 }}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>Zoom</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {[1, 1.25, 1.5, 2].map((zv) => (
                      <Pressable key={zv} onPress={() => { setZoom(zv); blip(600); }} style={{ flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: "center", backgroundColor: zoom === zv ? "#0C831F" : colors.card2 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 11, color: zoom === zv ? "#fff" : colors.ink2 }}>{zv}x</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>Text block</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {[["top", "Top"], ["center", "Middle"], ["bottom", "Bottom"]].map(([k, label]) => (
                      <Pressable key={k} onPress={() => { setAlign(k); blip(600); }} style={{ flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: "center", backgroundColor: align === k ? "#0C831F" : colors.card2 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 11, color: align === k ? "#fff" : colors.ink2 }}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>Paste an animated GIF and it plays full-screen behind the header — no app update needed. Blank template guide — canvas 1080 × 1400 px: keep the main art in the middle band, headline sits in the upper third, pill button near the bottom. Location + search overlay the top automatically.</Text>
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>Motion overlay (auto-fits over video or art)</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {MOTION_OPTS.map((m) => (
                      <Pressable key={m.k} onPress={() => { setAnim(m.k); blip(600); }} style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: anim === m.k ? "#0B0B0F" : colors.card2 }}>
                        <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: anim === m.k ? "#D8F34E" : colors.ink2 }}>{m.label}</Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 9.5, color: anim === m.k ? "rgba(216,243,78,.7)" : colors.ink3 }}>{m.desc}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              <TextInput value={image} onChangeText={setImage} placeholder={kind === "showcase" ? "Backdrop art URL (fallback/poster under video)" : "Image URL  https://…"} placeholderTextColor={colors.ink3} autoCapitalize="none" style={input} />
              {(kind === "ad" || kind === "banner") && (
                <>
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>Media fit — big GIFs</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Pressable onPress={() => { setFit("cover"); blip(600); }} style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", backgroundColor: fit !== "contain" ? "#0B0B0F" : colors.card2 }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: fit !== "contain" ? "#D8F34E" : colors.ink2 }}>Fill card</Text>
                      <Text style={{ fontFamily: F.medium, fontSize: 9.5, color: fit !== "contain" ? "rgba(216,243,78,.7)" : colors.ink3 }}>Crops edges</Text>
                    </Pressable>
                    <Pressable onPress={() => { setFit("contain"); blip(600); }} style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", backgroundColor: fit === "contain" ? "#0B0B0F" : colors.card2 }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: fit === "contain" ? "#D8F34E" : colors.ink2 }}>Show full GIF</Text>
                      <Text style={{ fontFamily: F.medium, fontSize: 9.5, color: fit === "contain" ? "rgba(216,243,78,.7)" : colors.ink3 }}>Nothing cropped</Text>
                    </Pressable>
                  </View>
                </>
              )}
                </>
              )}
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>Background tint</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {["rgba(10,10,10,.78)", "rgba(14,59,46,.85)", "rgba(60,20,60,.8)", "rgba(74,14,46,.92)", "rgba(158,42,43,.85)", "rgba(12,131,31,.85)"].map((cc) => (
                  <Pressable key={cc} onPress={() => setC1(cc)} style={{ height: 38, width: 38, borderRadius: 19, backgroundColor: cc, borderWidth: c1 === cc ? 3 : 1, borderColor: c1 === cc ? "#0C831F" : colors.line }} />
                ))}
              </View>
              {/* Live preview */}
              <View style={{ borderRadius: 14, overflow: "hidden", backgroundColor: c1, minHeight: 90, justifyContent: "center", padding: 14 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9, letterSpacing: 1.2, color: "#F8CB46" }}>{(tag || "TAG").toUpperCase()}</Text>
                <Text style={{ fontFamily: headlineFont({ font }).family, fontStyle: headlineFont({ font }).italic ? "italic" : "normal", fontSize: 16, color: tcolor || "#fff" }}>{title || "Your headline appears here…"}</Text>
                {!!sub && <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: "rgba(255,255,255,.85)" }}>{sub}</Text>}
              </View>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>On tap — open</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {LINK_OPTS.map((l) => (
                  <Pressable key={l.k} onPress={() => { setLinkKind(l.k); setLinkValue(""); blip(600); }} style={{ flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: "center", backgroundColor: linkKind === l.k ? "#0C831F" : colors.card2 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 11, color: linkKind === l.k ? "#fff" : colors.ink2 }}>{l.label}</Text>
                  </Pressable>
                ))}
              </View>
              {(linkKind === "store" || linkKind === "category" || linkKind === "search") && (
                <LinkValuePicker linkKind={linkKind} linkValue={linkValue} setLinkValue={setLinkValue} />
              )}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput value={startsAt} onChangeText={setStartsAt} placeholder="Start  YYYY-MM-DD" placeholderTextColor={colors.ink3} style={[input, { flex: 1 }]} />
                <TextInput value={endsAt} onChangeText={setEndsAt} placeholder="End  YYYY-MM-DD" placeholderTextColor={colors.ink3} style={[input, { flex: 1 }]} />
              </View>
              <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>Empty dates = always visible. Set dates for festival auto on/off.</Text>
              <Pressable onPress={saveBlock} style={{ borderRadius: 14, backgroundColor: "#0C831F", paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Save — shows on home instantly</Text>
              </Pressable>
              {target.t === "block" && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable onPress={hideBlock} style={{ flex: 1, borderRadius: 12, backgroundColor: colors.chip, paddingVertical: 12, alignItems: "center" }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{target.block.active !== false ? "Hide" : "Show"}</Text>
                  </Pressable>
                  <Pressable onPress={deleteBlock} style={{ flex: 1, borderRadius: 12, backgroundColor: "rgba(226,55,68,.12)", paddingVertical: 12, alignItems: "center" }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#E23744" }}>Delete</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {target.t === "texts" && (
            <>
              {[
                ["searchPlaceholder", "Search placeholder"],
                ["greetingSub", "Greeting subline"],
                ["categoriesTitle", "Categories heading"],
                ["festivalTitle", "Festival title"],
                ["festivalSub", "Festival subtitle"],
                ["festivalCta", "Festival button"],
              ].map(([k, label]) => (
                <View key={k}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{label}</Text>
                  <TextInput value={texts[k] ?? ""} onChangeText={(v) => setTexts((t) => ({ ...t, [k]: v }))} style={[input, { marginTop: 4 }]} />
                </View>
              ))}
              <Pressable onPress={saveTexts} style={{ borderRadius: 14, backgroundColor: "#0C831F", paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Save text</Text>
              </Pressable>
            </>
          )}

          {target.t === "strips" && (
            <>
              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: colors.ink3 }}>One offer per line — separate with |{"\n"}Example: 50% OFF up to ₹100 | Free delivery over ₹199</Text>
              <TextInput value={strips} onChangeText={setStrips} multiline numberOfLines={4} style={[input, { minHeight: 90, textAlignVertical: "top" }]} />
              <Pressable onPress={saveStrips} style={{ borderRadius: 14, backgroundColor: "#0C831F", paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Save ticker</Text>
              </Pressable>
            </>
          )}
          <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3, textAlign: "center" }}>Save applies instantly on this screen. Press Publish below to push to all users.</Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

/* Card media — GIF/image with Fill (crop) or Full (whole GIF visible) fit. */
function CardMedia({ b }: { b: ApiHomeBlock }) {
  const gif = isPlayableVideoUrl(b.video || "");
  const src = (gif ? b.video || "" : b.image || "").trim();
  if (!src) return <View style={{ position: "absolute", width: "100%", height: "100%", backgroundColor: "#0E3B2E" }} />;
  const contain = b.fit === "contain";
  return (
    <>
      {contain && <View style={{ position: "absolute", width: "100%", height: "100%", backgroundColor: b.c1 || "#0E3B2E" }} />}
      <ExpoImage source={{ uri: src }} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit={contain ? "contain" : "cover"} cachePolicy="memory-disk" />
    </>
  );
}

/* ── In-feed promo (banner / video ad between store sections, Swiggy style) ── */
function FeedPromoCard({ b, editing, onTap, onEdit }: { b: ApiHomeBlock; editing: boolean; onTap: () => void; onEdit: () => void }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      <View style={{ position: "relative" }}>
        <Pressable onPress={onTap} style={{ height: 140, borderRadius: 20, overflow: "hidden", backgroundColor: "#0E3B2E" }}>
          <CardMedia b={b} />
          <LinearGradient colors={[b.c1 || "rgba(10,10,10,.8)", "rgba(10,10,10,.1)", "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", width: "100%", height: "100%" }} />
          <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
            {!!b.tag && (
              <View style={{ alignSelf: "flex-start", borderRadius: 6, backgroundColor: "#F8CB46", paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: "#111114" }}>{b.tag.toUpperCase()}</Text>
              </View>
            )}
            {!!b.title && <Text style={{ marginTop: 6, fontFamily: cardTitleFamily(b), fontSize: 20, lineHeight: 22, color: b.tcolor || "#fff" }}>{b.title}</Text>}
            {!!b.sub && <Text style={{ marginTop: 2, fontFamily: F.semi, fontSize: 12, color: "rgba(255,255,255,.85)" }}>{b.sub}</Text>}
            {!!b.cta && (
              <View style={{ marginTop: 8, alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 6 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#111114" }}>{b.cta} →</Text>
              </View>
            )}
          </View>
        </Pressable>
        {editing && (
          <Pressable onPress={onEdit} style={{ position: "absolute", right: 8, top: 8, height: 34, width: 34, borderRadius: 17, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 15 }}>✏️</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ── CategoryRails ── */
export function CategoryRails({ cats, onStore, feedAds, editing, onTapAd, onEditAd, onAddFeed }: {
  cats: CategoryDef[]; onStore: (id: string) => void;
  feedAds?: ApiHomeBlock[]; editing?: boolean;
  onTapAd?: (b: ApiHomeBlock) => void; onEditAd?: (b: ApiHomeBlock) => void; onAddFeed?: () => void;
}) {
  const set = useOSB((s) => s.set);
  const { colors } = useTheme();
  const { stores: allStores, products: allProducts } = useMarketplace();
  return (
    <View>
      {cats.map((c, ci) => {
        const stores = allStores.filter((s) => c.kinds.includes(s.kind)).slice(0, 6);
        const ids = new Set(stores.map((s) => s.id));
        const products = inStockFirst(allProducts.filter((p) => ids.has(p.storeId))).slice(0, 8);
        const feed = feedAds?.[ci];
        return (
          <View key={c.k}>
          <View style={{ paddingTop: 20 }}>
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
          {/* in-feed ad after this section (slot=feed) */}
          {!!feed && (
            <FeedPromoCard
              b={feed}
              editing={!!editing}
              onTap={() => (editing ? onEditAd?.(feed) : onTapAd?.(feed))}
              onEdit={() => onEditAd?.(feed)}
            />
          )}
          {editing && !feed && (
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
              <Pressable onPress={onAddFeed} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, paddingVertical: 10, alignItems: "center" }}>
                <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>+ Banner ad here</Text>
              </Pressable>
              <Pressable onPress={onAddFeed} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, paddingVertical: 10, alignItems: "center" }}>
                <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>+ Video ad here</Text>
              </Pressable>
            </View>
          )}
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
  const out = isOutOfStock(p);
  const qty = cart.find((c) => c.productId === pid)?.qty ?? 0;
  const store = stores.find((s) => s.id === p.storeId);
  const off = p.mrp ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const line = { productId: p.id, name: p.name, emoji: p.emoji, image: p.image, price: p.price, qty: 1, storeId: p.storeId, storeName: store?.name ?? "", unit: p.unit, tint: p.tint } as never;
  return (
    <Animated.View entering={FadeIn.delay(Math.min(index * 40, 250))} style={{ width: 138, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden", opacity: out ? 0.75 : 1 }}>
      <View style={{ position: "relative", height: 118, backgroundColor: "#F6F6F6" }}>
        <Img src={p.image} style={{ width: "100%", height: "100%" }} />
        {out && (
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.65)", paddingVertical: 4, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 0.5, color: "#fff" }}>OUT OF STOCK</Text>
          </View>
        )}
        {!out && off > 0 && (
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
          {out ? (
            <View style={{ borderRadius: 8, backgroundColor: colors.chip, paddingHorizontal: 8, paddingVertical: 6 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 9, color: colors.ink3 }}>OUT OF{"\n"}STOCK</Text>
            </View>
          ) : (
            <AddStepper small qty={qty} onAdd={() => addToCart(line)} onInc={() => addToCart(line)} onDec={() => decCart(p.id)} />
          )}
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
    const ps = inStockFirst(products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))).slice(0, 6);
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
                isOutOfStock(r.p) ? (
                  <View style={{ borderRadius: 8, backgroundColor: colors.chip, paddingHorizontal: 10, paddingVertical: 7 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: colors.ink3 }}>OUT OF STOCK</Text>
                  </View>
                ) : (
                <AddStepper
                  small
                  qty={cart.find((c) => c.productId === r.p.id)?.qty ?? 0}
                  onAdd={() => addToCart({ productId: r.p.id, name: r.p.name, emoji: r.p.emoji, image: r.p.image, price: r.p.price, qty: 1, storeId: r.p.storeId, storeName: "", unit: r.p.unit, tint: r.p.tint } as never)}
                  onInc={() => addToCart({ productId: r.p.id, name: r.p.name, emoji: r.p.emoji, image: r.p.image, price: r.p.price, qty: 1, storeId: r.p.storeId, storeName: "", unit: r.p.unit, tint: r.p.tint } as never)}
                  onDec={() => decCart(r.p.id)}
                />
                )
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
type SheetKind = null | "edit" | "loc" | "coupons" | "reviews" | "settings" | "help" | "wallet";

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
   const role = useOSB((s) => s.role);
   const t = useT();
   // Live subtitles (backend-first, static fallback) — sheet bandh hote hi refresh.
   const [couponCount, setCouponCount] = useState(4);
   const [revStat, setRevStat] = useState("23 reviews • 4.8 avg");
   const [sheet, setSheet] = useState<SheetKind>(null);
   const [copiedTick, setCopiedTick] = useState(false);

   const refreshStats = () => {
     apiGetCoupons()
       .then((rows) => { if (rows.length > 0) setCouponCount(rows.length); })
       .catch(() => {});
     apiMyReviews()
       .then((rows) => {
         if (rows.length === 0) { setRevStat("No reviews yet"); return; }
         const avg = rows.reduce((a, r) => a + Number(r.rating ?? 5), 0) / rows.length;
         setRevStat(`${rows.length} reviews • ${avg.toFixed(1)} avg`);
       })
       .catch(() => {});
   };
   useEffect(() => { refreshStats(); }, []);
   const closeSheet = () => { setSheet(null); refreshStats(); };

   const rows = useMemo(() => {
     const base: [string, string, string, SheetKind | "admin"][] = [
       ["🙋", t("youEditProfile"), t("youEditProfileSub"), "edit"],
       ["📍", t("youAddress"), "", "loc"],
       ["🎟️", t("youCoupons"), `${couponCount} active`, "coupons"],
       ["⭐", t("youReviews"), revStat, "reviews"],
     ];
     if (role === "super_admin") base.push(["🛡️", "Super Admin", "Platform control centre", "admin"]);
     base.push(["⚙️", t("youSettings"), t("youSettingsSub"), "settings"], ["💬", t("youHelp"), t("youHelpSub"), "help"]);
     return base;
   }, [role, couponCount, revStat, t]);
  const backToDeliveries = useOSB((s) => s.backToDeliveries);
  const { colors } = useTheme();
  const doLogout = () => {
    Alert.alert(t("youLogout"), t("youLogoutConfirm"), [
      { text: t("youCancel"), style: "cancel" },
      {
        text: t("youLogout"),
        style: "destructive",
        onPress: () => {
          // Is device pe push bandh + backend token hatao, phir local logout.
          unregisterForPush().catch(() => {});
          SecureStore.deleteItemAsync("osb-token").catch(() => {});
          logout();
          blip(400);
        },
      },
    ]);
  };
  const copyCoupon = async () => {
    if (!coupon) return;
    try {
      // Lazy require: purani dev-build binary me ExpoClipboard native code
      // nahi hai — static import poora bundle gira deta hai. Copy tabhi
      // chalega jab binary me module ho (fresh build), warna Copied tick
      // ke saath code sheet me dikhta rahega.
      const Clipboard = require("expo-clipboard") as { setStringAsync(s: string): Promise<void> };
      await Clipboard.setStringAsync(coupon);
      setCopiedTick(true);
      blip(760);
      setTimeout(() => setCopiedTick(false), 1600);
    } catch {
      // Clipboard unavailable — code waise bhi card pe visible hai.
      setCopiedTick(true);
      setTimeout(() => setCopiedTick(false), 1600);
    }
  };
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
          <Pressable onPress={() => { setSheet("edit"); blip(600); }} style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.chip }}>
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
          <Pressable onPress={() => { setSheet("wallet"); blip(600); }} style={{ flex: 1, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Wallet size={13} color={colors.ink3} />
              <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1, color: colors.ink3 }}>WALLET</Text>
            </View>
            <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 22, color: colors.ink }}>₹486</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 11, color: "#0C831F" }}>+ ₹48 cashback pending</Text>
          </Pressable>
          <Pressable onPress={() => void copyCoupon()} style={{ flex: 1, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
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
            <Text style={{ marginTop: 4, fontFamily: F.bold, fontSize: 11, color: copiedTick ? "#0C831F" : colors.ink3 }}>{copiedTick ? "Copied ✓" : "Tap to copy"}</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
           {rows.map(([e, title, s, kind], ix) => (
             <Pressable
               key={title}
               onPress={() => {
                 if (kind === "admin") set({ mode: "admin", tab: "overview" });
                 else if (kind) setSheet(kind);
                 blip(600);
               }}
               style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: ix === rows.length - 1 ? 0 : 1, borderBottomColor: colors.line }}
            >
              <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18 }}>{e}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{title}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>
                  {kind === "loc" ? (address ? (addressArea ? addressArea + ` • ${t("youAddressChange")}` : address.slice(0, 34)) : t("youAddressSet")) : s}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.ink3} style={{ opacity: 0.35 }} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={doLogout} style={{ marginTop: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#E23744" }}>{t("youLogout")}</Text>
        </Pressable>
        <Text style={{ marginTop: 16, fontFamily: F.semi, fontSize: 11, color: colors.ink3, textAlign: "center" }}>One Stop Bazar • OTP login only 🇮🇳</Text>
      </ScrollView>
      {sheet === "edit" && <EditProfileSheet onClose={closeSheet} />}
      {sheet === "loc" && <ChangeLocationSheet onClose={closeSheet} />}
      {sheet === "coupons" && <CouponsSheet onClose={closeSheet} />}
      {sheet === "reviews" && <ReviewsSheet onClose={closeSheet} />}
      {sheet === "settings" && <SettingsSheet onClose={closeSheet} />}
      {sheet === "help" && <HelpSheet onClose={closeSheet} />}
      {sheet === "wallet" && <WalletSheet onClose={closeSheet} />}
    </View>
  );
}

/* ═══════════ StoreSheet ═══════════ */
export function StoreSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { stores, products } = useMarketplace();
  const s = stores.find((x) => x.id === id);
  const menu = inStockFirst(products.filter((p) => p.storeId === id));
  useSheetBackCloser(!!s, onClose);
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
                const out = isOutOfStock(p);
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
                      <View style={{ position: "relative", height: 104, width: 118, borderRadius: 14, backgroundColor: "#f2f2f2", overflow: "hidden", opacity: out ? 0.6 : 1 }}>
                        <Img src={p.image} style={{ width: "100%", height: "100%" }} />
                        {(p.images?.length ?? 0) > 1 && (
                          <View style={{ position: "absolute", right: 6, top: 6, borderRadius: 6, backgroundColor: "rgba(0,0,0,.65)", paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontFamily: F.extra, fontSize: 9, color: "#fff" }}>📷 {p.images!.length}</Text>
                          </View>
                        )}
                        {out && (
                          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.65)", paddingVertical: 4, alignItems: "center" }}>
                            <Text style={{ fontFamily: F.extra, fontSize: 9, color: "#fff" }}>OUT OF STOCK</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ position: "absolute", bottom: 22, left: "50%", marginLeft: -36 }}>
                        {out ? (
                          <View style={{ borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 7 }}>
                            <Text style={{ fontFamily: F.extra, fontSize: 9, color: colors.ink3 }}>OUT OF STOCK</Text>
                          </View>
                        ) : (
                          <AddStepper small qty={qty} onAdd={() => addToCart(line)} onInc={() => addToCart(line)} onDec={() => decCart(p.id)} />
                        )}
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
