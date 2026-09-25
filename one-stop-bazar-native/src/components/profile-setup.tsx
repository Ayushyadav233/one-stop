/**
 * Profile setup — RN port of web src/components/profile-setup.tsx.
 * Exports: ProfileSetupScreen + EditProfileSheet (names identical to web).
 * Deltas:
 * - framer-motion → Animated FadeIn / SlideInDown (sheet spring 240/30, same as shell Sheet).
 * - <input> → TextInput; X/close icon from lucide-react-native with color prop.
 * - Same validation (name required, optional email regex) and same
 *   completeProfile({ name, email, gender, avatar }) store call.
 */
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { ArrowRight, Check, Mail, Sparkles, User, X } from "lucide-react-native";
import { blip, useOSB } from "@/lib/osb-store";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { F } from "./ui";

const AVATARS = ["🧑", "👩", "🧔", "👨‍🦱", "👩‍🦰", "🧕", "👴", "👵", "🧑‍🍳", "🧑‍💼", "🧑‍🎨", "🦸"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

/**
 * Shown once right after OTP verification (for any brand-new or incomplete
 * account — customer, provider or rider identity) so the app always has a
 * real name to greet with, print on bills, and show across the experience.
 */
export function ProfileSetupScreen() {
  const phone = useOSB((s) => s.phone);
  const userName = useOSB((s) => s.userName);
  const completeProfile = useOSB((s) => s.completeProfile);
  const logout = useOSB((s) => s.logout);
  const { colors } = useTheme();
  const [name, setName] = useState(userName || "");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [err, setErr] = useState("");

  const save = () => {
    if (!name.trim()) {
      setErr("Please tell us your name.");
      blip(320);
      return;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErr("That email doesn't look right.");
      blip(320);
      return;
    }
    blip(920, 0.16);
    completeProfile({ name: name.trim(), email: email.trim(), gender, avatar });
  };

  return (
    <Animated.View entering={FadeIn} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 74, backgroundColor: colors.app }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 28 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#E23744" }}>
            <Text style={{ fontSize: 16 }}>🛍️</Text>
          </View>
          <Text style={{ fontFamily: F.extra, fontSize: 12, letterSpacing: 2, color: colors.ink3 }}>ONE STOP BAZAR</Text>
        </View>
        <Pressable
          onPress={() => {
            logout();
            blip(400);
          }}
        >
          <Text style={{ fontFamily: F.extra, fontSize: 12, color: colors.ink3 }}>Use another number</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Sparkles size={13} color="#0C831F" />
          <Text style={{ fontFamily: F.extra, fontSize: 11, letterSpacing: 2, color: "#0C831F" }}>ALMOST THERE</Text>
        </View>
        <Text style={{ marginTop: 6, fontFamily: F.extra, fontSize: 26, letterSpacing: -0.5, color: colors.ink }}>Set up your profile</Text>
        <Text style={{ marginTop: 4, fontFamily: F.medium, fontSize: 13, color: colors.ink2 }}>
          This name shows on your orders, bills and to shopkeepers you deal with.
        </Text>

        {/* avatar picker */}
        <View style={{ marginTop: 24, flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View
            style={{
              height: 80,
              width: 80,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 40,
              backgroundColor: colors.chip,
              borderWidth: 2,
              borderColor: "rgba(226,55,68,.6)",
            }}
          >
            <Text style={{ fontSize: 38 }}>{avatar}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 11, letterSpacing: 1.6, color: colors.ink3 }}>CHOOSE AN AVATAR</Text>
            <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {AVATARS.map((a) => (
                <Pressable
                  key={a}
                  onPress={() => {
                    setAvatar(a);
                    blip(600);
                  }}
                  style={{
                    height: 36,
                    width: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    backgroundColor: avatar === a ? "#E23744" : colors.chip,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{a}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* name */}
        <Text style={{ marginTop: 24, fontFamily: F.extra, fontSize: 10, letterSpacing: 1.6, color: colors.ink3 }}>FULL NAME *</Text>
        <View
          style={{
            marginTop: 6,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            borderRadius: 16,
            backgroundColor: colors.card,
            borderWidth: err && !name.trim() ? 2 : 1,
            borderColor: err && !name.trim() ? "#E23744" : colors.line,
            paddingHorizontal: 14,
            paddingVertical: 14,
          }}
        >
          <User size={17} color={colors.ink3} />
          <TextInput
            autoFocus
            value={name}
            onChangeText={(v) => {
              setName(v);
              setErr("");
            }}
            placeholder="e.g. Priya Sharma"
            placeholderTextColor={colors.ink3}
            style={{ flex: 1, fontFamily: F.bold, fontSize: 15, color: colors.ink }}
          />
        </View>

        {/* email */}
        <Text style={{ marginTop: 12, fontFamily: F.extra, fontSize: 10, letterSpacing: 1.6, color: colors.ink3 }}>EMAIL (OPTIONAL)</Text>
        <View
          style={{
            marginTop: 6,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            borderRadius: 16,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.line,
            paddingHorizontal: 14,
            paddingVertical: 14,
          }}
        >
          <Mail size={17} color={colors.ink3} />
          <TextInput
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setErr("");
            }}
            placeholder="you@email.com"
            placeholderTextColor={colors.ink3}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ flex: 1, fontFamily: F.semi, fontSize: 14, color: colors.ink }}
          />
        </View>

        {/* gender */}
        <Text style={{ marginTop: 12, fontFamily: F.extra, fontSize: 10, letterSpacing: 1.6, color: colors.ink3 }}>GENDER (OPTIONAL)</Text>
        <View style={{ marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {GENDERS.map((g) => (
            <Pressable
              key={g}
              onPress={() => {
                setGender(gender === g ? "" : g);
                blip(600);
              }}
              style={{
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor: gender === g ? "#E23744" : colors.chip,
              }}
            >
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: gender === g ? "#fff" : colors.ink2 }}>{g}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: 12, borderRadius: 14, backgroundColor: colors.chip, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 12, color: colors.ink3 }}>
            Logged in as <Text style={{ fontFamily: F.extra, color: colors.ink }}>{phone}</Text>
          </Text>
        </View>

        {err ? <Text style={{ marginTop: 8, fontFamily: F.bold, fontSize: 12, color: "#E23744" }}>{err}</Text> : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 36 }}>
        <Pressable
          onPress={save}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: "#E23744", paddingVertical: 16 }}
        >
          <Text style={{ fontFamily: F.extra, fontSize: 15, color: "#fff" }}>Continue</Text>
          <ArrowRight size={18} color="#fff" />
        </Pressable>
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Check size={13} color={colors.ink3} />
          <Text style={{ fontFamily: F.semi, fontSize: 11, color: colors.ink3 }}>You can edit this anytime from Profile</Text>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Non-blocking bottom sheet used from Profile → Edit profile, so users can
 * update their name, avatar, email or gender anytime after onboarding.
 */
