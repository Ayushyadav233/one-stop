# HANDOFF — One Stop Bazar (restart se pehle save: 2026-09-26, round-2)

> Nayi chat me sabse pehle YE FILE padho, phir §RESUME se kaam shuru karo. Koi purana context yaad nahi rahega.

## Paths
- Web app (Next): `C:\Users\ayush\Downloads\one-stop-bazar-app-development` (root, `src/app/api/*` = purane 6 routes)
- Backend (Hono+Drizzle+Neon): `...\one-stop-bazar-app-development\one-stop-backend` (detail: waha `HANDOFF_RESUME.md` bhi hai)
- Native app (Expo SDK 57): `...\one-stop-bazar-app-development\one-stop-bazar-native`
- Phase-2 plan: project root `PHASE2_PLAN.md` (padho — P1/P2/P3 detail)
- Lock backup: `C:\Users\ayush\AppData\Local\Temp\opencode\package-lock.json.bak` (Temp restart pe rehta hai)

## DONE ✅
1. **Backend live on Render:** `https://one-stop-hvh8.onrender.com` — health/stores/seed/orders/coupons sab verified. Push: `https://github.com/Ayushyadav233/one-stop.git` (master).
2. **APK green (purana):** build `7ca4465b` → `https://expo.dev/artifacts/eas/qPM9d1N1v1PUISQByzTHuYBFxzlItYZSSh4GvbSjmGI.apk` (backend-OTP login wala).
3. **P1 SMS code live:** `sendSms()` MSG91 plug + rate-limit (60s cooldown, 3/10min) + OTP-hide (`OTP_DEV_MODE=false` pe). Render pe abhi `OTP_DEV_MODE` default true hai (APK safe). MSG91 keys aayi nahi — Firebase direction me shift ho gaye.
4. **Phase-2 backend (`c69c73f`, Render live ✅):** `POST /api/auth/firebase` (firebase-admin 14.5.0, projectId-only verify), `osb_push_tokens` table + register/delete endpoints, order-status push hooks (accepted/ready/onway/delivered, fail-soft, Expo Push API). Verify kiya: firebase 503→(env ke baad)401, push register/delete ok, order PATCH ok.
5. **Phase-2 app (`4093bd6` + `2ccd767`, pushed, tsc+doctor 21/21 ✅):** packages (rn-firebase/app+auth v26 modular API, notifications, device, updates), `FIREBASE_AUTH_ENABLED=true`, login Firebase path + push register, `catalog.ts` adapter + liveStores/liveProducts wiring + boot sync, EAS Update config (channel preview). `connect@3.7.0` devDep (css-interop upstream bug fix).
6. **Firebase project (user ne kiya):** `rudra-omniverse`, `google-services.json` verify+commit (package `com.onestopbazar.app` ✅), Phone provider enabled + test numbers, FCM V1 enabled, Render `FIREBASE_PROJECT_ID=rudra-omniverse` set (verify: firebase endpoint ab 401 deta hai, 503 nahi).
7. **EAS builds (2026-09-26, round-3):** `6b40b608` ERRORED in INSTALL (`npm ci` out-of-sync, 94 missing: metro-0.87/babel-7.29/react-dom-19.3 stack). Root cause: floating `*` peers (`react-native-worklets→@react-native/metro-config:*`, `expo/expo-router→react-dom:*`) resolve differently per platform → lock mismatched on EAS-Linux. FIXED in `4153d67`: exact-pinned devDeps `@babel/core 7.29.7` + `@react-native/metro-config 0.86.3` + `react-dom 19.2.3` (tree deduped 1433→935 pkgs, `npm ci --include=dev` exit 0, tsc+doctor 21/21). NOTE: `overrides` does NOT force skipped peers in — direct devDep pin is what works. Next build `18885adb` ERRORED in PREBUILD (missing `android.googleServicesFile` in app.json). FIXED in `850798f` (points to `./google-services.json`, local prebuild verified OK). **Current build `d25e6d9e` (commit `850798f`) FINISHED 1:01 PM. APK: `https://expo.dev/artifacts/eas/aAdi6rSCpsORozAUmUfsb_IElF6glQW4tGoJKSl-u5s.apk` (firebase+push, Maps SKIP). PENDING: device test (Firebase login + push) → `OTP_DEV_MODE=false`.** Maps key SKIP (map blank rahega is build me).

## IN-PROGRESS ⏳ / REMAINING (restart ke baad YAHI)
1. **Build `d25e6d9e` FINISHED → APK ready (link §DONE-7 me):** device pe install → Firebase test-number login → order accept → push aaya? → PASS hua to Render pe `OTP_DEV_MODE=false` karo. → APK download → Firebase login test (whitelisted test number + `123456`) → push test (order accept karke dekho) → PASS hua to Render pe `OTP_DEV_MODE=false` karo (tabhi prod OTP-hide on hoga).
2. **CONFIRMED (user ne kiya):** FCM service-account JSON expo.dev Credentials me upload ho gaya → push delivery ready.
3. **Baad me (deferred, explicitly):** Maps API key + rebuild #2 (user ne skip bola); coupons backend-merge (static 4 chal rahe); `eas channel:create preview` (OTA future ke liye); MSG91 fallback (dormant code, zaroorat nahi); Play assets checklist (`docs-build.md` §4-6).

## §RESUME (exact order)
1. `npx eas-cli@latest build:list` (one-stop-bazar-native dir se) → `d25e6d9e` status dekho.
2. Finished → `Application Archive URL` se APK download → device pe install → Firebase test-number login → order accept → push aaya?
3. Sab pass → Render dashboard → `OTP_DEV_MODE=false` add karo (prod OTP-hide on).
4. User se pucho: (a) expo.dev credentials me FCM service-account upload hua? (b) Maps key kab dega (rebuild #2 ke liye)?

## Credentials / secrets (file me NAHI likhe)
- Neon DATABASE_URL: sirf `one-stop-backend\.env` + Render env. Firebase projectId `rudra-omniverse` public hai (google-services.json committed — standard practice).
- Service-account JSON (push) SECRET hai — user khud expo.dev me upload karega, chat/file me kabhi mat mangna.
