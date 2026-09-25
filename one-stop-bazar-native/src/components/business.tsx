/**
 * Business Khata hub — RN port of web src/components/business.tsx.
 * Deltas (rest-state pixels identical, numeric logic byte-identical):
 * - Sticky web header → fixed header above content (same look).
 * - framer-motion tab/fab/sheet animation → Reanimated FadeIn / SlideInDown entering.
 * - layoutId "biztab" pill → plain conditional background (no RN equivalent).
 * - window.open(wa.me) → Linking.openURL; tel: links → Linking.openURL.
 * - Tables/ledgers were already stacked card rows on web — kept as card rows.
 * - Grids → flexDirection row + flex:1 cells with gap (same geometry).
 * - Dark-mode conditional classes → useTheme() name check.
 */
import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BookText,
  Building2,
  ChevronRight,
  CreditCard,
  FileText,
  Landmark,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react-native";
import { inr } from "@/lib/data";
import { blip, useOSB } from "@/lib/osb-store";
import {
  EXPENSE_CATS,
  useBiz,
  useBizTotals,
  type LedgerEntry,
  type PartyType,
  type PaymentMode,
} from "@/lib/biz-store";
import { useTheme } from "@/theme/ThemeProvider";
import { AreaGraph, F, SectionHead } from "./ui";

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
  const set = useOSB((s) => s.set);
  const seller = useOSB((s) => s.seller);
  const phone = useOSB((s) => s.phone);
  const { colors, name } = useTheme();
  void name;

  return (
    <View style={{ flex: 1, backgroundColor: colors.app }}>
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
          <Pressable onPress={() => set({ tab: "dash" })} style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.chip }}>
            <ChevronRight size={17} color={colors.ink} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 19, letterSpacing: -0.4, color: colors.ink }}>Business Khata</Text>
            <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink2 }}>{seller.name || "Your shop"} • linked to {phone || "your number"}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "rgba(12,131,31,.12)", paddingHorizontal: 10, paddingVertical: 6 }}>
            <RefreshCcw size={11} color="#0C831F" />
            <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: "#0C831F" }}>Live</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, marginTop: 12 }}>
          {TABS.map((t) => {
            const I = t.i;
            const on = tab === t.k;
            return (
              <Pressable
                key={t.k}
                onPress={() => { setTab(t.k); blip(600); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: on ? "#0C831F" : colors.chip }}
              >
                <I size={13} color={on ? "#fff" : colors.ink2} />
                <Text style={{ fontFamily: F.extra, fontSize: 12, color: on ? "#fff" : colors.ink2 }}>{t.t}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        <Animated.View key={tab} entering={FadeIn.duration(220)} style={{ flex: 1 }}>
          {tab === "dashboard" && <Dashboard onQuick={setFab} onTab={setTab} />}
          {tab === "khata" && <KhataTab onPayment={() => setFab("payment")} onParty={() => setFab("party")} />}
          {tab === "sales" && <SalesTab onNew={() => setFab("sale")} />}
          {tab === "purchases" && <PurchasesTab onNew={() => setFab("purchase")} />}
          {tab === "expenses" && <ExpensesTab onNew={() => setFab("expense")} />}
          {tab === "reports" && <ReportsTab />}
        </Animated.View>
      </View>

      {/* FAB */}
      {fab === null && (
        <View pointerEvents="box-none" style={{ position: "absolute", right: 16, bottom: 96, alignItems: "flex-end", gap: 8 }}>
          <QuickFabMenu onPick={setFab} />
        </View>
      )}

      {fab === "sale" && <SaleSheet onClose={() => setFab(null)} />}
      {fab === "purchase" && <PurchaseSheet onClose={() => setFab(null)} />}
      {fab === "expense" && <ExpenseSheet onClose={() => setFab(null)} />}
      {fab === "party" && <PartySheet onClose={() => setFab(null)} />}
      {fab === "payment" && <PaymentSheet onClose={() => setFab(null)} />}
    </View>
  );
}

function QuickFabMenu({ onPick }: { onPick: (v: "sale" | "purchase" | "expense" | "party" | "payment") => void }) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const actions: [string, string, typeof ShoppingCart, "sale" | "purchase" | "expense" | "party" | "payment"][] = [
    ["Sale", "#0C831F", ShoppingCart, "sale"],
    ["Purchase", "#1573FF", Truck, "purchase"],
    ["Expense", "#E8830C", Receipt, "expense"],
    ["Payment", "#7C5CFF", Wallet, "payment"],
    ["Party", "#E23744", Users, "party"],
  ];
  return (
    <>
      {open && (
        <Animated.View entering={FadeIn} style={{ alignItems: "flex-end", gap: 8 }}>
          {actions.map(([label, color, Icon, key]) => (
            <Pressable key={key} onPress={() => { onPick(key); setOpen(false); blip(680); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingLeft: 14, paddingRight: 8, paddingVertical: 8, elevation: 6, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }}>
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{label}</Text>
              <View style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: color }}>
                <Icon size={16} color="#fff" />
              </View>
            </Pressable>
          ))}
        </Animated.View>
      )}
      <Pressable onPress={() => { setOpen(!open); blip(720); }} style={{ height: 56, width: 56, alignItems: "center", justifyContent: "center", borderRadius: 28, backgroundColor: "#0C831F", elevation: 8, shadowColor: "#0C831F", shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 16 } }}>
        <View style={{ transform: [{ rotate: open ? "45deg" : "0deg" }] }}>
          <Plus size={26} strokeWidth={2.5} color="#fff" />
        </View>
      </Pressable>
    </>
  );
}

