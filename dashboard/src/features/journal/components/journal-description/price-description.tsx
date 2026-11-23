import type { JournalPrice } from "@/common/types/journal";
import { LedgerAmount } from "@/common/components/ledger-amount";

interface PriceDescriptionProps {
  directive: JournalPrice;
}

export function PriceDescription({ directive }: PriceDescriptionProps) {
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="font-mono text-sm break-all cursor-pointer">
        <LedgerAmount
          number={directive.amount.number}
          currency={`${directive.amount.currency}/${directive.currency}`}
        />
      </div>
    </div>
  );
}
