import { Fragment } from "react";
import type { JournalTransaction } from "@/common/types/journal";
import { Link } from "@tanstack/react-router";
import { LedgerAmount } from "@/common/components/ledger-amount";
import { useTranslations } from "@/common/hooks/use-translations";
import { cn } from "@/common/lib/utils/utils";

interface JournalPostingsProps {
  directive: JournalTransaction;
  showPostings: boolean;
  ledgerOwner?: string;
  ledgerName?: string;
  /**
   * Indented under its entry's name, with no columns to line up beside it:
   * the account and its amount share one row at every width.
   */
  compact?: boolean;
  /** In a card of its own (an entry's dialog): even padding, no indent. */
  card?: boolean;
  /**
   * Which list the postings open under: the day layout's entries, or the
   * compact lines, whose entry column starts after the date and status.
   */
  inset?: "days" | "lines";
}

/** An account name that wraps only between its segments, never mid-word. */
function AccountName({ account }: { account: string }) {
  const segments = account.split(":");
  return (
    <>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <>
              :<wbr />
            </>
          )}
          {segment}
        </Fragment>
      ))}
    </>
  );
}

export function JournalPostings({
  directive,
  showPostings,
  ledgerOwner,
  ledgerName,
  compact = false,
  card = false,
  inset = "days",
}: JournalPostingsProps) {
  const { t } = useTranslations();
  if (!showPostings || !directive.postings || directive.postings.length === 0)
    return null;

  const accountLink = (account: string) =>
    ledgerOwner && ledgerName ? (
      <Link
        to="/ledger/$ledgerOwner/$ledgerName/account/$accountName"
        params={{ ledgerOwner, ledgerName, accountName: account }}
        // Quiet in a list of postings: the account reads first as a name,
        // and shows it is a link on hover and focus.
        className="rounded-sm text-foreground outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        <AccountName account={account} />
      </Link>
    ) : (
      <AccountName account={account} />
    );

  if (compact) {
    return (
      <ul
        className={cn(
          "postings text-sm",
          card
            ? "divide-y divide-border/50"
            : "border-t border-border/50 bg-muted/35 py-1",
        )}
      >
        {directive.postings.map((posting, index) => (
          <li
            key={index}
            // Amounts end where the entry's amount ends, clear of the
            // postings toggle's column.
            className={
              card
                ? "flex items-baseline gap-3 px-3 py-2"
                : inset === "lines"
                  ? // Under the entry column; amounts end where the line's do.
                    "flex items-baseline gap-3 py-1.5 pe-2 ps-14 sm:pe-[4.5rem] sm:ps-[6.25rem] md:ps-[9.75rem]"
                  : "flex items-baseline gap-3 py-1.5 pr-14 pl-8 sm:pr-[5.5rem] sm:pl-9"
            }
          >
            <span
              className={cn(
                "min-w-0 flex-1 font-mono text-xs leading-5",
                // Under a compact line, no larger than the line itself.
                inset === "lines" && !card ? "sm:text-[13px]" : "sm:text-sm",
              )}
            >
              {posting.flag && (
                <span className="mr-1.5 text-muted-foreground">
                  {posting.flag}
                </span>
              )}
              {accountLink(posting.account)}
              {(posting.cost || posting.price) && (
                <span className="block text-muted-foreground">
                  {posting.cost && (
                    <>
                      {t("journal.postingCost")}:{" "}
                      <LedgerAmount
                        number={posting.cost.number}
                        currency={posting.cost.currency}
                      />
                    </>
                  )}
                  {posting.cost && posting.price && " · "}
                  {posting.price && (
                    <>
                      {t("journal.price")}:{" "}
                      <LedgerAmount
                        number={posting.price.number}
                        currency={posting.price.currency}
                      />
                    </>
                  )}
                </span>
              )}
            </span>
            <span
              className={cn(
                "shrink-0 text-end font-mono text-xs leading-5 tabular-nums",
                inset === "lines" && !card ? "sm:text-[13px]" : "sm:text-sm",
              )}
            >
              {posting.units && (
                <LedgerAmount
                  number={posting.units.number}
                  currency={posting.units.currency}
                />
              )}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="postings border-t border-border/50 bg-muted/35 text-sm">
      {directive.postings.map((posting, index) => (
        <li key={index} className="border-b border-border/40 last:border-b-0">
          <div className="flex items-start py-1.5 sm:items-center">
            <span className="w-32 sm:w-48 text-center text-muted-foreground text-xs sm:text-sm">
              {posting.flag || ""}
            </span>
            <span className="min-w-0 flex-1 break-all px-1 font-mono text-xs sm:px-2 sm:text-sm">
              {ledgerOwner && ledgerName ? (
                <Link
                  to="/ledger/$ledgerOwner/$ledgerName/account/$accountName"
                  params={{
                    ledgerOwner,
                    ledgerName,
                    accountName: posting.account,
                  }}
                  className="rounded-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {posting.account}
                </Link>
              ) : (
                posting.account
              )}
              {posting.units && (
                <span className="mt-0.5 block text-muted-foreground sm:hidden">
                  <LedgerAmount
                    number={posting.units.number}
                    currency={posting.units.currency}
                  />
                </span>
              )}
              {posting.cost && (
                <span className="mt-0.5 block text-muted-foreground sm:hidden">
                  {t("journal.postingCost")}:{" "}
                  <LedgerAmount
                    number={posting.cost.number}
                    currency={posting.cost.currency}
                  />
                </span>
              )}
              {posting.price && (
                <span className="mt-0.5 block text-muted-foreground sm:hidden">
                  {t("journal.price")}:{" "}
                  <LedgerAmount
                    number={posting.price.number}
                    currency={posting.price.currency}
                  />
                </span>
              )}
            </span>
            <span className="w-20 sm:w-32 text-end font-mono text-xs sm:text-sm hidden sm:block">
              {posting.units && (
                <LedgerAmount
                  number={posting.units.number}
                  currency={posting.units.currency}
                />
              )}
            </span>
            <span className="w-20 sm:w-32 text-end font-mono text-xs sm:text-sm hidden sm:block">
              {posting.cost && (
                <LedgerAmount
                  number={posting.cost.number}
                  currency={posting.cost.currency}
                />
              )}
            </span>
            <span className="w-20 sm:w-32 text-end font-mono text-xs sm:text-sm hidden sm:block">
              {posting.price && (
                <LedgerAmount
                  number={posting.price.number}
                  currency={posting.price.currency}
                />
              )}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
