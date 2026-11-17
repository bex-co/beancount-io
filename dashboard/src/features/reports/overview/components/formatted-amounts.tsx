import { useFormatNumber } from "@/common/hooks/use-format-number";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
import { cn } from "@/common/lib/utils/utils";
import type { CurrencyAmount } from "../lib/overview-utils";

export function FormattedAmounts({
  amounts,
  showPositiveSign = false,
  quietUnit,
  className,
}: {
  amounts: CurrencyAmount[];
  showPositiveSign?: boolean;
  /**
   * The unit a total nearby already names: amounts in it show the figure
   * alone (still read with its unit), so a column of them is not six "USD".
   * Any other unit keeps its name.
   */
  quietUnit?: string;
  className?: string;
}) {
  const formatNumber = useFormatNumber();

  if (amounts.length === 0) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  return (
    <span className={cn("space-y-0.5 tabular-nums", className)}>
      {amounts.map((amount) => {
        // The ledger's own decimal: exact, and a commodity keeps the digits
        // it was recorded with, so 4.00995 ETH is not 4.01 (w4/1015).
        const value = amount.exact ?? amount.value;
        return (
          <span key={amount.currency} className="block whitespace-nowrap">
            {showPositiveSign && amount.value > 0 ? "+" : ""}
            {formatNumber(value, amount.currency, fractionDigitsOf(value))}
            {/* No trailing space for a quiet unit: the figures stay flush. */}
            {amount.currency === quietUnit ? (
              <span className="sr-only"> {amount.currency}</span>
            ) : (
              ` ${amount.currency}`
            )}
          </span>
        );
      })}
    </span>
  );
}
