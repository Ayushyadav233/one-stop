"use client";
import { AnimatePresence, motion } from "framer-motion";
import { BadgePercent, Bell, Bot, CalendarDays, Check, ChevronRight, Clock, Copy, Eye, EyeOff, MapPin, Megaphone, Minus, Pencil, Phone, Plus, Power, Search, Star, Store as StoreIcon, Ticket, Trash2, Truck, Users, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, PRODUCTS, STORES, inr, type Product } from "@/lib/data";
import { blip, useOSB, DEFAULT_RIDER_PERMS, type RiderPerms } from "@/lib/osb-store";
import { timeAgo } from "@/lib/commerce";
import { cn } from "@/lib/cn";
import { Img, SectionHead, VegMark } from "./ui";
import { ProviderCatalogSheet } from "./provider-catalog";

/* ── shared bits ── */
export function Tog({ on, onTap, small }: { on: boolean; onTap: () => void; small?: boolean }) {
  return (
    <button onClick={() => { onTap(); blip(on ? 420 : 760); }} className={cn("flex shrink-0 items-center rounded-full p-[3px] transition-colors", small ? "h-[24px] w-[42px]" : "h-[28px] w-[50px]", on ? "justify-end bg-[#0C831F]" : "justify-start bg-black/15 dark:bg-white/15")}>
      <motion.span layout className={cn("rounded-full bg-white shadow", small ? "h-[18px] w-[18px]" : "h-[22px] w-[22px]")} />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-[13px] card px-3.5 py-2.5 shadow-card">
      <span className="block text-[9.5px] font-black uppercase tracking-widest text-ink3">{label}</span>
      {children}
    </label>
  );
}

interface FormCfg { placeholder: string; desc: string; units: string[]; stock: string; showVeg: boolean; pool: string[]; cover: string; }

function formConfig(label: string, sellerCats: string[]): FormCfg {
  const def =
    CATEGORIES.find((c) => c.t === label || c.subs.includes(label)) ??
    CATEGORIES.find((c) => sellerCats.includes(c.k)) ??
    CATEGORIES[0];
  const storeIds = new Set(STORES.filter((s) => def.kinds.includes(s.kind)).map((s) => s.id));
  const pool = [...new Set(PRODUCTS.filter((x) => storeIds.has(x.storeId)).map((x) => x.image))].filter(Boolean);
  const byK: Record<string, Omit<FormCfg, "pool" | "cover">> = {
    food: { placeholder: "e.g. Chicken Dum Biryani", desc: "Describe taste, serves & spice level…", units: ["1 pc", "Serves 1", "Serves 2", "500 g", "1 kg"], stock: "20", showVeg: true },
    grocery: { placeholder: "e.g. Farm Fresh Tomatoes (1 kg)", desc: "Brand, weight, packaging & expiry…", units: ["500 g", "1 kg", "2 kg", "1 L", "1 pack"], stock: "50", showVeg: true },
    medical: { placeholder: "e.g. Paracetamol 500mg (10 tabs)", desc: "Dosage, prescription needed? manufacturer…", units: ["1 strip", "1 bottle", "1 kit", "60 tabs"], stock: "100", showVeg: false },
    bakery: { placeholder: "e.g. Chocolate Truffle Cake (500g)", desc: "Flavour, weight, eggless option, serves…", units: ["1 pc", "500 g", "1 box", "6 pcs"], stock: "15", showVeg: true },
    sweets: { placeholder: "e.g. Kaju Katli Box (500g)", desc: "Ingredients, weight, gift box option…", units: ["250 g", "500 g", "1 kg", "1 box"], stock: "20", showVeg: true },
    flowers: { placeholder: "e.g. Mixed Roses Bouquet (12 stems)", desc: "Flowers, stems, occasion & freshness…", units: ["1 bouquet", "10 stems", "12 stems"], stock: "12", showVeg: false },
    fashion: { placeholder: "e.g. Cotton Straight Kurti — Navy", desc: "Sizes available, material, colour, fit…", units: ["XS", "S", "M", "L", "XL", "XXL", "1 pc"], stock: "15", showVeg: false },
    beauty: { placeholder: "e.g. Vitamin C Face Serum 30ml", desc: "Brand, skin type, volume, vegan?…", units: ["30 ml", "50 ml", "1 pc", "Set of 3"], stock: "25", showVeg: false },
    electronics: { placeholder: "e.g. Wireless Headphones Pro", desc: "Brand, model, warranty & key specs…", units: ["1 unit", "1 pc", "1 set"], stock: "10", showVeg: false },
    mobile: { placeholder: "e.g. 65W Fast Charger + Type-C Cable", desc: "Brand, wattage, connector, warranty…", units: ["1 unit", "1 pc", "1 set"], stock: "20", showVeg: false },
    homekitchen: { placeholder: "e.g. Non-Stick Kadhai 24cm", desc: "Material, capacity, induction ready?…", units: ["1 pc", "Set of 3", "1 L"], stock: "12", showVeg: false },
    furniture: { placeholder: "e.g. Solid Wood Dining Chair", desc: "Material, dimensions, assembly, colour…", units: ["1 pc", "Set of 2", "Set of 4"], stock: "6", showVeg: false },
    hardware: { placeholder: "e.g. Cordless Drill Kit 18V", desc: "Brand, model, warranty, contents…", units: ["1 kit", "1 pc", "1 L"], stock: "8", showVeg: false },
    books: { placeholder: "e.g. Hardbound A5 Journal (200 pages)", desc: "Author/brand, pages, language…", units: ["1 pc", "Pack of 2", "Set"], stock: "30", showVeg: false },
    toys: { placeholder: "e.g. Soft Plush Bear 40cm", desc: "Age group, material, safety certified…", units: ["1 pc", "1 set"], stock: "20", showVeg: false },
    pets: { placeholder: "e.g. Adult Dog Food — Chicken 3kg", desc: "Brand, flavour, life stage, weight…", units: ["500 g", "1 kg", "3 kg", "1 pc"], stock: "18", showVeg: false },
    sports: { placeholder: "e.g. PVC Dumbbell Set (20kg)", desc: "Weight, material, grip, in-box items…", units: ["1 pc", "1 set", "2 kg"], stock: "10", showVeg: false },
    auto: { placeholder: "e.g. Magnetic Car Phone Mount", desc: "Compatibility, brand, warranty…", units: ["1 pc", "1 kit", "Set of 2"], stock: "20", showVeg: false },
    household: { placeholder: "e.g. Liquid Detergent Family Pack 2L", desc: "Brand, volume, machine type…", units: ["1 L", "2 L", "1 pack", "3 pcs"], stock: "40", showVeg: false },
    service: { placeholder: "e.g. 60-min Signature Facial", desc: "Duration, what’s included, requirements…", units: ["30 min", "60 min", "1 visit"], stock: "99", showVeg: false },
  };
  const base = byK[def.k] ?? { placeholder: "e.g. Product name", desc: "Describe material, size & key details…", units: ["1 pc", "1 pack", "1 set"], stock: "20", showVeg: false };
  return { ...base, pool: pool.length ? pool : def.img ? [def.img] : [], cover: def.img };
}

