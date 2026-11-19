import { CircleAlert, CircleCheck } from "lucide-react";
import type { JournalBalance } from "@/common/types/journal";
import { useTranslations } from "@/common/hooks/use-translations";
import { cn } from "@/common/lib/utils/utils";
import { formatAmountWithCurrency } from "./journal-description/utils";
import { balanceIsOff } from "./journal-balance-tone";

/** The check itself: an icon and "Matches", or what it is off by. */
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
  const off = balanceIsOff(directive);
  const label = off
    ? t("journal.balanceOffBy", {
        amount: formatAmountWithCurrency(directive.diff_amount!),
      })
    : t("journal.balanceMatches");
  const Icon = off ? CircleAlert : CircleCheck;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        off
          ? "text-rose-700 dark:text-rose-400"
          : "text-emerald-700 dark:text-emerald-400",
        className,
      )}
      title={iconOnly ? label : undefined}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {iconOnly ? (
        <span className="sr-only">{label}</span>
      ) : (
        // The sentence is the translator's, with the amount in its place.
        <span className="tabular-nums [unicode-bidi:plaintext]">{label}</span>
      )}
    </span>
  );
}
