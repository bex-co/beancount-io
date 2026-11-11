import { useContext } from "react";
import { Amount } from "@/common/components/amount";
import { useTranslations } from "@/common/hooks/use-translations";
import { parseDecimalNumber } from "@/common/lib/beancount/decimal-number";
import { formatSourceDecimal } from "@/common/lib/format/format-number";
import { LedgerProviderContext } from "@/common/providers/ledger-provider/context";

/**
 * A ledger amount as the ledger holds it, in the reader's language: `10500.00
 * USD` reads `10.500,00 USD` in German, as Overview writes it, rather than a
 * raw string a German reader takes for another number (w2/119). Every source
 * digit stays (`0.0040 USD`, 9007199254740993) — `formatSourceDecimal`, not
 * Overview's minor-unit rounding. A value that is not a decimal is shown as
 * it came. Outside a ledger (a preview, a test) grouping defaults on, as
 * `useFormatNumber`'s does.
 */
export function LedgerAmount({
  number,
  currency,
  className,
}: {
  number: string | number;
  currency: string;
  className?: string;
}) {
  const { i18n } = useTranslations();
  const renderCommas =
    useContext(LedgerProviderContext)?.ledgerData.options.renderCommas ?? true;
  // A chart's double becomes its shortest decimal; a grouped string loses
  // its commas first.
  const source = parseDecimalNumber(
    typeof number === "number" ? String(number) : number.replace(/,/g, ""),
  );
  return (
    <Amount className={className}>
      {source === null
        ? String(number)
        : formatSourceDecimal(source, renderCommas, i18n.language)}{" "}
      {currency}
    </Amount>
  );
}
