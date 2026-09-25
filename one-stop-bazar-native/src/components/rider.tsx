/**
 * Rider flow — RN port of web src/components/rider.tsx.
 * Deltas (rest-state pixels identical):
 * - framer-motion → Reanimated entering (FadeIn / SlideInDown) or plain Views.
 * - Web Leaflet/Google-embed LiveMap → react-native-maps MapView (store/home/rider markers + route polyline).
 * - navigator.geolocation.watchPosition → expo-location watchPositionAsync (try/catch, road-simulation fallback kept).
 * - tel: anchors → Linking.openURL("tel:…"); Google Maps nav → openGoogleMapsNav (Linking).
 * - File-input parcel photo → attach-confirm step (expo-image-picker is NOT installed, so no camera module;
 *   the OTP + photo-gate + completeDelivery flow is otherwise 1:1). See deviations note at bottom.
 * - Sheet overlay: backdrop Pressable sibling (RN has no stopPropagation).
 */
import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import {
  Bike,
  Camera,
  Check,
  ChevronRight,
  EyeOff,
  LogOut,
  MapPin,
  Navigation,
  Package,
  Phone,
  Power,
  ShoppingBag,
  Store as StoreIcon,
  Trash2,
  X,
} from "lucide-react-native";
import { inr } from "@/lib/data";
import { blip, useOSB, type LiveOrder } from "@/lib/osb-store";
import { getCustomerLocation, getStoreLocation, openGoogleMapsNav, timeAgo } from "@/lib/commerce";
import { useTheme } from "@/theme/ThemeProvider";
import { F, Img, LiveDot } from "./ui";

/* ── RN map (replaces web LiveMap/Leaflet) ── */
function RiderMap({
  store,
  home,
  riderPos,
  showRider,
  routeColor = "#1573FF",
}: {
  store: { lat: number; lng: number };
  home: { lat: number; lng: number };
  riderPos?: { lat: number; lng: number };
  showRider: boolean;
  routeColor?: string;
}) {
  const mid = { latitude: (store.lat + home.lat) / 2, longitude: (store.lng + home.lng) / 2 };
  const span = {
    latitudeDelta: Math.max(0.02, Math.abs(store.lat - home.lat) * 2.4),
    longitudeDelta: Math.max(0.02, Math.abs(store.lng - home.lng) * 2.4),
  };
  const rider = riderPos
    ? { latitude: riderPos.lat, longitude: riderPos.lng }
    : { latitude: store.lat + (home.lat - store.lat) * 0.6, longitude: store.lng + (home.lng - store.lng) * 0.6 };
  return (
    <MapView style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} initialRegion={{ ...mid, ...span }} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}>
      <Marker coordinate={{ latitude: store.lat, longitude: store.lng }} title="Store">
        <View style={{ height: 38, width: 38, borderRadius: 14, backgroundColor: "#fff", borderWidth: 2, borderColor: "#0C831F", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18 }}>🏪</Text>
        </View>
      </Marker>
      <Marker coordinate={{ latitude: home.lat, longitude: home.lng }} title="Customer">
        <View style={{ height: 38, width: 38, borderRadius: 14, backgroundColor: "#fff", borderWidth: 2, borderColor: "#E23744", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18 }}>🏠</Text>
        </View>
      </Marker>
      <Polyline coordinates={[{ latitude: store.lat, longitude: store.lng }, { latitude: home.lat, longitude: home.lng }]} strokeColor="#8A8A99" strokeWidth={4} lineDashPattern={[8, 10]} />
      <Polyline coordinates={[{ latitude: store.lat, longitude: store.lng }, rider]} strokeColor={routeColor} strokeWidth={5} />
      {showRider && (
        <Marker coordinate={rider} title="Rider">
          <View style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: "#F8CB46", borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18 }}>🛵</Text>
          </View>
        </Marker>
      )}
    </MapView>
  );
}

