/**
 * Order chat — in-app customer↔store thread (1 order = 1 thread).
 * Server reachable → backend thread + 8s polling + push-unread.
 * Server nahi/local-only order → local thread (same device, honest note).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { blip, useOSB, type ChatMsg } from "@/lib/osb-store";
import { apiGetChat, apiSendChat } from "@/lib/api";
import { timeAgo } from "@/lib/commerce";
import { useSheetBackCloser } from "@/lib/back";
import { useTheme } from "@/theme/ThemeProvider";
import { F } from "./ui";

export function ChatSheet() {
  const chatOrderId = useOSB((s) => s.chatOrderId);
  const closeChat = useOSB((s) => s.closeChat);
  useSheetBackCloser(!!chatOrderId, closeChat);
  if (!chatOrderId) return null;
  return <ChatBody key={chatOrderId} orderId={chatOrderId} onClose={closeChat} />;
}

function ChatBody({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const orders = useOSB((s) => s.orders);
  const sellerOrders = useOSB((s) => s.sellerOrders);
  const chatRole = useOSB((s) => s.chatRole);
  const markChatSeen = useOSB((s) => s.markChatSeen);
  const { colors } = useTheme();
  const order = orders.find((o) => o.id === orderId) ?? sellerOrders.find((o) => o.id === orderId);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [role, setRole] = useState<"customer" | "store">(chatRole);
  const [local, setLocal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const otherName = !order ? "Chat" : role === "customer" ? ("storeName" in order ? order.storeName : "Store") : order.customer;

  const load = useCallback(async (silent: boolean) => {
    const j = await apiGetChat(orderId);
    if (!j?.ok) {
      if (!silent) { setLocal(true); setLoading(false); }
      return;
    }
    setLocal(false);
    if (j.role === "store" || j.role === "customer") setRole(j.role);
    setMsgs(
      (j.messages ?? []).map((m) => ({ id: String(m.id), sender: String(m.sender), text: String(m.text), createdAt: String(m.createdAt) }))
    );
    setLoading(false);
    markChatSeen(orderId);
  }, [orderId, markChatSeen]);

  useEffect(() => {
    markChatSeen(orderId);
    void load(false);
    const t = setInterval(() => { void load(true); }, 8000);
    return () => clearInterval(t);
  }, [orderId, load, markChatSeen]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [msgs.length]);

  if (!order) return null;

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setErr("");
    blip(760);
    if (local) {
      // Local-only thread (server pe order/thread nahi) — same device history.
      const m: ChatMsg = { id: `local-${Date.now()}`, sender: role, text: text.slice(0, 500), createdAt: new Date().toISOString() };
      setMsgs((prev) => [...prev, m]);
      setDraft("");
      setSending(false);
      markChatSeen(orderId);
      return;
    }
    const j = await apiSendChat(orderId, text);
    if (j?.ok && j.message) {
      setMsgs((prev) => [...prev, { id: String(j.message!.id), sender: String(j.message!.sender), text: String(j.message!.text), createdAt: String(j.message!.createdAt) }]);
      setDraft("");
      markChatSeen(orderId);
    } else {
      setErr("Message nahi gaya — internet check karke retry karo.");
    }
    setSending(false);
  };

  const mine = (m: ChatMsg) => m.sender === role;

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 65 }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.5)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
      <Animated.View entering={SlideInDown.springify().stiffness(250).damping(30)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.app, overflow: "hidden" }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12 }}>
          <View style={{ alignSelf: "center", height: 6, width: 48, borderRadius: 999, backgroundColor: "rgba(0,0,0,.15)" }} />
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ height: 42, width: 42, borderRadius: 21, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 20 }}>{role === "customer" ? "🏪" : "👤"}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.extra, fontSize: 14.5, color: colors.ink }}>{otherName}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.ink3 }}>
                {order.code}{local ? " • offline thread (same device)" : " • order chat"}
              </Text>
            </View>
            <Pressable onPress={onClose} style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.extra, fontSize: 14, color: colors.ink }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 8, gap: 8, minHeight: 220 }}
          >
            {loading ? (
              <Text style={{ marginTop: 60, fontFamily: F.medium, fontSize: 12, color: colors.ink3, textAlign: "center" }}>Loading chat…</Text>
            ) : msgs.length === 0 ? (
              <View style={{ marginTop: 40, alignItems: "center" }}>
                <Text style={{ fontSize: 34 }}>💬</Text>
                <Text style={{ marginTop: 8, fontFamily: F.extra, fontSize: 13.5, color: colors.ink }}>Say hello!</Text>
                <Text style={{ marginTop: 2, maxWidth: 260, fontFamily: F.medium, fontSize: 11.5, lineHeight: 16, color: colors.ink3, textAlign: "center" }}>
                  {role === "customer" ? "Slot, address ya service detail confirm karo." : "Customer se slot/address confirm karo."}
                </Text>
              </View>
            ) : (
              msgs.map((m) => (
                <View key={m.id} style={{ alignItems: mine(m) ? "flex-end" : "flex-start" }}>
                  <View style={{ maxWidth: "80%", borderRadius: 14, borderTopRightRadius: mine(m) ? 4 : 14, borderTopLeftRadius: mine(m) ? 14 : 4, backgroundColor: mine(m) ? "#0C831F" : colors.card, borderWidth: mine(m) ? 0 : 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: mine(m) ? "#fff" : colors.ink }}>{m.text}</Text>
                    <Text style={{ marginTop: 2, fontFamily: F.medium, fontSize: 9.5, color: mine(m) ? "rgba(255,255,255,.7)" : colors.ink3, textAlign: "right" }}>
                      {timeAgo(new Date(m.createdAt).getTime())}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {err ? <Text style={{ marginBottom: 6, fontFamily: F.bold, fontSize: 11.5, color: "#E23744" }}>{err}</Text> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message…"
              placeholderTextColor={colors.ink3}
              multiline
              maxLength={500}
              style={{ flex: 1, maxHeight: 100, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 11, fontFamily: F.medium, fontSize: 13.5, color: colors.ink }}
            />
            <Pressable onPress={() => void send()} disabled={sending || !draft.trim()} style={{ height: 46, width: 46, borderRadius: 23, backgroundColor: !draft.trim() ? colors.chip : "#0C831F", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 18, color: "#fff" }}>{sending ? "…" : "↑"}</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
