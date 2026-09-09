# w3 · m28 — Keep BQL values connected to their columns

**Worker:** worker3 **Goal:** query results preserve column relationships visually and in the accessibility tree **Status:** done

## Tasks (in order)

| id   | title                                                      | est | depends_on |
| ---- | ---------------------------------------------------------- | --- | ---------- |
| t001 | Give headers and virtual rows one horizontal scroll layout — **DONE** | 45m | —          |
| t002 | Expose result tables, headers and virtual row positions — **DONE** | 40m | t001       |
| t003 | Verify BQL result adoption surfaces — **DONE** | 20m | t002       |
| t004 | Simplify result layout and semantics — **DONE** | 20m | t003       |
| t005 | Verify real scrolling and accessible table structure — **DONE** | 45m | t004       |
| t006 | Close out and archive the BQL result repair — **DONE** | 15m | t005       |

185 minutes total, including 85 minutes of implementation. One major finding
group promoted from [028](../028.md), with independently reproduced missing
table semantics in the same renderer. The historical note is not another queue.

## Definition of done

- The original six-column result in 028 keeps each header aligned with its
  values while horizontal scrolling starts over either header or body.
  Resizing between 390px and desktop preserves that alignment.
- The four-column, 40-row query below exposes a named table, four column
  headers and each mounted row's four data cells. It is not merely a list of
  unassociated text.
- Virtualization conveys the full 41-row count including the header, with
  correct global row indexes. Top body rows 2–21 and bottom body rows 22–41
  are represented correctly for the observed 20-row render window.
  Counts adapt to actual data and overscan; do not hard-code the fixture.
- Vertical virtualization, the 600px height cap, last-row/column access and
  complete CSV data remain intact. The real 40th result ends with
  Expenses:Home:Electricity, 65.00, USD for the current public fixture.
- Table changes preserve disclosure/history controls, text/chart/empty/loading/
  error rendering, native keyboard use and exact query values.
- Real browser geometry and Chrome accessibility-tree checks, meaningful
  component checks and dashboard format, lint, test and build gates pass.
  No production write is required.

## Source + Goal linkage

- **Source:** [028](../028.md), expanded through fresh dashboard QA on
  2026-09-08.
- **Goal linkage:** **A2 — Frictionless onboarding**. A person exploring a first
  ledger with BQL can reliably associate dates, accounts, numbers and
  currencies in wide results and with assistive technology.
- **Expected outcome:** the same correct API response remains understandable
  while scrolling and through the browser's table-reading interface.
- **Why now:** the current wrapper separates horizontal scrolling, and its
  virtualized DIV renderer also drops row/cell relationships. Both concern
  QueryResultCard's presentation of the same result and require a coherent
  layout/semantics repair.
- **Adoption surface:** included for the existing user-facing query journey;
  no new command, skill, API or dependency is needed.

## Repeated live evidence

Severity: **major**. Owner: **dashboard**.

Production `https://beancount.io`, Chrome 152, English/light, 1440×1000 and
390×844, QA reader of public `open_ledger/example`. Local HEAD `a315c273`,
fetched main `afb36a9b`; implicated source unchanged, deployed SHA unverified.
All contexts were isolated and all write attempts guarded; none occurred.

1. Open the ledger's Query page with the URL `query` parameter set to
   **SELECT date, account, number, currency LIMIT 40**.
2. Wait for the open history card to show **40 rows**. QueryShell returns
   HTTP 200, no errors, four ordered type descriptors and 40 four-cell rows.
   The first row is 2015-01-01, Assets:US:BofA:Checking, 3490.52, USD.
3. The DOM visually renders four headers and 20 mounted data rows. Chrome's
   accessibility tree for this card has one list and **zero tables, rows,
   column headers or data cells**. Its snapshot concatenates the values
   under a list without the visible table relationships.
4. Repeat from fresh navigation at both widths. Four documents and all
   QueryShell reads return 200, with no page exceptions or mutation attempts.
