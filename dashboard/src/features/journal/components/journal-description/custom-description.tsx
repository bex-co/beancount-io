import type { JournalCustom } from "@/common/types/journal";
import { LedgerAmount } from "@/common/components/ledger-amount";
import { DescriptionParts } from "./description-parts";

interface CustomDescriptionProps {
  directive: JournalCustom;
  compact?: boolean;
}

function BudgetDescription({ directive, compact }: CustomDescriptionProps) {
  const [account, interval, amount] = directive.values as [
    string,
    string,
    { number: string; currency: string } | undefined,
  ];
  return (
    <DescriptionParts
      compact={compact}
      primary={<span className="font-mono text-sm break-all">{account}</span>}
      detail={
        (interval || amount) && (
          <span className={compact ? undefined : "inline-flex gap-2"}>
            {interval && <span>{interval}</span>}
            {compact && interval && amount && " · "}
            {amount && <LedgerAmount {...amount} className="font-mono" />}
          </span>
        )
      }
    />
  );
}

export function CustomDescription({
  directive,
  compact,
}: CustomDescriptionProps) {
  if (directive.type === "budget") {
    return <BudgetDescription directive={directive} compact={compact} />;
  }
  return (
    <DescriptionParts
      compact={compact}
      primary={<span className="font-medium">{directive.type}</span>}
      detail={
        directive.values.length > 0 && <span>{directive.values.join(" ")}</span>
      }
    />
  );
}
