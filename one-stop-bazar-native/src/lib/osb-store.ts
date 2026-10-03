import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { Vibration } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CATEGORIES, PRODUCTS, STORES, type CategoryDef, type Kind, type Product, type Store } from "@/lib/data";
import { apiPatchOrder, apiGetHome, HOME_CONFIG_DEFAULTS, onAuthFailure, type ApiHomeBlock, type ApiSellerStore } from "@/lib/api";
import { fetchRemoteCatalog } from "@/lib/catalog";

/* Canonical keys — LOCAL copy (catalog.ts se import nahi).
   Metro/Hermes me cross-module import kabhi-kabhi stale bundle me
   ReferenceError deta hai ("Property 'canonicalProductKey' doesn't exist")
   jo poora home crash kar deta tha. Ye pure functions hain, koi dependency nahi. */
const STATIC_SLUG: Record<string, string> = {};
for (const s of STORES) {
  const slug = s.slug || s.id;
  STATIC_SLUG[s.id] = slug;
  STATIC_SLUG[slug] = slug;
}
function canonicalStoreKeyLocal(id: string | null | undefined): string {
  const k = String(id ?? "");
  return STATIC_SLUG[k] ?? k;
}
function canonicalProductKeyLocal(storeId: string | null | undefined, name: string): string {
  return `${canonicalStoreKeyLocal(storeId)}::${name.toLowerCase().trim().replace(/\s+/g, " ")}`;
}

export interface CartLine { productId: string; name: string; emoji: string; image?: string; price: number; qty: number; storeId: string; storeName: string; unit: string; tint: string; }
export type OrderStatus = "new" | "accepted" | "preparing" | "ready" | "onway" | "delivered" | "cancelled";
export interface LiveOrder {
  id: string;
  code: string;
  storeId: string;
  storeName: string;
  customer: string;
  phone: string;
  address: string;
  items: CartLine[];
  subtotal: number;
  fee: number;
  discount: number;
  total: number;
  payment: string;
  status: OrderStatus;
  etaMins: number;
  createdAt: number;
  couponCode?: string | null;
  walletUsed?: number;
  extraDiscount?: number;
  // Service booking (kind=service): slot + payment state. Product orders me undefined.
  kind?: "product" | "service";
  scheduledAt?: number | null;
  slotLabel?: string | null;
  payStatus?: "paid" | "pending";
  rider?: string;
  riderPhone?: string;
  riderLat?: number;
  riderLng?: number;
  riderLastSeen?: number;
  otp?: string;
  proofPhoto?: string;
  deliveredBy?: string;
  rating?: number;
  note?: string;
  distanceKm: number;
}
export type Order = LiveOrder;

export interface RiderPerms {
  customerPhone: boolean;
  customerAddress: boolean;
  orderAmount: boolean;
  itemList: boolean;
  collectCash: boolean;
  selfAssign: boolean;
}
export const DEFAULT_RIDER_PERMS: RiderPerms = {
  customerPhone: true,
  customerAddress: true,
  orderAmount: true,
  itemList: true,
  collectCash: true,
  selfAssign: false,
};
export interface Rider { name: string; phone: string; vehicle: string; active?: boolean; online?: boolean; lastOnlineAt?: number; perms?: RiderPerms }
export interface RiderCtx {
  ownerPhone: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  riderName: string;
  riderPhone: string;
  vehicle: string;
  perms: RiderPerms;
  online: boolean;
}
export interface CategoryRequest { id: string; productName: string; category: string; parent?: string; description: string; emoji: string; storeName: string; status: "pending" | "approved" | "rejected"; createdAt: number; }

export interface SellerSettings {
   onboarded: boolean;
   storeOpen: boolean;
   storeId: string;
   coverImage: string;
   name: string; tagline: string; phone: string; address: string; description: string; announcement: string;
   categories: string[];
   deliveryOn: boolean; radiusKm: number; deliveryFee: number; freeAbove: number; minOrder: number; pickup: boolean; avgTime: number;
   openTime: string; closeTime: string; closedDays: string[]; vacationUntil: string;
   // Service bookings (auto-slot engine): kaun se din kaam, kitne din advance tak book.
   workDays: number[]; advanceDays: number;
   riders: Rider[];
   plan: "basic" | "growth" | "scale";
   storeLat?: number;
   storeLng?: number;
 }
export interface SellerCoupon { id: string; code: string; title: string; detail: string; kind: "pct" | "flat"; value: number; maxOff: number; minOrder: number; active: boolean; used: number; expiry: string; firstOrderOnly?: boolean; }
/** Chat message (server ApiChatMsg + local pending flag). */
export interface ChatMsg { id: string; sender: string; text: string; createdAt: string; pending?: boolean; }
export interface SellerOrderItem { name: string; qty: number; price: number; }
export type SellerOrderStatus = OrderStatus;
export interface SellerOrder { id: string; code: string; storeId: string; customer: string; phone: string; address: string; items: SellerOrderItem[]; subtotal: number; fee: number; discount: number; total: number; payment: string; status: SellerOrderStatus; placedAt: string; createdAt: number; distanceKm: number; rider?: string; rating?: number; note?: string; etaMins: number; kind?: "product" | "service"; scheduledAt?: number | null; slotLabel?: string | null; payStatus?: "paid" | "pending"; }
export interface TeamMember { name: string; role: string; phone: string; active: boolean; }
export interface StoreReview { name: string; rating: number; text: string; when: string; reply?: string; }

export interface AccountSnap {
   userName: string;
   userEmail?: string;
   userGender?: string;
   userAvatar?: string;
   profileComplete?: boolean;
   address: string;
   seller: SellerSettings;
   catalog: Product[];
   catalogInit: boolean;
   sellerCoupons: SellerCoupon[];
   sellerOrders: SellerOrder[];
   team: TeamMember[];
   storeReviews: StoreReview[];
   storewideOff: number;
   orders: Order[];
   wishlist: string[];
   addressArea?: string;
   locationSet?: boolean;
   userLat?: number;
   userLng?: number;
   biz?: unknown;
   role?: string;
 }

type Mode = "customer" | "provider" | "admin" | "rider";
type Tab = string;

