import { useCallback } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatNumber } from "@/common/lib/format/format-number";

/**
 * Formats a count in the **app** language: its digits and grouping, so
 * Persian reads `۱٬۰۴۴` beside Persian amounts and dates (w2/125). A plural
 * message's `count` is formatted by `useTranslations` itself; this is for
 * the other counts a message or a cell shows.
 *
 * A bare `toLocaleString()` follows the browser locale, so a user reading the
 * dashboard in German still saw "1,000,000" instead of "1.000.000".
 *
 * `useFormatNumber()` is the ledger-side equivalent, but it reads the
 * `render_commas` beancount option through `LedgerProvider`, and `/settings` is
 * not nested in one (it would throw). Counts are not ledger amounts, so
 * thousands separators always apply here.
 */
export function useFormatCount(): (value: number) => string {
  const { i18n } = useTranslations();
  const language = i18n.language;
  return useCallback(
    (value: number) => formatNumber(value, true, language),
    [language],
  );
}
