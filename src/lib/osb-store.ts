"use client";
import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CATEGORIES, PRODUCTS, STORES, type CategoryDef, type Kind, type Product, type Store } from "@/lib/data";

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
  riders: Rider[];
  plan: "basic" | "growth" | "scale";
}
export interface SellerCoupon { id: string; code: string; title: string; detail: string; kind: "pct" | "flat"; value: number; maxOff: number; minOrder: number; active: boolean; used: number; expiry: string; }
export interface SellerOrderItem { name: string; qty: number; price: number; }
export type SellerOrderStatus = OrderStatus;
export interface SellerOrder { id: string; code: string; storeId: string; customer: string; phone: string; address: string; items: SellerOrderItem[]; subtotal: number; fee: number; discount: number; total: number; payment: string; status: SellerOrderStatus; placedAt: string; createdAt: number; distanceKm: number; rider?: string; rating?: number; note?: string; etaMins: number; }
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
}

type Mode = "customer" | "provider" | "admin" | "rider";
type Tab = string;

interface OSBState {
  booted: boolean;
  onboarded: boolean;
  loggedIn: boolean;
  phone: string;
  userName: string;
  userEmail: string;
  userGender: string;
  userAvatar: string;
  profileComplete: boolean;
  mode: Mode;
  tab: Tab;
  dark: boolean;
  cart: CartLine[];
  wishlist: string[];
  orders: Order[];
  coupon: string | null;
  address: string;
  addressArea: string;
  locationSet: boolean;
  userLat?: number;
  userLng?: number;
  storeId: string | null;
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
  seller: SellerSettings;
  sellerCoupons: SellerCoupon[];
  sellerOrders: SellerOrder[];
  team: TeamMember[];
  storeReviews: StoreReview[];
  storewideOff: number;
  accounts: Record<string, AccountSnap>;
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
}

