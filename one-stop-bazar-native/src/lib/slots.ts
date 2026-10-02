/**
 * Auto-slot engine for home services (Urban Company style, offline-first).
 *
 * Provider sets: openTime/closeTime + workDays + slots-per-day (= service stock).
 * This file PURELY derives bookable windows — no backend needed day-1.
 * Booked counts come from local orders (fail-soft: unknown = available).
 */

export interface SlotWindow {
  /** ms epoch of window start */
  at: number;
  /** "10:00 AM" */
  label: string;
  /** past ya day-capacity full */
  full: boolean;
}

export interface SlotDay {
  /** yyyy-m-d */
  key: string;
  /** "Today" | "Tomorrow" | "Sun 5" */
  label: string;
  weekday: number;
  windows: SlotWindow[];
  full: boolean;
}

export function parseHM(hm: string, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})/.exec((hm || "").trim());
  if (!m) return fallback;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return h * 60 + min;
}

/** "60 mins" / "2 days" / "30 min" -> minutes (days capped to same-day windows). */
export function durationMins(eta: string | null | undefined, fallback = 30): number {
  const m = /(\d+)\s*(day|hour|hr|min)/i.exec(eta || "");
  if (!m) return fallback;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  if (u.startsWith("day")) return Math.min(480, Math.max(30, n * 60));
  if (u.startsWith("hour") || u.startsWith("hr")) return Math.min(480, Math.max(15, n * 60));
  return Math.min(480, Math.max(15, n));
}

function fmtTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface SlotOpts {
  openTime: string;
  closeTime: string;
  workDays?: number[] | null;
  advanceDays?: number | null;
  durationMins: number;
  capacityPerDay: number;
  /** dayKey -> already booked count */
  bookedPerDay?: Record<string, number>;
  now?: number;
}

/** Next N bookable days with time windows. Windows step = service duration. */
export function generateSlotDays(o: SlotOpts): SlotDay[] {
  const now = new Date(o.now ?? Date.now());
  const work = o.workDays && o.workDays.length ? o.workDays : [0, 1, 2, 3, 4, 5, 6];
  const adv = Math.min(14, Math.max(1, o.advanceDays ?? 7));
  const openMin = parseHM(o.openTime, 9 * 60);
  let closeMin = parseHM(o.closeTime, 21 * 60);
  if (closeMin <= openMin) closeMin = openMin + 4 * 60;
  const dur = Math.min(240, Math.max(15, Math.round(o.durationMins) || 30));
  const cap = Math.max(1, Math.round(o.capacityPerDay) || 8);
  const booked = o.bookedPerDay ?? {};
  const days: SlotDay[] = [];
  for (let d = 0; d < adv; d++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    if (!work.includes(date.getDay())) continue;
    const key = dayKey(date);
    const label = d === 0 ? "Today" : d === 1 ? "Tomorrow" : `${WD[date.getDay()]} ${date.getDate()}`;
    const dayFull = (booked[key] ?? 0) >= cap;
    const windows: SlotWindow[] = [];
    for (let t = openMin; t + 15 <= closeMin; t += dur) {
      const w = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(t / 60), t % 60);
      const past = w.getTime() <= now.getTime() + 15 * 60 * 1000;
      windows.push({ at: w.getTime(), label: fmtTime(w), full: dayFull || past });
    }
    days.push({ key, label, weekday: date.getDay(), windows, full: dayFull || windows.every((w) => w.full) });
  }
  return days;
}

/** First free window (ASAP). Null = kuch khaali nahi. */
export function firstFreeWindow(days: SlotDay[]): { day: SlotDay; window: SlotWindow } | null {
  for (const day of days) {
    const w = day.windows.find((x) => !x.full);
    if (w) return { day, window: w };
  }
  return null;
}

/** "Tomorrow, 10:00 AM" jaisa booking label. */
export function slotLabel(dayLabel: string, windowLabel: string, asap: boolean): string {
  return asap ? `ASAP • ${dayLabel}, ${windowLabel}` : `${dayLabel}, ${windowLabel}`;
}
