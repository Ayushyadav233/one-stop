"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronRight, Mic, ScanSearch, Search, Sparkles, Store as StoreIcon, Package } from "lucide-react";
import { useMemo, useState } from "react";
import { type CategoryDef } from "@/lib/data";
import { blip, activeCategories, useMarketplace, useOSB } from "@/lib/osb-store";
import { cn } from "@/lib/cn";
import { Img, SectionHead } from "./ui";
import { BlinkitCard, ZomatoCard } from "./customer";

export function CategoriesTab({ onStore }: { onStore: (id: string) => void }) {
  const { set, extraCategories, hiddenCategories } = useOSB();
  const [open, setOpen] = useState<CategoryDef | null>(null);
  const list = useMemo(() => activeCategories(), [extraCategories, hiddenCategories]);
  const featured = list.filter((c) => c.featured);
  const { stores } = useMarketplace();

  const openCat = (c: CategoryDef) => { setOpen(c); blip(640); };

  const countFor = (c: CategoryDef) => stores.filter((s) => c.kinds.includes(s.kind)).length;

  return (
    <div className="app-bg pb-40">
      <div className="sticky top-0 z-30 surface pb-2 backdrop-blur-xl">
        <div className="px-4 pt-4">
          <h1 className="text-[22px] font-extrabold tracking-tight">Categories</h1>
          <p className="text-[11.5px] font-medium text-ink2">{list.length} categories • new ones added without app updates</p>
        </div>
        <div className="px-4 pt-2.5">
          <button onClick={() => set({ tab: "search" })} className="flex w-full items-center gap-2.5 rounded-[14px] card px-3.5 py-3 text-left shadow-sm">
            <Search size={18} className="shrink-0 brand-red" strokeWidth={2.6} />
            <span className="flex-1 truncate text-[13.5px] font-medium text-ink3">Search any category, store or product…</span>
            <Mic size={16} className="text-ink2" />
            <ScanSearch size={16} className="text-ink2" />
          </button>
        </div>
      </div>

      {/* featured mega cards */}
      <div className="pt-3">
        <div className="no-scrollbar flex snap-x gap-2.5 overflow-x-auto px-4">
          {featured.map((c, i) => (
            <motion.button
              key={c.k}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => openCat(c)}
              className="relative h-[132px] w-[78%] shrink-0 snap-start overflow-hidden rounded-[20px] text-left"
            >
              {c.img ? <Img src={c.img} alt={c.t} className="absolute inset-0 h-full w-full" eager={i < 2} /> : <div className="absolute inset-0 grid place-items-center text-[60px]" style={{ background: `linear-gradient(135deg, ${c.accent}, #111)` }}>{c.emoji}</div>}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent" />
              <div className="absolute inset-y-0 left-0 flex w-[62%] flex-col justify-center p-4">
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/70"><Sparkles size={11} /> {c.dynamic ? "Just added" : "Featured"}</span>
                <span className="mt-1 text-[21px] font-extrabold leading-none text-white">{c.t}</span>
                <span className="mt-1 text-[11.5px] font-medium text-white/75">{countFor(c)} stores • {c.eta}</span>
                <span className="mt-2 flex w-fit items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-black">Explore <ArrowRight size={12} /></span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* full grid */}
      <div className="px-4 pt-4">
        <SectionHead title="All categories" sub="Tap to see stores, products & subcategories" />
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {list.map((c, i) => {
            const n = countFor(c);
            return (
              <motion.button
                key={c.k}
                initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min((i % 6) * 0.04, 0.2) }}
                whileTap={{ scale: 0.95 }}
                onClick={() => openCat(c)}
                className="card overflow-hidden rounded-[18px] text-left shadow-card"
              >
                <div className="relative h-[92px]">
                  {c.img ? <Img src={c.img} alt={c.t} className="h-full w-full" /> : <div className="grid h-full place-items-center text-[44px]" style={{ background: `linear-gradient(135deg, ${c.accent}33, ${c.accent}11)` }}>{c.emoji}</div>}
                  <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/92 text-[13px] backdrop-blur">{c.emoji}</span>
                  {c.dynamic && <span className="absolute left-2 top-2 rounded-md bg-[#7C5CFF] px-1.5 py-[2px] text-[9px] font-black uppercase tracking-wide text-white">New</span>}
                </div>
                <div className="p-3">
                  <div className="truncate text-[13.5px] font-extrabold leading-tight">{c.t}</div>
                  <div className="truncate text-[10.5px] font-medium text-ink3">{c.sub}</div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1 rounded-full px-1.5 py-[2px] text-[10px] font-black" style={{ background: `${c.accent}15`, color: c.accent }}><StoreIcon size={10} /> {n} stores</span>
                    <span className="text-[10px] font-bold text-ink3">⚡ {c.eta}</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
        <button onClick={() => set({ tab: "profile" })} className="mt-3 flex w-full items-center gap-3 rounded-[16px] border-2 border-dashed divide-line p-4 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7C5CFF]/12 text-[#7C5CFF]">＋</span>
          <span className="flex-1"><span className="block text-[13px] font-extrabold">Missing a category?</span><span className="block text-[11px] text-ink3">Local providers can request one — CEO approves it live.</span></span>
          <ChevronRight size={16} className="opacity-40" />
        </button>
      </div>

      {/* category detail sheet */}
      <AnimatePresence>{open && <CategoryDetail c={open} onClose={() => setOpen(null)} onStore={onStore} />}</AnimatePresence>
    </div>
  );
}

function CategoryDetail({ c, onClose, onStore }: { c: CategoryDef; onClose: () => void; onStore: (id: string) => void }) {
  const [sub, setSub] = useState<string>("All");
  const { stores: allStores, products: allProducts } = useMarketplace();
  const stores = useMemo(() => allStores.filter((s) => c.kinds.includes(s.kind)), [c, allStores]);
  const products = useMemo(() => {
    const ids = new Set(stores.map((s) => s.id));
    return allProducts.filter((p) => ids.has(p.storeId)).slice(0, 12);
  }, [stores, allProducts]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/45 backdrop-blur-[2px]" onClick={onClose}>
      <motion.div initial={{ y: "8%" }} animate={{ y: 0 }} exit={{ y: "8%" }} transition={{ type: "spring", stiffness: 230, damping: 30 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 top-0 overflow-hidden rounded-t-[26px] app-bg">
        <div className="no-scrollbar h-full overflow-y-auto pb-40">
          <div className="relative h-[190px]">
            {c.img ? <Img src={c.img} alt={c.t} className="h-full w-full" eager /> : <div className="grid h-full place-items-center text-[90px]" style={{ background: `linear-gradient(135deg, ${c.accent}, #111)` }}>{c.emoji}</div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />
            <button onClick={onClose} className="absolute left-3 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-[16px] shadow"><ArrowLeft size={17} /></button>
            <div className="absolute inset-x-4 bottom-3">
              <span className="rounded-md px-2 py-[3px] text-[10px] font-black uppercase tracking-[0.14em] text-white" style={{ background: c.accent }}>{c.eta} delivery</span>
              <h2 className="mt-1.5 text-[26px] font-extrabold leading-none text-white">{c.t}</h2>
              <p className="mt-1 text-[12px] font-medium text-white/80">{c.sub} • {stores.length} stores near you</p>
            </div>
          </div>

          {c.subs.length > 0 && (
            <div className="no-scrollbar sticky top-0 z-10 flex gap-2 overflow-x-auto surface px-4 py-2.5 shadow-sm">
              {["All", ...c.subs].map((s) => (
                <button key={s} onClick={() => { setSub(s); blip(580); }} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-[11.5px] font-extrabold", sub === s ? "text-white" : "card text-ink2 shadow-card")} style={sub === s ? { background: c.accent } : undefined}>{s}</button>
              ))}
            </div>
          )}

          <div className="px-4 pt-4">
            <div className="flex items-center gap-2 rounded-[14px] p-3" style={{ background: `${c.accent}12` }}>
              <Package size={16} style={{ color: c.accent }} />
              <span className="text-[12px] font-bold">{products.length} products & {stores.length} local businesses</span>
            </div>
          </div>

          {products.length > 0 && (
            <div className="pt-4">
              <div className="px-4"><SectionHead title={`Top picks in ${c.t}`} /></div>
              <div className="no-scrollbar mt-2.5 flex gap-2.5 overflow-x-auto px-4">{products.map((p, i) => <BlinkitCard key={p.id} pid={p.id} index={i} />)}</div>
            </div>
          )}

          <div className="px-4 pt-4">
            <SectionHead title="Stores" sub="Delivered by the store's own team" />
            <div className="mt-3 space-y-4">{stores.map((s, i) => <ZomatoCard key={s.id} id={s.id} index={i} onOpen={() => onStore(s.id)} />)}</div>
            {stores.length === 0 && (
              <div className="card mt-2 rounded-[18px] p-8 text-center shadow-card">
                <div className="text-[44px]">{c.emoji}</div>
                <div className="mt-2 text-[15px] font-extrabold">Stores joining soon</div>
                <p className="mt-1 text-[12px] text-ink3">Local {c.t.toLowerCase()} businesses are being onboarded in HSR.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
