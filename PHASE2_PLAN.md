# PHASE-2 PLAN — One Stop Bazar (catalog + SMS + push)

> Status 2026-09-26: CODE COMPLETE + PUSHED (backend Render live, app `2ccd767`).
> EAS build `6b40b608` TRIGGERED (in-progress, firebase+push, Maps SKIP).
> Baaki: build finish → device test → OTP_DEV_MODE=false → (later) maps key + rebuild #2.
> Firebase project: rudra-omniverse. DETAILED build/test steps HANDOFF_RESUME.md §RESUME me.

## 0. Ground truth (verify kiya hua)

- App catalog static hai: `one-stop-bazar-native/src/lib/data.ts` (`STORES`/`PRODUCTS`, string ids jaise `"meghana"`). Cart/orders/wishlist/co quotes (`commerce.ts`, `osb-store.ts`) inhi string-ids pe keyed hain.
- Backend catalog UUID-based hai: `osb_stores` (28) / `osb_products` (48) / `osb_coupons` (4). **Bridge already exists:** backend stores me `slug` field hai (`"slug":"meghana"` = app static id). Products `store_id` (UUID) se linked hain.
- OTP flow complete hai except SMS: `backend/src/routes/auth.ts` — request/verify, 5-min expiry, consumed-flag, `000000` reject. `sendSms()` line 13 **no-op mock**.
- Push zero hai: `expo-notifications` / `expo-updates` installed nahi, EAS Update config nahi (no channel/runtimeVersion), backend me push-token table nahi.

## P1 — SMS OTP (sabse chhota, backend-only, real users unlock)

**Kya karna:**
1. `sendSms()` me MSG91 (India-first, sasta ~₹0.15/SMS) plug karo; Twilio fallback option.
2. **Security fix (mandatory, SMS ke saath):** `/request-otp` abhi OTP response body me wapas bhejta hai (`{ok, otp}`) — prod me band karo (sirf `ok:true`), warna SMS ka matlab zero.
3. **Rate-limit (mandatory, cost-bachao):** abhi koi limit nahi — SMS bombing = bill shock. Rule: same phone pe max 3 OTP / 10 min + OTP resend cooldown 60s.
4. Render env: `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_OTP_TEMPLATE_ID`, `OTP_DEV_MODE=false`.

**User se chahiye (India-specific):**
- MSG91 account + API key. **DLT registration mandatory** (sender ID + template DLT pe approve hona chahiye, bina iske SMS nahi jayega) — isme 2-5 din lag sakte hain, isliye P1 pehle start karo.
- Test ke liye 1 real phone number.

**Ship:** sirf Render redeploy (backend-only). App me ZERO change (already `apiVerifyOtp` use karta hai). APK rebuild NAHI chahiye.
**Verify:** real phone pe OTP aaye → verify → token mile; `000000` reject; 4th request 10-min window me 429.

## P2 — Catalog wiring (sabse bada, cart/orders touch hoga)

**Design (deliberate, offline-first rakho):**
1. Naya adapter `one-stop-bazar-native/src/lib/catalog.ts`:
   - `GET /api/stores` + `GET /api/products` fetch karo (existing `api.ts` `json()` helper + Bearer).
   - **Mapping:** backend `slug` → app static `id` (same string!). UUID kahin store mat karo UI layer me — `slugToUuid` / `uuidToSlug` maps sirf adapter ke andar.
   - Backend product → app `Product` type me convert (price numeric→number, `images[0]`→image, defaults: `stock: 99`, `unit`, `tint`, `eta`).
   - **Fail-soft:** offline / backend down → static `data.ts` catalog (aaj ka behavior, 100% same).
2. Order submit (`shell.tsx:819` + `apiPatchOrder`) me: cart ki slug-ids ko UUID me convert karke backend ko bhejo (`store_id`, `product_id`). Backend orders abhi kya expect karta hai ye `osb_orders` schema + `orders.ts` route se confirm karke likhna.
3. Coupons: `GET /api/coupons` (4 seeded) → static `COUPONS` se merge (backend first, static fallback).

