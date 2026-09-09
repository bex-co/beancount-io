# w3 · m25 — Preserve table structure while keeping row actions accessible

**Worker:** worker3 **Goal:** Accounts and Holdings expose their data as rows and cells while keeping account and document actions usable by keyboard **Status:** done

## Tasks (in order)

| id   | title                                               | est | depends_on |
| ---- | --------------------------------------------------- | --- | ---------- |
| t001 | Preserve native Accounts rows and prefix actions — **DONE** | 30m | —          |
| t002 | Put Holdings and Document actions inside data cells — **DONE** | 40m | t001       |
| t003 | Verify table navigation adoption surfaces — **DONE** | 20m | t002       |
| t004 | Simplify table activation wiring — **DONE** | 20m | t003       |
| t005 | Test native structure and independent cell actions — **DONE** | 45m | t004       |
| t006 | Close out and archive the table repair — **DONE** | 15m | t005       |

170 minutes total, including 70 minutes of implementation across three table
consumers. One **minor** accessibility finding group: visible data and ordinary
activation remain available, but the browser loses the data's table structure.

## Definition of done

- Loaded public example Accounts exposes 60 body rows plus its header row.
  Chrome's accessibility tree contains the visible data cells: 420 at 1440px,
  180 at 390px for the current fixture, associated with their native rows.
- Default Holdings exposes its 115 displayed body rows and 920 data cells;
  Holdings by Account preserves its 11 rows and 55 cells. Counts may track
  subsequent fixture changes, but every displayed body row remains a row.
- Holdings by Currency continues to expose eight body rows and 48 cells.
  Changes do not modify the queries, filtering, precision or CSV data.
- Native cell controls retain account navigation and visible focus.
  Accounts prefix actions open the chosen prefix once, and More actions
  operates independently without triggering account navigation.
- Document filename activation uses a named native control inside its cell,
  with native row/cell structure verified using a local document fixture.
  No production document needs to be created or changed.
- Journal's separate DIV button rows retain their existing activation and
  nested-action behavior. Desktop and narrow layouts remain usable.
- Real-component tests assert structure and interaction together; Chrome
  accessibility-tree checks confirm the platform rows and cells. Dashboard
  format, lint, test and build gates pass.

## Source + Goal linkage

- **Source:** repeated dashboard QA, 2026-09-08, fresh public Accounts and
  Holdings journeys at desktop and narrow widths.
- **Goal linkage:** **A2 — Frictionless onboarding**. Assistive-technology users
  exploring their first ledger need the relationship between column headings
  and account/holding values to remain available.
- **Expected outcome:** the browser exposes the same rows and cells users see,
  and account/document destinations remain reachable through named controls.
- **Why now:** a shared helper overwrites native TR semantics, and current
  tests explicitly require that defective role. Repairing a single page or
  merely changing its test expectation leaves other consumers affected.
- **Adoption surface:** included for the existing dashboard table journeys;
  no new command, package, dependency or skill is introduced.

## Reproduction and evidence

Production `https://beancount.io`, Chrome 152, English, System/light;
authenticated QA reader of public synthetic `open_ledger/example`, no global
filters. Fresh 1440×1000 and 390×844 contexts, repeated independently.
Local HEAD `a315c273`, fetched main `5b70f569`; implicated files are unchanged
between them. The deployed SHA is unverified.

1. Open `/ledger/open_ledger/example/accounts?lang=en`. Wait for real account
   rows, not the loading skeleton. Inspect the table in Chrome's accessibility
   tree: the DOM has 60 body rows, but the accessible table has only one row
   (the header), 60 links and **zero data cells**.
2. Open `/ledger/open_ledger/example/holdings?lang=en`. Its 115 displayed
   body rows likewise appear as 115 links, one header row and zero data cells.
   Both routes repeat at both widths without console errors or page exceptions.
3. Select **Holdings by Account**. Its 11 body rows also appear as links and
   have no accessible data cells. Enter on the first row correctly opens
   `/ledger/open_ledger/example/account/Assets%3AUS%3ABofA%3AChecking`.
