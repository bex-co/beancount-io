import { useCallback } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatNumber } from "@/common/lib/format/format-number";

/**
 * Formats a plan quota count in the **app** language.
 *
 * A bare `toLocaleString()` follows the browser locale, so a user reading the
 * dashboard in German still saw "1,000,000" instead of "1.000.000".
 *
 * `useFormatNumber()` is the ledger-side equivalent, but it reads the
 * `render_commas` beancount option through `LedgerProvider`, and `/settings` is
 * not nested in one (it would throw). Quotas are plain counts, so thousands
 * separators always apply here.
 */
export function useQuotaNumberFormat(): (value: number) => string {
  const { i18n } = useTranslations();
  const language = i18n.language;
  return useCallback(
    (value: number) => formatNumber(value, true, language),
    [language],
  );
}
