import type { JournalBalance } from "@/common/types/journal";
import { LedgerAmount } from "@/common/components/ledger-amount";
import { BalanceCheck } from "../journal-balance-check";

interface BalanceDescriptionProps {
  directive: JournalBalance;
}

export function BalanceDescription({ directive }: BalanceDescriptionProps) {
  const { amount, tolerance } = directive;
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="flex flex-wrap items-baseline gap-x-3 font-mono text-sm">
        <span className="break-all">{directive.account}</span>
        {amount && (
          <LedgerAmount
            {...amount}
            tolerance={tolerance}
            className="tabular-nums"
          />
        )}
      </div>
      {directive.diff_amount && (
        <BalanceCheck directive={directive} status="off" className="text-sm" />
      )}
    </div>
  );
}
