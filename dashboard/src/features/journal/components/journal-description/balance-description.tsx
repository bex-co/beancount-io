import type { JournalBalance } from "@/common/types/journal";
import { formatAmountWithCurrency } from "./utils";
import { useTranslations } from "@/common/hooks/use-translations";

interface BalanceDescriptionProps {
  directive: JournalBalance;
}

export function BalanceDescription({ directive }: BalanceDescriptionProps) {
  const { t } = useTranslations();
  return (
    <div className="flex-1 px-2 overflow-hidden">
      <div className="font-mono text-sm break-all">{directive.account}</div>
      {directive.diff_amount && (
        <div className="text-sm text-muted-foreground">
          {t("journal.accumulated")}{" "}
          {formatAmountWithCurrency(directive.diff_amount)}
        </div>
      )}
    </div>
  );
}
