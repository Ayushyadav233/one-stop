import "../../global.css";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Fraunces_400Regular, Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useOSB } from "@/lib/osb-store";
import { ThemeProvider } from "@/theme/ThemeProvider";

// Reanimated 4.5.x logs "opacity may be overwritten by a layout animation"
// spuriously for nested entering animations — is codebase me koi `layout`
// animation hai hi nahi, isliye ye warning-only noise hai. Asli `layout`
// prop add ho to ye ignore hatana (warna real conflict chhup jayega).
LogBox.ignoreLogs([
  'Property "opacity" of AnimatedComponent(View) may be overwritten by a layout animation',
]);

// Mapbox native code ships only in dev-client / release builds — never in
// Expo Go, and a stale dev-client APK predates the module. A static import
// fatals this whole module on load (→ bogus "missing default export" +
// ErrorBoundary cascade in expo-router), so init lazily and fail soft.
try {
  const Mapbox = require("@rnmapbox/maps").default;
  Mapbox?.setAccessToken?.(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "");
} catch {
  // No native maps here — map screens render a placeholder (see map-osm.tsx).
  // Rebuild the dev client (`expo run:android`) to enable real maps.
}
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const dark = useOSB((s) => s.dark);
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider forced={dark ? "dark" : "light"}>
        <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
