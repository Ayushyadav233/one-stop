/**
 * Hardware back-button support (Android) for the state-based navigation.
 * expo-router has a single route, so the OS default would just exit the app.
 *
 * Pattern: every full-screen overlay registers its onClose while visible.
 * The most-recently-opened overlay closes first (LIFO). When nothing is
 * open, ShellBody falls back to tab/mode navigation, then double-press exit.
 */
import { useEffect, useRef } from "react";

type Entry = { close: () => void };
const stack: Entry[] = [];

function removeEntry(e: Entry) {
  const i = stack.lastIndexOf(e);
  if (i >= 0) stack.splice(i, 1);
}

/** Pop the topmost overlay closer (ShellBody's BackHandler uses this). */
export function popBackCloser(): Entry | undefined {
  return stack.pop();
}

/**
 * Register an overlay's closer while `active` is true.
 * `onClose` identity may change every render — the stored entry always
 * calls the latest one, and stack ORDER never shuffles on re-render.
 */
export function useSheetBackCloser(active: boolean, onClose: () => void) {
  const ref = useRef<Entry | null>(null);
  if (!ref.current) ref.current = { close: () => {} };
  ref.current.close = onClose;
  useEffect(() => {
    if (!active) return;
    const entry = ref.current!;
    stack.push(entry);
    return () => removeEntry(entry);
  }, [active]);
}
