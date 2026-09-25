"use client";
import { AnimatePresence, motion } from "framer-motion";
import { BadgePercent, Bell, ChevronRight, Clock, Copy, Heart, MapPin, Mic, Moon, Pencil, ScanSearch, Search, Sparkles, Star, Sun, Ticket, Truck, Wallet, Zap, Bike, ChevronDown, Leaf } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, CATS, COUPONS, PRODUCTS, STORES, TRENDING, greetingForHour, inr, type CategoryDef } from "@/lib/data";
import { blip, useMarketplace, useOSB } from "@/lib/osb-store";
import { statusLabel } from "@/lib/commerce";
import { EditProfileSheet } from "./profile-setup";
import { ChangeLocationSheet } from "./location-setup";
import { cn } from "@/lib/cn";
import { AddStepper, Glass, Img, Rating, SectionHead, VegMark } from "./ui";

function useGreeting() {
  const h = new Date().getHours();
  return greetingForHour(h);
}

export function CustomerHome({ onStore }: { onStore: (id: string) => void }) {
  const { set, query, category, userName, userAvatar, addressArea, address } = useOSB();
  const g = useGreeting();
  const dark = useOSB((s) => s.dark);
  const [banner, setBanner] = useState(0);
  const [locOpen, setLocOpen] = useState(false);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setBanner((b) => {
        const next = (b + 1) % 3;
        const el = bannerRef.current;
        if (el) {
          const card = el.children[next] as HTMLElement | undefined;
          if (card) el.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
        }
        return next;
      });
    }, 3800);
    return () => clearInterval(t);
  }, []);

  const { stores, products } = useMarketplace();
  const extraCategories = useOSB((s) => s.extraCategories);
  const hiddenCategories = useOSB((s) => s.hiddenCategories);
  const allCats = useMemo<CategoryDef[]>(() => [...CATEGORIES, ...extraCategories].filter((c) => !hiddenCategories.includes(c.k)), [extraCategories, hiddenCategories]);
  const activeCat = allCats.find((c) => c.k === category) ?? null;

  const filtered = useMemo(() => {
    return stores.filter((s) => {
      const okCat = !activeCat ? true : activeCat.kinds.includes(s.kind);
      const q = query.trim().toLowerCase();
      if (!q) return okCat;
      return okCat && (s.name.toLowerCase().includes(q) || s.tags.join(" ").toLowerCase().includes(q) || products.some((p) => p.storeId === s.id && p.name.toLowerCase().includes(q)));
    });
  }, [query, activeCat, stores, products]);

  const catStoreIds = new Set(filtered.map((s) => s.id));
  const quickPicks = activeCat
    ? products.filter((p) => catStoreIds.has(p.storeId)).slice(0, 12)
    : products.filter((p) => ["Vegetables", "Fruits", "Dairy", "Staples", "Bakery", "Sweets", "Ice Cream", "Pharmacy"].includes(p.category)).slice(0, 12);
  const grocery = quickPicks;
  const restList = filtered.slice(0, 10);

  const banners = [
    { img: STORES[0].image, tag: "MEGHANA FEST", title: "50% OFF Biryani", sub: "Code BAZAR50 • Free delivery", cta: "Order now", grad: "linear-gradient(90deg, rgba(10,10,10,.78) 20%, rgba(10,10,10,.15) 70%, transparent)" },
    { img: STORES[4].image, tag: "FRESH AT 6 AM", title: "Veggies in 12 mins", sub: "Farm direct • 20% OFF", cta: "Shop fresh", grad: "linear-gradient(90deg, rgba(14,59,46,.85) 20%, rgba(14,59,46,.15) 70%, transparent)" },
    { img: STORES[9].image, tag: "GLOW AT HOME", title: "Salon @ ₹1499", sub: "O3+ facial • 4.9★ pros", cta: "Book now", grad: "linear-gradient(90deg, rgba(60,20,60,.8) 20%, rgba(60,20,60,.1) 70%, transparent)" },
  ];

  return (
    <div className="app-bg pb-40 ">
      {/* ── Zomato-style header ── */}
      <div className="sticky top-0 z-30 surface pb-2 backdrop-blur-xl ">
        <div className="flex items-center gap-2.5 px-4 pt-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFE9E9] text-[17px]">📍</span>
            <button onClick={() => { setLocOpen(true); blip(560); }} className="min-w-0 flex-1 text-left">
              <span className="flex items-center gap-1 text-[14.5px] font-extrabold leading-none tracking-tight">
                <span className="truncate max-w-[150px]">{addressArea || "Set location"}</span> <ChevronDown size={15} strokeWidth={2.8} className="shrink-0" />
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] font-medium text-ink3">{address || "Tap to add delivery address"}</span>
            </button>
          </div>
          <button onClick={() => set({ tab: "profile" })} className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#0E3B2E] to-[#1FB67C] text-[17px] font-black text-white">
            {userAvatar || (userName ? userName[0].toUpperCase() : "👤")}
          </button>
          <button onClick={() => { set({ dark: !dark }); blip(700); }} className="grid h-10 w-10 place-items-center rounded-full chip">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
        </div>
        {/* search — Swiggy style */}
        <div className="px-4 pt-2.5">
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => set({ tab: "search" })} className="flex w-full items-center gap-2.5 rounded-[14px] card px-3.5 py-3 text-left shadow-[0_2px_12px_rgba(0,0,0,.06)] ">
            <Search size={18} className="shrink-0 text-[#E23744]" strokeWidth={2.6} />
            <span className="flex-1 truncate text-[13.5px] font-medium text-ink3">Search “biryani”, “A2 milk”, “plumber”…</span>
            <span className="h-5 w-px bg-black/10" />
            <Mic size={17} className="text-ink2" />
            <ScanSearch size={17} className="text-ink2" />
          </motion.button>
        </div>
      </div>

      {/* greeting strip */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div>
          <h1 className="text-[19px] font-extrabold tracking-tight">{g.label}, {userName || "there"} 👋</h1>
          <p className="text-[12px] font-medium text-ink2">{g.sub} • <span className="font-bold text-[#0C831F]">12 min</span> fastest</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#0E3B2E] px-2.5 py-1.5 text-[10.5px] font-extrabold text-[#D8F34E]"><span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> LIVE</span>
      </div>

      {/* ── multi-category grid (2 rows • see all) ── */}
      <div className="px-4 pt-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[13px] font-extrabold tracking-tight">Explore {allCats.length} categories</span>
          {activeCat && <button onClick={() => { set({ category: "all" }); blip(480); }} className="text-[11.5px] font-extrabold brand-red">Clear ✕</button>}
        </div>
        <div className="grid grid-cols-5 gap-x-2 gap-y-3">
          {allCats.slice(0, 9).map((c, i) => {
            const on = category === c.k;
            return (
              <motion.button
                key={c.k}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.035, 0.3) }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { set({ category: on ? "all" : c.k }); blip(600 + i * 25); }}
                className="flex flex-col items-center gap-1.5"
              >
                <span className="relative block h-[58px] w-[58px] overflow-hidden rounded-[18px] shadow-[0_6px_16px_rgba(0,0,0,.12)] transition-all" style={{ outline: on ? `2.5px solid ${c.accent}` : "none", outlineOffset: 2 }}>
                  <Img src={c.img} alt={c.t} className="h-full w-full" eager={i < 5} />
                  <span className="absolute inset-0" style={{ background: on ? `linear-gradient(180deg, transparent, ${c.accent}CC)` : "linear-gradient(180deg, transparent 55%, rgba(0,0,0,.35))" }} />
                  {on && <span className="tick absolute bottom-1 right-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] font-black" style={{ color: c.accent }}>✓</span>}
                </span>
                <span className={cn("text-[10.5px] font-extrabold leading-none", on ? "" : "text-ink2")} style={on ? { color: c.accent } : undefined}>{c.t}</span>
              </motion.button>
            );
          })}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { set({ tab: "cats" }); blip(680); }}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="relative grid h-[58px] w-[58px] place-items-center rounded-[18px] chip shadow-[0_6px_16px_rgba(0,0,0,.1)]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#E23744] text-white"><ChevronRight size={16} strokeWidth={3} /></span>
            </span>
            <span className="text-[10.5px] font-extrabold leading-none text-ink2">See all</span>
          </motion.button>
        </div>
      </div>

      {/* active category banner */}
      <AnimatePresence>
        {activeCat && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-4 pt-3">
            <div className="flex items-center gap-3 rounded-[16px] p-3" style={{ background: `${activeCat.accent}15`, border: `1px solid ${activeCat.accent}35` }}>
              <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl"><Img src={activeCat.img} alt={activeCat.t} className="h-full w-full" /></span>
              <span className="flex-1"><span className="block text-[13.5px] font-extrabold" style={{ color: activeCat.accent }}>{activeCat.t} • {filtered.length} stores</span><span className="block text-[11.5px] font-medium text-ink2">{activeCat.sub} • avg {activeCat.eta}</span></span>
              <span className="rounded-full px-2.5 py-1 text-[10.5px] font-black text-white" style={{ background: activeCat.accent }}>⚡ {activeCat.eta}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* banner carousel — Swiggy style */}
      <div className="pt-3">
        <div
          ref={bannerRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth px-4"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
          onScroll={(e) => {
            const el = e.currentTarget;
            const card = el.children[0] as HTMLElement | undefined;
            const step = card ? card.offsetWidth + 10 : el.clientWidth * 0.88;
            setBanner(Math.round(el.scrollLeft / step));
          }}
        >
          {banners.map((b, i) => (
            <motion.div key={i} whileTap={{ scale: 0.97 }} className="relative h-[148px] w-[88%] shrink-0 snap-center overflow-hidden rounded-[20px]" style={{ scrollSnapAlign: "center" }}>
              <Img src={b.img} alt={b.title} className="absolute inset-0 h-full w-full" eager={i === 0} />
              <div className="absolute inset-0" style={{ background: b.grad }} />
              <div className="absolute inset-y-0 left-0 flex w-[62%] flex-col justify-center p-4">
                <span className="w-fit rounded-md bg-[#D8F34E] px-2 py-[3px] text-[10px] font-black tracking-widest text-black">{b.tag}</span>
                <div className="font-display mt-1.5 text-[24px] font-bold leading-[1.02] text-white">{b.title}</div>
                <div className="mt-0.5 text-[12px] font-semibold text-white/80">{b.sub}</div>
                <span className="mt-2 w-fit rounded-full bg-white px-3.5 py-1.5 text-[11.5px] font-extrabold text-black">{b.cta} →</span>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setBanner(i);
                const el = bannerRef.current;
                const card = el?.children[i] as HTMLElement | undefined;
                if (el && card) el.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
              }}
              className={cn("h-1.5 rounded-full transition-all", i === banner ? "w-6 bg-[#0E3B2E]" : "w-1.5 bg-black/15")}
            />
          ))}
        </div>
      </div>

      {/* Blinkit-style circles */}
      <div className="pt-3">
        <div className="px-4"><SectionHead title="Shop by craving" sub="Blinkit-fast • Zomato-tasty" action={<span className="text-[12px] font-extrabold text-[#E23744]">see all ›</span>} /></div>
        <div className="no-scrollbar mt-2.5 flex gap-3 overflow-x-auto px-4 pb-1">
          {CATS.map((c, i) => (
            <motion.button key={c.k} initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }} whileTap={{ scale: 0.9 }} onClick={() => set({ query: c.t, tab: "search" })} className="w-[68px] shrink-0 text-center">
              <div className="h-[68px] w-[68px] overflow-hidden rounded-[22px] card shadow-[0_6px_16px_rgba(0,0,0,.08)]">
                <Img src={c.img} alt={c.t} className="h-full w-full transition-transform hover:scale-110" />
              </div>
              <div className="mt-1.5 text-[11px] font-extrabold leading-none">{c.t}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Blinkit essentials */}
      <div className="pt-4">
        <div className="px-4"><SectionHead title={activeCat ? `Top picks in ${activeCat.t}` : "⚡ Essentials in minutes"} sub={activeCat ? `${quickPicks.length} items • delivered by local stores` : "From FreshKart • Milk & More • MediCare"} action={<span className="rounded-full px-2.5 py-1 text-[11px] font-black text-white" style={{ background: activeCat?.accent ?? "#0C831F" }}>{activeCat?.eta ?? "12 MIN"}</span>} /></div>
        <div className="no-scrollbar mt-2.5 flex gap-2.5 overflow-x-auto px-4 pb-4">
          {grocery.map((p, i) => (<BlinkitCard key={p.id} pid={p.id} index={i} />))}
        </div>
      </div>

      {/* offer strip */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
        {["50% OFF up to ₹100", "Free delivery over ₹199", "20% cashback", "₹200 OFF services"].map((t) => (
          <span key={t} className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-[#0E3B2E]/30 bg-[#D8F34E]/25 px-3 py-1.5 text-[11.5px] font-extrabold text-[#0E3B2E]"><BadgePercent size={13} /> {t}</span>
        ))}
      </div>

      {/* active category feed */}
      {activeCat && (
        <div className="px-4 pt-4">
          <SectionHead title={`${activeCat.t} near you`} sub={`${restList.length} places • delivering now`} action={<span className="text-[12px] font-extrabold brand-red">Sort ▾</span>} />
          <div className="mt-3 space-y-4">
            <AnimatePresence mode="popLayout">
              {restList.map((s, i) => (<ZomatoCard key={s.id} id={s.id} index={i} onOpen={() => onStore(s.id)} />))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* every category represented on home */}
      {!activeCat && <CategoryRails cats={allCats} onStore={onStore} />}

      {/* festive */}
      <div className="px-4 pt-5">
        <div className="relative overflow-hidden rounded-[22px]">
          <Img src={STORES[7].image} alt="festive" className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4A0E2E]/92 via-[#4A0E2E]/55 to-transparent" />
          <div className="relative p-5 text-white">
            <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.18em] text-[#FFD166]"><Sparkles size={12} /> Diwali edit is live</div>
            <div className="font-display mt-1 text-[21px] font-bold leading-tight">Sweets, diyas & gifts<br />from 14 local shops 🪔</div>
            <div className="mt-3 flex gap-2"><span className="rounded-full bg-white px-3.5 py-2 text-[11.5px] font-black text-black">Shop festive</span><span className="rounded-full bg-white/20 px-3.5 py-2 text-[11.5px] font-bold backdrop-blur">Send gift</span></div>
          </div>
        </div>
      </div>

      <AnimatePresence>{locOpen && <ChangeLocationSheet onClose={() => setLocOpen(false)} />}</AnimatePresence>
    </div>
  );
}

/* ── One rail per category on home ── */
export function CategoryRails({ cats, onStore }: { cats: CategoryDef[]; onStore: (id: string) => void }) {
  const { set } = useOSB();
  const { stores: allStores, products: allProducts } = useMarketplace();
  return (
    <>
      {cats.map((c) => {
        const stores = allStores.filter((s) => c.kinds.includes(s.kind)).slice(0, 6);
        const ids = new Set(stores.map((s) => s.id));
        const products = allProducts.filter((p) => ids.has(p.storeId)).slice(0, 8);
        return (
          <div key={c.k} className="pt-5">
            <button onClick={() => set({ category: c.k })} className="flex w-full items-center justify-between px-4">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 overflow-hidden rounded-xl ring-1 ring-black/8" style={{ boxShadow: `0 6px 14px ${c.accent}33` }}>
                  {c.img ? <Img src={c.img} alt={c.t} className="h-full w-full" /> : <span className="grid h-full w-full place-items-center text-[18px]" style={{ background: `${c.accent}18` }}>{c.emoji}</span>}
                </span>
                <span className="text-left">
                  <span className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight">{c.t} {c.dynamic && <span className="rounded-md bg-[#7C5CFF] px-1.5 py-[1px] text-[8.5px] font-black uppercase tracking-wide text-white">New</span>}</span>
                  <span className="block text-[11px] font-medium text-ink3">{stores.length} stores • ⚡ {c.eta}</span>
                </span>
              </div>
              <span className="flex items-center gap-0.5 text-[11.5px] font-extrabold" style={{ color: c.accent }}>See all <ChevronRight size={13} /></span>
            </button>
            <div className="no-scrollbar mt-2.5 flex gap-2.5 overflow-x-auto px-4">
              {stores.map((s) => (
                <motion.button key={s.id} whileTap={{ scale: 0.95 }} onClick={() => onStore(s.id)} className="w-[152px] shrink-0 overflow-hidden rounded-[16px] card text-left shadow-card">
                  <div className="relative h-[92px]">
                    <Img src={s.image} alt={s.name} className="h-full w-full" />
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/68 px-1.5 py-[2px] text-[9px] font-black text-white backdrop-blur">⚡ {s.etaMins} MINS</span>
                    {s.offers[0] && <span className="absolute left-1.5 top-1.5 rounded-md px-1.5 py-[2px] text-[8.5px] font-black text-white" style={{ background: c.accent }}>OFFER</span>}
                  </div>
                  <div className="p-2.5">
                    <div className="truncate text-[12.5px] font-extrabold">{s.name}</div>
                    <div className="truncate text-[10px] font-medium text-ink3">{s.tagline}</div>
                    <div className="mt-1 flex items-center gap-1"><Rating v={s.rating} /><span className="text-[10px] font-bold text-ink3">{s.distanceKm} km</span></div>
                  </div>
                </motion.button>
              ))}
              {products.slice(0, 4).map((p) => (<BlinkitCard key={p.id} pid={p.id} index={0} />))}
              {stores.length === 0 && (
                <div className="flex w-[170px] shrink-0 flex-col justify-center rounded-[16px] border-2 border-dashed divide-line p-4">
                  <span className="text-[26px]">{c.emoji}</span>
                  <span className="mt-1 text-[12px] font-extrabold">{c.t} soon</span>
                  <span className="text-[10.5px] text-ink3">Local stores being onboarded</span>
                </div>
              )}
              <button onClick={() => set({ category: c.k })} className="grid w-[86px] shrink-0 place-items-center rounded-[16px] card text-center shadow-card">
                <span className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: c.accent }}><ChevronRight size={17} /></span>
                <span className="mt-1.5 text-[10.5px] font-extrabold">View all</span>
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ── Blinkit product card ── */
export function BlinkitCard({ pid, index }: { pid: string; index: number }) {
  const { products, stores } = useMarketplace();
  const p = products.find((x) => x.id === pid);
  const cart = useOSB((s) => s.cart);
  const { addToCart, decCart } = useOSB();
  const qty = cart.find((c) => c.productId === pid)?.qty ?? 0;
  const store = stores.find((s) => s.id === p?.storeId);
  if (!p) return null;
  const off = p.mrp ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(index * 0.04, 0.25) }} whileTap={{ scale: 0.96 }} className="w-[138px] shrink-0 overflow-hidden rounded-[16px] card shadow-[0_4px_16px_rgba(0,0,0,.06)] ">
      <div className="relative h-[118px] bg-[#F6F6F6]">
        <Img src={p.image} alt={p.name} className="h-full w-full" />
        {off > 0 && <span className="absolute left-1.5 top-1.5 rounded-[6px] bg-[#256FEF] px-1.5 py-[2px] text-[10px] font-black text-white">{off}% OFF</span>}
        {p.isBestseller && <span className="absolute bottom-1.5 left-1.5 rounded-[6px] bg-black/65 px-1.5 py-[2px] text-[9px] font-black uppercase tracking-wide text-white backdrop-blur">★ Bestseller</span>}
      </div>
      <div className="p-2">
        <div className="flex items-center gap-1 text-[9.5px] font-extrabold text-ink3"><Clock size={10} /> {p.eta ?? "12 MINS"}</div>
        <div className="mt-0.5 line-clamp-2 min-h-[30px] text-[12px] font-bold leading-[1.25]">{p.name}</div>
        <div className="mt-0.5 text-[10.5px] font-medium text-ink3">{p.unit}</div>
        <div className="mt-1.5 flex items-end justify-between gap-1">
          <div><div className="text-[13px] font-extrabold">₹{p.price}</div>{p.mrp && <div className="text-[10.5px] font-medium text-ink3 line-through">₹{p.mrp}</div>}</div>
          <AddStepper small qty={qty} onAdd={() => addToCart({ productId: p.id, name: p.name, emoji: p.emoji, image: p.image, price: p.price, qty: 1, storeId: p.storeId, storeName: store?.name ?? "", unit: p.unit, tint: p.tint } as never)} onInc={() => addToCart({ productId: p.id, name: p.name, emoji: p.emoji, image: p.image, price: p.price, qty: 1, storeId: p.storeId, storeName: store?.name ?? "", unit: p.unit, tint: p.tint } as never)} onDec={() => decCart(p.id)} />
        </div>
      </div>
    </motion.div>
  );
}
export const FlashCard = BlinkitCard;

/* ── Zomato restaurant card ── */
export function StoreCard({ id, index, onOpen }: { id: string; index: number; onOpen: () => void }) {
  return <ZomatoCard id={id} index={index} onOpen={onOpen} />;
}

export function ZomatoCard({ id, index, onOpen }: { id: string; index: number; onOpen: () => void }) {
  const { stores } = useMarketplace();
  const s = stores.find((x) => x.id === id);
  if (!s) return null;
  const wish = useOSB((x) => x.wishlist);
  const { toggleWish } = useOSB();
  const liked = wish.includes(s.id);
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ delay: Math.min(index * 0.05, 0.3), type: "spring", stiffness: 160, damping: 20 }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="w-full overflow-hidden rounded-[20px] card text-left shadow-[0_10px_30px_rgba(0,0,0,.08)] "
    >
      <div className="relative h-[168px] bg-[#eee]">
        <Img src={s.image} alt={s.name} className="h-full w-full transition-transform duration-500 hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-[#256FEF] via-[#256FEF]/85 to-transparent px-3 pb-2 pt-8">
          <span className="flex items-center gap-1 text-[12.5px] font-extrabold text-white"><BadgePercent size={14} /> {s.offers[0]}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); toggleWish(s.id); blip(720); }} className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow pressable">
          <Heart size={17} fill={liked ? "#E23744" : "transparent"} color={liked ? "#E23744" : "#333"} />
        </button>
        {s.isPureVeg && <span className="absolute left-2.5 top-2.5 rounded-md bg-white/95 px-1.5 py-1 text-[10px] font-black text-[#0C831F]">PURE VEG</span>}
        <span className="absolute bottom-9 right-2.5 rounded-[8px] bg-white/95 px-2 py-1 text-[10.5px] font-extrabold shadow">⏱ {s.etaMins} min • {s.distanceKm} km</span>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><div className="truncate text-[16px] font-extrabold tracking-tight">{s.name}</div><div className="mt-0.5 truncate text-[12px] font-medium text-ink2">{s.cuisine ?? s.tagline}</div></div>
          <Rating v={s.rating} count={s.ratingsCount} />
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-dashed border-black/10 pt-2.5 text-[11.5px] font-semibold text-ink3">
          <span className="flex items-center gap-1"><Bike size={13} /> {s.deliveryFee === 0 ? <b className="text-[#0C831F]">FREE delivery</b> : `₹${s.deliveryFee} delivery`} • {s.priceForTwo} for two</span>
          <span className="flex items-center gap-0.5 font-extrabold text-[#E23744]">MENU <ChevronRight size={13} /></span>
        </div>
      </div>
    </motion.button>
  );
}

