# HANDOFF — Wallet + Referral + Coupon Guardrails
Continue from here. Both sides `tsc` was green at last check (re-run after edits).

## RULES AGREED
- 10 pts = ₹1. 1 successful refer = referrer 100 pts (₹10), referee 50 pts (₹5) welcome.
- Coupons: seller-funded = dukandaar ka kharcha. Platform = campaign (budget + expiry + kill-switch).
- "Hamesha de rhe ho" bandh — fail-closed: no internet / no server proof = zero discount.
- BAZAR50 = first-order-only platform campaign (60d expiry, 1000 uses, ₹50k budget).

## DONE — FINAL FILE STATES

### 1) one-stop-backend/src/db/schema.ts
Users + wallet/referral columns + new tables + coupons guardrail columns + orders.couponCode + walletUsed.
(See current file — all edits applied and tsc green.)

### 2) one-stop-backend/src/lib/coupons.ts  (NEW)
```ts
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { coupons, couponUses, orders } from "../db/schema.js";

export type CouponRow = typeof coupons.$inferSelect;

export function couponDiscount(cp: CouponRow, subtotal: number): number {
  const d = Math.min(Math.round((subtotal * Number(cp.offPct ?? 0)) / 100), Number(cp.maxOff ?? 0), subtotal);
  return Math.max(0, d);
}
function inWindow(cp: CouponRow, now = Date.now()): boolean {
  if (cp.startsAt && new Date(cp.startsAt).getTime() > now) return false;
  if (cp.expiresAt && new Date(cp.expiresAt).getTime() < now) return false;
  return true;
}
async function userUseCount(userId: string, couponId: string): Promise<number> { /* best-effort count */ }
async function userOrderCount(phone: string): Promise<number> { /* best-effort count */ }

export async function checkCoupon(code: string, subtotal: number, user: { id: string; phone: string }, opts?: { storeKey?: string }) {
  /* returns { ok:true, coupon, discount } or { ok:false, error } */
}
export async function consumeCoupon(cp: CouponRow, userId: string, orderCode: string, discount: number) { /* ledger + counters */ }
export async function createSellerCoupon(ownerStoreKey: string, input) { /* seller-funded */ }
export async function sellerCouponsByStore(storeKey: string) { /* live seller coupons */ }
```

### 3) one-stop-backend/src/routes/coupons.ts  (REWRITTEN)
- GET / → live only (active + window + budget + seller-scope). ?storeKey= for seller offers.
- POST / (auth) → platform campaign with all guard fields.
- PATCH /:id (auth) → kill-switch + limit edits.
- DELETE /:id (auth).
- POST /validate (auth mandatory) → full guard check via checkCoupon().

### 4) one-stop-backend/src/routes/orders.ts
POST now: couponCode + walletUsed + extraDiscount in payload. Coupon verified server-side before accepting; wallet ledger verified; firstOrderOnly, per-user, budget, store-scope all checked. `coupon_code` + `wallet_used` saved on order.

### 5) one-stop-backend/src/routes/seller.ts
GET/POST/PATCH/DELETE /coupons — ownership check (sellerStores.ownerId), code clash check, fundedBy=seller.

### 6) one-stop-backend/src/routes/wallet.ts  (NEW)
GET /me, POST /redeem, GET /referrals/me, POST /referrals/apply. All fail-soft (migration pending → empty state, no crash).

### 7) one-stop-backend/src/routes/auth.ts
Signup (OTP + Firebase) → ensureCodeFor + applySignupReferral. Login → ensureCodeFor if missing.

### 8) one-stop-backend/src/routes/users.ts
publicUser adds walletPoints, referralCode, referredBy.

### 9) one-stop-backend/src/index.ts
Mount /api/wallet.

### 10) SQL migrations (run on Neon console)
- `one-stop-backend/drizzle/0011_wallet_referral.sql`
- `one-stop-backend/drizzle/0012_coupon_guardrails.sql`

### 11) App native — src/lib/api.ts
Added: POINTS_PER_RUPEE, REFER_REWARD_POINTS, ApiWalletTx, apiGetWallet, apiRedeemWallet, apiGetReferrals, apiApplyReferral, apiGetCoupons(storeKey), apiValidateCoupon(code,sub,storeKey), apiSellerCoupons, apiSellerPostCoupon, apiSellerPatchCoupon, apiSellerDeleteCoupon.

### 12) App native — src/lib/osb-store.ts
walletPoints, myReferralCode, walletTx, walletSyncAt, useWallet, setWallet, syncWallet (20s throttle). couponProof + setCouponProof (5-min fresh).

### 13) App native — src/lib/commerce.ts
Added CouponProof type, proofDiscount(proof, code, storeId, subtotal). quoteStore/quoteCart take optional proof; platform/seller coupon discount ONLY from proof (offline static list gives zero discount).

### 14) App native — src/components/login.tsx
- verify() fail-closed: fbConfirm missing → block; backend unreachable → block; 000000 → reject.
- saveSession(token, serverUser?) — wallet sync + referral code save + server user name → completeProfile (register skip).

### 15) App native — src/components/profile-setup.tsx
Refer code input (optional) + apiApplyReferral on save.

