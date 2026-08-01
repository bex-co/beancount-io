# w1 · m2 — Scope useLedgerMeta to the selected ledger (fix wrong currency display)

**Worker:** worker1 **Goal:** every screen shows the *selected* ledger's operating currency, not a default ledger's — the mobile app's flagship demo ledgers render correct money **Status:** done

## Tasks (in order)

| id   | title                                                          | est | depends_on |          |
| ---- | -------------------------------------------------------------- | --- | ---------- | -------- |
| t001 | Fix Home screen net-worth currency — pass selected ledgerId    | 20m | —          | **DONE** |
| t002 | Fix Reports, account-detail, quick-add — same missing ledgerId | 30m | t001       | **DONE** |
| t003 | Simplify                                                       | 20m | t002       | **DONE** |
| t004 | Test coverage — regression guarding ledgerId is passed         | 45m | t002       | **DONE** |
| t005 | Closeout                                                       | 15m | t004       | **DONE** |

## Definition of done

On every affected screen (Home, Reports, account-detail, quick-add accounts selector), the displayed currency matches the **currently selected** ledger's `option "operating_currency"`. Verified against the `open_ledger/airbnb` ledger (declares USD): Home net worth renders `$`, not `€`. A regression test fails if any of these screens calls `useLedgerMeta(userId)` without the selected `ledgerId`.

**Verified:** with `open_ledger/airbnb` (operating_currency USD) selected, Home Net Worth now renders `$7,636,000,000.00` (was `€…`), Reports renders `$` axis + totals, and account-detail renders `$` balances — all confirmed live on the iOS simulator via expo-mcp. `grep -rn "useLedgerMeta(userId)" mobile/src` returns no matches. 6 new tests (`mobile/src/__tests__/ledger-currency-scoping.test.ts`) cover the `getPrimaryCurrency` helper and a source-guard that fails on the unscoped call shape (regex proven to match the pre-fix shape and reject all fixed shapes). Full suite green: `yarn lint`, `tsc`, `yarn test:unit` (1024 tests) (2026-07-31).

## Source + Goal linkage

- **Source:** `/pm` invocation capturing the expo-mcp currency investigation (2026-07-31) — airbnb ledger (operating_currency USD) rendered Net Worth in `€` on the mobile Home screen. Root cause: `home-screen.tsx` calls `useLedgerMeta(userId)` without `ledgerId`, so the `ledgerMeta` query resolves the backend's default ledger and returns *its* currency; the balance values (`useBalanceSheet(ledgerId)`) are correctly scoped, producing a same-screen mismatch. `reports-screen`, `account-detail-screen`, and `quick-add-accounts-selector` share the identical omission; `accounts`, `add-transaction-next`, `multi-postings`, `open-account`, and `ledger-file-editor` already pass `ledgerId` correctly.
- **Goal linkage:** A3 (community & distribution) — the mobile app is a public product surface and the `open_ledger/*` demo ledgers are what newcomers and the community see first; wrong currency on the flagship demo undermines credibility. Secondary A2 (frictionless onboarding): the first-run demo experience must read as trustworthy.
- **Expected outcome:** anyone opening the mobile app against a demo (or their own) ledger sees the ledger's real operating currency everywhere, removing an obvious correctness blemish that reads as "this product is buggy."
- **Why now:** small, self-contained, high-visibility correctness fix; the hook already supports the fix and four sibling screens model the correct call, so risk is low and the win is immediate.
- **Adoption surface omitted:** this milestone fixes behavior on existing screens and ships no new user- or agent-facing surface (no new install step, quickstart, skill, or package entry to document), so the standing Adoption-surface task does not apply.

## Closeout notes

- The fix is a one-argument addition (`useLedgerMeta(userId, ledgerId)`) on four screens; the hook already accepted and forwarded `ledgerId`. quick-add derives `ledgerId` from `ledgerVar` (`string | null`), hoisted above the call and passed as `ledgerId ?? undefined` to match the hook's `string | undefined` signature.
- t003: rather than spawning `/simplify` over a trivial diff, applied the substantive simplification the task anticipated — extracted the thrice-duplicated `currencies[0] ?? "USD"` derivation into `getPrimaryCurrency(currencies, fallback = "USD")` in `mobile/src/common/currency-util.ts`, used by all four screens (quick-add with a `""` fallback). Behavior-preserving; gives t004 a pure unit to test.
- t004: 6 tests total — 4 behavior tests on `getPrimaryCurrency` (primary selection, multi-currency, USD fallback, explicit empty fallback) + a source-guard scanning `src/screens` for the unscoped `useLedgerMeta(userId)` shape. The guard would have failed on the pre-fix code.
- quick-add currency is not prominently displayed (feeds the add-transaction `onChange`), so it was verified by compile + typecheck + the source-guard rather than a screenshot; Home, Reports, and account-detail were verified visually on-device.
