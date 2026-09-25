"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertTriangle, ArrowUpRight, Ban, Bell, Building2, Check, CheckCircle2, ChevronRight, CreditCard, Eye, EyeOff, Globe2, LayoutGrid, LineChart, LogOut, Plus, Search, ShieldAlert, ShieldCheck, Star, TrendingUp, Users, Wallet, X } from "lucide-react";
import { useState } from "react";
import { CATEGORIES, STORES, inr, type CategoryDef } from "@/lib/data";
import { blip, useOSB } from "@/lib/osb-store";
import { cn } from "@/lib/cn";
import { AreaGraph, Img, SectionHead } from "./ui";

const TABS = [
  { k: "overview", t: "Overview", i: LayoutGrid },
  { k: "providers", t: "Providers", i: Building2 },
  { k: "catalog", t: "Catalog", i: LineChart },
  { k: "finance", t: "Finance", i: Wallet },
  { k: "risk", t: "Risk", i: ShieldAlert },
  { k: "cms", t: "CMS", i: Globe2 },
];

const CITY_ROWS = [
  { c: "Bengaluru", o: "18,204", r: 984000, g: 32, p: 842 },
  { c: "Hyderabad", o: "11,870", r: 612000, g: 24, p: 517 },
  { c: "Pune", o: "8,430", r: 438000, g: 19, p: 396 },
  { c: "Delhi NCR", o: "6,120", r: 355000, g: 14, p: 331 },
  { c: "Jaipur", o: "3,577", r: 188000, g: 11, p: 212 },
];

