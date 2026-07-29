import type { JournalCustom } from "@/common/types/journal";
import { formatAmountWithCurrency } from "./utils";

interface BudgetDescriptionProps {
  directive: JournalCustom;
}

function BudgetDescription({ directive }: BudgetDescriptionProps) {
  const [account, interval, amount] = directive.values as [
    string,
    string,
    { number: string; currency: string } | undefined,
  ];
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="font-mono text-sm break-all">{account}</div>
      <div className="flex gap-2 text-sm text-muted-foreground">
        {interval && <span>{interval}</span>}
        {amount && (
          <span className="font-mono">{formatAmountWithCurrency(amount)}</span>
        )}
      </div>
    </div>
  );
}

interface CustomDescriptionProps {
  directive: JournalCustom;
}

export function CustomDescription({ directive }: CustomDescriptionProps) {
  if (directive.type === "budget") {
    return <BudgetDescription directive={directive} />;
  }
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="font-medium">{directive.type}</div>
      <div className="text-sm text-muted-foreground">
        {directive.values.join(" ")}
      </div>
    </div>
  );
}
