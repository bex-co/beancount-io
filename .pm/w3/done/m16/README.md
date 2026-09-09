# m16 — Preserve parent-account postings in Cash Flow

**Worker:** worker3 **Status:** done

| Task | Title                                                              | Estimate | Depends on |
| ---- | ------------------------------------------------------------------ | -------- | ---------- |
| t001 | Consume direct account changes without dropping parents — **DONE** | 45m      | —          |
| t002 | Preserve parent amounts in the activity hierarchy — **DONE**       | 35m      | t001       |
| t003 | Adoption surface — verify the public example's cash reconciliation — **DONE** | 20m      | t002       |
| t004 | Simplify the cash-flow account handling — **DONE**                 | 20m      | t003       |
| t005 | Test the interval-to-statement and export pipeline — **DONE**      | 45m      | t003       |
| t006 | Closeout — **DONE**                                                | 15m      | t004, t005 |

## Source + Goal linkage

- Source: repeated dashboard QA for w3, 2026-09-08. Major financial-reporting
  defect: legitimate postings disappear when their account also has a child.
- A2 — A newcomer can reconcile the public example's Cash Flow to its cash
  balances. A3 — shared statement exports contain the same complete activity.
- Expected outcome: changing chart interval cannot change the period's net
  cash movement, and parent-account amounts survive both calculation and display.
- Why now: the live example reports positive cash flow for a period whose cash
  balance decreased. Two independently reproduced losses in the model and tree
  require about 80 minutes of implementation, followed by shared pipeline coverage
  and closing work; this is larger than an inbox fix.
- Adoption surface is included because both a financial page and its exports
  change. Scope is dashboard; no API, classification-policy or dependency change.

## Reproduced finding

Production https://beancount.io, Chrome 152, English/System light, authenticated
QA reader of synthetic `open_ledger/example`, pull true, admin/push false.
Desktop 1440×1000 and fresh 390×844 repeat, 2026-09-08. Source a315c273 and
fetched origin/main cc3f4c2f; deployed SHA unverified.

1. Fresh-open `/ledger/open_ledger/example/cash-flow?time=2016&lang=en`.
   Leave Monthly and At Cost selected. Net Change in Cash & Equivalents is
   **14,493.44 USD**; opening cash is **-7,729.93 USD**.
2. Change only the chart interval to Yearly. The same 2016 statement now reports
   **26,185.56 USD** net change and **-19,422.05 USD** opening cash. Closing
   cash remains **6,763.51 USD**. A fresh narrow reload and interval switch repeat
   both results without page errors.
3. Export Spreadsheet CSV and Markdown for each interval. Both formats retain
   the incorrect calculations. Monthly CSV has 54 data rows; Yearly has 53.
4. Independent Balance Sheet reads at cost show the same three cash accounts:

| Cash account            | End of 2015 USD | End of 2016 USD |
| ----------------------- | --------------: | --------------: |
| Assets:US:BofA:Checking |         8029.87 |         6377.23 |
| Assets:US:ETrade:Cash   |          184.03 |          386.22 |
| Assets:US:Vanguard:Cash |           -0.03 |            0.06 |
| Total                   |     **8213.87** |     **6763.51** |

Expected 2016 net cash change is therefore **-1450.36 USD** in both groupings,
with opening cash **8213.87 USD**. Exact Decimal arithmetic verifies the gaps.

The API returns `Expenses:Taxes:Y2016:US:Federal` with **27635.92 USD** direct
postings and its child `:PreTax401k` with **18000 IRAUSD**. These are separate
accounts and units, not duplicate rollups. In monthly data both keys coexist
from January through July; the parent USD amounts in those periods total
**15943.80**. Only the parent's August–December **11692.12 USD** survives the
model. In yearly data both keys coexist once, so the entire **27635.92 USD**
parent amount disappears. Those omissions exactly equal the two net-change
overstatements above.

A second loss occurs in the table renderer: Monthly CSV/Markdown still contain
`Expenses:Taxes:Y2016:US:Federal` at **-11692.12 USD**, but its on-screen Federal
row shows a dash under USD and only the child's **-18000 IRAUSD**. The renderer
discards a node's own amount whenever that node has children.

## Producer, consumer and fix boundary