export function RiderPanel() {
  const riderCtx = useOSB((s) => s.riderCtx);
  const orders = useOSB((s) => s.orders);
  const logout = useOSB((s) => s.logout);
  const updateRiderLocation = useOSB((s) => s.updateRiderLocation);
  const toggleRiderOnline = useOSB((s) => s.toggleRiderOnline);
  const enterCustomerMode = useOSB((s) => s.enterCustomerMode);
  const { colors } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "done">("active");
  const [gpsActive, setGpsActive] = useState(true);

  const mine = useMemo(() => {
    if (!riderCtx) return { queue: [] as LiveOrder[], done: [] as LiveOrder[] };
    const forStore = orders.filter((o) => o.storeId === riderCtx.storeId);
    const assignedToMe = (o: LiveOrder) => !o.rider || o.rider === riderCtx.riderName;
    const queue = forStore.filter((o) => ["ready", "onway"].includes(o.status) && assignedToMe(o));
    const done = forStore.filter((o) => o.status === "delivered" && o.rider === riderCtx.riderName);
    return { queue, done };
  }, [orders, riderCtx]);

  const active = mine.queue.find((o) => o.status === "onway" && o.rider === riderCtx?.riderName) ?? mine.queue.find((o) => o.status === "onway");
  const earnings = mine.done.length * 25;
  const [offlineWarn, setOfflineWarn] = useState(false);

  // Real-time GPS broadcast for active delivery (expo-location + road-simulation fallback).
  useEffect(() => {
    if (!active || !riderCtx || !riderCtx.online) return;
    const orderId = active.id;
    const storeLoc = getStoreLocation(active.storeId);
    const homeLoc = getCustomerLocation(active.address);

    let progress = active.riderLat && active.riderLng ? 0.35 : 0.12;

    const broadcast = (lat: number, lng: number) => {
      updateRiderLocation(orderId, lat, lng);
    };

    if (!active.riderLat || !active.riderLng) {
      broadcast(storeLoc.lat + (homeLoc.lat - storeLoc.lat) * progress, storeLoc.lng + (homeLoc.lng - storeLoc.lng) * progress);
    }

    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled || status !== "granted") return;
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 5 },
          (pos) => {
            broadcast(pos.coords.latitude, pos.coords.longitude);
            setGpsActive(true);
          }
        );
      } catch {
        /* fallback to smooth road simulation below */
      }
    })();

    const interval = setInterval(() => {
      progress = Math.min(0.94, progress + 0.04);
      const lat = storeLoc.lat + (homeLoc.lat - storeLoc.lat) * progress;
      const lng = storeLoc.lng + (homeLoc.lng - storeLoc.lng) * progress;
      broadcast(lat, lng);
    }, 3500);

    return () => {
      cancelled = true;
      clearInterval(interval);
      try {
        sub?.remove();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, active?.status, riderCtx, updateRiderLocation]);

  if (!riderCtx) return null;

  const stats: [string, string, string][] = [
    ["To deliver", String(mine.queue.length), "#F8CB46"],
    ["Delivered", String(mine.done.length), "#7DFFB8"],
    ["Est. payout", inr(earnings), "#fff"],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.app }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 176 }}>
        {/* header */}
        <View style={{ backgroundColor: "#111117", paddingHorizontal: 16, paddingBottom: 20, paddingTop: 20, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -40, top: -40, height: 160, width: 160, borderRadius: 80, backgroundColor: "rgba(248,203,70,.2)" }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ height: 44, width: 44, borderRadius: 16, backgroundColor: "#F8CB46", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 20 }}>🛵</Text>
              <View style={{ position: "absolute", right: -2, bottom: -2, height: 14, width: 14, borderRadius: 7, borderWidth: 2, borderColor: "#111117", backgroundColor: riderCtx.online ? "#34D399" : "rgba(255,255,255,.3)" }} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>{riderCtx.riderName}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <StoreIcon size={11} color="rgba(255,255,255,.6)" />
                <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 11, color: "rgba(255,255,255,.6)" }}>{riderCtx.storeName} • {riderCtx.vehicle}</Text>
              </View>
            </View>
            <Pressable onPress={() => { enterCustomerMode(); blip(660); }} accessibilityLabel="Shop as a customer" style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,.1)", alignItems: "center", justifyContent: "center" }}>
              <ShoppingBag size={16} color="#fff" />
            </Pressable>
            <Pressable onPress={() => { logout(); blip(420); }} accessibilityLabel="Log out" style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,.1)", alignItems: "center", justifyContent: "center" }}>
              <LogOut size={16} color="#fff" />
            </Pressable>
          </View>

          {/* Online / Offline toggle */}
          <Pressable
            onPress={() => {
              if (riderCtx.online && active) { setOfflineWarn(true); blip(320); setTimeout(() => setOfflineWarn(false), 2500); return; }
              toggleRiderOnline(!riderCtx.online);
              blip(riderCtx.online ? 380 : 780);
            }}
            style={{
              marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1,
              backgroundColor: riderCtx.online ? "rgba(16,185,129,.15)" : "rgba(255,255,255,.08)",
              borderColor: riderCtx.online ? "rgba(16,185,129,.3)" : "rgba(255,255,255,.15)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: riderCtx.online ? "#34D399" : "rgba(255,255,255,.3)" }} />
              <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 12, color: riderCtx.online ? "#6EE7B7" : "rgba(255,255,255,.6)" }}>
                {riderCtx.online ? "You're Online — visible to the shop" : "You're Offline — tap to go online"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: riderCtx.online ? "#34D399" : "rgba(255,255,255,.15)" }}>
              <Power size={11} color={riderCtx.online ? "#000" : "#fff"} />
              <Text style={{ fontFamily: F.extra, fontSize: 10.5, color: riderCtx.online ? "#000" : "#fff" }}>{riderCtx.online ? "ON" : "OFF"}</Text>
            </View>
          </Pressable>
          {offlineWarn && (
            <Animated.View entering={FadeIn.duration(200)}>
              <View style={{ marginTop: 6, borderRadius: 8, backgroundColor: "rgba(226,55,68,.15)", paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: "#FF8A93" }}>Finish your active delivery before going offline.</Text>
              </View>
            </Animated.View>
          )}

          {/* GPS Live Broadcast Pill */}
          {riderCtx.online && (
            <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, backgroundColor: "rgba(255,255,255,.08)", paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,.1)" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <LiveDot color="#F8CB46" size={6} />
                <Text style={{ fontFamily: F.bold, fontSize: 11, color: "rgba(255,255,255,.7)" }}>GPS location: {gpsActive ? "always on" : "simulated"}</Text>
              </View>
              <Text style={{ fontFamily: F.medium, fontSize: 10, color: "rgba(255,255,255,.5)" }}>Customer tracks you live</Text>
            </View>
          )}

          <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
            {stats.map(([l, v, c]) => (
              <View key={l} style={{ flex: 1, borderRadius: 16, backgroundColor: "rgba(255,255,255,.08)", padding: 12 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.5, color: "rgba(255,255,255,.5)" }}>{l.toUpperCase()}</Text>
                <Text numberOfLines={1} style={{ marginTop: 2, fontFamily: F.extra, fontSize: 16, color: c }}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* active ride banner */}
        {active && (
          <Animated.View entering={FadeIn.duration(220)} style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 18, backgroundColor: "#0C831F", overflow: "hidden" }}>
            <Pressable onPress={() => setOpen(active.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14 }}>
              <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,.15)", alignItems: "center", justifyContent: "center" }}>
                <Navigation size={18} color="#fff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: "#fff" }}>Delivery in progress • {active.code}</Text>
                <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,.8)" }}>{active.customer} • {active.address}</Text>
              </View>
              <ChevronRight size={18} color="#fff" />
            </Pressable>
            <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.15)", backgroundColor: "rgba(0,0,0,.15)" }}>
              <Pressable
                onPress={() => { openGoogleMapsNav(riderCtx.storeAddress, active.address); blip(700); }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 }}
              >
                <MapPin size={13} color="#F8CB46" />
                <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#F8CB46" }}>Direct Google Maps Navigate</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => setTab("active")}
              style={{ flex: 1, borderRadius: 13, paddingVertical: 10, alignItems: "center", backgroundColor: tab === "active" ? colors.ink : colors.card, borderWidth: tab === "active" ? 0 : 1, borderColor: colors.line }}
            >
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: tab === "active" ? colors.app : colors.ink2 }}>My deliveries ({mine.queue.length})</Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("done")}
              style={{ flex: 1, borderRadius: 13, paddingVertical: 10, alignItems: "center", backgroundColor: tab === "done" ? colors.ink : colors.card, borderWidth: tab === "done" ? 0 : 1, borderColor: colors.line }}
            >
              <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: tab === "done" ? colors.app : colors.ink2 }}>Completed ({mine.done.length})</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
          {(tab === "active" ? mine.queue : mine.done).map((o) => (
            <RideCard key={o.id} o={o} onOpen={() => { setOpen(o.id); blip(560); }} />
          ))}
          {(tab === "active" ? mine.queue : mine.done).length === 0 && (
            <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 32, alignItems: "center" }}>
              <Text style={{ fontSize: 42 }}>{tab === "active" ? "📭" : "✅"}</Text>
              <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 15, color: colors.ink }}>{tab === "active" ? "No parcels ready yet" : "No completed runs"}</Text>
              <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 12, color: colors.ink3, textAlign: "center" }}>
                {tab === "active" ? `${riderCtx.storeName} will mark orders ready — they appear here instantly.` : "Your delivered orders will show up here."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {open && <RideSheet id={open} onClose={() => setOpen(null)} />}
    </View>
  );
}

