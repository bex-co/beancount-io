import { useCallback } from "react";
import { useLedger } from "@/common/hooks/use-ledger";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatQuantity } from "@/common/lib/format/format-number";

/**
 * Like {@link useFormatNumber}, but for detailed readouts of ledger quantities
 * such as chart tooltips, where rounding a commodity unit loses real value.
 * The caller passes the fraction digits the source decimal carried; see
 * `fractionDigitsOf`.
 */
export function useFormatQuantity(): (
  value: number,
  fractionDigits: number,
) => string {
  const { ledgerData } = useLedger();
  const { i18n } = useTranslations();
  const renderCommas = ledgerData.options.renderCommas ?? true;
  const language = i18n.language;
  return useCallback(
    (value: number, fractionDigits: number) =>
      formatQuantity(value, fractionDigits, renderCommas, language),
    [renderCommas, language],
  );
}
