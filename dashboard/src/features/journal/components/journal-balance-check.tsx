import { CircleAlert, CircleCheck } from "lucide-react";
import { LedgerAmount } from "@/common/components/ledger-amount";
import type { JournalBalance } from "@/common/types/journal";
import { useTranslations } from "@/common/hooks/use-translations";
import { cn } from "@/common/lib/utils/utils";
import { getBalanceFailure } from "./journal-balance-details";

const AMOUNT_PLACEHOLDER = "\uFFFC";

/** The check itself, with the accumulated amount and direction of a failure. */
export function BalanceCheck({
  directive,
  iconOnly = false,
  className,
}: {
  directive: JournalBalance;
  /** Just the icon, named for assistive technology (a status column). */
  iconOnly?: boolean;
  className?: string;
}) {
  const { t } = useTranslations();
  const failure = getBalanceFailure(directive);
  const label = failure
    ? t("journal.balanceFailed")
    : t("journal.balanceMatches");
  const Icon = failure ? CircleAlert : CircleCheck;
  const [before, after] = failure
    ? t(failure.differenceLabel, { amount: AMOUNT_PLACEHOLDER }).split(
        AMOUNT_PLACEHOLDER,
      )
    : [];
  return (
    <span
      className={cn(
        "inline-flex min-w-0 gap-1",
        failure
          ? "items-start text-rose-700 dark:text-rose-400"
          : "items-center whitespace-nowrap text-emerald-700 dark:text-emerald-400",
        className,
      )}
      title={iconOnly ? label : undefined}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-4 shrink-0", failure && !iconOnly && "mt-0.5")}
      />
      {iconOnly ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="tabular-nums">
          {label}
          {failure && (
            <>
              {failure.accumulated && (
                <>
                  {" · "}
                  {t("journal.accumulated")}{" "}
                  <LedgerAmount
                    {...failure.accumulated}
                    className="whitespace-nowrap"
                  />
                </>
              )}
              {" · "}
              {before}
              <LedgerAmount
                {...failure.difference}
                className="whitespace-nowrap"
              />
              {after}
            </>
          )}
        </span>
      )}
    </span>
  );
}
