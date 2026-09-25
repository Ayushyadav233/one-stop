# One Stop Bazar — Design System Single Source of Truth

> Generated: Phase 1.1 (Option C + Expo pixel-perfect)
> Source files (NEVER guess, always re-check these):
> - `src/app/globals.css:1-176` — tokens + utilities + animations
> - `src/app/layout.tsx:27-30` — fonts Fraunces + Plus Jakarta Sans
> - `src/app/page.tsx:57,83-94` — phone frame 430px, Android status bar
> - `src/components/ui.tsx:1-130` — micro components
> - `src/components/shell.tsx:13-598` — splash/onboarding/nav/sheets
> - `src/components/customer.tsx:18-683` — customer home
> - `src/lib/cn.ts:1-3` — cn helper
> - `package.json:11-22` — deps

---

## 1. Fonts

| Role | Web (layout.tsx:28) | RN (expo-font) |
|---|---|---|
| Sans | `Plus Jakarta Sans` 300..800 (+italic) | `PlusJakartaSans-Regular/Medium/SemiBold/Bold/ExtraBold` via Google Fonts file |
| Display | `Fraunces` 400..900 (+italic, opsz 9..144) | `Fraunces-Regular/SemiBold/Bold` same files |
| Fallback | ui-sans-serif, system-ui | System |

RN mapping: `font.sans = "PlusJakartaSans"`, `font.display = "Fraunces"`.
`.font-display` class (globals.css:75) → `fontFamily: tokens.font.display`.

## 2. Color Tokens (exact from globals.css:3-64)

### 2.1 @theme (Tailwind v4, globals.css:3-17)
```
--font-display: Fraunces, Plus Jakarta Sans, ui-serif, system-ui
--font-sans: Plus Jakarta Sans, ui-sans-serif, system-ui
--color-ink: #131316
--color-paper: #F6F3EC
--color-lime: #D8F34E
--color-pine: #0E3B2E
--color-tang: #FF6A2B
--color-grape: #7C5CFF
--color-mint: #1FB67C
--radius-12: 12px, --radius-18: 18px, --radius-24: 24px, --radius-32: 32px
```

### 2.2 Light (:root, globals.css:19-41)
```
--app: #F4F5F7 | --surface: #FFFFFF | --card: #FFFFFF | --card-2: #FAFAFB
--chip: #F0F1F3 | --brand: #E23744 | --green: #0C831F
--paper: #F4F5F7 | --paper-2: #EDEEF1
--ink: #111114 | --ink-2: #4E4E59 | --ink-3: #8C8C99
--line: rgba(17,17,20,0.08)
--glass: rgba(255,255,255,0.72) | --glass-strong: rgba(255,255,255,0.88) | --glass-tint: rgba(255,255,255,0.55)
--shadow-soft: 0 1px 2px rgba(20,19,24,.06), 0 8px 24px rgba(20,19,24,.08)
--shadow-float: 0 2px 6px rgba(20,19,24,.08), 0 18px 48px rgba(20,19,24,.14)
--shadow-hero: 0 4px 12px rgba(20,19,24,.1), 0 32px 80px rgba(20,19,24,.22)
--blur: 22px | color-scheme: light
```

### 2.3 Dark (.dark-scope, globals.css:43-64)
```
--app: #0E0E12 | --surface: #17171C | --card: #1A1A20 | --card-2: #202027
--chip: #26262E | --brand: #FF5C69 | --green: #35C759
--paper: #0E0E12 | --paper-2: #1A1A20
--ink: #F2F2F5 | --ink-2: #B4B4C0 | --ink-3: #82828F
--line: rgba(255,255,255,0.10)
--glass: rgba(28,27,34,0.66) | --glass-strong: rgba(32,31,40,0.86) | --glass-tint: rgba(255,255,255,0.06)
--shadow-soft: 0 1px 2px rgba(0,0,0,.4), 0 12px 32px rgba(0,0,0,.4)
--shadow-float: 0 2px 8px rgba(0,0,0,.5), 0 24px 64px rgba(0,0,0,.55)
--shadow-hero: 0 8px 24px rgba(0,0,0,.5), 0 40px 100px rgba(0,0,0,.6)
color-scheme: dark
```

RN: `tokens.color.light.*` + `tokens.color.dark.*`. Theme switch = `dark` boolean in osb-store → `Appearance`/`useColorScheme` + ThemeProvider. NEVER use pure black `#000` for dark bg — always `#0E0E12`.