interface OSBState {
   booted: boolean;
   onboarded: boolean;
   loggedIn: boolean;
   // Server ne token thukraya (401) — dobara login chahiye. Persist nahi hota.
   sessionExpired: boolean;
   phone: string;
   userName: string;
   userEmail: string;
   userGender: string;
   userAvatar: string;
   profileComplete: boolean;
   mode: Mode;
   tab: Tab;
   dark: boolean;
   role: string;
  cart: CartLine[];
   wishlist: string[];
   trackingOrderId: string | null;
   orders: Order[];
  coupon: string | null;
  // Server-validated coupon proof (fail-closed: proof nahi = discount nahi).
  // 5 min fresh — validate sirf Apply/checkout pe hota hai, quota order pe jalta hai.
  couponProof: { code: string; discount: number; fundedBy?: string | null; storeKey?: string | null; at: number } | null;
  setCouponProof: (p: OSBState["couponProof"]) => void;
  language: "en" | "hi";
  notifEnabled: boolean;
  address: string;
  addressArea: string;
  locationSet: boolean;
  userLat?: number;
  userLng?: number;
  storeId: string | null;
  bookingPid: string | null;
  // Order chat (in-app thread, 1 order = 1 thread).
  chatOrderId: string | null;
  chatRole: "customer" | "store";
  chatLastSeen: Record<string, number>;
  chatUnread: Record<string, boolean>;
  chatLocal: Record<string, ChatMsg[]>;
  openChat: (orderId: string, role: "customer" | "store") => void;
  closeChat: () => void;
  markChatSeen: (orderId: string) => void;
  pushChatUnread: (orderId: string) => void;
  setChatLocal: (orderId: string, msgs: ChatMsg[]) => void;
  query: string;
  category: string;
  showCart: boolean;
  checkoutOpen: boolean;
  orderSuccess: Order | null;
  providerVacation: boolean;
  extraCategories: CategoryDef[];
  hiddenCategories: string[];
  catRequests: CategoryRequest[];
  catalogInit: boolean;
  catalog: Product[];
  remoteStores: Store[];
  remoteProducts: Product[];
  catalogSyncAt: number;
  catalogSyncing: boolean;
  syncRemoteCatalog: () => void;
  homeBlocks: ApiHomeBlock[];
  homeBlocksAt: number;
  homeSyncing: boolean;
  homeConfig: Record<string, string>;
  homeVersion: string | null;
  homeEditMode: boolean;
  syncHomeBlocks: () => void;
  seller: SellerSettings;
  sellerCoupons: SellerCoupon[];
  sellerOrders: SellerOrder[];
  // Server record link (osb_seller_stores row id) + pending-upload flag.
  // Reinstall/phone-change pe dukaan server se wapas aati hai.
  sellerServerId: string | null;
  sellerDirty: boolean;
  team: TeamMember[];
  storeReviews: StoreReview[];
  storewideOff: number;
  accounts: Record<string, AccountSnap>;
  // Wallet + referral (backend-synced; 10 pts = ₹1)
  walletPoints: number;
  myReferralCode: string;
  walletTx: { id: string; kind?: string | null; points?: number | null; note?: string | null; createdAt?: string }[];
  walletSyncAt: number;
  useWallet: boolean;
  setWallet: (w: { points?: number; referralCode?: string | null; tx?: OSBState["walletTx"] }) => void;
  syncWallet: () => void;
  login: (phone: string) => void;
  logout: () => void;
  saveAccount: () => void;
  completeProfile: (p: { name: string; email?: string; gender?: string; avatar?: string }) => void;
  setUserAddress: (a: { area: string; full: string; lat?: number; lng?: number }) => void;
  set: (p: Partial<OSBState>) => void;
  ensureCatalog: () => void;
  addProduct: (p: Product) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  toggleProduct: (id: string) => void;
  bumpStock: (id: string, d: number) => void;
  setSeller: (p: Partial<SellerSettings>) => void;
  uploadSellerStore: () => void;
  syncSellerFromServer: () => void;
  addCoupon: (c: SellerCoupon) => void;
  updateCoupon: (id: string, c: Partial<SellerCoupon>) => void;
  removeCoupon: (id: string) => void;
  updateOrderStatus: (id: string, s: SellerOrderStatus) => void;
  assignRider: (id: string, rider: string) => void;
  hydrateOrders: (rows: LiveOrder[]) => void;
  placeLiveOrder: (o: LiveOrder) => void;
  addRider: (r: { name: string; phone: string; vehicle: string }) => void;
  removeRider: (name: string) => void;
  updateRider: (phone: string, patch: Partial<Rider>) => void;
  setRiderPerm: (phone: string, key: keyof RiderPerms, value: boolean) => void;
  riderCtx: RiderCtx | null;
  riderPickup: (id: string) => void;
  completeDelivery: (id: string, otp: string, photo?: string) => boolean;
  customerConfirmDelivery: (id: string) => void;
   updateRiderLocation: (orderId: string, lat: number, lng: number) => void;
   startTracking: (orderId: string) => void;
   stopTracking: () => void;
   toggleRiderOnline: (online: boolean) => void;
  enterCustomerMode: () => void;
  backToDeliveries: () => void;
  addTeam: (m: TeamMember) => void;
  toggleTeam: (name: string) => void;
  replyReview: (name: string, reply: string) => void;
  addCategory: (c: CategoryDef) => void;
  toggleCategoryVisible: (k: string) => void;
  requestCategory: (r: Omit<CategoryRequest, "id" | "status" | "createdAt">) => void;
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;
  addToCart: (l: CartLine) => void;
  decCart: (id: string) => void;
  clearCart: () => void;
   toggleWish: (id: string) => void;
   placeOrder: (o: Order) => void;
   cartCount: () => number;
   cartTotal: () => number;
   buzz: (pattern?: number | number[]) => void;
   setRole: (r: string) => void;
}

/* ── Seller store ↔ server sync ──
   Dukaan pehle sirf AsyncStorage me thi → reinstall pe gayab. Ab server
   (osb_seller_stores, ownerId-keyed) source-of-truth hai; local fail-soft.
   Rules: local khali + server hai → adopt (restore). Local hai + server
   khali → upload (backfill). Dono hain → local edits server pe PATCH. */
type ServerStoreRow = ApiSellerStore;
let sellerPushTimer: ReturnType<typeof setTimeout> | null = null;
let sellerPushInFlight = false;
let sellerSyncInFlight = false;

