# w4 · m2 — Cash flow report: statement page, charts, exports, account status

**Worker:** worker1 **Goal:** ship `/ledger/$owner/$name/cash-flow` — a direct-method, three-activity cash flow statement with charts, CSV/Markdown/print exports, and a cash-account status panel, composed entirely client-side. **Status:** done

## Tasks (in order)

| id   | title                                                            | est | depends_on         |
| ---- | ---------------------------------------------------------------- | --- | ------------------ |
| t001 | Cash-flow data model: activity classification + CCE + netting    | 45m | — **DONE**         |
| t002 | Cash-flow page: route, loader, three-section statement           | 45m | t001 — **DONE**    |
| t003 | Charts: net cash flow over time + per-activity breakdown         | 40m | t002 — **DONE**    |
| t004 | Account status panel (cash & equivalents, open/closed)           | 30m | t002 — **DONE**    |
| t005 | Export integration: `cash_flow` StatementKind + renderers        | 45m | t001 — **DONE**    |
| t006 | Navigation + i18n registration (sidebar, RelatedLinks, locales)  | 30m | t002, t005 — **DONE** |
| t007 | Adoption surface                                                 | 20m | t006 — **DONE**    |
| t008 | Simplify                                                         | 20m | t007 — **DONE**    |
| t009 | Test coverage                                                    | 30m | t007 — **DONE**    |
| t010 | Closeout                                                         | 10m | t009 — **DONE**    |

## Definition of done

`/ledger/puncsky/example/cash-flow` (and any ledger) renders a cash flow statement with operating/investing/financing sections, per-activity subtotals, and a net-change-in-CCE bottom line; charts and the account status panel render from existing GraphQL data; the Export menu produces CSV, Markdown, and print/PDF for the statement with the heuristic-classification disclosure notices; the sidebar and RelatedLinks link the page both ways; dashboard CI is green. No backend or `fava-slim/` changes.

## Source + Goal linkage

- **Source:** `dashboard/docs/ADR002-cash-flow-report.md` (PM research 2026-08-19/20, user request).
- **Goal linkage:** **A3 — Community & distribution**: a cash flow statement neither upstream fava nor `fava-slim/` offers — a concrete differentiator and launch talking point. **A2** spillover: newcomers see a familiar finance statement on their example ledger. Advances w4's portability mission by extending statement exports to a third kind.
- **Expected outcome:** any Beancount.io user can open and export a cash flow statement for their ledger; every export carries the unaudited/heuristic disclosures; the export model proves it generalizes beyond two statements.
- **Why now:** w4/m1 just shipped the export pipeline and w4/001 fixed its production CSS delivery, so a third `StatementKind` is cheap; the Sankey's `account-categorizer.ts` heuristic already exists to seed classification. Adoption surface is included because this ships a user-facing page and export surface.
