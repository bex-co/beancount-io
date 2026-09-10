import { useEffect, useMemo, useState } from "react";
import { ThemeProviderContext } from "./context.ts";
import type { ResolvedTheme, Theme } from "./type.ts";
import {
  getSystemTheme,
  subscribeSystemTheme,
  THEME_STORAGE_KEY,
} from "./utils.ts";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

const isValidTheme = (value: string | null): value is Theme => {
  return value !== null && ["dark", "light", "system"].includes(value);
};

const getThemeFromQuery = (): Theme | null => {
  if (typeof window === "undefined") return null; // SSR guard
  const params = new URLSearchParams(window.location.search);
  const themeParam = params.get("theme");
  if (isValidTheme(themeParam)) {
    return themeParam;
  }
  return null;
};

const getThemeFromStorage = (storageKey: string): Theme | null => {
  if (typeof window === "undefined") return null; // SSR guard
  const storedTheme = localStorage.getItem(storageKey);
  if (isValidTheme(storedTheme)) {
    return storedTheme;
  }
  return null;
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = THEME_STORAGE_KEY,
  ...props
}: ThemeProviderProps) {
  // Track hydration state to prevent hydration mismatch
  const [isHydrated, setIsHydrated] = useState(false);

  // Get initial theme - prefer SSR-injected theme over defaultTheme
  const getInitialTheme = (): Theme => {
    // In SSR, always use defaultTheme
    if (typeof window === "undefined") {
      return defaultTheme;
    }

    // In browser, check if SSR injected theme
    if (window.__THEME__) {
      return window.__THEME__; // SSR theme is "light" or "dark", safe to use as Theme
    }

    // Fallback to defaultTheme
    return defaultTheme;
  };

  // Always start with defaultTheme to match server-side rendering
  // This prevents hydration mismatch
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [systemTheme, setSystemTheme] =
    useState<ResolvedTheme>(getSystemTheme);

  // After first render (hydration complete), mark as hydrated
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional for hydration tracking
    setIsHydrated(true);
  }, []);

  // After hydration, load theme from URL query param or localStorage
  // Priority: URL query param > localStorage > defaultTheme
  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration to complete

    const queryTheme = getThemeFromQuery();
    if (queryTheme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional theme loading after hydration
      setTheme(queryTheme);
      return;
    }
    const storedTheme = getThemeFromStorage(storageKey);
    if (storedTheme) {
      setTheme(storedTheme);
    }
    // If neither exists, keep defaultTheme (already set)
  }, [storageKey, isHydrated]);

  // Keep system appearance reactive while the preference is "system".
  useEffect(() => {
    if (!isHydrated) return;
    setSystemTheme(getSystemTheme());
    return subscribeSystemTheme(setSystemTheme);
  }, [isHydrated]);

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? systemTheme : theme;

  // Apply theme to DOM by adding/removing class on <html> element
  // ONLY apply after hydration to prevent mismatch
  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration to complete

    const root = window.document.documentElement;

    // Detect currently applied theme from DOM class
    const currentClass = root.classList.contains("dark")
      ? "dark"
      : root.classList.contains("light")
        ? "light"
        : null;

    // Only update DOM if theme actually changed (prevents unnecessary reflows)
    if (currentClass !== resolvedTheme) {
      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
    }
  }, [resolvedTheme, isHydrated]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next: Theme) => {
        localStorage.setItem(storageKey, next);

        // Sync theme to cookie for SSR theme detection
        // This ensures server can detect theme on next request
        // Cookie expires in 1 year (same as typical localStorage behavior)
        try {
          document.cookie = `vite-ui-theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
        } catch {
          // Ignore cookie errors (incognito mode, etc.)
        }

        setTheme(next);
      },
    }),
    [theme, resolvedTheme, storageKey],
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

/* eslint-disable-next-line react-refresh/only-export-components */
export { useTheme, useIsDarkTheme } from "./hooks.ts";
