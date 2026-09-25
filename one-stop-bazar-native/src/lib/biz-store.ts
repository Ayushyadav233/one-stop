import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useOSB } from "@/lib/osb-store";

export type PaymentMode = "cash" | "upi" | "bank" | "card" | "cheque" | "other";
export type PartyType = "customer" | "supplier";

export interface Party {
  id: string;
  type: PartyType;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  creditLimit?: number;
  paymentTerms?: string;
  notes?: string;
  tags: string[];
  createdAt: number;
  archived?: boolean;
}

// Signed amount convention:
// Customer party: +amount => customer owes shop more ("You Will Get"); -amount => reduces due.
// Supplier party: +amount => shop owes supplier more ("You Will Give"); -amount => reduces due.
export type LedgerType = "credit" | "payment_received" | "payment_given" | "adjustment" | "opening" | "sale" | "sale_return" | "purchase" | "purchase_return";

export interface LedgerEntry {
  id: string;
  partyId: string;
  type: LedgerType;
  amount: number; // signed per convention above
  date: number;
  mode?: PaymentMode;
  note?: string;
  refCode?: string;
  attachment?: string;
}

export interface SaleItem { productId?: string; name: string; qty: number; price: number; }
export interface Sale {
  id: string;
  code: string;
  channel: "counter" | "wholesale";
  customerId?: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMode: PaymentMode | "credit";
  amountPaid: number;
  status: "completed" | "cancelled" | "returned";
  createdAt: number;
  note?: string;
}

export interface PurchaseItem { productId?: string; name: string; qty: number; cost: number; }
export interface Purchase {
  id: string;
  code: string;
  supplierId?: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMode: PaymentMode | "credit";
  amountPaid: number;
  status: "completed" | "cancelled" | "returned";
  createdAt: number;
  note?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: number;
  mode: PaymentMode;
  vendor?: string;
  note?: string;
  recurring: "none" | "daily" | "weekly" | "monthly" | "yearly";
}

export interface Reminder {
  id: string;
  partyId: string;
  amount: number;
  dueDate: string;
  status: "pending" | "sent" | "done";
  channel: "whatsapp" | "sms" | "share";
  createdAt: number;
}

export const EXPENSE_CATS = ["Rent", "Electricity", "Salary", "Transport", "Packaging", "Maintenance", "Marketing", "Software", "Loan payment", "Bank charges", "Miscellaneous"];

