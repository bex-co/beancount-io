import type { JournalTransaction } from "@/common/types/journal";
import { Link } from "@tanstack/react-router";
import { LedgerAmount } from "@/common/components/ledger-amount";
import { useTranslations } from "@/common/hooks/use-translations";

interface JournalPostingsProps {
  directive: JournalTransaction;
  showPostings: boolean;
  ledgerOwner?: string;
  ledgerName?: string;
}

export function JournalPostings({
  directive,
  showPostings,
  ledgerOwner,
  ledgerName,
}: JournalPostingsProps) {
  const { t } = useTranslations();
  if (!showPostings || !directive.postings || directive.postings.length === 0)
    return null;

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
