import { describe, expect, it } from "vitest";
import { shouldShowLedgerFilters } from "../ledger-filter-pages";

/**
 * Report filters follow the ledger page, never a name inside the path: a
 * Files page for `journal.txt` is not the Journal (w4/1102).
 */
describe("shouldShowLedgerFilters", () => {
  it.each([
    "/ledger/alice/books",
    "/ledger/alice/books/",
    "/ledger/alice/books/journal",
    "/ledger/alice/books/journal/",
    "/ledger/alice/books/income-statement",
    "/ledger/alice/books/balance-sheet",
    "/ledger/alice/books/trial-balance",
    "/ledger/alice/books/events",
    "/ledger/alice/books/statistics",
    "/ledger/alice/books/cash-flow",
    "/ledger/alice/books/account/Assets%3ABank",
  ])("shows them on %s", (pathname) => {
    expect(shouldShowLedgerFilters(pathname)).toBe(true);
  });

  it.each([
    // Files whose folder or file name contains a report page's name.
    "/ledger/alice/books/files/blob/main/qa-route-scope/journal.txt",
    "/ledger/alice/books/files/blob/main/qa-route-scope/notes.txt",
    "/ledger/alice/books/files/tree/main/events/statistics",
    "/ledger/alice/books/files/blob/main/account/cash-flow.bean",
    // Owner and ledger names that read like report pages.
    "/ledger/journal/books/settings",
    "/ledger/alice/journal/settings",
    "/ledger/cash-flow/statistics/files",
    "/ledger/alice/books/accounts",
    "/ledger/alice/books/account",
    "/ledger/alice/books/settings",
    "/ledger/alice/books/import",
    "/ledger/alice/books/journalx",
    "/dashboard/journal",
  ])("hides them on %s", (pathname) => {
    expect(shouldShowLedgerFilters(pathname)).toBe(false);
  });
});