/* ═══════════ CATALOG ═══════════ */
export function SellerCatalog() {
  const { catalog, ensureCatalog } = useOSB();
  const [tab, setTab] = useState<"items" | "cats">("items");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => { ensureCatalog(); }, [ensureCatalog]);

  const list = useMemo(() => {
    return catalog.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "live") return !p.hidden && p.stock > 0;
      if (filter === "hidden") return !!p.hidden;
      if (filter === "low") return p.stock > 0 && p.stock <= 15;
      if (filter === "out") return p.stock === 0;
      return true;
    });
  }, [catalog, q, filter]);

  const live = catalog.filter((p) => !p.hidden).length;
  const stockVal = catalog.reduce((a, p) => a + p.price * p.stock, 0);

  return (
    <div className="app-bg pb-44">
      <div className="px-4 pt-4">
        <h1 className="text-[22px] font-extrabold tracking-tight">Catalog</h1>
        <p className="text-[11.5px] font-medium text-ink2">{catalog.length} products • {live} live • stock worth {inr(stockVal)}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button onClick={() => setTab("items")} className={cn("rounded-[13px] py-2.5 text-[12.5px] font-extrabold", tab === "items" ? "bg-black text-white dark:bg-white dark:text-black" : "card text-ink2 shadow-card")}>My products</button>
          <button onClick={() => setTab("cats")} className={cn("rounded-[13px] py-2.5 text-[12.5px] font-extrabold", tab === "cats" ? "bg-black text-white dark:bg-white dark:text-black" : "card text-ink2 shadow-card")}>Store categories</button>
        </div>
      </div>

      {tab === "items" && (
        <>
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2 rounded-[13px] card px-3 py-2.5 shadow-card">
              <Search size={15} className="text-ink3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your products…" className="flex-1 bg-transparent text-[13px] font-semibold placeholder:text-ink3" />
            </div>
            <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
              {[["all", "All"], ["live", "Live"], ["low", "Low stock"], ["out", "Out of stock"], ["hidden", "Hidden"]].map(([k, t]) => (
                <button key={k} onClick={() => setFilter(k)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold", filter === k ? "bg-[#0C831F] text-white" : "card text-ink2 shadow-card")}>{t}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2.5 px-4 pt-3">
            <AnimatePresence>
              {list.map((p) => <ProductRow key={p.id} p={p} onEdit={() => setEditing(p)} />)}
            </AnimatePresence>
            {list.length === 0 && (
              <div className="card rounded-[18px] p-8 text-center shadow-card">
                <div className="text-[44px]">📦</div>
                <div className="mt-2 text-[15px] font-extrabold">No products here</div>
                <p className="text-[12px] text-ink3">{q ? "Try a different search." : "Add your first product with AI in 30 seconds."}</p>
              </div>
            )}
          </div>
          <div className="px-4 pt-3">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setAiOpen(true)} className="flex w-full items-center gap-3 rounded-[16px] bg-[#7C5CFF] p-3.5 text-left text-white shadow-[0_14px_34px_rgba(124,92,255,.4)]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/16"><Bot size={20} /></span>
              <span className="flex-1"><span className="block text-[13.5px] font-extrabold">Add product with AI</span><span className="block text-[11px] text-white/75">Auto category + attributes</span></span>
              <Plus size={18} strokeWidth={3} />
            </motion.button>
            <button onClick={() => setEditing("new")} className="mt-2 w-full rounded-[16px] card py-3.5 text-[13px] font-extrabold shadow-card">＋ Add manually</button>
          </div>
        </>
      )}

      {tab === "cats" && <StoreCategories />}

      <AnimatePresence>{editing && <ProductSheet p={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}</AnimatePresence>
      <ProviderCatalogSheet open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

function ProductRow({ p, onEdit }: { p: Product; onEdit: () => void }) {
  const { toggleProduct, bumpStock, removeProduct } = useOSB();
  const [confirm, setConfirm] = useState(false);
  const off = p.mrp ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} className={cn("card rounded-[16px] p-2.5 shadow-card", p.hidden && "opacity-70")}>
      <div className="flex gap-2.5">
        <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[12px] img-skel">
          {p.image ? <Img src={p.image} alt={p.name} className="h-full w-full" /> : <span className="grid h-full place-items-center text-[30px]">{p.emoji}</span>}
          {off > 0 && <span className="absolute left-1 top-1 rounded-md bg-[#256FEF] px-1 py-[1px] text-[9px] font-black text-white">{off}%</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <VegMark veg={p.isVeg} />
            <span className={cn("rounded px-1 py-[1px] text-[9px] font-black uppercase", p.hidden ? "bg-black/10 text-ink3" : p.stock === 0 ? "bg-[#E23744]/12 text-[#E23744]" : "bg-[#0C831F]/12 text-[#0C831F]")}>
              {p.hidden ? "Hidden" : p.stock === 0 ? "Out of stock" : "Live"}
            </span>
            <span className="truncate text-[10px] font-bold text-ink3">{p.category}</span>
          </div>
          <div className="mt-0.5 truncate text-[13px] font-extrabold">{p.name}</div>
          <div className="flex items-center gap-1.5 text-[12px]"><span className="font-extrabold">₹{p.price}</span>{p.mrp && <span className="text-[10.5px] text-ink3 line-through">₹{p.mrp}</span>}<span className="text-[10px] text-ink3">• {p.unit}</span></div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 border-t divide-line pt-2">
        <div className="flex items-center gap-1.5 rounded-full chip px-1 py-1">
          <button onClick={() => bumpStock(p.id, -1)} className="grid h-6 w-6 place-items-center rounded-full bg-white shadow-sm dark:bg-black/30"><Minus size={12} strokeWidth={3} /></button>
          <span className={cn("min-w-[52px] text-center text-[11px] font-black tabular-nums", p.stock <= 15 && "text-[#E8830C]")}>{p.stock} left</span>
          <button onClick={() => { bumpStock(p.id, 1); blip(700); }} className="grid h-6 w-6 place-items-center rounded-full bg-white shadow-sm dark:bg-black/30"><Plus size={12} strokeWidth={3} /></button>
        </div>
        <button onClick={() => toggleProduct(p.id)} className="grid h-8 w-8 place-items-center rounded-full chip">{p.hidden ? <EyeOff size={15} /> : <Eye size={15} />}</button>
        <button onClick={onEdit} className="grid h-8 w-8 place-items-center rounded-full chip"><Pencil size={14} /></button>
        {confirm ? (
          <span className="ml-auto flex gap-1.5">
            <button onClick={() => { removeProduct(p.id); blip(400); }} className="rounded-full bg-[#E23744] px-3 py-1.5 text-[11px] font-black text-white">Delete?</button>
            <button onClick={() => setConfirm(false)} className="rounded-full chip px-3 py-1.5 text-[11px] font-black">No</button>
          </span>
        ) : (
          <button onClick={() => setConfirm(true)} className="ml-auto grid h-8 w-8 place-items-center rounded-full chip text-[#E23744]"><Trash2 size={14} /></button>
        )}
      </div>
    </motion.div>
  );
}

function StoreCategories() {
  const { seller, setSeller } = useOSB();
  const { set, requestCategory } = useOSB();
  const [reqOpen, setReqOpen] = useState(false);
  const toggle = (k: string) => {
    const has = seller.categories.includes(k);
    setSeller({ categories: has ? seller.categories.filter((x) => x !== k) : [...seller.categories, k] });
    blip(has ? 420 : 760);
  };
  return (
    <div className="px-4 pt-3">
      <div className="rounded-[16px] bg-[#1573FF]/10 p-3.5 text-[12px] font-semibold leading-relaxed text-[#0B5BD3]">
        Your store appears under <b>{seller.categories.length} categor{seller.categories.length === 1 ? "y" : "ies"}</b>. Pick everything you sell — customers find you through each one.
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {CATEGORIES.map((c) => {
          const on = seller.categories.includes(c.k);
          return (
            <motion.button key={c.k} whileTap={{ scale: 0.95 }} onClick={() => toggle(c.k)} className={cn("card flex items-center gap-2.5 rounded-[14px] p-2.5 text-left shadow-card", on && "ring-2")} style={on ? ({ "--tw-ring-color": c.accent } as React.CSSProperties) : undefined}>
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">{c.img ? <Img src={c.img} alt={c.t} className="h-full w-full" /> : <span className="grid h-full w-full place-items-center text-lg" style={{ background: `${c.accent}18` }}>{c.emoji}</span>}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-extrabold">{c.t}</span><span className="block truncate text-[10px] text-ink3">{c.subs.length} sub-cats</span></span>
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-black text-white", on ? "" : "bg-black/15")} style={on ? { background: c.accent } : undefined}>{on ? <Check size={12} strokeWidth={3.5} /> : ""}</span>
            </motion.button>
          );
        })}
      </div>
      <button onClick={() => setReqOpen(true)} className="mt-2.5 flex w-full items-center gap-3 rounded-[16px] border-2 border-dashed border-[#7C5CFF]/50 bg-[#7C5CFF]/8 p-3.5 text-left">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7C5CFF] text-lg text-white">＋</span>
        <span className="flex-1"><span className="block text-[13px] font-extrabold text-[#7C5CFF]">Request a new category</span><span className="block text-[11px] text-ink3">CEO approves → live in app instantly</span></span>
      </button>
      <AnimatePresence>
        {reqOpen && <QuickRequest onClose={() => setReqOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function QuickRequest({ onClose }: { onClose: () => void }) {
  const { requestCategory, seller } = useOSB();
  const [cat, setCat] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[58] bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-4 bottom-24 rounded-[22px] app-bg p-4 shadow-2xl">
        <div className="text-[15px] font-extrabold">Suggest new category</div>
        <input autoFocus value={cat} onChange={(e) => setCat(e.target.value)} placeholder="e.g. Eco Living" className="mt-2.5 w-full rounded-[12px] card-2 px-3.5 py-3 text-[13px] font-semibold placeholder:text-ink3" />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What will it contain? (optional)" className="mt-2 w-full rounded-[12px] card-2 px-3.5 py-3 text-[13px] font-semibold placeholder:text-ink3" />
        <div className="mt-3 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-[12px] chip py-3 text-[13px] font-extrabold">Cancel</button>
          <button onClick={() => { if (!cat.trim()) return; requestCategory({ productName: "Store catalog", category: cat.trim(), description: desc || "Requested from store categories.", emoji: "✨", storeName: seller.name }); blip(920); onClose(); }} className="flex-1 rounded-[12px] bg-[#7C5CFF] py-3 text-[13px] font-extrabold text-white">Send to CEO</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProductSheet({ p, onClose }: { p: Product | null; onClose: () => void }) {
  const { addProduct, updateProduct, seller } = useOSB();
  const primaryDef = CATEGORIES.find((c) => seller.categories.includes(c.k)) ?? CATEGORIES[0];
  const initialCat = p?.category ?? primaryDef.subs[0] ?? primaryDef.t;
  const initialCfg = useMemo(() => formConfig(initialCat, seller.categories), [initialCat, seller.categories]);
  const [name, setName] = useState(p?.name ?? "");
  const [desc, setDesc] = useState(p?.description ?? "");
  const [price, setPrice] = useState(String(p?.price ?? ""));
  const [mrp, setMrp] = useState(String(p?.mrp ?? ""));
  const [cat, setCat] = useState(initialCat);
  const cfg = useMemo(() => formConfig(cat, seller.categories), [cat, seller.categories]);
  const [stock, setStock] = useState(String(p?.stock ?? initialCfg.stock));
  const [unit, setUnit] = useState(p?.unit ?? initialCfg.units[0] ?? "1 pc");
  const [gallery, setGallery] = useState<string[]>(() => {
    const initial = p?.images?.length ? p.images : p?.image ? [p.image] : initialCfg.pool[0] ? [initialCfg.pool[0]] : initialCfg.cover ? [initialCfg.cover] : [];
    return initial.slice(0, 5);
  });
  const [uploads, setUploads] = useState<string[]>(() => (p?.images ?? []).filter((u) => u.startsWith("data:")));
  const [imgTouched, setImgTouched] = useState(!!p);
  const img = gallery[0] ?? "";
  const fileRef = useRef<HTMLInputElement | null>(null);
  const MAX_PHOTOS = 5;

  const toggleImg = (u: string) => {
    setImgTouched(true);
    setGallery((prev) => {
      if (prev.includes(u)) return prev.filter((x) => x !== u);
      if (prev.length >= MAX_PHOTOS) return prev;
      return [...prev, u];
    });
    blip(660);
  };

  const makeCover = (u: string) => {
    setImgTouched(true);
    setGallery((prev) => [u, ...prev.filter((x) => x !== u)]);
    blip(760);
  };

  const onUpload = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - gallery.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    list.forEach((f) => {
      if (!f.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || "");
        if (!url) return;
        setImgTouched(true);
        setUploads((prev) => (prev.includes(url) ? prev : [url, ...prev]));
        setGallery((prev) => (prev.includes(url) || prev.length >= MAX_PHOTOS ? prev : [...prev, url]));
        blip(880);
      };
      reader.readAsDataURL(f);
    });
  };
  const [emoji, setEmoji] = useState(p?.emoji ?? primaryDef.emoji ?? "✨");
  const [veg, setVeg] = useState(p?.isVeg ?? initialCfg.showVeg);
  const [best, setBest] = useState(p?.isBestseller ?? false);
  const off = mrp && price && +mrp > +price ? Math.round(((+mrp - +price) / +mrp) * 100) : 0;
  const activeDef = CATEGORIES.find((c) => c.t === cat || c.subs.includes(cat)) ?? primaryDef;

  const chooseSub = (s: string) => {
    setCat(s);
    const next = formConfig(s, seller.categories);
    setUnit(next.units[0] ?? unit);
    if (!imgTouched) {
      const fallback = next.pool[0] ?? next.cover ?? "";
      setGallery(fallback ? [fallback] : []);
    }
    blip(620);
  };

  const save = () => {
    if (!name.trim() || !price) return;
    const shots = gallery.slice(0, MAX_PHOTOS);
    const cover = shots[0] ?? "";
    if (p) updateProduct(p.id, { name: name.trim(), description: desc, price: +price, mrp: mrp ? +mrp : undefined, stock: Math.max(0, +stock || 0), unit, category: cat, image: cover, images: shots, emoji, isVeg: veg, isBestseller: best });
    else addProduct({ id: "cp-" + Math.random().toString(36).slice(2, 8), storeId: useOSB.getState().seller.storeId || "mine", name: name.trim(), description: desc || "Fresh from our store.", price: +price, mrp: mrp ? +mrp : undefined, emoji, image: cover, images: shots, category: cat, rating: 4.5, isVeg: veg, isBestseller: best, stock: Math.max(0, +stock || 0), unit: unit || "1 pc", tint: "#FFE7C2", eta: "30 mins" });
    blip(920, 0.15);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[58] bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: "90%" }} animate={{ y: 0 }} exit={{ y: "90%" }} transition={{ type: "spring", stiffness: 240, damping: 30 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[90%] overflow-hidden rounded-t-[26px] app-bg">
        <div className="no-scrollbar max-h-[90vh] overflow-y-auto px-4 pb-10 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-black/15" />
          <div className="mt-3 flex items-center justify-between">
            <h3 className="text-[18px] font-extrabold tracking-tight">{p ? "Edit product" : "New product"}</h3>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full chip"><X size={17} /></button>
          </div>
          {/* preview */}
          <div className="card mt-3 flex gap-3 rounded-[16px] p-3 shadow-card">
            <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[12px] img-skel">{img ? <Img src={img} alt="preview" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[26px]">{emoji || activeDef?.emoji}</span>}{off > 0 && <span className="absolute left-1 top-1 rounded bg-[#256FEF] px-1 text-[9px] font-black text-white">{off}%</span>}</div>
            <div className="min-w-0"><div className="truncate text-[14px] font-extrabold">{name || "Product name"}</div><div className="text-[12px] font-extrabold">₹{price || "0"} {mrp && <span className="font-medium text-ink3 line-through">₹{mrp}</span>}</div><div className="text-[11px] text-ink3">{cat} • {unit} • {stock || 0} in stock</div></div>
          </div>
          <div className="mt-3 space-y-2.5">
            {/* subcategory chips */}
            {activeDef && activeDef.subs.length > 0 && (
              <div>
                <div className="mb-1.5 text-[9.5px] font-black uppercase tracking-widest text-ink3">Type in {activeDef.t}</div>
                <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
                  {[activeDef.t, ...activeDef.subs].map((s) => (
                    <button key={s} onClick={() => chooseSub(s)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold", cat === s ? "text-white" : "card text-ink2 shadow-card")} style={cat === s ? { background: activeDef.accent } : undefined}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            <Field label="Product name *"><input value={name} onChange={(e) => setName(e.target.value)} placeholder={cfg.placeholder} className="w-full bg-transparent text-[13.5px] font-semibold placeholder:text-ink3" /></Field>
            <Field label="Description"><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={cfg.desc} className="w-full bg-transparent text-[13px] font-medium placeholder:text-ink3" /></Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Price ₹ *"><input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="0" className="w-full bg-transparent text-[13px] font-bold" /></Field>
              <Field label="MRP ₹"><input inputMode="numeric" value={mrp} onChange={(e) => setMrp(e.target.value.replace(/\D/g, ""))} placeholder="0" className="w-full bg-transparent text-[13px] font-bold" /></Field>
              <Field label={cfg.showVeg ? "Stock" : "Quantity"}><input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} placeholder={cfg.stock} className="w-full bg-transparent text-[13px] font-bold" /></Field>
            </div>
            <Field label="Unit / variant">
              <div className="no-scrollbar mt-1 flex gap-1.5 overflow-x-auto pb-0.5">
                {cfg.units.map((u) => (
                  <button key={u} onClick={() => setUnit(u)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold", unit === u ? "bg-[#0C831F] text-white" : "chip text-ink2")}>{u}</button>
                ))}
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Custom" className="w-20 shrink-0 rounded-full chip px-3 py-1.5 text-[11.5px] font-bold" />
              </div>
            </Field>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[9.5px] font-black uppercase tracking-widest text-ink3">Photos — {gallery.length}/{MAX_PHOTOS}</span>
                <span className="text-[9.5px] font-bold text-ink3">First photo = cover</span>
              </div>

              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />

              {/* selected gallery */}
              {gallery.length > 0 && (
                <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
                  {gallery.map((u, i) => (
                    <div key={u} className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[12px] ring-[2.5px] ring-[#0C831F]">
                      <Img src={u} alt={`photo ${i + 1}`} className="h-full w-full object-cover" />
                      {i === 0 ? (
                        <span className="absolute inset-x-0 bottom-0 bg-[#0C831F] py-[2px] text-center text-[8.5px] font-black text-white">COVER</span>
                      ) : (
                        <button onClick={() => makeCover(u)} className="absolute inset-x-0 bottom-0 bg-black/65 py-[2px] text-center text-[8.5px] font-black text-white">Make cover</button>
                      )}
                      <button onClick={() => { setGallery((prev) => prev.filter((x) => x !== u)); setImgTouched(true); blip(420); }} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white"><X size={11} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* upload + suggestions */}
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                <button
                  onClick={() => { if (gallery.length >= MAX_PHOTOS) return; fileRef.current?.click(); blip(700); }}
                  disabled={gallery.length >= MAX_PHOTOS}
                  className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[12px] border-2 border-dashed divide-line text-center disabled:opacity-40"
                >
                  <span>
                    <Plus size={16} className="mx-auto text-[#0C831F]" strokeWidth={3} />
                    <span className="mt-0.5 block text-[9.5px] font-extrabold text-ink2">Upload</span>
                  </span>
                </button>

                {uploads.filter((u) => !gallery.includes(u)).map((u) => (
                  <button key={u} onClick={() => toggleImg(u)} className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[12px] opacity-75">
                    <Img src={u} alt="upload" className="h-full w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-[2px] text-center text-[8px] font-black text-white">YOUR PHOTO</span>
                  </button>
                ))}

                {cfg.pool.filter((u) => !gallery.includes(u)).map((u) => (
                  <button key={u} onClick={() => toggleImg(u)} className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[12px] opacity-70">
                    <Img src={u} alt="suggestion" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>

              {gallery.length === 0 && <p className="mt-1.5 text-[10.5px] font-semibold text-ink3">Upload your own photo or pick a {cat} sample above.</p>}
            </div>
            <div className="flex gap-2">
              {cfg.showVeg && (
                <button onClick={() => setVeg(!veg)} className="flex flex-1 items-center justify-center gap-2 rounded-[12px] card py-3 text-[12px] font-extrabold shadow-card"><VegMark veg={veg} /> {veg ? "Veg" : "Non-veg"}</button>
              )}
              <button onClick={() => setBest(!best)} className={cn("flex items-center justify-center gap-1.5 rounded-[12px] py-3 text-[12px] font-extrabold", best ? "bg-[#E8830C]/15 text-[#E8830C]" : "card text-ink3 shadow-card", cfg.showVeg ? "flex-1" : "flex-1")}><Star size={14} fill={best ? "currentColor" : "none"} /> Bestseller</button>
            </div>
          </div>
          <button onClick={save} className="mt-4 w-full rounded-[14px] bg-[#0C831F] py-4 text-[14px] font-extrabold text-white">{p ? "Save changes" : "List product live"}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════ MARKETING ═══════════ */
export function SellerMarketing() {
  const { sellerCoupons, storewideOff, set, storeReviews, replyReview, seller } = useOSB();
  const [sheet, setSheet] = useState<"new" | string | null>(null);
  const [ann, setAnn] = useState(seller.announcement);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyTxt, setReplyTxt] = useState("");
  const active = sellerCoupons.filter((c) => c.active);
  const avg = (storeReviews.reduce((a, r) => a + r.rating, 0) / storeReviews.length).toFixed(1);

  return (
    <div className="app-bg px-4 pb-44 pt-4">
      <h1 className="text-[22px] font-extrabold tracking-tight">Marketing</h1>
      <p className="text-[11.5px] font-medium text-ink2">{active.length} live coupons • {storeReviews.length} reviews • {avg}★ avg</p>

      {/* storewide */}
      <div className="card mt-3 rounded-[18px] p-4 shadow-card">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E23744]/12 text-[#E23744]"><BadgePercent size={19} /></span>
          <div className="flex-1"><div className="text-[13.5px] font-extrabold">Store-wide sale</div><div className="text-[11px] text-ink3">Flat OFF on everything, shown on your store</div></div>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          {[0, 5, 10, 15, 20, 25].map((v) => (
            <button key={v} onClick={() => { set({ storewideOff: v }); blip(v ? 760 : 420); }} className={cn("flex-1 rounded-[10px] py-2 text-[12px] font-black", storewideOff === v ? "bg-[#E23744] text-white" : "chip text-ink2")}>{v === 0 ? "Off" : `${v}%`}</button>
          ))}
        </div>
      </div>

      {/* coupons */}
      <div className="mt-4"><SectionHead title="Coupons" sub="Customers apply these at checkout" action={<button onClick={() => setSheet("new")} className="flex items-center gap-1 rounded-full bg-black px-3 py-1.5 text-[11px] font-black text-white dark:bg-white dark:text-black"><Plus size={13} /> New</button>} /></div>
      <div className="mt-2.5 space-y-2">
        {sellerCoupons.map((c) => (
          <CouponCard key={c.id} id={c.id} onEdit={() => setSheet(c.id)} />
        ))}
      </div>

      {/* announcement */}
      <div className="mt-4"><SectionHead title="Store banner" sub="Shows on top of your store page" /></div>
      <div className="card mt-2.5 rounded-[18px] p-4 shadow-card">
        <div className="flex items-center gap-2 rounded-[12px] bg-[#F8CB46]/25 p-3 text-[12px] font-bold"><Megaphone size={15} className="shrink-0" />{ann || "No banner — customers see nothing extra."}</div>
        <input value={ann} onChange={(e) => setAnn(e.target.value)} placeholder="e.g. Free gulab jamun with biryani 🪔" className="mt-2.5 w-full rounded-[12px] card-2 px-3.5 py-3 text-[12.5px] font-semibold placeholder:text-ink3" />
        <button onClick={() => { useOSB.getState().setSeller({ announcement: ann }); blip(880); }} className="mt-2 w-full rounded-[12px] bg-black py-3 text-[12.5px] font-extrabold text-white dark:bg-white dark:text-black">Publish banner</button>
      </div>

      {/* reviews */}
      <div className="mt-4"><SectionHead title="Reviews" sub="Reply to keep rating high" /></div>
      <div className="mt-2.5 space-y-2">
        {storeReviews.map((r) => (
          <div key={r.name} className="card rounded-[16px] p-3.5 shadow-card">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-black/8 text-[12px] font-black dark:bg-white/12">{r.name[0]}</span>
              <span className="flex-1 text-[12.5px] font-extrabold">{r.name} <span className="font-semibold text-ink3">• {r.when}</span></span>
              <span className="flex items-center gap-0.5 rounded-md bg-[#0C831F] px-1.5 py-0.5 text-[11px] font-black text-white">{r.rating} <Star size={9} fill="currentColor" /></span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed">{r.text}</p>
            {r.reply ? (
              <div className="mt-2 rounded-[10px] chip p-2.5 text-[11.5px]"><b>Your reply:</b> {r.reply}</div>
            ) : replyFor === r.name ? (
              <div className="mt-2 flex gap-1.5">
                <input autoFocus value={replyTxt} onChange={(e) => setReplyTxt(e.target.value)} placeholder="Write a reply…" className="flex-1 rounded-[10px] card-2 px-3 py-2 text-[12px] font-semibold" />
                <button onClick={() => { if (replyTxt.trim()) replyReview(r.name, replyTxt.trim()); setReplyFor(null); setReplyTxt(""); blip(760); }} className="rounded-[10px] bg-[#0C831F] px-3.5 text-[12px] font-black text-white">Send</button>
              </div>
            ) : (
              <button onClick={() => setReplyFor(r.name)} className="mt-2 text-[11.5px] font-extrabold text-[#1573FF]">Reply →</button>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>{sheet && <CouponSheet id={sheet === "new" ? null : sheet} onClose={() => setSheet(null)} />}</AnimatePresence>
    </div>
  );
}

function CouponCard({ id, onEdit }: { id: string; onEdit: () => void }) {
  const c = useOSB((s) => s.sellerCoupons.find((x) => x.id === id)!);
  const { updateCoupon, removeCoupon } = useOSB();
  const [del, setDel] = useState(false);
  return (
    <div className={cn("card overflow-hidden rounded-[16px] shadow-card", !c.active && "opacity-60")}>
      <div className="flex items-center gap-3 p-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#7C5CFF]/12 text-[#7C5CFF]"><Ticket size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5"><span className="rounded-md border border-dashed border-black/25 px-1.5 py-[1px] text-[12px] font-black">{c.code}</span><button onClick={() => blip(700)}><Copy size={12} className="opacity-50" /></button></div>
          <div className="mt-0.5 truncate text-[11.5px] font-bold">{c.title} • min ₹{c.minOrder}</div>
          <div className="text-[10.5px] font-semibold text-ink3">{c.used} used • expires {c.expiry}</div>
        </div>
        <Tog small on={c.active} onTap={() => updateCoupon(c.id, { active: !c.active })} />
      </div>
      <div className="flex gap-2 border-t divide-line px-3.5 py-2">
        <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-1 rounded-lg chip py-2 text-[11.5px] font-extrabold"><Pencil size={12} /> Edit</button>
        {del ? (
          <button onClick={() => removeCoupon(c.id)} className="flex-1 rounded-lg bg-[#E23744] py-2 text-[11.5px] font-black text-white">Confirm delete</button>
        ) : (
          <button onClick={() => setDel(true)} className="flex flex-1 items-center justify-center gap-1 rounded-lg chip py-2 text-[11.5px] font-extrabold text-[#E23744]"><Trash2 size={12} /> Delete</button>
        )}
      </div>
    </div>
  );
}

function CouponSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const exist = useOSB((s) => s.sellerCoupons.find((x) => x.id === id));
  const { addCoupon, updateCoupon } = useOSB();
  const [code, setCode] = useState(exist?.code ?? "");
  const [kind, setKind] = useState<"pct" | "flat">(exist?.kind ?? "pct");
  const [value, setValue] = useState(String(exist?.value ?? "20"));
  const [maxOff, setMaxOff] = useState(String(exist?.maxOff ?? "100"));
  const [minOrder, setMinOrder] = useState(String(exist?.minOrder ?? "199"));
  const [expiry, setExpiry] = useState(exist?.expiry ?? "31 Dec");
  const save = () => {
    const cd = (code || `SAVE${value}`).toUpperCase().replace(/\s+/g, "");
    const title = kind === "pct" ? `${value}% OFF up to ₹${maxOff}` : `Flat ₹${value} OFF`;
    if (id && exist) updateCoupon(id, { code: cd, title, kind, value: +value || 0, maxOff: +maxOff || 0, minOrder: +minOrder || 0, expiry });
    else addCoupon({ id: "sc-" + Math.random().toString(36).slice(2, 7), code: cd, title, detail: `On orders above ₹${minOrder}`, kind, value: +value || 0, maxOff: +maxOff || 0, minOrder: +minOrder || 0, active: true, used: 0, expiry });
    blip(920, 0.15);
    onClose();
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[58] bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: "85%" }} animate={{ y: 0 }} exit={{ y: "85%" }} transition={{ type: "spring", stiffness: 250, damping: 30 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[26px] app-bg">
        <div className="px-4 pb-10 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-black/15" />
          <div className="mt-3 flex items-center justify-between"><h3 className="text-[17px] font-extrabold">{id ? "Edit coupon" : "New coupon"}</h3><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full chip"><X size={16} /></button></div>
          <div className="mt-3 space-y-2.5">
            <Field label="Coupon code"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. DIWALI20" className="w-full bg-transparent text-[14px] font-black tracking-widest placeholder:text-ink3 placeholder:tracking-normal placeholder:font-semibold" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setKind("pct")} className={cn("rounded-[12px] py-3 text-[12.5px] font-extrabold", kind === "pct" ? "bg-[#7C5CFF] text-white" : "card shadow-card")}>% Percentage</button>
              <button onClick={() => setKind("flat")} className={cn("rounded-[12px] py-3 text-[12.5px] font-extrabold", kind === "flat" ? "bg-[#7C5CFF] text-white" : "card shadow-card")}>₹ Flat OFF</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label={kind === "pct" ? "Off %" : "₹ OFF"}><input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} className="w-full bg-transparent text-[13px] font-bold" /></Field>
              <Field label="Max ₹"><input inputMode="numeric" value={maxOff} onChange={(e) => setMaxOff(e.target.value.replace(/\D/g, ""))} className="w-full bg-transparent text-[13px] font-bold" /></Field>
              <Field label="Min order ₹"><input inputMode="numeric" value={minOrder} onChange={(e) => setMinOrder(e.target.value.replace(/\D/g, ""))} className="w-full bg-transparent text-[13px] font-bold" /></Field>
            </div>
            <Field label="Expiry"><input value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full bg-transparent text-[13px] font-semibold" /></Field>
            <div className="rounded-[12px] bg-[#0C831F]/10 p-3 text-[11.5px] font-bold text-[#0C5B21]">Preview: <b>{code || "CODE"}</b> — {kind === "pct" ? `${value || 0}% OFF up to ₹${maxOff}` : `Flat ₹${value} OFF`} on orders above ₹{minOrder || 0}</div>
          </div>
          <button onClick={save} className="mt-4 w-full rounded-[14px] bg-[#0C831F] py-4 text-[14px] font-extrabold text-white">{id ? "Save coupon" : "Launch coupon"}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════ MANAGE ═══════════ */
export function SellerManage() {
  const { seller, setSeller, team, addTeam, toggleTeam, set, catalog } = useOSB();
  const [riderForm, setRiderForm] = useState(false);
  const [permFor, setPermFor] = useState<string | null>(null);
  const [rn, setRn] = useState(""); const [rp, setRp] = useState(""); const [rv, setRv] = useState("");
  const [tmForm, setTmForm] = useState(false);
  const [tn, setTn] = useState(""); const [tr, setTr] = useState("Staff");
  const { addRider, removeRider } = useOSB();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const plans = [
    { k: "basic", t: "Basic ₹499/mo", f: ["50 products", "Basic analytics", "1 staff login"], c: "#1573FF" },
    { k: "growth", t: "Growth ₹999/mo", f: ["200 products", "AI insights + coupons", "5 staff logins"], c: "#0C831F" },
    { k: "scale", t: "Scale ₹2499/mo", f: ["Unlimited products", "Marketing suite", "Unlimited staff"], c: "#7C5CFF" },
  ];

  return (
    <div className="app-bg px-4 pb-44 pt-4">
      <div className="flex items-center gap-3">
        <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-2xl bg-black/10">{seller.coverImage ? <Img src={seller.coverImage} alt="store" className="h-full w-full" /> : <span className="grid h-full place-items-center text-[22px]">🛍️</span>}</div>
        <div className="flex-1"><h1 className="text-[19px] font-extrabold leading-none tracking-tight">{seller.name}</h1><p className="mt-1 text-[11px] font-semibold text-ink3">{seller.plan.toUpperCase()} plan • Health 94 • Since 2023</p></div>
        <button onClick={() => set({ tab: "profile" })} className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#E23744] to-[#FF7A45] text-[15px] font-black text-white">A</button>
      </div>

      {/* store open */}
      <div className="card mt-3 flex items-center gap-3 rounded-[18px] p-4 shadow-card">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", seller.storeOpen ? "bg-[#0C831F]/12 text-[#0C831F]" : "bg-[#E23744]/12 text-[#E23744]")}><Power size={18} /></span>
        <span className="flex-1"><span className="block text-[13.5px] font-extrabold">{seller.storeOpen ? "Store is LIVE" : "Store is CLOSED"} </span><span className="block text-[11px] text-ink3">{seller.storeOpen ? `Visible within ${seller.radiusKm} km • ${seller.openTime}–${seller.closeTime}` : "Customers see you as closed"}</span></span>
        <Tog on={seller.storeOpen} onTap={() => setSeller({ storeOpen: !seller.storeOpen })} />
      </div>

      {/* ── SELF DELIVERY ── */}
      <div className="mt-3 overflow-hidden rounded-[20px] bg-[#111117] p-4 text-white">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F8CB46] text-black"><Truck size={18} /></span>
          <div className="flex-1"><div className="text-[14px] font-extrabold">My Delivery — I deliver myself 🛵</div><div className="text-[10.5px] font-semibold text-white/60">No platform riders. Your staff, your control.</div></div>
          <Tog on={seller.deliveryOn} onTap={() => setSeller({ deliveryOn: !seller.deliveryOn })} />
        </div>

        {/* radius visual */}
        <div className="relative mx-auto mt-3 h-[168px] w-[168px]">
          {[1, 0.72, 0.45].map((s, i) => (
            <span key={i} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed" style={{ width: 160 * s, height: 160 * s, borderColor: i === 0 ? "#F8CB46" : "rgba(255,255,255,.25)", background: i === 0 ? "rgba(248,203,70,.10)" : "transparent" }} />
          ))}
          <span className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-[#F8CB46] text-[22px] shadow-xl">🏪</span>
          <span className="absolute -right-1 top-2 rounded-full bg-white px-2 py-1 text-[10px] font-black text-black">~{(seller.radiusKm * 3.14 * seller.radiusKm).toFixed(0)} km²</span>
          <span className="absolute -left-2 bottom-3 text-[20px]">🏠</span>
          <span className="absolute right-6 bottom-6 text-[16px]">🏠</span>
        </div>
        <div className="mt-2 text-center"><span className="text-[26px] font-extrabold text-[#F8CB46]">{seller.radiusKm} km</span><div className="text-[11px] font-semibold text-white/60">Customers inside this circle see your store LIVE</div></div>
        <input type="range" min={1} max={15} value={seller.radiusKm} onChange={(e) => setSeller({ radiusKm: +e.target.value })} className="mt-2 w-full accent-[#F8CB46]" />
        <div className="mt-1 flex justify-between text-[10px] font-black text-white/50"><span>1 KM</span><span>5 KM</span><span>10 KM</span><span>15 KM</span></div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="rounded-[12px] bg-white/8 p-2.5"><span className="block text-[9.5px] font-black uppercase tracking-wider text-white/50">Delivery fee ₹</span><input inputMode="numeric" value={seller.deliveryFee} onChange={(e) => setSeller({ deliveryFee: +e.target.value.replace(/\D/g, "") || 0 })} className="w-full bg-transparent text-[16px] font-extrabold" /></label>
          <label className="rounded-[12px] bg-white/8 p-2.5"><span className="block text-[9.5px] font-black uppercase tracking-wider text-white">Free above ₹</span><input inputMode="numeric" value={seller.freeAbove} onChange={(e) => setSeller({ freeAbove: +e.target.value.replace(/\D/g, "") || 0 })} className="w-full bg-transparent text-[16px] font-extrabold" /></label>
          <label className="rounded-[12px] bg-white/8 p-2.5"><span className="block text-[9.5px] font-black uppercase tracking-wider text-white">Min order ₹</span><input inputMode="numeric" value={seller.minOrder} onChange={(e) => setSeller({ minOrder: +e.target.value.replace(/\D/g, "") || 0 })} className="w-full bg-transparent text-[16px] font-extrabold" /></label>
          <label className="rounded-[12px] bg-white/8 p-2.5"><span className="block text-[9.5px] font-black uppercase tracking-wider text-white">Avg time (min)</span><input inputMode="numeric" value={seller.avgTime} onChange={(e) => setSeller({ avgTime: +e.target.value.replace(/\D/g, "") || 0 })} className="w-full bg-transparent text-[16px] font-extrabold" /></label>
        </div>
        <button onClick={() => setSeller({ pickup: !seller.pickup })} className="mt-2 flex w-full items-center gap-2 rounded-[12px] bg-white/8 p-3 text-left">
          <span className={cn("grid h-6 w-6 place-items-center rounded-md text-[13px] font-black", seller.pickup ? "bg-[#0C831F] text-white" : "bg-white/15 text-transparent")}>✓</span>
          <span className="text-[12px] font-bold">Also allow store pickup <span className="text-white/55">(customers collect, zero delivery cost)</span></span>
        </button>

        {/* riders */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[12px] font-extrabold">My delivery staff ({seller.riders.length})</span>
          {seller.riders.length > 0 && (
            <span className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-300">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> {seller.riders.filter((r) => r.online).length} online now
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[10.5px] font-semibold text-white/50">Staff log in with their own number — no password. You control what they can see.</p>
        <div className="mt-1.5 space-y-1.5">
          {seller.riders.map((r) => (
            <button key={r.phone + r.name} onClick={() => { setPermFor(r.phone); blip(620); }} className="flex w-full items-center gap-2.5 rounded-[12px] bg-white/8 p-2.5 text-left">
              <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F8CB46] text-[14px] font-black text-black">
                {r.name[0]}
                <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#111117]", r.online ? "bg-emerald-400" : "bg-white/25")} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-extrabold">{r.name} {r.active === false && <span className="text-white/45">• paused</span>}</span>
                <span className="block truncate text-[10.5px] text-white/55">{r.vehicle} • {r.phone}</span>
              </span>
              <span className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-black", r.online ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", r.online ? "bg-emerald-400" : "bg-white/40")} /> {r.online ? "Online" : "Offline"}
              </span>
              <ChevronRight size={15} className="text-white/45" />
            </button>
          ))}
        </div>
        {riderForm ? (
          <div className="mt-2 space-y-1.5">
            <input value={rn} onChange={(e) => setRn(e.target.value)} placeholder="Rider name" className="w-full rounded-[10px] bg-white/10 px-3 py-2.5 text-[12px] font-semibold placeholder:text-white/40" />
            <div className="flex gap-1.5">
              <input value={rp} onChange={(e) => setRp(e.target.value.replace(/[^\d+ ]/g, ""))} inputMode="tel" placeholder="Login phone (10 digits)" className="flex-1 rounded-[10px] bg-white/10 px-3 py-2.5 text-[12px] font-semibold placeholder:text-white/40" />
              <input value={rv} onChange={(e) => setRv(e.target.value)} placeholder="Vehicle + no." className="flex-1 rounded-[10px] bg-white/10 px-3 py-2.5 text-[12px] font-semibold placeholder:text-white/40" />
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setRiderForm(false)} className="flex-1 rounded-[10px] bg-white/10 py-2.5 text-[12px] font-extrabold">Cancel</button>
              <button onClick={() => { if (!rn.trim() || rp.replace(/\D/g, "").length < 10) return; addRider({ name: rn.trim(), phone: rp, vehicle: rv || "Bike" }); setRn(""); setRp(""); setRv(""); setRiderForm(false); blip(820); }} className="flex-1 rounded-[10px] bg-[#F8CB46] py-2.5 text-[12px] font-black text-black">Add rider</button>
            </div>
            <p className="text-[10px] font-semibold text-white/45">This number becomes their login — they get a delivery-only panel.</p>
          </div>
        ) : (
          <button onClick={() => setRiderForm(true)} className="mt-2 w-full rounded-[12px] border border-dashed border-white/30 py-2.5 text-[12px] font-extrabold text-white/80">＋ Add delivery staff</button>
        )}
      </div>

      <AnimatePresence>{permFor && <RiderAccessSheet phone={permFor} onClose={() => setPermFor(null)} />}</AnimatePresence>

      {/* business profile */}
      <div className="mt-4"><SectionHead title="Business profile" /></div>
      <div className="card mt-2.5 space-y-2.5 rounded-[18px] p-4 shadow-card">
        <Field label="Store name"><input value={seller.name} onChange={(e) => setSeller({ name: e.target.value })} className="w-full bg-transparent text-[13.5px] font-extrabold" /></Field>
        <Field label="Tagline"><input value={seller.tagline} onChange={(e) => setSeller({ tagline: e.target.value })} className="w-full bg-transparent text-[13px] font-semibold" /></Field>
        <Field label="Phone"><input value={seller.phone} onChange={(e) => setSeller({ phone: e.target.value })} className="w-full bg-transparent text-[13px] font-semibold" /></Field>
        <Field label="Address"><input value={seller.address} onChange={(e) => setSeller({ address: e.target.value })} className="w-full bg-transparent text-[12.5px] font-medium" /></Field>
        <Field label="About store"><textarea value={seller.description} onChange={(e) => setSeller({ description: e.target.value })} rows={2} className="w-full resize-none bg-transparent text-[12.5px] font-medium" /></Field>
      </div>

      {/* hours */}
      <div className="mt-4"><SectionHead title="Hours & vacation" sub="Customers see accurate open status" /></div>
      <div className="card mt-2.5 rounded-[18px] p-4 shadow-card">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Opens"><input value={seller.openTime} onChange={(e) => setSeller({ openTime: e.target.value })} placeholder="11:00" className="w-full bg-transparent text-[14px] font-extrabold" /></Field>
          <Field label="Closes"><input value={seller.closeTime} onChange={(e) => setSeller({ closeTime: e.target.value })} placeholder="23:00" className="w-full bg-transparent text-[14px] font-extrabold" /></Field>
        </div>
        <div className="mt-2.5 text-[11px] font-black uppercase tracking-widest text-ink3">Weekly off</div>
        <div className="mt-1.5 flex gap-1.5">
          {days.map((d) => {
            const off = seller.closedDays.includes(d);
            return <button key={d} onClick={() => setSeller({ closedDays: off ? seller.closedDays.filter((x) => x !== d) : [...seller.closedDays, d] })} className={cn("flex-1 rounded-[10px] py-2 text-[10.5px] font-black", off ? "bg-[#E23744] text-white" : "chip text-ink2")}>{d}</button>;
          })}
        </div>
        <div className="mt-2.5 flex items-center gap-2 rounded-[12px] bg-amber-400/15 p-3">
          <CalendarDays size={16} className="shrink-0 text-amber-600" />
          <input value={seller.vacationUntil} onChange={(e) => setSeller({ vacationUntil: e.target.value })} placeholder="Vacation until (e.g. 20 Oct) — empty = no vacation" className="flex-1 bg-transparent text-[12px] font-semibold placeholder:text-ink3" />
        </div>
        {seller.vacationUntil !== "" && <div className="mt-2 rounded-[12px] bg-amber-400/20 p-2.5 text-center text-[11.5px] font-bold text-amber-800">🏖️ Vacation ON till {seller.vacationUntil} — store hidden, subscription safe</div>}
      </div>

      {/* team */}
      <div className="mt-4"><SectionHead title="Team" sub={`${team.filter((t) => t.active).length} active`} action={<button onClick={() => setTmForm(!tmForm)} className="flex items-center gap-1 rounded-full bg-black px-3 py-1.5 text-[11px] font-black text-white dark:bg-white dark:text-black"><Plus size={12} /> Add</button>} /></div>
      {tmForm && (
        <div className="card mt-2 flex gap-1.5 rounded-[14px] p-2.5 shadow-card">
          <input autoFocus value={tn} onChange={(e) => setTn(e.target.value)} placeholder="Name" className="min-w-0 flex-1 rounded-[10px] card-2 px-3 py-2.5 text-[12px] font-semibold" />
          <input value={tr} onChange={(e) => setTr(e.target.value)} placeholder="Role" className="w-[110px] rounded-[10px] card-2 px-3 py-2.5 text-[12px] font-semibold" />
          <button onClick={() => { if (!tn.trim()) return; addTeam({ name: tn.trim(), role: tr || "Staff", phone: "—", active: true }); setTn(""); setTmForm(false); blip(820); }} className="rounded-[10px] bg-[#0C831F] px-4 text-[12px] font-black text-white">Add</button>
        </div>
      )}
      <div className="card mt-2.5 divide-y divide-line overflow-hidden rounded-[18px] shadow-card">
        {team.map((m) => (
          <div key={m.name} className="flex items-center gap-3 px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-black/8 text-[13px] font-black dark:bg-white/12">{m.name[0]}</span>
            <span className="flex-1"><span className="block text-[12.5px] font-extrabold">{m.name}</span><span className="block text-[10.5px] text-ink3">{m.role} • {m.phone}</span></span>
            <Tog small on={m.active} onTap={() => toggleTeam(m.name)} />
          </div>
        ))}
      </div>

      {/* subscription */}
      <div className="mt-4"><SectionHead title="Subscription" sub="Zero commission, always" /></div>
      <div className="card mt-2.5 rounded-[18px] p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div><div className="text-[11px] font-black uppercase tracking-widest text-ink3">{seller.plan} plan</div><div className="text-[15px] font-extrabold">Renews 12 Nov • Auto-pay ON</div></div>
          <span className="rounded-full bg-[#0C831F] px-3 py-1.5 text-[11px] font-black text-white">Active</span>
        </div>
        <div className="mt-2.5 space-y-2">
          <Usage label="Products" used={catalog.length} max={seller.plan === "basic" ? 50 : seller.plan === "growth" ? 200 : 999} />
          <Usage label="Orders this month" used={312} max={seller.plan === "basic" ? 500 : 2000} />
        </div>
        <div className="mt-3 space-y-1.5">
          {plans.map((pl) => {
            const on = seller.plan === pl.k;
            return (
              <button key={pl.k} onClick={() => { setSeller({ plan: pl.k as "basic" | "growth" | "scale" }); blip(820); }} className={cn("flex w-full items-center gap-2.5 rounded-[12px] p-3 text-left", on ? "ring-2" : "card-2")} style={on ? ({ "--tw-ring-color": pl.c } as React.CSSProperties) : undefined}>
                <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: pl.c }} />
                <span className="flex-1"><span className="block text-[12.5px] font-extrabold">{pl.t} {on && "✓"}</span><span className="block text-[10.5px] text-ink3">{pl.f.join(" • ")}</span></span>
              </button>
            );
          })}
        </div>
      </div>

      {/* payouts */}
      <div className="mt-4"><SectionHead title="Payouts" /></div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-[16px] bg-[#0E3B2E] p-4 text-white"><div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#D8F34E]"><Wallet size={12} /> Available</div><div className="mt-1 text-[21px] font-extrabold">₹18,204</div><div className="text-[10.5px] text-white/60">Settles tomorrow • HDFC ••4421</div></div>
        <div className="card rounded-[16px] p-4 shadow-card"><div className="text-[10px] font-black uppercase tracking-widest text-ink3">This month</div><div className="mt-1 text-[21px] font-extrabold">₹2.4L</div><div className="text-[10.5px] font-bold text-[#0C831F]">12 payouts • on time</div></div>
      </div>

      {/* misc */}
      <div className="card mt-3 overflow-hidden rounded-[18px] shadow-card">
        {[["🖥️", "CEO Admin demo", "See platform view"], ["💬", "Seller support", "Chat • 2 min reply"], ["📄", "Bills & invoices", "GST-ready downloads"]].map(([e, t, s]) => (
          <button key={t} onClick={() => { if (t.includes("CEO")) set({ mode: "admin", tab: "overview" }); else blip(600); }} className="flex w-full items-center gap-3 border-b divide-line px-4 py-3.5 text-left last:border-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl chip text-[17px]">{e}</span>
            <span className="flex-1"><span className="block text-[12.5px] font-extrabold">{t}</span><span className="block text-[10.5px] text-ink3">{s}</span></span>
            <ChevronRight size={15} className="opacity-35" />
          </button>
        ))}
      </div>
      <button onClick={() => set({ mode: "customer", tab: "home" })} className="mt-3 w-full rounded-full chip py-3.5 text-[13px] font-black">← Back to Customer view</button>
    </div>
  );
}

function RiderAccessSheet({ phone, onClose }: { phone: string; onClose: () => void }) {
  const { seller, setRiderPerm, updateRider, removeRider } = useOSB();
  const key = phone.replace(/\D/g, "").slice(-10);
  const r = seller.riders.find((x) => x.phone.replace(/\D/g, "").slice(-10) === key);
  const [confirmDel, setConfirmDel] = useState(false);
  if (!r) return null;
  const perms = { ...DEFAULT_RIDER_PERMS, ...(r.perms ?? {}) };
  const rows: [keyof RiderPerms, string, string][] = [
    ["customerAddress", "Customer address", "Needed to reach the door"],
    ["customerPhone", "Customer phone", "Lets rider call the buyer"],
    ["itemList", "Parcel contents", "What is inside the order"],
    ["orderAmount", "Order amount", "Bill value of the order"],
    ["collectCash", "Collect COD cash", "Can accept cash payments"],
    ["selfAssign", "Pick any ready order", "Otherwise you assign orders"],
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-black/55" onClick={onClose}>
      <motion.div initial={{ y: "92%" }} animate={{ y: 0 }} exit={{ y: "92%" }} transition={{ type: "spring", stiffness: 240, damping: 30 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[90%] overflow-hidden rounded-t-[26px] app-bg">
        <div className="no-scrollbar max-h-[90vh] overflow-y-auto px-4 pb-10 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-black/15" />
          <div className="mt-3 flex items-center gap-2.5">
            <span className="relative grid h-11 w-11 place-items-center rounded-full bg-[#F8CB46] text-[15px] font-black text-black">
              {r.name[0]}
              <span className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-[var(--app)]", r.online ? "bg-emerald-400" : "bg-black/20")} />
            </span>
            <div className="flex-1">
              <div className="text-[15px] font-extrabold">{r.name}</div>
              <div className="text-[11px] font-semibold text-ink3">{r.vehicle} • logs in with {r.phone}</div>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full chip"><X size={16} /></button>
          </div>

          <div className={cn("card mt-3 flex items-center gap-3 rounded-[16px] p-3.5 shadow-card", r.online && "ring-1 ring-emerald-400/40")}>
            <span className={cn("grid h-10 w-10 place-items-center rounded-xl", r.online ? "bg-emerald-500/15 text-emerald-500" : "chip text-ink3")}><Power size={18} /></span>
            <span className="flex-1">
              <span className="block text-[13px] font-extrabold">{r.online ? "Online now" : "Offline"}</span>
              <span className="block text-[11px] text-ink3">{r.online ? "Available to receive deliveries" : r.lastOnlineAt ? `Last online ${timeAgo(r.lastOnlineAt)}` : "Hasn't gone online yet"}</span>
            </span>
            <span className={cn("h-2.5 w-2.5 rounded-full", r.online ? "live-dot bg-emerald-400" : "bg-black/15")} />
          </div>

          <div className="card mt-2.5 flex items-center gap-3 rounded-[16px] p-3.5 shadow-card">
            <span className={cn("grid h-10 w-10 place-items-center rounded-xl", r.active === false ? "bg-black/8 text-ink3" : "bg-[#0C831F]/12 text-[#0C831F]")}><Truck size={18} /></span>
            <span className="flex-1"><span className="block text-[13px] font-extrabold">{r.active === false ? "Login paused" : "Can log in & deliver"}</span><span className="block text-[11px] text-ink3">Turn off to block this staff instantly</span></span>
            <Tog on={r.active !== false} onTap={() => updateRider(r.phone, { active: r.active === false })} />
          </div>

          <div className="mt-4"><SectionHead title="What this rider can see" sub="Everything else stays private" /></div>
          <div className="card mt-2.5 divide-y divide-line overflow-hidden rounded-[18px] shadow-card">
            {rows.map(([k, t, s]) => (
              <div key={k} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl chip">{perms[k] ? <Eye size={15} /> : <EyeOff size={15} className="text-ink3" />}</span>
                <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-extrabold">{t}</span><span className="block text-[10.5px] text-ink3">{s}</span></span>
                <Tog small on={perms[k]} onTap={() => setRiderPerm(r.phone, k, !perms[k])} />
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-[14px] bg-[#1573FF]/10 p-3.5 text-[11.5px] font-semibold leading-relaxed text-[#0B5BD3]">
            Riders never see your catalog, khata, revenue or other customers — only the orders you mark <b>Ready</b>.
          </div>

          {confirmDel ? (
            <div className="mt-3 flex gap-2">
              <button onClick={() => setConfirmDel(false)} className="flex-1 rounded-[13px] chip py-3 text-[12.5px] font-extrabold">Cancel</button>
              <button onClick={() => { removeRider(r.name); blip(400); onClose(); }} className="flex-1 rounded-[13px] bg-[#E23744] py-3 text-[12.5px] font-black text-white">Remove rider</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[13px] card py-3 text-[12.5px] font-extrabold text-[#E23744] shadow-card"><Trash2 size={14} /> Remove from staff</button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Usage({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold"><span className="text-ink2">{label}</span><span className="tabular-nums">{used}/{max}</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full chip"><div className="h-full rounded-full bg-[#0C831F]" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/* ═══════════ ONBOARDING ═══════════ */
export function SellerOnboarding() {
  const { setSeller, seller, set, addTeam, phone: ownerPhone, userName, saveAccount } = useOSB();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(seller.name);
  const [phone, setPhone] = useState(seller.phone || ownerPhone);
  const [addr, setAddr] = useState(seller.address);
  const [err, setErr] = useState("");
  const steps = ["Business", "Categories", "Delivery", "Hours", "Plan"];
  const primary = CATEGORIES.find((c) => seller.categories[0] === c.k) ?? CATEGORIES.find((c) => seller.categories.includes(c.k));
  const done = () => {
    const digits = (ownerPhone || phone).replace(/\D/g, "").slice(-10);
    const storeName = name.trim() || (primary ? `My ${primary.t}` : "My Store");
    setSeller({
      onboarded: true,
      storeOpen: true,
      storeId: seller.storeId && seller.storeId !== "mine" ? seller.storeId : "mine-" + (digits || "shop"),
      name: storeName,
      phone: phone.trim() || ownerPhone,
      address: addr.trim() || "HSR Layout, Bengaluru",
      tagline: primary?.sub || "Local store",
      coverImage: primary?.img || "",
      description: primary ? `${primary.t} from a neighbourhood business in HSR.` : "Local store on One Stop Bazar.",
      announcement: "",
    });
    if (useOSB.getState().team.length === 0) addTeam({ name: userName || "You", role: "Owner", phone: phone.trim() || ownerPhone || "—", active: true });
    useOSB.setState({ catalogInit: true, tab: "dash", mode: "provider" });
    saveAccount();
    blip(990, 0.2);
  };
  const next = () => {
    if (step === 0 && !name.trim()) { setErr("Give your store a name."); return; }
    if (step === 1 && seller.categories.length === 0) { setErr("Pick at least one category you sell in."); return; }
    setErr("");
    blip(720);
    if (step < 4) setStep(step + 1);
    else done();
  };
  return (
    <div className="app-bg flex min-h-full flex-col px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">{steps.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-8 bg-[#0C831F]" : i < step ? "w-3 bg-[#0C831F]" : "w-3 bg-black/15")} />)}</div>
        <button onClick={() => set({ mode: "customer", tab: "home" })} className="text-[12px] font-extrabold text-ink3">Exit</button>
      </div>
      <div className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#0C831F]">Step {step + 1} of {steps.length} • {steps[step]}</div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="mt-4 flex-1">
          {step === 0 && (
            <>
              <h2 className="text-[24px] font-extrabold leading-tight tracking-tight">Tell us about<br />your business 🏪</h2>
              <div className="mt-4 space-y-2.5">
                <Field label="Business name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mira’s Wardrobe" className="w-full bg-transparent text-[14px] font-extrabold placeholder:text-ink3 placeholder:font-semibold" /></Field>
                <Field label="Owner phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxx xxxxx" className="w-full bg-transparent text-[14px] font-semibold placeholder:text-ink3" /></Field>
                <Field label="Store address"><input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Street, HSR Layout" className="w-full bg-transparent text-[13px] font-medium placeholder:text-ink3" /></Field>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="text-[24px] font-extrabold leading-tight tracking-tight">What do you sell? 🛍️</h2>
              <p className="mt-1 text-[12.5px] text-ink2">Pick all that apply — you appear under each.</p>
              <div className="mt-3 grid max-h-[46vh] grid-cols-2 gap-2 overflow-y-auto pr-1">
                {CATEGORIES.map((c) => {
                  const on = seller.categories.includes(c.k);
                  return (
                    <button key={c.k} onClick={() => {
                      const next = on ? seller.categories.filter((x) => x !== c.k) : [...seller.categories, c.k];
                      const prim = CATEGORIES.find((x) => x.k === next[0]);
                      setSeller({ categories: next, coverImage: prim?.img || "", tagline: prim?.sub || seller.tagline });
                      setErr("");
                    }} className={cn("card flex items-center gap-2.5 rounded-[14px] p-2.5 text-left shadow-card", on && "ring-2 ring-[#0C831F]")}>
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">{c.img ? <Img src={c.img} alt={c.t} className="h-full w-full" /> : c.emoji}</span>
                      <span className="min-w-0 text-[12px] font-extrabold leading-tight">{c.t}</span>
                      {on && <Check size={14} className="ml-auto shrink-0 text-[#0C831F]" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-center text-[11px] font-bold text-ink3">{seller.categories.length ? `Selling in ${seller.categories.map((k) => CATEGORIES.find((c) => c.k === k)?.t).filter(Boolean).join(", ")}` : "Select every category you actually sell"}</p>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-[24px] font-extrabold leading-tight tracking-tight">You deliver it<br />yourself 🛵</h2>
              <div className="mt-2 rounded-[14px] bg-[#F8CB46]/25 p-3 text-[12px] font-semibold leading-relaxed">One Stop Bazar has <b>no delivery fleet</b>. Orders come to you — your staff delivers. Set how far your store shows LIVE:</div>
              <div className="card mt-3 rounded-[18px] p-4 text-center shadow-card">
                <div className="text-[34px] font-extrabold text-[#0C831F]">{seller.radiusKm} km</div>
                <input type="range" min={1} max={15} value={seller.radiusKm} onChange={(e) => setSeller({ radiusKm: +e.target.value })} className="mt-2 w-full accent-[#0C831F]" />
                <div className="mt-2 grid grid-cols-2 gap-2 text-left">
                  <Field label="Delivery fee ₹"><input inputMode="numeric" value={seller.deliveryFee} onChange={(e) => setSeller({ deliveryFee: +e.target.value.replace(/\D/g, "") || 0 })} className="w-full bg-transparent text-[14px] font-bold" /></Field>
                  <Field label="Free above ₹"><input inputMode="numeric" value={seller.freeAbove} onChange={(e) => setSeller({ freeAbove: +e.target.value.replace(/\D/g, "") || 0 })} className="w-full bg-transparent text-[14px] font-bold" /></Field>
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2 className="text-[24px] font-extrabold leading-tight tracking-tight">When are you open? ⏰</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Field label="Opens"><input value={seller.openTime} onChange={(e) => setSeller({ openTime: e.target.value })} className="w-full bg-transparent text-[15px] font-extrabold" /></Field>
                <Field label="Closes"><input value={seller.closeTime} onChange={(e) => setSeller({ closeTime: e.target.value })} className="w-full bg-transparent text-[15px] font-extrabold" /></Field>
              </div>
              <div className="card mt-3 rounded-[16px] p-4 shadow-card">
                <div className="flex items-center gap-2 text-[13px] font-extrabold"><Clock size={15} /> Same hours all days? <span className="ml-auto text-[11px] font-bold text-[#0C831F]">Yes, flexible ✓</span></div>
                <p className="mt-1 text-[11.5px] text-ink3">Change per-day hours & holidays anytime from Manage.</p>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <h2 className="text-[24px] font-extrabold leading-tight tracking-tight">Pick your plan 💳</h2>
              <p className="mt-1 text-[12.5px] text-ink2">Zero commission on every plan. Cancel anytime.</p>
              <div className="mt-3 space-y-2">
                {[["basic", "Basic", "₹499/mo", "50 products • basic analytics"], ["growth", "Growth", "₹999/mo", "200 products • AI + coupons • most popular"], ["scale", "Scale", "₹2499/mo", "Unlimited • marketing suite"]].map(([k, t, pr, f]) => (
                  <button key={k} onClick={() => setSeller({ plan: k as "basic" | "growth" | "scale" })} className={cn("flex w-full items-center gap-3 rounded-[16px] card p-4 text-left shadow-card", seller.plan === k && "ring-2 ring-[#0C831F]")}>
                    <span className="flex-1"><span className="block text-[14px] font-extrabold">{t} • {pr}</span><span className="block text-[11.5px] text-ink3">{f}</span></span>
                    {seller.plan === k && <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0C831F] text-white"><Check size={13} strokeWidth={3} /></span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {err && <div className="mt-3 rounded-[12px] bg-[#E23744]/10 p-3 text-center text-[12px] font-bold text-[#E23744]">{err}</div>}
      <div className="mt-4 flex gap-2">
        {step > 0 && <button onClick={() => { setErr(""); setStep(step - 1); }} className="rounded-[14px] chip px-5 py-4 text-[14px] font-extrabold">Back</button>}
        <button onClick={next} className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#0C831F] py-4 text-[14.5px] font-extrabold text-white shadow-[0_14px_32px_rgba(12,131,31,.4)]">
          {step < 4 ? <>Continue <ChevronRight size={17} /></> : <>🚀 Open my store</>}
        </button>
      </div>
      <button onClick={() => set({ tab: "profile" })} className="mx-auto mt-3 flex items-center gap-1.5 text-[11.5px] font-bold text-ink3"><Bell size={13} /> Notifications allowed • order alerts ON</button>
      <div className="mt-6 flex items-center justify-center gap-4 text-ink3"><Phone size={15} /><Users size={15} /><StoreIcon size={15} /></div>
    </div>
  );
}
