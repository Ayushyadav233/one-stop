# Handoff — one-stop-backend (Hono + Drizzle + Neon)

> Date: 2026-09-25. Backend live-verified. Is file ko padh ke §Resume se kaam shuru karo.

## Location
- Backend: `C:\Users\ayush\Downloads\one-stop-bazar-app-development\one-stop-backend`
- Web app (purane 6 Next routes): `C:\Users\ayush\Downloads\one-stop-bazar-app-development\src\app\api`
- Native app: `C:\Users\ayush\Downloads\one-stop-bazar-app-development\one-stop-bazar-native`

## Status: DONE + VERIFIED (Neon)
- `GET /api/health` -> `{ok:true}`
- `POST /api/seed` -> `{ok:true, seeded:true, stores:28, products:48}` (idempotent; dubara `seeded:false`)
- `GET /api/stores` -> 28 rows, `source=db`
- `GET /api/products` -> 48 rows, `source=db`
- `GET /api/orders` -> ok (test order ke baad 1+)
- Auth: `POST /api/auth/request-otp` -> otp; `POST /api/auth/verify-otp` -> token+user; `000000` rejected; `GET /api/users/me` Bearer se ok
- Order create -> `{id, code, status:new}`; `PATCH /api/orders/:id` -> status+rider update ok
- `GET /api/coupons` -> 4 seeded; `GET /api/khata/parties` (auth) -> ok

## Neon note (IMPORTANT)
- DB me purane session ki alag-schema tables mili thi (osb_users bina token, osb_reviews/khata/seller/category alag columns). Sab empty thi (0 rows) -> drop karke naya schema lagaya.
- Extra table `osb_sessions` purani hai, empty, harmless — rakhi hai, kuch todti nahi.
- `osb_products` me extra columns (store_key, images, hidden) purane hain — rakhe hain, contract pe asar nahi.
- `.env` me DATABASE_URL set hai. `.env.example` me template hai.

## Contract rule
- Purane 6 endpoints (`/api/health /api/orders /api/orders/:id /api/products /api/stores /api/seed`) ka request/response web-route jaisa hi hai.
- App me 1 line nahi badlegi — sirf base URL point karo:
  - Native: `EXPO_PUBLIC_API_URL=http://<LAN-IP>:8787` (emulator: `http://10.0.2.2:8787`)
  - Native client `one-stop-bazar-native/src/lib/api.ts` already fail-soft hai.
- Dev me server: `npm run dev` (:8787). Background PowerShell job session ke baad nahi tikta — har verify ek hi command me (start job + poll + curl + stop) karo.

## §Resume (agli chat me seedha yahi)
1. `HANDOFF_RESUME.md` padho (ye file).
2. `npm run dev` se server uthao, `curl localhost:8787/api/health` check karo.
3. Bacha kaam: app URL swap + device/emulator se end-to-end test + APK rebuild note.
4. Baad ke hooks: `src/routes/auth.ts > sendSms()` (MSG91/Twilio), image upload, push, payment verify — abhi mock/stub.
