"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bot, Check, CheckCircle2, ChevronRight, Lightbulb, Search, Send, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { CATEGORIES, type CategoryDef } from "@/lib/data";
import { blip, useOSB } from "@/lib/osb-store";
import { cn } from "@/lib/cn";
import { Img } from "./ui";

type Stage = "name" | "thinking" | "suggest" | "pick" | "request" | "attrs" | "published";

const KEYWORDS: { keys: string[]; cat: string; sub: string; attrs: string[] }[] = [
  { keys: ["dog", "cat", "pet", "puppy", "kibble", "leash"], cat: "Pet Supplies", sub: "Pet Supplies → Dog Food", attrs: ["Brand", "Weight", "Flavor", "Life stage"] },
  { keys: ["charger", "cable", "phone", "earbuds", "headphone", "adapter", "power bank"], cat: "Mobile & Computer", sub: "Mobile & Computer → Chargers", attrs: ["Brand", "Wattage", "Connector", "Warranty"] },
  { keys: ["shoe", "shoes", "sneaker", "kurti", "shirt", "tshirt", "dress", "jeans"], cat: "Fashion", sub: "Fashion → Footwear / Apparel", attrs: ["Brand", "Size", "Color", "Material", "Gender"] },
  { keys: ["cream", "serum", "shampoo", "makeup", "lipstick", "sunscreen"], cat: "Beauty & Care", sub: "Beauty & Care → Skincare", attrs: ["Brand", "Skin type", "Volume", "Vegan"] },
  { keys: ["milk", "atta", "rice", "oil", "vegetable", "fruit", "bread", "egg"], cat: "Grocery", sub: "Grocery → Staples / Dairy", attrs: ["Brand", "Weight", "Pack size", "Veg status"] },
  { keys: ["biryani", "dosa", "burger", "pizza", "meal", "thali"], cat: "Food", sub: "Food → Restaurant menu", attrs: ["Serves", "Veg status", "Spice level"] },
  { keys: ["chair", "table", "bed", "sofa", "furniture"], cat: "Furniture", sub: "Furniture → Chairs", attrs: ["Material", "Dimensions", "Color", "Assembly", "Warranty"] },
  { keys: ["drill", "paint", "pipe", "switch", "bulb", "wrench"], cat: "Hardware & Electrical", sub: "Hardware → Power tools", attrs: ["Brand", "Model", "Warranty", "Specifications"] },
  { keys: ["toy", "diaper", "baby", "bottle", "rattle"], cat: "Toys, Baby & Kids", sub: "Toys, Baby & Kids", attrs: ["Age group", "Brand", "Safety cert"] },
  { keys: ["dumbbell", "yoga", "cricket", "gym", "fitness"], cat: "Sports & Fitness", sub: "Sports & Fitness → Fitness", attrs: ["Brand", "Weight", "Material"] },
  { keys: ["car", "bike", "freshener", "mount"], cat: "Automobile", sub: "Automobile → Car accessories", attrs: ["Compatibility", "Brand", "Warranty"] },
];

