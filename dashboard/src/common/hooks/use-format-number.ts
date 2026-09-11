import { useCallback } from "react";
import { useLedger } from "@/common/hooks/use-ledger";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatNumber } from "@/common/lib/format/format-number";

/**
 * Returns a number formatter that respects the ledger's render_commas beancount option.
 *
 * Usage:
 *   const formatNum = useFormatNumber();
 *   formatNum(1234567.89) // "1,234,567.89" or "1234567.89" depending on the option
 */
export function useFormatNumber(): (value: number) => string {
  const { ledgerData } = useLedger();
  const { i18n } = useTranslations();
  const renderCommas = ledgerData.options.renderCommas ?? true;
  const language = i18n.language;
  return useCallback(
    (value: number) => formatNumber(value, renderCommas, language),
    [renderCommas, language],
  );
}
