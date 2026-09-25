"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BadgePercent, BookText, Camera, Check, ChevronRight, Clock, Heart, Home, MapPin, MessageCircle, Minus, Navigation, Phone, Plus, Receipt, Search, Store, User, LayoutDashboard, Package, Settings2, X, Bike, CreditCard, Banknote, Smartphone, ShieldCheck, PartyPopper, LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";
import { STORES, inr } from "@/lib/data";
import { blip, useOSB, type LiveOrder } from "@/lib/osb-store";
import { CUSTOMER, getCustomerLocation, getStoreLocation, openGoogleMapsNav, quoteCart, statusLabel, statusStep, timeAgo } from "@/lib/commerce";
import { cn } from "@/lib/cn";
import { CouponStrip } from "./customer";
import { Img } from "./ui";
import { LiveMap } from "./live-map";

export function Splash({ done }: { done: () => void }) {
  useEffect(() => { const t = setTimeout(done, 2000); return () => clearTimeout(t); }, [done]);
  return (
    <motion.div exit={{ opacity: 0, scale: 1.04 }} className="absolute inset-0 z-[80] grid place-items-center overflow-hidden bg-[#E23744]">
      <div className="absolute inset-0 opacity-20"><Img src={STORES[0].image} alt="splash" className="h-full w-full" eager /></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#E23744]/70 via-[#E23744]/85 to-[#7A0E1E]" />
      <div className="relative px-8 text-center">
        <motion.div initial={{ scale: 0.6, rotate: -10, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 16 }} className="mx-auto grid h-[88px] w-[88px] place-items-center rounded-[26px] bg-white text-[44px] shadow-2xl">🛍️</motion.div>
        <motion.h1 initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="mt-4 text-[30px] font-extrabold tracking-tight text-white">One Stop Bazar</motion.h1>
        <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="mt-1 text-[13px] font-semibold text-white/80">Everything Around You • By Local Businesses</motion.p>
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.3, duration: 1.4 }} className="mx-auto mt-6 h-1.5 w-44 origin-left overflow-hidden rounded-full bg-white/20"><div className="h-full w-full rounded-full bg-white" /></motion.div>
      </div>
    </motion.div>
  );
}

export function Onboarding() {
  const { set } = useOSB();
  const [i, setI] = useState(0);
  const slides = [
    {
      collage: [STORES[0].image, STORES[4].image, STORES[18].image, STORES[8].image],
      emojis: ["🍛", "🥬", "👕", "🛠️"],
      chips: ["20+ categories", "1,000+ local shops"],
      t: "One app for everything nearby",
      s: "Food, groceries, fashion, electronics, medicines, gifts & home services — from the businesses around you.",
    },
    {
      collage: [STORES[4].image, STORES[11].image, STORES[12].image, STORES[16].image],
      emojis: ["🥬", "💊", "🍬", "🐾"],
      chips: ["Fresh stock", "Trusted kiranas"],
      t: "Shop from stores you already trust",
      s: "Every product comes from a real neighbourhood shop — pricing, stock and offers set by the shopkeeper.",
    },
    {
      collage: [STORES[8].image, STORES[9].image, STORES[10].image, STORES[15].image],
      emojis: ["🔧", "💅", "🧹", "🎧"],
      chips: ["Verified pros", "Upfront pricing"],
      t: "Products, services & specialists",
      s: "Book a repair, a facial or buy gadgets and furniture — local pros with ratings, transparent prices and real reviews.",
    },
    {
      collage: [STORES[0].image, STORES[18].image, STORES[2].image, STORES[7].image],
      emojis: ["🏪", "🛵", "💳", "🤝"],
      chips: ["No commission", "One account"],
      t: "Shops deliver, not a middleman",
      s: "Local businesses set their own range and deliver themselves. One account lets you shop — and run your own store too.",
    },
  ];
  const s = slides[i];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 z-[70] flex flex-col app-bg">
      <div className="flex items-center justify-between px-5 pt-7">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#E23744] text-[16px]">🛍️</span>
          <span className="text-[12px] font-black uppercase tracking-[0.18em] text-ink2">One Stop Bazar</span>
        </div>
        <button onClick={() => set({ onboarded: true })} className="rounded-full chip px-4 py-1.5 text-[12.5px] font-extrabold">Skip</button>
      </div>
      <div className="flex flex-1 flex-col justify-center px-5">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ type: "spring", stiffness: 200, damping: 26 }}>
            <div className="grid grid-cols-2 gap-2.5">
              {s.collage.map((u, ci) => (
                <motion.div key={u} initial={{ opacity: 0, scale: 0.92, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: ci * 0.07, type: "spring", stiffness: 180, damping: 18 }} className={cn("relative overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,.14)]", ci % 2 === 0 ? "h-[172px] rounded-[24px] rounded-tr-[8px]" : "h-[172px] rounded-[24px] rounded-tl-[8px]")}>
                  <Img src={u} alt="" className="absolute inset-0 h-full w-full" eager />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                  <span className="absolute bottom-2.5 left-2.5 grid h-9 w-9 place-items-center rounded-xl bg-white/92 text-[18px] shadow backdrop-blur">{s.emojis[ci]}</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {s.chips.map((c) => (
                <span key={c} className="brand-red rounded-full bg-[#E23744]/10 px-3 py-1.5 text-[11px] font-black">✓ {c}</span>
              ))}
            </div>
            <h2 className="mt-3 text-[26px] font-extrabold leading-[1.12] tracking-tight">{s.t}</h2>
            <p className="mt-2 max-w-[320px] text-[13.5px] font-medium leading-relaxed text-ink2">{s.s}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="px-5 pb-9">
        <div className="mb-4 flex justify-center gap-1.5">{slides.map((_, d) => <span key={d} className={cn("h-1.5 rounded-full transition-all", d === i ? "w-8 bg-[#E23744]" : "w-3")} style={d === i ? undefined : { background: "var(--line)" }} />)}</div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { blip(700); if (i < slides.length - 1) setI(i + 1); else set({ onboarded: true }); }} className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#E23744] py-4 text-[15px] font-extrabold text-white shadow-[0_16px_40px_rgba(226,55,68,.4)]">
          {i < slides.length - 1 ? <>Continue <ArrowRight size={18} /></> : <>Enter the Bazar 🛍️</>}
        </motion.button>
      </div>
    </motion.div>
  );
}

