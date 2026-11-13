import { useCallback } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatPercent } from "@/common/lib/format/format-number";

/**
 * Formats a ratio as a percentage in the **app** language: its digits, decimal
 * mark and percent sign (`۳۴٫۲۲٪`), so a share reads like the amounts beside
 * it (w2/133). Shares are not ledger amounts, so `render_commas` does not
 * apply and no `LedgerProvider` is needed.
 */
export function useFormatPercent(): (
  ratio: number,
  maximumFractionDigits: number,
  minimumFractionDigits?: number,
) => string {
  const { i18n } = useTranslations();
  const language = i18n.language;
  return useCallback(
    (
      ratio: number,
      maximumFractionDigits: number,
      minimumFractionDigits?: number,
    ) =>
      formatPercent(
        ratio,
        language,
        maximumFractionDigits,
        minimumFractionDigits,
      ),
    [language],
  );
}
