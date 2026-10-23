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
 *   formatNum(4559.8, "USD") // "4,559.80": ISO currencies use their minor units
 *   formatNum(4.00995, "ETH", 5) // "4.00995": a commodity keeps its source digits
 *   formatNum("9007199254740993", "USD") // exact: a decimal string is not rounded
 */
export function useFormatNumber(): (
  value: number | string,
  currency?: string,
  fractionDigits?: number,
) => string {
  const { ledgerData } = useLedger();
  const { i18n } = useTranslations();
  const renderCommas = ledgerData.options.renderCommas ?? true;
  const language = i18n.language;
  return useCallback(
    (value: number | string, currency?: string, fractionDigits?: number) =>
      formatNumber(value, renderCommas, language, currency, fractionDigits),
    [renderCommas, language],
  );
}
