/**
 * One Stop Bazar — Design Tokens (Single Source of Truth for Expo RN)
 * Extracted 1:1 from src/app/globals.css:3-64. NEVER hand-edit values —
 * change globals.css first, then re-extract here.
 */

export const font = {
  sans: "PlusJakartaSans",
  display: "Fraunces",
  /** web fallbacks (for reference only) */
  webSans: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  webDisplay: '"Fraunces", "Plus Jakarta Sans", ui-serif, system-ui, sans-serif',
} as const;

export const brandStatic = {
  ink: "#131316",
  paper: "#F6F3EC",
  lime: "#D8F34E",
  pine: "#0E3B2E",
  tang: "#FF6A2B",
  grape: "#7C5CFF",
  mint: "#1FB67C",
} as const;

export type ThemeName = "light" | "dark";

export interface ThemeColors {
  app: string;
  surface: string;
  card: string;
  card2: string;
  chip: string;
  brand: string;
  green: string;
  paper: string;
  paper2: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  glass: string;
  glassStrong: string;
  glassTint: string;
}

/** globals.css:19-41 */
export const light: ThemeColors = {
  app: "#F4F5F7",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  card2: "#FAFAFB",
  chip: "#F0F1F3",
  brand: "#E23744",
  green: "#0C831F",
  paper: "#F4F5F7",
  paper2: "#EDEEF1",
  ink: "#111114",
  ink2: "#4E4E59",
  ink3: "#8C8C99",
  line: "rgba(17,17,20,0.08)",
  glass: "rgba(255,255,255,0.72)",
  glassStrong: "rgba(255,255,255,0.88)",
  glassTint: "rgba(255,255,255,0.55)",
};

/** globals.css:43-64 (.dark-scope) */
export const dark: ThemeColors = {
  app: "#0E0E12",
  surface: "#17171C",
  card: "#1A1A20",
  card2: "#202027",
  chip: "#26262E",
  brand: "#FF5C69",
  green: "#35C759",
  paper: "#0E0E12",
  paper2: "#1A1A20",
  ink: "#F2F2F5",
  ink2: "#B4B4C0",
  ink3: "#82828F",
  line: "rgba(255,255,255,0.10)",
  glass: "rgba(28,27,34,0.66)",
  glassStrong: "rgba(32,31,40,0.86)",
  glassTint: "rgba(255,255,255,0.06)",
};

export const radius = { r12: 12, r18: 18, r24: 24, r32: 32, phone: 46 } as const;

/** Web CSS strings (globals.css:36-38 / 60-62) + RN shadow split */
export const shadow = {
  soft: "0 1px 2px rgba(20,19,24,.06), 0 8px 24px rgba(20,19,24,.08)",
  float: "0 2px 6px rgba(20,19,24,.08), 0 18px 48px rgba(20,19,24,.14)",
  hero: "0 4px 12px rgba(20,19,24,.1), 0 32px 80px rgba(20,19,24,.22)",
  softDark: "0 1px 2px rgba(0,0,0,.4), 0 12px 32px rgba(0,0,0,.4)",
  floatDark: "0 2px 8px rgba(0,0,0,.5), 0 24px 64px rgba(0,0,0,.55)",
  heroDark: "0 8px 24px rgba(0,0,0,.5), 0 40px 100px rgba(0,0,0,.6)",
  /** RN: iOS shadow* + Android elevation */
  rn: {
    soft: {
      ios: { shadowColor: "#141318", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
      elevation: 3,
    },
    float: {
      ios: { shadowColor: "#141318", shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 18 } },
      elevation: 8,
    },
    hero: {
      ios: { shadowColor: "#141318", shadowOpacity: 0.24, shadowRadius: 40, shadowOffset: { width: 0, height: 32 } },
      elevation: 16,
    },
  },
} as const;

export const blur = { glass: 22, glassStrong: 28 } as const;

export const glass = {
  light: {
    bg: light.glass,
    border: "rgba(255,255,255,0.5)",
    inset: "rgba(255,255,255,0.7)",
    strongBg: light.glassStrong,
    strongBorder: "rgba(255,255,255,0.6)",
    strongInset: "rgba(255,255,255,0.8)",
  },
  dark: {
    bg: dark.glass,
    border: "rgba(255,255,255,0.11)",
    inset: "rgba(255,255,255,0.14)",
    strongBg: dark.glassStrong,
    strongBorder: "rgba(255,255,255,0.13)",
    strongInset: "rgba(255,255,255,0.16)",
  },
} as const;

/** ui.tsx exact specs */
export const ui = {
  ratingBg: (v: number) => (v >= 4.5 ? "#256F3A" : v >= 4.0 ? "#3A833C" : v >= 3.5 ? "#CD7F32" : "#8C8C8C"),
  rating: { radius: 8, padH: 6, padV: 3, fontSize: 11.5, starSize: 10 },
  pill: { radius: 999, padH: 10, padV: 4, fontSize: 11, defaultBg: "rgba(20,19,24,.06)" },
  addStepper: {
    borderColor: "#0C831F",
    borderWidth: 1.5,
    filledBg: "#0C831F",
    radius: 10,
    small: { h: 30, w: 72, fontSize: 12, qtySize: 13 },
    regular: { h: 36, w: 88, fontSize: 13, qtySize: 14 },
  },
  veg: { box: 15, radius: 4, borderWidth: 1.5, dot: 7, veg: "#0C831F", nonVeg: "#B71C1C" },
  springBtn: { stiffness: 500, damping: 28, tapScale: 0.94, hoverScale: 1.015 },
  navPill: { stiffness: 420, damping: 32, radius: 16 },
  sheetSpring: { stiffness: 240, damping: 30 },
  screenTransition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const, yIn: 14, yOut: -10 },
} as const;

export const animation = {
  shineMoveMs: 5500,
  floatyMs: 5000,
  floatySlowMs: 7500,
  blobDriftMs: 14000,
  marqueeMs: 22000,
  pulseRingMs: 2200,
  liveDotMs: 1600,
  confettiFallMs: 2600,
  tickPopMs: 450,
  splashMs: 2000,
  bannerAutoMs: 3800,
} as const;

export const layout = {
  phoneMaxWidth: 430,
  phoneRadiusLg: 46,
  statusBar: { padH: 24, padT: 16, padB: 4, timeSize: 12.5 },
  bottomNav: { padH: 12, padB: 16, radius: 22, itemPadV: 8, itemRadius: 16, icon: 20, label: 10 },
  sheetRadius: 26,
} as const;

export const tokens = { font, brandStatic, light, dark, radius, shadow, blur, glass, ui, animation, layout } as const;

export function themeColors(name: ThemeName): ThemeColors {
  return name === "dark" ? dark : light;
}