## 3. Surfaces / Utilities (globals.css:77-127)

| Web class | Spec | RN replacement |
|---|---|---|
| `.glass` (:77-83) | bg var(--glass), blur 22px saturate(1.4), border 1px rgba(255,255,255,.5), shadow soft + inset 0 1px 0 rgba(255,255,255,.7) | `expo-blur BlurView intensity={22} tint="light"` + borderColor rgba(255,255,255,.5) borderWidth 1 + shadow tokens |
| `.dark-scope .glass` (:84-87) | border rgba(255,255,255,.11), inset rgba(255,255,255,.14) | same BlurView tint="dark", border .11 |
| `.glass-strong` (:89-95) | bg glass-strong, blur 28px saturate 1.5, border rgba(255,255,255,.6), shadow float + inset .8 | `intensity={28}` |
| `.dark glass-strong` (:96-99) | border .13, inset .16 | tint dark |
| `.hairline` (:101) | border 1px var(--line) | borderWidth 1, borderColor tokens.line |
| `.app-bg` (:109) | bg var(--app), color var(--ink) | root View bg |
| `.card` (:110-114) | bg var(--card), border var(--line), color ink | Card View radius per usage |
| `.chip` (:117) | bg var(--chip) | chip View |
| `.bg-brand` (:120) | bg var(--brand) | active pill bg |
| `.shadow-card` (:123) | shadow soft | Platform.select iOS shadow* / Android elevation 3 |
| `.grain::after` (:129-136) | SVG noise opacity .5 overlay blend, rect opacity .12 | SKIP on RN (no equivalent, visual only) |
| `.pressable` (:138-139) | transition transform .18s cubic-bezier(.34,1.56,.64,1), active scale .96 | Moti/Pressable scale .96, spring 500/28 |
| `.no-scrollbar` (:126-127) | hide scrollbar | `showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}` |

## 4. Micro Components (ui.tsx:7-130) — PIXEL SPECS

