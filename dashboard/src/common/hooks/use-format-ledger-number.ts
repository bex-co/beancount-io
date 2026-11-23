import { useCallback, useContext } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { parseDecimalNumber } from "@/common/lib/beancount/decimal-number";
import { formatSourceDecimal } from "@/common/lib/format/format-number";
import { LedgerProviderContext } from "@/common/providers/ledger-provider/context";

/** The ledger's source digits, with the same separators as its postings. */
export function useFormatLedgerNumber(): (value: number | string) => string {
  const { i18n } = useTranslations();
  const renderCommas =
    useContext(LedgerProviderContext)?.ledgerData.options.renderCommas ?? true;
  const language = i18n.language;
  return useCallback(
    (value) => {
      const text = String(value);
      const source = parseDecimalNumber(text.replace(/,/g, ""));
      return source === null
        ? text
        : formatSourceDecimal(source, renderCommas, language);
    },
    [renderCommas, language],
  );
}