Ledger `src/foundation/rustledger/interval-series.ts:279–341` accumulates each
posting under its exact account in `perAccount` and serializes direct amounts
as `account_balances`. Gateway `ledger-data-service.ts:367–386` delegates this
read; GraphQL resolver `ledger-data-resolver.query.ts:562–587` only renames the
field to `accountBalances`. Live GraphQL and REST interval-totals controls both
return the correct independent parent/child records, HTTP200. MCP's analysis
resource uses the same service through `ANALYSIS_READS`; its live invocation is
unverified because this session has no MCP API-key/OAuth credential.

Dashboard `cash-flow/lib/model.ts:191–199,306` filters the direct-account map
through `leafAccounts`, incorrectly treating every parent as an aggregate.
Net change is then summed from the incomplete activity rows, and opening cash
is derived as closing minus that wrong change at 379–384. Process each direct
account once, without inferring duplication from its name or child existence.
Preserve exact decimal strings, separate units, declared roles, cash-transfer
netting and the existing sign conventions. The test at `model.test.ts:286`
currently asserts an invented rollup-shaped input; replace that assumption
with the actual API contract and balanced parent/child fixtures.

`cash-flow/lib/statement-tree.ts:44–65` independently ignores `node.amounts`
on internal nodes and sums only children. Keep own amounts separate from
descendant rollups, and include both exactly once in the displayed aggregate.
Preserve the direct account's role source and real account link. Merely fixing
the model would leave its restored parent amount invisible in the table.

Caller search: the page at `cash-flow/index.tsx:104` is the model's sole
production caller. `cash-flow-content.tsx:124,151` feeds the flat statement to
the export builder and the activity-tree builder respectively. Charts consume
the model's interval points; CSV/Markdown and Print share `buildCashFlowDocument`
at `reports/export/model.ts:361`. CSV/Markdown were exercised; chart numerical
labels and Print are source-traced, not independently reproduced here.

## Definition of Done

- [x] Monthly and Yearly 2016 statements both show opening 8213.87, closing
      6763.51 and net change -1450.36 USD for the documented cash set.
- [x] Federal contributes its full -27635.92 USD in the operating calculation,
      table and exports; its child's -18000 IRAUSD stays a separate unit.
- [x] Parent and child direct postings are preserved at every depth, including
      a returned zero child, without double counting structural tree rollups.
- [x] The real interval-response → merge → model → tree/export pipeline has
      regression coverage; changing only interval grouping preserves period totals.
- [x] Empty/zero states, declared roles and inter-cash transfers remain usable;
      the real-estate control still reconciles at cost.
- [x] Desktop/narrow public reproductions and dashboard format/lint/test/build
      gates pass. No product changes outside the dashboard package are required.

## Dedupe and limits

Searched all open/done board records for parent postings, leaf accounts, tax
amounts, rollups and Cash Flow accounting. Re-read the complete w4/m2 statement
DoD and its model task, plus w4/m3's role-override DoD. The former requires net
change in CCE; the latter preserves unannotated numbers while adding metadata,
and neither tracks this loss. Source history contains 47672769 introducing
the leaf-only assumption; no later fix is on fetched main.

This is distinct from w3/004's hidden controls, m15's filter navigation,
020's stale print snapshot, and 007's mixed-unit BQL COST aggregate. The period
and at-cost conversion stayed fixed throughout this repro. Cash-flow heuristics
and their disclosed accounting limitations are unchanged. The real-estate
November control has no parent/child direct-posting collision and correctly
reconciles opening112489.86, closing178145.77 and net65655.91USD.

Unverified: private/writer ledgers, live parent cash-account balances, alternate
conversion/fiscal periods, expired sessions, network failures, all locales and
the native app. No ledger writes, product implementation or shipping occurred.
One narrow screenshot was replaced after number animations settled; its final
opening value was checked against text before retaining it.

Evidence under `dashboard/tmp/qa-20260907-w3-loop/`:
`cash-flow-parent-evidence.json`, `cash-flow-parent-arithmetic.json`,
`cash-flow-parent-rest.json`, `cash-flow-parent-row-dropped.png`,
`cash-flow-parent-monthly-summary-390.png`,
`cash-flow-parent-yearly-summary-390.png`,
`cash-flow-parent-yearly-summary-1440.png`, and the
`cash-flow-parent-monthly.csv/.md` and `cash-flow-parent-yearly.csv/.md` exports.
