"use client";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight, ArrowUpRight, Banknote, Bell, BookText, Building2, Calendar, Check, ChevronRight,
  Clock, CreditCard, FileText, Landmark, MessageCircle, Package, Phone, Plus, Receipt, RefreshCcw,
  Search, Send, ShoppingBag, ShoppingCart, Smartphone, Sparkles, Truck, Users, Wallet, X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { inr } from "@/lib/data";
import { blip, useOSB } from "@/lib/osb-store";
import {
  EXPENSE_CATS, partyBalance, useBiz, useBizTotals,
  type LedgerEntry, type PartyType, type PaymentMode, type Purchase, type Sale,
} from "@/lib/biz-store";
import { cn } from "@/lib/cn";
import { AreaGraph, SectionHead } from "./ui";

const TABS = [
  { k: "dashboard", t: "Dashboard", i: Sparkles },
  { k: "khata", t: "Khata", i: BookText },
  { k: "sales", t: "Sales", i: ShoppingBag },
  { k: "purchases", t: "Purchases", i: Truck },
  { k: "expenses", t: "Expenses", i: Receipt },
  { k: "reports", t: "Reports", i: FileText },
];

const MODES: { k: PaymentMode; t: string; i: typeof Banknote }[] = [
  { k: "cash", t: "Cash", i: Banknote },
  { k: "upi", t: "UPI", i: Smartphone },
  { k: "bank", t: "Bank", i: Landmark },
  { k: "card", t: "Card", i: CreditCard },
];

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/* ══════════════ HUB SHELL ══════════════ */
export function BusinessHub() {
  const [tab, setTab] = useState("dashboard");
  const [fab, setFab] = useState<null | "sale" | "purchase" | "expense" | "party" | "payment">(null);
  const { set, seller, phone } = useOSB();

  return (
    <div className="app-bg relative pb-44">
      <div className="sticky top-0 z-20 surface pb-2 shadow-sm">
        <div className="flex items-center gap-2.5 px-4 pt-4">
          <button onClick={() => set({ tab: "dash" })} className="grid h-9 w-9 place-items-center rounded-xl chip"><ChevronRight size={17} className="rotate-180" /></button>
          <div className="flex-1">
            <h1 className="text-[19px] font-extrabold tracking-tight">Business Khata</h1>
            <p className="text-[11px] font-medium text-ink2">{seller.name || "Your shop"} • linked to {phone || "your number"}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-[#0C831F]/12 px-2.5 py-1.5 text-[10.5px] font-black text-[#0C831F]"><RefreshCcw size={11} /> Live</span>
        </div>
        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto px-4">
          {TABS.map((t) => {
            const I = t.i;
            const on = tab === t.k;
            return (
              <button key={t.k} onClick={() => { setTab(t.k); blip(600); }} className={cn("relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-extrabold transition-colors", on ? "text-white" : "chip text-ink2")}>
                {on && <motion.span layoutId="biztab" className="absolute inset-0 rounded-full bg-[#0C831F]" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                <I size={13} className="relative" /><span className="relative">{t.t}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
          {tab === "dashboard" && <Dashboard onQuick={setFab} onTab={setTab} />}
          {tab === "khata" && <KhataTab onPayment={() => setFab("payment")} onParty={() => setFab("party")} />}
          {tab === "sales" && <SalesTab onNew={() => setFab("sale")} />}
          {tab === "purchases" && <PurchasesTab onNew={() => setFab("purchase")} />}
          {tab === "expenses" && <ExpensesTab onNew={() => setFab("expense")} />}
          {tab === "reports" && <ReportsTab />}
        </motion.div>
      </AnimatePresence>

      {/* FAB */}
      <div className="pointer-events-none absolute bottom-24 right-4 z-20 flex flex-col items-end gap-2">
        <AnimatePresence>
          {fab === null && (
            <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} className="pointer-events-auto flex flex-col items-end gap-2">
              <QuickFabMenu onPick={setFab} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {fab === "sale" && <SaleSheet onClose={() => setFab(null)} />}
        {fab === "purchase" && <PurchaseSheet onClose={() => setFab(null)} />}
        {fab === "expense" && <ExpenseSheet onClose={() => setFab(null)} />}
        {fab === "party" && <PartySheet onClose={() => setFab(null)} />}
        {fab === "payment" && <PaymentSheet onClose={() => setFab(null)} />}
      </AnimatePresence>
    </div>
  );
}

function QuickFabMenu({ onPick }: { onPick: (v: "sale" | "purchase" | "expense" | "party" | "payment") => void }) {
  const [open, setOpen] = useState(false);
  const actions: [string, string, typeof ShoppingCart, "sale" | "purchase" | "expense" | "party" | "payment"][] = [
    ["Sale", "#0C831F", ShoppingCart, "sale"],
    ["Purchase", "#1573FF", Truck, "purchase"],
    ["Expense", "#E8830C", Receipt, "expense"],
    ["Payment", "#7C5CFF", Wallet, "payment"],
    ["Party", "#E23744", Users, "party"],
  ];
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex flex-col items-end gap-2">
            {actions.map(([label, color, Icon, key]) => (
              <motion.button key={key} whileTap={{ scale: 0.94 }} onClick={() => { onPick(key); setOpen(false); blip(680); }} className="flex items-center gap-2 rounded-full bg-[var(--card)] py-2 pl-3.5 pr-2 shadow-[0_10px_28px_rgba(0,0,0,.18)]">
                <span className="text-[12.5px] font-extrabold">{label}</span>
                <span className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: color }}><Icon size={16} /></span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button whileTap={{ scale: 0.92 }} onClick={() => { setOpen(!open); blip(720); }} className="grid h-14 w-14 place-items-center rounded-full bg-[#0C831F] text-white shadow-[0_16px_36px_rgba(12,131,31,.45)]">
        <motion.span animate={{ rotate: open ? 45 : 0 }}><Plus size={26} strokeWidth={2.5} /></motion.span>
      </motion.button>
    </>
  );
}

/* ══════════════ DASHBOARD ══════════════ */
function Dashboard({ onQuick, onTab }: { onQuick: (v: "sale" | "purchase" | "expense" | "party" | "payment") => void; onTab: (t: string) => void }) {
  const t = useBizTotals();
  const catalog = useOSB((s) => s.catalog);
  const lowStock = catalog.filter((p) => p.stock > 0 && p.stock <= 15);
  const outStock = catalog.filter((p) => p.stock === 0);
  const sales = useBiz((s) => s.sales);
  const purchases = useBiz((s) => s.purchases);
  const expenses = useBiz((s) => s.expenses);
  const recent = useMemo(() => {
    const items = [
      ...sales.map((s) => ({ kind: "Sale", label: s.customerName, amount: s.total, ts: s.createdAt, color: "#0C831F", cancelled: s.status !== "completed" })),
      ...purchases.map((p) => ({ kind: "Purchase", label: p.supplierName, amount: p.total, ts: p.createdAt, color: "#1573FF", cancelled: p.status !== "completed" })),
      ...expenses.map((e) => ({ kind: "Expense", label: e.category, amount: e.amount, ts: e.date, color: "#E8830C", cancelled: false })),
    ].sort((a, b) => b.ts - a.ts);
    return items.slice(0, 6);
  }, [sales, purchases, expenses]);

  return (
    <div className="space-y-3 px-4 pt-3">
      <div className="grid grid-cols-2 gap-2.5">
        <Metric label="Today's Sales" value={inr(t.todaySales)} accent="#0C831F" />
        <Metric label="Today's Profit" value={inr(t.todayProfit)} accent={t.todayProfit >= 0 ? "#0C831F" : "#E23744"} />
        <Metric label="Today's Purchases" value={inr(t.todayPurchases)} accent="#1573FF" />
        <Metric label="Today's Expenses" value={inr(t.todayExpenses)} accent="#E8830C" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={() => onTab("khata")} className="card rounded-[16px] p-3.5 text-left shadow-card">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#0C831F]"><ArrowDownRight size={12} /> You will get</div>
          <div className="mt-1 text-[20px] font-extrabold">{inr(t.receivable)}</div>
          <div className="text-[10.5px] font-semibold text-ink3">From customers</div>
        </button>
        <button onClick={() => onTab("khata")} className="card rounded-[16px] p-3.5 text-left shadow-card">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#E8830C]"><ArrowUpRight size={12} /> You will give</div>
          <div className="mt-1 text-[20px] font-extrabold">{inr(t.payable)}</div>
          <div className="text-[10.5px] font-semibold text-ink3">To suppliers</div>
        </button>
      </div>

      <div className="card rounded-[18px] p-4 shadow-card">
        <SectionHead title="Cash • Bank • UPI" sub="Live balances from your transactions" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[["Cash", t.cashBalance, Banknote, "#0C831F"], ["Bank", t.bankBalance, Landmark, "#1573FF"], ["UPI", t.upiBalance, Smartphone, "#7C5CFF"]].map(([l, v, Icon, c]) => {
            const I = Icon as typeof Banknote;
            return (
              <div key={l as string} className="card-2 rounded-[12px] p-3 text-center">
                <I size={16} style={{ color: c as string }} className="mx-auto" />
                <div className="mt-1 text-[13.5px] font-extrabold tabular-nums">{inr(v as number)}</div>
                <div className="text-[9.5px] font-bold text-ink3">{l as string}</div>
              </div>
            );
          })}
        </div>
      </div>

      {(lowStock.length > 0 || outStock.length > 0) && (
        <div className="rounded-[16px] bg-[#E8830C]/10 p-3.5">
          <div className="flex items-center gap-2 text-[12.5px] font-extrabold text-[#E8830C]"><Package size={15} /> {lowStock.length + outStock.length} products need restock</div>
          <p className="mt-1 text-[11.5px] text-ink2">{outStock.length} out of stock • {lowStock.length} running low. Manage from Catalog.</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {[["Sale", "sale", ShoppingCart, "#0C831F"], ["Purchase", "purchase", Truck, "#1573FF"], ["Expense", "expense", Receipt, "#E8830C"], ["Payment", "payment", Wallet, "#7C5CFF"]].map(([l, k, Icon, c]) => {
          const I = Icon as typeof ShoppingCart;
          return (
            <button key={l as string} onClick={() => onQuick(k as never)} className="card rounded-[14px] p-3 text-center shadow-card">
              <I size={18} className="mx-auto" style={{ color: c as string }} />
              <div className="mt-1 text-[11px] font-extrabold">{l as string}</div>
            </button>
          );
        })}
      </div>

      <div className="card rounded-[18px] p-4 shadow-card">
        <SectionHead title="Recent activity" sub="Latest sales, purchases & expenses" />
        <div className="mt-2.5 space-y-2">
          {recent.length === 0 && <div className="rounded-[12px] card-2 p-4 text-center text-[12px] font-semibold text-ink3">No transactions yet — tap + to record your first sale.</div>}
          {recent.map((r, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[11px] font-black text-white" style={{ background: r.color }}>{r.kind[0]}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-extrabold">{r.kind} • {r.label}</span><span className="block text-[10.5px] text-ink3">{fmtDate(r.ts)}{r.cancelled ? " • cancelled" : ""}</span></span>
              <span className={cn("text-[13px] font-extrabold tabular-nums", r.cancelled && "text-ink3 line-through")}>{inr(r.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card rounded-[16px] p-3.5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[9.5px] font-black uppercase tracking-widest text-ink3">{label}</span>
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
      </div>
      <div className="mt-1 text-[19px] font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

/* ══════════════ KHATA ══════════════ */
function KhataTab({ onPayment, onParty }: { onPayment: () => void; onParty: () => void }) {
  const [type, setType] = useState<PartyType>("customer");
  const [q, setQ] = useState("");
  const parties = useBiz((s) => s.parties);
  const ledger = useBiz((s) => s.ledger);
  const [openParty, setOpenParty] = useState<string | null>(null);

  const list = useMemo(() => {
    return parties
      .filter((p) => p.type === type && !p.archived)
      .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.phone.includes(q))
      .map((p) => ({ p, bal: ledger.filter((l) => l.partyId === p.id).reduce((a, l) => a + l.amount, 0) }))
      .sort((a, b) => Math.abs(b.bal) - Math.abs(a.bal));
  }, [parties, ledger, type, q]);

  const totalGet = list.filter(() => type === "customer").reduce((a, x) => a + Math.max(0, x.bal), 0);
  const totalGive = list.filter(() => type === "supplier").reduce((a, x) => a + Math.max(0, x.bal), 0);

  const openP = parties.find((p) => p.id === openParty);

  return (
    <div className="px-4 pt-3">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[16px] bg-[#0C831F] p-3.5 text-white">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/70">You Will Get</div>
          <div className="mt-1 text-[20px] font-extrabold tabular-nums">{inr(type === "customer" ? totalGet : 0)}</div>
        </div>
        <div className="rounded-[16px] bg-[#E8830C] p-3.5 text-white">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/70">You Will Give</div>
          <div className="mt-1 text-[20px] font-extrabold tabular-nums">{inr(type === "supplier" ? totalGive : 0)}</div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={() => setType("customer")} className={cn("flex-1 rounded-[13px] py-2.5 text-[12.5px] font-extrabold", type === "customer" ? "bg-black text-white dark:bg-white dark:text-black" : "card text-ink2 shadow-card")}>Customers</button>
        <button onClick={() => setType("supplier")} className={cn("flex-1 rounded-[13px] py-2.5 text-[12.5px] font-extrabold", type === "supplier" ? "bg-black text-white dark:bg-white dark:text-black" : "card text-ink2 shadow-card")}>Suppliers</button>
      </div>

      <div className="mt-2.5 flex items-center gap-2 rounded-[13px] card px-3 py-2.5 shadow-card">
        <Search size={15} className="text-ink3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${type}s…`} className="flex-1 bg-transparent text-[13px] font-semibold placeholder:text-ink3" />
      </div>

      <div className="mt-3 space-y-2">
        {list.map(({ p, bal }) => (
          <button key={p.id} onClick={() => { setOpenParty(p.id); blip(560); }} className="card flex w-full items-center gap-3 rounded-[16px] p-3 text-left shadow-card">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black/8 text-[14px] font-black dark:bg-white/12">{p.name[0]?.toUpperCase()}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-extrabold">{p.name}</span><span className="block text-[10.5px] text-ink3">{p.phone || "No phone"}</span></span>
            <span className="text-right">
              <span className={cn("block text-[13.5px] font-extrabold tabular-nums", bal > 0 ? (type === "customer" ? "text-[#0C831F]" : "text-[#E8830C]") : "text-ink3")}>{inr(Math.abs(bal))}</span>
              <span className="block text-[9.5px] font-bold text-ink3">{bal === 0 ? "Settled" : type === "customer" ? "to get" : "to give"}</span>
            </span>
          </button>
        ))}
        {list.length === 0 && (
          <div className="card rounded-[18px] p-8 text-center shadow-card">
            <div className="text-[40px]">{type === "customer" ? "🧑‍🤝‍🧑" : "🚚"}</div>
            <div className="mt-1 text-[14px] font-extrabold">No {type}s yet</div>
            <p className="mt-1 text-[12px] text-ink3">Add your first {type} to start tracking khata.</p>
          </div>
        )}
      </div>

      <button onClick={onParty} className="mt-3 flex w-full items-center gap-3 rounded-[16px] border-2 border-dashed divide-line p-4 text-left">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0C831F]/12 text-[#0C831F]"><Plus size={18} strokeWidth={3} /></span>
        <span className="flex-1"><span className="block text-[13px] font-extrabold">Add {type}</span><span className="block text-[11px] text-ink3">Name, phone & opening balance</span></span>
      </button>

      <AnimatePresence>{openP && <PartyLedgerSheet partyId={openP.id} onClose={() => setOpenParty(null)} onPay={onPayment} />}</AnimatePresence>
    </div>
  );
}

function PartyLedgerSheet({ partyId, onClose, onPay }: { partyId: string; onClose: () => void; onPay: () => void }) {
  const party = useBiz((s) => s.parties.find((p) => p.id === partyId));
  const entries = useBiz((s) => s.ledger.filter((l) => l.partyId === partyId).sort((a, b) => b.date - a.date));
  const bal = entries.reduce((a, l) => a + l.amount, 0);
  const [note, setNote] = useState("");
  const [amt, setAmt] = useState("");
  const { quickKhata } = useBiz();
  if (!party) return null;
  const isCustomer = party.type === "customer";

  const labelFor = (t: LedgerEntry["type"]) => ({
    credit: "You Gave (credit)", payment_received: "You Got", payment_given: "You Gave", adjustment: "Adjustment",
    opening: "Opening balance", sale: "Sale on credit", sale_return: "Sale return", purchase: "Purchase on credit", purchase_return: "Purchase return",
  }[t]);

  const share = (via: "whatsapp" | "sms") => {
    const msg = encodeURIComponent(`Namaste ${party.name}, aapka balance ${inr(Math.abs(bal))} ${bal > 0 ? "due hai" : "clear hai"}. — One Stop Bazar`);
    if (via === "whatsapp") window.open(`https://wa.me/?text=${msg}`, "_blank");
    blip(700);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[58] bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: "94%" }} animate={{ y: 0 }} exit={{ y: "94%" }} transition={{ type: "spring", stiffness: 230, damping: 30 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[92%] overflow-hidden rounded-t-[26px] app-bg">
        <div className="no-scrollbar max-h-[92vh] overflow-y-auto px-4 pb-10 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-black/15" />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-black/8 text-[15px] font-black dark:bg-white/12">{party.name[0]?.toUpperCase()}</span>
              <div><div className="text-[15px] font-extrabold">{party.name}</div><div className="text-[11px] font-semibold text-ink3">{party.phone}</div></div>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full chip"><X size={16} /></button>
          </div>

          <div className="mt-3 rounded-[16px] p-4 text-center text-white" style={{ background: bal > 0 ? (isCustomer ? "#0C831F" : "#E8830C") : "#7E7A8E" }}>
            <div className="text-[11px] font-black uppercase tracking-widest text-white/75">{bal === 0 ? "Settled" : isCustomer ? "Customer will pay you" : "You will pay supplier"}</div>
            <div className="mt-1 text-[28px] font-extrabold tabular-nums">{inr(Math.abs(bal))}</div>
          </div>

          <div className="mt-2.5 flex gap-2">
            {party.phone && (
              <>
                <a href={`tel:${party.phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] chip py-2.5 text-[12px] font-extrabold"><Phone size={14} /> Call</a>
                <button onClick={() => share("whatsapp")} className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] chip py-2.5 text-[12px] font-extrabold"><MessageCircle size={14} /> Remind</button>
              </>
            )}
            <button onClick={onPay} className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-[#7C5CFF] py-2.5 text-[12px] font-extrabold text-white"><Wallet size={14} /> Payment</button>
          </div>

          <div className="mt-4 rounded-[16px] card p-3.5 shadow-card">
            <div className="text-[11px] font-black uppercase tracking-widest text-ink3">Quick khata entry</div>
            <div className="mt-2 flex gap-2">
              <input inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} placeholder="Amount ₹" className="min-w-0 flex-1 rounded-[11px] card-2 px-3 py-2.5 text-[13px] font-bold" />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="min-w-0 flex-1 rounded-[11px] card-2 px-3 py-2.5 text-[12.5px] font-semibold" />
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => { if (!amt) return; quickKhata(partyId, "gave", +amt, note || undefined); setAmt(""); setNote(""); blip(760); }} className="flex-1 rounded-[11px] bg-[#E23744]/10 py-3 text-[12.5px] font-extrabold text-[#E23744]">You Gave</button>
              <button onClick={() => { if (!amt) return; quickKhata(partyId, "got", +amt, note || undefined); setAmt(""); setNote(""); blip(880); }} className="flex-1 rounded-[11px] bg-[#0C831F]/10 py-3 text-[12.5px] font-extrabold text-[#0C831F]">You Got</button>
            </div>
          </div>

          <div className="mt-4"><SectionHead title="Transaction history" sub={`${entries.length} entries`} /></div>
          <div className="mt-2.5 space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="card flex items-center gap-2.5 rounded-[14px] p-3 shadow-card">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white", e.amount > 0 ? "bg-[#E8830C]" : "bg-[#0C831F]")}>{e.amount > 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-extrabold">{labelFor(e.type)}</span><span className="block truncate text-[10.5px] text-ink3">{fmtDate(e.date)}{e.note ? ` • ${e.note}` : ""}{e.refCode ? ` • ${e.refCode}` : ""}</span></span>
                <span className="text-[13px] font-extrabold tabular-nums">{inr(Math.abs(e.amount))}</span>
              </div>
            ))}
            {entries.length === 0 && <div className="rounded-[12px] card-2 p-4 text-center text-[12px] font-semibold text-ink3">No transactions recorded yet.</div>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════ SALES ══════════════ */
function SalesTab({ onNew }: { onNew: () => void }) {
  const sales = useBiz((s) => s.sales);
  const { cancelSale } = useBiz();
  const total = sales.filter((s) => s.status === "completed").reduce((a, s) => a + s.total, 0);
  return (
    <div className="px-4 pt-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="card rounded-[14px] p-3 text-center shadow-card"><div className="text-[9.5px] font-black uppercase text-ink3">Total sales</div><div className="mt-0.5 text-[15px] font-extrabold">{inr(total)}</div></div>
        <div className="card rounded-[14px] p-3 text-center shadow-card"><div className="text-[9.5px] font-black uppercase text-ink3">Bills</div><div className="mt-0.5 text-[15px] font-extrabold">{sales.filter((s) => s.status === "completed").length}</div></div>
        <div className="card rounded-[14px] p-3 text-center shadow-card"><div className="text-[9.5px] font-black uppercase text-ink3">Credit out</div><div className="mt-0.5 text-[15px] font-extrabold">{inr(sales.reduce((a, s) => a + Math.max(0, s.total - s.amountPaid), 0))}</div></div>
      </div>
      <button onClick={onNew} className="mt-3 flex w-full items-center gap-3 rounded-[16px] bg-[#0C831F] p-3.5 text-left text-white shadow-[0_12px_30px_rgba(12,131,31,.35)]">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/16"><ShoppingCart size={19} /></span>
        <span className="flex-1"><span className="block text-[13.5px] font-extrabold">Create sale / bill</span><span className="block text-[11px] text-white/75">Counter sale from your products</span></span>
        <Plus size={18} strokeWidth={3} />
      </button>
      <div className="mt-4"><SectionHead title="Invoices" sub={`${sales.length} total`} /></div>
      <div className="mt-2.5 space-y-2">
        {sales.map((s) => (
          <div key={s.id} className={cn("card rounded-[16px] p-3.5 shadow-card", s.status !== "completed" && "opacity-60")}>
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0C831F]/12 text-[#0C831F]"><Receipt size={17} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-extrabold">{s.code} • {s.customerName}</span><span className="block truncate text-[10.5px] text-ink3">{s.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</span></span>
              <span className="text-right"><span className="block text-[13.5px] font-extrabold tabular-nums">{inr(s.total)}</span><span className="block text-[9.5px] font-bold text-ink3">{s.paymentMode.toUpperCase()}</span></span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t divide-line pt-2">
              <span className="text-[10.5px] font-semibold text-ink3">{fmtDate(s.createdAt)} {s.status !== "completed" && `• ${s.status}`}</span>
              {s.status === "completed" && <button onClick={() => { cancelSale(s.id); blip(420); }} className="text-[11px] font-extrabold text-[#E23744]">Cancel</button>}
            </div>
          </div>
        ))}
        {sales.length === 0 && <div className="card rounded-[18px] p-8 text-center shadow-card"><div className="text-[40px]">🧾</div><div className="mt-1 text-[14px] font-extrabold">No sales yet</div><p className="mt-1 text-[12px] text-ink3">Record your first counter sale.</p></div>}
      </div>
    </div>
  );
}

/* ══════════════ PURCHASES ══════════════ */
function PurchasesTab({ onNew }: { onNew: () => void }) {
  const purchases = useBiz((s) => s.purchases);
  const { cancelPurchase } = useBiz();
  const total = purchases.filter((p) => p.status === "completed").reduce((a, p) => a + p.total, 0);
  return (
    <div className="px-4 pt-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="card rounded-[14px] p-3 text-center shadow-card"><div className="text-[9.5px] font-black uppercase text-ink3">Total purchases</div><div className="mt-0.5 text-[15px] font-extrabold">{inr(total)}</div></div>
        <div className="card rounded-[14px] p-3 text-center shadow-card"><div className="text-[9.5px] font-black uppercase text-ink3">Bills</div><div className="mt-0.5 text-[15px] font-extrabold">{purchases.filter((p) => p.status === "completed").length}</div></div>
        <div className="card rounded-[14px] p-3 text-center shadow-card"><div className="text-[9.5px] font-black uppercase text-ink3">Payable</div><div className="mt-0.5 text-[15px] font-extrabold">{inr(purchases.reduce((a, p) => a + Math.max(0, p.total - p.amountPaid), 0))}</div></div>
      </div>
      <button onClick={onNew} className="mt-3 flex w-full items-center gap-3 rounded-[16px] bg-[#1573FF] p-3.5 text-left text-white shadow-[0_12px_30px_rgba(21,115,255,.35)]">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/16"><Truck size={19} /></span>
        <span className="flex-1"><span className="block text-[13.5px] font-extrabold">Record purchase</span><span className="block text-[11px] text-white/75">Add stock from a supplier</span></span>
        <Plus size={18} strokeWidth={3} />
      </button>
      <div className="mt-4"><SectionHead title="Purchase bills" sub={`${purchases.length} total`} /></div>
      <div className="mt-2.5 space-y-2">
        {purchases.map((p) => (
          <div key={p.id} className={cn("card rounded-[16px] p-3.5 shadow-card", p.status !== "completed" && "opacity-60")}>
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#1573FF]/12 text-[#1573FF]"><Building2 size={17} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-extrabold">{p.code} • {p.supplierName}</span><span className="block truncate text-[10.5px] text-ink3">{p.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</span></span>
              <span className="text-right"><span className="block text-[13.5px] font-extrabold tabular-nums">{inr(p.total)}</span><span className="block text-[9.5px] font-bold text-ink3">{p.paymentMode.toUpperCase()}</span></span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t divide-line pt-2">
              <span className="text-[10.5px] font-semibold text-ink3">{fmtDate(p.createdAt)} {p.status !== "completed" && `• ${p.status}`}</span>
              {p.status === "completed" && <button onClick={() => { cancelPurchase(p.id); blip(420); }} className="text-[11px] font-extrabold text-[#E23744]">Cancel</button>}
            </div>
          </div>
        ))}
        {purchases.length === 0 && <div className="card rounded-[18px] p-8 text-center shadow-card"><div className="text-[40px]">📦</div><div className="mt-1 text-[14px] font-extrabold">No purchases yet</div><p className="mt-1 text-[12px] text-ink3">Record stock coming from a supplier.</p></div>}
      </div>
    </div>
  );
}

/* ══════════════ EXPENSES ══════════════ */
function ExpensesTab({ onNew }: { onNew: () => void }) {
  const expenses = useBiz((s) => s.expenses);
  const { removeExpense } = useBiz();
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [expenses]);
  return (
    <div className="px-4 pt-3">
      <div className="card rounded-[16px] p-4 shadow-card">
        <div className="text-[10px] font-black uppercase tracking-widest text-ink3">Total expenses</div>
        <div className="mt-1 text-[24px] font-extrabold tabular-nums text-[#E8830C]">{inr(total)}</div>
        {byCat.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            {byCat.map(([cat, amt]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-[11px] font-bold text-ink2">{cat}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full chip"><span className="block h-full rounded-full bg-[#E8830C]" style={{ width: `${Math.min(100, (amt / total) * 100)}%` }} /></span>
                <span className="w-16 shrink-0 text-right text-[11px] font-extrabold tabular-nums">{inr(amt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button onClick={onNew} className="mt-3 flex w-full items-center gap-3 rounded-[16px] bg-[#E8830C] p-3.5 text-left text-white shadow-[0_12px_30px_rgba(232,131,12,.35)]">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/16"><Receipt size={19} /></span>
        <span className="flex-1"><span className="block text-[13.5px] font-extrabold">Add expense</span><span className="block text-[11px] text-white/75">Rent, electricity, salary…</span></span>
        <Plus size={18} strokeWidth={3} />
      </button>
      <div className="mt-4"><SectionHead title="All expenses" sub={`${expenses.length} entries`} /></div>
      <div className="mt-2.5 space-y-2">
        {expenses.map((e) => (
          <div key={e.id} className="card flex items-center gap-2.5 rounded-[16px] p-3 shadow-card">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E8830C]/12 text-[#E8830C]"><Receipt size={16} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-extrabold">{e.category}</span><span className="block text-[10.5px] text-ink3">{fmtDate(e.date)} • {e.mode.toUpperCase()}{e.vendor ? ` • ${e.vendor}` : ""}</span></span>
            <span className="text-[13px] font-extrabold tabular-nums">{inr(e.amount)}</span>
            <button onClick={() => removeExpense(e.id)} className="grid h-8 w-8 place-items-center rounded-lg chip text-[#E23744]"><X size={14} /></button>
          </div>
        ))}
        {expenses.length === 0 && <div className="card rounded-[18px] p-8 text-center shadow-card"><div className="text-[40px]">🧾</div><div className="mt-1 text-[14px] font-extrabold">No expenses logged</div></div>}
      </div>
    </div>
  );
}

/* ══════════════ REPORTS ══════════════ */
function ReportsTab() {
  const t = useBizTotals();
  const sales = useBiz((s) => s.sales.filter((s) => s.status === "completed"));
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
    const next = d.getTime() + 86400000;
    const v = sales.filter((s) => s.createdAt >= d.getTime() && s.createdAt < next).reduce((a, s) => a + s.total, 0);
    return { d: d.toLocaleDateString("en-IN", { weekday: "short" })[0], v: v || 1 };
  });
  const topProducts = useMemo(() => {
    const m = new Map<string, { qty: number; revenue: number }>();
    for (const s of sales) for (const it of s.items) {
      const cur = m.get(it.name) ?? { qty: 0, revenue: 0 };
      cur.qty += it.qty; cur.revenue += it.qty * it.price;
      m.set(it.name, cur);
    }
    return [...m.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
  }, [sales]);

  return (
    <div className="space-y-3 px-4 pt-3">
      <div className="card rounded-[18px] p-4 shadow-card">
        <SectionHead title="This month" sub="Profit = Sales − Purchases − Expenses" />
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <div className="card-2 rounded-[12px] p-2.5 text-center"><div className="text-[9px] font-black uppercase text-ink3">Sales</div><div className="mt-0.5 text-[13.5px] font-extrabold">{inr(t.monthSales)}</div></div>
          <div className="card-2 rounded-[12px] p-2.5 text-center"><div className="text-[9px] font-black uppercase text-ink3">Costs</div><div className="mt-0.5 text-[13.5px] font-extrabold">{inr(t.monthPurchases + t.monthExpenses)}</div></div>
          <div className="card-2 rounded-[12px] p-2.5 text-center"><div className="text-[9px] font-black uppercase text-ink3">Profit</div><div className="mt-0.5 text-[13.5px] font-extrabold" style={{ color: t.monthProfit >= 0 ? "#0C831F" : "#E23744" }}>{inr(t.monthProfit)}</div></div>
        </div>
      </div>

      <div className="card rounded-[18px] p-4 shadow-card">
        <div className="flex items-center justify-between"><span className="text-[13px] font-extrabold">Sales — last 7 days</span></div>
        <AreaGraph values={days.map((d) => d.v)} color="#0C831F" height={90} />
        <div className="flex justify-between text-[10px] font-black text-ink3">{days.map((d, i) => <span key={i}>{d.d}</span>)}</div>
      </div>

      <div className="card rounded-[18px] p-4 shadow-card">
        <SectionHead title="Top products" sub="By revenue" />
        <div className="mt-2.5 space-y-2">
          {topProducts.length === 0 && <div className="text-center text-[12px] font-semibold text-ink3">No sales data yet.</div>}
          {topProducts.map(([name, v], i) => (
            <div key={name} className="flex items-center gap-2.5">
              <span className="w-5 text-[11px] font-black text-ink3">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold">{name}</span>
              <span className="text-[11px] font-semibold text-ink3">{v.qty} sold</span>
              <span className="text-[12.5px] font-extrabold tabular-nums">{inr(v.revenue)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card rounded-[18px] p-4 shadow-card">
        <SectionHead title="Receivables & payables" />
        <div className="mt-2.5 flex gap-2">
          <div className="flex-1 rounded-[12px] bg-[#0C831F]/10 p-3 text-center"><div className="text-[10px] font-black uppercase text-[#0C831F]">To receive</div><div className="mt-0.5 text-[15px] font-extrabold">{inr(t.receivable)}</div></div>
          <div className="flex-1 rounded-[12px] bg-[#E8830C]/10 p-3 text-center"><div className="text-[10px] font-black uppercase text-[#E8830C]">To pay</div><div className="mt-0.5 text-[15px] font-extrabold">{inr(t.payable)}</div></div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ SHEETS ══════════════ */
function SheetShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: "94%" }} animate={{ y: 0 }} exit={{ y: "94%" }} transition={{ type: "spring", stiffness: 240, damping: 30 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[92%] overflow-hidden rounded-t-[26px] app-bg">
        <div className="no-scrollbar max-h-[92vh] overflow-y-auto px-4 pb-10 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-black/15" />
          <div className="mt-3 flex items-center justify-between">
            <h3 className="text-[18px] font-extrabold tracking-tight">{title}</h3>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full chip"><X size={17} /></button>
          </div>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function PartyPicker({ type, value, onChange }: { type: PartyType; value?: string; onChange: (id: string | undefined, name: string) => void }) {
  const parties = useBiz((s) => s.parties.filter((p) => p.type === type && !p.archived));
  const [open, setOpen] = useState(false);
  const sel = parties.find((p) => p.id === value);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 rounded-[13px] card-2 px-3.5 py-3 text-left">
        <Users size={15} className="text-ink3" />
        <span className="flex-1 text-[13px] font-semibold">{sel?.name ?? (type === "customer" ? "Walk-in Customer" : "Cash purchase (no supplier)")}</span>
        <ChevronRight size={15} className={cn("opacity-40 transition-transform", open && "rotate-90")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto">
              <button onClick={() => { onChange(undefined, type === "customer" ? "Walk-in Customer" : "Cash Purchase"); setOpen(false); }} className="flex w-full items-center gap-2 rounded-[10px] chip px-3 py-2 text-[12px] font-bold">None / Walk-in</button>
              {parties.map((p) => (
                <button key={p.id} onClick={() => { onChange(p.id, p.name); setOpen(false); }} className="flex w-full items-center gap-2 rounded-[10px] chip px-3 py-2 text-[12px] font-bold">{p.name} <span className="ml-auto text-ink3">{p.phone}</span></button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductPicker({ onAdd }: { onAdd: (item: { productId?: string; name: string; qty: number; price: number }) => void }) {
  const catalog = useOSB((s) => s.catalog);
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const filtered = catalog.filter((p) => !p.hidden && p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  return (
    <div className="rounded-[13px] card-2 p-3">
      <div className="flex items-center gap-2">
        <Search size={14} className="text-ink3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your products…" className="flex-1 bg-transparent text-[12.5px] font-semibold placeholder:text-ink3" />
        <button onClick={() => setCustom(!custom)} className="text-[11px] font-extrabold text-[#1573FF]">{custom ? "Catalog" : "Custom item"}</button>
      </div>
      {custom ? (
        <div className="mt-2 flex gap-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className="min-w-0 flex-1 rounded-[10px] chip px-3 py-2 text-[12px] font-semibold" />
          <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="₹" className="w-16 rounded-[10px] chip px-2 py-2 text-[12px] font-bold" />
          <button onClick={() => { if (!name || !price) return; onAdd({ name, qty: 1, price: +price }); setName(""); setPrice(""); blip(700); }} className="rounded-[10px] bg-[#0C831F] px-3 text-white"><Plus size={15} /></button>
        </div>
      ) : (
        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => { onAdd({ productId: p.id, name: p.name, qty: 1, price: p.price }); blip(700); }} className="flex w-full items-center gap-2 rounded-[10px] chip px-2.5 py-2 text-left">
              <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{p.name}</span>
              <span className="text-[11px] font-semibold text-ink3">{p.stock} in stock</span>
              <span className="text-[12px] font-extrabold">₹{p.price}</span>
            </button>
          ))}
          {q && filtered.length === 0 && <div className="py-2 text-center text-[11.5px] font-semibold text-ink3">No match — try “Custom item”.</div>}
        </div>
      )}
    </div>
  );
}

function LineEditor({ items, setItems }: { items: { productId?: string; name: string; qty: number; price: number }[]; setItems: (v: { productId?: string; name: string; qty: number; price: number }[]) => void }) {
  return (
    <div className="mt-2 space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 rounded-[11px] card-2 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{it.name}</span>
          <button onClick={() => setItems(items.map((x, xi) => (xi === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} className="grid h-6 w-6 place-items-center rounded-full chip text-[13px] font-black">−</button>
          <span className="w-5 text-center text-[12px] font-extrabold">{it.qty}</span>
          <button onClick={() => setItems(items.map((x, xi) => (xi === i ? { ...x, qty: x.qty + 1 } : x)))} className="grid h-6 w-6 place-items-center rounded-full chip text-[13px] font-black">+</button>
          <span className="w-14 text-right text-[12px] font-extrabold tabular-nums">₹{it.qty * it.price}</span>
          <button onClick={() => setItems(items.filter((_, xi) => xi !== i))} className="text-[#E23744]"><X size={14} /></button>
        </div>
      ))}
      {items.length === 0 && <div className="py-2 text-center text-[11.5px] font-semibold text-ink3">No items added yet.</div>}
    </div>
  );
}

function SaleSheet({ onClose }: { onClose: () => void }) {
  const { createSale } = useBiz();
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [items, setItems] = useState<{ productId?: string; name: string; qty: number; price: number }[]>([]);
  const [discount, setDiscount] = useState("0");
  const [mode, setMode] = useState<PaymentMode | "credit">("cash");
  const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
  const total = Math.max(0, subtotal - (+discount || 0));

  const save = () => {
    if (items.length === 0) return;
    createSale({ customerId, customerName, items, discount: +discount || 0, tax: 0, paymentMode: mode, amountPaid: mode === "credit" ? 0 : total });
    blip(920, 0.15);
    onClose();
  };

  return (
    <SheetShell title="New Sale" onClose={onClose}>
      <div className="mt-3 space-y-2.5">
        <PartyPicker type="customer" value={customerId} onChange={(id, name) => { setCustomerId(id); setCustomerName(name); }} />
        <ProductPicker onAdd={(it) => setItems((prev) => {
          const ex = prev.find((x) => x.productId === it.productId && x.name === it.name);
          if (ex) return prev.map((x) => (x === ex ? { ...x, qty: x.qty + 1 } : x));
          return [...prev, it];
        })} />
        <LineEditor items={items} setItems={setItems} />
        <div className="flex items-center gap-2 rounded-[13px] card-2 px-3.5 py-2.5">
          <span className="text-[11.5px] font-bold text-ink2">Discount ₹</span>
          <input inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ""))} className="flex-1 bg-transparent text-right text-[13px] font-bold" />
        </div>
        <div>
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-ink3">Payment mode</div>
          <div className="grid grid-cols-5 gap-1.5">
            {[...MODES, { k: "credit" as const, t: "Credit", i: Wallet }].map((m) => (
              <button key={m.k} onClick={() => setMode(m.k)} className={cn("rounded-[11px] py-2.5 text-center text-[10.5px] font-extrabold", mode === m.k ? "bg-[#0C831F] text-white" : "chip text-ink2")}><m.i size={15} className="mx-auto" /><div className="mt-0.5">{m.t}</div></button>
            ))}
          </div>
        </div>
        <div className="rounded-[14px] bg-[#0C831F] p-4 text-white">
          <div className="flex justify-between text-[12px] font-semibold text-white/75"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
          <div className="mt-0.5 flex items-end justify-between"><span className="text-[13px] font-bold">Total</span><span className="text-[24px] font-extrabold">{inr(total)}</span></div>
        </div>
      </div>
      <button onClick={save} disabled={items.length === 0} className="mt-4 w-full rounded-[14px] bg-[#0C831F] py-4 text-[14px] font-extrabold text-white disabled:opacity-40">Save sale & update stock</button>
    </SheetShell>
  );
}

function PurchaseSheet({ onClose }: { onClose: () => void }) {
  const { createPurchase } = useBiz();
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
  const [supplierName, setSupplierName] = useState("Cash Purchase");
  const [items, setItems] = useState<{ productId?: string; name: string; qty: number; price: number }[]>([]);
  const [discount, setDiscount] = useState("0");
  const [mode, setMode] = useState<PaymentMode | "credit">("cash");
  const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
  const total = Math.max(0, subtotal - (+discount || 0));

  const save = () => {
    if (items.length === 0) return;
    createPurchase({ supplierId, supplierName, items: items.map((i) => ({ productId: i.productId, name: i.name, qty: i.qty, cost: i.price })), discount: +discount || 0, tax: 0, paymentMode: mode, amountPaid: mode === "credit" ? 0 : total });
    blip(920, 0.15);
    onClose();
  };

  return (
    <SheetShell title="New Purchase" onClose={onClose}>
      <div className="mt-3 space-y-2.5">
        <PartyPicker type="supplier" value={supplierId} onChange={(id, name) => { setSupplierId(id); setSupplierName(name); }} />
        <ProductPicker onAdd={(it) => setItems((prev) => {
          const ex = prev.find((x) => x.productId === it.productId && x.name === it.name);
          if (ex) return prev.map((x) => (x === ex ? { ...x, qty: x.qty + 1 } : x));
          return [...prev, it];
        })} />
        <LineEditor items={items} setItems={setItems} />
        <div className="flex items-center gap-2 rounded-[13px] card-2 px-3.5 py-2.5">
          <span className="text-[11.5px] font-bold text-ink2">Discount ₹</span>
          <input inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ""))} className="flex-1 bg-transparent text-right text-[13px] font-bold" />
        </div>
        <div>
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-ink3">Payment mode</div>
          <div className="grid grid-cols-5 gap-1.5">
            {[...MODES, { k: "credit" as const, t: "Credit", i: Wallet }].map((m) => (
              <button key={m.k} onClick={() => setMode(m.k)} className={cn("rounded-[11px] py-2.5 text-center text-[10.5px] font-extrabold", mode === m.k ? "bg-[#1573FF] text-white" : "chip text-ink2")}><m.i size={15} className="mx-auto" /><div className="mt-0.5">{m.t}</div></button>
            ))}
          </div>
        </div>
        <div className="rounded-[14px] bg-[#1573FF] p-4 text-white">
          <div className="flex justify-between text-[12px] font-semibold text-white/75"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
          <div className="mt-0.5 flex items-end justify-between"><span className="text-[13px] font-bold">Total</span><span className="text-[24px] font-extrabold">{inr(total)}</span></div>
        </div>
      </div>
      <button onClick={save} disabled={items.length === 0} className="mt-4 w-full rounded-[14px] bg-[#1573FF] py-4 text-[14px] font-extrabold text-white disabled:opacity-40">Save purchase & add stock</button>
    </SheetShell>
  );
}

function ExpenseSheet({ onClose }: { onClose: () => void }) {
  const { addExpense } = useBiz();
  const [category, setCategory] = useState(EXPENSE_CATS[0]);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [vendor, setVendor] = useState("");
  const save = () => {
    if (!amount) return;
    addExpense({ category, amount: +amount, mode, vendor: vendor || undefined, recurring: "none" });
    blip(920, 0.15);
    onClose();
  };
  return (
    <SheetShell title="Add Expense" onClose={onClose}>
      <div className="mt-3 space-y-2.5">
        <div>
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-ink3">Category</div>
          <div className="flex flex-wrap gap-1.5">
            {EXPENSE_CATS.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={cn("rounded-full px-3 py-1.5 text-[11.5px] font-extrabold", category === c ? "bg-[#E8830C] text-white" : "chip text-ink2")}>{c}</button>
            ))}
          </div>
        </div>
        <div className="rounded-[13px] card-2 px-3.5 py-3">
          <span className="block text-[9.5px] font-black uppercase tracking-widest text-ink3">Amount ₹</span>
          <input inputMode="numeric" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="0" className="w-full bg-transparent text-[20px] font-extrabold" />
        </div>
        <div className="rounded-[13px] card-2 px-3.5 py-3">
          <span className="block text-[9.5px] font-black uppercase tracking-widest text-ink3">Vendor (optional)</span>
          <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. BESCOM" className="w-full bg-transparent text-[13px] font-semibold placeholder:text-ink3" />
        </div>
        <div>
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-ink3">Paid via</div>
          <div className="grid grid-cols-4 gap-1.5">
            {MODES.map((m) => (
              <button key={m.k} onClick={() => setMode(m.k)} className={cn("rounded-[11px] py-2.5 text-center text-[10.5px] font-extrabold", mode === m.k ? "bg-[#E8830C] text-white" : "chip text-ink2")}><m.i size={15} className="mx-auto" /><div className="mt-0.5">{m.t}</div></button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={save} disabled={!amount} className="mt-4 w-full rounded-[14px] bg-[#E8830C] py-4 text-[14px] font-extrabold text-white disabled:opacity-40">Save expense</button>
    </SheetShell>
  );
}

function PartySheet({ onClose }: { onClose: () => void }) {
  const { addParty } = useBiz();
  const [type, setType] = useState<PartyType>("customer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [opening, setOpening] = useState("");
  const save = () => {
    if (!name.trim()) return;
    addParty({ type, name, phone, openingBalance: opening ? +opening : 0 });
    blip(920, 0.15);
    onClose();
  };
  return (
    <SheetShell title="Add Party" onClose={onClose}>
      <div className="mt-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setType("customer")} className={cn("rounded-[12px] py-3 text-[12.5px] font-extrabold", type === "customer" ? "bg-[#0C831F] text-white" : "card shadow-card")}>Customer</button>
          <button onClick={() => setType("supplier")} className={cn("rounded-[12px] py-3 text-[12.5px] font-extrabold", type === "supplier" ? "bg-[#E8830C] text-white" : "card shadow-card")}>Supplier</button>
        </div>
        <div className="rounded-[13px] card-2 px-3.5 py-2.5"><span className="block text-[9.5px] font-black uppercase tracking-widest text-ink3">Name *</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full bg-transparent text-[13.5px] font-semibold placeholder:text-ink3" /></div>
        <div className="rounded-[13px] card-2 px-3.5 py-2.5"><span className="block text-[9.5px] font-black uppercase tracking-widest text-ink3">Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxx xxxxx" className="w-full bg-transparent text-[13.5px] font-semibold placeholder:text-ink3" /></div>
        <div className="rounded-[13px] card-2 px-3.5 py-2.5"><span className="block text-[9.5px] font-black uppercase tracking-widest text-ink3">Opening balance ₹ (optional)</span><input inputMode="numeric" value={opening} onChange={(e) => setOpening(e.target.value.replace(/\D/g, ""))} placeholder="0" className="w-full bg-transparent text-[13.5px] font-semibold placeholder:text-ink3" /></div>
      </div>
      <button onClick={save} disabled={!name.trim()} className="mt-4 w-full rounded-[14px] bg-[#0C831F] py-4 text-[14px] font-extrabold text-white disabled:opacity-40">Save {type}</button>
    </SheetShell>
  );
}

function PaymentSheet({ onClose }: { onClose: () => void }) {
  const { recordPaymentReceived, recordPaymentGiven } = useBiz();
  const [dir, setDir] = useState<"in" | "out">("in");
  const [partyId, setPartyId] = useState<string | undefined>(undefined);
  const [partyName, setPartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const save = () => {
    if (!partyId || !amount) return;
    if (dir === "in") recordPaymentReceived(partyId, +amount, mode);
    else recordPaymentGiven(partyId, +amount, mode);
    blip(920, 0.15);
    onClose();
  };
  return (
    <SheetShell title="Record Payment" onClose={onClose}>
      <div className="mt-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setDir("in"); setPartyId(undefined); }} className={cn("rounded-[12px] py-3 text-[12.5px] font-extrabold", dir === "in" ? "bg-[#0C831F] text-white" : "card shadow-card")}>Received (from customer)</button>
          <button onClick={() => { setDir("out"); setPartyId(undefined); }} className={cn("rounded-[12px] py-3 text-[12.5px] font-extrabold", dir === "out" ? "bg-[#E8830C] text-white" : "card shadow-card")}>Given (to supplier)</button>
        </div>
        <PartyPicker type={dir === "in" ? "customer" : "supplier"} value={partyId} onChange={(id, name) => { setPartyId(id); setPartyName(name); }} />
        <div className="rounded-[13px] card-2 px-3.5 py-3"><span className="block text-[9.5px] font-black uppercase tracking-widest text-ink3">Amount ₹</span><input inputMode="numeric" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="0" className="w-full bg-transparent text-[20px] font-extrabold" /></div>
        <div>
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-ink3">Mode</div>
          <div className="grid grid-cols-4 gap-1.5">
            {MODES.map((m) => (
              <button key={m.k} onClick={() => setMode(m.k)} className={cn("rounded-[11px] py-2.5 text-center text-[10.5px] font-extrabold", mode === m.k ? "bg-[#7C5CFF] text-white" : "chip text-ink2")}><m.i size={15} className="mx-auto" /><div className="mt-0.5">{m.t}</div></button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={save} disabled={!partyId || !amount} className="mt-4 w-full rounded-[14px] bg-[#7C5CFF] py-4 text-[14px] font-extrabold text-white disabled:opacity-40">Save payment</button>
    </SheetShell>
  );
}
