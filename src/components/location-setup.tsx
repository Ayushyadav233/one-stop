"use client";
import { motion } from "framer-motion";
import { ArrowRight, Crosshair, LocateFixed, MapPin, Pencil, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { blip, useOSB } from "@/lib/osb-store";
import { cn } from "@/lib/cn";

/**
 * Shown once after profile completion, before the storefront opens.
 * Either:
 *  1. taps "Use current location" → real Geolocation + reverse geocode
 *  2. types / picks an area manually
 */
export function LocationSetupScreen() {
  const { setUserAddress } = useOSB();
  const [detecting, setDetecting] = useState(false);
  const [manual, setManual] = useState(false);
  const [area, setArea] = useState("");
  const [full, setFull] = useState("");
  const [err, setErr] = useState("");

  const detect = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setErr("Location isn't supported here — please enter manually.");
      setManual(true);
      return;
    }
    setDetecting(true);
    setErr("");
    blip(720);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let areaLabel = "Current location";
        let fullLabel = "";
        // Reverse geocode using the free BigDataCloud endpoint (no key required)
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          if (res.ok) {
            const d = await res.json();
            areaLabel = d.locality || d.city || d.principalSubdivision || "Current location";
            fullLabel = [d.locality, d.principalSubdivision, d.countryName].filter(Boolean).join(", ");
          }
        } catch {
          /* offline / blocked — still accept raw coords */
        }
        setDetecting(false);
        setUserAddress({
          area: areaLabel,
          full: fullLabel || areaLabel,
          lat: latitude,
          lng: longitude,
        });
        blip(960, 0.18);
      },
      () => {
        setDetecting(false);
        setErr("Location permission denied. You can enter it manually.");
        setManual(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const saveManual = () => {
    if (!area.trim()) { setErr("Please enter your area."); blip(320); return; }
    setUserAddress({ area: area.trim(), full: full.trim() || area.trim() });
    blip(960, 0.18);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -14 }} className="absolute inset-0 z-[73] flex flex-col app-bg">
      <div className="flex items-center justify-between px-5 pt-7">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E23744] text-[16px]">🛍️</span>
          <span className="text-[12px] font-black uppercase tracking-[0.18em] text-ink3">One Stop Bazar</span>
        </div>
        <div className="flex gap-1.5"><span className="h-1.5 w-5 rounded-full" style={{ background: "var(--line)" }} /><span className="h-1.5 w-5 rounded-full" style={{ background: "var(--line)" }} /><span className="h-1.5 w-5 rounded-full bg-[#E23744]" /></div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6 pt-6">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#E23744]/12 text-[32px] ring-1 ring-[#E23744]/40">📍</div>
        <h1 className="mt-4 text-center text-[25px] font-extrabold tracking-tight">Where should we deliver?</h1>
        <p className="mt-1.5 text-center text-[13px] font-medium leading-relaxed text-ink2">
          Shops near you show up first and delivery time is calculated from your location.
        </p>

        {/* GPS card */}
        <button
          onClick={detect}
          disabled={detecting}
          className="group mt-7 flex w-full items-center gap-3.5 rounded-[20px] bg-gradient-to-br from-[#0C831F] to-[#14a32b] p-4 text-left text-white shadow-[0_18px_40px_rgba(12,131,31,.35)] disabled:opacity-70"
        >
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
            <LocateFixed size={22} />
            {detecting && <span className="absolute inset-0 rounded-2xl ring-2 ring-white/70 animate-ping" />}
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-extrabold">{detecting ? "Locating you…" : "Use current location"}</span>
            <span className="block text-[11.5px] font-semibold text-white/80">{detecting ? "Please allow location access" : "Most accurate — using GPS"}</span>
          </span>
          <ArrowRight size={18} className="shrink-0 opacity-80" />
        </button>

        <div className="my-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-ink3">
          <span className="h-px flex-1" style={{ background: "var(--line)" }} /> or <span className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>

        <button onClick={() => { setManual((m) => !m); setErr(""); blip(600); }} className="card flex w-full items-center gap-3.5 rounded-[20px] p-4 text-left">
          <span className="chip grid h-12 w-12 place-items-center rounded-2xl"><Pencil size={20} /></span>
          <span className="flex-1">
            <span className="block text-[15px] font-extrabold">Enter manually</span>
            <span className="block text-[11.5px] font-semibold text-ink2">Type your area or full address</span>
          </span>
          <Crosshair size={18} className="shrink-0 text-ink3" />
        </button>

        {manual && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-2.5 overflow-hidden">
            <label className="card block rounded-[16px] px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink3"><MapPin size={11} /> Area / locality *</span>
              <input value={area} onChange={(e) => { setArea(e.target.value); setErr(""); }} placeholder="e.g. HSR Layout, Sector 2" className="mt-1 w-full bg-transparent text-[14px] font-bold placeholder:text-ink3" />
            </label>
            <label className="card block rounded-[16px] px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink3"><Search size={11} /> Full address</span>
              <input value={full} onChange={(e) => setFull(e.target.value)} placeholder="Flat, street, landmark, city" className="mt-1 w-full bg-transparent text-[13px] font-medium placeholder:text-ink3" />
            </label>
            <button onClick={saveManual} className="flex w-full items-center justify-center gap-2 rounded-[16px] py-3.5 text-[14px] font-extrabold text-white" style={{ background: "var(--ink)", color: "var(--app)" }}>
              Save location <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {err && <p className="brand-red mt-3 rounded-xl bg-[#E23744]/10 px-3 py-2.5 text-center text-[12px] font-bold">{err}</p>}
      </div>

      <div className="px-5 pb-8">
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-ink3">
          <ShieldCheck size={13} className="text-green" /> Your location stays on your account and is used only for delivery.
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Compact manual-location picker used later from the home header (change location).
 */
export function ChangeLocationSheet({ onClose }: { onClose: () => void }) {
  const { addressArea, address, setUserAddress } = useOSB();
  const [area, setArea] = useState(addressArea || "");
  const [full, setFull] = useState(address || "");
  const [detecting, setDetecting] = useState(false);
  const [err, setErr] = useState("");

  const save = () => {
    if (!area.trim()) { setErr("Area is required"); blip(320); return; }
    setUserAddress({ area: area.trim(), full: full.trim() || area.trim() });
    blip(880);
    onClose();
  };

  const gps = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        let a = "Current location", f = "";
        try {
          const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`);
          if (r.ok) {
            const d = await r.json();
            a = d.locality || d.city || a;
            f = [d.locality, d.principalSubdivision, d.countryName].filter(Boolean).join(", ");
          }
        } catch { /* ignore */ }
        setDetecting(false);
        setArea(a); setFull(f || a);
        setUserAddress({ area: a, full: f || a, lat: pos.coords.latitude, lng: pos.coords.longitude });
        blip(920);
        onClose();
      },
      () => { setDetecting(false); setErr("GPS denied — type your area."); },
      { timeout: 10000 }
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[58] bg-black/55" onClick={onClose}>
      <motion.div initial={{ y: "88%" }} animate={{ y: 0 }} exit={{ y: "88%" }} transition={{ type: "spring", stiffness: 240, damping: 30 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[86%] overflow-hidden rounded-t-[26px] app-bg">
        <div className="no-scrollbar max-h-[86vh] overflow-y-auto px-4 pb-10 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-black/15" />
          <h3 className="mt-3 text-[18px] font-extrabold tracking-tight">Change delivery location</h3>

          <button onClick={gps} className={cn("mt-3 flex w-full items-center gap-3 rounded-[14px] bg-[#0C831F] p-3.5 text-left text-white", detecting && "opacity-70")}>
            <LocateFixed size={18} />
            <span className="flex-1 text-[13px] font-extrabold">{detecting ? "Locating…" : "Use my current GPS location"}</span>
          </button>

          <div className="mt-3 space-y-2">
            <input value={area} onChange={(e) => { setArea(e.target.value); setErr(""); }} placeholder="Area / locality *" className="w-full rounded-[13px] card px-3.5 py-3 text-[13.5px] font-bold shadow-card" />
            <input value={full} onChange={(e) => setFull(e.target.value)} placeholder="Full address (flat, street, landmark)" className="w-full rounded-[13px] card px-3.5 py-3 text-[13px] font-medium shadow-card" />
          </div>
          {err && <p className="mt-2 text-[12px] font-bold text-[#E23744]">{err}</p>}
          <button onClick={save} className="mt-3 w-full rounded-[14px] bg-[#E23744] py-3.5 text-[14px] font-extrabold text-white">Save</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