function scheduleSellerPush() {
  if (sellerPushTimer) clearTimeout(sellerPushTimer);
  sellerPushTimer = setTimeout(() => {
    sellerPushTimer = null;
    try { useOSB.getState().uploadSellerStore(); } catch { /* noop */ }
  }, 2500);
}
function sellerStoreBody(s: SellerSettings) {
  return {
    name: s.name.trim() || "My Store",
    slug: s.storeId && s.storeId !== "mine" ? s.storeId : undefined,
    kind: s.categories[0] || "grocery",
    tagline: s.tagline || undefined,
    image: s.coverImage || undefined,
    address: s.address || undefined,
    isOpen: s.storeOpen,
    profile: { ...s } as unknown as Record<string, unknown>,
  };
}
const sstr = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const snum = (v: unknown, fb: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fb);
const sbool = (v: unknown, fb: boolean): boolean => (typeof v === "boolean" ? v : fb);
const sarr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
function sellerFromServer(row: ServerStoreRow, digits: string, formatted: string): SellerSettings {
  const p = (row.profile ?? {}) as Partial<SellerSettings>;
  return {
    onboarded: true,
    storeOpen: row.isOpen ?? sbool(p.storeOpen, true),
    storeId: sstr(p.storeId) || row.slug || "mine-" + digits,
    coverImage: row.image ?? sstr(p.coverImage),
    name: row.name || sstr(p.name) || "My Store",
    tagline: row.tagline ?? sstr(p.tagline),
    phone: sstr(p.phone) || formatted,
    address: row.address ?? sstr(p.address),
    description: sstr(p.description),
    announcement: sstr(p.announcement),
    categories: sarr(p.categories),
    deliveryOn: sbool(p.deliveryOn, true),
    radiusKm: snum(p.radiusKm, 5),
    deliveryFee: snum(p.deliveryFee, 29),
    freeAbove: snum(p.freeAbove, 199),
    minOrder: snum(p.minOrder, 99),
    pickup: sbool(p.pickup, true),
    avgTime: snum(p.avgTime, 30),
    openTime: sstr(p.openTime, "10:00"),
    closeTime: sstr(p.closeTime, "21:00"),
    closedDays: sarr(p.closedDays),
    vacationUntil: sstr(p.vacationUntil),
    workDays: Array.isArray(p.workDays) && p.workDays.length ? p.workDays.map(Number) : [0, 1, 2, 3, 4, 5, 6],
    advanceDays: snum(p.advanceDays, 7),
    riders: Array.isArray(p.riders) ? (p.riders as SellerSettings["riders"]) : [],
    plan: p.plan === "basic" || p.plan === "scale" ? p.plan : "growth",
    storeLat: typeof p.storeLat === "number" ? p.storeLat : undefined,
    storeLng: typeof p.storeLng === "number" ? p.storeLng : undefined,
  };
}

