import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GetLedgerJournalDocument } from "@/graphql/definitions";
import { useDebounce } from "@/common/hooks/use-debounce";
import { isCompleteAccountToken } from "@/common/lib/beancount/account-token";
import { isCurrencyToken } from "@/common/lib/beancount/currency-token";
import {
  DirectiveType,
  isJournalTransaction,
  type JournalDirectiveType,
} from "@/common/types/journal";
import { findLikelyDuplicates } from "../lib/import-duplicates";

/** Enough for a statement's worth of days; a longer one is checked in part. */
const JOURNAL_LIMIT = 2000;

/**
 * The import rows the ledger already holds, once a source account and
 * currency are chosen: one read of that account's transactions over the
 * file's days. Empty while either is incomplete, or the read is pending or
 * failed — the check only ever withholds rows, never blocks an import.
 */
export function useImportDuplicates(
  ledgerId: string,
  rows: ReadonlyArray<{ id: string; date: string; amountDecimal: string }>,
  sourceAccount: string,
  currency: string,
): Set<string> {
  const account = useDebounce(sourceAccount.trim(), 300);
  const unit = currency.trim();
  const days = rows
    .map((row) => row.date)
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
  const first = days[0];
  const last = days.at(-1);
  const ready =
    Boolean(first && last) &&
    isCompleteAccountToken(account) &&
    isCurrencyToken(unit);

  const { data } = useQuery(GetLedgerJournalDocument, {
    variables: {
      ledgerId,
      query: {
        account,
        time: first === last ? first : `${first} - ${last}`,
        directiveTypes: [DirectiveType.TRANSACTION],
        offset: 0,
        limit: JOURNAL_LIMIT,
      },
    },
    skip: !ready,
    fetchPolicy: "network-only",
  });

  return useMemo(() => {
    const page = data?.getLedgerJournal?.data;
    if (!ready || !page) return new Set<string>();
    const existing = (page as unknown as JournalDirectiveType[]).filter(
      isJournalTransaction,
    );
    return findLikelyDuplicates(rows, existing, account, unit);
  }, [account, data, ready, rows, unit]);
}
