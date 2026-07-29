import { type SupportedLanguage } from "./config";

/**
 * Persist language preference to both localStorage and cookie
 * - localStorage: for client-side hydration (entry-client.tsx reads this)
 * - cookie: for SSR language detection (i18n-ssr.ts reads this)
 */
export function persistLanguage(lang: SupportedLanguage): void {
  // Save to localStorage for client-side detection
  localStorage.setItem("i18nextLng", lang);

  // Save to cookie for SSR detection (expires in 1 year)
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  // Security: Direct string manipulation is safe here because `lang` is validated
  // against a whitelist of supported languages (SupportedLanguage type).
  document.cookie = `i18nextLng=${lang}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}