/* ══════════════ DASHBOARD ══════════════ */
function Dashboard({ onQuick, onTab }: { onQuick: (v: "sale" | "purchase" | "expense" | "party" | "payment") => void; onTab: (t: string) => void }) {
  const t = useBizTotals();
  const { colors } = useTheme();
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
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 160 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, gap: 10 }}>
          <Metric label="Today's Sales" value={inr(t.todaySales)} accent="#0C831F" />
          <Metric label="Today's Purchases" value={inr(t.todayPurchases)} accent="#1573FF" />
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <Metric label="Today's Profit" value={inr(t.todayProfit)} accent={t.todayProfit >= 0 ? "#0C831F" : "#E23744"} />
          <Metric label="Today's Expenses" value={inr(t.todayExpenses)} accent="#E8830C" />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={() => onTab("khata")} style={{ flex: 1, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ArrowDownRight size={12} color="#0C831F" />
            <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: "#0C831F" }}>YOU WILL GET</Text>
          </View>
          <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 20, color: colors.ink }}>{inr(t.receivable)}</Text>
          <Text style={{ fontFamily: F.semi, fontSize: 10.5, color: colors.ink3 }}>From customers</Text>
        </Pressable>
        <Pressable onPress={() => onTab("khata")} style={{ flex: 1, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ArrowUpRight size={12} color="#E8830C" />
            <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: "#E8830C" }}>YOU WILL GIVE</Text>
          </View>
          <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 20, color: colors.ink }}>{inr(t.payable)}</Text>
          <Text style={{ fontFamily: F.semi, fontSize: 10.5, color: colors.ink3 }}>To suppliers</Text>
        </Pressable>
      </View>

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <SectionHead title="Cash • Bank • UPI" sub="Live balances from your transactions" />
        <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
          {[["Cash", t.cashBalance, Banknote, "#0C831F"], ["Bank", t.bankBalance, Landmark, "#1573FF"], ["UPI", t.upiBalance, Smartphone, "#7C5CFF"]].map(([l, v, Icon, c]) => {
            const I = Icon as typeof Banknote;
            return (
              <View key={l as string} style={{ flex: 1, borderRadius: 12, backgroundColor: colors.card2, padding: 12, alignItems: "center" }}>
                <I size={16} color={c as string} />
                <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>{inr(v as number)}</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: colors.ink3 }}>{l as string}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {(lowStock.length > 0 || outStock.length > 0) && (
        <View style={{ borderRadius: 16, backgroundColor: "rgba(232,131,12,.1)", padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Package size={15} color="#E8830C" />
            <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#E8830C" }}>{lowStock.length + outStock.length} products need restock</Text>
          </View>
          <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 11.5, color: colors.ink2 }}>{outStock.length} out of stock • {lowStock.length} running low. Manage from Catalog.</Text>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 8 }}>
        {[["Sale", "sale", ShoppingCart, "#0C831F"], ["Purchase", "purchase", Truck, "#1573FF"], ["Expense", "expense", Receipt, "#E8830C"], ["Payment", "payment", Wallet, "#7C5CFF"]].map(([l, k, Icon, c]) => {
          const I = Icon as typeof ShoppingCart;
          return (
            <Pressable key={l as string} onPress={() => onQuick(k as never)} style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: "center" }}>
              <I size={18} color={c as string} />
              <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 11, color: colors.ink }}>{l as string}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <SectionHead title="Recent activity" sub="Latest sales, purchases & expenses" />
        <View style={{ marginTop: 10, gap: 8 }}>
          {recent.length === 0 && (
            <View style={{ borderRadius: 12, backgroundColor: colors.card2, padding: 16, alignItems: "center" }}>
              <Text style={{ fontFamily: F.semi, fontSize: 12, color: colors.ink3 }}>No transactions yet — tap + to record your first sale.</Text>
            </View>
          )}
          {recent.map((r, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: r.color }}>
                <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#fff" }}>{r.kind[0]}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{r.kind} • {r.label}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{fmtDate(r.ts)}{r.cancelled ? " • cancelled" : ""}</Text>
              </View>
              <Text style={{ fontFamily: F.extra, fontSize: 13, color: r.cancelled ? colors.ink3 : colors.ink, textDecorationLine: r.cancelled ? "line-through" : "none" }}>{inr(r.amount)}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ flex: 1, fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1, color: colors.ink3 }}>{label.toUpperCase()}</Text>
        <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: accent }} />
      </View>
      <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 19, color: colors.ink }}>{value}</Text>
    </View>
  );
}

/* ══════════════ KHATA ══════════════ */
function KhataTab({ onPayment, onParty }: { onPayment: () => void; onParty: () => void }) {
  const [type, setType] = useState<PartyType>("customer");
  const [q, setQ] = useState("");
  const parties = useBiz((s) => s.parties);
  const ledger = useBiz((s) => s.ledger);
  const [openParty, setOpenParty] = useState<string | null>(null);
  const { colors, name } = useTheme();

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
  const dark = name === "dark";

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 160 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#0C831F", padding: 14 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: "rgba(255,255,255,.7)" }}>YOU WILL GET</Text>
            <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 20, color: "#fff" }}>{inr(type === "customer" ? totalGet : 0)}</Text>
          </View>
          <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#E8830C", padding: 14 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: "rgba(255,255,255,.7)" }}>YOU WILL GIVE</Text>
            <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 20, color: "#fff" }}>{inr(type === "supplier" ? totalGive : 0)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
          <Pressable onPress={() => setType("customer")} style={{ flex: 1, borderRadius: 13, paddingVertical: 10, alignItems: "center", backgroundColor: type === "customer" ? (dark ? "#fff" : "#000") : colors.card, borderWidth: type === "customer" ? 0 : 1, borderColor: colors.line }}>
            <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: type === "customer" ? (dark ? "#000" : "#fff") : colors.ink2 }}>Customers</Text>
          </Pressable>
          <Pressable onPress={() => setType("supplier")} style={{ flex: 1, borderRadius: 13, paddingVertical: 10, alignItems: "center", backgroundColor: type === "supplier" ? (dark ? "#fff" : "#000") : colors.card, borderWidth: type === "supplier" ? 0 : 1, borderColor: colors.line }}>
            <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: type === "supplier" ? (dark ? "#000" : "#fff") : colors.ink2 }}>Suppliers</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Search size={15} color={colors.ink3} />
          <TextInput value={q} onChangeText={setQ} placeholder={`Search ${type}s…`} placeholderTextColor={colors.ink3} style={{ flex: 1, fontFamily: F.semi, fontSize: 13, color: colors.ink, paddingVertical: 8 }} />
        </View>

        <View style={{ marginTop: 12, gap: 8 }}>
          {list.map(({ p, bal }) => (
            <Pressable key={p.id} onPress={() => { setOpenParty(p.id); blip(560); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
              <View style={{ height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.chip }}>
                <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>{p.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{p.name}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{p.phone || "No phone"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: bal > 0 ? (type === "customer" ? "#0C831F" : "#E8830C") : colors.ink3 }}>{inr(Math.abs(bal))}</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: colors.ink3 }}>{bal === 0 ? "Settled" : type === "customer" ? "to get" : "to give"}</Text>
              </View>
            </Pressable>
          ))}
          {list.length === 0 && (
            <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 32, alignItems: "center" }}>
              <Text style={{ fontSize: 40 }}>{type === "customer" ? "🧑‍🤝‍🧑" : "🚚"}</Text>
              <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 14, color: colors.ink }}>No {type}s yet</Text>
              <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12, color: colors.ink3 }}>Add your first {type} to start tracking khata.</Text>
            </View>
          )}
        </View>

        <Pressable onPress={onParty} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: colors.line, padding: 16 }}>
          <View style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(12,131,31,.12)" }}>
            <Plus size={18} strokeWidth={3} color="#0C831F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Add {type}</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>Name, phone & opening balance</Text>
          </View>
        </Pressable>
      </ScrollView>

      {openP && <PartyLedgerSheet partyId={openP.id} onClose={() => setOpenParty(null)} onPay={onPayment} />}
    </View>
  );
}

