# One Stop Bazar — EAS Build + Release Checklist

> App: `one-stop-bazar-native` (Expo SDK 57) • package `com.onestopbazar.app` • version 1.0.0 (versionCode 1)

## 0) One-time setup

```sh
cd one-stop-bazar-native
npx eas-cli@latest login          # Expo account (creates it if needed)
npx eas-cli@latest build:configure # already done (eas.json exists) — skip if prompted
```

## 1) Google Maps API key (REQUIRED before release build)

`app.json → android.config.google.maps.apiKey` is still `YOUR_GOOGLE_MAPS_API_KEY`.
Without it, maps render blank on Android release builds.

1. Google Cloud Console → enable **Maps SDK for Android** (+ iOS if needed)
2. Create API key, restrict to Android apps with SHA-1 from your keystore
3. Put the key in `app.json` and bump `versionCode` for every Play release

## 2) API base URL (optional, offline-first already works)

```sh
# Dev machine LAN IP so the phone reaches your Next.js backend:
$env:EXPO_PUBLIC_API_URL="http://192.168.1.5:3000"; npx expo start
```

Without it the app uses the emulator default `http://10.0.2.2:3000` and
falls back to local store data when unreachable (seed + 6s order poll in shell.tsx).

## 3) Builds

```sh
npx eas-cli@latest build --profile development --platform android  # dev client (native modules)
npx eas-cli@latest build --profile preview --platform android      # shareable APK for testers
npx eas-cli@latest build --profile production --platform android   # .aab for Play Store
```

APK install on device for quick testing; `.aab` → Play Console → internal track
(eas.json submit already targets `internal`).

## 4) Play Store assets checklist

- [ ] App icon 512×512 (from `assets/icon.png`, brand #E23744 bg)
- [ ] Feature graphic 1024×500 (Diwali/festive banner style)
- [ ] 2–8 phone screenshots (use pixel-check screens below, 1080×2400)
- [ ] Privacy policy URL (location + phone data) — required (location permission)
- [ ] Data safety form: location (delivery), phone (OTP login), no ad tracking
- [ ] Target audience + content rating questionnaire
- [ ] Internal track → QA → production rollout

## 5) Pixel-perfect check (needs a real device, ~30 min)

Web reference: run the Next.js app, set browser width to 430px, screenshot each screen.
RN: `npx expo start` → Expo Go → same screens, screenshot.

| # | Route / action | Compare with web |
|---|---|---|
| 1 | Boot → Splash (2s) | Splash logo/title/bar |
| 2 | Onboarding 4 slides | Collage, chips, dots, CTA |
| 3 | AuthGate → main home | Header, greeting, grid, banners |
| 4 | `/ui-test` (light + dark) | Glass, Rating, AddStepper, Ring, VegMark |
| 5 | StoreSheet (tap any store) | Hero, chips, menu rows |
| 6 | CartSheet (add item → cart strip → sheet) | Groups, bill, CTA |
| 7 | CheckoutSheet → place order → SuccessOverlay | Cards, confetti, order ID |
| 8 | Orders tab → Track → TrackingSheet | Map, OTP, timeline, bill |
| 9 | Saved / Profile / Categories tabs | Grids, wallet, rows |
| 10 | Provider mode (Profile → Become Provider → onboard → dash/catalog/marketing/khata) | All seller screens |
| 11 | Rider + Admin modes | Panels |
| 12 | Dark mode full pass (toggle in header/Profile) | Every screen above, dark tokens |

Overlay web vs RN screenshots at 430px width — rest-state pixels must match
(design.md §10). Known accepted deltas: sheet/slide exits, navpill slide,
hover states, grain overlay, upload pickers.

## 6) 60fps sanity

- Lists already use `showsVerticalScrollIndicator={false}`; entering animations are mount-only.
- If CategoryRails stutters on low-end devices: convert rails to `FlatList` (Phase 7 follow-up, needs device testing).
- Reanimated worklets run on UI thread — cart/badges stay smooth during scroll.
