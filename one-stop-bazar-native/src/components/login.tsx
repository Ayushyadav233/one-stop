/**
 * OTP login — RN port of web src/components/login.tsx.
 * Deltas:
 * - framer-motion → Animated FadeIn / SlideInRight (same step transition feel).
 * - <input> → TextInput (phone: number-pad; OTP: 6 single-char boxes with
 *   auto-advance + backspace-to-previous via onKeyPress).
 * - autoFocus → autoFocus prop on TextInput (same).
 * - Session persistence: phone saved with expo-secure-store
 *   SecureStore.setItemAsync("osb-phone", digits); identity still flows into
 *   zustand via useOSB login() (same store semantics as web).
 * - No window/document/navigator usage. Demo rule identical: any 6-digit OTP
 *   works except 000000.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import { ArrowLeft, Check, ChevronRight, ShieldCheck } from "lucide-react-native";
import { blip, useOSB } from "@/lib/osb-store";
import { apiRequestOtp, apiVerifyOtp, setApiToken } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";
import { F, Img } from "./ui";

const HERO =
  "https://images.pexels.com/photos/9609862/pexels-photo-9609862.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";

export function LoginScreen() {
  const login = useOSB((s) => s.login);
  const accounts = useOSB((s) => s.accounts);
  const { colors } = useTheme();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [digits, setDigits] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [sec, setSec] = useState(30);
  // Dev-mock OTP returned by backend when reachable (no SMS yet). Null = offline.
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (step !== "otp") return;
    setSec(30);
    const t = setInterval(() => setSec((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [step]);

  const valid = digits.length === 10;
  const pretty = digits.length > 5 ? digits.slice(0, 5) + " " + digits.slice(5) : digits;
  const saved = valid ? accounts[digits] : undefined;
  const savedShop = saved?.seller?.onboarded ? saved.seller.name : "";

  const sendOtp = () => {
    if (!valid) {
      setErr("Enter a valid 10-digit mobile number");
      return;
    }
    setErr("");
    setSending(true);
    blip(720);
    // Backend OTP request (fail-soft: offline ho to demo flow vaise hi chalega).
    apiRequestOtp(digits).then((j) => {
      if (j?.ok && j.otp) setDevOtp(j.otp);
      else setDevOtp(null);
    });
    setTimeout(() => {
      setSending(false);
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      blip(880);
      setTimeout(() => inputs.current[0]?.focus(), 120);
    }, 700);
  };

  const verify = async (code: string[]) => {
    const v = code.join("");
    if (v.length < 6) return;
    if (v === "000000") {
      setErr("Invalid OTP. Try 123456");
      blip(320);
      return;
    }
    blip(990, 0.16);
    // Backend verify first (fail-soft): reachable + ok → token save;
    // reachable + wrong → error; unreachable → local demo login (offline-first).
    const res = await apiVerifyOtp(digits, v);
    if (res) {
      if (res.ok && res.token) {
        try {
          await SecureStore.setItemAsync("osb-phone", digits);
          await SecureStore.setItemAsync("osb-token", res.token);
        } catch {
          /* secure store unavailable — zustand persist still holds the session */
        }
        setApiToken(res.token);
        login(digits);
        return;
      }
      setErr(devOtp ? `Wrong OTP. Dev code: ${devOtp}` : "Wrong OTP. Try again.");
      blip(320);
      return;
    }
    try {
      await SecureStore.setItemAsync("osb-phone", digits);
    } catch {
      /* secure store unavailable — zustand persist still holds the session */
    }
    login(digits);
  };

  const typeOtp = (i: number, val: string) => {
    const ch = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = ch;
    setOtp(next);
    setErr("");
    if (ch && i < 5) inputs.current[i + 1]?.focus();
    if (next.every(Boolean)) void verify(next);
  };

  return (
    <Animated.View entering={FadeIn} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 75, backgroundColor: colors.app }}>
      <View style={{ position: "relative", height: "38%", minHeight: 220, overflow: "hidden" }}>
        <Img src={HERO} eager style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} />
        <LinearGradient colors={["rgba(0,0,0,.45)", "rgba(0,0,0,.25)", "transparent"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ position: "absolute", left: 20, top: 48 }}>
          <View style={{ height: 48, width: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#E23744" }}>
            <Text style={{ fontSize: 22 }}>🛍️</Text>
          </View>
          <Text style={{ marginTop: 12, fontFamily: F.extra, fontSize: 13, letterSpacing: 2.8, color: "rgba(255,255,255,.8)" }}>
            ONE STOP BAZAR
          </Text>
          <Text style={{ marginTop: 4, fontFamily: F.display, fontSize: 28, lineHeight: 30, color: "#fff" }}>
            Everything{"\n"}around you.
          </Text>
        </View>
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          marginTop: -16,
          paddingHorizontal: 20,
          paddingBottom: 32,
          paddingTop: 24,
        }}
      >
        {step === "phone" ? (
          <Animated.View entering={SlideInRight.springify().stiffness(220).damping(26)} style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              <Text style={{ fontFamily: F.extra, fontSize: 11, letterSpacing: 2, color: colors.ink3 }}>LOGIN OR SIGN UP</Text>
              <Text style={{ marginTop: 4, fontFamily: F.extra, fontSize: 22, letterSpacing: -0.4, color: colors.ink }}>
                What’s your number?
              </Text>
              <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 13, color: colors.ink2 }}>
                We’ll send a one-time password. No password to remember.
              </Text>

              <Text style={{ marginTop: 20, fontFamily: F.extra, fontSize: 10, letterSpacing: 1.6, color: colors.ink3 }}>
                MOBILE NUMBER
              </Text>
              <View
                style={{
                  marginTop: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 16,
                  backgroundColor: colors.card,
                  borderWidth: err ? 2 : 1,
                  borderColor: err ? "#E23744" : colors.line,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ fontSize: 18, lineHeight: 20 }}>🇮🇳</Text>
                <Text style={{ fontFamily: F.extra, fontSize: 16, color: colors.ink2 }}>+91</Text>
                <View style={{ height: 20, width: 1, backgroundColor: colors.line }} />
                <TextInput
                  autoFocus
                  keyboardType="number-pad"
                  autoComplete="tel"
                  maxLength={10}
                  value={digits}
                  onChangeText={(v) => {
                    setDigits(v.replace(/\D/g, "").slice(0, 10));
                    setErr("");
                  }}
                  onSubmitEditing={sendOtp}
                  placeholder="98765 43210"
                  placeholderTextColor={colors.ink3}
                  style={{ flex: 1, fontFamily: F.extra, fontSize: 18, letterSpacing: 1.5, color: colors.ink }}
                />
              </View>
              {err ? <Text style={{ marginTop: 8, fontFamily: F.bold, fontSize: 12, color: "#E23744" }}>{err}</Text> : null}
              {savedShop ? (
                <Text style={{ marginTop: 8, borderRadius: 12, backgroundColor: "rgba(12,131,31,.1)", paddingHorizontal: 12, paddingVertical: 8, fontFamily: F.bold, fontSize: 12, color: "#0C831F" }}>
                  Welcome back — {savedShop} opens after OTP. No re-register.
                </Text>
              ) : null}

              <View style={{ flex: 1 }} />
              <View style={{ paddingTop: 24 }}>
                <Pressable
                  disabled={!valid || sending}
                  onPress={sendOtp}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: "#E23744", paddingVertical: 16, opacity: !valid || sending ? 0.4 : 1 }}
                >
                  <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>{sending ? "Sending OTP…" : "Get OTP"}</Text>
                  {!sending && <ChevronRight size={18} color="#fff" />}
                </Pressable>
                <Text style={{ marginTop: 12, fontFamily: F.medium, fontSize: 11, lineHeight: 15, color: colors.ink3, textAlign: "center" }}>
                  By continuing you agree to our Terms & Privacy. OTP login only — no email, no password.
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        ) : (
          <Animated.View entering={SlideInRight.springify().stiffness(220).damping(26)} style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              <Pressable
                onPress={() => {
                  setStep("phone");
                  setErr("");
                }}
                style={{ marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}
              >
                <ArrowLeft size={14} color={colors.ink2} />
                <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink2 }}>Change number</Text>
              </Pressable>
              <Text style={{ fontFamily: F.extra, fontSize: 22, letterSpacing: -0.4, color: colors.ink }}>Enter OTP</Text>
              <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 13, color: colors.ink2 }}>Sent to +91 {pretty}</Text>

              <View style={{ marginTop: 24, flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                {otp.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={(el) => {
                      inputs.current[i] = el;
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={d}
                    onChangeText={(v) => typeOtp(i, v)}
                    onKeyPress={(e) => {
                      if (e.nativeEvent.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
                    }}
                    style={{
                      flex: 1,
                      height: 54,
                      borderRadius: 14,
                      backgroundColor: colors.card,
                      borderWidth: d ? 2 : 1,
                      borderColor: d ? "#E23744" : colors.line,
                      textAlign: "center",
                      fontFamily: F.extra,
                      fontSize: 22,
                      color: colors.ink,
                    }}
                  />
                ))}
              </View>
              {err ? <Text style={{ marginTop: 8, fontFamily: F.bold, fontSize: 12, color: "#E23744" }}>{err}</Text> : null}
              <Text style={{ marginTop: 12, fontFamily: F.semi, fontSize: 12, color: colors.ink3 }}>
                {sec > 0 ? (
                  `Resend in 00:${String(sec).padStart(2, "0")}`
                ) : (
                  <Text onPress={sendOtp} style={{ fontFamily: F.extra, fontSize: 12, color: "#E23744" }}>
                    Resend OTP
                  </Text>
                )}
              </Text>
              <Text style={{ marginTop: 8, fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>
                {devOtp ? `Dev code: ${devOtp} (no SMS yet)` : "Demo hint: any 6-digit OTP works (not 000000)."}
              </Text>

              <View style={{ flex: 1 }} />
              <View style={{ paddingTop: 24 }}>
                <Pressable
                  disabled={otp.join("").length < 6}
                  onPress={() => void verify(otp)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: "#E23744", paddingVertical: 16, opacity: otp.join("").length < 6 ? 0.4 : 1 }}
                >
                  <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>Verify & continue</Text>
                  <Check size={18} strokeWidth={3} color="#fff" />
                </Pressable>
                <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <ShieldCheck size={13} color={colors.ink3} />
                  <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.ink3 }}>Secure OTP • never shared with stores</Text>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
