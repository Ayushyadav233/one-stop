This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
 - Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
 - Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Project: One Stop Bazar

### Stack
- Expo React Native (Bun + TypeScript)
- Hono backend (Node/tsx) on :8787 (dev), Render (prod)
- Zustand store (`src/lib/osb-store.ts`) with AsyncStorage persist
- `@rnmapbox/maps` v10 (Mapbox Maps SDK) rendering free OSM raster tiles — `EXPO_PUBLIC_MAPBOX_TOKEN` in `.env` (free tier, zero Mapbox tile usage since only OSM raster)
- react-native-maps REMOVED (its Google provider required a valid Google API key → blank maps on Android)
- OSRM demo server `router.project-osrm.org` for routing

### Maps & Driver Tracking
- `src/lib/commerce.ts`: `getRoute(fromLat,fromLng,toLat,toLng)`, `straightDist()`, `distToEta()`, `geocodeAddress()`
- `src/lib/osb-store.ts`: `trackingOrderId`, `startTracking()`, `stopTracking()`, clear rider on delivered/cancelled; `SellerSettings` has `storeLat`/`storeLng`
- `src/components/rider.tsx`: Auto-start GPS on order accepted/onway, distance throttle 15m/10s, background location via watchPositionAsync
- `src/components/shell.tsx`: TrackingSheet with OSRM route polyline + live ETA; hooks MUST come before early return
- `src/components/seller.tsx`: Pin-drop map in onboarding step 0
- `src/components/live-map.tsx`: LiveMap component with OSM tiles
- Backend orders.ts PATCH: accepts riderLat/riderLng/riderLastSeen, sends push on status change

### Key Fixes Applied
- `canonicalProductKey` ReferenceError: inlined canonical logic in osb-store.ts
- Live products self-heal: ignore remoteStores when remoteProducts empty
- Dev diagnostics strip removed from customer.tsx
- TrackingSheet hooks order: all hooks before `if (!id || !o) return null`

### Maps (rnmapbox + OSM raster)
- Shared primitives in `src/components/map-osm.tsx`: `OsmMap` (MapView + OSM RasterSource + Camera fit/center), `OsmLine` (ShapeSource LineString + LineLayer), `OsmPin` (MarkerView). All map screens use these.
- `OSM_TILES` URL template lives in `src/lib/commerce.ts` (only `{z}/{x}/{y}` placeholders allowed).
- Mapbox `lineDasharray` units are LINE-WIDTHS not px (e.g. `[1.5, 1.5]` ≈ 6px dashes at width 4).
- Coordinates are `[lng, lat]` tuples in rnmapbox (NOT `{latitude, longitude}` objects).
- Mapbox access token: `EXPO_PUBLIC_MAPBOX_TOKEN` in `.env`, set via `Mapbox.setAccessToken` in `src/app/_layout.tsx`.

### Important Notes
- Dev backend: `EXPO_PUBLIC_API_URL=http://10.0.2.2:8787` (NOT Render)
- No Google Maps dependency anymore — react-native-maps removed (placeholder Google key made Android map blank)
- OSRM demo server is free but rate-limited; self-host via Dockerfile.osrm + render.yaml
- `npx tsc --noEmit` must be green before declaring done
