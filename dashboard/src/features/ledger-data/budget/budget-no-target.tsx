import { useTranslations } from "@/common/hooks/use-translations";
import { formatLedgerDate } from "@/common/lib/format/ledger-date";

export function BudgetNoTarget({
  firstTargetDate,
}: {
  firstTargetDate: string;
}) {
  const { t, i18n } = useTranslations();
  const date =
    formatLedgerDate(firstTargetDate, i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) ?? firstTargetDate;
  return (
    <p className="text-xs leading-4 text-muted-foreground">
      {t("page.budget.budgetNoTargetYet", { date })}
    </p>
  );
}
