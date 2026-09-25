/**
 * Location setup — RN port of web src/components/location-setup.tsx.
 * Exports: LocationSetupScreen + ChangeLocationSheet (names identical to web).
 * Deltas:
 * - navigator.geolocation → expo-location requestForegroundPermissionsAsync +
 *   getCurrentPositionAsync wrapped in try/catch, falling back to manual entry
 *   (same UX contract as web's permission-denied path).
 * - Reverse geocode still uses the free BigDataCloud endpoint (no key required).
 * - Result written via useOSB setUserAddress({ area, full, lat, lng }) which sets
 *   address / addressArea / userLat / userLng / locationSet (same store fields).
 * - framer-motion → Animated FadeIn / SlideInDown (sheet spring 240/30).
 * - <input> → TextInput; icons from lucide-react-native with color prop.
 */
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { ArrowRight, Crosshair, LocateFixed, MapPin, Pencil, Search, ShieldCheck } from "lucide-react-native";
import { blip, useOSB } from "@/lib/osb-store";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { F } from "./ui";

async function reverseGeocode(lat: number, lng: number): Promise<{ area: string; full: string }> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (res.ok) {
      const d = await res.json();
      const areaLabel = d.locality || d.city || d.principalSubdivision || "Current location";
      const fullLabel = [d.locality, d.principalSubdivision, d.countryName].filter(Boolean).join(", ");
      return { area: areaLabel, full: fullLabel || areaLabel };
    }
  } catch {
    /* offline / blocked — fall back to raw coords label */
  }
  return { area: "Current location", full: "Current location" };
}

/**
 * Shown once after profile completion, before the storefront opens.
 * Either:
 *  1. taps "Use current location" → expo-location GPS + reverse geocode
 *  2. types / picks an area manually
 */
export function LocationSetupScreen() {
  const setUserAddress = useOSB((s) => s.setUserAddress);
  const { colors } = useTheme();
  const [detecting, setDetecting] = useState(false);
  const [manual, setManual] = useState(false);
  const [area, setArea] = useState("");
  const [full, setFull] = useState("");
  const [err, setErr] = useState("");

  const detect = async () => {
    setDetecting(true);
    setErr("");
    blip(720);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error("denied");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      const { area: areaLabel, full: fullLabel } = await reverseGeocode(latitude, longitude);
      setDetecting(false);
      setUserAddress({ area: areaLabel, full: fullLabel, lat: latitude, lng: longitude });
      blip(960, 0.18);
    } catch {
      setDetecting(false);
      setErr("Location permission denied. You can enter it manually.");
      setManual(true);
    }
  };

  const saveManual = () => {
    if (!area.trim()) {
      setErr("Please enter your area.");
      blip(320);
      return;
    }
    setUserAddress({ area: area.trim(), full: full.trim() || area.trim() });
    blip(960, 0.18);
  };

  return (
    <Animated.View entering={FadeIn} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 73, backgroundColor: colors.app }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 28 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#E23744" }}>
            <Text style={{ fontSize: 16 }}>🛍️</Text>
          </View>
          <Text style={{ fontFamily: F.extra, fontSize: 12, letterSpacing: 2, color: colors.ink3 }}>ONE STOP BAZAR</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <View style={{ height: 6, width: 20, borderRadius: 999, backgroundColor: colors.line }} />
          <View style={{ height: 6, width: 20, borderRadius: 999, backgroundColor: colors.line }} />
          <View style={{ height: 6, width: 20, borderRadius: 999, backgroundColor: "#E23744" }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignSelf: "center", height: 64, width: 64, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "rgba(226,55,68,.12)", borderWidth: 1, borderColor: "rgba(226,55,68,.4)" }}>
          <Text style={{ fontSize: 32 }}>📍</Text>
        </View>
        <Text style={{ marginTop: 16, fontFamily: F.extra, fontSize: 25, letterSpacing: -0.5, color: colors.ink, textAlign: "center" }}>
          Where should we deliver?
        </Text>
        <Text style={{ marginTop: 6, fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: colors.ink2, textAlign: "center" }}>
          Shops near you show up first and delivery time is calculated from your location.
        </Text>

        {/* GPS card */}
        <Pressable disabled={detecting} onPress={() => void detect()} style={{ marginTop: 28, borderRadius: 20, overflow: "hidden", opacity: detecting ? 0.7 : 1 }}>
          <LinearGradient colors={["#0C831F", "#14a32b"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
            <View style={{ height: 48, width: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "rgba(255,255,255,.15)" }}>
              <LocateFixed size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>{detecting ? "Locating you…" : "Use current location"}</Text>
              <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: "rgba(255,255,255,.8)" }}>
                {detecting ? "Please allow location access" : "Most accurate — using GPS"}
              </Text>
            </View>
            <ArrowRight size={18} color="rgba(255,255,255,.8)" />
          </LinearGradient>
        </Pressable>

        <View style={{ marginVertical: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
          <Text style={{ fontFamily: F.bold, fontSize: 11, letterSpacing: 1.6, color: colors.ink3 }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        </View>

        <Pressable
          onPress={() => {
            setManual((m) => !m);
            setErr("");
            blip(600);
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}
        >
          <View style={{ height: 48, width: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.chip }}>
            <Pencil size={20} color={colors.ink2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 15, color: colors.ink }}>Enter manually</Text>
            <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink2 }}>Type your area or full address</Text>
          </View>
          <Crosshair size={18} color={colors.ink3} />
        </Pressable>

        {manual && (
          <Animated.View entering={FadeIn} style={{ marginTop: 12, gap: 10 }}>
            <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MapPin size={11} color={colors.ink3} />
                <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.6, color: colors.ink3 }}>AREA / LOCALITY *</Text>
              </View>
              <TextInput
                value={area}
                onChangeText={(v) => {
                  setArea(v);
                  setErr("");
                }}
                placeholder="e.g. HSR Layout, Sector 2"
                placeholderTextColor={colors.ink3}
                style={{ marginTop: 4, fontFamily: F.bold, fontSize: 14, color: colors.ink }}
              />
            </View>
            <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Search size={11} color={colors.ink3} />
                <Text style={{ fontFamily: F.extra, fontSize: 10, letterSpacing: 1.6, color: colors.ink3 }}>FULL ADDRESS</Text>
              </View>
              <TextInput
                value={full}
                onChangeText={setFull}
                placeholder="Flat, street, landmark, city"
                placeholderTextColor={colors.ink3}
                style={{ marginTop: 4, fontFamily: F.medium, fontSize: 13, color: colors.ink }}
              />
            </View>
            <Pressable onPress={saveManual} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: colors.ink, paddingVertical: 14 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.app }}>Save location</Text>
              <ArrowRight size={16} color={colors.app} />
            </Pressable>
          </Animated.View>
        )}

        {err ? (
          <Text style={{ marginTop: 12, borderRadius: 12, backgroundColor: "rgba(226,55,68,.1)", paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.bold, fontSize: 12, color: "#E23744", textAlign: "center" }}>
            {err}
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <ShieldCheck size={13} color="#0C831F" />
          <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3, textAlign: "center" }}>
            Your location stays on your account and is used only for delivery.
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Compact manual-location picker used later from the home header (change location).
 */