export const useOSB = create<OSBState>()(
  persist(
    (set, get) => ({
      booted: false,
      onboarded: false,
      loggedIn: false,
      sessionExpired: false,
      phone: "",
      userName: "",
      userEmail: "",
      userGender: "",
      userAvatar: "",
      profileComplete: false,
       mode: "customer",
       tab: "home",
       dark: false,
       role: "customer",
      cart: [],
      wishlist: ["p10", "p19"],
       orders: [],
       trackingOrderId: null,
       coupon: null,
      couponProof: null,
      setCouponProof: (p) => set({ couponProof: p }),
      chatOrderId: null,
      chatRole: "customer",
      chatLastSeen: {},
      chatUnread: {},
      chatLocal: {},
      openChat: (orderId, role) => {
        set((st) => ({
          chatOrderId: orderId,
          chatRole: role,
          chatUnread: { ...st.chatUnread, [orderId]: false },
          chatLastSeen: { ...st.chatLastSeen, [orderId]: Date.now() },
        }));
        blip(700);
      },
      closeChat: () => set({ chatOrderId: null }),
      markChatSeen: (orderId) =>
        set((st) => ({
          chatUnread: { ...st.chatUnread, [orderId]: false },
          chatLastSeen: { ...st.chatLastSeen, [orderId]: Date.now() },
        })),
      pushChatUnread: (orderId) =>
        set((st) => (st.chatOrderId === orderId ? st : { chatUnread: { ...st.chatUnread, [orderId]: true } })),
      setChatLocal: (orderId, msgs) => set((st) => ({ chatLocal: { ...st.chatLocal, [orderId]: msgs } })),
      language: "en",
      notifEnabled: true,
      address: "",
      addressArea: "",
      locationSet: false,
      userLat: undefined,
      userLng: undefined,
      storeId: null,
      bookingPid: null,
      query: "",
      category: "all",
      showCart: false,
      checkoutOpen: false,
      orderSuccess: null,
      providerVacation: false,
      extraCategories: [],
      hiddenCategories: [],
      catRequests: [
        { id: "r-seed-1", productName: "Handmade Jute Bags", category: "Eco Living", parent: "Lifestyle", description: "Biodegradable jute & cloth bags, handmade by local SHGs.", emoji: "👜", storeName: "GreenThread Studio", status: "pending", createdAt: Date.now() - 3600_000 * 5 },
      ],
      catalogInit: false,
      catalog: [],
      remoteStores: [],
      remoteProducts: [],
      catalogSyncAt: 0,
      catalogSyncing: false,
      homeBlocks: [],
      homeBlocksAt: 0,
      homeSyncing: false,
      homeConfig: { ...HOME_CONFIG_DEFAULTS },
      homeVersion: null,
      homeEditMode: false,
      seller: {
        onboarded: false,
        storeOpen: false,
        storeId: "mine",
        coverImage: "",
        name: "",
        tagline: "",
        phone: "",
        address: "",
        description: "",
        announcement: "",
        categories: [],
        deliveryOn: true, radiusKm: 5, deliveryFee: 29, freeAbove: 199, minOrder: 99, pickup: true, avgTime: 30,
        openTime: "10:00", closeTime: "21:00", closedDays: [], vacationUntil: "",
        workDays: [0, 1, 2, 3, 4, 5, 6], advanceDays: 7,
        riders: [],
        plan: "growth",
      },
      sellerCoupons: [],
      sellerOrders: [],
      sellerServerId: null,
      sellerDirty: false,
      team: [],
      storeReviews: [],
      storewideOff: 0,
      accounts: {},
      walletPoints: 0,
      myReferralCode: "",
      walletTx: [],
      walletSyncAt: 0,
      useWallet: true,
      setWallet: (w) =>
        set({
          walletPoints: w.points ?? get().walletPoints,
          myReferralCode: w.referralCode ?? get().myReferralCode,
          walletTx: w.tx ?? get().walletTx,
          walletSyncAt: Date.now(),
        }),
      syncWallet: () => {
        // Throttle 20s; fail-soft offline.
        if (Date.now() - get().walletSyncAt < 20_000) return;
        import("@/lib/api").then((m) =>
          m.apiGetWallet().then((j) => {
            if (j && (j.ok ?? true)) {
              get().setWallet({
                points: Number(j.points ?? get().walletPoints),
                referralCode: j.referralCode ?? get().myReferralCode,
                tx: Array.isArray(j.tx) ? j.tx : get().walletTx,
              });
            }
          }).catch(() => {})
        ).catch(() => {});
      },
       riderCtx: null,
       set: (p) => set(p),
       setRole: (r) => set({ role: r }),
      completeProfile: (p) => {
        set({
          userName: p.name.trim(),
          userEmail: (p.email ?? "").trim(),
          userGender: p.gender ?? "",
          userAvatar: p.avatar ?? "",
          profileComplete: true,
        });
        get().saveAccount();
      },
      setUserAddress: (a) => {
        set({
          addressArea: a.area,
          address: a.full,
          locationSet: true,
          userLat: a.lat,
          userLng: a.lng,
        });
        get().saveAccount();
      },
      saveAccount: () => {
        const st = get();
        const d = st.phone.replace(/\D/g, "").slice(-10);
        if (d.length !== 10) return;
        const base = {
          userName: st.userName,
          userEmail: st.userEmail,
          userGender: st.userGender,
          userAvatar: st.userAvatar,
          profileComplete: st.profileComplete,
          address: st.address,
          addressArea: st.addressArea,
          locationSet: st.locationSet,
          userLat: st.userLat,
          userLng: st.userLng,
          seller: st.seller,
          catalog: st.catalog,
          catalogInit: st.catalogInit,
          sellerCoupons: st.sellerCoupons,
          sellerOrders: st.sellerOrders,
          team: st.team,
          storeReviews: st.storeReviews,
          storewideOff: st.storewideOff,
          orders: st.orders,
          wishlist: st.wishlist,
        };
        set({ accounts: { ...st.accounts, [d]: { ...base, biz: st.accounts[d]?.biz } } });
        import("@/lib/biz-store").then((m) => {
          const cur = get();
          const dd = cur.phone.replace(/\D/g, "").slice(-10);
          if (dd !== d) return;
          set({ accounts: { ...cur.accounts, [d]: { ...base, seller: cur.seller, catalog: cur.catalog, biz: m.exportBiz() } } });
        }).catch(() => {});
      },
      login: (phone) => {
        const digits = phone.replace(/\D/g, "").slice(-10);
        // Dusre number pe login → purane shop ka server link invalid; sync dobara resolve karega.
        // Fresh login = session valid — purana expired flag hatao.
        set({ sellerServerId: null, sessionExpired: false });
        const st = get();
        const prev = st.phone.replace(/\D/g, "").slice(-10);
        let accounts = st.accounts;
        if (prev.length === 10 && prev !== digits) {
          accounts = {
            ...accounts,
            [prev]: {
              userName: st.userName,
              address: st.address,
              seller: st.seller,
              catalog: st.catalog,
              catalogInit: st.catalogInit,
              sellerCoupons: st.sellerCoupons,
              sellerOrders: st.sellerOrders,
              team: st.team,
              storeReviews: st.storeReviews,
              storewideOff: st.storewideOff,
              orders: st.orders,
              wishlist: st.wishlist,
            },
          };
        }
        const acc = accounts[digits];
        const formatted = "+91 " + digits.replace(/(\d{5})(\d{5})/, "$1 $2");
        const emptySeller: SellerSettings = {
          onboarded: false, storeOpen: false, storeId: "mine-" + digits, coverImage: "", name: "", tagline: "", phone: formatted, address: "", description: "", announcement: "",
          categories: [], deliveryOn: true, radiusKm: 5, deliveryFee: 29, freeAbove: 199, minOrder: 99, pickup: true, avgTime: 30,
          openTime: "10:00", closeTime: "21:00", closedDays: [], vacationUntil: "", workDays: [0, 1, 2, 3, 4, 5, 6], advanceDays: 7, riders: [], plan: "growth",
        };
        // is this number registered as delivery staff of some shop?
        let riderCtx: RiderCtx | null = null;
        const shopEntries: [string, SellerSettings][] = Object.entries(accounts).map(([k, a]) => [k, a.seller]);
        if (st.seller.onboarded && prev.length === 10) shopEntries.push([prev, st.seller]);
        for (const [ownerPhone, shop] of shopEntries) {
          if (!shop?.onboarded || ownerPhone === digits) continue;
          const r = (shop.riders || []).find((x) => x.phone.replace(/\D/g, "").slice(-10) === digits);
          if (r && r.active !== false) {
            riderCtx = {
              ownerPhone,
              storeId: shop.storeId,
              storeName: shop.name,
              storeAddress: shop.address,
              storePhone: shop.phone,
              riderName: r.name,
              riderPhone: formatted,
              vehicle: r.vehicle,
              perms: { ...DEFAULT_RIDER_PERMS, ...(r.perms ?? {}) },
              online: r.online ?? false,
            };
            break;
          }
        }
        if (riderCtx) {
          const own = accounts[digits];
          set({
            accounts,
            loggedIn: true,
            phone: formatted,
            userName: own?.userName || "",
            userEmail: own?.userEmail || "",
            userGender: own?.userGender || "",
            userAvatar: own?.userAvatar || "",
            profileComplete: own?.profileComplete ?? false,
            address: own?.address || "",
            addressArea: own?.addressArea || "",
            locationSet: own?.locationSet ?? false,
            userLat: own?.userLat,
            userLng: own?.userLng,
            // rider has their own separate customer identity — never mixed with the shop they deliver for
            seller: own?.seller ?? emptySeller,
            catalog: own?.catalog ?? [],
            catalogInit: true,
            sellerCoupons: own?.sellerCoupons ?? [],
            sellerOrders: own?.sellerOrders ?? [],
            team: own?.team ?? [],
            storeReviews: own?.storeReviews ?? [],
            storewideOff: own?.storewideOff ?? 0,
            orders: own?.orders ?? [],
            wishlist: own?.wishlist ?? [],
            riderCtx,
            mode: "rider",
            tab: "rides",
          });
          return;
        }

        if (acc) {
          set({
            accounts,
            loggedIn: true,
            riderCtx: null,
            phone: formatted,
            userName: acc.userName || "",
            userEmail: acc.userEmail || "",
            userGender: acc.userGender || "",
            userAvatar: acc.userAvatar || "",
            profileComplete: acc.profileComplete ?? false,
            address: acc.address || "",
            addressArea: acc.addressArea || "",
            locationSet: acc.locationSet ?? false,
            userLat: acc.userLat,
            userLng: acc.userLng,
            seller: { ...acc.seller, phone: acc.seller.phone || formatted },
            catalog: acc.catalog,
            catalogInit: acc.catalogInit,
            sellerCoupons: acc.sellerCoupons,
            sellerOrders: acc.sellerOrders,
            team: acc.team,
            storeReviews: acc.storeReviews,
            storewideOff: acc.storewideOff,
            orders: acc.orders,
            wishlist: acc.wishlist,
            mode: "customer",
            tab: "home",
          });
          import("@/lib/biz-store").then((m) => {
            if (acc.biz) m.importBiz(acc.biz as Parameters<typeof m.importBiz>[0]);
          }).catch(() => {});
        } else if (st.seller.onboarded && (!prev || prev === digits)) {
          // first login after registering on this device — bind shop to this number
          set({
            accounts,
            loggedIn: true,
            riderCtx: null,
            phone: formatted,
            userName: st.userName || "",
            profileComplete: st.profileComplete ?? false,
            seller: { ...st.seller, phone: formatted, storeId: st.seller.storeId || "mine-" + digits },
            mode: "customer",
            tab: "home",
          });
        } else {
          set({
            accounts,
            loggedIn: true,
            riderCtx: null,
            phone: formatted,
            userName: "",
            userEmail: "",
            userGender: "",
            userAvatar: "",
            profileComplete: false,
            address: "",
            addressArea: "",
            locationSet: false,
            userLat: undefined,
            userLng: undefined,
            seller: emptySeller,
            catalog: [],
            catalogInit: true,
            sellerCoupons: [],
            sellerOrders: [],
            team: [],
            storeReviews: [],
            storewideOff: 0,
            orders: [],
            wishlist: [],
            mode: "customer",
            tab: "home",
          });
          import("@/lib/biz-store").then((m) => m.resetBiz()).catch(() => {});
        }
      },
      logout: () => {
        if (get().riderCtx) {
          get().toggleRiderOnline(false);
          get().saveAccount();
        } else {
          get().saveAccount();
        }
        set({ loggedIn: false, mode: "customer", tab: "home", riderCtx: null, sessionExpired: false });
      },
      ensureCatalog: () => {
        const st = get();
        if (st.catalogInit) return;
        set({ catalogInit: true, catalog: st.seller.onboarded ? st.catalog : [] });
      },
      syncRemoteCatalog: () => {
        const st = get();
        if (st.catalogSyncing) return;
        set({ catalogSyncing: true });
        fetchRemoteCatalog()
          .then((rc) => {
            if (rc) set({ remoteStores: rc.stores, remoteProducts: rc.products, catalogSyncAt: Date.now() });
          })
          .catch(() => {})
          .finally(() => set({ catalogSyncing: false }));
      },
      syncHomeBlocks: () => {
        const st = get();
        if (st.homeSyncing) return;
        set({ homeSyncing: true });
        apiGetHome()
          .then((h) => {
            // FIX: khali CMS bhi clear ho (pehle length>0 guard stale blocks rakhta tha).
            // Fail-soft: network fail pe kuch mat badlo (offline fallback bana rahe).
            if (h) set({ homeBlocks: h.blocks, homeConfig: h.config, homeVersion: h.version, homeBlocksAt: Date.now() });
          })
          .catch(() => {})
          .finally(() => set({ homeSyncing: false }));
      },
      addProduct: (p) => { set((st) => ({ catalog: [p, ...st.catalog] })); get().saveAccount(); },
      updateProduct: (id, p) => { set((st) => ({ catalog: st.catalog.map((x) => (x.id === id ? { ...x, ...p } : x)) })); get().saveAccount(); },
      removeProduct: (id) => { set((st) => ({ catalog: st.catalog.filter((x) => x.id !== id) })); get().saveAccount(); },
      toggleProduct: (id) => { set((st) => ({ catalog: st.catalog.map((x) => (x.id === id ? { ...x, hidden: !x.hidden } : x)) })); get().saveAccount(); },
      bumpStock: (id, d) => { set((st) => ({ catalog: st.catalog.map((x) => (x.id === id ? { ...x, stock: Math.max(0, x.stock + d) } : x)) })); get().saveAccount(); },
      setSeller: (p) => { set((st) => ({ seller: { ...st.seller, ...p } })); get().saveAccount(); scheduleSellerPush(); },
      uploadSellerStore: () => {
        const st = get();
        if (!st.loggedIn || !st.seller.onboarded || !st.seller.name.trim()) return;
        set({ sellerDirty: true });
        if (sellerPushInFlight) return;
        sellerPushInFlight = true;
        const snapshot = get().seller;
        const snapshotJson = JSON.stringify(snapshot);
        const serverId = get().sellerServerId;
        import("@/lib/api").then(async (m) => {
          try {
            if (!m.getApiToken()) return;
            const body = sellerStoreBody(snapshot);
            const res = serverId
              ? await m.apiSellerPatchStore(serverId, body)
              : await m.apiSellerPostStore({ ...body, slug: body.slug ?? snapshot.storeId });
            const changed = JSON.stringify(get().seller) !== snapshotJson;
            if (res?.ok && res.store) {
              set({ sellerServerId: res.store.id ?? serverId ?? null, sellerDirty: changed });
              if (changed) scheduleSellerPush();
            } else {
              set({ sellerDirty: true });
            }
          } catch {
            set({ sellerDirty: true });
          } finally {
            sellerPushInFlight = false;
          }
        }).catch(() => { sellerPushInFlight = false; });
      },
      syncSellerFromServer: () => {
        if (!get().loggedIn || sellerSyncInFlight) return;
        if (!useOSB.persist.hasHydrated()) {
          setTimeout(() => { try { get().syncSellerFromServer(); } catch { /* noop */ } }, 2000);
          return;
        }
        sellerSyncInFlight = true;
        import("@/lib/api").then(async (m) => {
          try {
            if (!m.getApiToken()) return;
            const rows = await m.apiSellerGetStores();
            if (!rows) return; // offline — local snapshot wins
            const cur = get();
            const digits = cur.phone.replace(/\D/g, "").slice(-10);
            const match = rows.find((r) => !!r.slug && r.slug === cur.seller.storeId)
              ?? (!cur.seller.onboarded ? rows[0] : undefined);
            if (!match) {
              // Server khali, local me dukaan → backfill (purani local shops bhi upload).
              if (cur.seller.onboarded) get().uploadSellerStore();
              return;
            }
            if (!cur.seller.onboarded) {
              // Fresh install / naya device → server wali dukaan wapas.
              const restored = sellerFromServer(match, digits, cur.phone);
              const snap = {
                userName: cur.userName, address: cur.address,
                seller: restored, catalog: cur.catalog, catalogInit: cur.catalogInit,
                sellerCoupons: cur.sellerCoupons, sellerOrders: cur.sellerOrders,
                team: cur.team, storeReviews: cur.storeReviews, storewideOff: cur.storewideOff,
                orders: cur.orders, wishlist: cur.wishlist,
              };
              set({
                seller: restored,
                sellerServerId: match.id ?? null,
                sellerDirty: false,
                accounts: digits ? { ...cur.accounts, [digits]: snap } : cur.accounts,
              });
              return;
            }
            // Dono taraf dukaan → local edits server pe converge (PATCH, duplicate POST nahi).
            if (!cur.sellerServerId && match.id) set({ sellerServerId: match.id });
            get().uploadSellerStore();
          } finally {
            sellerSyncInFlight = false;
          }
        }).catch(() => { sellerSyncInFlight = false; });
      },
      addCoupon: (c) => set((st) => ({ sellerCoupons: [c, ...st.sellerCoupons] })),
      updateCoupon: (id, c) => set((st) => ({ sellerCoupons: st.sellerCoupons.map((x) => (x.id === id ? { ...x, ...c } : x)) })),
      removeCoupon: (id) => set((st) => ({ sellerCoupons: st.sellerCoupons.filter((x) => x.id !== id) })),
       updateOrderStatus: (id, s) => {
         const prev = get().orders.find((x) => x.id === id);
         set((st) => {
           let catalog = st.catalog;
           if (s === "cancelled" && prev && prev.status !== "cancelled") {
             catalog = st.catalog.map((p) => {
               const line = prev.items.find((i) => i.productId === p.id);
               if (!line) return p;
               return { ...p, stock: p.stock + line.qty };
             });
           }
           const orders = st.orders.map((x) => (x.id === id ? { ...x, status: s } : x));
           const riderLoc = s === "delivered" || s === "cancelled"
             ? { riderLat: undefined, riderLng: undefined, riderLastSeen: undefined }
             : {};
           const tracking = (s === "delivered" || s === "cancelled") && st.trackingOrderId === id
             ? { trackingOrderId: null }
             : {};
           return {
             sellerOrders: st.sellerOrders.map((x) => (x.id === id ? { ...x, status: s } : x)),
             orders,
             catalog,
             ...riderLoc,
             ...tracking,
           };
         });
         apiPatchOrder(id, { status: s }).catch(() => {});
       },
      assignRider: (id, rider) => {
        set((st) => ({
          sellerOrders: st.sellerOrders.map((x) => (x.id === id ? { ...x, rider } : x)),
          orders: st.orders.map((x) => (x.id === id ? { ...x, rider } : x)),
        }));
        apiPatchOrder(id, { rider }).catch(() => {});
      },
      addRider: (r) => {
        set((st) => ({ seller: { ...st.seller, riders: [...st.seller.riders, { ...r, active: true, perms: { ...DEFAULT_RIDER_PERMS } }] } }));
        get().saveAccount();
      },
      removeRider: (name) => {
        set((st) => ({ seller: { ...st.seller, riders: st.seller.riders.filter((r) => r.name !== name) } }));
        get().saveAccount();
      },
      updateRider: (phone, patch) => {
        const key = phone.replace(/\D/g, "").slice(-10);
        set((st) => ({ seller: { ...st.seller, riders: st.seller.riders.map((r) => (r.phone.replace(/\D/g, "").slice(-10) === key ? { ...r, ...patch } : r)) } }));
        get().saveAccount();
      },
      setRiderPerm: (phone, key, value) => {
        const k = phone.replace(/\D/g, "").slice(-10);
        set((st) => ({
          seller: {
            ...st.seller,
            riders: st.seller.riders.map((r) =>
              r.phone.replace(/\D/g, "").slice(-10) === k ? { ...r, perms: { ...DEFAULT_RIDER_PERMS, ...r.perms, [key]: value } } : r
            ),
          },
        }));
        get().saveAccount();
      },
      riderPickup: (id) => {
        const ctx = get().riderCtx;
        if (!ctx) return;
        set((st) => ({
          orders: st.orders.map((o) => (o.id === id ? { ...o, rider: ctx.riderName, riderPhone: ctx.riderPhone, status: "onway" } : o)),
          sellerOrders: st.sellerOrders.map((o) => (o.id === id ? { ...o, rider: ctx.riderName, status: "onway" } : o)),
        }));
        apiPatchOrder(id, { status: "onway", rider: ctx.riderName, riderPhone: ctx.riderPhone }).catch(() => {});
        get().buzz(14);
      },
      completeDelivery: (id, otp, photo) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) return false;
        const expected = (order.otp || "").trim();
        if (expected && otp.trim() !== expected) return false;
        set((st) => ({
          orders: st.orders.map((o) => (o.id === id ? { ...o, status: "delivered", proofPhoto: photo ?? o.proofPhoto, deliveredBy: "rider" } : o)),
          sellerOrders: st.sellerOrders.map((o) => (o.id === id ? { ...o, status: "delivered" } : o)),
        }));
        apiPatchOrder(id, { status: "delivered", proofPhoto: photo ?? "", deliveredBy: "rider" }).catch(() => {});
        get().buzz([14, 40, 20]);
        return true;
      },
      customerConfirmDelivery: (id) => {
        set((st) => ({
          orders: st.orders.map((o) => (o.id === id ? { ...o, status: "delivered", deliveredBy: "customer" } : o)),
          sellerOrders: st.sellerOrders.map((o) => (o.id === id ? { ...o, status: "delivered" } : o)),
        }));
        apiPatchOrder(id, { status: "delivered", deliveredBy: "customer" }).catch(() => {});
        get().buzz(16);
      },
       updateRiderLocation: (orderId, lat, lng) => {
         set((st) => ({
           orders: st.orders.map((o) => (o.id === orderId ? { ...o, riderLat: lat, riderLng: lng, riderLastSeen: Date.now() } : o)),
         }));
         apiPatchOrder(orderId, { riderLat: lat, riderLng: lng }).catch(() => {});
       },
       startTracking: (orderId) => set({ trackingOrderId: orderId }),
       stopTracking: () => set({ trackingOrderId: null }),
       toggleRiderOnline: (online) => {
        const ctx = get().riderCtx;
        if (!ctx) return;
        const key = ctx.riderPhone.replace(/\D/g, "").slice(-10);
        const patchRiders = (riders: Rider[]) =>
          riders.map((r) => (r.phone.replace(/\D/g, "").slice(-10) === key ? { ...r, online, lastOnlineAt: Date.now() } : r));
        set((st) => {
          const accounts = { ...st.accounts };
          const ownerAcc = accounts[ctx.ownerPhone];
          if (ownerAcc) {
            accounts[ctx.ownerPhone] = { ...ownerAcc, seller: { ...ownerAcc.seller, riders: patchRiders(ownerAcc.seller.riders || []) } };
          }
          const liveMatchesShop = st.seller.storeId === ctx.storeId && st.seller.riders?.length;
          return {
            accounts,
            seller: liveMatchesShop ? { ...st.seller, riders: patchRiders(st.seller.riders) } : st.seller,
            riderCtx: { ...ctx, online },
          };
        });
        get().buzz(online ? 14 : 10);
      },
      enterCustomerMode: () => set({ mode: "customer", tab: "home" }),
      backToDeliveries: () => set({ mode: "rider", tab: "rides" }),
      addTeam: (m) => set((st) => ({ team: [...st.team, m] })),
      toggleTeam: (name) => set((st) => ({ team: st.team.map((x) => (x.name === name ? { ...x, active: !x.active } : x)) })),
      replyReview: (name, reply) => set((st) => ({ storeReviews: st.storeReviews.map((x) => (x.name === name ? { ...x, reply } : x)) })),
      addCategory: (c) => set((st) => ({ extraCategories: [...st.extraCategories.filter((x) => x.k !== c.k), c], hiddenCategories: st.hiddenCategories.filter((k) => k !== c.k) })),
      toggleCategoryVisible: (k) => set((st) => ({ hiddenCategories: st.hiddenCategories.includes(k) ? st.hiddenCategories.filter((x) => x !== k) : [...st.hiddenCategories, k] })),
      requestCategory: (r) => set((st) => ({ catRequests: [{ ...r, id: "r-" + Math.random().toString(36).slice(2, 8), status: "pending" as const, createdAt: Date.now() }, ...st.catRequests] })),
      approveRequest: (id) =>
        set((st) => {
          const req = st.catRequests.find((x) => x.id === id);
          if (!req) return {};
          const k = req.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28);
          const cat: CategoryDef = { k, t: req.category, sub: req.parent ?? "New on Bazar", img: "", kinds: [], accent: "#6D5DF6", eta: "Soon", emoji: req.emoji || "✨", subs: [], dynamic: true, featured: true };
          return {
            catRequests: st.catRequests.map((x) => (x.id === id ? { ...x, status: "approved" as const } : x)),
            extraCategories: [...st.extraCategories.filter((x) => x.k !== k), cat],
          };
        }),
      rejectRequest: (id) => set((st) => ({ catRequests: st.catRequests.map((x) => (x.id === id ? { ...x, status: "rejected" as const } : x)) })),
      addToCart: (l) => {
        const cur = get().cart;
        const ex = cur.find((c) => c.productId === l.productId);
        if (ex) set({ cart: cur.map((c) => (c.productId === l.productId ? { ...c, qty: c.qty + 1 } : c)) });
        else set({ cart: [...cur, { ...l, qty: 1 }] });
        get().buzz(12);
      },
      decCart: (id) => {
        const cur = get().cart;
        const ex = cur.find((c) => c.productId === id);
        if (!ex) return;
        if (ex.qty <= 1) set({ cart: cur.filter((c) => c.productId !== id) });
        else set({ cart: cur.map((c) => (c.productId === id ? { ...c, qty: c.qty - 1 } : c)) });
        get().buzz(8);
      },
      clearCart: () => set({ cart: [] }),
      toggleWish: (id) => {
        const w = get().wishlist;
        set({ wishlist: w.includes(id) ? w.filter((x) => x !== id) : [...w, id] });
        get().buzz(10);
      },
      placeOrder: (o) => get().placeLiveOrder(o),
      placeLiveOrder: (o) => {
        const st = get();
        const sellerRow: SellerOrder = {
          id: o.id, code: o.code, storeId: o.storeId, customer: o.customer, phone: o.phone, address: o.address,
          items: o.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
          subtotal: o.subtotal, fee: o.fee, discount: o.discount, total: o.total, payment: o.payment,
          status: o.status, placedAt: "Just now", createdAt: o.createdAt, distanceKm: o.distanceKm,
          rider: o.rider, rating: o.rating, note: o.note, etaMins: o.etaMins,
        };
        const catalog = st.catalog.map((p) => {
          const line = o.items.find((i) => i.productId === p.id);
          if (!line) return p;
          return { ...p, stock: Math.max(0, p.stock - line.qty) };
        });
        const mine = st.seller.storeId || "mine";
        const inbox = o.storeId === mine ? [sellerRow, ...st.sellerOrders.filter((x) => x.id !== o.id)] : st.sellerOrders;
        set({
          orders: [o, ...st.orders.filter((x) => x.id !== o.id)],
          sellerOrders: inbox,
          catalog,
          orderSuccess: o,
        });
        st.buzz([12, 40, 18]);
        get().saveAccount();
        if (o.storeId === mine) {
          import("@/lib/biz-store").then((m) => m.recordMarketplaceOrder(o)).catch(() => {});
        }
      },
      hydrateOrders: (rows) => {
        const st = get();
        const byId = new Map(st.orders.map((o) => [o.id, o]));
        for (const r of rows) byId.set(r.id, { ...(byId.get(r.id) ?? r), ...r });
        const merged = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
        const mine = st.seller.storeId || "mine";
        const inbox = merged.filter((o) => o.storeId === mine).map((o) => ({
          id: o.id, code: o.code, storeId: o.storeId, customer: o.customer, phone: o.phone, address: o.address,
          items: o.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
          subtotal: o.subtotal, fee: o.fee, discount: o.discount, total: o.total, payment: o.payment,
          status: o.status, placedAt: o.createdAt ? Math.round((Date.now() - o.createdAt) / 60000) + " min ago" : "Just now",
          createdAt: o.createdAt, distanceKm: o.distanceKm, rider: o.rider, rating: o.rating, note: o.note, etaMins: o.etaMins,
        }));
        set({ orders: merged, sellerOrders: inbox });
      },
      cartCount: () => get().cart.reduce((a, c) => a + c.qty, 0),
      cartTotal: () => get().cart.reduce((a, c) => a + c.qty * c.price, 0),
      buzz: (pattern = 10) => {
        try {
          Vibration.vibrate(typeof pattern === "number" ? pattern : pattern.slice(0, 8));
        } catch { /* noop */ }
      },
    }),
      { name: "osb-v8", storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ onboarded: s.onboarded, loggedIn: s.loggedIn, phone: s.phone, userName: s.userName, userEmail: s.userEmail, userGender: s.userGender, userAvatar: s.userAvatar, profileComplete: s.profileComplete, dark: s.dark, role: s.role, wishlist: s.wishlist,    orders: s.orders, trackingOrderId: s.trackingOrderId, mode: s.mode, coupon: s.coupon, language: s.language, notifEnabled: s.notifEnabled, address: s.address, addressArea: s.addressArea, locationSet: s.locationSet, userLat: s.userLat, userLng: s.userLng, extraCategories: s.extraCategories, hiddenCategories: s.hiddenCategories, catRequests: s.catRequests, catalogInit: s.catalogInit, catalog: s.catalog, remoteStores: s.remoteStores, remoteProducts: s.remoteProducts, catalogSyncAt: s.catalogSyncAt, homeBlocks: s.homeBlocks, homeBlocksAt: s.homeBlocksAt, homeConfig: s.homeConfig, homeVersion: s.homeVersion, seller: s.seller, sellerServerId: s.sellerServerId, sellerDirty: s.sellerDirty, sellerCoupons: s.sellerCoupons, sellerOrders: s.sellerOrders, team: s.team, storeReviews: s.storeReviews, storewideOff: s.storewideOff, accounts: s.accounts, riderCtx: s.riderCtx, walletPoints: s.walletPoints, myReferralCode: s.myReferralCode, walletTx: s.walletTx, useWallet: s.useWallet } as unknown as OSBState) }
  )
);