export function ProviderCatalogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { requestCategory, addProduct, ensureCatalog } = useOSB();
  const [stage, setStage] = useState<Stage>("name");
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState<CategoryDef | null>(null);
  const [attrs, setAttrs] = useState<string[]>([]);
  const [breadcrumb, setBreadcrumb] = useState("");
  const [conf, setConf] = useState(0);
  const [reqName, setReqName] = useState("");
  const [reqParent, setReqParent] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqEmoji, setReqEmoji] = useState("✨");
  const [price, setPrice] = useState("");

  const suggestion = useMemo(() => {
    const q = name.toLowerCase();
    return KEYWORDS.find((k) => k.keys.some((w) => q.includes(w)));
  }, [name]);

  const reset = () => { setStage("name"); setName(""); setChosen(null); setAttrs([]); setReqName(""); setPrice(""); };
  const close = () => { onClose(); setTimeout(reset, 250); };

  const runAi = () => {
    if (!name.trim()) return;
    setStage("thinking");
    blip(880, 0.1);
    setTimeout(() => {
      if (suggestion) {
        const cat = CATEGORIES.find((c) => c.t === suggestion.cat);
        setChosen(cat ?? null);
        setAttrs(suggestion.attrs);
        setBreadcrumb(suggestion.sub);
        setConf(92 + (name.length % 6));
      } else {
        setBreadcrumb("General → Uncategorized");
        setAttrs(["Brand", "Description"]);
        setConf(64);
      }
      setStage("suggest");
    }, 1600);
  };

  const publish = () => {
    ensureCatalog();
    addProduct({
      id: "cp-" + Math.random().toString(36).slice(2, 8),
      storeId: useOSB.getState().seller.storeId || "mine",
      name: name.trim() || "New product",
      description: attrs.length ? `Specs: ${attrs.join(", ")}.` : "Fresh from our store.",
      price: Math.max(1, +price || 99),
      mrp: undefined,
      emoji: "✨",
      image: chosen?.img ?? "",
      category: chosen?.t ?? "General",
      rating: 4.5,
      isVeg: true,
      isBestseller: false,
      stock: 20,
      unit: "1 pc",
      tint: "#F1F0EA",
      eta: "30 mins",
    });
    setStage("published");
    blip(990, 0.2);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[58] bg-black/50 backdrop-blur-[3px]" onClick={close}>
          <motion.div initial={{ y: "92%" }} animate={{ y: 0 }} exit={{ y: "92%" }} transition={{ type: "spring", stiffness: 230, damping: 30 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[92%] overflow-hidden rounded-t-[26px] app-bg">
            <div className="no-scrollbar max-h-[92vh] overflow-y-auto px-4 pb-10 pt-3">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-black/15" />
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[19px] font-extrabold tracking-tight">Add product</h3>
                  <p className="text-[11.5px] font-medium text-ink2">AI places it in the right category automatically</p>
                </div>
                <button onClick={close} className="grid h-9 w-9 place-items-center rounded-full chip"><X size={17} /></button>
              </div>

              {stage === "name" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <label className="text-[11px] font-black uppercase tracking-widest text-ink3">Product name</label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-[14px] card px-3.5 py-3.5 shadow-card">
                    <Search size={16} className="text-ink3" />
                    <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runAi()} placeholder="e.g. Samsung 25W Fast Charger" className="flex-1 bg-transparent text-[14px] font-semibold placeholder:text-ink3" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Royal Canin Dog Food 2KG", "Handmade Jute Bags", "Black Running Shoes", "Cold Pressed Coconut Oil 1L"].map((e) => (
                      <button key={e} onClick={() => setName(e)} className="rounded-full chip px-2.5 py-1 text-[10.5px] font-bold text-ink2">{e}</button>
                    ))}
                  </div>
                  <button onClick={runAi} className="mt-5 flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#111] py-4 text-[14px] font-extrabold text-white" style={{ background: "var(--ink)", color: "var(--app)" }}>
                    <Bot size={18} /> Auto-detect category
                  </button>
                  <button onClick={() => setStage("pick")} className="mt-2 w-full rounded-[14px] card py-3.5 text-[13px] font-extrabold shadow-card">Choose category manually</button>
                </motion.div>
              )}

              {stage === "thinking" && (
                <div className="grid place-items-center py-14">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} className="grid h-16 w-16 place-items-center rounded-2xl bg-[#7C5CFF]/12 text-[#7C5CFF]"><Bot size={30} /></motion.div>
                  <div className="mt-4 text-[14px] font-extrabold">Reading catalog taxonomy…</div>
                  <div className="mt-1 text-[12px] text-ink3">Matching “{name}” across {CATEGORIES.length} categories</div>
                  <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full chip"><motion.div className="h-full w-1/3 rounded-full bg-[#7C5CFF]" animate={{ x: ["-100%", "320%"] }} transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }} /></div>
                </div>
              )}

              {stage === "suggest" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <div className="rounded-[18px] p-4" style={{ background: "linear-gradient(135deg,#7C5CFF18,#1FB67C12)" }}>
                    <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.16em] text-[#7C5CFF]"><Sparkles size={12} /> Suggested category • {conf}% match</div>
                    <div className="mt-1.5 text-[15px] font-extrabold leading-snug">{breadcrumb}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {attrs.map((a) => <span key={a} className="rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>{a}</span>)}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => setStage("pick")} className="rounded-[13px] card py-3 text-[12.5px] font-extrabold shadow-card">Change</button>
                    <button onClick={() => { setStage("attrs"); blip(760); }} className="flex items-center justify-center gap-1 rounded-[13px] bg-[#0C831F] py-3 text-[12.5px] font-extrabold text-white">Confirm <Check size={15} /></button>
                  </div>
                  <button onClick={() => setStage("request")} className="mt-2 flex w-full items-center justify-center gap-2 rounded-[13px] border-2 border-dashed border-[#7C5CFF]/50 bg-[#7C5CFF]/8 py-3.5 text-[12.5px] font-extrabold text-[#7C5CFF]">
                    <Lightbulb size={15} /> Suggest a new category
                  </button>
                  {conf < 75 && <p className="mt-2 text-center text-[11px] text-ink3">Low confidence — requesting a new category helps us improve.</p>}
                </motion.div>
              )}

              {stage === "pick" && (
                <div className="mt-4">
                  <div className="no-scrollbar grid max-h-[46vh] gap-2 overflow-y-auto">
                    {CATEGORIES.map((c) => (
                      <button key={c.k} onClick={() => { setChosen(c); setAttrs(c.subs.slice(0, 4)); setBreadcrumb(c.t); setStage("attrs"); blip(640); }} className="flex items-center gap-3 rounded-[14px] card p-2.5 text-left shadow-card">
                        <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">{c.img ? <Img src={c.img} alt={c.t} className="h-full w-full" /> : <span className="grid h-full w-full place-items-center text-lg">{c.emoji}</span>}</span>
                        <span className="flex-1"><span className="block text-[13px] font-extrabold">{c.t}</span><span className="block text-[10.5px] text-ink3">{c.subs.slice(0, 3).join(" • ")}</span></span>
                        <ChevronRight size={15} className="opacity-40" />
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setStage("request")} className="mt-2 w-full rounded-[13px] border-2 border-dashed border-[#7C5CFF]/50 py-3 text-[12.5px] font-extrabold text-[#7C5CFF]">＋ Can’t find it? Suggest new category</button>
                </div>
              )}

              {stage === "request" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <div className="rounded-[16px] bg-[#7C5CFF]/10 p-3.5 text-[12px] font-semibold leading-relaxed text-[#5A44D6]">Your request goes to the <b>Global Admin (CEO)</b>. Once approved, the category appears in every customer’s app instantly — no app update needed.</div>
                  <div className="mt-3 space-y-2.5">
                    <Field label="Product / item name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product that needs a new category" className="w-full bg-transparent text-[13.5px] font-semibold placeholder:text-ink3" /></Field>
                    <Field label="Suggested category *"><input autoFocus value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="e.g. Eco Living" className="w-full bg-transparent text-[13.5px] font-semibold placeholder:text-ink3" /></Field>
                    <Field label="Parent category (optional)"><input value={reqParent} onChange={(e) => setReqParent(e.target.value)} placeholder="e.g. Lifestyle" className="w-full bg-transparent text-[13.5px] font-semibold placeholder:text-ink3" /></Field>
                    <Field label="Why it’s needed"><textarea value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} rows={2} placeholder="Describe items this category will contain…" className="w-full resize-none bg-transparent text-[13px] font-medium placeholder:text-ink3" /></Field>
                    <div className="flex items-center gap-2">
                      {["✨", "👜", "🧘", "🪴", "🎸", "🧩"].map((e) => (
                        <button key={e} onClick={() => setReqEmoji(e)} className={cn("grid h-9 w-9 place-items-center rounded-xl text-lg", reqEmoji === e ? "bg-[#7C5CFF] ring-2 ring-[#7C5CFF]/40" : "card shadow-card")}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!reqName.trim()) return;
                      requestCategory({ productName: name || reqName, category: reqName.trim(), parent: reqParent.trim() || undefined, description: reqDesc.trim() || "Requested from provider app.", emoji: reqEmoji, storeName: "Meghana Foods" });
                      blip(920, 0.15);
                      reset();
                      setStage("published");
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#7C5CFF] py-4 text-[14px] font-extrabold text-white"
                  >
                    <Send size={16} /> Send request to Global Admin
                  </button>
                </motion.div>
              )}

              {stage === "attrs" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <div className="rounded-[14px] card p-3 shadow-card">
                    <div className="text-[10.5px] font-black uppercase tracking-widest text-ink3">Product</div>
                    <div className="text-[14.5px] font-extrabold">{name}</div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#0C831F]/10 px-2 py-1 text-[10.5px] font-black text-[#0C831F]"><Check size={11} /> {breadcrumb}</div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {attrs.map((a) => (
                      <div key={a} className="rounded-[13px] card px-3 py-2.5 shadow-card">
                        <div className="text-[9.5px] font-black uppercase tracking-wider text-ink3">{a}</div>
                        <input placeholder="Tap to add" className="w-full bg-transparent text-[12.5px] font-bold placeholder:text-ink3" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <div className="rounded-[13px] card px-3 py-2.5 shadow-card"><div className="text-[9.5px] font-black uppercase text-ink3">Price ₹</div><input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="w-full bg-transparent text-[12.5px] font-bold" /></div>
                    <div className="rounded-[13px] card px-3 py-2.5 shadow-card"><div className="text-[9.5px] font-black uppercase text-ink3">MRP ₹</div><input inputMode="numeric" placeholder="0" className="w-full bg-transparent text-[12.5px] font-bold" /></div>
                    <div className="rounded-[13px] card px-3 py-2.5 shadow-card"><div className="text-[9.5px] font-black uppercase text-ink3">Stock</div><input inputMode="numeric" placeholder="0" className="w-full bg-transparent text-[12.5px] font-bold" /></div>
                  </div>
                  <div className="mt-2.5 rounded-[13px] border-2 border-dashed divide-line p-4 text-center">
                    <div className="text-[24px]">📷</div>
                    <div className="text-[11.5px] font-bold text-ink2">Add up to 5 photos</div>
                  </div>
                  <button onClick={publish} className="mt-4 w-full rounded-[14px] bg-[#0C831F] py-4 text-[14px] font-extrabold text-white">Publish product</button>
                </motion.div>
              )}

              {stage === "published" && (
                <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 16 }} className="grid place-items-center py-12 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 14 }} className="grid h-20 w-20 place-items-center rounded-full bg-[#0C831F] text-[38px] text-white shadow-[0_18px_44px_rgba(12,131,31,.4)]"><CheckCircle2 size={40} /></motion.div>
                  <h4 className="mt-4 text-[19px] font-extrabold">Submitted! 🎉</h4>
                  <p className="mt-1 max-w-[270px] text-[12.5px] text-ink2">
                    {reqName ? <>Your request for <b>“{reqName}”</b> is now in the Global Admin queue. You’ll be notified the moment it’s approved.</> : <>Your product is live and searchable. The AI catalog updates instantly.</>}
                  </p>
                  <button onClick={close} className="mt-5 rounded-full px-8 py-3 text-[13px] font-extrabold text-white" style={{ background: "var(--ink)", color: "var(--app)" }}>Done <ArrowRight size={14} className="inline" /></button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