export function EditProfileSheet({ onClose }: { onClose: () => void }) {
  const userName = useOSB((s) => s.userName);
  const userEmail = useOSB((s) => s.userEmail);
  const userGender = useOSB((s) => s.userGender);
  const userAvatar = useOSB((s) => s.userAvatar);
  const phone = useOSB((s) => s.phone);
  const completeProfile = useOSB((s) => s.completeProfile);
  const { colors } = useTheme();
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [gender, setGender] = useState(userGender);
  const [avatar, setAvatar] = useState(userAvatar || AVATARS[0]);
  const [err, setErr] = useState("");

  const save = () => {
    if (!name.trim()) {
      setErr("Please enter your name.");
      blip(320);
      return;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErr("That email doesn't look right.");
      blip(320);
      return;
    }
    completeProfile({ name: name.trim(), email: email.trim(), gender, avatar });
    blip(920, 0.15);
    onClose();
  };

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 58 }}>
      <Animated.View entering={FadeIn} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.5)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "92%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.app, overflow: "hidden" }}>
        <Animated.View entering={SlideInDown.springify().stiffness(tokens.ui.sheetSpring.stiffness).damping(tokens.ui.sheetSpring.damping)} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 }} keyboardShouldPersistTaps="handled">
            <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 999, backgroundColor: "rgba(0,0,0,.15)" }} />
            <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3, color: colors.ink }}>Edit profile</Text>
              <Pressable onPress={onClose} style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.chip }}>
                <X size={17} color={colors.ink} />
              </Pressable>
            </View>

            <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View style={{ height: 64, width: 64, alignItems: "center", justifyContent: "center", borderRadius: 32, backgroundColor: colors.chip }}>
                <Text style={{ fontSize: 30 }}>{avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.6, color: colors.ink3 }}>AVATAR</Text>
                <View style={{ marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {AVATARS.map((a) => (
                    <Pressable
                      key={a}
                      onPress={() => {
                        setAvatar(a);
                        blip(600);
                      }}
                      style={{
                        height: 32,
                        width: 32,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 8,
                        backgroundColor: avatar === a ? "#E23744" : colors.chip,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{a}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ marginTop: 16, gap: 10 }}>
              <View style={{ borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.6, color: colors.ink3 }}>FULL NAME *</Text>
                <TextInput
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    setErr("");
                  }}
                  placeholder="Your name"
                  placeholderTextColor={colors.ink3}
                  style={{ fontFamily: F.semi, fontSize: 13.5, color: colors.ink }}
                />
              </View>
              <View style={{ borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10 }}>
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.6, color: colors.ink3 }}>EMAIL</Text>
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setErr("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="you@email.com"
                  placeholderTextColor={colors.ink3}
                  style={{ fontFamily: F.medium, fontSize: 13, color: colors.ink }}
                />
              </View>
              <View>
                <Text style={{ fontFamily: F.extra, fontSize: 9.5, letterSpacing: 1.6, color: colors.ink3 }}>GENDER</Text>
                <View style={{ marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {GENDERS.map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => {
                        setGender(gender === g ? "" : g);
                        blip(600);
                      }}
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: gender === g ? "#E23744" : colors.chip,
                      }}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: gender === g ? "#fff" : colors.ink2 }}>{g}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={{ borderRadius: 13, backgroundColor: colors.chip, paddingHorizontal: 14, paddingVertical: 10 }}>
                <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: colors.ink3 }}>
                  Mobile number: <Text style={{ fontFamily: F.extra, color: colors.ink }}>{phone}</Text> (cannot be changed)
                </Text>
              </View>
            </View>

            {err ? <Text style={{ marginTop: 8, fontFamily: F.bold, fontSize: 12, color: "#E23744" }}>{err}</Text> : null}
            <Pressable onPress={save} style={{ marginTop: 16, borderRadius: 14, backgroundColor: "#0C831F", paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 14, color: "#fff" }}>Save changes</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}