/* 401 watcher — token stale/rotated to server syncs fail-soft ki jagah
   "dobara login" banner dikhaye. sessionExpired persist nahi hota. */
try {
  onAuthFailure(() => {
    const st = useOSB.getState();
    if (st.loggedIn && !st.sessionExpired) useOSB.setState({ sessionExpired: true });
  });
} catch { /* noop */ }

export function activeCategories(): CategoryDef[] {
  const { extraCategories, hiddenCategories } = useOSB.getState();
  return [...CATEGORIES, ...extraCategories].filter((c) => !hiddenCategories.includes(c.k));
}

export function myStoreFromSeller(seller: SellerSettings, catalog: Product[]): Store | null {
  if (!seller.onboarded || !seller.name.trim()) return null;
  const live = catalog.filter((p) => !p.hidden && p.stock > 0);
  if (live.length === 0) return null;
  const cat = CATEGORIES.find((c) => c.k === seller.categories[0]) ?? CATEGORIES.find((c) => seller.categories.includes(c.k));
  const kind = ((seller.categories[0] as Kind) || "grocery") as Kind;
  return {
    id: seller.storeId || "mine",
    name: seller.name,
    slug: "my-store",
    kind,
    tagline: seller.tagline || cat?.sub || "Local store",
    emoji: cat?.emoji ?? "🛍️",
    image: seller.coverImage || cat?.img || "",
    tint: cat?.accent ? cat.accent + "22" : "#FCE4EC",
    rating: 5,
    ratingsCount: "New",
    etaMins: seller.avgTime,
    deliveryFee: seller.deliveryFee,
    distanceKm: 0.3,
    address: seller.address || "HSR Layout",
    isOpen: seller.storeOpen && !seller.vacationUntil,
    offers: seller.announcement ? [seller.announcement] : [],
    tags: seller.categories,
    openHours: `${seller.openTime} – ${seller.closeTime}`,
    healthScore: 92,
    cuisine: seller.categories.map((k) => CATEGORIES.find((c) => c.k === k)?.t ?? k).join(" • "),
    priceForTwo: "—",
  };
}