function PartyLedgerSheet({ partyId, onClose, onPay }: { partyId: string; onClose: () => void; onPay: () => void }) {
  const party = useBiz((s) => s.parties.find((p) => p.id === partyId));
  const entries = useBiz((s) => s.ledger.filter((l) => l.partyId === partyId).sort((a, b) => b.date - a.date));
  const bal = entries.reduce((a, l) => a + l.amount, 0);
  const [note, setNote] = useState("");
  const [amt, setAmt] = useState("");
  const quickKhata = useBiz((s) => s.quickKhata);
  const { colors } = useTheme();
  if (!party) return null;
  const isCustomer = party.type === "customer";

  const labelFor = (t: LedgerEntry["type"]) => ({
    credit: "You Gave (credit)", payment_received: "You Got", payment_given: "You Gave", adjustment: "Adjustment",
    opening: "Opening balance", sale: "Sale on credit", sale_return: "Sale return", purchase: "Purchase on credit", purchase_return: "Purchase return",
  }[t]);

  const share = (via: "whatsapp" | "sms") => {
    const msg = encodeURIComponent(`Namaste ${party.name}, aapka balance ${inr(Math.abs(bal))} ${bal > 0 ? "due hai" : "clear hai"}. — One Stop Bazar`);
    if (via === "whatsapp") Linking.openURL(`https://wa.me/?text=${msg}`).catch(() => Alert.alert("Couldn't open WhatsApp"));
    blip(700);
  };

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 58, backgroundColor: "rgba(0,0,0,.5)", justifyContent: "flex-end" }}>
      <Pressable onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <Animated.View entering={SlideInDown.springify().damping(30)} style={{ borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.app, maxHeight: "92%", overflow: "hidden" }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 }}>
          <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 3, backgroundColor: colors.line }} />
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
              <View style={{ height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.chip }}>
                <Text style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{party.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{party.name}</Text>
                <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>{party.phone}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.chip }}>
              <X size={16} color={colors.ink} />
            </Pressable>
          </View>

          <View style={{ marginTop: 12, borderRadius: 16, padding: 16, alignItems: "center", backgroundColor: bal > 0 ? (isCustomer ? "#0C831F" : "#E8830C") : "#7E7A8E" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 11, letterSpacing: 1.2, color: "rgba(255,255,255,.75)" }}>{bal === 0 ? "SETTLED" : isCustomer ? "CUSTOMER WILL PAY YOU" : "YOU WILL PAY SUPPLIER"}</Text>
            <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 28, color: "#fff" }}>{inr(Math.abs(bal))}</Text>
          </View>

          <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
            {party.phone ? (
              <>
                <Pressable onPress={() => Linking.openURL(`tel:${party.phone}`).catch(() => Alert.alert("Couldn't place call"))} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: colors.chip, paddingVertical: 10 }}>
                  <Phone size={14} color={colors.ink} />
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>Call</Text>
                </Pressable>
                <Pressable onPress={() => share("whatsapp")} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: colors.chip, paddingVertical: 10 }}>
                  <MessageCircle size={14} color={colors.ink} />
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>Remind</Text>
                </Pressable>
              </>
            ) : null}
            <Pressable onPress={onPay} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: "#7C5CFF", paddingVertical: 10 }}>
              <Wallet size={14} color="#fff" />
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#fff" }}>Payment</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 11, letterSpacing: 1.2, color: colors.ink3 }}>QUICK KHATA ENTRY</Text>
            <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
              <TextInput keyboardType="numeric" value={amt} onChangeText={(v) => setAmt(v.replace(/\D/g, ""))} placeholder="Amount ₹" placeholderTextColor={colors.ink3} style={{ flex: 1, minWidth: 0, borderRadius: 11, backgroundColor: colors.card2, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.bold, fontSize: 13, color: colors.ink }} />
              <TextInput value={note} onChangeText={setNote} placeholder="Note (optional)" placeholderTextColor={colors.ink3} style={{ flex: 1, minWidth: 0, borderRadius: 11, backgroundColor: colors.card2, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.semi, fontSize: 12.5, color: colors.ink }} />
            </View>
            <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => { if (!amt) return; quickKhata(partyId, "gave", +amt, note || undefined); setAmt(""); setNote(""); blip(760); }} style={{ flex: 1, borderRadius: 11, backgroundColor: "rgba(226,55,68,.1)", paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#E23744" }}>You Gave</Text>
              </Pressable>
              <Pressable onPress={() => { if (!amt) return; quickKhata(partyId, "got", +amt, note || undefined); setAmt(""); setNote(""); blip(880); }} style={{ flex: 1, borderRadius: 11, backgroundColor: "rgba(12,131,31,.1)", paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#0C831F" }}>You Got</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <SectionHead title="Transaction history" sub={`${entries.length} entries`} />
          </View>
          <View style={{ marginTop: 10, gap: 8 }}>
            {entries.map((e) => (
              <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
                <View style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: e.amount > 0 ? "#E8830C" : "#0C831F" }}>
                  {e.amount > 0 ? <ArrowUpRight size={15} color="#fff" /> : <ArrowDownRight size={15} color="#fff" />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{labelFor(e.type)}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{fmtDate(e.date)}{e.note ? ` • ${e.note}` : ""}{e.refCode ? ` • ${e.refCode}` : ""}</Text>
                </View>
                <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{inr(Math.abs(e.amount))}</Text>
              </View>
            ))}
            {entries.length === 0 && (
              <View style={{ borderRadius: 12, backgroundColor: colors.card2, padding: 16, alignItems: "center" }}>
                <Text style={{ fontFamily: F.semi, fontSize: 12, color: colors.ink3 }}>No transactions recorded yet.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

/* ══════════════ SALES ══════════════ */
function SalesTab({ onNew }: { onNew: () => void }) {
  const sales = useBiz((s) => s.sales);
  const cancelSale = useBiz((s) => s.cancelSale);
  const { colors } = useTheme();
  const total = sales.filter((s) => s.status === "completed").reduce((a, s) => a + s.total, 0);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 160 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1, color: colors.ink3 }}>TOTAL SALES</Text>
          <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{inr(total)}</Text>
        </View>
        <View style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1, color: colors.ink3 }}>BILLS</Text>
          <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{sales.filter((s) => s.status === "completed").length}</Text>
        </View>
        <View style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1, color: colors.ink3 }}>CREDIT OUT</Text>
          <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{inr(sales.reduce((a, s) => a + Math.max(0, s.total - s.amountPaid), 0))}</Text>
        </View>
      </View>
      <Pressable onPress={onNew} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: "#0C831F", padding: 14, elevation: 4, shadowColor: "#0C831F", shadowOpacity: 0.35, shadowRadius: 15, shadowOffset: { width: 0, height: 12 } }}>
        <View style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(255,255,255,.16)" }}>
          <ShoppingCart size={19} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: "#fff" }}>Create sale / bill</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,.75)" }}>Counter sale from your products</Text>
        </View>
        <Plus size={18} strokeWidth={3} color="#fff" />
      </Pressable>
      <View style={{ marginTop: 16 }}>
        <SectionHead title="Invoices" sub={`${sales.length} total`} />
      </View>
      <View style={{ marginTop: 10, gap: 8 }}>
        {sales.map((s) => (
          <View key={s.id} style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14, opacity: s.status !== "completed" ? 0.6 : 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(12,131,31,.12)" }}>
                <Receipt size={17} color="#0C831F" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{s.code} • {s.customerName}</Text>
                <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{s.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>{inr(s.total)}</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: colors.ink3 }}>{s.paymentMode.toUpperCase()}</Text>
              </View>
            </View>
            <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 }}>
              <Text style={{ fontFamily: F.semi, fontSize: 10.5, color: colors.ink3 }}>{fmtDate(s.createdAt)} {s.status !== "completed" ? `• ${s.status}` : ""}</Text>
              {s.status === "completed" && (
                <Pressable onPress={() => { cancelSale(s.id); blip(420); }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#E23744" }}>Cancel</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
        {sales.length === 0 && (
          <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 32, alignItems: "center" }}>
            <Text style={{ fontSize: 40 }}>🧾</Text>
            <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 14, color: colors.ink }}>No sales yet</Text>
            <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12, color: colors.ink3 }}>Record your first counter sale.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* ══════════════ PURCHASES ══════════════ */
