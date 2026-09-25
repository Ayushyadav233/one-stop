# One Stop Backend (Hono + Drizzle + Neon)

Contract rule: purane 6 endpoints ka request/response same hai —
app me 1 line nahi badlegi, sirf `EXPO_PUBLIC_API_URL` naye backend ki taraf point karo.

## Run

```bash
npm install
npm run db:push   # Neon tables banao
npm run dev       # :8787
```

## Verify

```bash
curl localhost:8787/api/health
curl -X POST localhost:8787/api/seed
curl localhost:8787/api/stores
curl localhost:8787/api/products
curl localhost:8787/api/orders
```

## Auth (mock, paisa-bachao)

- `POST /api/auth/request-otp {phone}` -> `{ok, otp}` (dev me otp wapas milta hai)
- `POST /api/auth/verify-otp {phone, otp, name?}` -> `{ok, token, user}`
- Aage `Authorization: Bearer <token>` header bhejo. App me SecureStore use karo.
- SMS provider hook: `src/routes/auth.ts > sendSms()` me MSG91/Twilio plug hoga.

## App URL swap

- Web: `.env.local` me `NEXT_PUBLIC_API_URL`? (Next routes abhi bhi kaam karenge)
- Native: `EXPO_PUBLIC_API_URL=http://<LAN-IP>:8787` (emulator: `http://10.0.2.2:8787`)