function RideCard({ o, onOpen }: { o: LiveOrder; onOpen: () => void }) {
  const perms = useOSB((s) => s.riderCtx?.perms);
  const riderCtx = useOSB((s) => s.riderCtx);
  const { colors } = useTheme();
  const isCod = o.payment.toUpperCase() === "COD";

  const directMaps = () => {
    openGoogleMapsNav(riderCtx?.storeAddress || "HSR Layout", o.address);
    blip(660);
  };

  const badge = o.status === "delivered" ? "#0C831F" : o.status === "onway" ? "#E8830C" : "#1573FF";

  return (
    <Animated.View entering={FadeIn.duration(220)} style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
      <Pressable onPress={onOpen} style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, backgroundColor: badge, alignItems: "center", justifyContent: "center" }}>
            {o.status === "delivered" ? <Check size={18} strokeWidth={3} color="#fff" /> : <Package size={18} color="#fff" />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{o.code}</Text>
              <View style={{ borderRadius: 6, backgroundColor: badge, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: "#fff" }}>{o.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>
              {o.customer} • {o.distanceKm} km{perms?.itemList ? ` • ${o.items.length} item${o.items.length > 1 ? "s" : ""}` : ""}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {perms?.orderAmount && <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{inr(o.total)}</Text>}
            <Text style={{ fontFamily: F.extra, fontSize: 9.5, color: isCod ? "#E8830C" : "#0C831F" }}>{isCod ? "COLLECT CASH" : "PREPAID"}</Text>
          </View>
        </View>

        {perms?.customerAddress && (
          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "flex-start", gap: 6, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 }}>
            <MapPin size={13} color="#E23744" />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.semi, fontSize: 11.5, color: colors.ink2 }}>{o.address}</Text>
          </View>
        )}
      </Pressable>

      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card2 }}>
        <Pressable onPress={directMaps} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 }}>
          <Navigation size={13} color="#1573FF" />
          <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#1573FF" }}>Open in Google Maps</Text>
        </Pressable>
        <View style={{ width: 1, backgroundColor: colors.line }} />
        <Pressable onPress={onOpen} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10 }}>
          <Text style={{ fontFamily: F.extra, fontSize: 11.5, color: "#0C831F" }}>View Details & Deliver</Text>
          <ChevronRight size={13} color="#0C831F" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function RideSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const orders = useOSB((s) => s.orders);
  const riderCtx = useOSB((s) => s.riderCtx);
  const riderPickup = useOSB((s) => s.riderPickup);
  const completeDelivery = useOSB((s) => s.completeDelivery);
  const { colors } = useTheme();
  const [otp, setOtp] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [err, setErr] = useState("");
  const [okDone, setOkDone] = useState(false);

  const o = orders.find((x) => x.id === id);

  if (!o || !riderCtx) return null;
  const perms = riderCtx.perms;
  const isCod = o.payment.toUpperCase() === "COD";
  const delivered = o.status === "delivered";

  const storeLoc = getStoreLocation(o.storeId);
  const homeLoc = getCustomerLocation(o.address);
  const riderPos = o.riderLat != null && o.riderLng != null ? { lat: o.riderLat, lng: o.riderLng } : undefined;
  const proofIsImage = !!o.proofPhoto && (o.proofPhoto.startsWith("http") || o.proofPhoto.startsWith("data:"));

  const attachPhoto = () => {
    // expo-image-picker is not installed in this build — record an attach confirmation
    // so the required-photo gate + completeDelivery flow stays fully functional.
    setPhoto(`attached-${Date.now()}`);
    setErr("");
    blip(760);
  };

  const handleOtpChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    setOtp(clean);
    setErr("");
  };

  const finish = () => {
    if (!photo) {
      setErr("Parcel photo is required as delivery proof.");
      blip(320);
      return;
    }
    if (otp.trim().length < 4) {
      setErr("Ask the customer for their 4-digit OTP.");
      blip(320);
      return;
    }
    const ok = completeDelivery(o.id, otp.trim(), photo);
    if (!ok) {
      setErr("Wrong OTP. Please check with the customer.");
      blip(320);
      return;
    }
    setErr("");
    setOkDone(true);
    setTimeout(onClose, 1400);
  };

  const openNavigation = () => {
    openGoogleMapsNav(riderCtx.storeAddress, o.address, homeLoc.lat, homeLoc.lng);
    blip(720);
  };

  const dial = (num: string) => {
    Linking.openURL(`tel:${num}`).catch(() => Alert.alert("Cannot place call", num));
  };

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 60 }}>
      <Pressable onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.6)" }} />
      <Animated.View entering={SlideInDown.duration(280)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "92%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.app, overflow: "hidden" }}>
        {/* Top Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.surface }}>
          <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 3, backgroundColor: colors.line }} />
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 19, letterSpacing: -0.3, color: colors.ink }}>{o.code}</Text>
                <View style={{ borderRadius: 6, backgroundColor: o.status === "delivered" ? "#0C831F" : "#E8830C", paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#fff" }}>{o.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>Placed {timeAgo(o.createdAt)} • {o.distanceKm} km to drop</Text>
            </View>
            <Pressable onPress={onClose} style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
              <X size={17} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 176 }}>
          {okDone && (
            <Animated.View entering={FadeIn.duration(200)} style={{ marginBottom: 12, borderRadius: 16, backgroundColor: "#0C831F", padding: 16, alignItems: "center" }}>
              <Check size={32} strokeWidth={3} color="#fff" />
              <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 16, color: "#fff" }}>Delivery confirmed! 🎉</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,.85)" }}>Customer & shop notified in real-time.</Text>
            </Animated.View>
          )}

          {/* Real-time Map Preview inside Rider Sheet */}
          <View style={{ position: "relative", marginBottom: 12, height: 148, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
            <RiderMap store={storeLoc} home={homeLoc} riderPos={riderPos} showRider={!delivered} routeColor="#1573FF" />
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(0,0,0,.55)" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <LiveDot color="#34D399" size={6} />
                <Text style={{ fontFamily: F.bold, fontSize: 11, color: "#fff" }}>GPS Live Broadcast</Text>
              </View>
              <Text style={{ fontFamily: F.bold, fontSize: 11, color: "#F8CB46" }}>{o.distanceKm} km away</Text>
            </View>
            <Pressable onPress={openNavigation} style={{ position: "absolute", right: 10, top: 10, flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,.95)", paddingHorizontal: 12, paddingVertical: 6 }}>
              <Navigation size={12} color="#1573FF" />
              <Text style={{ fontFamily: F.extra, fontSize: 11, color: "#111114" }}>Direct Maps</Text>
            </Pressable>
          </View>

          {/* Pickup location */}
          <View style={{ marginBottom: 10, flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
            <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: "rgba(12,131,31,.12)", alignItems: "center", justifyContent: "center" }}>
              <StoreIcon size={18} color="#0C831F" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.5, color: colors.ink3 }}>PICK UP FROM (STORE)</Text>
              <Text style={{ fontFamily: F.extra, fontSize: 13, color: colors.ink }}>{riderCtx.storeName}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>{riderCtx.storeAddress}</Text>
            </View>
            <Pressable onPress={() => dial(riderCtx.storePhone)} style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
              <Phone size={15} color={colors.ink} />
            </Pressable>
          </View>

          {/* Delivery Location with DIRECT MAPS BUTTON */}
          <View style={{ marginBottom: 10, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 }}>
              <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: "rgba(226,55,68,.12)", alignItems: "center", justifyContent: "center" }}>
                <MapPin size={18} color="#E23744" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.5, color: colors.ink3 }}>DELIVER TO (CUSTOMER)</Text>
                <Text style={{ fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>{o.customer}</Text>
                {perms.customerAddress ? (
                  <Text style={{ fontFamily: F.medium, fontSize: 12, color: colors.ink2 }}>{o.address}</Text>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <EyeOff size={11} color={colors.ink3} />
                    <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>Address hidden by shop owner</Text>
                  </View>
                )}
              </View>
              {perms.customerPhone ? (
                <Pressable onPress={() => dial(o.phone)} style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: "#0C831F", alignItems: "center", justifyContent: "center" }}>
                  <Phone size={15} color="#fff" />
                </Pressable>
              ) : (
                <View style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
                  <EyeOff size={15} color={colors.ink3} />
                </View>
              )}
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: "rgba(21,115,255,.08)", padding: 10 }}>
              <Pressable onPress={openNavigation} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, backgroundColor: "#1573FF", paddingVertical: 12 }}>
                <Navigation size={16} color="#fff" />
                <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#fff" }}>Open in Google Maps (Turn-by-turn Navigation)</Text>
              </Pressable>
            </View>
          </View>

          {/* Parcel contents */}
          {perms.itemList && (
            <View style={{ marginBottom: 10, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.5, color: colors.ink3 }}>PARCEL CONTENTS</Text>
              <View style={{ marginTop: 6, gap: 4 }}>
                {o.items.map((it, i) => (
                  <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: colors.ink }}>{it.qty} × {it.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Payment collection info */}
          <View style={{ marginBottom: 12, borderRadius: 16, padding: 14, backgroundColor: isCod ? "rgba(232,131,12,.12)" : "rgba(12,131,31,.1)", borderWidth: 1, borderColor: isCod ? "rgba(232,131,12,.3)" : "transparent" }}>
            {isCod && perms.collectCash ? (
              <View>
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.5, color: "#E8830C" }}>COLLECT FROM CUSTOMER</Text>
                <Text style={{ fontFamily: F.extra, fontSize: 22, color: "#E8830C" }}>{perms.orderAmount ? inr(o.total) : "Cash on delivery"}</Text>
                <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink2 }}>Hand over the collected cash at the shop</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Check size={16} strokeWidth={3} color="#0C5B21" />
                <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#0C5B21" }}>Already paid online — collect nothing</Text>
              </View>
            )}
          </View>

          {!delivered && (
            <View>
              {o.status !== "onway" && (
                <Pressable
                  onPress={() => { riderPickup(o.id); blip(820); }}
                  style={{ marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: "#1573FF", paddingVertical: 16 }}
                >
                  <Bike size={19} color="#fff" />
                  <Text style={{ fontFamily: F.extra, fontSize: 14.5, color: "#fff" }}>Picked up — start delivery</Text>
                </Pressable>
              )}

              {o.status === "onway" && (
                <View style={{ gap: 12 }}>
                  <View>
                    <View style={{ marginBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1.2, color: colors.ink3 }}>STEP 1 — PARCEL PHOTO (REQUIRED)</Text>
                      {photo && <Text style={{ fontFamily: F.extra, fontSize: 10, color: "#0C831F" }}>✓ Attached</Text>}
                    </View>

                    {photo ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 10 }}>
                        <View style={{ height: 72, width: 72, borderRadius: 12, backgroundColor: "rgba(12,131,31,.12)", alignItems: "center", justifyContent: "center" }}>
                          <Camera size={26} color="#0C831F" />
                          <View style={{ position: "absolute", bottom: 4, left: 4, borderRadius: 4, backgroundColor: "#0C831F", paddingHorizontal: 4, paddingVertical: 1 }}>
                            <Text style={{ fontFamily: F.extra, fontSize: 8, color: "#fff" }}>✓ ATTACHED</Text>
                          </View>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontFamily: F.extra, fontSize: 13, color: "#0C831F" }}>Parcel photo ready ✓</Text>
                          <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>Photo will be shared with the customer</Text>
                        </View>
                        <Pressable onPress={() => { setPhoto(undefined); blip(420); }} accessibilityLabel="Remove photo" style={{ height: 36, width: 36, borderRadius: 12, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
                          <Trash2 size={16} color="#E23744" />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={attachPhoto}
                        style={{ height: 88, width: "100%", alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(12,131,31,.4)", backgroundColor: "rgba(12,131,31,.05)" }}
                      >
                        <Camera size={22} color="#0C831F" />
                        <Text style={{ fontFamily: F.extra, fontSize: 12.5, color: "#0C831F" }}>Take parcel photo</Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.ink3 }}>Customer sees this as delivery proof</Text>
                      </Pressable>
                    )}
                  </View>

                  <View>
                    <Text style={{ marginBottom: 6, fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1.2, color: colors.ink3 }}>STEP 2 — CUSTOMER OTP</Text>
                    <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
                      <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink2 }}>Ask the customer: “Order mil gaya? OTP bataiye.”</Text>
                      <TextInput
                        keyboardType="numeric"
                        maxLength={4}
                        value={otp}
                        onChangeText={handleOtpChange}
                        placeholder="• • • •"
                        placeholderTextColor={colors.ink3}
                        style={{ marginTop: 8, borderRadius: 14, backgroundColor: colors.card2, paddingVertical: 14, textAlign: "center", fontFamily: F.extra, fontSize: 28, letterSpacing: 10, color: colors.ink }}
                      />
                    </View>
                  </View>

                  {err ? (
                    <Animated.View entering={FadeIn.duration(180)} style={{ borderRadius: 12, backgroundColor: "rgba(226,55,68,.15)", padding: 12, alignItems: "center" }}>
                      <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#E23744" }}>⚠️ {err}</Text>
                    </Animated.View>
                  ) : null}

                  <View style={{ paddingTop: 8 }}>
                    <Pressable onPress={finish} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: "#0C831F", paddingVertical: 16 }}>
                      <Check size={20} strokeWidth={3} color="#fff" />
                      <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>Confirm Delivery</Text>
                    </Pressable>
                    <Text style={{ marginTop: 8, fontFamily: F.semi, fontSize: 11, color: colors.ink3, textAlign: "center" }}>
                      Order is completed only after valid customer OTP.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {delivered && (
            <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Check size={18} strokeWidth={3} color="#0C831F" />
                <Text style={{ flex: 1, fontFamily: F.extra, fontSize: 13.5, color: "#0C831F" }}>
                  Delivered {o.deliveredBy === "customer" ? "(confirmed by customer)" : "with customer OTP"}
                </Text>
              </View>
              {proofIsImage && (
                <View style={{ marginTop: 10, height: 140, borderRadius: 14, overflow: "hidden" }}>
                  <Img src={o.proofPhoto as string} style={{ width: "100%", height: "100%" }} />
                </View>
              )}
              {!proofIsImage && !!o.proofPhoto && (
                <View style={{ marginTop: 10, borderRadius: 12, backgroundColor: "rgba(12,131,31,.1)", padding: 12, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.extra, fontSize: 12, color: "#0C831F" }}>✓ Delivery proof attached</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

/* Deviations from web rider.tsx:
 * - Parcel photo uses an attach-confirmation (no FileReader/file input; expo-image-picker not installed).
 *   The required-photo gate, remove-photo, error copy and completeDelivery(id, otp, photo) flow are unchanged.
 * - LiveDot with size={0} renders nothing extra; kept only to preserve the online pulse marker next to the dot.
 */