function PurchasesTab({ onNew }: { onNew: () => void }) {
  const purchases = useBiz((s) => s.purchases);
  const cancelPurchase = useBiz((s) => s.cancelPurchase);
  const { colors } = useTheme();
  const total = purchases.filter((p) => p.status === "completed").reduce((a, p) => a + p.total, 0);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 160 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1, color: colors.ink3 }}>TOTAL PURCH.</Text>
          <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{inr(total)}</Text>
        </View>
        <View style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1, color: colors.ink3 }}>BILLS</Text>
          <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{purchases.filter((p) => p.status === "completed").length}</Text>
        </View>
        <View style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: "center" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1, color: colors.ink3 }}>PAYABLE</Text>
          <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{inr(purchases.reduce((a, p) => a + Math.max(0, p.total - p.amountPaid), 0))}</Text>
        </View>
      </View>
      <Pressable onPress={onNew} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: "#1573FF", padding: 14, elevation: 4, shadowColor: "#1573FF", shadowOpacity: 0.35, shadowRadius: 15, shadowOffset: { width: 0, height: 12 } }}>
        <View style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(255,255,255,.16)" }}>
          <Truck size={19} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: "#fff" }}>Record purchase</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,.75)" }}>Add stock from a supplier</Text>
        </View>
        <Plus size={18} strokeWidth={3} color="#fff" />
      </Pressable>
      <View style={{ marginTop: 16 }}>
        <SectionHead title="Purchase bills" sub={`${purchases.length} total`} />
      </View>
      <View style={{ marginTop: 10, gap: 8 }}>
        {purchases.map((p) => (
          <View key={p.id} style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14, opacity: p.status !== "completed" ? 0.6 : 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(21,115,255,.12)" }}>
                <Building2 size={17} color="#1573FF" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{p.code} • {p.supplierName}</Text>
                <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{p.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>{inr(p.total)}</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: colors.ink3 }}>{p.paymentMode.toUpperCase()}</Text>
              </View>
            </View>
            <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 }}>
              <Text style={{ fontFamily: F.semi, fontSize: 10.5, color: colors.ink3 }}>{fmtDate(p.createdAt)} {p.status !== "completed" ? `• ${p.status}` : ""}</Text>
              {p.status === "completed" && (
                <Pressable onPress={() => { cancelPurchase(p.id); blip(420); }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#E23744" }}>Cancel</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
        {purchases.length === 0 && (
          <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 32, alignItems: "center" }}>
            <Text style={{ fontSize: 40 }}>📦</Text>
            <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 14, color: colors.ink }}>No purchases yet</Text>
            <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12, color: colors.ink3 }}>Record stock coming from a supplier.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* ══════════════ EXPENSES ══════════════ */
