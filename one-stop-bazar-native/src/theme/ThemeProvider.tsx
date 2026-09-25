/**
 * ThemeProvider — RN port of `.dark-scope` (globals.css:43-64) + osb-store `dark`.
 * Web: <div className={dark && "dark-scope"}>. RN: context + Appearance.
 */
import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { dark, light, type ThemeColors, type ThemeName } from "./tokens";

const ThemeContext = createContext<{ name: ThemeName; colors: ThemeColors }>({ name: "light", colors: light });

export function ThemeProvider({
  forced,
  children,
}: {
  /** pass useOSB(s=>s.dark) ? "dark" : "light" — if omitted, follows OS Appearance */
  forced?: ThemeName | null;
  children: React.ReactNode;
}) {
  const os = useColorScheme();
  const name: ThemeName = forced ?? (os === "dark" ? "dark" : "light");
  const value = useMemo(() => ({ name, colors: name === "dark" ? dark : light }), [name]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
