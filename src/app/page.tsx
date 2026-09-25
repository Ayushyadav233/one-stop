"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Battery, Signal, Wifi, ShieldCheck, Sparkles, Store, Truck, BadgeIndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import { ProviderDash, ProviderMore, ProviderOrders } from "@/components/provider";
import { SellerCatalog, SellerMarketing, SellerOnboarding } from "@/components/seller";
import { BusinessHub } from "@/components/business";
import { RiderPanel } from "@/components/rider";
import { AdminPanel } from "@/components/admin";
import { CustomerHome, OrdersTab, ProfileTab, SavedTab, SearchTab, StoreSheet } from "@/components/customer";
import { CategoriesTab } from "@/components/categories";
import { BottomNav, CartSheet, CheckoutSheet, Onboarding, Splash, SuccessOverlay, TrackingSheet } from "@/components/shell";
import { LoginScreen } from "@/components/login";
import { ProfileSetupScreen } from "@/components/profile-setup";
import { LocationSetupScreen } from "@/components/location-setup";
import { useOSB } from "@/lib/osb-store";
import { fromApiOrder } from "@/lib/commerce";
import { cn } from "@/lib/cn";

export default function OneStopBazarApp() {
  const { booted, onboarded, loggedIn, profileComplete, locationSet, set, tab, mode, dark, storeId, hydrateOrders, seller } = useOSB();
  const [tracking, setTracking] = useState<string | null>(null);
  const [time, setTime] = useState("10:28");

  useEffect(() => {
    const f = () => {
      const d = new Date();
      let h = d.getHours() % 12; if (h === 0) h = 12;
      setTime(`${h}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    f();
    const t = setInterval(f, 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/seed", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    const pull = () => {
      fetch("/api/orders")
        .then((r) => r.json())
        .then((j) => {
          if (Array.isArray(j.orders) && j.orders.length) hydrateOrders(j.orders.map((row: Record<string, unknown>) => fromApiOrder(row)));
        })
        .catch(() => {});
    };
    pull();
    const t = setInterval(pull, 6000);
    return () => clearInterval(t);
  }, [hydrateOrders]);

  const openStore = (id: string) => set({ storeId: id });

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0B0B0E] lg:grid lg:place-items-center lg:p-6">
      {/* ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="blob-drift absolute -left-32 top-[-80px] h-[420px] w-[420px] rounded-full bg-[#1FB67C]/25 blur-[110px]" />
        <div className="blob-drift absolute right-[-120px] top-[30%] h-[460px] w-[460px] rounded-full bg-[#7C5CFF]/22 blur-[120px]" style={{ animationDelay: "-5s" }} />
        <div className="blob-drift absolute bottom-[-140px] left-[30%] h-[420px] w-[420px] rounded-full bg-[#D8F34E]/14 blur-[110px]" style={{ animationDelay: "-9s" }} />
        <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.14) 1px, transparent 1px)", backgroundSize: "26px 26px", maskImage: "radial-gradient(70% 60% at 50% 40%, black, transparent)" }} />
      </div>

      {/* desktop side copy */}
      <div className="relative z-10 hidden w-[340px] shrink-0 flex-col gap-5 pr-2 text-white xl:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#D8F34E] text-[26px] shadow-[0_12px_32px_rgba(216,243,78,.35)]">🛍️</div>
          <div><div className="font-display text-[22px] font-semibold leading-none">One Stop Bazar</div><div className="mt-1 text-[12px] font-bold text-white/55">EVERYTHING AROUND YOU</div></div>
        </div>
        <h1 className="font-display text-[44px] font-medium leading-[1.04] tracking-tight">Local commerce,<br /><span className="italic text-[#D8F34E]">beautifully</span> delivered.</h1>
        <p className="max-w-[300px] text-[14px] leading-relaxed text-white/60">One app. Restaurants, groceries & home services — each delivered by the local business itself. Zero commission chaos.</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[["🏪", "2,418 stores live"], ["🛵", "Stores deliver"], ["💳", "UPI • Cards • COD"], ["🤖", "AI insights"]].map(([e, t]) => (
            <div key={t} className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10 backdrop-blur"><div className="text-[22px]">{e}</div><div className="mt-1 text-[12px] font-bold text-white/80">{t}</div></div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[12px] font-bold text-white/50"><ShieldCheck size={15} className="text-[#D8F34E]" /> Live preview — this is the real Android app, in your browser.</div>
      </div>

      {/* phone */}
      <div className="relative z-10 mx-auto w-full max-w-[430px]">
        <div className="hidden justify-center gap-2 pb-3 text-[11px] font-black uppercase tracking-[0.22em] text-white/45 lg:flex">
          <span className="rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10">● React Native • TypeScript build mirrored to web</span>
        </div>
        <div className={cn("relative overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,.6)] ring-1 ring-white/15", dark && "dark-scope", "h-[100dvh] lg:h-[860px] lg:rounded-[46px] lg:ring-[10px] lg:ring-[#1C1C22]")} style={{ background: "var(--app)" }}>
          <div className="flex h-full flex-col" style={{ background: "var(--app)", color: "var(--ink)" }}>
            {/* android status bar */}
            <div className="relative z-30 flex items-center justify-between px-6 pb-1 pt-4 text-[12.5px] font-extrabold" style={{ color: "var(--ink)" }}>
              <span className="tabular-nums">{time}</span>
              <span className="absolute left-1/2 top-3 h-[22px] w-[110px] -translate-x-1/2 rounded-full bg-black lg:block hidden" />
              <span className="flex items-center gap-1.5 opacity-80"><Signal size={14} /><Wifi size={14} /><Battery size={16} /></span>
            </div>

            {/* scrollable */}
            <div className="no-scrollbar relative flex-1 overflow-y-auto overscroll-contain" id="osb-scroll">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode + "-" + tab}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {mode === "customer" && tab === "home" && <CustomerHome onStore={openStore} />}
                  {mode === "customer" && tab === "cats" && <CategoriesTab onStore={openStore} />}
                  {mode === "customer" && tab === "search" && <SearchTab />}
                  {mode === "customer" && tab === "orders" && <OrdersTab onTrack={(id) => setTracking(id)} />}
                  {mode === "customer" && tab === "saved" && <SavedTab onStore={openStore} />}
                  {mode === "customer" && tab === "profile" && <ProfileTab />}
                  {mode === "provider" && tab === "dash" && <ProviderDash />}
                  {mode === "provider" && tab === "porders" && <ProviderOrders />}
                  {mode === "provider" && tab === "catalog" && <SellerCatalog />}
                  {mode === "provider" && tab === "marketing" && <SellerMarketing />}
                  {mode === "provider" && tab === "khata" && <BusinessHub />}
                  {mode === "provider" && tab === "onboard" && !seller.onboarded && <SellerOnboarding />}
                  {mode === "provider" && tab === "onboard" && seller.onboarded && <ProviderDash />}
                  {mode === "provider" && tab === "more" && <ProviderMore />}
                  {mode === "provider" && tab === "profile" && <ProfileTab />}
                  {mode === "rider" && <RiderPanel />}
                  {mode === "admin" && tab === "overview" && <AdminPanel />}
                  {mode === "admin" && tab === "profile" && <ProfileTab />}
                  {mode === "provider" && (tab === "home" || tab === "search" || tab === "orders" || tab === "saved") && <ProviderDash />}
                </motion.div>
              </AnimatePresence>
            </div>

            {loggedIn && profileComplete && locationSet && <BottomNav />}
            <AnimatePresence>{storeId && <StoreSheet id={storeId} onClose={() => set({ storeId: null })} />}</AnimatePresence>
            <AnimatePresence>{tracking && <TrackingSheet id={tracking} onClose={() => setTracking(null)} />}</AnimatePresence>
            <CartSheet />
            <CheckoutSheet />
            <SuccessOverlay onTrack={() => setTracking(useOSB.getState().orders[0]?.id ?? null)} />
            <AnimatePresence>{loggedIn && profileComplete && locationSet && !onboarded && booted && <Onboarding />}</AnimatePresence>
            <AnimatePresence>{loggedIn && profileComplete && !locationSet && <LocationSetupScreen />}</AnimatePresence>
            <AnimatePresence>{loggedIn && !profileComplete && <ProfileSetupScreen />}</AnimatePresence>
            <AnimatePresence>{booted && !loggedIn && <LoginScreen />}</AnimatePresence>
            <AnimatePresence>{!booted && <Splash done={() => set({ booted: true })} />}</AnimatePresence>
          </div>
        </div>
        <div className="hidden items-center justify-center gap-4 pt-3 text-white/55 lg:flex">
          <span className="flex items-center gap-1.5 text-[12px] font-bold"><Store size={14} /> Provider mode inside Profile</span>
          <span className="flex items-center gap-1.5 text-[12px] font-bold"><Truck size={14} /> Stores deliver themselves</span>
          <span className="flex items-center gap-1.5 text-[12px] font-bold"><BadgeIndianRupee size={14} /> ₹999/mo only</span>
        </div>
      </div>

      {/* right rail */}
      <div className="relative z-10 hidden w-[300px] shrink-0 flex-col gap-3 pl-2 xl:flex">
        <div className="rounded-[24px] bg-white/8 p-5 text-white ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#D8F34E]"><Sparkles size={13} /> Why it beats Swiggy</div>
          <ul className="mt-3 space-y-2.5 text-[13px] font-semibold text-white/75">
            <li>✦ Dynamic home — morning to late-night moods</li>
            <li>✦ Liquid glass, spring physics, 60fps</li>
            <li>✦ Voice + image search ready</li>
            <li>✦ One account → Customer + Provider</li>
            <li>✦ Shopify-grade dashboard + AI insights</li>
            <li>✦ Deep-graphite dark mode, not black</li>
          </ul>
        </div>
        <div className="rounded-[24px] bg-[#D8F34E] p-5 text-black">
          <div className="font-display text-[20px] font-semibold leading-tight">Open your dukaan<br />for ₹999/mo.</div>
          <p className="mt-1 text-[12.5px] font-semibold text-black/60">No commission. No riders to manage in-app. Just growth.</p>
        </div>
      </div>
    </div>
  );
}