export function SearchTab() {
  const { set, query } = useOSB();
  const { stores, products } = useMarketplace();
  const [listening, setListening] = useState(false);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const ps = products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 6);
    const ss = stores.filter((s) => s.name.toLowerCase().includes(q) || s.tags.join(" ").toLowerCase().includes(q)).slice(0, 4);
    return [...ps.map((p) => ({ t: "product" as const, p })), ...ss.map((s) => ({ t: "store" as const, s }))];
  }, [query, stores, products]);
  return (
    <div className="app-bg px-4 pb-40 pt-4 ">
      <div className="flex items-center gap-2.5 rounded-[14px] card px-3.5 py-3 shadow-sm ">
        <Search size={18} className="text-[#E23744]" strokeWidth={2.6} />
        <input autoFocus value={query} onChange={(e) => set({ query: e.target.value })} placeholder="Search biryani, milk, plumber…" className="flex-1 bg-transparent text-[14.5px] font-semibold placeholder:text-ink3" />
        <button onClick={() => { setListening(!listening); blip(listening ? 400 : 880); setTimeout(() => setListening(false), 2200); }} className={cn("grid h-9 w-9 place-items-center rounded-xl pressable", listening ? "bg-[#E23744] text-white" : "chip")}><Mic size={16} /></button>
        <button className="grid h-9 w-9 place-items-center rounded-xl chip"><ScanSearch size={16} /></button>
      </div>
      <AnimatePresence>
        {listening && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 overflow-hidden rounded-[20px] bg-[#0E3B2E] p-5 text-center text-white">
            <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/12"><Mic size={26} /><span className="pulse-ring absolute inset-0 rounded-full border-2 border-[#D8F34E]" /></div>
            <div className="mt-2 text-[14px] font-bold">Listening… “extra cheese dosa”</div>
            <div className="mt-1 flex justify-center gap-1">{[0, 1, 2, 3, 4, 5, 6].map((i) => (<motion.span key={i} className="w-1 rounded-full bg-[#D8F34E]" animate={{ height: [8, 22, 8] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }} />))}</div>
          </motion.div>
        )}
      </AnimatePresence>
      {query.trim() === "" ? (
        <>
          <div className="mt-4"><SectionHead title="Trending in HSR" sub="12k people searching now" /></div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {TRENDING.map((t, i) => (
              <motion.button key={t} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.94 }} onClick={() => set({ query: t })} className="rounded-full card px-3.5 py-2 text-[12.5px] font-bold shadow-sm "><span className="mr-1.5 text-ink3">↗</span>{t}</motion.button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {[{ t: "Midnight biryani", s: "4 places open", img: STORES[0].image }, { t: "Milk in 12 min", s: "Subscribe & save", img: STORES[5].image }, { t: "Plumber today", s: "4.9★ pros", img: STORES[8].image }, { t: "Cake in 30 min", s: "Free card", img: STORES[7].image }].map((c, i) => (
              <motion.div key={c.t} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="overflow-hidden rounded-[18px] card shadow-sm ">
                <div className="h-[86px]"><Img src={c.img} alt={c.t} className="h-full w-full" /></div>
                <div className="p-2.5"><div className="text-[12.5px] font-extrabold">{c.t}</div><div className="text-[11px] font-semibold text-ink3">{c.s}</div></div>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-3 space-y-2.5">
          {results.length === 0 && <Glass className="p-8 text-center"><div className="text-[44px]">🍳</div><div className="font-display text-[17px] font-semibold">No match for “{query}”</div><p className="text-[12.5px] text-ink2">Try biryani, milk, plumber…</p></Glass>}
          {results.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-[16px] card p-2.5 shadow-sm ">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl"><Img src={r.t === "product" ? r.p.image : r.s.image} alt="r" className="h-full w-full" /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-extrabold">{r.t === "product" ? r.p.name : r.s.name}</div>
                <div className="text-[11.5px] font-semibold text-ink3">{r.t === "product" ? `₹${r.p.price} • ${r.p.category} • ⭐ ${r.p.rating}` : `${r.s.tagline}`}</div>
              </div>
              {r.t === "product" ? <AddStepper small qty={useOSB.getState().cart.find((c) => c.productId === r.p.id)?.qty ?? 0} onAdd={() => useOSB.getState().addToCart({ productId: r.p.id, name: r.p.name, emoji: r.p.emoji, image: r.p.image, price: r.p.price, qty: 1, storeId: r.p.storeId, storeName: "", unit: r.p.unit, tint: r.p.tint } as never)} onInc={() => useOSB.getState().addToCart({ productId: r.p.id, name: r.p.name, emoji: r.p.emoji, image: r.p.image, price: r.p.price, qty: 1, storeId: r.p.storeId, storeName: "", unit: r.p.unit, tint: r.p.tint } as never)} onDec={() => useOSB.getState().decCart(r.p.id)} /> : <ChevronRight size={16} className="opacity-40" />}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrdersTab({ onTrack }: { onTrack: (id: string) => void }) {
  const orders = useOSB((s) => s.orders);
  if (orders.length === 0)
    return (
      <div className="app-bg px-4 pb-40 pt-4 ">
        <h2 className="px-1 text-[22px] font-extrabold tracking-tight">Your orders</h2>
        <div className="mt-3 overflow-hidden rounded-[22px] card text-center ">
          <div className="relative h-[190px]"><Img src={STORES[0].image} alt="food" className="h-full w-full" /><div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" /><motion.div animate={{ x: [0, 18, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute bottom-4 left-6 text-[52px] drop-shadow-xl">🛵</motion.div><div className="absolute bottom-4 right-4 rounded-full bg-white px-3 py-1.5 text-[11px] font-black">30 min avg</div></div>
          <div className="p-6"><div className="text-[17px] font-extrabold">No orders yet — bhook lagi?</div><p className="mx-auto mt-1 max-w-[260px] text-[12.5px] text-ink2">Hot biryani, cold milk or fixed tap — all 20 mins away.</p><button onClick={() => useOSB.getState().set({ tab: "home" })} className="mx-auto mt-4 rounded-full bg-[#E23744] px-6 py-3 text-[13px] font-black text-white pressable">Explore nearby</button></div>
        </div>
        <div className="mt-4 rounded-[18px] card p-4 shadow-sm ">
          <div className="flex items-center gap-2 text-[13px] font-extrabold"><Truck size={16} /> How delivery works here</div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">Every store delivers with <b>its own team</b>. One Stop Bazar gives ordering, payments & analytics — fresher, faster.</p>
        </div>
      </div>
    );
  return (
    <div className="app-bg px-4 pb-40 pt-4 ">
      <h2 className="px-1 text-[22px] font-extrabold tracking-tight">Orders <span className="text-[14px] text-ink3">({orders.length})</span></h2>
      <div className="mt-3 space-y-3">
        {orders.map((o, i) => (
          <motion.button key={o.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileTap={{ scale: 0.97 }} onClick={() => onTrack(o.id)} className="w-full rounded-[18px] card p-3.5 text-left shadow-sm ">
            <div className="flex items-center gap-2.5">
              <div className="h-12 w-12 overflow-hidden rounded-xl chip">{o.items[0] && <Img src={(o.items[0] as unknown as { image?: string }).image ?? STORES[0].image} alt="o" className="h-full w-full" />}</div>
              <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-extrabold">{o.storeName}</div><div className="truncate text-[11.5px] text-ink3">{o.code} • {o.items.length} items • {inr(o.total)}</div></div>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-extrabold", o.status === "cancelled" ? "bg-[#E23744]/10 text-[#E23744]" : o.status === "new" ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-[#0C831F]")}><span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: o.status === "cancelled" ? "#E23744" : o.status === "new" ? "#E8830C" : "#0C831F" }} /> {statusLabel(o.status)}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-black/10 pt-2.5"><span className="text-[11.5px] font-bold text-ink3">{o.items.map((x) => `${x.qty}× ${x.name}`).join(" • ").slice(0, 64)}</span><span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-extrabold text-[#E23744]">Track <ChevronRight size={14} /></span></div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export function SavedTab({ onStore }: { onStore: (id: string) => void }) {
  const wishlist = useOSB((s) => s.wishlist);
  const { toggleWish } = useOSB();
  const items = PRODUCTS.filter((p) => wishlist.includes(p.id));
  return (
    <div className="app-bg px-4 pb-40 pt-4 ">
      <h2 className="px-1 text-[22px] font-extrabold tracking-tight">Favourites ❤️</h2>
      <p className="px-1 text-[12px] font-medium text-ink2">{items.length} saved • {wishlist.length} stores followed</p>
      {items.length === 0 ? (
        <Glass className="mt-3 card p-8 text-center"><div className="text-[52px]">💌</div><div className="mt-2 text-[17px] font-extrabold">Nothing saved yet</div><p className="text-[12.5px] text-ink2">Tap the heart on anything you love.</p></Glass>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {items.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="overflow-hidden rounded-[16px] card shadow-sm ">
              <div className="relative h-[110px]"><Img src={p.image} alt={p.name} className="h-full w-full" /><button onClick={() => toggleWish(p.id)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white shadow-card"><Heart size={15} fill="#E23744" color="#E23744" /></button></div>
              <div className="p-2.5"><div className="line-clamp-1 text-[12.5px] font-extrabold">{p.name}</div><div className="mt-0.5 flex items-center justify-between"><span className="text-[13px] font-black">₹{p.price}</span><span className="flex items-center gap-0.5 text-[11px] font-bold"><Star size={10} fill="currentColor" className="text-[#0C831F]" />{p.rating}</span></div></div>
            </motion.div>
          ))}
        </div>
      )}
      <div className="mt-4"><SectionHead title="Stores you love" /></div>
      <div className="mt-2 space-y-4">
        {STORES.slice(0, 3).map((s) => (<ZomatoCard key={s.id} id={s.id} index={0} onOpen={() => onStore(s.id)} />))}
      </div>
    </div>
  );
}

export function ProfileTab() {
  const { set, mode, dark, address, addressArea, coupon, seller, userName, userEmail, userAvatar, phone, logout, riderCtx, backToDeliveries } = useOSB();
  const [editOpen, setEditOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  return (
    <div className="app-bg px-4 pb-40 pt-4 ">
      <div className="flex items-center gap-3 rounded-[20px] card p-3.5 ">
        <div className="relative">
          <div className="grid h-[56px] w-[56px] place-items-center rounded-full bg-gradient-to-br from-[#E23744] to-[#FF7A45] text-[24px] font-black text-white">
            {userAvatar || (userName ? userName[0].toUpperCase() : "👤")}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#0C831F] text-[10px] text-white ring-2 ring-white">✓</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-extrabold leading-none">{userName || "You"}</div>
          <div className="mt-1 truncate text-[11.5px] font-semibold text-ink3">{phone || "Logged in"}{userEmail ? ` • ${userEmail}` : ""}</div>
        </div>
        <button onClick={() => { setEditOpen(true); blip(600); }} className="grid h-9 w-9 place-items-center rounded-full chip" title="Edit profile"><Pencil size={15} /></button>
        <button onClick={() => set({ dark: !dark })} className="grid h-10 w-10 place-items-center rounded-full chip">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
      </div>
      <AnimatePresence>{editOpen && <EditProfileSheet onClose={() => setEditOpen(false)} />}</AnimatePresence>

      {riderCtx && (
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { backToDeliveries(); blip(700); }} className="mt-3 flex w-full items-center gap-3 rounded-[18px] bg-[#111117] p-3.5 text-left text-white shadow-card">
          <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[#F8CB46] text-[20px] text-black">
            🛵
            <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#111117]", riderCtx.online ? "bg-emerald-400" : "bg-white/30")} />
          </span>
          <span className="flex-1">
            <span className="block text-[13.5px] font-extrabold">You deliver for {riderCtx.storeName}</span>
            <span className="block text-[11px] text-white/60">{riderCtx.online ? "Online" : "Offline"} • tap to open deliveries</span>
          </span>
          <ChevronRight size={18} className="text-white/60" />
        </motion.button>
      )}

      <motion.button whileTap={{ scale: 0.97 }} onClick={() => { set({ mode: mode === "customer" ? "provider" : "customer", tab: mode === "customer" ? (seller.onboarded ? "dash" : "onboard") : "home" }); blip(880, 0.12); }} className="relative mt-3 w-full overflow-hidden rounded-[22px] p-[1.5px] text-left" style={{ background: "linear-gradient(135deg,#F8CB46,#0C831F,#E23744)" }}>
        <div className="overflow-hidden rounded-[21px] bg-[#111117] text-white">
          <div className="relative h-[110px]"><Img src={seller.coverImage || STORES[0].image} alt="provider" className="h-full w-full opacity-60" /><div className="absolute inset-0 bg-gradient-to-t from-[#111117] via-[#111117]/40 to-transparent" /><div className="absolute bottom-2 left-4 right-4"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F8CB46]">{seller.onboarded ? "✦ Saved to your number" : "✦ One account • two worlds"}</div><div className="text-[19px] font-extrabold">{seller.onboarded ? seller.name : "Become a Provider 🚀"}</div></div></div>
          <div className="flex items-center gap-2 p-4 pt-3">
            <span className="rounded-full bg-[#F8CB46] px-4 py-2.5 text-[12px] font-black text-black">{seller.onboarded ? (mode === "provider" ? "Back to shopping →" : "Enter my shop →") : "Register store →"}</span>
            <span className="text-[11px] font-bold text-white/60">{seller.onboarded ? `${seller.categories.length} categor${seller.categories.length === 1 ? "y" : "ies"} • linked to ${phone || "your number"}` : "₹999/mo • zero commission"}</span>
          </div>
        </div>
      </motion.button>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-[18px] card p-3.5 "><div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-widest text-ink3"><Wallet size={13} /> Wallet</div><div className="mt-1 text-[22px] font-extrabold">₹486</div><div className="text-[11px] font-bold text-[#0C831F]">+ ₹48 cashback pending</div></div>
        <div className="rounded-[18px] card p-3.5 "><div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-widest text-ink3"><Ticket size={13} /> Coupon</div><div className="mt-1.5 flex items-center gap-1.5"><span className="rounded-lg border border-dashed border-[#0E3B2E]/40 bg-[#F8CB46]/30 px-2 py-1 text-[12px] font-black">{coupon ?? "—"}</span><Copy size={13} className="opacity-50" /></div><div className="mt-1 text-[11px] font-bold text-ink3">Tap to copy</div></div>
      </div>

      <div className="mt-3 overflow-hidden rounded-[18px] card">
        {[["🙋", "Edit profile", "Name, avatar, email, gender", "edit"], ["📍", "Delivery address", address ? (addressArea ? addressArea + " • tap to change" : address.slice(0, 34)) : "Set your location", "loc"], ["🎟️", "Coupons & offers", "4 active • 1 expiring", ""], ["⭐", "My reviews", "23 reviews • 4.8 avg", ""], ["🛡️", "Super Admin demo", "Platform control centre", "admin"], ["⚙️", "Settings & privacy", "Language, notifications", ""], ["💬", "Help & support", "Chat in 30 sec", ""]].map(([e, t, s, kind]) => (
          <button key={t as string} onClick={() => { if (kind === "admin") set({ mode: "admin", tab: "overview" }); else if (kind === "edit") setEditOpen(true); else if (kind === "loc") setLocOpen(true); blip(600); }} className="flex w-full items-center gap-3 border-b divide-line px-4 py-3.5 text-left last:border-0">
            <span className="grid h-10 w-10 place-items-center rounded-xl chip text-[18px]">{e}</span>
            <span className="flex-1"><span className="block text-[13px] font-extrabold">{t}</span><span className="block text-[11px] font-medium text-ink3">{s}</span></span>
            <ChevronRight size={16} className="opacity-35" />
          </button>
        ))}
      </div>
      <AnimatePresence>{locOpen && <ChangeLocationSheet onClose={() => setLocOpen(false)} />}</AnimatePresence>
      <button onClick={() => { logout(); blip(400); }} className="mt-3 w-full rounded-[16px] card py-3.5 text-[13px] font-extrabold text-[#E23744] shadow-card">Log out</button>
      <p className="mt-4 text-center text-[11px] font-semibold text-ink3">One Stop Bazar • OTP login only 🇮🇳</p>
    </div>
  );
}

export function StoreSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { stores, products } = useMarketplace();
  const s = stores.find((x) => x.id === id);
  const menu = products.filter((p) => p.storeId === id);
  if (!s) return null;
  const cart = useOSB((x) => x.cart);
  const { addToCart, decCart } = useOSB();
  const [tab, setTab] = useState("menu");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/45 backdrop-blur-[3px]" onClick={onClose}>
      <motion.div initial={{ y: "92%" }} animate={{ y: 0 }} exit={{ y: "92%" }} transition={{ type: "spring", stiffness: 210, damping: 28 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 top-[46px] overflow-hidden rounded-t-[26px] app-bg">
        <div className="no-scrollbar h-full overflow-y-auto pb-44">
          <div className="relative h-[210px] bg-black">
            <Img src={s.image} alt={s.name} className="h-full w-full" eager />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25" />
            <button onClick={onClose} className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-[16px] shadow pressable">←</button>
            <button className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow"><Heart size={17} /></button>
            <div className="absolute inset-x-4 bottom-3 flex items-end justify-between">
              <div><h2 className="text-[22px] font-extrabold leading-none tracking-tight text-white drop-shadow">{s.name}</h2><p className="mt-1 text-[12px] font-semibold text-white/85">{s.cuisine ?? s.tagline} • {s.priceForTwo} for two</p></div>
              <Rating v={s.rating} count={s.ratingsCount} />
            </div>
          </div>
          <div className="mx-4 -mt-0 flex translate-y-[-14px] gap-2">
            <span className="flex items-center gap-1 rounded-full card px-3 py-2 text-[11px] font-extrabold shadow-card">⏱ {s.etaMins} mins</span>
            <span className="flex items-center gap-1 rounded-full card px-3 py-2 text-[11px] font-extrabold shadow-card"><Bike size={12} /> {s.deliveryFee === 0 ? "FREE" : `₹${s.deliveryFee}`}</span>
            <span className="flex items-center gap-1 rounded-full card px-3 py-2 text-[11px] font-extrabold shadow-card">📍 {s.distanceKm} km</span>
          </div>
          <div className="mx-4 flex gap-2 overflow-x-auto no-scrollbar">
            {s.offers.map((o) => (<span key={o} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#256FEF] px-3 py-2 text-[11.5px] font-extrabold text-white"><Ticket size={13} /> {o}</span>))}
          </div>
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-[14px] bg-emerald-50 px-3.5 py-2.5 text-[12px] font-bold text-[#0C5B21]"><Leaf size={15} /> Delivered by {s.name}’s own team • No middleman</div>
          <div className="sticky top-0 z-10 mx-4 mt-3 flex gap-2 rounded-full card p-1 shadow-card">
            {["menu", "reviews", "info"].map((t) => (<button key={t} onClick={() => setTab(t)} className={cn("flex-1 rounded-full py-2 text-[12.5px] font-extrabold capitalize", tab === t ? "bg-black text-white" : "text-ink3")}>{t === "menu" ? `Menu (${menu.length})` : t}</button>))}
          </div>
          <div className="px-4 pt-3">
            <div className="text-[13px] font-black uppercase tracking-widest text-ink3">Recommended ({menu.length})</div>
            <div className="mt-2.5 space-y-3">
              {menu.map((p, i) => {
                const qty = cart.find((c) => c.productId === p.id)?.qty ?? 0;
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex gap-3 rounded-[18px] card p-2.5 shadow-[0_6px_20px_rgba(0,0,0,.06)] ">
                    <div className="min-w-0 flex-1 py-1 pl-1">
                      <div className="flex items-center gap-1.5"><VegMark veg={p.isVeg} />{p.isBestseller && <span className="flex items-center gap-0.5 text-[10px] font-black text-[#E23744]"><Star size={9} fill="currentColor" /> Bestseller</span>}</div>
                      <div className="mt-1 text-[14px] font-extrabold leading-tight">{p.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5"><span className="text-[13px] font-extrabold">₹{p.price}</span>{p.mrp && <span className="text-[11px] text-ink3 line-through">₹{p.mrp}</span>}<span className="rounded bg-emerald-50 px-1 py-[1px] text-[10px] font-black text-[#0C831F]">⭐ {p.rating}</span></div>
                      <div className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-ink2">{p.description}</div>
                    </div>
                    <div className="relative w-[118px] shrink-0">
                      <div className="relative h-[104px] w-[118px] overflow-hidden rounded-[14px] bg-[#f2f2f2]">
                        <Img src={p.image} alt={p.name} className="h-full w-full transition-transform hover:scale-105" />
                        {(p.images?.length ?? 0) > 1 && <span className="absolute right-1.5 top-1.5 rounded-md bg-black/65 px-1.5 py-[2px] text-[9px] font-black text-white backdrop-blur">📷 {p.images!.length}</span>}
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2"><AddStepper small qty={qty} onAdd={() => addToCart({ productId: p.id, name: p.name, emoji: p.emoji, image: p.image, price: p.price, qty: 1, storeId: p.storeId, storeName: s.name, unit: p.unit, tint: p.tint } as never)} onInc={() => addToCart({ productId: p.id, name: p.name, emoji: p.emoji, image: p.image, price: p.price, qty: 1, storeId: p.storeId, storeName: s.name, unit: p.unit, tint: p.tint } as never)} onDec={() => decCart(p.id)} /></div>
                      <div className="mt-3 text-center text-[9.5px] font-bold text-ink3">{p.unit} • customizable</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CouponStrip() {
  const coupon = useOSB((s) => s.coupon);
  const { set } = useOSB();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-1">
      {COUPONS.map((c) => (
        <button key={c.code} onClick={() => { set({ coupon: c.code }); blip(760); }} className={cn("w-[210px] shrink-0 rounded-[14px] border-2 border-dashed p-3 text-left pressable", coupon === c.code ? "border-[#0C831F] bg-emerald-50" : "border-black/12 card")}>
          <div className="text-[13px] font-black">{c.code}</div>
          <div className="text-[11.5px] font-bold">{c.title}</div>
          <div className="text-[11px] text-ink3">{c.detail}</div>
        </button>
      ))}
    </div>
  );
}