export function ChangeLocationSheet({ onClose }: { onClose: () => void }) {
  const addressArea = useOSB((s) => s.addressArea);
  const address = useOSB((s) => s.address);
  const setUserAddress = useOSB((s) => s.setUserAddress);
  const { colors } = useTheme();
  const [area, setArea] = useState(addressArea || "");
  const [full, setFull] = useState(address || "");
  const [detecting, setDetecting] = useState(false);
  const [err, setErr] = useState("");

  const save = () => {
    if (!area.trim()) {
      setErr("Area is required");
      blip(320);
      return;
    }
    setUserAddress({ area: area.trim(), full: full.trim() || area.trim() });
    blip(880);
    onClose();
  };

  const gps = async () => {
    setDetecting(true);
    setErr("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error("denied");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      const { area: a, full: f } = await reverseGeocode(latitude, longitude);
      setDetecting(false);
      setArea(a);
      setFull(f);
      setUserAddress({ area: a, full: f, lat: latitude, lng: longitude });
      blip(920);
      onClose();
    } catch {
      setDetecting(false);
      setErr("GPS denied — type your area.");
    }
  };

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 58 }}>
      <Animated.View entering={FadeIn} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.55)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "86%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.app, overflow: "hidden" }}>
        <Animated.View entering={SlideInDown.springify().stiffness(tokens.ui.sheetSpring.stiffness).damping(tokens.ui.sheetSpring.damping)} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 }} keyboardShouldPersistTaps="handled">
            <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 999, backgroundColor: "rgba(0,0,0,.15)" }} />
            <Text style={{ marginTop: 12, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3, color: colors.ink }}>
              Change delivery location
            </Text>

            <Pressable onPress={() => void gps()} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, backgroundColor: "#0C831F", padding: 14, opacity: detecting ? 0.7 : 1 }}>
              <LocateFixed size={18} color="#fff" />
              <Text style={{ flex: 1, fontFamily: F.extra, fontSize: 13, color: "#fff" }}>
                {detecting ? "Locating…" : "Use my current GPS location"}
              </Text>
            </Pressable>

            <View style={{ marginTop: 12, gap: 8 }}>
              <TextInput
                value={area}
                onChangeText={(v) => {
                  setArea(v);
                  setErr("");
                }}
                placeholder="Area / locality *"
                placeholderTextColor={colors.ink3}
                style={{ borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.bold, fontSize: 13.5, color: colors.ink }}
              />
              <TextInput
                value={full}
                onChangeText={setFull}
                placeholder="Full address (flat, street, landmark)"
                placeholderTextColor={colors.ink3}
                style={{ borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.medium, fontSize: 13, color: colors.ink }}
              />
            </View>
            {err ? <Text style={{ marginTop: 8, fontFamily: F.bold, fontSize: 12, color: "#E23744" }}>{err}</Text> : null}
            <Pressable onPress={save} style={{ marginTop: 12, borderRadius: 14, backgroundColor: "#E23744", paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Save</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}