- **Glass** (ui.tsx:7-9): `rounded-[24px]` + glass/glass-strong. RN: BlurView + borderRadius 24.
- **Pill** (ui.tsx:11-20): inline-flex gap 4, `rounded-full px-2.5 (10px) py-1 (4px)`, text 11px bold tracking-tight, default bg rgba(20,19,24,.06). RN: paddingHorizontal 10, paddingVertical 4, fontSize 11, fontWeight 700.
- **Rating** (ui.tsx:23-31): `rounded-[8px] px-1.5 py-[3px]`, text 11.5px extrabold white. bg: `>=4.5 → #256F3A | >=4.0 → #3A833C | >=3.5 → #CD7F32 | else #8C8C8C`. Star size 10, fill currentColor, strokeWidth 0. Count suffix font-semibold opacity .8. RN: same hex, `<Star size={10} fill>` lucide-react-native.
- **SectionHead** (ui.tsx:33-43): container px-1 flex ends justify-between. Title 17px extrabold tracking-tight, light ? white : ink. Sub mt-1 (4px) 12px medium, white/70 or ink2. RN identical.
- **SpringBtn** (ui.tsx:45-51): whileTap .94, whileHover 1.015, spring stiffness 500 damping 28. RN: Moti `withSpring {damping:28, stiffness:500}` scale .94 on press.
- **AddStepper** (ui.tsx:54-80): qty 0 → ADD button: `rounded-[10px] border 1.5px #0C831F`, bg white, text #0C831F extrabold uppercase, shadow `0 4px 12px rgba(12,131,31,.18)`. small: h30 w72 text12 | default: h36 w88 text13. qty>0 → filled: bg #0C831F white, shadow `0 6px 16px rgba(12,131,31,.35)`, same h/w, inner px small 4 / default 6, minus/plus buttons h6 (24px) w6 text 18px black, qty text small 13 / default 14 extrabold tabular-nums min-w 16. RN: exact width/height, borderWidth 1.5.
- **Img** (ui.tsx:82-84): object-cover select-none, lazy except eager. RN: `expo-image` contentFit cover.
- **AreaGraph** (ui.tsx:86-105): default color #0E3B2E height 88, viewBox 300xH, gradient .35→0, polyline strokeWidth 2.6 round caps, animate pathLength 1.2s ease [0.22,1,0.36,1], dots r 2.4 (white fill) except second-last r 4.5 color fill, stroke 2. RN: react-native-svg identical.
- **Ring** (ui.tsx:107-122): default size 92, track stroke rgba(127,127,140,.18) width 9, progress #1FB67C width 9 round cap, rotate -90, animate 1.4s ease [0.22,1,0.36,1]. Center: pct font-display 22px bold ink, label 10px bold uppercase tracking-widest ink3. RN: Svg circle dasharray math same.
- **VegMark** (ui.tsx:124-130): 15x15 rounded 4 border 1.5 (veg #0C831F / nonveg #B71C1C) bg white, dot 7x7 round (veg) / triangle clip-path for nonveg (#B71C1C). RN: View 15x15 + inner View 7x7 (nonveg: triangle via border trick).

## 5. App Frame (page.tsx:57-94)

- Outer web only (RN me HATAO): ambient blobs (page.tsx:59-64), desktop side copy (:67-80), right rail (:150-166), "React Native mirrored" badge (:84-86), footer hints (:142-146).
- Phone container (page.tsx:83-87): `max-w-[430px]`, web `lg:h-[860px] lg:rounded-[46px] lg:ring-[10px] #1C1C22`, shadow `0 40px 120px rgba(0,0,0,.6)` ring white/15. RN: full-screen `SafeAreaView` bg tokens.app, no 430px cap (device width), no ring.
- Android status bar (page.tsx:90-94): px-6 pt-4 pb-1, time 12.5px extrabold tabular-nums (live clock, 20s interval), center notch (web lg only, 110x22 black pill — RN me HATAO, real notch use karo), right icons Signal 14 + Wifi 14 + Battery 16 opacity .8. RN: `expo-status-bar` + same row layout.
- Screen transition (page.tsx:99-104): opacity 0→1, y 14→0→-10, duration .28 ease [0.22,1,0.36,1], key = mode-tab. RN: Reanimated Fade+Slide same values.

## 6. Shell (shell.tsx) — SPECS

- **Splash** (shell.tsx:13-27): 2000ms timeout, absolute inset z-80, bg #E23744, bg image opacity .2, gradient `#E23744/70 → /85 → #7A0E1E`, logo 88x88 rounded 26 white text 44px shadow-2xl (spring 200/16, scale .6 rotate -10 → 1), title 30px extrabold white, sub 13px semibold white/80, progress bar h1.5 w-44 (176px) bg white/20, fill white scaleX 0→1 delay .3 duration 1.4. Exit opacity 0 scale 1.04. RN: same + expo-splash-screen.
- **Onboarding** (shell.tsx:29-102): z-70 app-bg, header px-5 pt-7 (logo 32x32 rounded-xl #E23744 16px + label 12px black uppercase tracking .18em ink2 + Skip chip px-4 py-1.5 12.5px extrabold). Collage grid-cols-2 gap 2.5 (10px): cards h172 rounded 24 (even rounded-tr 8, odd rounded-tl 8), shadow `0 16px 40px rgba(0,0,0,.14)`, gradient black/35→transparent, emoji badge bottom 2.5 left 2.5 h9 (36px) w9 rounded-xl bg-white/92 18px. Slide transition x 60 spring 200/26, card stagger .07 spring 180/18. Chips: brand-red bg #E23744/10 px-3 py-1.5 11px black. Title 26px extrabold leading 1.12 tracking-tight, sub max-w 320px 13.5px medium ink2. Dots: active w8 (32px) #E23744 / inactive w3 (12px) line color, h1.5. CTA: w-full rounded 16 #E23744 py-4 (16px) 15px extrabold white shadow `0 16px 40px rgba(226,55,68,.4)`, Continue + ArrowRight 18 / last "Enter the Bazar 🛍️". RN: FlatList horizontal paging + same.
- **BottomNav** (shell.tsx:104-144): container absolute bottom px-3 pb-4 (12px/16px) z-40 pointer-events-none. Cart strip (customer, count>0): mb-2 rounded 16 #0C831F p-2.5 pl-3 white shadow `0 16px 40px rgba(12,131,31,.45)`, avatars h9 w9 (36px) round border 2 white overlap -8px, label 13px extrabold `{count} items • ₹{total}`, sub 11px semibold white/75, CTA rounded 12 white px-4 py-2.5 12.5px black #0C831F. Bar: card flex justify-between px-1.5 py-1.5 (6px) rounded 22 shadow `0 12px 36px rgba(0,0,0,.18)` blur-xl. Item: flex-1 col gap .5 (2px) rounded 16 py-2 (8px). Active pill: absolute inset rounded 16 bg-brand spring 420/32 layoutId navpill. Icon 20 (active stroke 2.6 white / inactive 2 ink3), label 10px extrabold (white / ink3). Orders badge: absolute right-4 top-1 h4 (16px) min-w-4 rounded-full #E23744 px-1 9px black white. Variants: customer [home, cats, orders, saved, profile] | provider [dash, porders, catalog, khata, more] | admin [overview, profile] | rider [rides]. RN: expo-router Tabs custom tabBar, same sizes, `tabBarStyle {position absolute, borderRadius 22}`.
- **CartSheet** (shell.tsx:146-...): overlay bg-black/45 blur 2px z-50. Sheet: bottom, max-h 88%, rounded-t 26 app-bg, spring 240/30 y 90%→0. Handle: mx-auto h1.5 w12 rounded-full bg-black/15, pt-3 px-4 pb-10. Title 19px extrabold + count 12px bold ink3. Close: h9 w9 (36px) round chip X 17. Store card rounded 16 card shadow-card, header px-3 py-2.5 border-b line: name 13px extrabold, meta 10.5px bold ink3, delivery badge 10px black (FREE: bg #0C831F/12 text #0C831F / paid chip). Item row: thumb 54x54 rounded 12 bg #f2f2f2, name line-clamp-1 13px extrabold, meta 11px ink3, stepper border 1.5 #0C831F rounded 10 px-1 py-1, buttons h6 w6 (Minus/Plus 13 stroke 3 #0C831F), qty 13px black #0C831F. Bill card rounded 16 border card p-4 13px semibold, total row 15px extrabold dashed border-t black/10. RN: @gorhomit/bottom-sheet same radii.
- CheckoutSheet / SuccessOverlay (confetti 2.6s) / TrackingSheet (LiveMap + OTP) — shell.tsx:201-598, port same order me. Map: leaflet → react-native-maps (route polyline #0C831F).

## 7. Customer Home (customer.tsx:69-...) — SPECS

- Root: app-bg pb-40 (160px for BottomNav clearance).
- Sticky header (customer.tsx:72-98): surface blur-xl pb-2 (8px). Location row px-4 pt-3 (12px) gap 2.5: pin badge h9 w9 (36px) round bg #FFE9E9 17px; area 14.5px extrabold tracking-tight truncate max-w 150px + ChevronDown 15 stroke 2.8; address 11.5px medium ink3 truncate. Avatar 40x40 round gradient `#0E3B2E→#1FB67C` 17px black white. Dark toggle 40x40 round chip Sun/Moon 17.
- Search (customer.tsx:89-97): px-4 pt-2.5, button rounded 14 card px-3.5 py-3 (12px) shadow `0 2px 12px rgba(0,0,0,.06)`, Search 18 #E23744 stroke 2.6, placeholder 13.5px medium ink3 `Search "biryani", "A2 milk", "plumber"…`, divider h5 w-px bg-black/10, Mic 17 + ScanSearch 17 ink2. whileTap .98.
- Greeting (customer.tsx:101-107): px-4 pt-3 (12px), title 19px extrabold tracking-tight `{label}, {name} 👋`, sub 12px medium ink2 + `12 min` bold #0C831F, LIVE badge bg #0E3B2E px-2.5 py-1.5 10.5px extrabold #D8F34E gap-1, dot live-dot h1.5 w1.5 round emerald-400.
- Category grid (customer.tsx:110-151): px-4 pt-3, header 13px extrabold + Clear 11.5px extrabold brand-red. Grid cols-5 gap-x-2 gap-y-3 (8/12px). Cell 58x58 rounded 18 shadow `0 6px 16px rgba(0,0,0,.12)`, active outline 2.5px accent offset 2 + gradient accent CC, tick bottom-1 right-1 h4 w4 (16px) round white 9px black accent + tickPop .45s. Label 10.5px extrabold (active accent / ink2). See-all cell: chip 58x58 rounded 18 + inner h8 w8 (32px) round #E23744 white ChevronRight 16 stroke 3. Stagger delay i*.035 max .3, whileTap .9.
- Active-cat banner (customer.tsx:154-164): px-4 pt-3, rounded 16 p-3 (12px) bg accent 15% border accent 35%, thumb 44x44 rounded-xl, title 13.5px extrabold accent, sub 11.5px medium ink2, ETA pill 10.5px black white bg accent.
- Banner carousel (customer.tsx:167-206): pt-3, list px-4 gap 2.5 snap-x mandatory, card h148 w-88% rounded 20 snap-center whileTap .97. Overlay gradients per banner (black .78 / pine .85 / purple .8 → transparent). Tag w-fit rounded-md bg #D8F34E px-2 py-[3px] 10px black tracking-widest. Title font-display 24px bold leading 1.02 white. Sub 12px semibold white/80. CTA w-fit rounded-full white px-3.5 py-1.5 11.5px extrabold black. Dots: active w6 (24px) #0E3B2E / inactive w1.5 (6px) black/15, h1.5. Auto-advance 3800ms scrollTo smooth.
- CATS circles (customer.tsx:209-220): SectionHead + horizontal px-4 gap-3 (12px), cell w-68px: thumb 68x68 rounded 22 card shadow `0 6px 16px rgba(0,0,0,.08)`, label 11px extrabold. whileTap .9.
- (Aage: BlinkitCard 331-358, CategoryRails, ZomatoCard, SearchTab, OrdersTab, SavedTab, ProfileTab, StoreSheet 603-658 — same file se port karna, specs RN me verify.)

## 8. Animations (globals.css:144-173 → Reanimated)

| Web | Value | RN |
|---|---|---|
| shineMove | 5.5s ease-in-out infinite, translateX -70%→70% rotate 8deg, gradient 105deg transparent 42% / white .45 50% / transparent 58% | Reanimated sharedValue + withRepeat, LinearGradient overlay (SKIP if costly) |
| floaty | 5s ease-in-out, translateY 0→-10px rotate -2→2deg | withRepeat withTiming 2500 yoyo |
| floaty-slow | 7.5s same | 3750 yoyo |
| blobDrift | 14s alternate, translate 0,0 scale 1 → 18,-22px scale 1.08 | ambient bg blobs only (web), RN static blurred Views |
| marquee | 22s linear translateX 0→-50% | withRepeat withTiming 22000 linear |
| pulseRing | 2.2s ease-out scale .9→1.5 opacity .7→0 | withRepeat, tracking/live indicators |
| liveDot | 1.6s scale 1→.82 opacity 1→.55 | LIVE badge dot, withRepeat yoyo 800ms |
| confettiFall | 2.6s cubic(.2,.7,.3,1) translateY -20→420px rotate 540deg opacity 1→0 | SuccessOverlay confetti pieces |
| tickPop | .45s cubic(.34,1.8,.64,1) scale .4→1 | category active tick |
| pressable active | scale .96 (.18s .34,1.56,.64,1) | Pressable scale |
| SpringBtn | stiffness 500 damping 28, tap .94 hover 1.015 | withSpring same |
| NavPill | stiffness 420 damping 32 layoutId | withSpring same |
| Sheet | stiffness 240 damping 30 | bottom-sheet spring same |
| Screen | duration .28 [0.22,1,0.36,1] y14/opacity | Fade+Slide same |

## 9. RN Stack (final, Phase 2 me install)

Expo SDK 52+ managed + expo-router + NativeWind v4 + reanimated 3 + moti + lucide-react-native + expo-blur + expo-linear-gradient + expo-font + expo-splash-screen + react-native-maps + zustand + async-storage + expo-secure-store + expo-image + react-native-svg + bottom-sheet.

## 10. Pixel-Perfect Checklist (Phase 7)

- [ ] Har screen web 430px screenshot vs RN overlay, 0 diff (manual + pixelmatch)
- [ ] Light + dark dono
- [ ] AddStepper h30/w72 + h36/w88 exact
- [ ] Rating hex 4 thresholds exact
- [ ] BottomNav pill spring 420/32
- [ ] Splash 2000ms, Onboarding 4 slides
- [ ] Glass blur 22 / strong 28
- [ ] Shadows: iOS shadow* + Android elevation map (soft 3, float 8, hero 16)
- [ ] Fonts loaded (Fraunces + Jakarta), no fallback visible
- [ ] No web-only UI (desktop rails, notch pill, leaflet) in RN

## 11. File Map (agent reference)

`tokens.ts` ← globals.css:3-64 | `ThemeProvider` ← dark-scope:43-64 + osb-store dark | `ui.native` ← ui.tsx | `shell.native` ← shell.tsx | `customer.native` ← customer.tsx | `_layout` ← page.tsx:83-94 + layout.tsx fonts | maps ← live-map.tsx + leaflet → react-native-maps | store ← osb-store.ts + async-storage | api ← app/api/* fetch same baseUrl
