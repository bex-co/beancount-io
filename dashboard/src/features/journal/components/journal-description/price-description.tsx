import type { JournalPrice } from "@/common/types/journal";
import { formatAmountWithCurrency } from "./utils";

interface PriceDescriptionProps {
  directive: JournalPrice;
}

export function PriceDescription({ directive }: PriceDescriptionProps) {
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="font-mono text-sm break-all cursor-pointer">
        {formatAmountWithCurrency(directive.amount)}/{directive.currency}
      </div>
    </div>
  );
}