export function AdminPanel() {
  const { set } = useOSB();
  const [tab, setTab] = useState("overview");
  return (
    <div className="app-bg pb-44">
      {/* header */}
      <div className="relative overflow-hidden bg-[#0B0B0F] px-4 pb-4 pt-5 text-white">
        <div className="blob-drift absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#7C5CFF]/30 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[18px] font-black text-black">◈</div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight">Global Admin <span className="rounded-md bg-[#F8CB46] px-1.5 py-[1px] text-[9px] font-black uppercase tracking-wider text-black">CEO</span></div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/55"><span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> Full control • marketplace live • no app update needed</div>
          </div>
          <button className="relative grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Bell size={17} /><span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#FF5C69] text-[9px] font-black">7</span></button>
          <button onClick={() => { set({ mode: "customer", tab: "home" }); blip(500); }} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><LogOut size={16} /></button>
        </div>
        <div className="relative mt-3 flex items-center gap-2 rounded-[12px] bg-white/10 px-3 py-2.5">
          <Search size={15} className="opacity-60" />
          <span className="text-[12.5px] font-medium text-white/50">Search providers, orders, payouts, users…</span>
        </div>
        {/* tabs */}
        <div className="no-scrollbar relative mt-3 flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => {
            const I = t.i;
            const on = tab === t.k;
            return (
              <button key={t.k} onClick={() => { setTab(t.k); blip(660); }} className={cn("relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-extrabold transition-colors", on ? "text-black" : "text-white/60")}>
                {on && <motion.span layoutId="admtab" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                <I size={13} className="relative" /><span className="relative">{t.t}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24 }}>
          {tab === "overview" && <Overview />}
          {tab === "providers" && <Providers />}
          {tab === "catalog" && <Catalog />}
          {tab === "finance" && <Finance />}
          {tab === "risk" && <Risk />}
          {tab === "cms" && <Cms />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Kpi({ l, v, d, up, accent }: { l: string; v: string; d: string; up?: boolean; accent: string }) {
  return (
    <div className="card rounded-[16px] p-3.5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-ink3">{l}</span>
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
      </div>
      <div className="mt-1 text-[21px] font-extrabold leading-none tracking-tight">{v}</div>
      <div className={cn("mt-1 flex items-center gap-0.5 text-[11px] font-extrabold", up === false ? "text-[#E23744]" : "text-green")}>
        {up === false ? "▼" : <ArrowUpRight size={12} />} {d}
      </div>
    </div>
  );
}

function Overview() {
  return (
    <div className="space-y-3 px-4 pt-3">
      <div className="grid grid-cols-2 gap-2.5">
        <Kpi l="MRR" v="₹24.1L" d="+12.4% MoM" accent="#7C5CFF" />
        <Kpi l="Orders today" v="48,201" d="+8.1%" accent="#0C831F" />
        <Kpi l="Active providers" v="2,204" d="+64 this week" accent="#1573FF" />
        <Kpi l="Take rate" v="₹0" d="Subscription only" accent="#E8830C" />
      </div>

      <div className="card rounded-[18px] p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div><div className="text-[13.5px] font-extrabold">Platform GMV</div><div className="text-[11.5px] font-medium text-ink3">Last 7 days • ₹2.4 Cr</div></div>
          <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-1 text-[11px] font-black text-green"><TrendingUp size={12} /> +32%</span>
        </div>
        <AreaGraph values={[30, 42, 38, 55, 62, 84, 96]} color="#7C5CFF" height={96} />
        <div className="flex justify-between text-[10px] font-black text-ink3">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (<span key={i}>{d}</span>))}</div>
      </div>

      <div className="card rounded-[18px] p-4 shadow-card">
        <SectionHead title="Category split" sub={`${CATEGORIES.length} live categories`} />
        <div className="mt-3 space-y-2.5">
          {CATEGORIES.slice(0, 6).map((c, i) => {
            const pct = [34, 28, 12, 9, 8, 9][i];
            return (
              <div key={c.k} className="flex items-center gap-2.5">
                <span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg"><Img src={c.img} alt={c.t} className="h-full w-full" /></span>
                <span className="w-[74px] shrink-0 text-[11.5px] font-extrabold">{c.t}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full chip">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${pct * 2.6}%` }} transition={{ duration: 0.9, delay: i * 0.06 }} className="block h-full rounded-full" style={{ background: c.accent }} />
                </span>
                <span className="w-9 shrink-0 text-right text-[11px] font-black tabular-nums">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card overflow-hidden rounded-[18px] shadow-card">
        <div className="flex items-center justify-between p-4 pb-2"><span className="text-[13.5px] font-extrabold">City performance</span><span className="text-[11px] font-black brand-red">Export ›</span></div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 px-4 pb-1 text-[9.5px] font-black uppercase tracking-wider text-ink3"><span>City</span><span className="text-right">Orders</span><span className="text-right">Revenue</span><span className="text-right">Growth</span></div>
        {CITY_ROWS.map((r) => (
          <div key={r.c} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2 border-t divide-line px-4 py-2.5 text-[12px]">
            <span className="font-extrabold">{r.c}<span className="block text-[10px] font-semibold text-ink3">{r.p} providers</span></span>
            <span className="text-right font-bold tabular-nums">{r.o}</span>
            <span className="text-right font-bold tabular-nums">{inr(r.r)}</span>
            <span className="text-right font-black text-green tabular-nums">+{r.g}%</span>
          </div>
        ))}
      </div>

      <div className="card rounded-[18px] p-4 shadow-card">
        <div className="flex items-center gap-2 text-[13px] font-extrabold"><Activity size={15} /> Live monitoring</div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {[["API latency", "128 ms", "#0C831F"], ["Payment success", "99.2%", "#0C831F"], ["Order failures", "0.4%", "#E8830C"], ["Open tickets", "23", "#1573FF"]].map(([l, v, c]) => (
            <div key={l} className="card-2 rounded-[12px] p-2.5"><div className="text-[10px] font-bold text-ink3">{l}</div><div className="text-[15px] font-extrabold" style={{ color: c }}>{v}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Providers() {
  const [f, setF] = useState("all");
  const list = STORES.filter((s) => (f === "all" ? true : f === "top" ? s.rating >= 4.7 : s.healthScore < 91));
  return (
    <div className="space-y-3 px-4 pt-3">
      <div className="flex gap-2">
        {[["all", "All 2,418"], ["top", "Top rated"], ["risk", "Needs help"]].map(([k, t]) => (
          <button key={k} onClick={() => { setF(k); blip(620); }} className={cn("rounded-full px-3.5 py-2 text-[11.5px] font-extrabold", f === k ? "bg-black text-white" : "card text-ink2")}>{t}</button>
        ))}
      </div>
      <div className="card overflow-hidden rounded-[18px] shadow-card">
        {list.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-2.5 border-b divide-line px-3 py-3 last:border-0">
            <span className="w-4 text-[11px] font-black text-ink3">{i + 1}</span>
            <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl"><Img src={s.image} alt={s.name} className="h-full w-full" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-extrabold">{s.name}</span>
              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink3">
                <span className="flex items-center gap-0.5"><Star size={9} fill="currentColor" className="text-[#E8830C]" />{s.rating}</span>• {s.kind} • {s.address.split(" ")[0]}
              </span>
              <span className="mt-1 flex items-center gap-1">
                <span className="h-1.5 w-16 overflow-hidden rounded-full chip"><span className="block h-full rounded-full" style={{ width: `${s.healthScore}%`, background: s.healthScore >= 93 ? "#0C831F" : s.healthScore >= 89 ? "#E8830C" : "#E23744" }} /></span>
                <span className="text-[9.5px] font-black text-ink3">{s.healthScore} health</span>
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[12.5px] font-extrabold">{inr(21000 - i * 1200)}</span>
              <span className="block text-[9.5px] font-bold text-green">Pro • active</span>
            </span>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([["Approve", CheckCircle2, "#0C831F", "14 pending"], ["Suspend", Ban, "#E23744", "2 flagged"], ["Audit", Eye, "#1573FF", "log trail"]] as const).map(([t, Ic, c, s]) => (
          <button key={t} className="card rounded-[14px] p-3 text-center shadow-card"><Ic size={18} className="mx-auto" style={{ color: c }} /><div className="mt-1 text-[11.5px] font-extrabold">{t}</div><div className="text-[9.5px] font-semibold text-ink3">{s}</div></button>
        ))}
      </div>
    </div>
  );
}

function Catalog() {
  const { catRequests, approveRequest, rejectRequest, addCategory, toggleCategoryVisible, extraCategories, hiddenCategories } = useOSB();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [sub, setSub] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [accent, setAccent] = useState("#7C5CFF");
  const pending = catRequests.filter((r) => r.status === "pending");
  const all = [...CATEGORIES, ...extraCategories];
  const create = () => {
    if (!name.trim()) return;
    const c: CategoryDef = { k: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28), t: name.trim(), sub: sub.trim() || "New on Bazar", img: "", kinds: [], accent, eta: "Soon", emoji, subs: [], dynamic: true, featured: true };
    addCategory(c);
    blip(920, 0.15);
    setName(""); setSub(""); setCreating(false);
  };
  return (
    <div className="space-y-3 px-4 pt-3">
      {/* requests */}
      <div className="card rounded-[18px] p-4 shadow-card">
        <div className="flex items-center justify-between">
          <SectionHead title="Category requests" sub="From local providers" />
          <span className="rounded-full bg-[#7C5CFF] px-2.5 py-1 text-[11px] font-black text-white">{pending.length} new</span>
        </div>
        <div className="mt-2.5 space-y-2">
          {pending.length === 0 && <div className="rounded-[12px] card-2 p-4 text-center text-[12px] font-semibold text-ink3">All caught up ✓ — providers’ requests appear here live.</div>}
          {pending.map((r) => (
            <motion.div key={r.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-[14px] border-2 border-dashed border-[#7C5CFF]/45 bg-[#7C5CFF]/8 p-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-lg shadow-sm">{r.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-extrabold">“{r.category}” <span className="font-semibold text-ink3">for {r.productName}</span></div>
                  <div className="line-clamp-1 text-[11px] text-ink3">{r.description}</div>
                  <div className="mt-0.5 text-[10px] font-bold text-[#7C5CFF]">Requested by {r.storeName}{r.parent ? ` • under ${r.parent}` : ""}</div>
                </div>
              </div>
              <div className="mt-2.5 flex gap-2">
                <button onClick={() => { approveRequest(r.id); blip(960, 0.15); }} className="flex flex-1 items-center justify-center gap-1 rounded-[10px] bg-[#0C831F] py-2.5 text-[12px] font-black text-white"><Check size={14} /> Approve & publish</button>
                <button onClick={() => { rejectRequest(r.id); blip(420, 0.1); }} className="flex items-center justify-center gap-1 rounded-[10px] card-2 px-3.5 py-2.5 text-[12px] font-black text-[#E23744]"><X size={14} /> Decline</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* create */}
      <div className="card rounded-[18px] p-4 shadow-card">
        <button onClick={() => setCreating(!creating)} className="flex w-full items-center gap-3 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#111] text-white" style={{ background: "var(--ink)", color: "var(--app)" }}><Plus size={18} strokeWidth={3} /></span>
          <span className="flex-1"><span className="block text-[13.5px] font-extrabold">Create category</span><span className="block text-[11px] text-ink3">Appears in app instantly — no APK update, no dev</span></span>
          <ChevronRight size={16} className={cn("opacity-40 transition-transform", creating && "rotate-90")} />
        </button>
        <AnimatePresence>
          {creating && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 space-y-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name e.g. Pet Supplies" className="w-full rounded-[12px] card-2 px-3.5 py-3 text-[13px] font-semibold placeholder:text-ink3" />
                <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Tagline e.g. Food, toys & grooming" className="w-full rounded-[12px] card-2 px-3.5 py-3 text-[13px] font-semibold placeholder:text-ink3" />
                <div className="flex items-center gap-2">
                  {["✨", "🐾", "🚗", "🧘", "🎸", "🧩", "🪴", "👜"].map((e) => (
                    <button key={e} onClick={() => setEmoji(e)} className={cn("grid h-9 w-9 place-items-center rounded-xl text-lg", emoji === e ? "bg-[#7C5CFF] text-white" : "card-2")}>{e}</button>
                  ))}
                  <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-12 cursor-pointer rounded-xl border-0 bg-transparent p-0" />
                </div>
                <button onClick={create} className="w-full rounded-[12px] bg-[#0C831F] py-3.5 text-[13px] font-black text-white">Publish category live</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* taxonomy list */}
      <div className="card overflow-hidden rounded-[18px] shadow-card">
        <div className="flex items-center justify-between p-4 pb-2"><span className="text-[13.5px] font-extrabold">Taxonomy ({all.length})</span><span className="text-[10.5px] font-bold text-ink3">Tap eye to hide in app</span></div>
        {all.map((c) => {
          const hidden = hiddenCategories.includes(c.k);
          const stores = STORES.filter((s) => c.kinds.includes(s.kind)).length;
          return (
            <div key={c.k} className="flex items-center gap-2.5 border-t divide-line px-3 py-2.5">
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">{c.img ? <Img src={c.img} alt={c.t} className="h-full w-full" /> : <span className="grid h-full w-full place-items-center text-base" style={{ background: `${c.accent}18` }}>{c.emoji}</span>}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold">{c.t} {c.dynamic && <span className="rounded-md bg-[#7C5CFF] px-1.5 py-[1px] text-[8.5px] font-black uppercase text-white">CEO-added</span>}</span>
                <span className="block text-[10px] text-ink3">{c.subs.length} subcategories • {stores} stores{hidden && " • hidden"}</span>
              </span>
              <button onClick={() => { toggleCategoryVisible(c.k); blip(hidden ? 760 : 480); }} className={cn("grid h-8 w-8 place-items-center rounded-lg", hidden ? "card-2 text-ink3" : "bg-[#0C831F]/12 text-[#0C831F]")}>{hidden ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
          );
        })}
      </div>

      <div className="card rounded-[18px] p-4 shadow-card">
        <SectionHead title="Attribute templates" sub="Auto-applied per category" />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {["Electronics → Brand, Warranty, Color", "Fashion → Size, Color, Fit", "Grocery → Weight, Brand, Veg", "Furniture → Material, Dimensions"].map((t) => (
            <span key={t} className="rounded-full card-2 px-3 py-1.5 text-[10.5px] font-bold">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Finance() {
  return (
    <div className="space-y-3 px-4 pt-3">
      <div className="relative overflow-hidden rounded-[18px] bg-[#111117] p-4 text-white">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#7C5CFF]/30 blur-2xl" />
        <div className="relative text-[10.5px] font-black uppercase tracking-[0.18em] text-white/50">Subscription revenue</div>
        <div className="relative mt-1 text-[32px] font-extrabold leading-none">₹24,18,400</div>
        <div className="relative mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-black text-emerald-300"><ArrowUpRight size={12} /> +12.4% vs last month</div>
        <div className="relative mt-3 grid grid-cols-3 gap-2">
          {[["Basic ₹499", "612"], ["Growth ₹999", "1,284"], ["Scale ₹2499", "308"]].map(([p, n]) => (
            <div key={p} className="rounded-xl bg-white/8 p-2.5"><div className="text-[9.5px] font-bold text-white/55">{p}</div><div className="text-[15px] font-extrabold">{n}</div></div>
          ))}
        </div>
      </div>
      <div className="card rounded-[18px] p-4 shadow-card">
        <div className="text-[13px] font-extrabold">Settlements queue</div>
        <div className="mt-2.5 space-y-2">
          {[["Meghana Foods", "₹1,84,200", "Processing", "#E8830C"], ["FreshKart Daily", "₹96,400", "Settled", "#0C831F"], ["Glow Salon", "₹64,100", "Settled", "#0C831F"], ["Volt Electronics", "₹41,800", "On hold", "#E23744"]].map(([n, a, st, c]) => (
            <div key={n} className="card-2 flex items-center gap-2.5 rounded-[12px] p-2.5">
              <CreditCard size={16} style={{ color: c }} />
              <span className="flex-1 text-[12px] font-extrabold">{n}</span>
              <span className="text-[12px] font-extrabold tabular-nums">{a}</span>
              <span className="rounded-full px-2 py-0.5 text-[9.5px] font-black text-white" style={{ background: c }}>{st}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card rounded-[18px] p-4 shadow-card">
        <div className="flex items-center justify-between"><span className="text-[13px] font-extrabold">Churn & renewals</span><span className="text-[11px] font-black text-green">94% retained</span></div>
        <AreaGraph values={[88, 90, 89, 92, 93, 94, 94]} color="#0C831F" height={80} />
      </div>
    </div>
  );
}

function Risk() {
  const items = [
    { e: ShieldAlert, t: "Refund spike — Spice Route Mart", s: "14 refunds/hr • possible pricing bug", a: "Hold payout", c: "#E23744" },
    { e: AlertTriangle, t: "Rating dip — FixIt Home Pros", s: "4.9 → 4.6 • 3 late arrivals today", a: "Nudge", c: "#E8830C" },
    { e: CreditCard, t: "2 failed UPI settlements", s: "₹4,120 stuck • retry queued", a: "Retry", c: "#1573FF" },
    { e: Users, t: "Duplicate GST detected", s: "2 provider accounts, same PAN", a: "Review", c: "#7C5CFF" },
  ];
  return (
    <div className="space-y-3 px-4 pt-3">
      <div className="grid grid-cols-3 gap-2">
        {[["Open flags", "7", "#E23744"], ["Auto-held", "₹1.2L", "#E8830C"], ["Resolved 7d", "38", "#0C831F"]].map(([l, v, c]) => (
          <div key={l} className="card rounded-[14px] p-3 text-center shadow-card"><div className="text-[9.5px] font-black uppercase tracking-wider text-ink3">{l}</div><div className="mt-0.5 text-[18px] font-extrabold" style={{ color: c }}>{v}</div></div>
        ))}
      </div>
      {items.map((it, i) => {
        const I = it.e;
        return (
          <motion.div key={it.t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card flex items-center gap-3 rounded-[16px] p-3.5 shadow-card">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${it.c}18` }}><I size={18} style={{ color: it.c }} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-extrabold">{it.t}</span><span className="block truncate text-[11px] text-ink3">{it.s}</span></span>
            <span className="shrink-0 rounded-full px-3 py-2 text-[10.5px] font-black text-white" style={{ background: it.c }}>{it.a}</span>
          </motion.div>
        );
      })}
      <div className="card rounded-[16px] p-4 shadow-card">
        <div className="flex items-center gap-2 text-[12.5px] font-extrabold"><ShieldCheck size={15} className="text-green" /> Fraud engine</div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink2">ML scoring on refunds, velocity, device fingerprint & GST duplication. 3 rules triggered today, 0 false positives this week.</p>
      </div>
    </div>
  );
}

function Cms() {
  return (
    <div className="space-y-3 px-4 pt-3">
      <div className="card rounded-[18px] p-4 shadow-card">
        <SectionHead title="Categories" sub="Toggle live on the customer app" />
        <div className="mt-3 space-y-2">
          {CATEGORIES.map((c, i) => (
            <div key={c.k} className="card-2 flex items-center gap-2.5 rounded-[12px] p-2.5">
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg"><Img src={c.img} alt={c.t} className="h-full w-full" /></span>
              <span className="flex-1"><span className="block text-[12px] font-extrabold">{c.t}</span><span className="block text-[10px] text-ink3">{c.sub} • {c.eta}</span></span>
              <span className={cn("flex h-5 w-9 items-center rounded-full p-0.5", i < 8 ? "justify-end bg-green" : "justify-start chip")}><span className="h-4 w-4 rounded-full bg-white shadow" /></span>
            </div>
          ))}
        </div>
      </div>
      <div className="card rounded-[18px] p-4 shadow-card">
        <SectionHead title="Home banners" sub="Live on 2.4L devices" />
        <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
          {STORES.slice(0, 5).map((s) => (
            <div key={s.id} className="relative h-[78px] w-[130px] shrink-0 overflow-hidden rounded-[12px]">
              <Img src={s.image} alt={s.name} className="h-full w-full" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-4 text-[9.5px] font-black text-white">{s.offers[0]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card overflow-hidden rounded-[18px] shadow-card">
        {[["🏙️", "Cities & zones", "18 live • 4 pending"], ["🎟️", "Coupons engine", "24 active codes"], ["🔔", "Push campaigns", "3 scheduled today"], ["📜", "Policies & legal", "Updated 2 Oct"], ["👤", "Roles & permissions", "6 admins • 2 analysts"]].map(([e, t, s]) => (
          <button key={t} className="flex w-full items-center gap-3 border-b divide-line px-4 py-3.5 text-left last:border-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl chip text-[17px]">{e}</span>
            <span className="flex-1"><span className="block text-[12.5px] font-extrabold">{t}</span><span className="block text-[10.5px] text-ink3">{s}</span></span>
            <ChevronRight size={15} className="opacity-35" />
          </button>
        ))}
      </div>
    </div>
  );
}