export function BottomNav() {
  const { tab, set, mode, cart } = useOSB();
  const count = cart.reduce((a, c) => a + c.qty, 0);
  const total = cart.reduce((a, c) => a + c.qty * c.price, 0);
  const cust: [string, string, unknown][] = [
    ["home", "Home", Home], ["cats", "Categories", LayoutGrid], ["orders", "Orders", Receipt], ["saved", "Saved", Heart], ["profile", "You", User],
  ];
  const prov: [string, string, unknown][] = [
    ["dash", "Home", LayoutDashboard], ["porders", "Orders", Receipt], ["catalog", "Catalog", Store], ["khata", "Khata", BookText], ["more", "Manage", Settings2],
  ];
  const adm: [string, string, unknown][] = [["overview", "Overview", LayoutDashboard], ["profile", "You", User]];
  const ride: [string, string, unknown][] = [["rides", "Deliveries", Bike]];
  const items = mode === "customer" ? cust : mode === "provider" ? prov : mode === "rider" ? ride : adm;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-3 pb-4">
      <AnimatePresence>
        {mode === "customer" && count > 0 && (
          <motion.button initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={() => set({ showCart: true })} className="pointer-events-auto mb-2 flex w-full items-center gap-3 rounded-[16px] bg-[#0C831F] p-2.5 pl-3 text-white shadow-[0_16px_40px_rgba(12,131,31,.45)]">
            <div className="flex -space-x-2">{cart.slice(0, 3).map((c) => (<span key={c.productId} className="h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-white">{c.image ? <Img src={c.image} alt={c.name} className="h-full w-full" /> : <span className="grid h-full place-items-center text-[16px]">{c.emoji}</span>}</span>))}</div>
            <span className="flex-1 text-left"><span className="block text-[13px] font-extrabold">{count} items • ₹{total}</span><span className="block text-[11px] font-semibold text-white/75">Extra ₹100 OFF • View bill</span></span>
            <span className="rounded-[12px] bg-white px-4 py-2.5 text-[12.5px] font-black text-[#0C831F]">View cart →</span>
          </motion.button>
        )}
      </AnimatePresence>
      <div className="card pointer-events-auto flex items-center justify-between px-1.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,.18)] backdrop-blur-xl" style={{ borderRadius: 22 }}>
        {items.map(([k, label, Icon]) => {
          const active = tab === k;
          const I = Icon as typeof Home;
          return (
            <button key={k} onClick={() => { set({ tab: k }); blip(active ? 500 : 680); }} className="relative flex flex-1 flex-col items-center gap-0.5 rounded-[16px] py-2">
              {active && <motion.span layoutId="navpill" className="absolute inset-0 rounded-[16px] bg-brand" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              <span className={cn("relative", active ? "text-white" : "text-ink3")}><I size={20} strokeWidth={active ? 2.6 : 2} /></span>
              <span className={cn("relative text-[10px] font-extrabold", active ? "text-white" : "text-ink3")}>{label}</span>
              {k === "orders" && count > 0 && <span className="absolute right-4 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#E23744] px-1 text-[9px] font-black text-white">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CartSheet() {
  const { showCart, set, cart, decCart, addToCart, coupon, seller, sellerCoupons, storewideOff } = useOSB();
  const q = quoteCart(cart, seller, storewideOff, coupon, sellerCoupons);
  const total = q.subtotal;
  const disc = q.discount;
  const fee = q.fee;
  return (
    <AnimatePresence>
      {showCart && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/45 backdrop-blur-[2px]" onClick={() => set({ showCart: false })}>
          <motion.div initial={{ y: "90%" }} animate={{ y: 0 }} exit={{ y: "90%" }} transition={{ type: "spring", stiffness: 240, damping: 30 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[88%] overflow-hidden rounded-t-[26px] app-bg">
            <div className="no-scrollbar max-h-[88vh] overflow-y-auto px-4 pb-10 pt-3">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-black/15" />
              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-[19px] font-extrabold tracking-tight">Your cart 🧺 <span className="text-[12px] font-bold text-ink3">{q.groups.length} store{q.groups.length === 1 ? "" : "s"}</span></h3>
                <button onClick={() => set({ showCart: false })} className="grid h-9 w-9 place-items-center rounded-full chip"><X size={17} /></button>
              </div>
              {cart.length === 0 ? (
                <div className="py-10 text-center"><div className="relative mx-auto h-[140px] w-[200px] overflow-hidden rounded-[20px]"><Img src={STORES[4].image} alt="empty" className="h-full w-full opacity-70" /></div><div className="mt-3 text-[17px] font-extrabold">Cart’s empty</div><p className="text-[12.5px] text-ink2">Add biryani, milk, veggies…</p></div>
              ) : (
                <>
                  <div className="mt-3 space-y-3">
                    {q.groups.map((g) => (
                      <div key={g.storeId} className="overflow-hidden rounded-[16px] card shadow-card">
                        <div className="flex items-center justify-between border-b divide-line px-3 py-2.5">
                          <div><div className="text-[13px] font-extrabold">{g.storeName}</div><div className="text-[10.5px] font-bold text-ink3">Self-delivery • {g.quote.etaMins} mins • min ₹{g.quote.minOrder}</div></div>
                          <span className={cn("rounded-full px-2 py-1 text-[10px] font-black", g.quote.freeDelivery ? "bg-[#0C831F]/12 text-[#0C831F]" : "chip text-ink2")}>{g.quote.freeDelivery ? "FREE delivery" : `₹${g.quote.fee} delivery`}</span>
                        </div>
                        <div className="space-y-2 p-2.5">
                          {g.items.map((l) => (
                            <motion.div layout key={l.productId} className="flex items-center gap-3">
                              <div className="h-[54px] w-[54px] shrink-0 overflow-hidden rounded-[12px] bg-[#f2f2f2]">{l.image ? <Img src={l.image} alt={l.name} className="h-full w-full" /> : <span className="grid h-full place-items-center text-[24px]">{l.emoji}</span>}</div>
                              <div className="min-w-0 flex-1"><div className="line-clamp-1 text-[13px] font-extrabold">{l.name}</div><div className="text-[11px] text-ink3">{l.unit} • ₹{l.price}</div></div>
                              <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-[#0C831F] surface px-1 py-1">
                                <button onClick={() => decCart(l.productId)} className="grid h-6 w-6 place-items-center rounded-md text-[16px] font-black text-[#0C831F]"><Minus size={13} strokeWidth={3} /></button>
                                <span className="min-w-[14px] text-center text-[13px] font-black text-[#0C831F]">{l.qty}</span>
                                <button onClick={() => addToCart({ ...l, qty: 1 } as never)} className="grid h-6 w-6 place-items-center rounded-md text-[16px] font-black text-[#0C831F]"><Plus size={13} strokeWidth={3} /></button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                        {g.quote.belowMin && <div className="bg-[#E23744]/8 px-3 py-2 text-[11px] font-bold text-[#E23744]">Add ₹{g.quote.minOrder - (g.quote.subtotal - g.quote.discount)} more for this store’s minimum.</div>}
                        {!g.quote.freeDelivery && g.quote.freeAbove > 0 && <div className="bg-[#0C831F]/8 px-3 py-2 text-[11px] font-bold text-[#0C5B21]">Free delivery from this store above ₹{g.quote.freeAbove} (shopkeeper rule).</div>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-ink3">Best coupon for you</div>
                  <div className="mt-2"><CouponStrip /></div>
                  <div className="mt-3 rounded-[16px] border card p-4 text-[13px] font-semibold ">
                    <Row l="Subtotal" v={inr(total)} />
                    <Row l={`Discount (${coupon ?? "—"})`} v={"−" + inr(disc)} green />
                    <Row l="Delivery (by each store)" v={fee === 0 ? "FREE" : inr(fee)} green={fee === 0} />
                    <div className="mt-2 flex justify-between border-t border-dashed border-black/10 pt-2 text-[15px] font-extrabold"><span>To pay</span><span>{inr(q.total)}</span></div>
                    <div className="mt-1 text-[11px] font-bold text-[#0C831F]">You save {inr(disc + (fee === 0 ? q.groups.reduce((a, g) => a + g.quote.deliveryFee, 0) : 0))} on this order 🎉</div>
                  </div>
                  {q.blocked && <div className="mt-2 rounded-[12px] bg-[#E23744]/10 p-3 text-[12px] font-bold text-[#E23744]">{q.reason}</div>}
                  <motion.button whileTap={{ scale: 0.96 }} disabled={q.blocked} onClick={() => { if (q.blocked) return; set({ showCart: false, checkoutOpen: true }); blip(820); }} className="mt-3 flex w-full items-center justify-between rounded-[16px] bg-[#E23744] p-2 pl-4 text-white shadow-[0_14px_32px_rgba(226,55,68,.4)] disabled:opacity-50">
                    <span><span className="block text-[14px] font-extrabold">{inr(q.total)}</span><span className="block text-[11px] font-semibold opacity-80">{q.groups.length > 1 ? `${q.groups.length} store orders` : "TOTAL"}</span></span>
                    <span className="flex items-center gap-1.5 rounded-[12px] bg-white px-5 py-3 text-[13.5px] font-black text-[#E23744]">Checkout <ArrowRight size={16} /></span>
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ l, v, green }: { l: string; v: string; green?: boolean }) {
  return <div className="flex justify-between py-0.5"><span className="text-ink2">{l}</span><span className={green ? "font-extrabold text-[#0C831F]" : "font-extrabold"}>{v}</span></div>;
}

export function CheckoutSheet() {
  const { checkoutOpen, set, cart, address, addressArea, coupon, placeLiveOrder, seller, sellerCoupons, storewideOff, userName, phone } = useOSB();
  const [pay, setPay] = useState("UPI");
  const [placing, setPlacing] = useState(false);
  const q = quoteCart(cart, seller, storewideOff, coupon, sellerCoupons);
  const disc = q.discount;
  const grand = q.total;
  const eta = Math.max(...q.groups.map((g) => g.quote.etaMins), 20);
  const doPlace = async () => {
    if (q.blocked || cart.length === 0) return;
    setPlacing(true); blip(880, 0.12);
    let last: LiveOrder | null = null;
    for (const g of q.groups) {
      const localId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : "ord-" + Date.now() + Math.random().toString(36).slice(2, 6);
      const code = "#OSB-" + Math.floor(1000 + Math.random() * 9000);
      const live: LiveOrder = {
        id: localId,
        code,
        storeId: g.storeId,
        storeName: g.storeName,
        customer: userName || CUSTOMER.name,
        phone: phone || CUSTOMER.phone,
        address,
        items: g.items,
        subtotal: g.quote.subtotal,
        fee: g.quote.fee,
        discount: g.quote.discount,
        total: g.quote.total,
        payment: pay,
        status: "new",
        etaMins: g.quote.etaMins,
        otp: String(Math.floor(1000 + Math.random() * 9000)),
        createdAt: Date.now(),
        distanceKm: g.storeId === (seller.storeId || "mine") ? Math.min(seller.radiusKm, 2.1) : 1.4,
      };
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: live.code,
            storeId: live.storeId,
            storeName: live.storeName,
            customerName: live.customer,
            customerPhone: live.phone,
            address: live.address,
            items: live.items,
            subtotal: live.subtotal,
            deliveryFee: live.fee,
            discount: live.discount,
            total: live.total,
            payment: live.payment,
            status: "new",
            etaMins: live.etaMins,
            distanceKm: live.distanceKm,
            otp: live.otp,
          }),
        });
        const j = await res.json();
        if (j.id) live.id = j.id;
        if (j.code) live.code = j.code;
      } catch { /* local fallback */ }
      placeLiveOrder(live);
      last = live;
    }
    if (last) useOSB.setState({ orderSuccess: last, checkoutOpen: false, showCart: false, cart: [] });
    setPlacing(false); blip(990, 0.18);
  };
  return (
    <AnimatePresence>
      {checkoutOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[55] bg-black/50 backdrop-blur-[3px]" onClick={() => !placing && set({ checkoutOpen: false })}>
          <motion.div initial={{ y: "94%" }} animate={{ y: 0 }} exit={{ y: "94%" }} transition={{ type: "spring", stiffness: 230, damping: 30 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[90%] overflow-hidden rounded-t-[26px] app-bg">
            <div className="no-scrollbar max-h-[90vh] overflow-y-auto px-4 pb-10 pt-3">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-black/15" />
              <h3 className="mt-3 text-[19px] font-extrabold tracking-tight">Checkout</h3>
              <div className="mt-3 flex items-start gap-3 rounded-[16px] border card p-3.5 ">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFE9E9]"><MapPin size={18} className="text-[#E23744]" /></span>
                <div className="flex-1"><div className="text-[13px] font-extrabold">Deliver to {addressArea || "Home"} • ~{eta} mins</div><div className="text-[12px] text-ink2">{address || "Address set from GPS"}</div></div>
                <span className="text-[12px] font-extrabold text-[#E23744]">Change</span>
              </div>
              <div className="mt-2.5 rounded-[16px] border card p-3.5 ">
                <div className="text-[13px] font-extrabold">Pay with</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([["UPI", Smartphone, "GPay • PhonePe"], ["Card", CreditCard, "•••• 4421"], ["COD", Banknote, "Cash"]] as const).map(([m, Icon, s]) => {
                    const I = Icon;
                    return (
                      <button key={m} onClick={() => { setPay(m); blip(640); }} className={cn("rounded-[14px] border-2 p-3 text-center pressable", pay === m ? "border-[#0C831F] bg-emerald-50" : "border-black/8 bg-black/[.03]")}>
                        <I size={20} className="mx-auto" /><div className="mt-1 text-[12px] font-extrabold">{m}</div><div className="text-[10px] text-ink3">{s}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-[11.5px] font-bold text-[#0C5B21]"><ShieldCheck size={15} /> 100% safe • Stores never see card details</div>
              </div>
              <div className="mt-2.5 flex items-center gap-2.5 overflow-hidden rounded-[16px] bg-black p-3.5 text-white">
                <div className="flex -space-x-2">{cart.slice(0, 3).map((x) => (<span key={x.productId} className="h-10 w-10 overflow-hidden rounded-xl border border-white/30 bg-white/10">{x.image ? <Img src={x.image} alt={x.name} className="h-full w-full" /> : x.emoji}</span>))}</div>
                <div className="flex-1"><div className="text-[11px] font-bold text-white/60">{cart.reduce((a, c) => a + c.qty, 0)} items • {q.groups.length} store{q.groups.length === 1 ? "" : "s"} • −{inr(disc)}</div><div className="text-[20px] font-extrabold">{inr(grand)}</div></div>
              </div>
              <div className="mt-2.5 space-y-1.5 rounded-[14px] card p-3 text-[11.5px] font-semibold">
                {q.groups.map((g) => (
                  <div key={g.storeId} className="flex justify-between"><span>{g.storeName} • {g.quote.freeDelivery ? "FREE delivery" : `₹${g.quote.fee} delivery`}</span><span className="font-extrabold">{inr(g.quote.total)}</span></div>
                ))}
                <div className="text-[10.5px] font-bold text-ink3">Each store delivers with its own staff. Free delivery is set by the shopkeeper.</div>
              </div>
              {q.blocked && <div className="mt-2 rounded-[12px] bg-[#E23744]/10 p-3 text-[12px] font-bold text-[#E23744]">{q.reason}</div>}
              <motion.button whileTap={{ scale: 0.96 }} disabled={placing || q.blocked} onClick={doPlace} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#0C831F] py-4 text-[15px] font-extrabold text-white shadow-[0_16px_40px_rgba(12,131,31,.4)] disabled:opacity-60">
                {placing ? <><span className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/30 border-t-white" /> Sending to store…</> : <><Bike size={19} /> Place order • {inr(grand)}</>}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SuccessOverlay({ onTrack }: { onTrack: () => void }) {
  const o = useOSB((s) => s.orderSuccess);
  const { set } = useOSB();
  useEffect(() => { if (o) blip(990, 0.2); }, [o]);
  return (
    <AnimatePresence>
      {o && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] grid place-items-center overflow-hidden bg-black/70 p-6 backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 26 }).map((_, i) => (
              <span key={i} className="confetti-fall absolute top-0 text-[16px]" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 10) * 0.14}s` }}>{["🎉", "✦", "🪔", "💛", "💚"][i % 5]}</span>
            ))}
          </div>
          <motion.div initial={{ scale: 0.7, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 180, damping: 18 }} className="relative w-full max-w-[330px] overflow-hidden rounded-[26px] bg-white text-center shadow-2xl">
            <div className="relative h-[130px]"><Img src={(o.items[0] as unknown as { image?: string })?.image ?? STORES[0].image} alt="order" className="h-full w-full" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" /><motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 14 }} className="absolute bottom-[-22px] left-1/2 grid h-[56px] w-[56px] -translate-x-1/2 place-items-center rounded-full bg-[#0C831F] text-[26px] text-white shadow-xl ring-4 ring-white">✓</motion.div></div>
            <div className="px-6 pb-6 pt-8">
              <h3 className="text-[21px] font-extrabold tracking-tight">Order sent to store! 🎉</h3>
              <p className="mt-1 text-[12.5px] font-medium text-ink2">{o.storeName} just got your order.<br />They’ll accept it — then you can track live.</p>
              <div className="mt-3 rounded-2xl border-2 border-dashed border-black/12 bg-[#F7F7F8] p-3"><div className="text-[10px] font-black uppercase tracking-widest text-ink3">Order ID</div><div className="text-[17px] font-black">{o.code}</div><div className="text-[12px] font-bold text-[#0C831F]">{inr(o.total)} • {o.payment}</div></div>
              <button onClick={() => { set({ orderSuccess: null, tab: "orders" }); onTrack(); }} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[14px] bg-[#E23744] py-3.5 text-[14px] font-extrabold text-white pressable">Track live <ChevronRight size={16} /></button>
              <button onClick={() => set({ orderSuccess: null })} className="mt-2 w-full rounded-[14px] bg-black/5 py-3 text-[13px] font-extrabold">Continue shopping</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function TrackingSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const orders = useOSB((s) => s.orders);
  const seller = useOSB((s) => s.seller);
  const address = useOSB((s) => s.address);
  const o = orders.find((x) => x.id === id) ?? orders[0];
  if (!id || !o) return null;
  const step = statusStep(o.status);
  const cancelled = o.status === "cancelled";
  const delivered = o.status === "delivered";
  const onway = o.status === "onway" || o.status === "ready";
  const rider = o.rider ? seller.riders.find((r) => r.name === o.rider) : undefined;
  const cover = (o.items[0] as { image?: string } | undefined)?.image || STORES.find((s) => s.id === o.storeId)?.image || STORES[0].image;
  const etaLeft = cancelled || delivered ? 0 : Math.max(4, o.etaMins - (onway ? 8 : step >= 1 ? 4 : 0));
  const headline = cancelled
    ? "Order cancelled"
    : delivered
      ? "Delivered. Enjoy your order"
      : o.status === "new"
        ? "Waiting for the store to accept"
        : o.status === "accepted"
          ? "Store accepted — packing soon"
          : o.status === "preparing"
            ? "Kitchen is preparing your order"
            : o.status === "ready"
              ? "Packed. Rider leaving the store"
              : o.rider
                ? `${o.rider.split(" ")[0]} is on the way`
                : "Out for delivery";
  const steps = [
    { t: "Placed", s: `Order sent • ${timeAgo(o.createdAt)}`, icon: Receipt },
    { t: "Preparing", s: o.status === "accepted" ? "Accepted — starting the kitchen" : o.status === "new" ? "Waiting for the shopkeeper" : "Being packed at the store", icon: Package },
    { t: "On the way", s: o.rider ? `${o.rider} • store’s own delivery` : "Store assigns their rider — no platform fleet", icon: Bike },
    { t: "Delivered", s: delivered ? "Handed over at your door" : "We’ll ask you to rate the store", icon: Check },
  ];
  const progress = cancelled ? 6 : delivered ? 100 : Math.min(92, 12 + (step + 1) * 22);
  // rider position along the route: 0 at store → 1 at customer
  const riderT = cancelled ? 0 : delivered ? 1 : step <= 0 ? 0.04 : step === 1 ? 0.18 : 0.62;
  const storeLoc = getStoreLocation(o.storeId);
  const homeLoc = getCustomerLocation(o.address);
  const riderPos = o.riderLat != null && o.riderLng != null ? { lat: o.riderLat, lng: o.riderLng } : undefined;

  const openInGoogleMaps = () => {
    openGoogleMapsNav(o.storeName, o.address, homeLoc.lat, homeLoc.lng);
    blip(720);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <motion.div initial={{ y: "92%" }} animate={{ y: 0 }} exit={{ y: "92%" }} transition={{ type: "spring", stiffness: 220, damping: 28 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 top-[48px] overflow-hidden rounded-t-[28px] app-bg">
        <div className="no-scrollbar h-full overflow-y-auto pb-8">
          {/* map */}
          <div className="relative h-[258px] overflow-hidden bg-[#E8EDF2]">
            <LiveMap
              store={storeLoc}
              home={homeLoc}
              progress={riderT}
              riderPos={riderPos}
              showRider={!cancelled}
              routeColor={cancelled ? "#E23744" : "#0C831F"}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-4 pb-3 pt-10">
              <div className="flex items-end justify-between text-white">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
                    {riderPos && <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                    {riderPos ? "GPS LIVE BROADCAST" : o.storeName}
                  </div>
                  <div className="mt-0.5 text-[16px] font-extrabold leading-tight">{headline}</div>
                </div>
                {!cancelled && !delivered && (
                  <div className="rounded-2xl bg-white px-3 py-2 text-center text-black shadow-md">
                    <div className="text-[9px] font-black uppercase tracking-widest text-ink3">ETA</div>
                    <div className="text-[16px] font-extrabold leading-none">{etaLeft}<span className="text-[10px] font-bold"> min</span></div>
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[16px] font-black shadow">✕</button>
            <div className="absolute left-3 top-3 flex items-center gap-1.5">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black shadow", cancelled ? "bg-[#E23744] text-white" : delivered ? "bg-[#0C831F] text-white" : "bg-white text-black")}>
                <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: cancelled ? "#fff" : delivered ? "#D8F34E" : "#0C831F" }} />
                {cancelled ? "CANCELLED" : delivered ? "DELIVERED" : statusLabel(o.status).toUpperCase()}
              </span>
              <button
                onClick={openInGoogleMaps}
                className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-black shadow pressable"
              >
                <Navigation size={11} className="text-[#1573FF]" /> Maps
              </button>
            </div>
          </div>

          <div className="px-4 pt-3">
            {/* progress */}
            <div className="card rounded-[18px] p-3.5 shadow-card">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-ink3">
                <span className="flex items-center gap-1"><Navigation size={12} /> {o.distanceKm} km • self delivery</span>
                <span className="font-extrabold text-ink2">{o.code}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full chip">
                <motion.div className="h-full rounded-full" style={{ background: cancelled ? "#E23744" : "#0C831F" }} animate={{ width: `${progress}%` }} />
              </div>
            </div>

            {cancelled && (
              <div className="mt-3 rounded-[18px] bg-[#E23744]/10 p-4">
                <div className="text-[15px] font-extrabold text-[#E23744]">Store declined this order</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">{o.note || "The shopkeeper rejected it. No payment was captured."}</p>
              </div>
            )}

            {/* delivery OTP */}
            {!cancelled && !delivered && o.otp && (
              <div className="mt-3 overflow-hidden rounded-[18px] bg-[#111117] p-4 text-white">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#F8CB46]"><ShieldCheck size={12} /> Delivery OTP</div>
                <div className="mt-1.5 flex items-center gap-2">
                  {o.otp.split("").map((d, i) => (
                    <span key={i} className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-[20px] font-extrabold">{d}</span>
                  ))}
                </div>
                <p className="mt-2 text-[11.5px] font-semibold leading-relaxed text-white/65">Share this only after you receive the parcel. The order is marked delivered <b className="text-white">only</b> when the rider enters it.</p>
              </div>
            )}

            {/* proof photo */}
            {o.proofPhoto && (
              <div className="card mt-3 overflow-hidden rounded-[18px] shadow-card">
                <div className="flex items-center gap-2 px-3.5 pt-3 text-[12.5px] font-extrabold"><Camera size={15} className="text-[#0C831F]" /> Delivery proof photo</div>
                <div className="mt-2 h-[160px]"><Img src={o.proofPhoto} alt="delivery proof" className="h-full w-full object-cover" /></div>
              </div>
            )}

            {/* customer confirm */}
            {!cancelled && !delivered && (o.status === "onway" || o.status === "ready") && (
              <button
                onClick={() => { useOSB.getState().customerConfirmDelivery(o.id); blip(960, 0.16); }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[16px] border-2 border-[#0C831F] py-3.5 text-[13.5px] font-extrabold text-[#0C831F]"
              >
                <Check size={17} strokeWidth={3} /> I’ve received my order
              </button>
            )}

            {/* rider / store */}
            <div className="card mt-3 rounded-[18px] p-3.5 shadow-card">
              <div className="flex items-center gap-3">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl">
                  <Img src={cover} alt={o.storeName} className="h-full w-full object-cover" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-extrabold">{o.storeName}</div>
                  <div className="mt-0.5 text-[11.5px] font-semibold text-ink3">
                    {o.rider ? `${o.rider} • ${rider?.vehicle ?? "Store rider"}` : "Store delivers with its own staff"}
                  </div>
                </div>
                <a href={`tel:${rider?.phone || seller.phone || ""}`} className="grid h-10 w-10 place-items-center rounded-full bg-[#0C831F] text-white"><Phone size={16} /></a>
                <button className="grid h-10 w-10 place-items-center rounded-full chip"><MessageCircle size={16} /></button>
              </div>
            </div>

            {!cancelled && (
              <div className="card mt-3 rounded-[18px] p-4 shadow-card">
                {steps.map((st, i) => {
                  const I = st.icon;
                  const done = i < step || (delivered && i <= 3);
                  const now = i === step && !delivered;
                  return (
                    <div key={st.t} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={cn("grid h-8 w-8 place-items-center rounded-full", done || now ? "bg-[#0C831F] text-white" : "chip text-ink3")}>
                          {done && !now ? <Check size={14} strokeWidth={3} /> : <I size={14} />}
                        </span>
                        {i < 3 && <span className={cn("w-[2px] flex-1 rounded-full", i < step ? "bg-[#0C831F]" : "bg-black/10 dark:bg-white/10")} style={{ minHeight: 18 }} />}
                      </div>
                      <div className={cn("flex-1", i < 3 ? "pb-4" : "pb-0")}>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[13.5px] font-extrabold", !(done || now) && "text-ink3")}>{st.t}</span>
                          {now && <span className="rounded-full bg-[#F8CB46] px-2 py-[2px] text-[9.5px] font-black text-black">LIVE</span>}
                        </div>
                        <div className="mt-0.5 text-[11.5px] leading-snug text-ink3">{st.s}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* drop address */}
            <div className="card mt-3 flex items-start gap-3 rounded-[18px] p-3.5 shadow-card">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E23744]/10 text-[#E23744]"><MapPin size={18} /></span>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-widest text-ink3">Delivering to</div>
                <div className="mt-0.5 text-[13px] font-extrabold leading-snug">{o.address || address}</div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-ink3"><Clock size={12} /> Placed {timeAgo(o.createdAt)}</div>
              </div>
            </div>

            {/* bill */}
            <div className="card mt-3 rounded-[18px] p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] font-extrabold">Bill details</span>
                <span className="rounded-full chip px-2 py-1 text-[10px] font-black">{o.payment}</span>
              </div>
              <div className="mt-2.5 space-y-2">
                {o.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-black/5">
                      {(it as { image?: string }).image ? <Img src={(it as { image?: string }).image!} alt={it.name} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[16px]">{it.emoji || "🛍️"}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-extrabold">{it.name}</span>
                      <span className="text-[11px] font-semibold text-ink3">{it.qty} × {inr(it.price)}</span>
                    </span>
                    <span className="text-[12.5px] font-extrabold tabular-nums">{inr(it.qty * it.price)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 border-t border-dashed divide-line pt-3 text-[12px]">
                <div className="flex justify-between text-ink2"><span>Item total</span><span className="font-bold tabular-nums">{inr(o.subtotal)}</span></div>
                {o.discount > 0 && <div className="flex justify-between text-[#0C831F]"><span>Discount</span><span className="font-bold tabular-nums">−{inr(o.discount)}</span></div>}
                <div className="flex justify-between text-ink2"><span>Delivery (by store)</span><span className="font-bold tabular-nums">{o.fee === 0 ? "FREE" : inr(o.fee)}</span></div>
                <div className="flex justify-between pt-1 text-[14px] font-extrabold"><span>Paid</span><span className="tabular-nums">{inr(o.total)}</span></div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-[16px] bg-[#0C831F]/8 p-3.5 text-[12px] font-bold text-[#0C5B21]">
              <PartyPopper size={16} className="shrink-0 text-[#E23744]" />
              Tip goes 100% to the store’s rider — One Stop Bazar never takes a cut.
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
