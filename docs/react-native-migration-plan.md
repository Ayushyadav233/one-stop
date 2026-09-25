# One Stop Bazar — React Web → React Native (Expo) Migration Plan
## Option C + Expo + Pixel-Perfect (Zero Design Change)

> Date: 2026-09-24
> Request: React Web (Next.js) ka design bilkul same, ek sui bhi alag nahi, React Native Android app me convert. Figma nahi hai. Expo use karna hai. Best cheez use karke accuracy se karna hai.

---

## 1) Conversation Summary (Yaad ke liye save)

**User (Hinglish):** "ye jo mera code hai abhi react web ka hai muje exectly yhi design react native me chye and design billkul bhi chnage nhi hona chye ... bs muje ab iski ek react native android app chye"

**Assistant Analysis:** Codebase Next.js 16.2.6 + React 19.2.6 + Tailwind v4.1.17 + framer-motion + zustand + lucide-react + leaflet. App already `max-w-[430px] lg:h-[860px] lg:rounded-[46px]` phone frame me render (`src/app/page.tsx:57`). Saare design tokens `src/app/globals.css:3-64` me centralized hai (colors, radius, shadows, blur, glass). Isliye Figma ke bina bhi `globals.css` hi source of truth hai.

**3 Options diye:**
- A) WebView wrap — 100% same dikhega par Play Store reject + native feel nahi — REJECT
- B) Direct RN copy bina design.md — 70-80% match, baad me drift — FAIL
- C) design.md / Design System First — 99-100% pixel-perfect — **SELECTED**

**User:** "bhai option c ke sath kaam krde and best chiz use kr taaki design and ui ... expo use krle figma file nhi hai ache se krke ek prper plan bnna and to do taaki terko haar chiz ka reference mil skhe .. tu binna ruke accuracy ke sath apna kaam kr skhe"

**User (current):** "ye jo bhi plan hai isse save krle and hmari sari conversation .. haam ye kaam baad me krege .. abhi merko khi bhar jana hai to save krle baad me yhi se start krege .. full plan yaad rkhna" + Build mode enabled.

**Is file ka maksad:** Baad me yahi se continue karna, koi context loss nahi.

---

## 2) Current Web App — Source of Truth (File Paths with Line Numbers)

- `package.json:1-37` — dependencies: next 16.2.6, react 19.2.6, tailwind 4.1.17, framer-motion 13.4.0, lucide-react 1.47.0, zustand 5.0.15, leaflet 1.9.4
- `src/app/globals.css:1-176` — **MOST IMPORTANT**
  - `@theme` tokens: `--font-display/display, --color-ink/paper/lime/pine/tang/grape/mint, --radius-12/18/24/32` (`:3-17`)
  - `:root` light vars + `.dark-scope` dark vars: `--app/surface/card/chip/brand/green/paper/ink/ink-2/ink-3/line/glass/shadow-soft/float/hero/blur` (`:19-64`)
  - Utilities: `.glass/.glass-strong`, `.hairline`, `.app-bg/.card`, `.pressable`, `.shine`, `.floaty`, `.blob-drift`, `.marquee`, `.pulse-ring` etc (`:77-173`)
- `src/app/layout.tsx:1-36` — fonts: Fraunces + Plus Jakarta Sans (Google Fonts), leaflet css, viewport config
- `src/app/page.tsx:1-169` — Root: ambient blobs, phone frame `max-w-[430px]`, Android status bar `Signal/Wifi/Battery` (`:89-94`), scroll `no-scrollbar`, tab/mode routing via `useOSB`
- `src/lib/cn.ts:1-3` — `cn()` helper
- `src/lib/data.ts`, `src/lib/commerce.ts`, `src/lib/osb-store.ts`, `src/lib/biz-store.ts` — business logic + Zustand stores
- `src/components/ui.tsx:1-130` — `Glass, Pill, Rating (Zomato green), SectionHead, SpringBtn, AddStepper (Blinkit style), Img, AreaGraph, Ring, VegMark`
- `src/components/shell.tsx:1-599` — `Splash, Onboarding, BottomNav (customer/provider/admin/rider), CartSheet, CheckoutSheet, SuccessOverlay, TrackingSheet (LiveMap + OTP + bill)`
- `src/components/customer.tsx:1-659+` — `CustomerHome (header, search, greeting, category grid 5 cols, banner carousel, CATS, BlinkitCard, CategoryRails, ZomatoCard, SearchTab, OrdersTab, SavedTab, ProfileTab, StoreSheet)`
- `src/components/categories.tsx, provider.tsx, provider-catalog.tsx, seller.tsx, business.tsx, rider.tsx, admin.tsx, profile-setup.tsx, location-setup.tsx, login.tsx, live-map.tsx` — baaki roles (glob me mile)
- `src/app/api/*` — `stores, products, orders, health, seed` routes

