# w4 · m1 — Download Balance Sheet and P&L as CSV or print-ready PDF

**Worker:** worker1 **Goal:** A dashboard user can take the currently filtered Balance Sheet or Profit & Loss out of Beancount.io as a safe spreadsheet or a clean printable statement. **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Define the shared financial-statement export model — **DONE** | 45m | — |
| t002 | Build secure CSV serialization and deterministic downloads — **DONE** | 45m | t001 |
| t003 | Build the semantic print-ready statement view — **DONE** | 45m | t001 |
| t004 | Add Download controls to Balance Sheet and P&L — **DONE** | 45m | t002, t003 |
| t005 | Add localization, accessibility, and export analytics — **DONE** | 30m | t004 |
| t006 | Adoption surface — **DONE** | 20m | t005 |
| t007 | Simplify — **DONE** | 20m | t006 |
| t008 | Test coverage — **DONE** | 45m | t007 |
| t009 | Closeout — **DONE** | 20m | t008 |

## Definition of done

The web Balance Sheet and Profit & Loss pages each expose an accessible Download menu. CSV export reflects the current report data, active time/account/advanced filters, conversion, visible hierarchy, currencies, and totals; it opens as Unicode in Excel, neutralizes spreadsheet formulas, and uses a deterministic filename. Print / Save as PDF renders a statement-specific semantic table rather than dashboard charts, clearly labels the ledger, report, active filter context, conversion, and generation time, and prints legibly on Letter and A4. Export events contain report type and format but no ledger or financial data. All dashboard locale files remain key-complete, meaningful failure-mode tests pass, and `yarn format:check`, `yarn lint`, `yarn test`, and `yarn build` are green from `dashboard/`.

**Verified:** both report pages feed their current filtered context into the shared CSV/print actions; security, exact-decimal, semantic-print, keyboard, failure, duplicate, and analytics behavior is covered by focused tests. Final dashboard checks on 2026-08-16 passed formatting, lint/typecheck, 227 test files with 3,172 passing tests (one existing skip), and both production build targets.

## Source + Goal linkage

- **Source:** Financial-SaaS competitive research and product decision captured in the 2026-08-15 `/pm` handoff. The agreed architecture keeps statement-specific behavior under `dashboard/src/features/reports/export/` and only format-generic helpers under `dashboard/src/common/lib/export/`.
- **Goal linkage:** **A3 — Community & distribution.** Portable, professional report outputs make Beancount.io easier to demonstrate, share with accountants and collaborators, and evaluate without fear of data lock-in; this strengthens credibility in the open-source accounting community.
- **Expected outcome:** A dashboard user can export either core financial statement without screenshots or manual copying, and recipients can read the PDF or analyze the CSV without a Beancount.io account.
- **Why now:** Both report pages already load the required hierarchy, totals, filters, and conversion context, and the dashboard already contains secure CSV behavior that can be generalized. A client-side implementation can ship entirely in this public monorepo without a new dependency or service change. Adoption surface is included because this milestone ships a user-facing reporting capability.