export const useOSB = create<OSBState>()(
  persist(
    (set, get) => ({
      booted: false,
      onboarded: false,
      loggedIn: false,
      phone: "",
      userName: "",
      userEmail: "",
      userGender: "",
      userAvatar: "",
      profileComplete: false,
      mode: "customer",
      tab: "home",
      dark: false,
      cart: [],
      wishlist: ["p10", "p19"],
      orders: [],
      coupon: "BAZAR50",
      address: "",
      addressArea: "",
      locationSet: false,
      userLat: undefined,
      userLng: undefined,
      storeId: null,
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
        riders: [],
        plan: "growth",
      },
      sellerCoupons: [],
      sellerOrders: [],
      team: [],
      storeReviews: [],
      storewideOff: 0,
      accounts: {},
      riderCtx: null,
      set: (p) => set(p),
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
          openTime: "10:00", closeTime: "21:00", closedDays: [], vacationUntil: "", riders: [], plan: "growth",
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
        set({ loggedIn: false, mode: "customer", tab: "home", riderCtx: null });
      },
      ensureCatalog: () => {
        const st = get();
        if (st.catalogInit) return;
        set({ catalogInit: true, catalog: st.seller.onboarded ? st.catalog : [] });
      },
      addProduct: (p) => { set((st) => ({ catalog: [p, ...st.catalog] })); get().saveAccount(); },
      updateProduct: (id, p) => { set((st) => ({ catalog: st.catalog.map((x) => (x.id === id ? { ...x, ...p } : x)) })); get().saveAccount(); },
      removeProduct: (id) => { set((st) => ({ catalog: st.catalog.filter((x) => x.id !== id) })); get().saveAccount(); },
      toggleProduct: (id) => { set((st) => ({ catalog: st.catalog.map((x) => (x.id === id ? { ...x, hidden: !x.hidden } : x)) })); get().saveAccount(); },
      bumpStock: (id, d) => { set((st) => ({ catalog: st.catalog.map((x) => (x.id === id ? { ...x, stock: Math.max(0, x.stock + d) } : x)) })); get().saveAccount(); },
      setSeller: (p) => { set((st) => ({ seller: { ...st.seller, ...p } })); get().saveAccount(); },
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
          return {
            sellerOrders: st.sellerOrders.map((x) => (x.id === id ? { ...x, status: s } : x)),
            orders: st.orders.map((x) => (x.id === id ? { ...x, status: s } : x)),
            catalog,
          };
        });
        fetch("/api/orders/" + encodeURIComponent(id), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }) }).catch(() => {});
      },
      assignRider: (id, rider) => {
        set((st) => ({
          sellerOrders: st.sellerOrders.map((x) => (x.id === id ? { ...x, rider } : x)),
          orders: st.orders.map((x) => (x.id === id ? { ...x, rider } : x)),
        }));
        fetch("/api/orders/" + encodeURIComponent(id), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rider }) }).catch(() => {});
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
        fetch("/api/orders/" + encodeURIComponent(id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "onway", rider: ctx.riderName, riderPhone: ctx.riderPhone }),
        }).catch(() => {});
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
        fetch("/api/orders/" + encodeURIComponent(id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "delivered", proofPhoto: photo ?? "", deliveredBy: "rider" }),
        }).catch(() => {});
        get().buzz([14, 40, 20]);
        return true;
      },
      customerConfirmDelivery: (id) => {
        set((st) => ({
          orders: st.orders.map((o) => (o.id === id ? { ...o, status: "delivered", deliveredBy: "customer" } : o)),
          sellerOrders: st.sellerOrders.map((o) => (o.id === id ? { ...o, status: "delivered" } : o)),
        }));
        fetch("/api/orders/" + encodeURIComponent(id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "delivered", deliveredBy: "customer" }),
        }).catch(() => {});
        get().buzz(16);
      },
      updateRiderLocation: (orderId, lat, lng) => {
        set((st) => ({
          orders: st.orders.map((o) => (o.id === orderId ? { ...o, riderLat: lat, riderLng: lng, riderLastSeen: Date.now() } : o)),
        }));
        fetch("/api/orders/" + encodeURIComponent(orderId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ riderLat: lat, riderLng: lng }),
        }).catch(() => {});
      },
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
          if (typeof navigator !== "undefined" && "vibrate" in navigator) (navigator as unknown as { vibrate: (p: number | number[]) => void }).vibrate(pattern);
        } catch { /* noop */ }
      },
    }),
    { name: "osb-v8", partialize: (s) => ({ onboarded: s.onboarded, loggedIn: s.loggedIn, phone: s.phone, userName: s.userName, userEmail: s.userEmail, userGender: s.userGender, userAvatar: s.userAvatar, profileComplete: s.profileComplete, dark: s.dark, wishlist: s.wishlist, orders: s.orders, mode: s.mode, address: s.address, addressArea: s.addressArea, locationSet: s.locationSet, userLat: s.userLat, userLng: s.userLng, extraCategories: s.extraCategories, hiddenCategories: s.hiddenCategories, catRequests: s.catRequests, catalogInit: s.catalogInit, catalog: s.catalog, seller: s.seller, sellerCoupons: s.sellerCoupons, sellerOrders: s.sellerOrders, team: s.team, storeReviews: s.storeReviews, storewideOff: s.storewideOff, accounts: s.accounts, riderCtx: s.riderCtx } as unknown as OSBState) }
  )
);

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
  const { seller, catalog } = useOSB.getState();
  const mine = myStoreFromSeller(seller, catalog);
  return mine ? [mine, ...STORES] : STORES;
}

export function liveProducts(): Product[] {
  const { catalog } = useOSB.getState();
  return [...catalog.filter((p) => !p.hidden), ...PRODUCTS];
}

export function useMarketplace() {
  const seller = useOSB((s) => s.seller);
  const catalog = useOSB((s) => s.catalog);
  return useMemo(() => ({ stores: liveStores(), products: liveProducts() }), [seller, catalog]);
}


export function blip(freq = 660, dur = 0.07, type: OscillatorType = "sine") {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
    setTimeout(() => ctx.close(), 300);
  } catch { /* silent */ }
}