5. In the fresh narrow control, a horizontal wheel gesture over the body
   moves it by 142px while the header/outer scroller remains at zero. Header
   x positions stay 26/146/266/386; body cells become -116/4/124/244.
   At desktop, the columns fit and both scroll positions remain zero.
   This independently confirms 028's original six-column reproduction.

Temporary DOM-only controls add coherent table/rowgroup/row/header/cell roles,
a label, total row count and indexes to the existing nodes. Chrome then exposes
one table, four headers, 21 mounted rows and 80 data cells. After scrolling to
the end, the diagnostic roles are reapplied to newly mounted rows and the
same counts expose global indexes 22–41. The last result remains the actual
40th API row. These controls establish the missing semantic cause; they are
not a product patch or a claim that manual attributes survive remounts.

No native screen reader or Safari was tested. Chrome AX and DOM evidence
establish the structural failure; implementations should record any additional
assistive-technology coverage precisely. All CDP sessions and contexts closed.

## Cause and repair boundary

Under `dashboard/src/features/bql/components/query-result-card.tsx`:

- Lines 73–84 render an outer horizontal scroller and plain DIV headers.
  Lines 86–93 keep the nested List at width 100%, producing the independent
  body scroll owner documented in 028.
- Lines 94–110 render row/cell DIVs without table roles. The callback consumes
  index/style and row data but does not expose semantic row or cell structure.
- Pinned react-window 2.2.5's List defaults to role=list at dist source
  855–856. It supplies listitem/position/set-size attributes to row renderers
  at 812–815, but this callback does not spread them. Even those default list
  attributes would not express this result's tabular columns.
- The integrity-verified dependency accepts HTML attributes on List and spreads
  them after its default role. Its existing API supports an appropriate
  container role without a dependency patch or upgrade.

Keep a shared content width and one horizontal scroll owner for headers and
virtual rows. Use coherent static table semantics, preferably native markup
where compatible with the virtualizer, or properly related table/rowgroup/row/
columnheader/cell roles. Reuse the existing translated result label.
The [WAI table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/) describes
this static structure; the
[virtual-row properties guidance](https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/)
covers total counts including headers and global indexes when only some rows
are mounted. Configure the renderer so those attributes are correct on every
mount and scroll; keep the spacer out of the data-row structure.

Preserve accessible scrolling and existing controls. Avoid synchronizing two
independent scrollers, removing virtualization, hiding later columns, or adding
an interactive grid/column-sort feature. A live `SELECT DISTINCT number WHERE
currency = 'USD' ORDER BY number LIMIT 20` control returns correctly ordered
decimal values at both widths; no sorting defect was retained.

QueryResultCard has one application caller in `features/bql/pages/index.tsx`,
covering every history result and query URL. The API's ordered types/rows are
correct; no schema, query, financial formatter, cache or backend change is
needed. Existing tests mock react-window into a plain DIV and ten rows, which
does not prove real scroll ownership, dependency roles or virtual row indexes.

## Dedupe and limits

All open/completed board records and targeted history were searched for BQL
table structure, virtual rows, header association and horizontal scrolling.
028 owns the same result renderer and is promoted rather than duplicated.
m25 addresses a different native-TR activation helper in Accounts/Holdings/
Documents; this query table has no row activation. m12/055/077 concern execution,
ledger cache and cancellation, not result structure.

The renderer traces to `af5339de`; fetched main has no correction. Original
six-column screenshots, CSV completeness and the 60-row scroll control remain
in 028. A patched live flow, native screen readers and non-overlay scrollbars
remain unverified.

Ignored evidence under `dashboard/tmp/qa-20260907-w3-loop/`:
`bql-result-structure-evidence.json`,
`bql-result-structure-{1440,390}.png`,
`bql-react-window-integrity.json`, pinned dependency sources, and 028's original
scroll evidence. The JSON includes only known public query data and scoped AX
counts/snapshots; no credentials, private profile data or unfiltered AX dump.