export function liveStores(): Store[] {
  const { seller, catalog, remoteStores, remoteProducts } = useOSB.getState();
  const mine = myStoreFromSeller(seller, catalog);
  // Self-heal: purana hollow persisted data (stores bina products) ignore karo.
  // Nahi to remote ids (meghana) + static products (s1) mismatch → "4 stores, 0 cards".
  const remote = remoteProducts.length > 0 ? remoteStores : [];
  const remoteSlugs = new Set(remote.map((s) => s.slug || s.id));
  const rest = STORES.filter((s) => !remoteSlugs.has(s.slug || s.id));
  const list = [...remote, ...rest];
  return mine ? [mine, ...list] : list;
}

export function liveProducts(): Product[] {
  const { catalog, remoteProducts } = useOSB.getState();
  // Canonical keys (s1 == meghana) — true replace: remote jeetta hai, static
  // duplicate nahi banta, aur orphan bhi nahi (guard ke saath double-safe).
  const remoteKeys = new Set(remoteProducts.map((p) => canonicalProductKeyLocal(p.storeId, p.name)));
  const rest = PRODUCTS.filter((p) => !remoteKeys.has(canonicalProductKeyLocal(p.storeId, p.name)));
  return [...catalog.filter((p) => !p.hidden), ...remoteProducts, ...rest];
}

