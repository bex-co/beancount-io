import { useFormatNumber } from "@/common/hooks/use-format-number";
import { cn } from "@/common/lib/utils/utils";
import type { CurrencyAmount } from "../lib/overview-utils";

export function FormattedAmounts({
  amounts,
  showPositiveSign = false,
  className,
}: {
  amounts: CurrencyAmount[];
  showPositiveSign?: boolean;
  className?: string;
}) {
  const formatNumber = useFormatNumber();

  if (amounts.length === 0) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  return (
    <span className={cn("space-y-0.5 tabular-nums", className)}>
      {amounts.map((amount) => (
        <span key={amount.currency} className="block whitespace-nowrap">
          {showPositiveSign && amount.value > 0 ? "+" : ""}
          {formatNumber(amount.value)} {amount.currency}
        </span>
      ))}
    </span>
  );
}
