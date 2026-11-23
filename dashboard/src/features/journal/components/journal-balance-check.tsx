import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { LedgerAmount } from "@/common/components/ledger-amount";
import type { JournalBalance } from "@/common/types/journal";
import { useTranslations } from "@/common/hooks/use-translations";
import { cn } from "@/common/lib/utils/utils";
import { getBalanceFailure } from "./journal-balance-details";
import type { BalanceStatus } from "./journal-balance-tone";

const AMOUNT_PLACEHOLDER = "\uFFFC";

/** The check itself, with the accumulated amount and direction of a failure. */
export function BalanceCheck({
  directive,
  status,
  ledgerOwner,
  ledgerName,
  iconOnly = false,
  className,
}: {
  directive: JournalBalance;
  status: BalanceStatus;
  ledgerOwner?: string;
  ledgerName?: string;
  /** Just the icon, named for assistive technology (a status column). */
  iconOnly?: boolean;
  className?: string;
}) {
  const { t } = useTranslations();
  if (status === "unknown") return null;
  const failure = getBalanceFailure(directive);
  const unchecked = status === "unchecked";
  const label = failure
    ? t("journal.balanceFailed")
    : unchecked
      ? t("journal.balanceNotChecked")
      : t("journal.balanceMatches");
  const Icon = failure ? CircleAlert : unchecked ? TriangleAlert : CircleCheck;
  const [before, after] = failure
    ? t(failure.differenceLabel, { amount: AMOUNT_PLACEHOLDER }).split(
        AMOUNT_PLACEHOLDER,
      )
    : [];
  const checkClassName = cn(
    "inline-flex min-w-0 gap-1",
    failure
      ? "items-start text-rose-700 dark:text-rose-400"
      : unchecked
        ? "items-start text-amber-700 dark:text-amber-400"
        : "items-center whitespace-nowrap text-emerald-700 dark:text-emerald-400",
    className,
  );
  const check = (
    <>
      <Icon
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0",
          (failure || unchecked) && !iconOnly && "mt-0.5",
        )}
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
    </>
  );
  if (unchecked && !iconOnly && ledgerOwner && ledgerName) {
    return (
      <Link
        to="/ledger/$ledgerOwner/$ledgerName/errors"
        params={{ ledgerOwner, ledgerName }}
        className={cn(checkClassName, "underline underline-offset-2")}
        onClick={(event) => event.stopPropagation()}
      >
        {check}
      </Link>
    );
  }
  return (
    <span className={checkClassName} title={iconOnly ? label : undefined}>
      {check}
    </span>
  );
}
