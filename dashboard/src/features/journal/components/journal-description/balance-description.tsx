import type { JournalBalance } from "@/common/types/journal";
import { formatAmountWithCurrency } from "./utils";

interface BalanceDescriptionProps {
  directive: JournalBalance;
}

export function BalanceDescription({ directive }: BalanceDescriptionProps) {
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="font-mono text-sm break-all">{directive.account}</div>
      {directive.diff_amount && (
        <div className="text-sm text-muted-foreground">
          accumulated {formatAmountWithCurrency(directive.diff_amount)}
        </div>
      )}
    </div>
  );
}