4. As a passing control, select **Holdings by Currency** (the **View** selector
   on narrow screens). Its ordinary TR elements expose nine rows including
   the header and 48 data cells. The grouped header is `average_cost), not
`currency`.
5. In an isolated page only, remove `role="link"` from the existing body TR
   elements, without changing their data or children. Accounts then exposes
   61 rows and 420/180 cells; default Holdings exposes 116 rows and 920 cells.
   This diagnostic DOM change is not a shipped fix.
6. The existing native **Expenses** prefix button opens the Expenses account
   with Enter at both widths. Retain this working cell action.

Real GraphQL controls return HTTP 200 without errors:
`GetLedgerAccountDirectives` has 60 accounts; default `QueryShell` returns
122 raw rows and the existing UI filter displays 115; Currency returns nine
raw rows and displays eight. No response was fabricated, no mutation was
attempted, and all isolated browser contexts/CDP sessions were closed.

Playwright's computed snapshot still calls TD descendants “cell” under “link”.
Chrome's actual platform tree instead exposes those nodes as generic content.
Use the CDP counts for the platform claim. No claim is made about exact spoken
output in VoiceOver/NVDA or a completed screen-reader navigation session.

Local evidence under `dashboard/tmp/qa-20260907-w3-loop/`:
`table-row-semantics-evidence.json`, `accounts-row-semantics-1440.png`,
`accounts-row-semantics-390.png`, `holdings-row-semantics-1440.png`,
`holdings-row-semantics-390.png`. The JSON retains independent repeats and
working controls; screenshots show rendered data, not the accessibility tree.

## Root cause and repair boundary

`dashboard/src/common/components/clickable-row.ts:41` defaults every caller to
`role="link"` and returns it with focus/activation handlers.
`common/components/ui/table.tsx:53` correctly renders a native TR and forwards
that role. AccountRow (`features/ledger-data/accounts/index.tsx:200`),
DatasetTable (`holdings/holdings-table.tsx:147`) and DocumentRow
(`documents/index.tsx:37`) apply the helper directly to TR elements.
Holdings uses it only when the result has an account column, explaining the
passing Currency grouping. These are all three production table callers.
The fourth production caller, `features/journal/components/journal-table.tsx:187`,
uses a DIV with an explicit button role and must keep its separate behavior.

The API schemas already carry the records and columns:
`graphql/definitions.ts:2573` (accounts), `:2611` (documents), and
`graphql/query/report.graphql:1` (QueryShell).
Rendering turns these records into native TD children; the row role then
removes their table context. No API, serializer, backend or library change
is needed.

Preserve native TR/TD/header semantics and expose activation through native
controls inside the relevant cell. Reuse Accounts' existing prefix buttons.
Use an actual account link for Holdings and the appropriate named filename
control for Documents' existing file-navigation action. Whole-row pointer
convenience may remain without replacing the row's structural role or
creating duplicate activation from descendants. Preserve visible focus and
native keyboard behavior; do not convert the whole table into an interactive
grid or remove keyboard access as a shortcut.

The [W3C table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
recommends native tables and permits interactive controls inside individual
cells. A [cell requires a row context](https://www.w3.org/TR/wai-aria-1.2/#cell).
This mechanism comes from application markup, not a dependency defect.
Account/holding tests currently assert `role="link"` on TR; the document test
finds the entire row as a link. Replace those assumptions with structural and
interaction assertions using real table primitives.

## Dedupe and limits

Searched all local open/completed board items and fetched-main board content
for clickable-row, row/table semantics and table accessibility, and reviewed
targeted history. The role default and table callers date to `af5339de`;
there is no repair on fetched main `5b70f569`.
Completed `w5/m2` covers sidebar ledger buttons, gallery and delete-ledger
dialogs, not these tables. Inbox006 pagination, 008 file rows, 035 precision
and 056 Statistics destinations have different causes. Coordinate m23 account
menu focus work if both touch AccountRow; neither subsumes this structure fix.

Populated Documents is source-only: available public fixtures had none.
Local document data supplies regression coverage. Actual assistive-technology
speech, other browsers, loading/empty/error table transitions and write-enabled
menu actions remain acceptance work, not claimed live results. No ledger or
document mutation is required.
