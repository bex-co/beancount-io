import i18n from "@/i18n/init";
import type { Theme } from "@/common/providers/theme-provider/type";

/**
 * React Native Bridge using Custom Events
 *
 * Provides an event-based bridge between React Native and the webview.
 * Uses CustomEvent API for cleaner, more testable code.
 */

// Extend window interface for ReactNativeWebView
declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

// Event types
export const RN_EVENTS = {
  CHANGE_LANGUAGE: "rn:changeLanguage",
  GET_LANGUAGE: "rn:getLanguage",
  GET_SUPPORTED_LANGUAGES: "rn:getSupportedLanguages",
  CHANGE_THEME: "rn:changeTheme",
  GET_THEME: "rn:getTheme",
  GET_SUPPORTED_THEMES: "rn:getSupportedThemes",
} as const;

// Event detail types
export interface ChangeLanguageDetail {
  language: string;
}

export interface GetLanguageResponseDetail {
  language: string;
}

export interface GetSupportedLanguagesResponseDetail {
  languages: readonly string[];
}

export interface ChangeThemeDetail {
  theme: Theme;
}

export interface GetThemeResponseDetail {
  theme: Theme;
}

export interface GetSupportedThemesResponseDetail {
  themes: readonly Theme[];
}

// Theme constants
const SUPPORTED_THEMES: readonly Theme[] = ["light", "dark", "system"] as const;

/**
 * Theme functions interface for bridge initialization
 */
export interface ThemeFunctions {
  getTheme: () => Theme;
  setTheme: (theme: Theme) => void;
}

/**
 * Initialize the React Native bridge
 *
 * Sets up event listeners for React Native messages and handles
 * language and theme synchronization.
 *
 * @param themeFunctions - Optional theme functions from ThemeProvider context.
 *                         If not provided, theme functionality will be disabled.
 */
export function initReactNativeBridge(themeFunctions?: ThemeFunctions): void {
  // Listen for language change requests from React Native
  window.addEventListener(RN_EVENTS.CHANGE_LANGUAGE, async (event: Event) => {
    const customEvent = event as CustomEvent<ChangeLanguageDetail>;
    const { language } = customEvent.detail;

    try {
      // Validate language is supported
      const supportedLangs = i18n.options.supportedLngs as readonly string[];

      if (!supportedLangs || !supportedLangs.includes(language)) {
        console.warn(
          `[ReactNativeBridge] Unsupported language: ${language}. ` +
            `Supported languages: ${supportedLangs?.join(", ")}`,
        );
        return;
      }

      // Change language
      await i18n.changeLanguage(language);
    } catch (error) {
      console.error("[ReactNativeBridge] Failed to change language:", error);
    }
  });

  // Listen for get current language requests
  window.addEventListener(RN_EVENTS.GET_LANGUAGE, () => {
    window.dispatchEvent(
      new CustomEvent<GetLanguageResponseDetail>(
        `${RN_EVENTS.GET_LANGUAGE}:response`,
        {
          detail: {
            language: i18n.language,
          },
        },
      ),
    );
  });

  // Listen for get supported languages requests
  window.addEventListener(RN_EVENTS.GET_SUPPORTED_LANGUAGES, () => {
    window.dispatchEvent(
      new CustomEvent<GetSupportedLanguagesResponseDetail>(
        `${RN_EVENTS.GET_SUPPORTED_LANGUAGES}:response`,
        {
          detail: {
            languages: (i18n.options.supportedLngs as readonly string[]) || [],
          },
        },
      ),
    );
  });

  // Listen for theme change requests from React Native
  if (themeFunctions) {
    window.addEventListener(RN_EVENTS.CHANGE_THEME, (event: Event) => {
      const customEvent = event as CustomEvent<ChangeThemeDetail>;
      const { theme } = customEvent.detail;

      try {
        // Validate theme is supported
        if (!SUPPORTED_THEMES.includes(theme)) {
          console.warn(
            `[ReactNativeBridge] Unsupported theme: ${theme}. ` +
              `Supported themes: ${SUPPORTED_THEMES.join(", ")}`,
          );
          return;
        }

        const previousTheme = themeFunctions.getTheme();

        // Change theme using context
        themeFunctions.setTheme(theme);

        // Notify React Native of theme change
        if (isReactNative()) {
          postMessageToReactNative("themeChanged", {
            theme,
            previousTheme,
          });
        }
      } catch (error) {
        console.error("[ReactNativeBridge] Failed to change theme:", error);
      }
    });

    // Listen for get current theme requests
    window.addEventListener(RN_EVENTS.GET_THEME, () => {
      window.dispatchEvent(
        new CustomEvent<GetThemeResponseDetail>(
          `${RN_EVENTS.GET_THEME}:response`,
          {
            detail: {
              theme: themeFunctions.getTheme(),
            },
          },
        ),
      );
    });

    // Listen for get supported themes requests
    window.addEventListener(RN_EVENTS.GET_SUPPORTED_THEMES, () => {
      window.dispatchEvent(
        new CustomEvent<GetSupportedThemesResponseDetail>(
          `${RN_EVENTS.GET_SUPPORTED_THEMES}:response`,
          {
            detail: {
              themes: SUPPORTED_THEMES,
            },
          },
        ),
      );
    });
  } else {
    if (isReactNative()) {
      console.warn(
        "[ReactNativeBridge] Theme functions not provided. Theme synchronization disabled.",
      );
    }
  }

  // Notify React Native that bridge is ready
  if (isReactNative()) {
    postMessageToReactNative("bridgeReady", {
      timestamp: Date.now(),
      supportedLanguages:
        (i18n.options.supportedLngs as readonly string[]) || [],
      currentLanguage: i18n.language,
      supportedThemes: SUPPORTED_THEMES,
      currentTheme: themeFunctions?.getTheme() || "system",
    });
  }
}

/**
 * Check if running inside React Native webview (synchronous)
 */
export function isReactNative(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.ReactNativeWebView !== "undefined"
  );
}

/**
 * Wait for React Native webview to be ready (asynchronous with polling)
 *
 * This function polls for window.ReactNativeWebView to handle timing issues
 * where the web page loads before the native bridge is fully injected.
 *
 * @param maxAttempts - Maximum number of polling attempts (default: 50)
 * @param intervalMs - Interval between attempts in milliseconds (default: 100)
 * @returns Promise that resolves to true if React Native, false otherwise
 */
export function waitForReactNative(
  maxAttempts = 50,
  intervalMs = 100,
): Promise<boolean> {
  return new Promise((resolve) => {
    // If already available, resolve immediately
    if (isReactNative()) {
      resolve(true);
      return;
    }

    // If not in browser environment, resolve false
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    let attempts = 0;
    const pollInterval = setInterval(() => {
      attempts++;

      if (isReactNative()) {
        clearInterval(pollInterval);
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        resolve(false);
      }
    }, intervalMs);
  });
}

/**
 * Post message to React Native
 *
 * @param type - Message type
 * @param data - Message data
 */
export function postMessageToReactNative(type: string, data?: unknown): void {
  if (!isReactNative()) {
    return;
  }

  const message = JSON.stringify({ type, data });

  window.ReactNativeWebView?.postMessage(message);
}
