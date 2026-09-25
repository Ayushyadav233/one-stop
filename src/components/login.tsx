"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { blip, useOSB } from "@/lib/osb-store";
import { cn } from "@/lib/cn";
import { Img } from "./ui";

const HERO = "https://images.pexels.com/photos/9609862/pexels-photo-9609862.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";

export function LoginScreen() {
  const { login, accounts } = useOSB();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [digits, setDigits] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [sec, setSec] = useState(30);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

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
    if (!valid) { setErr("Enter a valid 10-digit mobile number"); return; }
    setErr("");
    setSending(true);
    blip(720);
    setTimeout(() => {
      setSending(false);
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      blip(880);
      setTimeout(() => inputs.current[0]?.focus(), 80);
    }, 700);
  };

  const verify = (code: string[]) => {
    const v = code.join("");
    if (v.length < 6) return;
    if (v === "000000") { setErr("Invalid OTP. Try 123456"); blip(320); return; }
    blip(990, 0.16);
    login(digits);
  };

  const typeOtp = (i: number, val: string) => {
    const ch = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = ch;
    setOtp(next);
    setErr("");
    if (ch && i < 5) inputs.current[i + 1]?.focus();
    if (next.every(Boolean)) verify(next);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -16 }} className="absolute inset-0 z-[75] flex flex-col app-bg">
      <div className="relative h-[38%] min-h-[220px] overflow-hidden">
        <Img src={HERO} alt="bazar" className="absolute inset-0 h-full w-full" eager />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-transparent" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 35%, var(--surface) 100%)" }} />
        <div className="absolute left-5 top-12">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E23744] text-[22px] shadow-lg">🛍️</div>
          <div className="mt-3 text-[13px] font-black uppercase tracking-[0.22em] text-white/80 drop-shadow">One Stop Bazar</div>
          <h1 className="mt-1 font-display text-[28px] font-semibold leading-[1.05] text-white drop-shadow-lg">Everything<br />around you.</h1>
        </div>
      </div>

      <div className="surface relative -mt-4 flex flex-1 flex-col rounded-t-[28px] px-5 pb-8 pt-6 shadow-[0_-12px_40px_rgba(0,0,0,.12)]">
        <AnimatePresence mode="wait">
          {step === "phone" ? (
            <motion.div key="phone" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="flex flex-1 flex-col">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink3">Login or sign up</div>
              <h2 className="mt-1 text-[22px] font-extrabold tracking-tight">What’s your number?</h2>
              <p className="mt-1 text-[13px] font-medium text-ink2">We’ll send a one-time password. No password to remember.</p>

              <label className="mt-5 block">
                <span className="text-[10px] font-black uppercase tracking-widest text-ink3">Mobile number</span>
                <div className={cn("card mt-1.5 flex items-center gap-2 rounded-[16px] px-3.5 py-3.5", err && "ring-2 ring-[#E23744]")}>
                  <span className="shrink-0 text-[18px] leading-none">🇮🇳</span>
                  <span className="text-[16px] font-extrabold text-ink2">+91</span>
                  <span className="h-5 w-px" style={{ background: "var(--line)" }} />
                  <input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    value={digits}
                    onChange={(e) => { setDigits(e.target.value.replace(/\D/g, "").slice(0, 10)); setErr(""); }}
                    onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                    placeholder="98765 43210"
                    className="min-w-0 flex-1 bg-transparent text-[18px] font-extrabold tracking-[0.12em] placeholder:font-semibold placeholder:tracking-normal placeholder:text-ink3"
                  />
                </div>
              </label>
              {err && <p className="brand-red mt-2 text-[12px] font-bold">{err}</p>}
              {savedShop && <p className="mt-2 rounded-[12px] bg-[#0C831F]/10 px-3 py-2 text-[12px] font-bold text-green">Welcome back — {savedShop} opens after OTP. No re-register.</p>}

              <div className="mt-auto pt-6">
                <motion.button whileTap={{ scale: 0.97 }} disabled={!valid || sending} onClick={sendOtp} className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#E23744] py-4 text-[15px] font-extrabold text-white shadow-[0_16px_40px_rgba(226,55,68,.4)] disabled:opacity-40">
                  {sending ? "Sending OTP…" : <>Get OTP <ChevronRight size={18} /></>}
                </motion.button>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-ink3">By continuing you agree to our Terms & Privacy. OTP login only — no email, no password.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="otp" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="flex flex-1 flex-col">
              <button onClick={() => { setStep("phone"); setErr(""); }} className="mb-3 flex w-fit items-center gap-1 text-[12px] font-extrabold text-ink2"><ArrowLeft size={14} /> Change number</button>
              <h2 className="text-[22px] font-extrabold tracking-tight">Enter OTP</h2>
              <p className="mt-1 text-[13px] font-medium text-ink2">Sent to +91 {pretty}</p>

              <div className="mt-6 flex justify-between gap-2">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputs.current[i] = el; }}
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => typeOtp(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
                    }}
                    className={cn("card h-[54px] w-full rounded-[14px] text-center text-[22px] font-black", d && "ring-2 ring-[#E23744]")}
                  />
                ))}
              </div>
              {err && <p className="brand-red mt-2 text-[12px] font-bold">{err}</p>}
              <p className="mt-3 text-[12px] font-semibold text-ink3">
                {sec > 0 ? `Resend in 00:${String(sec).padStart(2, "0")}` : <button onClick={sendOtp} className="brand-red font-extrabold">Resend OTP</button>}
              </p>
              <p className="mt-2 text-[11px] font-medium text-ink3">Demo hint: any 6-digit OTP works (not 000000).</p>

              <div className="mt-auto pt-6">
                <motion.button whileTap={{ scale: 0.97 }} disabled={otp.join("").length < 6} onClick={() => verify(otp)} className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#E23744] py-4 text-[15px] font-extrabold text-white shadow-[0_16px_40px_rgba(226,55,68,.4)] disabled:opacity-40">
                  Verify & continue <Check size={18} strokeWidth={3} />
                </motion.button>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-ink3"><ShieldCheck size={13} /> Secure OTP • never shared with stores</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
