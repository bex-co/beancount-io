/** Ledger pages whose content the shared time/account/filter scope changes. */
const FILTERED_PAGES = new Set([
  "journal",
  "income-statement",
  "balance-sheet",
  "trial-balance",
  "events",
  "statistics",
  "cash-flow",
]);

/**
 * Whether the page under `/ledger/$owner/$name` takes the report filters.
 * Matched on whole ledger-relative segments, so an owner, ledger, folder or
 * file name such as `journal.txt` never qualifies a Files page (w4/1102).
 */
export function shouldShowLedgerFilters(pathname: string): boolean {
  const match = /^\/ledger\/[^/]+\/[^/]+(\/.*)?$/.exec(pathname);
  if (!match) return false;
  const [page, ...rest] = (match[1] ?? "").split("/").filter(Boolean);
  if (page === undefined) return true;
  if (page === "account") return rest.length === 1;
  return FILTERED_PAGES.has(page) && rest.length === 0;
}
