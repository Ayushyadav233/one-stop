"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Mail, Sparkles, User, X } from "lucide-react";
import { useState } from "react";
import { blip, useOSB } from "@/lib/osb-store";
import { cn } from "@/lib/cn";

const AVATARS = ["🧑", "👩", "🧔", "👨‍🦱", "👩‍🦰", "🧕", "👴", "👵", "🧑‍🍳", "🧑‍💼", "🧑‍🎨", "🦸"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

/**
 * Shown once right after OTP verification (for any brand-new or incomplete
 * account — customer, provider or rider identity) so the app always has a
 * real name to greet with, print on bills, and show across the experience.
 */
export function ProfileSetupScreen() {
  const { phone, completeProfile, userName, logout } = useOSB();
  const [name, setName] = useState(userName || "");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [err, setErr] = useState("");

  const save = () => {
    if (!name.trim()) { setErr("Please tell us your name."); blip(320); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("That email doesn't look right."); blip(320); return; }
    blip(920, 0.16);
    completeProfile({ name: name.trim(), email: email.trim(), gender, avatar });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -16 }} className="absolute inset-0 z-[74] flex flex-col app-bg">
      <div className="flex items-center justify-between px-5 pt-7">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E23744] text-[16px]">🛍️</span>
          <span className="text-[12px] font-black uppercase tracking-[0.18em] text-ink3">One Stop Bazar</span>
        </div>
        <button onClick={() => { logout(); blip(400); }} className="text-[12px] font-extrabold text-ink3">Use another number</button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6 pt-4">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-green"><Sparkles size={13} /> Almost there</div>
        <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight">Set up your profile</h1>
        <p className="mt-1 text-[13px] font-medium text-ink2">This name shows on your orders, bills and to shopkeepers you deal with.</p>

        {/* avatar picker */}
        <div className="mt-6 flex items-center gap-4">
          <div className="chip grid h-20 w-20 shrink-0 place-items-center rounded-full text-[38px] ring-2 ring-[#E23744]/60">{avatar}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-black uppercase tracking-widest text-ink3">Choose an avatar</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => { setAvatar(a); blip(600); }}
                  className={cn("grid h-9 w-9 place-items-center rounded-xl text-[18px]", avatar === a ? "bg-[#E23744] text-white" : "chip")}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* name */}
        <label className="mt-6 block">
          <span className="text-[10px] font-black uppercase tracking-widest text-ink3">Full name *</span>
          <div className={cn("card mt-1.5 flex items-center gap-2.5 rounded-[16px] px-3.5 py-3.5", err && !name.trim() && "ring-2 ring-[#E23744]")}>
            <User size={17} className="shrink-0 text-ink3" />
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setErr(""); }}
              placeholder="e.g. Priya Sharma"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-bold placeholder:text-ink3"
            />
          </div>
        </label>

        {/* email */}
        <label className="mt-3 block">
          <span className="text-[10px] font-black uppercase tracking-widest text-ink3">Email (optional)</span>
          <div className="card mt-1.5 flex items-center gap-2.5 rounded-[16px] px-3.5 py-3.5">
            <Mail size={17} className="shrink-0 text-ink3" />
            <input
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(""); }}
              placeholder="you@email.com"
              inputMode="email"
              className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold placeholder:text-ink3"
            />
          </div>
        </label>

        {/* gender */}
        <div className="mt-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-ink3">Gender (optional)</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {GENDERS.map((g) => (
              <button
                key={g}
                onClick={() => { setGender(gender === g ? "" : g); blip(600); }}
                className={cn("rounded-full px-3.5 py-2 text-[12px] font-bold", gender === g ? "bg-[#E23744] text-white" : "chip")}
                style={gender === g ? undefined : { color: "var(--ink-2)" }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="chip mt-3 rounded-[14px] px-3.5 py-3 text-[12px] font-semibold">
          <span style={{ color: "var(--ink-3)" }}>Logged in as </span><span>{phone}</span>
        </div>

        {err && <p className="brand-red mt-2 text-[12px] font-bold">{err}</p>}
      </div>

      <div className="px-5 pb-9">
        <motion.button whileTap={{ scale: 0.97 }} onClick={save} className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#E23744] py-4 text-[15px] font-extrabold text-white shadow-[0_16px_40px_rgba(226,55,68,.4)]">
          Continue <ArrowRight size={18} />
        </motion.button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-ink3"><Check size={13} /> You can edit this anytime from Profile</p>
      </div>
    </motion.div>
  );
}

/**
 * Non-blocking bottom sheet used from Profile → Edit profile, so users can
 * update their name, avatar, email or gender anytime after onboarding.
 */
export function EditProfileSheet({ onClose }: { onClose: () => void }) {
  const { userName, userEmail, userGender, userAvatar, phone, completeProfile } = useOSB();
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [gender, setGender] = useState(userGender);
  const [avatar, setAvatar] = useState(userAvatar || AVATARS[0]);
  const [err, setErr] = useState("");

  const save = () => {
    if (!name.trim()) { setErr("Please enter your name."); blip(320); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("That email doesn't look right."); blip(320); return; }
    completeProfile({ name: name.trim(), email: email.trim(), gender, avatar });
    blip(920, 0.15);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[58] bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: "94%" }} animate={{ y: 0 }} exit={{ y: "94%" }} transition={{ type: "spring", stiffness: 230, damping: 30 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[92%] overflow-hidden rounded-t-[26px] app-bg">
        <div className="no-scrollbar max-h-[92vh] overflow-y-auto px-4 pb-10 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-black/15" />
          <div className="mt-3 flex items-center justify-between">
            <h3 className="text-[18px] font-extrabold tracking-tight">Edit profile</h3>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full chip"><X size={17} /></button>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full chip text-[30px]">{avatar}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[9.5px] font-black uppercase tracking-widest text-ink3">Avatar</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {AVATARS.map((a) => (
                  <button key={a} onClick={() => { setAvatar(a); blip(600); }} className={cn("grid h-8 w-8 place-items-center rounded-lg text-[16px]", avatar === a ? "bg-[#E23744] text-white" : "chip")}>{a}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <label className="block rounded-[13px] card px-3.5 py-2.5 shadow-card">
              <span className="block text-[9.5px] font-black uppercase tracking-widest text-ink3">Full name *</span>
              <input value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} placeholder="Your name" className="w-full bg-transparent text-[13.5px] font-semibold placeholder:text-ink3" />
            </label>
            <label className="block rounded-[13px] card px-3.5 py-2.5 shadow-card">
              <span className="block text-[9.5px] font-black uppercase tracking-widest text-ink3">Email</span>
              <input value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} inputMode="email" placeholder="you@email.com" className="w-full bg-transparent text-[13px] font-medium placeholder:text-ink3" />
            </label>
            <div>
              <span className="text-[9.5px] font-black uppercase tracking-widest text-ink3">Gender</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {GENDERS.map((g) => (
                  <button key={g} onClick={() => { setGender(gender === g ? "" : g); blip(600); }} className={cn("rounded-full px-3 py-1.5 text-[11.5px] font-bold", gender === g ? "bg-[#E23744] text-white" : "chip text-ink2")}>{g}</button>
                ))}
              </div>
            </div>
            <div className="rounded-[13px] chip px-3.5 py-2.5 text-[11.5px] font-semibold text-ink3">Mobile number: <span className="text-ink">{phone}</span> (cannot be changed)</div>
          </div>

          {err && <p className="mt-2 text-[12px] font-bold text-[#E23744]">{err}</p>}
          <button onClick={save} className="mt-4 w-full rounded-[14px] bg-[#0C831F] py-4 text-[14px] font-extrabold text-white">Save changes</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