export function useMarketplace() {
  const seller = useOSB((s) => s.seller);
  const catalog = useOSB((s) => s.catalog);
  const remoteStores = useOSB((s) => s.remoteStores);
  const remoteProducts = useOSB((s) => s.remoteProducts);
  return useMemo(() => ({ stores: liveStores(), products: liveProducts() }), [seller, catalog, remoteStores, remoteProducts]);
}


/* Live ETAs — always derived from shopkeeper data, never static text.
   Product's own prep time → its store's avg time → "" (caller hides badge). */
export function fastestEta(stores: { etaMins?: number | null }[]): number | null {
  const ms = stores
    .map((s) => Number(s.etaMins))
    .filter((n) => Number.isFinite(n) && n > 0);
  return ms.length ? Math.min(...ms) : null;
}
export function productEtaText(p: { eta?: string | null }, store?: { etaMins?: number | null }): string {
  const own = (p.eta || "").trim();
  if (own) return own;
  const m = Number(store?.etaMins);
  if (Number.isFinite(m) && m > 0) return `${Math.round(m)} mins`;
  return "";
}

export function blip(_freq = 660, _dur = 0.07, _type: string = "sine") {  // Web used a WebAudio oscillator tick; on native use a light haptic tick instead.
  try {
    Haptics.selectionAsync().catch(() => {});
  } catch { /* silent */ }
}