function ExpensesTab({ onNew }: { onNew: () => void }) {
  const expenses = useBiz((s) => s.expenses);
  const removeExpense = useBiz((s) => s.removeExpense);
  const { colors } = useTheme();
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [expenses]);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 160 }}>
      <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: colors.ink3 }}>TOTAL EXPENSES</Text>
        <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 24, color: "#E8830C" }}>{inr(total)}</Text>
        {byCat.length > 0 && (
          <View style={{ marginTop: 10, gap: 6 }}>
            {byCat.map(([cat, amt]) => (
              <View key={cat} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text numberOfLines={1} style={{ width: 80, fontFamily: F.bold, fontSize: 11, color: colors.ink2 }}>{cat}</Text>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.chip, overflow: "hidden" }}>
                  <View style={{ height: "100%", borderRadius: 3, backgroundColor: "#E8830C", width: `${Math.min(100, (amt / total) * 100)}%` }} />
                </View>
                <Text style={{ width: 64, textAlign: "right", fontFamily: F.extra, fontSize: 11, color: colors.ink }}>{inr(amt)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Pressable onPress={onNew} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: "#E8830C", padding: 14, elevation: 4, shadowColor: "#E8830C", shadowOpacity: 0.35, shadowRadius: 15, shadowOffset: { width: 0, height: 12 } }}>
        <View style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(255,255,255,.16)" }}>
          <Receipt size={19} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: "#fff" }}>Add expense</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,.75)" }}>Rent, electricity, salary…</Text>
        </View>
        <Plus size={18} strokeWidth={3} color="#fff" />
      </Pressable>
      <View style={{ marginTop: 16 }}>
        <SectionHead title="All expenses" sub={`${expenses.length} entries`} />
      </View>
      <View style={{ marginTop: 10, gap: 8 }}>
        {expenses.map((e) => (
          <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
            <View style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(232,131,12,.12)" }}>
              <Receipt size={16} color="#E8830C" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{e.category}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>{fmtDate(e.date)} • {e.mode.toUpperCase()}{e.vendor ? ` • ${e.vendor}` : ""}</Text>
            </View>
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{inr(e.amount)}</Text>
            <Pressable onPress={() => removeExpense(e.id)} style={{ height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: colors.chip }}>
              <X size={14} color="#E23744" />
            </Pressable>
          </View>
        ))}
        {expenses.length === 0 && (
          <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 32, alignItems: "center" }}>
            <Text style={{ fontSize: 40 }}>🧾</Text>
            <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 14, color: colors.ink }}>No expenses logged</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* ══════════════ REPORTS ══════════════ */
function ReportsTab() {
  const t = useBizTotals();
  const sales = useBiz((s) => s.sales.filter((s) => s.status === "completed"));
  const { colors } = useTheme();
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
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 160 }}>
      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <SectionHead title="This month" sub="Profit = Sales − Purchases − Expenses" />
        <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1, borderRadius: 12, backgroundColor: colors.card2, padding: 10, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 9, letterSpacing: 1, color: colors.ink3 }}>SALES</Text>
            <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>{inr(t.monthSales)}</Text>
          </View>
          <View style={{ flex: 1, borderRadius: 12, backgroundColor: colors.card2, padding: 10, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 9, letterSpacing: 1, color: colors.ink3 }}>COSTS</Text>
            <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>{inr(t.monthPurchases + t.monthExpenses)}</Text>
          </View>
          <View style={{ flex: 1, borderRadius: 12, backgroundColor: colors.card2, padding: 10, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 9, letterSpacing: 1, color: colors.ink3 }}>PROFIT</Text>
            <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 13.5, color: t.monthProfit >= 0 ? "#0C831F" : "#E23744" }}>{inr(t.monthProfit)}</Text>
          </View>
        </View>
      </View>

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>Sales — last 7 days</Text>
        <AreaGraph values={days.map((d) => d.v)} color="#0C831F" height={90} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {days.map((d, i) => (
            <Text key={i} style={{ fontFamily: F.extra, fontSize: 10, color: colors.ink3 }}>{d.d}</Text>
          ))}
        </View>
      </View>

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <SectionHead title="Top products" sub="By revenue" />
        <View style={{ marginTop: 10, gap: 8 }}>
          {topProducts.length === 0 && <Text style={{ textAlign: "center", fontFamily: F.semi, fontSize: 12, color: colors.ink3 }}>No sales data yet.</Text>}
          {topProducts.map(([name, v], i) => (
            <View key={name} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ width: 20, fontFamily: F.extra, fontSize: 11, color: colors.ink3 }}>{i + 1}</Text>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{name}</Text>
              <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>{v.qty} sold</Text>
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{inr(v.revenue)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <SectionHead title="Receivables & payables" />
        <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1, borderRadius: 12, backgroundColor: "rgba(12,131,31,.1)", padding: 12, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1, color: "#0C831F" }}>TO RECEIVE</Text>
            <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{inr(t.receivable)}</Text>
          </View>
          <View style={{ flex: 1, borderRadius: 12, backgroundColor: "rgba(232,131,12,.1)", padding: 12, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1, color: "#E8830C" }}>TO PAY</Text>
            <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{inr(t.payable)}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/* ══════════════ SHEETS ══════════════ */
function SheetShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, backgroundColor: "rgba(0,0,0,.5)", justifyContent: "flex-end" }}>
      <Pressable onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <Animated.View entering={SlideInDown.springify().damping(30)} style={{ borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.app, maxHeight: "92%", overflow: "hidden" }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 }}>
          <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 3, backgroundColor: colors.line }} />
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4, color: colors.ink }}>{title}</Text>
            <Pressable onPress={onClose} style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.chip }}>
              <X size={17} color={colors.ink} />
            </Pressable>
          </View>
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function PartyPicker({ type, value, onChange }: { type: PartyType; value?: string; onChange: (id: string | undefined, name: string) => void }) {
  const parties = useBiz((s) => s.parties.filter((p) => p.type === type && !p.archived));
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const sel = parties.find((p) => p.id === value);
  return (
    <View>
      <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 13, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 12 }}>
        <Users size={15} color={colors.ink3} />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.semi, fontSize: 13, color: colors.ink }}>{sel?.name ?? (type === "customer" ? "Walk-in Customer" : "Cash purchase (no supplier)")}</Text>
        <ChevronRight size={15} color={colors.ink3} style={{ opacity: 0.4, transform: [{ rotate: open ? "90deg" : "0deg" }] }} />
      </Pressable>
      {open && (
        <Animated.View entering={FadeIn} style={{ overflow: "hidden" }}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 6, maxHeight: 160 }}>
            <View style={{ gap: 4 }}>
              <Pressable onPress={() => { onChange(undefined, type === "customer" ? "Walk-in Customer" : "Cash Purchase"); setOpen(false); }} style={{ borderRadius: 10, backgroundColor: colors.chip, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: colors.ink }}>None / Walk-in</Text>
              </Pressable>
              {parties.map((p) => (
                <Pressable key={p.id} onPress={() => { onChange(p.id, p.name); setOpen(false); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, backgroundColor: colors.chip, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 12, color: colors.ink }}>{p.name}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{p.phone}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

function ProductPicker({ onAdd }: { onAdd: (item: { productId?: string; name: string; qty: number; price: number }) => void }) {
  const catalog = useOSB((s) => s.catalog);
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const { colors } = useTheme();
  const filtered = catalog.filter((p) => !p.hidden && p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  return (
    <View style={{ borderRadius: 13, backgroundColor: colors.card2, padding: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Search size={14} color={colors.ink3} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search your products…" placeholderTextColor={colors.ink3} style={{ flex: 1, fontFamily: F.semi, fontSize: 12.5, color: colors.ink }} />
        <Pressable onPress={() => setCustom(!custom)}>
          <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#1573FF" }}>{custom ? "Catalog" : "Custom item"}</Text>
        </Pressable>
      </View>
      {custom ? (
        <View style={{ marginTop: 8, flexDirection: "row", gap: 6 }}>
          <TextInput value={name} onChangeText={setName} placeholder="Item name" placeholderTextColor={colors.ink3} style={{ flex: 1, minWidth: 0, borderRadius: 10, backgroundColor: colors.chip, paddingHorizontal: 12, paddingVertical: 8, fontFamily: F.semi, fontSize: 12, color: colors.ink }} />
          <TextInput keyboardType="numeric" value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ""))} placeholder="₹" placeholderTextColor={colors.ink3} style={{ width: 64, borderRadius: 10, backgroundColor: colors.chip, paddingHorizontal: 8, paddingVertical: 8, fontFamily: F.bold, fontSize: 12, color: colors.ink }} />
          <Pressable onPress={() => { if (!name || !price) return; onAdd({ name, qty: 1, price: +price }); setName(""); setPrice(""); blip(700); }} style={{ borderRadius: 10, backgroundColor: "#0C831F", paddingHorizontal: 12, alignItems: "center", justifyContent: "center" }}>
            <Plus size={15} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <View style={{ marginTop: 8, gap: 4 }}>
          {filtered.map((p) => (
            <Pressable key={p.id} onPress={() => { onAdd({ productId: p.id, name: p.name, qty: 1, price: p.price }); blip(700); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, backgroundColor: colors.chip, paddingHorizontal: 10, paddingVertical: 8 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.bold, fontSize: 12, color: colors.ink }}>{p.name}</Text>
              <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>{p.stock} in stock</Text>
              <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink }}>₹{p.price}</Text>
            </Pressable>
          ))}
          {q !== "" && filtered.length === 0 && <Text style={{ paddingVertical: 8, textAlign: "center", fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>No match — try “Custom item”.</Text>}
        </View>
      )}
    </View>
  );
}

function LineEditor({ items, setItems }: { items: { productId?: string; name: string; qty: number; price: number }[]; setItems: (v: { productId?: string; name: string; qty: number; price: number }[]) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 8, gap: 6 }}>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 11, backgroundColor: colors.card2, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.bold, fontSize: 12, color: colors.ink }}>{it.name}</Text>
          <Pressable onPress={() => setItems(items.map((x, xi) => (xi === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} style={{ height: 24, width: 24, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.chip }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>−</Text>
          </Pressable>
          <Text style={{ width: 20, textAlign: "center", fontFamily: F.extra, fontSize: 12, color: colors.ink }}>{it.qty}</Text>
          <Pressable onPress={() => setItems(items.map((x, xi) => (xi === i ? { ...x, qty: x.qty + 1 } : x)))} style={{ height: 24, width: 24, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.chip }}>
            <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>+</Text>
          </Pressable>
          <Text style={{ width: 56, textAlign: "right", fontFamily: F.extra, fontSize: 12, color: colors.ink }}>₹{it.qty * it.price}</Text>
          <Pressable onPress={() => setItems(items.filter((_, xi) => xi !== i))}>
            <X size={14} color="#E23744" />
          </Pressable>
        </View>
      ))}
      {items.length === 0 && <Text style={{ paddingVertical: 8, textAlign: "center", fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>No items added yet.</Text>}
    </View>
  );
}

function SaleSheet({ onClose }: { onClose: () => void }) {
  const createSale = useBiz((s) => s.createSale);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [items, setItems] = useState<{ productId?: string; name: string; qty: number; price: number }[]>([]);
  const [discount, setDiscount] = useState("0");
  const [mode, setMode] = useState<PaymentMode | "credit">("cash");
  const { colors } = useTheme();
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
      <View style={{ marginTop: 12, gap: 10 }}>
        <PartyPicker type="customer" value={customerId} onChange={(id, name) => { setCustomerId(id); setCustomerName(name); }} />
        <ProductPicker onAdd={(it) => setItems((prev) => {
          const ex = prev.find((x) => x.productId === it.productId && x.name === it.name);
          if (ex) return prev.map((x) => (x === ex ? { ...x, qty: x.qty + 1 } : x));
          return [...prev, it];
        })} />
        <LineEditor items={items} setItems={setItems} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 13, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 6 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: colors.ink2 }}>Discount ₹</Text>
          <TextInput keyboardType="numeric" value={discount} onChangeText={(v) => setDiscount(v.replace(/\D/g, ""))} style={{ flex: 1, textAlign: "right", fontFamily: F.bold, fontSize: 13, color: colors.ink, paddingVertical: 8 }} />
        </View>
        <View>
          <Text style={{ marginBottom: 6, fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: colors.ink3 }}>PAYMENT MODE</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[...MODES, { k: "credit" as const, t: "Credit", i: Wallet }].map((m) => (
              <Pressable key={m.k} onPress={() => setMode(m.k)} style={{ flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: "center", backgroundColor: mode === m.k ? "#0C831F" : colors.chip }}>
                <m.i size={15} color={mode === m.k ? "#fff" : colors.ink2} />
                <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 10.5, color: mode === m.k ? "#fff" : colors.ink2 }}>{m.t}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ borderRadius: 14, backgroundColor: "#0C831F", padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.semi, fontSize: 12, color: "rgba(255,255,255,.75)" }}>Subtotal</Text>
            <Text style={{ fontFamily: F.semi, fontSize: 12, color: "rgba(255,255,255,.75)" }}>{inr(subtotal)}</Text>
          </View>
          <View style={{ marginTop: 2, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: "#fff" }}>Total</Text>
            <Text style={{ fontFamily: F.extra, fontSize: 24, color: "#fff" }}>{inr(total)}</Text>
          </View>
        </View>
      </View>
      <Pressable onPress={save} disabled={items.length === 0} style={{ marginTop: 16, borderRadius: 14, backgroundColor: "#0C831F", paddingVertical: 16, alignItems: "center", opacity: items.length === 0 ? 0.4 : 1 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Save sale & update stock</Text>
      </Pressable>
    </SheetShell>
  );
}

