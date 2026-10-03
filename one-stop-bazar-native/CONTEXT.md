# One Stop Bazar - Full Development Context

## Project Overview
Expo/React Native mobile app (Bun + TypeScript) with Hono backend (Node/tsx).
- Native: `one-stop-bazar-native/`
- Backend: `one-stop-backend/`
- Dev backend: `10.0.2.2:8787` (NOT Render)
- `.env` points to dev backend

## Completed Work

### 1. Home Screen Rails Fix
- Fixed `canonicalProductKey` ReferenceError crash by inlining canonical logic in `osb-store.ts`
- Added `liveProducts`/`liveStores` self-heal (ignore remoteStores when remoteProducts empty)
- Removed dev diagnostics strip from `customer.tsx`
- Backend verified running — `/api/products` returns data

### 2. Free OSRM Maps System
- `src/lib/commerce.ts`: `getRoute()`, `straightDist()`, `distToEta()`, `geocodeAddress()`
- `src/lib/osb-store.ts`: `trackingOrderId`, `startTracking()`, `stopTracking()`, clear rider on delivered/cancelled
- `src/lib/osb-store.ts`: `SellerSettings` + `AccountSnap` got `storeLat`/`storeLng`/`trackingOrderId`
- `src/components/rider.tsx`: Auto-start GPS on order accepted/onway, distance throttle 15m/10s, background location
- `src/components/shell.tsx`: TrackingSheet with OSRM route polyline + live ETA
- `src/components/seller.tsx`: Provider pin-drop map in onboarding step 0
- `src/components/live-map.tsx`: Updated with OSM tiles
- Backend orders.ts: Already handles riderLat/riderLng/riderLastSeen
- `one-stop-backend/Dockerfile.osrm` + `render.yaml` for OSRM self-hosting

### 3. Map Tile Fix
- Added `UrlTile` with OSM tiles to all 4 MapViews
- Fixed hooks order in TrackingSheet (early return after hooks)

### 4. TypeScript
- Both sides `tsc --noEmit` green

## Map Migration (react-native-maps → @rnmapbox/maps) — DONE code, pending native rebuild
- react-native-maps REMOVED. Root cause of blank map: Android provider = Google Maps SDK, placeholder key `YOUR_GOOGLE_MAPS_API_KEY` → license fail → whole map blank (logcat: `E Google Maps Android API: API Key: YOUR_GOOGLE_MAPS_API_KEY`)
- Now: `@rnmapbox/maps` v10.3.5 (Mapbox Maps SDK v11) + free OSM raster tiles (`OSM_TILES` in commerce.ts) → zero Mapbox tile usage
- `src/components/map-osm.tsx` — shared `OsmMap` / `OsmLine` / `OsmPin` primitives; migrated: shell.tsx (TrackingSheet), seller.tsx (pin-drop, interactive + onMapPress), rider.tsx (RiderMap), live-map.tsx (LiveMap)
- Token: `EXPO_PUBLIC_MAPBOX_TOKEN` in `.env` (placeholder `pk_REPLACE_WITH_YOUR_FREE_MAPBOX_TOKEN`) — user must paste free token from account.mapbox.com; `Mapbox.setAccessToken` called in `src/app/_layout.tsx`
- `app.json`: `googleMaps.apiKey` config removed; `@rnmapbox/maps` plugin added (SDK 11.20.1 pinned)
- tsc green; expo-doctor: only pre-existing patch mismatches

## Current Issues
- User action needed: free Mapbox token in `.env` + native rebuild (`npx expo run:android`) — rnmapbox native module not in current dev client APK yet
- `npx expo lint` fails: eslint not installed locally (pre-existing)

## Key Architecture Notes
- OSBState: Zustand store with persist (AsyncStorage)
- Rider GPS: `watchPositionAsync` foreground + background, distance throttle
- Tracking: `trackingOrderId` in osb-store, auto-starts when order accepted/onway
- OSRM: Demo server `router.project-osrm.org` (free, rate-limited)
- Backend orders PATCH: accepts riderLat/riderLng/riderLastSeen, sends push on status change

## Important Files
- `src/lib/commerce.ts` — OSRM route + geocode functions + `OSM_TILES` URL template
- `src/lib/osb-store.ts` — canonical keys, tracking state, self-heal
- `src/components/map-osm.tsx` — shared OSM map primitives (OsmMap/OsmLine/OsmPin, rnmapbox)
- `src/components/rider.tsx` — GPS broadcast
- `src/components/shell.tsx` — TrackingSheet
- `src/components/seller.tsx` — provider pin-drop map
- `one-stop-backend/routes/orders.ts` — status change triggers

## Next Steps
1. Verify on emulator: reload app → tracking sheet tiles visible; also seller onboarding pin-drop map
2. Test full tracking flow: order accept → GPS → customer sees location + ETA
3. Test pin-drop map saves storeLat/storeLng
4. Test delivery clears rider location
5. Verify backend orders.ts patch works
6. Test OSRM Docker self-host