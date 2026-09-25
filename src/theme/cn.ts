/** cn port — identical to src/lib/cn.ts:1-3, shared web + native. */
export function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
