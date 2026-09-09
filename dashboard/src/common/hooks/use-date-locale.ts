import { useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import type { Locale } from "react-day-picker";
import { LocalizationContext } from "@/i18n/context";
import { defaultDateLocale } from "@/common/lib/format/date-locale";
import { formatRelativeTime } from "@/common/lib/format/format-relative-time";

/**
 * Active app date locale (DayPicker + date-fns). Re-renders when i18n language
 * settles; never follows the browser preference alone.
 * Outside LocalizationProvider (tests), falls back to English.
 */
export function useDateLocale(): Locale {
  const localization = useContext(LocalizationContext);
  const { i18n } = useTranslation();
  // Subscribe to language changes; locale is loaded before changeLanguage settles.
  void i18n.language;
  return localization?.getDateLocale() ?? defaultDateLocale;
}

export function useFormatRelativeTime() {
  const locale = useDateLocale();
  return useCallback(
    (date: Date | number, options?: { addSuffix?: boolean }) =>
      formatRelativeTime(date, locale, options),
    [locale],
  );
}
