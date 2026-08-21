/**
 * Dashboard indexability policy (w2/m8 — social accounting + acquisition).
 *
 * Beancount.io is a social accounting app: public ledger reads, the base Ask
 * surface, and acquisition pages should be discoverable in search.
 * CMS / forum / API paths are out of scope.
 *
 * Indexable (default — do not pass noIndex):
 * - `/ledger/$username` (public user profile)
 * - Public ledger read/social surfaces under `/ledger/$owner/$name/**`:
 *   overview, journal, account, accounts, balance sheet, income statement,
 *   trial balance, holdings, commodities, documents, events, statistics,
 *   commits / commit detail, pull requests, and the base ask / agent page
 * - GitHub-style read-only file (`blob`) pages with stable canonical URLs
 * - Acquisition auth: login, sign-up, and forgot password
 *
 * noIndex (pass `{ noIndex: true }` / `noIndex` prop):
 * - Transactional / ephemeral auth: reset password (token URL), sign-up OTP,
 *   welcome (authenticated first-run), logout, OAuth callback / consent,
 *   device auth
 * - Auth-gated shells with no public content: `/ledger` home, `/ledger-gallery`
 *   (while still requireAuth)
 * - Private settings: user `/settings/**`, ledger settings
 * - GitHub-style crawl exclusions: directory tree plus file create/upload/edit
 * - Other write / parameterized UIs: import, receipt capture, BQL query,
 *   ledger validation errors
 * - Bank-link UIs: plaid connections / link / plaid settings
 * - Error surfaces: not-found / error pages
 *
 * When noIndex is set, also skip hreflang alternates.
 */
export const NOINDEX_ROBOTS_CONTENT = "noindex, follow";

const PRODUCTION_ORIGIN = "https://beancount.io";

function encodePath(path: string): string {
  return path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

/** Canonical URL for a GitHub-style, read-only public ledger file page. */
export function getLedgerFileCanonicalUrl({
  ledgerOwner,
  ledgerName,
  branch,
  filePath,
}: {
  ledgerOwner: string;
  ledgerName: string;
  branch: string;
  filePath: string;
}): string {
  const base = `${PRODUCTION_ORIGIN}/ledger/${encodeURIComponent(ledgerOwner)}/${encodeURIComponent(ledgerName)}/files/blob/${encodeURIComponent(branch)}`;
  const encodedFilePath = encodePath(filePath);
  return encodedFilePath ? `${base}/${encodedFilePath}` : base;
}