> Note: Web pe bhi UI phone ke andar hai, isliye RN me desktop side copy (`page.tsx:67-80` + `150-166`) hatana hai, sirf phone wala part `SafeAreaView` me.

---

## 3) Final Architecture — Expo Best Stack (Pixel-Perfect Guarantee)

**Expo SDK 52+ (Managed) + expo-router**
- File-based routing, Next.js jaisa, `tab` + `mode` state `osb-store` se drive
- `SafeAreaView` + Android StatusBar, `expo-font` se exact fonts

**Styling: NativeWind v4 (Tailwind for RN)**
- Web ka `className` same rahega, drift nahi. `tailwind.config` me `tokens.ts` map.

**Animations: react-native-reanimated 3 + moti**
- `framer-motion` RN me nahi. `motion.div whileTap/whileHover` → `MotiView` + `withSpring`. Values exact: `stiffness:500,damping:28` etc.

**Icons: lucide-react-native**
- `lucide-react` ka RN version, 1:1 same.

**Blur/Glass: expo-blur + @react-native-community/blur + expo-linear-gradient**
- `globals.css:77-99` ka `backdrop-filter: blur(22px) saturate(1.4)` RN me `BlurView intensity={22} tint="light"` + border/shadow tokens.

**Maps: react-native-maps + react-native-maps-directions**
- `leaflet` web-only, RN me `MapView` + `Marker` + `Polyline`. `getStoreLocation/getCustomerLocation` logic same.

**State: zustand + @react-native-async-storage/async-storage + expo-secure-store**
- `osb-store.ts`, `biz-store.ts`, `commerce.ts`, `data.ts` ko `packages/shared` me share, UI alag. Web + Native monorepo possible.

**Fonts: expo-font + expo-splash-screen**
- `Fraunces` + `Plus Jakarta Sans` exact weight load.

**Build: EAS Build**
- `eas build --platform android` → `.aab` for Play Store.

---

## 4) docs/design.md + src/theme/tokens.ts — Single Source of Truth (Bina Ruke Kaam Ke Liye)

**Iske bina koi bhi pixel-perfect nahi bana sakta. Har token `globals.css` se 1:1:**

```ts
// src/theme/tokens.ts (example, exact extract from globals.css:3-64)
export const tokens = {
  font: { sans: "Plus Jakarta Sans", display: "Fraunces" },
  color: {
    light: { app:"#F4F5F7", surface:"#FFFFFF", card:"#FFFFFF", chip:"#F0F1F3", brand:"#E23744", green:"#0C831F", ink:"#111114", ink2:"#4E4E59", ink3:"#8C8C99", line:"rgba(17,17,20,0.08)", lime:"#D8F34E", pine:"#0E3B2E", tang:"#FF6A2B", grape:"#7C5CFF", mint:"#1FB67C" },
    dark:  { app:"#0E0E12", surface:"#17171C", card:"#1A1A20", chip:"#26262E", brand:"#FF5C69", green:"#35C759", ink:"#F2F2F5", ink2:"#B4B4C0", ink3:"#82828F", line:"rgba(255,255,255,0.10)" }
  },
  radius: {12:12, 18:18, 24:24, 32:32, phone:46},
  shadow: { soft:"0 1px 2px rgba(20,19,24,.06), 0 8px 24px rgba(20,19,24,.08)", float:"0 2px 6px rgba(20,19,24,.08), 0 18px 48px rgba(20,19,24,.14)" },
  blur: 22,
  glass: { light: { bg:"rgba(255,255,255,0.72)", border:"rgba(255,255,255,.5)" }, strong: { bg:"rgba(255,255,255,0.88)", border:"rgba(255,255,255,.6)" } }
}
// + spacing, fontSizes (11px, 12px, 13px etc jo ui.tsx me hai)
```