function PurchaseSheet({ onClose }: { onClose: () => void }) {
  const createPurchase = useBiz((s) => s.createPurchase);
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
  const [supplierName, setSupplierName] = useState("Cash Purchase");
  const [items, setItems] = useState<{ productId?: string; name: string; qty: number; price: number }[]>([]);
  const [discount, setDiscount] = useState("0");
  const [mode, setMode] = useState<PaymentMode | "credit">("cash");
  const { colors } = useTheme();
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
      <View style={{ marginTop: 12, gap: 10 }}>
        <PartyPicker type="supplier" value={supplierId} onChange={(id, name) => { setSupplierId(id); setSupplierName(name); }} />
        <ProductPicker onAdd={(it) => setItems((prev) => {
          const ex = prev.find((x) => x.productId === it.productId && x.name === it.name);
          if (ex) return prev.map((x) => (x === ex ? { ...x, qty: x.qty + 1 } : x));
          return [...prev, it];
        })} />
        <LineEditor items={items} setItems={setItems} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 13, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 6 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: colors.ink2 }}>Discount ₹</Text>
          <TextInput keyboardType="numeric" value={discount} onChangeText={(v) => setDiscount(v.replace(/\D/g, ""))} style={{ flex: 1, textAlign: "right", fontFamily: F.bold, fontSize: 13, color: colors.ink, paddingVertical: 8 }} />
        </View>
        <View>
          <Text style={{ marginBottom: 6, fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: colors.ink3 }}>PAYMENT MODE</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[...MODES, { k: "credit" as const, t: "Credit", i: Wallet }].map((m) => (
              <Pressable key={m.k} onPress={() => setMode(m.k)} style={{ flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: "center", backgroundColor: mode === m.k ? "#1573FF" : colors.chip }}>
                <m.i size={15} color={mode === m.k ? "#fff" : colors.ink2} />
                <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 10.5, color: mode === m.k ? "#fff" : colors.ink2 }}>{m.t}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ borderRadius: 14, backgroundColor: "#1573FF", padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.semi, fontSize: 12, color: "rgba(255,255,255,.75)" }}>Subtotal</Text>
            <Text style={{ fontFamily: F.semi, fontSize: 12, color: "rgba(255,255,255,.75)" }}>{inr(subtotal)}</Text>
          </View>
          <View style={{ marginTop: 2, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: "#fff" }}>Total</Text>
            <Text style={{ fontFamily: F.extra, fontSize: 24, color: "#fff" }}>{inr(total)}</Text>
          </View>
        </View>
      </View>
      <Pressable onPress={save} disabled={items.length === 0} style={{ marginTop: 16, borderRadius: 14, backgroundColor: "#1573FF", paddingVertical: 16, alignItems: "center", opacity: items.length === 0 ? 0.4 : 1 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Save purchase & add stock</Text>
      </Pressable>
    </SheetShell>
  );
}

