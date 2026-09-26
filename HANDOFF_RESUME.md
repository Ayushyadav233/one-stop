# HANDOFF — One Stop Bazar (restart se pehle save: 2026-09-25)

> Nayi chat me sabse pehle YE FILE padho, phir §RESUME se kaam shuru karo. Koi purana context yaad nahi rahega.

## Paths
- Web app (Next): `C:\Users\ayush\Downloads\one-stop-bazar-app-development` (root, `src/app/api/*` = purane 6 routes)
- Backend (Hono+Drizzle+Neon): `...\one-stop-bazar-app-development\one-stop-backend` (detail: waha `HANDOFF_RESUME.md` bhi hai)
- Native app (Expo SDK 57): `...\one-stop-bazar-app-development\one-stop-bazar-native`
- Lock backup: `C:\Users\ayush\AppData\Local\Temp\opencode\package-lock.json.bak` (Temp restart pe rehta hai)

## DONE ✅ (updated: 2026-09-26)
1. **Backend live + verified on Render:** `https://one-stop-hvh8.onrender.com`
   - `GET /api/health` → `{ok:true}` ✅
   - `GET /api/stores` → 28 stores, `source:"db"` ✅
   - `POST /api/seed` → idempotent (already seeded) ✅
   - Push: `https://github.com/Ayushyadav233/one-stop.git` (master branch) ✅
2. **EAS preview APK build GREEN ✅:** build `7ca4465b` finished → APK: `https://expo.dev/artifacts/eas/qPM9d1N1v1PUISQByzTHuYBFxzlItYZSSh4GvbSjmGI.apk`
   - Root cause tha `npm ci` fail (package-lock upload me jata hi nahi tha — `.gitignore` me tha) → fix: `.gitignore` clean + `.easignore` (lock upload-exclude) + `.nvmrc` node 24.21.0 + EAS Preview env `EXPO_PUBLIC_API_URL`.
3. **App fixes (APK-blockers):** `osb-store.ts` ke 6 relative `fetch("/api/orders/…")` → `apiPatchOrder()` (API_BASE+Bearer); login backend OTP fail-soft + token `osb-token`+memory; boot pe token restore (`shell.tsx`); `api.ts` me token/auth helpers. `tsc` pass (ESLint project me installed nahi — pre-existing).
4. **Catalog decision (deliberate):** products/stores/coupons backend-fetch WIRE NAHI kiya — backend UUIDs vs app static string-ids mismatch tootega (cart/orders/wishlist). Static catalog = offline-first solid. Phase-2 ka kaam.

## IN-PROGRESS ⏳ (abhi yahi karna)
**Phase-2 code COMPLETE (backend live, app pushed, rebuild PENDING):**
- Backend (`c69c73f`, Render live ✅): `POST /api/auth/firebase` (503 until FIREBASE_PROJECT_ID set), `osb_push_tokens` table + register/delete endpoints, order-status push hooks (accepted/ready/onway/delivered, fail-soft), P1 SMS (MSG91 plug + rate-limit + OTP-hide) live.
- App (`4093bd6`, pushed, tsc+doctor 21/21 ✅): firebase/auth/notifications/device/updates packages, `FIREBASE_AUTH_ENABLED=false` (flag-flip when google-services.json lands), login Firebase path + push register, catalog.ts adapter + liveStores/liveProducts wiring + boot sync, EAS Update config (channel preview).
- **REBUILD GATED on user:** google-services.json + Maps API key (+ FCM key for prod push). Single batched EAS build, THEN flip `FIREBASE_AUTH_ENABLED=true` + Render `FIREBASE_PROJECT_ID` + `OTP_DEV_MODE=false`.
- Render deploy: ✅ **COMPLETE** → `https://one-stop-hvh8.onrender.com`

## §RESUME (exact order)
1. `Test-Path one-stop-bazar-native\package-lock.json` → False hona chahiye (hataya tha). Truth hai to step 3. ✅ Verified
2. **Render deploy: DONE** → `https://one-stop-hvh8.onrender.com` ✅
3. Build karo (API_URL naya render URL):
   ```powershell
   cd one-stop-bazar-native
   $env:EXPO_PUBLIC_API_URL="https://one-stop-hvh8.onrender.com"
   npx eas-cli@latest build --profile preview --platform android
   ```
4. Green build ke baad local lock wapas banao: `npm install` (native folder me) + `npx expo-doctor` + `npx tsc --noEmit`. (node_modules me kuch long-path leftovers the — future me `npx -y rimraf` dikkat de to batana.)
5. Baaki pending (APK ke baad): Google Maps API key (`YOUR_GOOGLE_MAPS_API_KEY` abhi placeholder — release me map blank), Play assets checklist (`one-stop-bazar-native\docs-build.md` §4-6), phase-2 wiring (catalog id-mapping, SMS hook `backend/src/routes/auth.ts>sendSms`, image upload, push, payment verify).

## Credentials / secrets (file me NAHI likhe)
- Neon DATABASE_URL: sirf `one-stop-backend\.env` me. Render env me user khud dalega. Chat me dobara mat mangna jab tak zaroori na ho.
