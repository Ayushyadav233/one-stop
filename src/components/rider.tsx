"use client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bike, Camera, Check, ChevronRight, Clock, Eye, EyeOff, LogOut, MapPin,
  Navigation, Package, Phone, Power, ShoppingBag, ShieldCheck, Store as StoreIcon, Trash2, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { inr } from "@/lib/data";
import { blip, useOSB, type LiveOrder } from "@/lib/osb-store";
import { getCustomerLocation, getStoreLocation, openGoogleMapsNav, timeAgo } from "@/lib/commerce";
import { cn } from "@/lib/cn";
import { Img, SectionHead } from "./ui";
import { LiveMap } from "./live-map";

export function RiderPanel() {
  const { riderCtx, orders, logout, updateRiderLocation, toggleRiderOnline, enterCustomerMode } = useOSB();
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "done">("active");
  const [gpsActive, setGpsActive] = useState(true);

  const mine = useMemo(() => {
    if (!riderCtx) return { queue: [] as LiveOrder[], done: [] as LiveOrder[] };
    const forStore = orders.filter((o) => o.storeId === riderCtx.storeId);
    const assignedToMe = (o: LiveOrder) => !o.rider || o.rider === riderCtx.riderName;
    const queue = forStore.filter((o) => ["ready", "onway"].includes(o.status) && assignedToMe(o));
    const done = forStore.filter((o) => o.status === "delivered" && o.rider === riderCtx.riderName);
    return { queue, done };
  }, [orders, riderCtx]);

  const active = mine.queue.find((o) => o.status === "onway" && o.rider === riderCtx?.riderName) ?? mine.queue.find((o) => o.status === "onway");
  const earnings = mine.done.length * 25;
  const [offlineWarn, setOfflineWarn] = useState(false);

  // Real-time GPS broadcast for active delivery:
  // Updates the live coordinates on device and syncs to server so customer sees the rider moving live!
  useEffect(() => {
    if (!active || !riderCtx || !riderCtx.online) return;
    const orderId = active.id;
    const storeLoc = getStoreLocation(active.storeId);
    const homeLoc = getCustomerLocation(active.address);

    let progress = active.riderLat && active.riderLng ? 0.35 : 0.12;

    const broadcast = (lat: number, lng: number) => {
      updateRiderLocation(orderId, lat, lng);
    };

    // Initial broadcast if unset
    if (!active.riderLat || !active.riderLng) {
      broadcast(storeLoc.lat + (homeLoc.lat - storeLoc.lat) * progress, storeLoc.lng + (homeLoc.lng - storeLoc.lng) * progress);
    }

    // Real device GPS if permitted
    let watchId: number | null = null;
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            broadcast(pos.coords.latitude, pos.coords.longitude);
            setGpsActive(true);
          },
          () => { /* fallback to smooth road simulation */ },
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 6000 }
        );
      } catch { /* noop */ }
    }

    // Smooth road progression simulation (advances rider toward customer)
    const interval = setInterval(() => {
      progress = Math.min(0.94, progress + 0.04);
      const lat = storeLoc.lat + (homeLoc.lat - storeLoc.lat) * progress;
      const lng = storeLoc.lng + (homeLoc.lng - storeLoc.lng) * progress;
      broadcast(lat, lng);
    }, 3500);

    return () => {
      clearInterval(interval);
      if (watchId !== null && typeof navigator !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [active?.id, active?.status, riderCtx, updateRiderLocation]);

  if (!riderCtx) return null;

  return (
    <div className="app-bg pb-44">
      {/* header */}
      <div className="relative overflow-hidden bg-[#111117] px-4 pb-5 pt-5 text-white">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#F8CB46]/20 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[#F8CB46] text-[20px] text-black">
            🛵
            <span className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-[#111117]", riderCtx.online ? "bg-emerald-400" : "bg-white/30")} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-extrabold">{riderCtx.riderName}</div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-white/60">
              <StoreIcon size={11} /> {riderCtx.storeName} • {riderCtx.vehicle}
            </div>
          </div>
          <button
            onClick={() => { enterCustomerMode(); blip(660); }}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"
            title="Shop as a customer"
          >
            <ShoppingBag size={16} />
          </button>
          <button onClick={() => { logout(); blip(420); }} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10" title="Log out">
            <LogOut size={16} />
          </button>
        </div>

        {/* Online / Offline toggle — shop sees this status instantly */}
        <button
          onClick={() => {
            if (riderCtx.online && active) { setOfflineWarn(true); blip(320); setTimeout(() => setOfflineWarn(false), 2500); return; }
            toggleRiderOnline(!riderCtx.online);
            blip(riderCtx.online ? 380 : 780);
          }}
          className={cn(
            "relative mt-3 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-bold ring-1 transition-colors",
            riderCtx.online ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" : "bg-white/8 text-white/60 ring-white/15"
          )}
        >
          <span className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", riderCtx.online ? "live-dot bg-emerald-400" : "bg-white/30")} />
            {riderCtx.online ? "You're Online — visible to the shop" : "You're Offline — tap to go online"}
          </span>
          <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-black", riderCtx.online ? "bg-emerald-400 text-black" : "bg-white/15 text-white")}>
            <Power size={11} /> {riderCtx.online ? "ON" : "OFF"}
          </span>
        </button>
        <AnimatePresence>
          {offlineWarn && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-1.5 rounded-lg bg-[#E23744]/15 px-3 py-2 text-[10.5px] font-bold text-[#FF8A93]">Finish your active delivery before going offline.</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GPS Live Broadcast Pill — only meaningful once online */}
        {riderCtx.online && (
          <div className="relative mt-2 flex items-center justify-between rounded-xl bg-white/8 px-3 py-2 text-[11px] font-bold text-white/70 ring-1 ring-white/10">
            <span className="flex items-center gap-1.5">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#F8CB46]" />
              GPS location: always on
            </span>
            <span className="text-[10px] font-semibold text-white/50">Customer tracks you live</span>
          </div>
        )}

        <div className="relative mt-3 grid grid-cols-3 gap-2">
          {[
            ["To deliver", String(mine.queue.length), "#F8CB46"],
            ["Delivered", String(mine.done.length), "#7DFFB8"],
            ["Est. payout", inr(earnings), "#fff"],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-2xl bg-white/8 p-3">
              <div className="text-[9.5px] font-black uppercase tracking-widest text-white/50">{l}</div>
              <div className="mt-0.5 text-[16px] font-extrabold" style={{ color: c }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* active ride banner */}
      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-4 mt-3 overflow-hidden rounded-[18px] bg-[#0C831F] text-white shadow-[0_14px_32px_rgba(12,131,31,.35)]">
            <button onClick={() => setOpen(active.id)} className="flex w-full items-center gap-2.5 p-3.5 text-left">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><Navigation size={18} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-extrabold leading-tight">Delivery in progress • {active.code}</span>
                <span className="block truncate text-[11px] text-white/80">{active.customer} • {active.address}</span>
              </span>
              <ChevronRight size={18} className="shrink-0" />
            </button>
            <div className="flex border-t border-white/15 bg-black/15">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openGoogleMapsNav(riderCtx.storeAddress, active.address);
                  blip(700);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11.5px] font-black text-[#F8CB46]"
              >
                <MapPin size={13} /> Direct Google Maps Navigate
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pt-3">
        <div className="flex gap-2">
          <button onClick={() => setTab("active")} className={cn("flex-1 rounded-[13px] py-2.5 text-[12.5px] font-extrabold", tab === "active" ? "bg-black text-white dark:bg-white dark:text-black" : "card text-ink2 shadow-card")}>
            My deliveries ({mine.queue.length})
          </button>
          <button onClick={() => setTab("done")} className={cn("flex-1 rounded-[13px] py-2.5 text-[12.5px] font-extrabold", tab === "done" ? "bg-black text-white dark:bg-white dark:text-black" : "card text-ink2 shadow-card")}>
            Completed ({mine.done.length})
          </button>
        </div>
      </div>

      <div className="space-y-2.5 px-4 pt-3">
        {(tab === "active" ? mine.queue : mine.done).map((o) => (
          <RideCard key={o.id} o={o} onOpen={() => { setOpen(o.id); blip(560); }} />
        ))}
        {(tab === "active" ? mine.queue : mine.done).length === 0 && (
          <div className="card rounded-[18px] p-8 text-center shadow-card">
            <div className="text-[42px]">{tab === "active" ? "📭" : "✅"}</div>
            <div className="mt-1 text-[15px] font-extrabold">{tab === "active" ? "No parcels ready yet" : "No completed runs"}</div>
            <p className="mt-1 text-[12px] text-ink3">
              {tab === "active" ? `${riderCtx.storeName} will mark orders ready — they appear here instantly.` : "Your delivered orders will show up here."}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>{open && <RideSheet id={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  );
}

function RideCard({ o, onOpen }: { o: LiveOrder; onOpen: () => void }) {
  const perms = useOSB((s) => s.riderCtx?.perms);
  const riderCtx = useOSB((s) => s.riderCtx);
  const isCod = o.payment.toUpperCase() === "COD";

  const directMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    openGoogleMapsNav(riderCtx?.storeAddress || "HSR Layout", o.address);
    blip(660);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden rounded-[18px] shadow-card">
      <div onClick={onOpen} className="cursor-pointer p-3.5">
        <div className="flex items-center gap-2.5">
          <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white", o.status === "delivered" ? "bg-[#0C831F]" : o.status === "onway" ? "bg-[#E8830C]" : "bg-[#1573FF]")}>
            {o.status === "delivered" ? <Check size={18} strokeWidth={3} /> : <Package size={18} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="text-[13px] font-extrabold">{o.code}</span>
              <span className={cn("rounded-md px-1.5 py-[1px] text-[9.5px] font-black text-white", o.status === "delivered" ? "bg-[#0C831F]" : o.status === "onway" ? "bg-[#E8830C]" : "bg-[#1573FF]")}>
                {o.status.toUpperCase()}
              </span>
            </span>
            <span className="block truncate text-[11px] font-semibold text-ink3">
              {o.customer} • {o.distanceKm} km {perms?.itemList ? `• ${o.items.length} item${o.items.length > 1 ? "s" : ""}` : ""}
            </span>
          </span>
          <span className="text-right">
            {perms?.orderAmount && <span className="block text-[13px] font-extrabold tabular-nums">{inr(o.total)}</span>}
            <span className={cn("block text-[9.5px] font-black", isCod ? "text-[#E8830C]" : "text-[#0C831F]")}>
              {isCod ? "COLLECT CASH" : "PREPAID"}
            </span>
          </span>
        </div>

        {perms?.customerAddress && (
          <div className="mt-2 flex items-start gap-1.5 border-t divide-line pt-2 text-[11.5px] font-semibold text-ink2">
            <MapPin size={13} className="mt-0.5 shrink-0 text-[#E23744]" />
            <span className="line-clamp-1 flex-1">{o.address}</span>
          </div>
        )}
      </div>

      {/* Direct Maps action bar */}
      <div className="flex border-t divide-line bg-black/[.02] dark:bg-white/[.02]">
        <button
          onClick={directMaps}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11.5px] font-extrabold text-[#1573FF] hover:bg-black/5 active:bg-black/10"
        >
          <Navigation size={13} /> Open in Google Maps
        </button>
        <div className="w-px divide-line" />
        <button
          onClick={onOpen}
          className="flex flex-1 items-center justify-center gap-1 py-2.5 text-[11.5px] font-extrabold text-[#0C831F] hover:bg-black/5 active:bg-black/10"
        >
          View Details & Deliver <ChevronRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}

function RideSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { orders, riderCtx, riderPickup, completeDelivery, updateRiderLocation } = useOSB();
  const o = orders.find((x) => x.id === id);
  const [otp, setOtp] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [err, setErr] = useState("");
  const [okDone, setOkDone] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  if (!o || !riderCtx) return null;
  const perms = riderCtx.perms;
  const isCod = o.payment.toUpperCase() === "COD";
  const delivered = o.status === "delivered";

  const storeLoc = getStoreLocation(o.storeId);
  const homeLoc = getCustomerLocation(o.address);
  const riderPos = o.riderLat != null && o.riderLng != null ? { lat: o.riderLat, lng: o.riderLng } : undefined;

  const shoot = (files: FileList | null) => {
    const f = files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(String(reader.result || ""));
      setErr("");
      blip(760);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    };
    reader.readAsDataURL(f);
  };

  const handleOtpChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    setOtp(clean);
    setErr("");
    if (clean.length === 4) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 80);
    }
  };

  const finish = () => {
    if (!photo) {
      setErr("Parcel photo is required as delivery proof.");
      blip(320);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      return;
    }
    if (otp.trim().length < 4) {
      setErr("Ask the customer for their 4-digit OTP.");
      blip(320);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      return;
    }
    const ok = completeDelivery(o.id, otp.trim(), photo);
    if (!ok) {
      setErr("Wrong OTP. Please check with the customer.");
      blip(320);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      return;
    }
    setErr("");
    setOkDone(true);
    setTimeout(onClose, 1400);
  };

  const openNavigation = () => {
    openGoogleMapsNav(riderCtx.storeAddress, o.address, homeLoc.lat, homeLoc.lng);
    blip(720);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-black/60" onClick={onClose}>
      <motion.div
        initial={{ y: "94%" }}
        animate={{ y: 0 }}
        exit={{ y: "94%" }}
        transition={{ type: "spring", stiffness: 230, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 flex h-[92vh] max-h-[92vh] flex-col overflow-hidden rounded-t-[28px] app-bg shadow-2xl"
      >
        {/* Top Header */}
        <div className="shrink-0 px-4 pt-3 pb-2 border-b divide-line surface">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-black/15 dark:bg-white/15" />
          <div className="mt-2.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[19px] font-extrabold tracking-tight">{o.code}</h3>
                <span className={cn("rounded-md px-1.5 py-[2px] text-[10px] font-black text-white", o.status === "delivered" ? "bg-[#0C831F]" : "bg-[#E8830C]")}>
                  {o.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-ink3">Placed {timeAgo(o.createdAt)} • {o.distanceKm} km to drop</p>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full chip"><X size={17} /></button>
          </div>
        </div>

        {/* Scrollable Content with ample bottom padding so buttons are never cut off */}
        <div
          ref={scrollRef}
          className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-44"
          style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
        >
          {okDone && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-3 rounded-[16px] bg-[#0C831F] p-4 text-center text-white shadow-lg">
              <Check size={32} className="mx-auto" strokeWidth={3} />
              <div className="mt-1 text-[16px] font-extrabold">Delivery confirmed! 🎉</div>
              <div className="text-[12px] text-white/85">Customer & shop notified in real-time.</div>
            </motion.div>
          )}

          {/* Real-time Map Preview inside Rider Sheet */}
          <div className="relative mb-3 h-[148px] overflow-hidden rounded-[18px] card shadow-card">
            <LiveMap
              store={storeLoc}
              home={homeLoc}
              progress={o.status === "delivered" ? 1 : 0.6}
              riderPos={riderPos}
              showRider={!delivered}
              routeColor="#1573FF"
              interactive={false}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 py-2 text-white">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1"><span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> GPS Live Broadcast</span>
                <span className="text-[#F8CB46]">{o.distanceKm} km away</span>
              </div>
            </div>
            <button
              onClick={openNavigation}
              className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-black shadow-lg backdrop-blur pressable"
            >
              <Navigation size={12} className="text-[#1573FF]" /> Direct Maps
            </button>
          </div>

          {/* Pickup location */}
          <div className="card mb-2.5 flex items-start gap-3 rounded-[16px] p-3.5 shadow-card">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0C831F]/12 text-[#0C831F]"><StoreIcon size={18} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[9.5px] font-black uppercase tracking-widest text-ink3">Pick up from (Store)</div>
              <div className="text-[13px] font-extrabold">{riderCtx.storeName}</div>
              <div className="text-[11px] text-ink3">{riderCtx.storeAddress}</div>
            </div>
            <a href={`tel:${riderCtx.storePhone}`} className="grid h-9 w-9 place-items-center rounded-full chip"><Phone size={15} /></a>
          </div>

          {/* Delivery Location with DIRECT MAPS BUTTON */}
          <div className="card mb-2.5 overflow-hidden rounded-[16px] shadow-card">
            <div className="flex items-start gap-3 p-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E23744]/12 text-[#E23744]"><MapPin size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-black uppercase tracking-widest text-ink3">Deliver to (Customer)</div>
                <div className="text-[13.5px] font-extrabold">{o.customer}</div>
                {perms.customerAddress ? (
                  <div className="text-[12px] leading-snug text-ink2">{o.address}</div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-ink3"><EyeOff size={11} /> Address hidden by shop owner</div>
                )}
              </div>
              {perms.customerPhone ? (
                <a href={`tel:${o.phone}`} className="grid h-9 w-9 place-items-center rounded-full bg-[#0C831F] text-white"><Phone size={15} /></a>
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-full chip text-ink3"><EyeOff size={15} /></span>
              )}
            </div>

            {/* Direct Map Action Button */}
            <div className="border-t divide-line bg-[#1573FF]/8 p-2.5">
              <button
                onClick={openNavigation}
                className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#1573FF] py-3 text-[13px] font-extrabold text-white shadow-sm pressable"
              >
                <Navigation size={16} /> Open in Google Maps (Turn-by-turn Navigation)
              </button>
            </div>
          </div>

          {/* Parcel contents */}
          {perms.itemList && (
            <div className="card mb-2.5 rounded-[16px] p-3.5 shadow-card">
              <div className="text-[9.5px] font-black uppercase tracking-widest text-ink3">Parcel contents</div>
              <div className="mt-1.5 space-y-1">
                {o.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[12.5px]"><span className="font-semibold">{it.qty} × {it.name}</span></div>
                ))}
              </div>
            </div>
          )}

          {/* Payment collection info */}
          <div className={cn("mb-3 rounded-[16px] p-3.5", isCod ? "bg-[#E8830C]/12 ring-1 ring-[#E8830C]/30" : "bg-[#0C831F]/10")}>
            {isCod && perms.collectCash ? (
              <>
                <div className="text-[9.5px] font-black uppercase tracking-widest text-[#E8830C]">Collect from customer</div>
                <div className="text-[22px] font-extrabold text-[#E8830C]">{perms.orderAmount ? inr(o.total) : "Cash on delivery"}</div>
                <div className="text-[11px] font-semibold text-ink2">Hand over the collected cash at the shop</div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-[12.5px] font-extrabold text-[#0C5B21]"><Check size={16} strokeWidth={3} /> Already paid online — collect nothing</div>
            )}
          </div>

          {!delivered && (
            <>
              {/* Pickup action */}
              {o.status !== "onway" && (
                <button
                  onClick={() => { riderPickup(o.id); blip(820); }}
                  className="mb-3 flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#1573FF] py-4 text-[14.5px] font-extrabold text-white shadow-[0_12px_28px_rgba(21,115,255,.35)] pressable"
                >
                  <Bike size={19} /> Picked up — start delivery
                </button>
              )}

              {/* Delivery completion form */}
              {o.status === "onway" && (
                <div className="space-y-3">
                  {/* Step 1: Photo (Compact Card) */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10.5px] font-black uppercase tracking-widest text-ink3">Step 1 — Parcel photo (required)</span>
                      {photo && <span className="text-[10px] font-extrabold text-[#0C831F]">✓ Attached</span>}
                    </div>

                    <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { shoot(e.target.files); e.target.value = ""; }} />

                    {photo ? (
                      <div className="card relative flex items-center gap-3 rounded-[16px] p-2.5 shadow-card">
                        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl">
                          <Img src={photo} alt="proof" className="h-full w-full object-cover" />
                          <span className="absolute bottom-1 left-1 rounded bg-[#0C831F] px-1 py-[1px] text-[8px] font-black text-white">✓ ATTACHED</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-extrabold text-[#0C831F]">Parcel photo ready ✓</div>
                          <div className="text-[11px] text-ink3">Photo will be shared with the customer</div>
                        </div>
                        <button
                          onClick={() => { setPhoto(undefined); blip(420); }}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl chip text-[#E23744] hover:bg-red-50"
                          title="Remove photo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex h-[88px] w-full flex-col items-center justify-center gap-1 rounded-[16px] border-2 border-dashed border-[#0C831F]/40 bg-[#0C831F]/5 pressable"
                      >
                        <Camera size={22} className="text-[#0C831F]" />
                        <span className="text-[12.5px] font-extrabold text-[#0C831F]">Take parcel photo</span>
                        <span className="text-[10.5px] text-ink3">Customer sees this as delivery proof</span>
                      </button>
                    )}
                  </div>

                  {/* Step 2: OTP */}
                  <div>
                    <div className="mb-1.5 text-[10.5px] font-black uppercase tracking-widest text-ink3">Step 2 — Customer OTP</div>
                    <div className="card rounded-[16px] p-3.5 shadow-card">
                      <p className="text-[11.5px] font-semibold text-ink2">Ask the customer: “Order mil gaya? OTP bataiye.”</p>
                      <input
                        inputMode="numeric"
                        maxLength={4}
                        value={otp}
                        onChange={(e) => handleOtpChange(e.target.value)}
                        placeholder="• • • •"
                        className="mt-2 w-full rounded-[14px] card-2 py-3.5 text-center text-[28px] font-extrabold tracking-[0.45em]"
                      />
                    </div>
                  </div>

                  {/* Error banner */}
                  {err && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-[12px] bg-[#E23744]/15 p-3 text-center text-[12px] font-extrabold text-[#E23744]">
                      ⚠️ {err}
                    </motion.div>
                  )}

                  {/* Confirm Button — ALWAYS ACCESSIBLE */}
                  <div className="pt-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={finish}
                      className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#0C831F] py-4 text-[15px] font-extrabold text-white shadow-[0_16px_40px_rgba(12,131,31,.45)] pressable"
                    >
                      <Check size={20} strokeWidth={3} /> Confirm Delivery
                    </motion.button>
                    <p className="mt-2 text-center text-[11px] font-semibold text-ink3">
                      Order is completed only after valid customer OTP.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {delivered && (
            <div className="card rounded-[18px] p-4 shadow-card">
              <div className="flex items-center gap-2 text-[13.5px] font-extrabold text-[#0C831F]">
                <Check size={18} strokeWidth={3} /> Delivered {o.deliveredBy === "customer" ? "(confirmed by customer)" : "with customer OTP"}
              </div>
              {o.proofPhoto && (
                <div className="mt-2.5 h-[140px] overflow-hidden rounded-[14px]">
                  <Img src={o.proofPhoto} alt="proof" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
