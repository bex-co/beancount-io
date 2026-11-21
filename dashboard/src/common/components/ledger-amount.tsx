import { useContext } from "react";
import { Amount } from "@/common/components/amount";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  isPositiveDecimalNumber,
  parseDecimalNumber,
} from "@/common/lib/beancount/decimal-number";
import { formatSourceDecimal } from "@/common/lib/format/format-number";
import { LedgerProviderContext } from "@/common/providers/ledger-provider/context";

/**
 * A ledger amount as the ledger holds it, in the reader's language: `10500.00
 * USD` reads `10.500,00 USD` in German, as Overview writes it, rather than a
 * raw string a German reader takes for another number (w2/119). Every source
 * digit stays (`0.0040 USD`, 9007199254740993) — `formatSourceDecimal`, not
 * Overview's minor-unit rounding. A value that is not a decimal is shown as
 * it came. Outside a ledger (a preview, a test) grouping defaults on, as
 * `useFormatNumber`'s does. `showPositiveSign` writes money in as `+12.34`,
 * the sign inside the isolated run so a right-to-left page keeps it in front.
 * `currencyClassName` styles the unit apart from the figure (a phone may
 * leave a column's own currency unshown, still read out).
 */
export function LedgerAmount({
  number,
  currency,
  className,
  showPositiveSign = false,
  currencyClassName,
}: {
  number: string | number;
  currency: string;
  className?: string;
  showPositiveSign?: boolean;
  currencyClassName?: string;
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
      {showPositiveSign && source !== null && isPositiveDecimalNumber(source)
        ? "+"
        : ""}
      {source === null
        ? String(number)
        : formatSourceDecimal(source, renderCommas, i18n.language)}
      {currencyClassName ? (
        <span className={currencyClassName}> {currency}</span>
      ) : (
        <> {currency}</>
      )}
    </Amount>
  );
}
