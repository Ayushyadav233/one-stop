# HANDOFF — One Stop Bazar (Completed & Handoff Summary: Sat Oct 03 2026)

> Nayi chat me sabse pehle YE FILE padho. Aaj ka poora kaam commit & push ho chuka hai.

## Paths
- Web app (Next): `C:\Users\ayush\Downloads\one-stop-bazar-app-development` (root)
- Backend (Hono+Drizzle+Neon): `...\one-stop-bazar-app-development\one-stop-backend`
- Native app (Expo SDK 57): `...\one-stop-bazar-app-development\one-stop-bazar-native`

---

## DONE TODAY (Sat Oct 03 2026) ✅

### 1. STRICT Stage-Gated Milestone Coupon & Reward System
- **Backend Migration**: `0013_stage_gates.sql` created & backend `/api/coupons/stages` endpoint added as single source of truth.
- **Exact Reward Ladder**:
  - 🎁 **First Order (0 orders)**: `WELCOME20` → **Flat ₹20 OFF** (first order only, min order ₹1)
  - 🏆 **3 Delivered Orders**: `LOYAL3` → **Flat ₹30 OFF**
  - 🏆 **5 Delivered Orders**: `LOYAL5` → **Flat ₹50 OFF**
  - 🏆 **10 Delivered Orders**: `CHAMP10` → **Flat ₹80 OFF**
  - 🏆 **20 Delivered Orders**: `HERO20` → **Flat ₹100 OFF**
  - 🛠️ **First Home Service Booking**: `HOMESERVE` → **Flat ₹99 OFF**
  - 🚚 **3 Orders**: `FREEDEL` → **Free Delivery**
- **Strict Guardrails**: `checkCoupon()` enforces single-use per user (`userUseCount >= 1` REJECTS) and phone number check (`userOrderCount > 0` REJECTS Welcome coupon after 1st order). Caller phone eligibility check prevents sharing codes between accounts.
- **UI & Sheet Scrolling**: `CouponsSheet` features a Professional **REWARD TABLE** + locked stage cards (`🔒 Locked` dead buttons). `PSheet` height calculation fix for smooth scrolling without freezing.

### 2. 500m Service & Delivery Radius
- Seller Onboarding Step 3 & Manage tab Delivery Card radius stepper now starts at **500 m** (`0.5 km`), step 1 km up to 15 km. `fmtRadius()` formats `< 1 km` as `500 m` (e.g. `500 m`, `~0.8 km²`).

### 3. Service Provider Account UI & Action Flow
- Service Provider account (`isServiceSeller`) UI tweaks:
  - Header: **"Service Bookings"** (instead of "Orders"), Subtitle: `"Customers book your slots • you visit their location 🛠️"`.
  - Stats: **"NEW BOOKINGS"**, **"ACTIVE"**, **"VISIT FEES"**.
- **Prominent Time Slot Display**: Order card displays `🗓️ BOOKED SLOT: Mon, 14 Oct • 02:00 PM - 03:00 PM` prominently in purple banner.
- **Service Action Flow**:
  - `new` -> **"Confirm booking ✓"**
  - `accepted` / `preparing` -> **"Out for service 🛠️"** (NO "Mark ready for pickup")
  - `onway` -> **"Mark reached 📍"**
  - `ready` -> **"Complete service ✓"**

### 4. Unread Chat Dot Alert 💬
- Collapsed order card header displays pulsing red badge **`🔴 NEW MSG 💬`** when unread chat messages exist for that order.

### 5. Professional Push Notifications & Deep Linking
- 100% Professional English, detailed context, NO "pro" (uses "Service Partner", "Store Partner", "Delivery Partner").
- Notification on delivery/service completion includes `{ orderId: id, screen: "rate_order" }`.
- Deep linking in `watchPushNotifications` (`push.ts` & `shell.tsx`):
  - Chat push -> opens Chat Modal directly.
  - Provider order push -> opens Provider Orders tab.
  - Rating push -> opens `RateOrderSheet` directly!

### 6. Rating & Review System (`RateOrderSheet` & Conditional Ratings)
- **`RateOrderSheet`**: 5-Star interactive touch picker, review text input, submit button (`POST /api/reviews`), and thank-you view.
- **Conditional Rating Display**: If product/store has no ratings (`ratingsCount === 0`), rating badge is **completely hidden** (no fake or 0 stars). Shown only when ratings exist (`⭐ 4.8 (12)`).
- **StoreSheet Reviews Tab**: Fetches real customer reviews (`GET /api/reviews?storeId=...`) and displays ratings, text, date, and store replies.

---

## RESUME TONIGHT (Exact Next Steps) 🌙

1. **Rating & Review Enhancements (Tonight)**:
   - Add product-item rating stars inside completed order rating sheet.
   - Auto-popup `RateOrderSheet` on customer app launch if un-rated completed orders exist.
   - Add Provider Dashboard review reply input in Seller Manage panel (`PATCH /api/reviews/:id`).

2. **Verification & Build**:
   - Run `npx tsc --noEmit` on both backend & native (currently clean ✅).
   - Test flow with live dev backend / EAS preview build.
