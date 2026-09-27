import type { Context, Next } from "hono";

// ── tiny colored logger (no deps, PowerShell-safe ANSI) ──

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
} as const;

type Level = "info" | "ok" | "warn" | "error" | "req";

const levelColor: Record<Level, string> = {
  info: C.blue,
  ok: C.green,
  warn: C.yellow,
  error: C.red,
  req: C.cyan,
};

function ts(): string {
  // "27-09 14:03:22" — short, readable in dev logs
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function log(level: Level, msg: string, extra = "") {
  const tag = `${levelColor[level]}${level.toUpperCase().padEnd(5)}${C.reset}`;
  const tail = extra ? ` ${C.dim}${extra}${C.reset}` : "";
  console.log(`${C.dim}${ts()}${C.reset} ${tag} ${msg}${tail}`);
}

export const logInfo = (m: string, e = "") => log("info", m, e);
export const logOk = (m: string, e = "") => log("ok", m, e);
export const logWarn = (m: string, e = "") => log("warn", m, e);
export const logError = (m: string, e = "") => log("error", m, e);

// ── request logger middleware ──
// Har request pe 1 line IN + 1 line OUT:
//   → GET /api/stores [q7f3] from ::1
//   ← 200 GET /api/stores [q7f3] 18ms (user 98765*****)

let seq = 0;

function shortId(): string {
  seq = (seq + 1) % 46656;
  return `${Date.now().toString(36).slice(-2)}${seq.toString(36).padStart(2, "0")}`;
}

export function maskPhone(p: unknown): string {
  const s = String(p ?? "");
  if (s.length <= 4) return s;
  return `${s.slice(0, 2)}****${s.slice(-2)}`;
}

function clientIp(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    // @hono/node-server address info nahi deta, isliye env fallback
    "local"
  );
}

function statusColor(status: number): string {
  if (status >= 500) return C.red;
  if (status >= 400) return C.yellow;
  if (status >= 300) return C.magenta;
  return C.green;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Health probes har 2s me aate hain (Render + dev tools) — success pe silent,
// fail hue to dikhenge. Baaki GET pe sirf OUT line; mutation pe IN+OUT.
function isProbe(method: string, path: string): boolean {
  return method === "GET" && (path === "/" || path === "/api/health" || path === "/api/health/");
}

const SLOW_MS = Number(process.env.LOG_SLOW_MS ?? 1000);

export async function requestLogger(c: Context, next: Next) {
  const id = shortId();
  const method = c.req.method;
  const path = c.req.path;
  const probe = isProbe(method, path);
  const verbose = MUTATING.has(method);
  const query = verbose ? c.req.query() : {};
  const qStr = Object.keys(query).length ? ` ?${new URLSearchParams(query).toString().slice(0, 120)}` : "";
  const ip = clientIp(c);
  const start = Date.now();

  c.set("reqId" as never, id as never);
  c.header("X-Request-Id", id);

  // IN — sirf mutation pe (GET ka IN line noise hai); body kabhi mat padho
  if (verbose && !probe) {
    console.log(
      `${C.dim}${ts()}${C.reset} ${C.cyan}→${C.reset} ${method} ${path}${C.dim}${qStr} [${id}] from ${ip}${C.reset}`,
    );
  }

  try {
    await next();
  } catch (e) {
    const ms = Date.now() - start;
    logError(`✖ ${method} ${path} [${id}] threw in ${ms}ms`, String(e).slice(0, 300));
    throw e;
  }

  const ms = Date.now() - start;
  const status = c.res.status;
  // Probe success = bilkul silent. Fail probe + baaki sab = 1 line.
  if (probe && status < 400) return;
  let who = "";
  try {
    const u = c.get("user" as never) as { phone?: unknown } | undefined;
    if (u?.phone) who = ` (user ${maskPhone(u.phone)})`;
  } catch {
    /* user set nahi — normal for public routes */
  }
  const slow = ms >= SLOW_MS ? " SLOW" : "";
  const sc = slow ? C.yellow : statusColor(status);
  console.log(
    `${C.dim}${ts()}${C.reset} ${sc}← ${status}${C.reset} ${method} ${path} ${C.dim}[${id}] ${ms}ms${slow}${who}${C.reset}`,
  );
}