**Component Specs (ui.tsx + shell.tsx se):**
- `AddStepper small: h30 w72 rounded10 border1.5 #0C831F, font 12px extrabold` `ui.tsx:62`
- `AddStepper default: h36 w88` `ui.tsx:62`
- `Rating: bg #256F3A if >=4.5 else #3A833C if >=4.0` `ui.tsx:24`
- `VegMark: 15x15 border1.5, dot 7x7` `ui.tsx:125`
- `BottomNav active pill: bg-brand + motion layoutId navpill spring 420/32` `shell.tsx:134`
- `CartSheet rounded-t26, max-h88%` `shell.tsx:156`
- etc — har component ka screenshot + exact px/py/gap/radius/fontSize design.md me

**Animations (globals.css:145-173):**
- `shineMove 5.5s ease-in-out infinite`, `floaty 5s`, `blobDrift 14s`, `marquee 22s linear`, `pulseRing 2.2s`, `liveDot 1.6s`, `confettiFall 2.6s`, `tickPop .45s cubic-bezier(.34,1.8,.64,1)`

**Screenshots:** Web ke har screen (430px width) ka screenshot design.md me embed, RN me overlay karke pixelmatch se 0 diff check.

---

## 5) Project Structure (Recommended Monorepo)

```
/
├── docs/
│   ├── react-native-migration-plan.md  (YE FILE)
│   └── design.md  (tokens + component specs + screenshots)
├── apps/
│   ├── web/  (current Next.js, move to apps/web)
│   └── native/  (new Expo app)
│       ├── app/  (expo-router)
│       │   ├── _layout.tsx
│       │   ├── (tabs)/home.tsx etc
│       │   └── _splash.tsx
│       ├── src/
│       │   ├── theme/tokens.ts
│       │   ├── theme/ThemeProvider.tsx
│       │   ├── lib/cn.ts
│       │   ├── components/ui.native.tsx
│       │   ├── components/shell.native.tsx
│       │   ├── components/customer.native.tsx
│       │   ├── components/provider.native.tsx etc
│       │   └── lib/osb-store.native.ts (persist with async-storage)
│       ├── tailwind.config.js (NativeWind)
│       └── app.json (expo)
└── packages/
    └── shared/
        ├── data.ts (from src/lib/data.ts)
        ├── commerce.ts
        └── schema.ts
```

Agar monorepo nahi chahiye to `native/` ko alag repo bhi rakh sakte hai, par shared logic duplicate hoga.

---

## 6) Phased TODO List — Execution Order (Accuracy ke hisab se)

### Phase 1: Design System Extraction [2 din, CRITICAL — iske bina kuch start nahi]
- [ ] 1.1 `docs/design.md` banao — `globals.css:3-176` se saare tokens + utilities + animations document, har component ka spec + screenshot
- [ ] 1.2 `apps/native/src/theme/tokens.ts` banao — exact TS export, light/dark dono
- [ ] 1.3 `apps/native/src/theme/ThemeProvider.tsx` + `lib/cn.ts` port — `dark-scope` class → `Appearance` + `useColorScheme`, `cn()` same
- [ ] 1.4 Tailwind/NativeWind config me tokens map, verification: web vs tokens diff 0

### Phase 2: Project Bootstrap
- [ ] 2.1 `npx create-expo-app one-stop-bazar-native --template blank-typescript` + `expo-router`, `expo-font`, `expo-blur`, `expo-linear-gradient`, `expo-splash-screen`
- [ ] 2.2 NativeWind v4 + tailwind.config.js + babel setup, `react-native-reanimated` + `moti` + `lucide-react-native` + `react-native-maps` install
- [ ] 2.3 `packages/shared` banao — `src/lib/data.ts`, `commerce.ts`, `osb-store.ts`, `biz-store.ts` copy, `zustand/middleware` persist ko `async-storage` se adapt
- [ ] 2.4 `expo-font` se `Fraunces` + `Plus Jakarta Sans` load, `app.json` splash config

### Phase 3: Core UI — Pixel Foundation
- [ ] 3.1 `ui.native.tsx` port — `Glass/GlassStrong` (BlurView), `Pill`, `Rating`, `SectionHead`, `SpringBtn(Moti)`, `AddStepper` (exact h/w/border), `Img`, `AreaGraph(SVG)`, `Ring`, `VegMark` — har ek web vs RN side-by-side screenshot
- [ ] 3.2 Icons verification — `lucide-react-native` size/stroke exact (`ui.tsx` me Star 10 etc)
- [ ] 3.3 Shadow/Blur tuning — Android `elevation` + iOS `shadow*` ko `tokens.shadow` se match

