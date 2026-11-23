import type { JournalPrice } from "@/common/types/journal";
import { LedgerAmount } from "@/common/components/ledger-amount";
import { DescriptionParts } from "./description-parts";

interface PriceDescriptionProps {
  directive: JournalPrice;
  compact?: boolean;
}

export function PriceDescription({
  directive,
  compact,
}: PriceDescriptionProps) {
  return (
    <DescriptionParts
      compact={compact}
      primary={
        <LedgerAmount
          number={directive.amount.number}
          currency={`${directive.amount.currency}/${directive.currency}`}
          className="font-mono text-sm break-all"
        />
      }
    />
  );
}
