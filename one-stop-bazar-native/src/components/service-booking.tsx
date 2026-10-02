/**
 * Service booking — Urban Company style slot picker + payment choice.
 * Flow: Book tap (bookingPid) → date strip + time slots/ASAP → summary →
 * Pay now / Pay after → LiveOrder(kind=service) → orderSuccess sheet.
 * Offline-first: slots derive locally from hours + duration + capacity.
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { inr } from "@/lib/data";
import { blip, useMarketplace, useOSB, type LiveOrder } from "@/lib/osb-store";
import { durationMins, firstFreeWindow, generateSlotDays, slotLabel } from "@/lib/slots";
import { apiPostOrder } from "@/lib/api";
import { useSheetBackCloser } from "@/lib/back";
import { useTheme } from "@/theme/ThemeProvider";
import { F, Img } from "./ui";
import { CUSTOMER } from "@/lib/commerce";

export function BookingSheet() {
  const bookingPid = useOSB((s) => s.bookingPid);
  const set = useOSB((s) => s.set);
  const onClose = () => set({ bookingPid: null });
  useSheetBackCloser(!!bookingPid, onClose);
  if (!bookingPid) return null;
  return <BookingBody key={bookingPid} pid={bookingPid} onClose={onClose} />;
}

function BookingBody({ pid, onClose }: { pid: string; onClose: () => void }) {
  const { stores, products } = useMarketplace();
  const set = useOSB((s) => s.set);
  const placeLiveOrder = useOSB((s) => s.placeLiveOrder);
  const orders = useOSB((s) => s.orders);
  const seller = useOSB((s) => s.seller);
  const userName = useOSB((s) => s.userName);
  const phone = useOSB((s) => s.phone);
  const address = useOSB((s) => s.address);
  const { colors } = useTheme();
  const p = products.find((x) => x.id === pid);
  const store = stores.find((x) => x.id === p?.storeId);
  const [dayIdx, setDayIdx] = useState(0);
  const [slotAt, setSlotAt] = useState<number | "asap">("asap");
  const [pay, setPay] = useState<"now" | "after">("after");
  const [placing, setPlacing] = useState(false);
  const days = useMemo(() => {
    if (!p || !store) return [];
    const own = store.id === (seller.storeId || "mine");
    const bookedPerDay: Record<string, number> = {};
    for (const o of orders) {
      if (o.kind !== "service" || o.storeId !== store.id || !o.scheduledAt) continue;
      const d = new Date(o.scheduledAt);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      bookedPerDay[k] = (bookedPerDay[k] ?? 0) + 1;
    }
    return generateSlotDays({
      openTime: own ? seller.openTime : "09:00",
      closeTime: own ? seller.closeTime : "21:00",
      workDays: own ? seller.workDays : [0, 1, 2, 3, 4, 5, 6],
      advanceDays: own ? seller.advanceDays : 7,
      durationMins: durationMins(p.eta, 30),
      capacityPerDay: Math.max(1, p.stock || 8),
      bookedPerDay,
    });
  }, [p, store, orders, seller]);
  if (!p || !store) return null;
  const day = days[Math.min(dayIdx, Math.max(0, days.length - 1))];
  const asap = firstFreeWindow(days);
  const dur = durationMins(p.eta, 30);
  const visitFee = store.deliveryFee || 0;
  const total = p.price + visitFee;
  const effSlotAt = slotAt === "asap" ? asap?.window.at ?? null : slotAt;
  const effDay = slotAt === "asap" ? asap?.day ?? day : day;
  const label = effSlotAt && effDay ? slotLabel(effDay.label, (slotAt === "asap" ? asap?.window.label : effDay.windows.find((w) => w.at === effSlotAt)?.label) ?? "", slotAt === "asap") : null;

  const confirm = async () => {
    if (!label || effSlotAt == null || placing) return;
    setPlacing(true);
    blip(880, 0.12);
    const localId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "bk-" + Date.now().toString(36);
    const live: LiveOrder = {
      id: localId,
      code: "#OSB-" + Math.floor(1000 + Math.random() * 9000),
      storeId: store.id,
      storeName: store.name,
      customer: userName || CUSTOMER.name,
      phone: phone || CUSTOMER.phone,
      address,
      items: [{ productId: p.id, name: p.name, emoji: p.emoji, image: p.image, price: p.price, qty: 1, storeId: store.id, storeName: store.name, unit: p.unit, tint: p.tint }],
      subtotal: p.price,
      fee: visitFee,
      discount: 0,
      total,
      payment: pay === "now" ? "UPI" : "PayAfter",
      status: "new",
      etaMins: dur,
      otp: String(Math.floor(1000 + Math.random() * 9000)),
      createdAt: Date.now(),
      distanceKm: 1.0,
      kind: "service",
      scheduledAt: effSlotAt,
      slotLabel: label,
      payStatus: pay === "now" ? "paid" : "pending",
      couponCode: null,
      walletUsed: 0,
      extraDiscount: 0,
    };
    try {
      const j = await apiPostOrder({
        code: live.code, storeId: live.storeId, storeName: live.storeName,
        customerName: live.customer, customerPhone: live.phone, address: live.address,
        items: live.items, subtotal: live.subtotal, deliveryFee: live.fee,
        discount: 0, total: live.total, payment: live.payment,
        kind: "service", scheduledAt: effSlotAt ? new Date(effSlotAt).toISOString() : null,
        slotLabel: label, payStatus: live.payStatus,
        status: "new", etaMins: dur, distanceKm: live.distanceKm, otp: live.otp,
      });
      if (j?.id) live.id = j.id;
      if (j?.code) live.code = j.code;
    } catch { /* local fallback */ }
    placeLiveOrder(live);
    useOSB.setState({ orderSuccess: live, bookingPid: null });
    blip(990, 0.18);
  };

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 60 }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.5)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
      <Animated.View entering={SlideInDown.springify().stiffness(250).damping(30)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "92%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.app, overflow: "hidden" }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, paddingTop: 12 }}>
          <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 999, backgroundColor: "rgba(0,0,0,.15)" }} />
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ height: 52, width: 52, borderRadius: 14, overflow: "hidden", backgroundColor: "#f2f2f2" }}>
              <Img src={p.image} style={{ width: "100%", height: "100%" }} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{p.name}</Text>
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: colors.ink2 }}>
                ⏱ {dur} min service • ★ {p.rating} • {store.name}
              </Text>
              <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>{inr(p.price)}{p.mrp ? <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3, textDecorationLine: "line-through" }}> {inr(p.mrp)}</Text> : null}</Text>
            </View>
          </View>

          <Text style={{ marginTop: 16, fontFamily: F.extra, fontSize: 12, letterSpacing: 1.2, color: colors.ink3 }}>PICK A SLOT</Text>
          {asap && (
            <Pressable onPress={() => { setSlotAt("asap"); blip(700); }} style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: slotAt === "asap" ? 2 : 1, borderColor: slotAt === "asap" ? "#7C5CFF" : colors.line, backgroundColor: slotAt === "asap" ? "rgba(124,92,255,.08)" : colors.card, padding: 12 }}>
              <Text style={{ fontSize: 16 }}>⚡</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>ASAP — first available</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{asap.day.label}, {asap.window.label}</Text>
              </View>
              {slotAt === "asap" && <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#7C5CFF" }}>✓</Text>}
            </Pressable>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginTop: 8, gap: 8 }}>
            {days.map((d, i) => (
              <Pressable key={d.key} onPress={() => { setDayIdx(i); const f = d.windows.find((w) => !w.full); setSlotAt(f ? f.at : "asap"); blip(600); }} style={{ borderRadius: 12, borderWidth: dayIdx === i && slotAt !== "asap" ? 2 : 1, borderColor: dayIdx === i && slotAt !== "asap" ? "#7C5CFF" : colors.line, backgroundColor: d.full ? colors.chip : colors.card, paddingHorizontal: 14, paddingVertical: 10, alignItems: "center", opacity: d.full ? 0.55 : 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{d.label}</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 10, color: d.full ? colors.ink3 : "#0C831F" }}>{d.full ? "Full" : `${d.windows.filter((w) => !w.full).length} slots`}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {day && (
            <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {day.windows.map((w) => {
                const on = slotAt === w.at;
                return (
                  <Pressable key={w.at} disabled={w.full} onPress={() => { setSlotAt(w.at); blip(650); }} style={{ borderRadius: 10, borderWidth: on ? 2 : 1, borderColor: on ? "#7C5CFF" : colors.line, backgroundColor: w.full ? colors.chip : on ? "rgba(124,92,255,.08)" : colors.card, paddingHorizontal: 12, paddingVertical: 8, opacity: w.full ? 0.45 : 1 }}>
                    <Text style={{ fontFamily: F.extra, fontSize: 12, color: w.full ? colors.ink3 : colors.ink }}>{w.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Text style={{ marginTop: 16, fontFamily: F.extra, fontSize: 12, letterSpacing: 1.2, color: colors.ink3 }}>PAYMENT</Text>
          <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
            {(["after", "now"] as const).map((m) => (
              <Pressable key={m} onPress={() => { setPay(m); blip(650); }} style={{ flex: 1, borderRadius: 14, borderWidth: pay === m ? 2 : 1, borderColor: pay === m ? "#0C831F" : colors.line, backgroundColor: pay === m ? "rgba(12,131,31,.06)" : colors.card, padding: 12 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: colors.ink }}>{m === "after" ? "Pay after service" : "Pay now"}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{m === "after" ? "UPI / cash, kaam ke baad" : "UPI / card, abhi"}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 12 }}>
            <Row l={`${p.name} (${dur} min)`} v={inr(p.price)} />
            <Row l={visitFee === 0 ? "Visit (FREE)" : "Visit fee"} v={visitFee === 0 ? "FREE" : inr(visitFee)} />
            <View style={{ marginTop: 6, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line, borderStyle: "dashed", paddingTop: 6 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>Total{pay === "after" ? " (due after service)" : ""}</Text>
              <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>{inr(total)}</Text>
            </View>
            {!!label && <Text style={{ marginTop: 4, fontFamily: F.bold, fontSize: 11.5, color: "#7C5CFF" }}>🗓 {label}</Text>}
          </View>

          <Pressable disabled={!label || placing} onPress={() => void confirm()} style={{ marginTop: 14, borderRadius: 14, backgroundColor: !label ? colors.chip : "#7C5CFF", paddingVertical: 16, alignItems: "center" }}>
            <Text style={{ fontFamily: F.extra, fontSize: 14.5, color: "#fff" }}>{placing ? "Booking…" : label ? `Confirm booking • ${inr(total)}` : "Slot chuno"}</Text>
          </Pressable>
          <Text style={{ marginTop: 8, fontFamily: F.medium, fontSize: 10.5, color: colors.ink3, textAlign: "center" }}>Free reschedule • Verified pro • Visit fee service me adjust nahi hota</Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
      <Text style={{ fontFamily: F.medium, fontSize: 12, color: colors.ink2 }}>{l}</Text>
      <Text style={{ fontFamily: F.bold, fontSize: 12, color: colors.ink }}>{v}</Text>
    </View>
  );
}