**Ship:** JS-only change → **`eas update` (OTA)** se ja sakta hai, rebuild NAHI (lekin OTA ke liye EAS Update setup chahiye — dekho §4).
**Verify:** airplane-mode me static catalog; online me backend catalog (28 stores); order backend me UUIDs ke saath save; purani wishlist/cart crash na ho (slug keys same).
**Risk:** backend products me `hidden`/`images` extra cols hain (contract-safe, ignore karo). Price `numeric` type hai — `Number()` conversion mat bhulo.

## P3 — Push notifications (native change = rebuild pakka)

**Kya karna:**
1. `npx expo install expo-notifications expo-device expo-constants` (SDK 57 compatible versions).
2. App: permission prompt (login ke baad, pehli screen pe nahi) → ExpoPushToken lo → `POST /api/push-tokens` (naya endpoint) pe bhejo (user token ke saath).
3. Backend: nayi table `osb_push_tokens` (id uuid, user_id → osb_users, token text unique, platform, created_at) + `POST /api/push-tokens` (upsert) + `DELETE` (logout pe) + send helper (Expo Push API `https://exp.host/--/api/v2/push/send`, ticket/receipt handling).
4. Trigger points (phase-2 scope): order accepted / onway / delivered → seller/rider action pe backend se push. Marketing push phase-3.
5. **Rebuild batch karo (time bachao):** push + Google Maps API key (`YOUR_GOOGLE_MAPS_API_KEY` abhi placeholder) EK HI EAS build me — do alag builds mat karo.

**User se chahiye:** Firebase project (FCM server key — free, 10 min ka kaam); iOS ke liye APNs key (abhi Android-only preview hai to defer kar sakte ho).
**Ship:** EAS preview rebuild MANDATORY (native module). `app.json` me `expo-notifications` plugin + iconColor/badge config.
**Verify:** do devices (customer + rider) → order accept pe customer ko push aaye; token logout pe delete ho.

## Order & batching (recommended)

| Step | Kaam | Ship | User input |
|---|---|---|---|
| 1 | P1 SMS (code + rate-limit + otp-hide) | Render redeploy | MSG91 key + DLT (2-5 din lagte hain — AAJ start karo) |
| 2 | P2 catalog adapter + order UUID mapping | `eas update` OTA (setup §4) ya preview rebuild | koi key nahi |
| 3 | P3 push + Maps key, EK build me | EAS rebuild (1 baar) | FCM key |
| 4 | §4 EAS Update setup (OTA future ke liye) | config + 1 update | — |

P1 aur P2 independent hain (parallel ho sakte hain). P3 rebuild akela hai — Maps key ke saath batch karo.

## §4 EAS Update setup (P2 OTA ke liye pre-req, 15 min)

1. `npx expo install expo-updates`; `app.json` me `"runtimeVersion": {"policy": "appVersion"}` + `"updates": {"url": "https://u.expo.dev/<projectId>"}`.
2. `eas.json` me `"preview": { ..., "channel": "preview" }`.
3. `npx eas-cli@latest channel:create preview` + `npx eas-cli@latest update --channel preview --message "..."`.
4. Note: JS-only changes hi OTA hote hain (P2 ok). Native changes (P3, Maps key) = rebuild.

## Costs (approx, India)

- MSG91: ~₹0.15–0.20/SMS + DLT (free, time lagta hai). Twilio: ~₹0.60/SMS (backup).
- FCM push: free. EAS: free tier (build queue slow). Render free: cold-start lag (OTP API pe mehsoos hoga — prod me Starter $7/mo sochna).

## Agla step (green-light milte hi)

`P1 start karo` bolte hi: (1) MSG91 vs Twilio confirm (key/DLT status pucho), (2) `auth.ts` me rate-limit + otp-hide + sendSms plug, (3) Render env + redeploy, (4) real-phone verify.
