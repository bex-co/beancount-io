import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerJournalDocument,
  type GetLedgerJournalQuery,
} from "@/graphql/definitions";
import { useDebounce } from "@/common/hooks/use-debounce";
import { isCompleteAccountToken } from "@/common/lib/beancount/account-token";
import { isCurrencyToken } from "@/common/lib/beancount/currency-token";
import {
  DirectiveType,
  isJournalTransaction,
  type JournalDirectiveType,
} from "@/common/types/journal";
import { findLikelyDuplicates } from "../lib/import-duplicates";

/**
 * One page never exceeds what the journal API answers: it refuses any
 * `limit` over 1000 (w6/007), and a refused read looks like "nothing
 * booked", so a single oversized read silently disables this check
 * (w5/1146). A longer window is read page by page until `total` is
 * covered, so a statement over a busy account is still checked in full.
 */
const JOURNAL_PAGE_LIMIT = 1000;

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

  const time = first === last ? first : `${first} - ${last}`;
  const { data, fetchMore } = useQuery(GetLedgerJournalDocument, {
    variables: {
      ledgerId,
      query: {
        account,
        time,
        directiveTypes: [DirectiveType.TRANSACTION],
        offset: 0,
        limit: JOURNAL_PAGE_LIMIT,
      },
    },
    skip: !ready,
    fetchPolicy: "network-only",
  });

  const journal = data?.getLedgerJournal;
  const total = journal?.total ?? 0;
  const loaded = journal?.data.length ?? 0;

  // A read that stops at the first page misses bookings on a busy
  // account, so keep reading while the server reports more rows. Each
  // merge grows `loaded`, which re-runs this effect for the next page;
  // an empty page grows nothing, so the loop always terminates. The
  // generation guard keeps a late page from a previous account or time
  // window from merging into the current one.
  const generation = useRef(0);
  useEffect(() => {
    if (!ready || !journal || loaded >= total) return;
    const mine = ++generation.current;
    void fetchMore({
      variables: {
        ledgerId,
        query: {
          account,
          time,
          directiveTypes: [DirectiveType.TRANSACTION],
          offset: loaded,
          limit: JOURNAL_PAGE_LIMIT,
        },
      },
      updateQuery: (
        previous: GetLedgerJournalQuery,
        {
          fetchMoreResult,
        }: {
          fetchMoreResult?: GetLedgerJournalQuery;
        },
      ) => {
        const next = fetchMoreResult?.getLedgerJournal;
        if (mine !== generation.current || !next) return previous;
        return {
          getLedgerJournal: {
            ...next,
            total: previous.getLedgerJournal.total,
            data: [...previous.getLedgerJournal.data, ...next.data],
          },
        };
      },
    }).catch(() => {
      // A failed page keeps the pages already read: the check only
      // withholds rows it has seen, never blocks an import.
    });
  }, [account, fetchMore, journal, ledgerId, loaded, ready, time, total]);

  return useMemo(() => {
    const page = data?.getLedgerJournal?.data;
    if (!ready || !page) return new Set<string>();
    const existing = (page as unknown as JournalDirectiveType[]).filter(
      isJournalTransaction,
    );
    return findLikelyDuplicates(rows, existing, account, unit);
  }, [account, data, ready, rows, unit]);
}
