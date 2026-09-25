"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Bell, Bike, Bot, Check, ChevronRight, Clock, Eye, MapPin, Phone, Plus, Power, Search, Star, Truck, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { WEEKLY, inr } from "@/lib/data";
import { blip, useOSB, type SellerOrder, type SellerOrderStatus } from "@/lib/osb-store";
import { cn } from "@/lib/cn";
import { AreaGraph, Glass, Ring, SectionHead, SpringBtn } from "./ui";
import { ProviderCatalogSheet } from "./provider-catalog";
import { SellerManage } from "./seller";

export function ProviderDash() {
  const { set, seller, catalog, ensureCatalog, sellerOrders, team } = useOSB();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const pendingReq = useOSB((s) => s.catRequests.filter((r) => r.status === "pending").length);
  const vacation = seller.vacationUntil !== "";

  useEffect(() => { ensureCatalog(); }, [ensureCatalog]);

  const live = sellerOrders.filter((o) => o.status !== "cancelled");
  const revenue = live.reduce((a, o) => a + o.total, 0);
  const newOrders = sellerOrders.filter((o) => o.status === "new");
  const activeOrders = sellerOrders.filter((o) => ["accepted", "preparing", "ready", "onway"].includes(o.status));
  const lowStock = catalog.filter((p) => p.stock <= 15 && p.stock > 0);
  const outStock = catalog.filter((p) => p.stock === 0);
  const codPending = sellerOrders.filter((o) => o.payment === "COD" && o.status !== "delivered" && o.status !== "cancelled").reduce((a, o) => a + o.total, 0);

  const quick: [string, string, string, string, number?][] = [
    ["🧾", "Orders", "porders", `${newOrders.length} new`, newOrders.length],
    ["📦", "Catalog", "catalog", `${catalog.length} items`],
    ["📒", "Khata", "khata", "Sales • Udhaar"],
    ["🎟️", "Marketing", "marketing", "Coupons live"],
    ["🛵", "Delivery", "more", `${seller.radiusKm} km range`],
    ["👥", "Team", "more", `${team.filter((t) => t.active).length} active`],
  ];

  return (
    <div className="app-bg pb-44">
      <div className="px-4 pt-4">
        <Glass strong className="flex items-center gap-3 p-3.5">
          <button onClick={() => set({ tab: "more" })} className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-black/10">
            {seller.coverImage ? <img src={seller.coverImage} alt={seller.name} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[18px]">🛍️</span>}
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-black">{seller.name}</div>
            <div className="text-[11.5px] font-bold text-ink3">{seller.storeOpen && !vacation ? `Open • till ${seller.closeTime}` : vacation ? `Vacation till ${seller.vacationUntil}` : "Closed"} • {seller.radiusKm} km live</div>
          </div>
          <button onClick={() => set({ tab: "porders" })} className="relative grid h-10 w-10 place-items-center rounded-xl chip">
            <Bell size={17} />
            {newOrders.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#E23744] px-1 text-[10px] font-black text-white">{newOrders.length}</span>}
          </button>
          <button onClick={() => useOSB.getState().setSeller({ storeOpen: !seller.storeOpen })} className={cn("flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-black pressable", seller.storeOpen ? "bg-[#0C831F] text-white" : "bg-black/15 text-ink2")}>
            <Power size={13} /> {seller.storeOpen ? "Live" : "Off"}
          </button>
        </Glass>
        {vacation && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-[16px] bg-amber-400/20 p-3 text-[12px] font-bold text-amber-900 ring-1 ring-amber-400/40">
            🏖️ Vacation till {seller.vacationUntil} — store hidden from customers. Change in Manage → Hours.
          </motion.div>
        )}
      </div>

      {/* revenue hero — live */}
      <div className="px-4 pt-3">
        <div className="grain relative overflow-hidden rounded-[26px] bg-[#111117] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,.35)]">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#F8CB46]/20 blur-2xl" />
          <div className="absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-[#7C5CFF]/25 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-white/55"><span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> Today • live</div>
              <div className="mt-1 text-[36px] font-extrabold leading-none tracking-tight">{inr(revenue)}</div>
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#1FB67C]/20 px-2.5 py-1 text-[11.5px] font-black text-[#7DFFB8]"><ArrowUpRight size={13} /> {live.length} orders • avg {inr(live.length ? Math.round(revenue / live.length) : 0)}</div>
            </div>
            <Ring pct={94} size={92} />
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            {[
              ["New", String(newOrders.length), newOrders.length ? "needs accept" : "all clear", "#F8CB46"],
              ["Active", String(activeOrders.length), "in kitchen/way", "#7DFFB8"],
              ["COD due", inr(codPending), "collect on delivery", "#FFB86B"],
            ].map(([l, v, d, c]) => (
              <button key={l} onClick={() => set({ tab: "porders" })} className="rounded-2xl bg-white/8 p-3 text-left backdrop-blur">
                <div className="text-[10.5px] font-black uppercase tracking-widest text-white/55">{l}</div>
                <div className="mt-0.5 text-[16px] font-black" style={{ color: c as string }}>{v}</div>
                <div className="text-[10px] font-bold text-white/60">{d}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* new order alert */}
      <AnimatePresence>
        {newOrders.length > 0 && (
          <motion.button initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => set({ tab: "porders" })} className="mx-4 mt-3 flex w-[calc(100%-32px)] items-center gap-2.5 rounded-[16px] bg-[#E23744] p-3.5 text-left text-white shadow-[0_14px_32px_rgba(226,55,68,.4)]">
            <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-[20px]">🛎️<span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-black text-[#E23744]">{newOrders.length}</span></span>
            <span className="flex-1"><span className="block text-[13.5px] font-extrabold">{newOrders.length} new order{newOrders.length > 1 ? "s" : ""} waiting!</span><span className="block text-[11px] text-white/75">Accept fast — customers see live status</span></span>
            <ChevronRight size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="px-4 pt-3">
        <div className="card rounded-[20px] p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div><div className="text-[14px] font-black">This week</div><div className="text-[11.5px] font-semibold text-ink3">Peak Fri 8 PM • self-delivered</div></div>
            <span className="rounded-full bg-[#0C831F]/10 px-2.5 py-1 text-[11px] font-black text-[#0C831F]">+18.2%</span>
          </div>
          <div className="mt-2"><AreaGraph values={WEEKLY.map((w) => w.v)} color="#0C831F" /></div>
          <div className="flex justify-between text-[10.5px] font-black text-ink3">{WEEKLY.map((w, i) => (<span key={i}>{w.d}</span>))}</div>
        </div>
      </div>

      {/* Business Khata entry */}
      <div className="px-4 pt-3">
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { set({ tab: "khata" }); blip(700); }} className="relative w-full overflow-hidden rounded-[20px] bg-[#0E3B2E] p-4 text-left text-white shadow-[0_16px_40px_rgba(14,59,46,.35)]">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#D8F34E]/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#D8F34E] text-[20px] text-black">📒</span>
            <span className="flex-1">
              <span className="block text-[14.5px] font-extrabold">Business Khata</span>
              <span className="block text-[11px] text-white/70">Sales • Purchases • Udhaar • Expenses • Reports</span>
            </span>
            <ChevronRight size={18} />
          </div>
        </motion.button>
      </div>

      {/* quick nav */}
      <div className="px-4 pt-3">
        <SectionHead title="Manage" sub="Everything a shopkeeper needs" />
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {quick.map(([e, l, t, s, badge]) => (
            <button key={l} onClick={() => { set({ tab: t }); blip(660); }} className="relative rounded-[18px] card p-3 text-center shadow-card pressable">
              {badge ? <span className="absolute right-2 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#E23744] px-1 text-[10px] font-black text-white">{badge}</span> : null}
              <div className="text-[24px]">{e}</div>
              <div className="mt-1 text-[12px] font-extrabold">{l}</div>
              <div className="text-[10px] font-semibold text-ink3">{s}</div>
            </button>
          ))}
        </div>
      </div>

      {catalog.length === 0 && (
        <div className="px-4 pt-3">
          <div className="card rounded-[18px] p-5 text-center shadow-card">
            <div className="text-[40px]">📦</div>
            <div className="mt-1 text-[15px] font-extrabold">Your shelf is empty</div>
            <p className="mt-1 text-[12px] text-ink2">Customers won’t see your store until you list at least one product in {seller.categories.map((k) => k).join(", ") || "your category"}.</p>
            <button onClick={() => set({ tab: "catalog" })} className="mt-3 rounded-full bg-[#0C831F] px-5 py-2.5 text-[12.5px] font-extrabold text-white">Add first product</button>
          </div>
        </div>
      )}

      {/* low stock */}
      {(lowStock.length > 0 || outStock.length > 0) && (
        <div className="px-4 pt-3">
          <SectionHead title="Needs restock" sub={`${lowStock.length + outStock.length} items`} action={<button onClick={() => set({ tab: "catalog" })} className="text-[12px] font-extrabold text-[#E8830C]">Fix now ›</button>} />
          <div className="mt-2.5 space-y-2">
            {[...outStock, ...lowStock].slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-[16px] card p-3 shadow-card">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl img-skel">{p.image ? <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-xl">{p.emoji}</span>}</div>
                <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-extrabold">{p.name}</div><div className={cn("text-[11px] font-bold", p.stock === 0 ? "text-[#E23744]" : "text-[#E8830C]")}>{p.stock === 0 ? "Out of stock — hidden from buyers" : `${p.stock} left — low`}</div></div>
                <button onClick={() => { useOSB.getState().bumpStock(p.id, 20); blip(820); }} className="rounded-full bg-[#0C831F] px-3 py-2 text-[11px] font-black text-white">+20</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* self delivery strip */}
      <div className="px-4 pt-3">
        <button onClick={() => set({ tab: "more" })} className="flex w-full items-center gap-3 rounded-[18px] bg-[#111117] p-4 text-left text-white">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F8CB46] text-[22px]">🛵</span>
          <span className="flex-1"><span className="block text-[13.5px] font-extrabold">Self-delivery • {seller.radiusKm} km range</span><span className="block text-[11px] text-white/60">{seller.riders.length} riders • ₹{seller.deliveryFee} fee • free above ₹{seller.freeAbove}</span></span>
          <ChevronRight size={17} className="opacity-60" />
        </button>
      </div>

      <div className="px-4 pt-3">
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setCatalogOpen(true)} className="flex w-full items-center gap-3 rounded-[18px] bg-[#7C5CFF] p-4 text-left text-white shadow-[0_14px_34px_rgba(124,92,255,.4)]">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/16"><Bot size={22} /></span>
          <span className="flex-1"><span className="block text-[14px] font-extrabold">Add a product with AI</span><span className="block text-[11.5px] text-white/75">Auto category, attributes & variants</span></span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#7C5CFF]"><Plus size={18} strokeWidth={3} /></span>
        </motion.button>
        {pendingReq > 0 && (
          <div className="mt-2 flex items-center gap-2 rounded-[14px] bg-[#7C5CFF]/10 p-3 text-[12px] font-bold text-[#5A44D6]">🕒 {pendingReq} category request{pendingReq > 1 ? "s" : ""} awaiting CEO approval</div>
        )}
        <SpringBtn onClick={() => set({ mode: "customer", tab: "home" })} className="mt-3 w-full rounded-full chip py-3.5 text-[13px] font-black">← Back to Customer view</SpringBtn>
      </div>
      <ProviderCatalogSheet open={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </div>
  );
}

/* ═══════ ORDERS — self-delivery manager ═══════ */
const STAGE_META: Record<SellerOrderStatus, { t: string; c: string }> = {
  new: { t: "New", c: "#E23744" },
  accepted: { t: "Accepted", c: "#1573FF" },
  preparing: { t: "Preparing", c: "#7C5CFF" },
  ready: { t: "Ready", c: "#E8830C" },
  onway: { t: "On the way", c: "#0C831F" },
  delivered: { t: "Delivered", c: "#0C831F" },
  cancelled: { t: "Cancelled", c: "#8C8C99" },
};

export function ProviderOrders() {
  const { sellerOrders, updateOrderStatus, assignRider, seller } = useOSB();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const counts = {
    all: sellerOrders.length,
    new: sellerOrders.filter((o) => o.status === "new").length,
    active: sellerOrders.filter((o) => ["accepted", "preparing", "ready", "onway"].includes(o.status)).length,
    delivered: sellerOrders.filter((o) => o.status === "delivered").length,
    cancelled: sellerOrders.filter((o) => o.status === "cancelled").length,
  };
  const list = sellerOrders.filter((o) => {
    if (filter === "new" && o.status !== "new") return false;
    if (filter === "active" && !["accepted", "preparing", "ready", "onway"].includes(o.status)) return false;
    if (filter === "delivered" && o.status !== "delivered") return false;
    if (filter === "cancelled" && o.status !== "cancelled") return false;
    if (q && !(o.code.toLowerCase().includes(q.toLowerCase()) || o.customer.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  const codDue = sellerOrders.filter((o) => o.payment === "COD" && o.status !== "delivered" && o.status !== "cancelled").reduce((a, o) => a + o.total, 0);

  return (
    <div className="app-bg px-4 pb-44 pt-4">
      <div className="flex items-end justify-between">
        <div><h1 className="text-[22px] font-extrabold tracking-tight">Orders</h1><p className="text-[11.5px] font-medium text-ink2">You pack it • your staff delivers it</p></div>
        <span className="flex items-center gap-1.5 rounded-full bg-black px-3 py-2 text-[11px] font-black text-white dark:bg-white dark:text-black"><Bike size={13} /> {seller.riders.length} riders</span>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {[["New", counts.new, "#E23744"], ["Active", counts.active, "#7C5CFF"], ["COD due", inr(codDue), "#E8830C"]].map(([l, v, c]) => (
          <div key={l as string} className="card rounded-[14px] p-3 text-center shadow-card"><div className="text-[9.5px] font-black uppercase tracking-widest text-ink3">{l}</div><div className="mt-0.5 text-[17px] font-extrabold" style={{ color: c as string }}>{v}</div></div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-2 rounded-[13px] card px-3 py-2.5 shadow-card">
        <Search size={15} className="text-ink3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order id or customer…" className="flex-1 bg-transparent text-[13px] font-semibold placeholder:text-ink3" />
      </div>
      <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
        {[["all", `All ${counts.all}`], ["new", `New ${counts.new}`], ["active", `Active ${counts.active}`], ["delivered", `Delivered ${counts.delivered}`], ["cancelled", `Cancelled ${counts.cancelled}`]].map(([k, t]) => (
          <button key={k} onClick={() => setFilter(k)} className={cn("shrink-0 rounded-full px-3.5 py-2 text-[11.5px] font-extrabold", filter === k ? "bg-black text-white dark:bg-white dark:text-black" : "card text-ink2 shadow-card")}>{t}</button>
        ))}
      </div>

      <div className="mt-3 space-y-2.5">
        <AnimatePresence>
          {list.map((o) => {
            const m = STAGE_META[o.status];
            const expanded = open === o.id;
            const outOfRange = o.distanceKm > seller.radiusKm;
            return (
              <motion.div layout key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card overflow-hidden rounded-[18px] shadow-card">
                <button onClick={() => { setOpen(expanded ? null : o.id); blip(560); }} className="w-full p-3.5 text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-black text-white" style={{ background: m.c }}>{o.customer[0]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5"><span className="text-[13px] font-extrabold">{o.code}</span><span className="rounded-full px-2 py-[2px] text-[9.5px] font-black text-white" style={{ background: m.c }}>{m.t}</span></span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-ink2">{o.customer} • {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ").slice(0, 44)}</span>
                    </span>
                    <span className="shrink-0 text-right"><span className="block text-[14px] font-extrabold">{inr(o.total)}</span><span className="flex items-center gap-0.5 text-[10px] font-bold text-ink3"><Clock size={9} /> {o.placedAt}</span></span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={cn("rounded-md px-1.5 py-[2px] text-[10px] font-black", o.payment === "COD" ? "bg-amber-400/25 text-amber-700" : "bg-[#0C831F]/12 text-[#0C831F]")}>{o.payment}{o.payment === "COD" ? " • collect cash" : " • prepaid"}</span>
                    <span className={cn("flex items-center gap-0.5 rounded-md px-1.5 py-[2px] text-[10px] font-black", outOfRange ? "bg-[#E23744]/12 text-[#E23744]" : "bg-black/6 text-ink2")}><MapPin size={9} /> {o.distanceKm} km{outOfRange ? " • outside range!" : ""}</span>
                    {o.rider && <span className="flex items-center gap-0.5 rounded-md bg-[#1573FF]/12 px-1.5 py-[2px] text-[10px] font-black text-[#1573FF]"><Truck size={9} /> {o.rider.split(" ")[0]}</span>}
                  </div>
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="border-t divide-line px-3.5 py-3">
                        {o.note && <div className="mb-2 rounded-[10px] bg-[#E23744]/8 p-2.5 text-[11.5px] font-bold text-[#E23744]">⚠️ {o.note}</div>}
                        <div className="space-y-1">
                          {o.items.map((it, i) => (
                            <div key={i} className="flex justify-between text-[12.5px]"><span className="font-semibold">{it.qty} × {it.name}</span><span className="font-extrabold tabular-nums">{inr(it.qty * it.price)}</span></div>
                          ))}
                        </div>
                        <div className="mt-2 space-y-0.5 border-t border-dashed divide-line pt-2 text-[11.5px]">
                          <div className="flex justify-between text-ink2"><span>Subtotal</span><span className="font-bold tabular-nums">{inr(o.subtotal)}</span></div>
                          <div className="flex justify-between text-ink2"><span>Your delivery fee</span><span className="font-bold tabular-nums">{o.fee === 0 ? "FREE" : inr(o.fee)}</span></div>
                          {o.discount > 0 && <div className="flex justify-between text-[#0C831F]"><span>Coupon OFF</span><span className="font-bold tabular-nums">−{inr(o.discount)}</span></div>}
                          <div className="flex justify-between text-[13.5px] font-extrabold"><span>Total</span><span className="tabular-nums">{inr(o.total)}</span></div>
                        </div>
                        <div className="mt-2.5 rounded-[12px] chip p-3 text-[11.5px]">
                          <div className="font-extrabold">{o.customer} • {o.phone}</div>
                          <div className="mt-0.5 text-ink2">{o.address}</div>
                        </div>
                        {(o.status === "ready" || o.status === "onway") && (
                          <div className="mt-2">
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-ink3">Assign my rider</div>
                            <div className="flex flex-wrap gap-1.5">
                              {seller.riders.map((r) => (
                                <button key={r.name} onClick={() => { assignRider(o.id, r.name); blip(700); }} className={cn("rounded-full px-3 py-1.5 text-[11px] font-extrabold", o.rider === r.name ? "bg-[#1573FF] text-white" : "chip text-ink2")}>{o.rider === r.name ? "✓ " : ""}{r.name}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <OrderActions o={o} />
                        {o.status === "delivered" && (
                          <div className="mt-2 flex items-center gap-1.5 rounded-[10px] bg-[#0C831F]/10 p-2.5 text-[11.5px] font-bold text-[#0C5B21]">
                            <Check size={14} /> Delivered {o.rider ? `by ${o.rider}` : ""} {o.rating ? <>• rated <Star size={11} fill="currentColor" /> {o.rating}</> : "• awaiting rating"}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {list.length === 0 && (
          <div className="card rounded-[18px] p-8 text-center shadow-card"><div className="text-[44px]">🧾</div><div className="mt-2 text-[15px] font-extrabold">No orders here</div><p className="text-[12px] text-ink3">New orders pop up automatically with sound.</p></div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-[14px] card p-3.5 text-[11.5px] font-semibold shadow-card">
        <Wallet size={16} className="shrink-0 text-[#0C831F]" />
        <span>Prepaid money settles to your bank next day. <b>COD cash stays with your rider</b> — no platform cut, ever.</span>
      </div>
    </div>
  );
}

function OrderActions({ o }: { o: SellerOrder }) {
  const { updateOrderStatus, assignRider, seller } = useOSB();
  const go = (s: SellerOrderStatus, f = 880) => { updateOrderStatus(o.id, s); blip(f, 0.12); };
  const call = () => blip(660);
  const btn = "flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-3 text-[12.5px] font-extrabold";
  if (o.status === "new") return (
    <div className="mt-2.5 flex gap-2">
      <button onClick={() => go("cancelled", 400)} className={cn(btn, "chip text-[#E23744]")}><X size={15} /> Reject</button>
      <button onClick={call} className={cn(btn, "chip")}><Phone size={14} /> Call</button>
      <button onClick={() => go("preparing")} className={cn(btn, "bg-[#0C831F] text-white")}><Check size={15} /> Accept</button>
    </div>
  );
  if (o.status === "accepted" || o.status === "preparing") return (
    <div className="mt-2.5 flex gap-2">
      <button onClick={call} className={cn(btn, "chip")}><Phone size={14} /> Call</button>
      <button onClick={() => go(o.status === "accepted" ? "preparing" : "ready")} className={cn(btn, "bg-[#7C5CFF] text-white")}>{o.status === "accepted" ? "Start preparing" : "Mark ready for pickup"} <ChevronRight size={15} /></button>
    </div>
  );
  if (o.status === "ready") return (
    <div className="mt-2.5 flex gap-2">
      <button onClick={call} className={cn(btn, "chip")}><Phone size={14} /> Call</button>
      <button onClick={() => { if (!o.rider && seller.riders[0]) assignRider(o.id, seller.riders[0].name); go("onway"); }} className={cn(btn, "bg-[#E8830C] text-white")}><Truck size={15} /> Start delivery (self)</button>
    </div>
  );
  if (o.status === "onway") return (
    <div className="mt-2.5">
      {o.payment === "COD" && <div className="mb-2 rounded-[10px] bg-amber-400/20 p-2.5 text-center text-[12px] font-extrabold text-amber-800">💵 Collect {inr(o.total)} cash from customer</div>}
      <div className="flex gap-2">
        <button onClick={call} className={cn(btn, "chip")}><Phone size={14} /> Call</button>
        <button onClick={() => go("delivered", 990)} className={cn(btn, "bg-[#0C831F] text-white")}><Check size={15} /> Mark delivered</button>
      </div>
    </div>
  );
  return null;
}

export function ProviderMore() {
  return <SellerManage />;
}

export function EyeToggle({ hidden }: { hidden?: boolean }) {
  return hidden ? <Eye size={15} /> : <Eye size={15} />;
}