### Phase 4: App Shell & Navigation
- [ ] 4.1 `app/_layout.tsx` + `SafeAreaView` + Android StatusBar — `page.tsx:89-94` ka `time + Signal/Wifi/Battery + notch` exact
- [ ] 4.2 `shell.native.tsx` — `Splash` (2000ms `shell.tsx:14`), `Onboarding` 4 slides (`shell.tsx:32-101`), `BottomNav` 4 variants (customer/provider/admin/rider `shell.tsx:104-144`), `CartSheet`, `CheckoutSheet`, `SuccessOverlay` (confetti), `TrackingSheet` (LiveMap + OTP `shell.tsx:366-598`)

### Phase 5: Customer Flow (Sabse Bada)
- [ ] 5.1 `customer.native.tsx` — `CustomerHome`: header (`customer.tsx:70-98` search + location + avatar), greeting strip, category grid 5 cols (`115-151`), banner carousel (`167-206`), CATS circles, `BlinkitCard` (`331-358`), `CategoryRails`, festive card
- [ ] 5.2 `SearchTab`, `OrdersTab`, `SavedTab`, `ProfileTab`, `StoreSheet` (menu/reviews/info tabs `customer.tsx:603-658`)
- [ ] 5.3 Zustand wiring — `category`, `query`, `cart`, `wishlist`, `tab/mode/dark` sab `osb-store` se

### Phase 6: Baaki Roles
- [ ] 6.1 `categories.tsx`, `provider.tsx`, `provider-catalog.tsx`, `seller.tsx`, `business.tsx`, `rider.tsx`, `admin.tsx` port
- [ ] 6.2 `login.tsx`, `profile-setup.tsx`, `location-setup.tsx` (OTP, GPS) — `expo-location` + `expo-secure-store`
- [ ] 6.3 `live-map.tsx` → `react-native-maps` — `store/home/riderPos/progress/routeColor` props same (`shell.tsx:418-425`)
- [ ] 6.4 API layer — `src/app/api/*` ko RN me `fetch` same baseUrl, error handling

### Phase 7: Polish & Verification
- [ ] 7.1 Grain/pressable/shine/floaty animations RN me — `globals.css:129-158` ke values Reanimated me
- [ ] 7.2 Pixel-perfect check — Har screen web (430px) vs RN overlay, `pixelmatch` / manual 1px check, light + dark both
- [ ] 7.3 Performance — `moti` + `FlatList` + `no-scrollbar` → `showsVerticalScrollIndicator={false}`, 60fps check
- [ ] 7.4 EAS Build — `eas.json`, `eas build --platform android` → `.aab`, Play Store listing assets

---

## 7) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tailwind v4 (web) vs NativeWind (RN) mismatch | Tokens ko TS me single source rakho, tailwind.config dono jagah same tokens |
| framer-motion → Reanimated spring mismatch | `design.md` me exact `stiffness/damping/mass` likho, 1:1 map `withSpring` |
| Glass blur web 1 line vs RN 2 libs | `tokens.glass` me `intensity/tint` fix, `expo-blur` + border/shadow tune |
| Shadows iOS vs Android alag | `tokens.shadow` se `Platform.select({ios:{shadow*}, android:{elevation}})` |
| Leaflet → Maps rewrite | Logic (`getStoreLocation` etc) share, UI alag, route polyline same color `#0C831F` |

---

## 8) References — Har Cheez Ka Source (Agent Bina Ruke Kaam Kar Sake)

- Tokens: `src/app/globals.css:3-64` + utilities `:77-173`
- Phone frame: `src/app/page.tsx:57,83-87,89-94`
- Zustand store: `src/lib/osb-store.ts`, `biz-store.ts`
- Data: `src/lib/data.ts`, `commerce.ts`
- UI: `src/components/ui.tsx:7-130`
- Shell: `src/components/shell.tsx:13-598`
- Customer: `src/components/customer.tsx:18-659`
- Fonts: `src/app/layout.tsx:27-30`
- Deps: `package.json:11-22`

---

## 9) Next Step (Jab Wapas Aao)

1. Is file ko kholo — `docs/react-native-migration-plan.md`
2. Mujhe bolo "plan se kaam start kr" — Mai Plan Mode exit karke Phase 1.1 se shuru karunga: `docs/design.md` + `tokens.ts` exact extraction, bina koi assumption.
3. Koi sawal ho to puch lo — Monorepo vs alag repo, Expo vs Bare ka final decision tab lunga.

> Ye file + conversation save hai. Baad me yahi se 100% accuracy se continue karenge. Koi design change nahi hoga, promise.