function ExpenseSheet({ onClose }: { onClose: () => void }) {
  const addExpense = useBiz((s) => s.addExpense);
  const [category, setCategory] = useState(EXPENSE_CATS[0]);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [vendor, setVendor] = useState("");
  const { colors } = useTheme();
  const save = () => {
    if (!amount) return;
    addExpense({ category, amount: +amount, mode, vendor: vendor || undefined, recurring: "none" });
    blip(920, 0.15);
    onClose();
  };
  return (
    <SheetShell title="Add Expense" onClose={onClose}>
      <View style={{ marginTop: 12, gap: 10 }}>
        <View>
          <Text style={{ marginBottom: 6, fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: colors.ink3 }}>CATEGORY</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {EXPENSE_CATS.map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: category === c ? "#E8830C" : colors.chip }}>
                <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: category === c ? "#fff" : colors.ink2 }}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ borderRadius: 13, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.2, color: colors.ink3 }}>AMOUNT ₹</Text>
          <TextInput keyboardType="numeric" autoFocus value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ""))} placeholder="0" placeholderTextColor={colors.ink3} style={{ fontFamily: F.extra, fontSize: 20, color: colors.ink, paddingVertical: 4 }} />
        </View>
        <View style={{ borderRadius: 13, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.2, color: colors.ink3 }}>VENDOR (OPTIONAL)</Text>
          <TextInput value={vendor} onChangeText={setVendor} placeholder="e.g. BESCOM" placeholderTextColor={colors.ink3} style={{ fontFamily: F.semi, fontSize: 13, color: colors.ink, paddingVertical: 4 }} />
        </View>
        <View>
          <Text style={{ marginBottom: 6, fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: colors.ink3 }}>PAID VIA</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {MODES.map((m) => (
              <Pressable key={m.k} onPress={() => setMode(m.k)} style={{ flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: "center", backgroundColor: mode === m.k ? "#E8830C" : colors.chip }}>
                <m.i size={15} color={mode === m.k ? "#fff" : colors.ink2} />
                <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 10.5, color: mode === m.k ? "#fff" : colors.ink2 }}>{m.t}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <Pressable onPress={save} disabled={!amount} style={{ marginTop: 16, borderRadius: 14, backgroundColor: "#E8830C", paddingVertical: 16, alignItems: "center", opacity: !amount ? 0.4 : 1 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Save expense</Text>
      </Pressable>
    </SheetShell>
  );
}

function PartySheet({ onClose }: { onClose: () => void }) {
  const addParty = useBiz((s) => s.addParty);
  const [type, setType] = useState<PartyType>("customer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [opening, setOpening] = useState("");
  const { colors } = useTheme();
  const save = () => {
    if (!name.trim()) return;
    addParty({ type, name, phone, openingBalance: opening ? +opening : 0 });
    blip(920, 0.15);
    onClose();
  };
  return (
    <SheetShell title="Add Party" onClose={onClose}>
      <View style={{ marginTop: 12, gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={() => setType("customer")} style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: type === "customer" ? "#0C831F" : colors.card, borderWidth: type === "customer" ? 0 : 1, borderColor: colors.line }}>
            <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: type === "customer" ? "#fff" : colors.ink2 }}>Customer</Text>
          </Pressable>
          <Pressable onPress={() => setType("supplier")} style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: type === "supplier" ? "#E8830C" : colors.card, borderWidth: type === "supplier" ? 0 : 1, borderColor: colors.line }}>
            <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: type === "supplier" ? "#fff" : colors.ink2 }}>Supplier</Text>
          </Pressable>
        </View>
        <View style={{ borderRadius: 13, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.2, color: colors.ink3 }}>NAME *</Text>
          <TextInput autoFocus value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.ink3} style={{ fontFamily: F.semi, fontSize: 13.5, color: colors.ink, paddingVertical: 4 }} />
        </View>
        <View style={{ borderRadius: 13, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.2, color: colors.ink3 }}>PHONE</Text>
          <TextInput value={phone} onChangeText={setPhone} placeholder="+91 98xxx xxxxx" placeholderTextColor={colors.ink3} style={{ fontFamily: F.semi, fontSize: 13.5, color: colors.ink, paddingVertical: 4 }} />
        </View>
        <View style={{ borderRadius: 13, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.2, color: colors.ink3 }}>OPENING BALANCE ₹ (OPTIONAL)</Text>
          <TextInput keyboardType="numeric" value={opening} onChangeText={(v) => setOpening(v.replace(/\D/g, ""))} placeholder="0" placeholderTextColor={colors.ink3} style={{ fontFamily: F.semi, fontSize: 13.5, color: colors.ink, paddingVertical: 4 }} />
        </View>
      </View>
      <Pressable onPress={save} disabled={!name.trim()} style={{ marginTop: 16, borderRadius: 14, backgroundColor: "#0C831F", paddingVertical: 16, alignItems: "center", opacity: !name.trim() ? 0.4 : 1 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Save {type}</Text>
      </Pressable>
    </SheetShell>
  );
}

function PaymentSheet({ onClose }: { onClose: () => void }) {
  const recordPaymentReceived = useBiz((s) => s.recordPaymentReceived);
  const recordPaymentGiven = useBiz((s) => s.recordPaymentGiven);
  const [dir, setDir] = useState<"in" | "out">("in");
  const [partyId, setPartyId] = useState<string | undefined>(undefined);
  const [partyName, setPartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const { colors } = useTheme();
  void partyName;
  const save = () => {
    if (!partyId || !amount) return;
    if (dir === "in") recordPaymentReceived(partyId, +amount, mode);
    else recordPaymentGiven(partyId, +amount, mode);
    blip(920, 0.15);
    onClose();
  };
  return (
    <SheetShell title="Record Payment" onClose={onClose}>
      <View style={{ marginTop: 12, gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={() => { setDir("in"); setPartyId(undefined); }} style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: dir === "in" ? "#0C831F" : colors.card, borderWidth: dir === "in" ? 0 : 1, borderColor: colors.line }}>
            <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: dir === "in" ? "#fff" : colors.ink2 }}>Received (from customer)</Text>
          </Pressable>
          <Pressable onPress={() => { setDir("out"); setPartyId(undefined); }} style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: dir === "out" ? "#E8830C" : colors.card, borderWidth: dir === "out" ? 0 : 1, borderColor: colors.line }}>
            <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: dir === "out" ? "#fff" : colors.ink2 }}>Given (to supplier)</Text>
          </Pressable>
        </View>
        <PartyPicker type={dir === "in" ? "customer" : "supplier"} value={partyId} onChange={(id, name) => { setPartyId(id); setPartyName(name); }} />
        <View style={{ borderRadius: 13, backgroundColor: colors.card2, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.2, color: colors.ink3 }}>AMOUNT ₹</Text>
          <TextInput keyboardType="numeric" autoFocus value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ""))} placeholder="0" placeholderTextColor={colors.ink3} style={{ fontFamily: F.extra, fontSize: 20, color: colors.ink, paddingVertical: 4 }} />
        </View>
        <View>
          <Text style={{ marginBottom: 6, fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2, color: colors.ink3 }}>MODE</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {MODES.map((m) => (
              <Pressable key={m.k} onPress={() => setMode(m.k)} style={{ flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: "center", backgroundColor: mode === m.k ? "#7C5CFF" : colors.chip }}>
                <m.i size={15} color={mode === m.k ? "#fff" : colors.ink2} />
                <Text style={{ marginTop: 2, fontFamily: F.extra, fontSize: 10.5, color: mode === m.k ? "#fff" : colors.ink2 }}>{m.t}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <Pressable onPress={save} disabled={!partyId || !amount} style={{ marginTop: 16, borderRadius: 14, backgroundColor: "#7C5CFF", paddingVertical: 16, alignItems: "center", opacity: !partyId || !amount ? 0.4 : 1 }}>
        <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Save payment</Text>
      </Pressable>
    </SheetShell>
  );
}
