"use client";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Glass({ children, className, strong }: { children: ReactNode; className?: string; strong?: boolean }) {
  return <div className={cn(strong ? "glass-strong" : "glass", "rounded-[24px]", className)}>{children}</div>;
}

export function Pill({ children, className, tint }: { children: ReactNode; className?: string; tint?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-tight", className)}
      style={{ background: tint ?? "rgba(20,19,24,.06)", color: "inherit" }}
    >
      {children}
    </span>
  );
}

// Zomato-style rating pill — deep green
export function Rating({ v, className, count }: { v: number; className?: string; count?: string }) {
  const bg = v >= 4.5 ? "#256F3A" : v >= 4.0 ? "#3A833C" : v >= 3.5 ? "#CD7F32" : "#8C8C8C";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[8px] px-1.5 py-[3px] text-[11.5px] font-extrabold text-white", className)} style={{ background: bg }}>
      {v.toFixed(1)} <Star size={10} fill="currentColor" strokeWidth={0} />
      {count ? <span className="font-semibold opacity-80">({count})</span> : null}
    </span>
  );
}

export function SectionHead({ title, sub, action, light }: { title: string; sub?: string; action?: ReactNode; light?: boolean }) {
  return (
    <div className="flex items-end justify-between px-1">
      <div>
        <h3 className={cn("text-[17px] font-extrabold leading-none tracking-tight", light ? "text-white" : "text-ink")}>{title}</h3>
        {sub && <p className={cn("mt-1 text-[12px] font-medium", light ? "text-white/70" : "text-ink2")}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function SpringBtn({ children, onClick, className, style }: { children: ReactNode; onClick?: () => void; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.015 }} transition={{ type: "spring", stiffness: 500, damping: 28 }} onClick={onClick} className={className} style={style}>
      {children}
    </motion.button>
  );
}

// Blinkit-style ADD: white card, green border + shadow
export function AddStepper({ qty, onAdd, onInc, onDec, small }: { qty: number; onAdd: () => void; onInc: () => void; onDec: () => void; small?: boolean }) {
  if (qty === 0)
    return (
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        className={cn(
          "flex items-center justify-center gap-0.5 rounded-[10px] border bg-white font-extrabold uppercase tracking-wide text-[#0C831F] shadow-[0_4px_12px_rgba(12,131,31,.18)]",
          small ? "h-[30px] w-[72px] text-[12px]" : "h-[36px] w-[88px] text-[13px]"
        )}
        style={{ borderColor: "#0C831F", borderWidth: 1.5 }}
      >
        ADD
      </motion.button>
    );
  return (
    <motion.div
      layout
      onClick={(e) => e.stopPropagation()}
      className={cn("flex items-center justify-between rounded-[10px] bg-[#0C831F] text-white shadow-[0_6px_16px_rgba(12,131,31,.35)]", small ? "h-[30px] w-[72px] px-1" : "h-[36px] w-[88px] px-1.5")}
    >
      <button onClick={onDec} className="grid h-6 w-6 place-items-center rounded-md text-[18px] font-black leading-none">−</button>
      <span className={cn("min-w-[16px] text-center font-extrabold tabular-nums", small ? "text-[13px]" : "text-[14px]")}>{qty}</span>
      <button onClick={onInc} className="grid h-6 w-6 place-items-center rounded-md text-[18px] font-black leading-none">+</button>
    </motion.div>
  );
}

export function Img({ src, alt, className, eager }: { src: string; alt: string; className?: string; eager?: boolean }) {
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} draggable={false} className={cn("select-none object-cover", className)} referrerPolicy="no-referrer" />;
}

export function AreaGraph({ values, color = "#0E3B2E", height = 88 }: { values: number[]; color?: string; height?: number }) {
  const max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 300},${height - 8 - (v / max) * (height - 24)}`).join(" ");
  const id = "g" + Math.abs(values.reduce((a, b) => a + b, 0)).toString(36);
  return (
    <svg viewBox={`0 0 300 ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} 300,${height}`} fill={`url(#${id})`} />
      <motion.polyline points={pts} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
      {values.map((v, i) => (
        <circle key={i} cx={(i / (values.length - 1)) * 300} cy={height - 8 - (v / max) * (height - 24)} r={i === values.length - 2 ? 4.5 : 2.4} fill={i === values.length - 2 ? color : "#fff"} stroke={color} strokeWidth={2} />
      ))}
    </svg>
  );
}

export function Ring({ pct, size = 92, label }: { pct: number; size?: number; label?: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(127,127,140,.18)" strokeWidth={9} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke="#1FB67C" strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (c * pct) / 100 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-[22px] font-bold leading-none text-ink">{pct}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-ink3">{label ?? "health"}</div>
      </div>
    </div>
  );
}

export function VegMark({ veg }: { veg: boolean }) {
  return (
    <span className={`grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[4px] border-[1.5px] ${veg ? "border-[#0C831F]" : "border-[#B71C1C]"} bg-white`}>
      <span className={`h-[7px] w-[7px] rounded-full ${veg ? "bg-[#0C831F]" : "bg-[#B71C1C]"}`} style={!veg ? { clipPath: "polygon(50% 0,100% 100%,0 100%)", borderRadius: 0 } : undefined} />
    </span>
  );
}