interface BizState {
  parties: Party[];
  ledger: LedgerEntry[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  reminders: Reminder[];
  openingCash: number;
  openingBank: number;

  addParty: (p: Omit<Party, "id" | "createdAt" | "tags"> & { tags?: string[]; openingBalance?: number }) => Party;
  archiveParty: (id: string) => void;
  addLedgerEntry: (e: Omit<LedgerEntry, "id" | "date"> & { date?: number }) => void;
  recordPaymentReceived: (partyId: string, amount: number, mode: PaymentMode, note?: string) => void;
  recordPaymentGiven: (partyId: string, amount: number, mode: PaymentMode, note?: string) => void;
  quickKhata: (partyId: string, kind: "gave" | "got", amount: number, note?: string) => void;

  createSale: (input: { customerId?: string; customerName: string; items: SaleItem[]; discount: number; tax: number; paymentMode: PaymentMode | "credit"; amountPaid: number; note?: string }) => Sale;
  cancelSale: (id: string) => void;

  createPurchase: (input: { supplierId?: string; supplierName: string; items: PurchaseItem[]; discount: number; tax: number; paymentMode: PaymentMode | "credit"; amountPaid: number; note?: string }) => Purchase;
  cancelPurchase: (id: string) => void;

  addExpense: (e: Omit<Expense, "id" | "date"> & { date?: number }) => void;
  removeExpense: (id: string) => void;

  addReminder: (r: Omit<Reminder, "id" | "createdAt" | "status">) => void;
  markReminder: (id: string, status: Reminder["status"]) => void;
  recordMarketplaceSale: (input: { customerId?: string; customerName: string; customerPhone?: string; items: SaleItem[]; discount: number; total: number; payment: string; code: string }) => void;
}

function genId(prefix: string) {
  return prefix + "-" + Math.random().toString(36).slice(2, 9);
}

export const useBiz = create<BizState>()(
  persist(
    (set, get) => ({
      parties: [],
      ledger: [],
      sales: [],
      purchases: [],
      expenses: [],
      reminders: [],
      openingCash: 5000,
      openingBank: 20000,

      addParty: (p) => {
        const party: Party = {
          id: genId("party"),
          type: p.type,
          name: p.name.trim(),
          phone: p.phone,
          email: p.email,
          address: p.address,
          gstin: p.gstin,
          creditLimit: p.creditLimit,
          paymentTerms: p.paymentTerms,
          notes: p.notes,
          tags: p.tags ?? [],
          createdAt: Date.now(),
        };
        set((st) => ({ parties: [party, ...st.parties] }));
        if (p.openingBalance) {
          get().addLedgerEntry({ partyId: party.id, type: "opening", amount: p.openingBalance, note: "Opening balance" });
        }
        return party;
      },
      archiveParty: (id) => set((st) => ({ parties: st.parties.map((p) => (p.id === id ? { ...p, archived: true } : p)) })),

      addLedgerEntry: (e) => set((st) => ({ ledger: [{ ...e, id: genId("led"), date: e.date ?? Date.now() }, ...st.ledger] })),

      recordPaymentReceived: (partyId, amount, mode, note) => {
        get().addLedgerEntry({ partyId, type: "payment_received", amount: -Math.abs(amount), mode, note });
      },
      recordPaymentGiven: (partyId, amount, mode, note) => {
        get().addLedgerEntry({ partyId, type: "payment_given", amount: -Math.abs(amount), mode, note });
      },
      quickKhata: (partyId, kind, amount, note) => {
        const party = get().parties.find((p) => p.id === partyId);
        if (!party) return;
        if (party.type === "customer") {
          // "You Gave" (goods/credit) increases due; "You Got" (payment) decreases due
          get().addLedgerEntry({ partyId, type: kind === "gave" ? "credit" : "payment_received", amount: kind === "gave" ? Math.abs(amount) : -Math.abs(amount), note });
        } else {
          // Supplier: "You Gave" = you paid them (decreases payable); "You Got" = goods received on credit (increases payable)
          get().addLedgerEntry({ partyId, type: kind === "gave" ? "payment_given" : "purchase", amount: kind === "gave" ? -Math.abs(amount) : Math.abs(amount), note });
        }
      },

      createSale: (input) => {
        const subtotal = input.items.reduce((a, i) => a + i.qty * i.price, 0);
        const total = Math.max(0, subtotal - input.discount + input.tax);
        const sale: Sale = {
          id: genId("sale"),
          code: "SL-" + Math.floor(1000 + Math.random() * 9000),
          channel: "counter",
          customerId: input.customerId,
          customerName: input.customerName || "Walk-in Customer",
          items: input.items,
          subtotal,
          discount: input.discount,
          tax: input.tax,
          total,
          paymentMode: input.paymentMode,
          amountPaid: input.paymentMode === "credit" ? input.amountPaid : total,
          status: "completed",
          createdAt: Date.now(),
          note: input.note,
        };
        set((st) => ({ sales: [sale, ...st.sales] }));
        // deduct stock from seller catalog (single source of truth)
        const bump = useOSB.getState().bumpStock;
        for (const it of input.items) if (it.productId) bump(it.productId, -it.qty);
        // ledger: if credit or partial, update customer due
        const due = total - sale.amountPaid;
        if (input.customerId && due > 0) {
          get().addLedgerEntry({ partyId: input.customerId, type: "sale", amount: due, refCode: sale.code, note: `Sale ${sale.code}` });
        }
        return sale;
      },
      cancelSale: (id) => {
        const sale = get().sales.find((s) => s.id === id);
        if (!sale || sale.status !== "completed") return;
        set((st) => ({ sales: st.sales.map((s) => (s.id === id ? { ...s, status: "cancelled" } : s)) }));
        const bump = useOSB.getState().bumpStock;
        for (const it of sale.items) if (it.productId) bump(it.productId, it.qty);
        const due = sale.total - sale.amountPaid;
        if (sale.customerId && due > 0) {
          get().addLedgerEntry({ partyId: sale.customerId, type: "sale_return", amount: -due, refCode: sale.code, note: `Cancelled ${sale.code}` });
        }
      },

      createPurchase: (input) => {
        const subtotal = input.items.reduce((a, i) => a + i.qty * i.cost, 0);
        const total = Math.max(0, subtotal - input.discount + input.tax);
        const purchase: Purchase = {
          id: genId("pur"),
          code: "PO-" + Math.floor(1000 + Math.random() * 9000),
          supplierId: input.supplierId,
          supplierName: input.supplierName || "Cash Purchase",
          items: input.items,
          subtotal,
          discount: input.discount,
          tax: input.tax,
          total,
          paymentMode: input.paymentMode,
          amountPaid: input.paymentMode === "credit" ? input.amountPaid : total,
          status: "completed",
          createdAt: Date.now(),
          note: input.note,
        };
        set((st) => ({ purchases: [purchase, ...st.purchases] }));
        const bump = useOSB.getState().bumpStock;
        for (const it of input.items) if (it.productId) bump(it.productId, it.qty);
        const due = total - purchase.amountPaid;
        if (input.supplierId && due > 0) {
          get().addLedgerEntry({ partyId: input.supplierId, type: "purchase", amount: due, refCode: purchase.code, note: `Purchase ${purchase.code}` });
        }
        return purchase;
      },
      cancelPurchase: (id) => {
        const purchase = get().purchases.find((p) => p.id === id);
        if (!purchase || purchase.status !== "completed") return;
        set((st) => ({ purchases: st.purchases.map((p) => (p.id === id ? { ...p, status: "cancelled" } : p)) }));
        const bump = useOSB.getState().bumpStock;
        for (const it of purchase.items) if (it.productId) bump(it.productId, -it.qty);
        const due = purchase.total - purchase.amountPaid;
        if (purchase.supplierId && due > 0) {
          get().addLedgerEntry({ partyId: purchase.supplierId, type: "purchase_return", amount: -due, refCode: purchase.code, note: `Cancelled ${purchase.code}` });
        }
      },

      addExpense: (e) => set((st) => ({ expenses: [{ ...e, id: genId("exp"), date: e.date ?? Date.now() }, ...st.expenses] })),
      removeExpense: (id) => set((st) => ({ expenses: st.expenses.filter((e) => e.id !== id) })),

      addReminder: (r) => set((st) => ({ reminders: [{ ...r, id: genId("rem"), createdAt: Date.now(), status: "pending" }, ...st.reminders] })),
      markReminder: (id, status) => set((st) => ({ reminders: st.reminders.map((r) => (r.id === id ? { ...r, status } : r)) })),
      recordMarketplaceSale: (input) => {
        const pay = input.payment.toLowerCase();
        const isCod = pay === "cod";
        const mode: PaymentMode = pay === "upi" ? "upi" : pay === "card" ? "card" : "cash";
        const sale: Sale = {
          id: genId("sale"),
          code: input.code,
          channel: "counter",
          customerId: input.customerId,
          customerName: input.customerName,
          items: input.items,
          subtotal: input.total + input.discount,
          discount: input.discount,
          tax: 0,
          total: input.total,
          paymentMode: isCod ? "credit" : mode,
          amountPaid: isCod ? 0 : input.total,
          status: "completed",
          createdAt: Date.now(),
          note: "ONE STOP BAZAR marketplace order",
        };
        set((st) => ({ sales: [sale, ...st.sales.filter((s) => s.code !== input.code)] }));
        if (input.customerId && isCod) {
          get().addLedgerEntry({ partyId: input.customerId, type: "sale", amount: input.total, refCode: input.code, note: `Marketplace ${input.code}` });
        }
      },
    }),
    { name: "osb-biz-v1", storage: createJSONStorage(() => AsyncStorage) }
  )
);

/* ── selectors / computed helpers ── */
export function recordMarketplaceOrder(o: { customer: string; phone: string; items: { productId?: string; name: string; qty: number; price: number }[]; discount: number; total: number; payment: string; code: string }) {
  const biz = useBiz.getState();
  const digits = o.phone.replace(/\D/g, "").slice(-10);
  let party = biz.parties.find((p) => p.type === "customer" && p.phone.replace(/\D/g, "").slice(-10) === digits);
  if (!party) {
    party = biz.addParty({ type: "customer", name: o.customer || "Customer", phone: o.phone, notes: "Linked marketplace account" });
  }
  biz.recordMarketplaceSale({
    customerId: party.id,
    customerName: o.customer,
    customerPhone: o.phone,
    items: o.items,
    discount: o.discount,
    total: o.total,
    payment: o.payment,
    code: o.code,
  });
}

export type BizSnap = {
  parties: Party[];
  ledger: LedgerEntry[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  reminders: Reminder[];
  openingCash: number;
  openingBank: number;
};

export function exportBiz(): BizSnap {
  const s = useBiz.getState();
  return { parties: s.parties, ledger: s.ledger, sales: s.sales, purchases: s.purchases, expenses: s.expenses, reminders: s.reminders, openingCash: s.openingCash, openingBank: s.openingBank };
}

export function importBiz(data: BizSnap) {
  useBiz.setState({
    parties: data.parties ?? [],
    ledger: data.ledger ?? [],
    sales: data.sales ?? [],
    purchases: data.purchases ?? [],
    expenses: data.expenses ?? [],
    reminders: data.reminders ?? [],
    openingCash: data.openingCash ?? 5000,
    openingBank: data.openingBank ?? 20000,
  });
}

export function resetBiz() {
  useBiz.setState({ parties: [], ledger: [], sales: [], purchases: [], expenses: [], reminders: [], openingCash: 5000, openingBank: 20000 });
}

export function partyBalance(partyId: string): number {
  return useBiz.getState().ledger.filter((l) => l.partyId === partyId).reduce((a, l) => a + l.amount, 0);
}

export function useBizTotals() {
  const parties = useBiz((s) => s.parties);
  const ledger = useBiz((s) => s.ledger);
  const sales = useBiz((s) => s.sales);
  const purchases = useBiz((s) => s.purchases);
  const expenses = useBiz((s) => s.expenses);

  const balances = new Map<string, number>();
  for (const l of ledger) balances.set(l.partyId, (balances.get(l.partyId) ?? 0) + l.amount);

  const receivable = parties.filter((p) => p.type === "customer" && !p.archived).reduce((a, p) => a + Math.max(0, balances.get(p.id) ?? 0), 0);
  const payable = parties.filter((p) => p.type === "supplier" && !p.archived).reduce((a, p) => a + Math.max(0, balances.get(p.id) ?? 0), 0);

  const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();
  const okSales = sales.filter((s) => s.status === "completed");
  const okPurchases = purchases.filter((p) => p.status === "completed");

  const todaySales = okSales.filter((s) => isToday(s.createdAt)).reduce((a, s) => a + s.total, 0);
  const todayPurchases = okPurchases.filter((p) => isToday(p.createdAt)).reduce((a, p) => a + p.total, 0);
  const todayExpenses = expenses.filter((e) => isToday(e.date)).reduce((a, e) => a + e.amount, 0);
  const todayCollections = ledger.filter((l) => isToday(l.date) && l.type === "payment_received").reduce((a, l) => a + Math.abs(l.amount), 0);
  const todayPayments = ledger.filter((l) => isToday(l.date) && l.type === "payment_given").reduce((a, l) => a + Math.abs(l.amount), 0);
  const todayProfit = todaySales - todayPurchases - todayExpenses;

  const cashIn = okSales.filter((s) => s.paymentMode === "cash").reduce((a, s) => a + s.amountPaid, 0) + ledger.filter((l) => l.mode === "cash" && l.type === "payment_received").reduce((a, l) => a + Math.abs(l.amount), 0);
  const cashOut = okPurchases.filter((p) => p.paymentMode === "cash").reduce((a, p) => a + p.amountPaid, 0) + expenses.filter((e) => e.mode === "cash").reduce((a, e) => a + e.amount, 0) + ledger.filter((l) => l.mode === "cash" && l.type === "payment_given").reduce((a, l) => a + Math.abs(l.amount), 0);
  const cashBalance = useBiz.getState().openingCash + cashIn - cashOut;

  const bankIn = okSales.filter((s) => s.paymentMode === "bank" || s.paymentMode === "card" || s.paymentMode === "cheque").reduce((a, s) => a + s.amountPaid, 0) + ledger.filter((l) => (l.mode === "bank" || l.mode === "card" || l.mode === "cheque") && l.type === "payment_received").reduce((a, l) => a + Math.abs(l.amount), 0);
  const bankOut = okPurchases.filter((p) => p.paymentMode === "bank" || p.paymentMode === "card" || p.paymentMode === "cheque").reduce((a, p) => a + p.amountPaid, 0) + expenses.filter((e) => e.mode === "bank" || e.mode === "card" || e.mode === "cheque").reduce((a, e) => a + e.amount, 0) + ledger.filter((l) => (l.mode === "bank" || l.mode === "card" || l.mode === "cheque") && l.type === "payment_given").reduce((a, l) => a + Math.abs(l.amount), 0);
  const bankBalance = useBiz.getState().openingBank + bankIn - bankOut;

  const upiIn = okSales.filter((s) => s.paymentMode === "upi").reduce((a, s) => a + s.amountPaid, 0) + ledger.filter((l) => l.mode === "upi" && l.type === "payment_received").reduce((a, l) => a + Math.abs(l.amount), 0);
  const upiOut = okPurchases.filter((p) => p.paymentMode === "upi").reduce((a, p) => a + p.amountPaid, 0) + expenses.filter((e) => e.mode === "upi").reduce((a, e) => a + e.amount, 0);
  const upiBalance = upiIn - upiOut;

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthSales = okSales.filter((s) => s.createdAt >= monthStart.getTime()).reduce((a, s) => a + s.total, 0);
  const monthPurchases = okPurchases.filter((p) => p.createdAt >= monthStart.getTime()).reduce((a, p) => a + p.total, 0);
  const monthExpenses = expenses.filter((e) => e.date >= monthStart.getTime()).reduce((a, e) => a + e.amount, 0);

  return { balances, receivable, payable, todaySales, todayPurchases, todayExpenses, todayProfit, todayCollections, todayPayments, cashBalance, bankBalance, upiBalance, monthSales, monthPurchases, monthExpenses, monthProfit: monthSales - monthPurchases - monthExpenses };
}