### 16) App native — src/components/profile-sheets.tsx
- WalletSheet: live balance + points, refer card (copy + Share), tx history, retry button if code null.
- CouponsSheet: apply → apiValidateCoupon → setCouponProof on success; error message on fail.

### 17) App native — src/components/customer.tsx
You-tab: live wallet ₹/pts, refer banner (Invite button → Share.share with code + link https://onestopbazar.app/r/CODE), closeSheet refreshes wallet.

### 18) App native — src/components/shell.tsx
- CartSheet: quoteCart(cart, seller, storewideOff, coupon, sellerCoupons, couponProof).
- CouponStrip: server-validate on tap (fail → "Internet chahiye" message).
- CheckoutSheet: pay methods + "Use wallet" toggle (₹ available), walletOff applied pro-rata across groups, walletUsed sent, payment = "Wallet" if fully covered.

## PENDING — EXACT CODE TO WRITE

### A) shell.tsx doPlace — per-group coupon split + wallet + extraDiscount
Replace the `doPlace` body (after `blip(880,0.12)`) with:

```ts
const q = quoteCart(cart, seller, storewideOff, coupon, sellerCoupons, couponProof);
const grand = q.total;
const walletAvail = Math.floor(walletPoints / POINTS_PER_RUPEE);
const walletOff = useWallet ? Math.min(walletAvail, grand) : 0;
const payable = grand - walletOff;
let distributed = 0;
let last: LiveOrder | null = null;
for (let gi = 0; gi < q.groups.length; gi++) {
  const g = q.groups[gi];
  const share = gi === q.groups.length - 1 ? walletOff - distributed : Math.round((walletOff * g.quote.total) / (grand || 1));
  distributed += share;
  const code = "#OSB-" + Math.floor(1000 + Math.random() * 9000);
  const live: LiveOrder = {
    id: localId, code, storeId: g.storeId, storeName: g.storeName,
    customer: userName || CUSTOMER.name, phone: phone || CUSTOMER.phone, address,
    items: g.items, subtotal: g.quote.subtotal, fee: g.quote.fee,
    discount: g.quote.discount + share, total: Math.max(0, g.quote.total - share),
    payment: walletOff >= grand && payable === 0 ? "Wallet" : pay,
    status: "new", etaMins: g.quote.etaMins, otp: String(Math.floor(1000 + Math.random() * 9000)),
    createdAt: Date.now(), distanceKm: g.storeId === (seller.storeId || "mine") ? Math.min(seller.radiusKm, 2.1) : 1.4,
    couponCode: coupon || null, walletUsed: share, extraDiscount: 0,
  };
  try {
    const j = await apiPostOrder(live);
    if (j?.id) live.id = j.id; if (j?.code) live.code = j.code;
  } catch {}
  placeLiveOrder(live); last = live;
}
```
Also add `couponCode`, `walletUsed`, `extraDiscount` to the `apiPostOrder` payload shape (api.ts already accepts `Record<string,unknown>` so no shape change needed — just send them).

### B) CouponsSheet — proof handling
In `apply` callback of CouponsSheet (profile-sheets.tsx), after apiValidateCoupon succeeds:
```ts
setCouponProof({ code: c.code, discount: Number(v.discount ?? 0), fundedBy: v.coupon?.fundedBy ?? null, storeKey: v.coupon?.storeKey ?? null, at: Date.now() });
```
On sheet close, clear proof? No — keep until expiry (5 min) or new apply. Add `setCouponProof(null)` in `onClose` only if you want stricter behaviour.

### C) Admin panel — coupon limit fields (admin.tsx)
In CMS Coupons manager, add fields when creating: expiry date, maxUsesTotal, maxUsesPerUser, firstOrderOnly toggle, maxBudget, fundedBy select (platform/seller), storeKey. When editing: kill-switch `active` toggle + limit edits calling `apiAdminPatchCoupon`. Note: admin.tsx currently calls `apiAdminPostCoupon`/`apiAdminPatchCoupon` — those now accept the new fields (backend schema already has them; just send).

### D) Seller panel — coupon sheet (seller.tsx)
In CouponSheet, add: minOrder, maxOff, expiry, firstOrderOnly toggle. `addCoupon`/`updateCoupon` send those fields. Backend `createSellerCoupon` already sets fundedBy=seller + storeKey.

### E) Typecheck
```powershell
npx tsc --noEmit   # backend
cd one-stop-bazar-native && npx tsc --noEmit
```

### F) Neon SQL (mandatory — backend fail-soft without it)
```sql
-- run 0011_wallet_referral.sql then 0012_coupon_guardrails.sql
-- then Render: git push → auto deploy
```

### G) EAS rebuild
Set `EXPO_PUBLIC_API_URL=https://one-stop-hvh8.onrender.com` in `.env`, then:
```powershell
eas build -p android --profile preview
```

## QUICK CHECKLIST (tomorrow)
- [ ] Neon SQL 0011 + 0012
- [ ] Render redeploy
- [ ] tsc both sides
- [ ] EAS rebuild + install
- [ ] Test flow: new user register (referral code input) → wallet 50 pts welcome → Refer banner share → friend install → friend apply code → both get pts → checkout wallet toggle → coupon tap → server validate → order with coupon_code + wallet_used
