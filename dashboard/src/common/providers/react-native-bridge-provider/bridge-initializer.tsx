import { useEffect, useRef } from "react";
import { useTheme } from "@/common/providers/theme-provider";
import type { Theme } from "@/common/providers/theme-provider/type";
import { initReactNativeBridge } from "./react-native-bridge";

/**
 * Bridge Initializer Component
 *
 * Initializes the React Native bridge with theme context access.
 * This component must be rendered inside ThemeProvider to access theme functions.
 */
export function BridgeInitializer() {
  const { theme, setTheme } = useTheme();
  const initializedRef = useRef(false);
  const themeRef = useRef<Theme>(theme);
  const setThemeRef = useRef(setTheme);

  // Keep refs in sync with current values
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    setThemeRef.current = setTheme;
  }, [setTheme]);

  useEffect(() => {
    // Initialize bridge only once with theme functions from context
    // Use refs to ensure functions always access current values
    if (!initializedRef.current) {
      initReactNativeBridge({
        getTheme: () => themeRef.current,
        setTheme: (newTheme: Theme) => {
          setThemeRef.current(newTheme);
        },
      });
      initializedRef.current = true;
    }
  }, []);

  return null;
}
