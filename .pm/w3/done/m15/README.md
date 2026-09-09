# m15 — Keep ledger filters consistent with navigation and history

**Status:** done

| Task | Title                                                             | Estimate | Depends on |
| ---- | ----------------------------------------------------------------- | -------- | ---------- |
| t001 | Bind global ledger filters to validated router search — **DONE** | 45m      | —          |
| t002 | Preserve same-ledger filter context in links and loaders — **DONE** | 40m      | t001       |
| t007 | Carry the Overview money-movement month into its drill-down links — **DONE** | 45m      | t001       |
| t003 | Adoption surface — verify reproducible filtered report links — **DONE** | 20m      | t002, t007 |
| t004 | Simplify the filter and navigation changes — **DONE**            | 20m      | t003       |
| t005 | Test shared filter navigation, history and hydration — **DONE**  | 45m      | t003       |
| t006 | Closeout — **DONE**                                              | 15m      | t004, t005 |

## Source + Goal linkage

- Source: repeated dashboard QA on 2026-09-08, requested for w3. Related
  filter/navigation failures: navigation drops the filter from the
  URL while retaining filtered values, and Back restores a URL without restoring
  its filter state. Additional reproducers cover percent-containing filter links
  and Overview monthly drill-downs that never encode their selected period.
- A2 — Frictionless onboarding: a reader can navigate, reload and share a
  filtered public report without silently changing its period or values.
- Expected outcome: URL, visible controls, report requests and exports describe
  the same selection before and after navigation/history/SSR hydration.
- Why now: the shared provider affects ten production consumers. A report URL
  currently produces different results after reload; this undermines the
  trustworthiness of public examples and report sharing. The provider/router
  repair, link/loader integration and monthly drill-downs are about 130 minutes of implementation,
  with shared regression coverage and the standing closing tasks afterward.
- Adoption surface is included because this changes every user-facing filtered
  ledger journey. No new feature, backend contract or dependency is required.

## Reproduced finding

Environment: production https://beancount.io, Chrome 152, authenticated QA public
reader on synthetic `open_ledger/example`, English/System light, 1440×1000 and
fresh 390×844. Source HEAD a315c273; fetched origin/main cc3f4c2f has no filter
provider fix. The running client is not proven identical to local HEAD.

1. Fresh-open `/ledger/open_ledger/example/journal?time=2016`: 393 transactions.
   The desktop Time control says `2016`.
2. Click Related Pages → Balance Sheet. The URL becomes
   `/ledger/open_ledger/example/balance-sheet` with no search string, but Time
   remains `2016` and assets show 80,149.807 USD plus 25 VACHR, at cost.
3. Reload that URL. Time clears and assets become 109,529.339 USD plus -13
   VACHR. A fresh narrow repeat produces the same before/after values; global
   controls are hidden at that width. The expanded sidebar Balance Sheet link
   independently drops the URL filter while retaining 2016 data.
4. Fresh-open the 2016 Journal again, follow Balance Sheet, then change Time to
   `2017-09`. Browser Back returns to `/journal?time=2016` but Time still says
   `2017-09` and only six September transactions appear. Reload restores 2016
   and 393 transactions.

Working API controls (GraphQL HTTP 200, `conversion: "at_cost"`,
`interval: "monthly"`) return assets 80149.80683 USD/25 VACHR for 2016 and
109529.33944 USD/-13 VACHR for September 2017 or no Time filter. Matching Journal
transaction totals are 393, 6 and 1044. The service honors the supplied filters;
this is a dashboard state/navigation defect. An exploratory control without the
conversion parameter used the server's different default and was discarded.

## Root cause and fix boundary

`dashboard/src/common/providers/ledger-search-params-provider/ledger-search-params-provider.tsx:14`
initializes React state from the URL once; `:61` writes directly through
`window.history.replaceState`. It never observes router navigation or Back.
`common/components/ledger-layout/index.tsx:79` keeps that provider mounted across
child routes. `common/components/related-links.tsx:34` and
`common/components/ledger-layout/ledger-sidebar.tsx:334,406` build links without
global search context. The ledger parent route has no shared search validation
or retention policy. Five report loaders separately read global browser/request
URLs while report components consume the provider snapshot.

Make validated router search the shared source of account/filter/time. Keep
filter edits as replacement navigation, preserve unrelated valid route state,
and make explicit clear remove all three values. Preserve those global filters
on same-ledger navigation; reset them on a ledger switch unless the destination
explicitly supplies filters. Do not propagate journal action/directive, query
text or file edit parameters to unrelated pages. Resolve report loader inputs
from the target route, preserving SSR behavior and existing loading/error UI.

The lockfile pins TanStack Router/core 1.167.0. Its published package contains
`retainSearchParams` and standard search parsing/serialization; use the existing
router mechanisms with a ledger-scoped retention policy rather than parallel
history listeners or another state store. See the official
[search parameter guide](https://tanstack.com/router/latest/docs/guide/search-params)
and [retention API](https://tanstack.com/router/latest/docs/api/router/retainSearchParamsFunction).
The numeric-looking year and current double-encoded filter links need explicit
compatibility handling when replacing the old parser; do not assume every
router search value is already a string.

Blast radius: production `useLedgerSearchParams` consumers are Journal; reports
Overview, Balance Sheet, Income Statement, Account, Trial Balance, Cash Flow;
Events; Statistics entries-count and account-last-entry panels. The five report
loaders use `getLedgerSearchParams`. Preserve each report's existing semantics;
this does not add filter support to reports that intentionally lack it.

## Additional filter-link reproducer

Additional reproduced compatibility case in the same filter-URL repair: opening
`/ledger/open_ledger/example/journal?filter=payee%3A%22100%25%22`, the normally
encoded expression `payee:"100%"`, shows **Failed to Load Ledger** and removes
the entire ledger layout. Fresh desktop reload and fresh narrow both reproduce;
document HTTP status is 200 and the console reports `URIError: URI malformed`
at `decodeURIComponent` in `main-DPzYZJMv.js:142:34583`. Both
`common/lib/ledger-search-params/client.ts:7` and `server.ts:9` decode values
again after URLSearchParams has already decoded them. The identical expression
works in GraphQL (HTTP200, total0), and entering it in the UI generates a
double-encoded URL that reloads successfully. Preserve those existing generated
links while accepting standard encoding; no malformed filter should crash the
layout. All-board searches for URIError, percent filters and double encoding
found no separate item, so this is additional coverage in t001/t005 rather than
another overlapping task.

## Definition of Done

- [ ] Fresh 2016 Journal → Balance Sheet via Related Pages and sidebar keeps
      `time=2016` in the destination URL and retains the same at-cost values after
      reload and opening that URL in a new tab.
- [ ] After changing the destination to September 2017, Back restores 2016 and
      393 Journal transactions; Forward restores September 2017. No reload needed.
- [ ] Account and quoted payee/tag filters round-trip with the same behavior;
      Clear all removes them without losing unrelated destination-specific state.
- [ ] Direct SSR loads and client navigation use the same validated selection;
      no stale data is presented as a settled response for a different URL.
- [ ] The standard percent-containing link and the current double-encoded UI
      link both reach the same zero-result journal without a URIError; malformed
      encodings have a recoverable state rather than failing the ledger layout.
- [ ] Ledger switching respects explicit destination filters and does not leak
      the previous ledger's selection; existing action/query/file URL behavior stays
      usable.
- [ ] October 2025 Money movement links on real-estate-example preserve the
      selected interval: statement income -2500 / expenses 3007.42 USD, and the
      Rent account has one monthly rent transaction. Reload preserves that scope.
- [ ] Real router/provider regressions cover the reported failures, including
      desktop/narrow journeys, and dashboard format/lint/test/build gates pass.

## Dedupe and limits

Searched all open/done `.pm` records for filter persistence, navigation, search
params and history. `w3/004` is a Cash Flow header visibility issue, `w3/020`
holds a stale print-document snapshot, `w3/m12` is BQL editor state, and
`w3/m13` concerns account-journal subtype inputs; none repairs this shared state.
SEO work in `w2/done/m10` intentionally removes UI parameters from canonical
metadata, not the interactive browser URL. Targeted history shows the provider
unchanged since af5339de; no newer source fix was found.

Unverified: native app, private/writer ledgers, every consumer's combined filter
matrix, session expiry and network failure. No production data writes or
product implementation included. A collapsed-sidebar locator timeout was not
retained as a separate finding; the expanded-sidebar control succeeds.

Evidence under `dashboard/tmp/qa-20260907-w3-loop/`:
`filter-navigation-evidence.json`, `filter-navigation-sidebar-evidence.json`,
`filter-navigation-sidebar.png`,
`filter-navigation-before-reload.png`, `filter-navigation-after-reload.png`,
`filter-navigation-narrow-before-reload.png`, and
`filter-navigation-narrow-after-reload.png`. Narrow screenshots were captured
after the values settled; chart lazy rendering was not part of this finding.
Percent-link controls: `filter-percent-evidence.json`,
`filter-percent-initial.png`, and `filter-percent-390.png`.

## Additional monthly drill-down reproducer

On the same production browser and role, open synthetic
`/ledger/open_ledger/real-estate-example?lang=en`. Money movement starts at
November 2025. Press Previous to select October: Money in is +2500 USD and
Money out is -3007.42 USD. The income card's View all link opens Income Statement
without a time parameter; its raw totals are lifetime income -68894 USD and
expenses 105748.23 USD. A fresh 390×844 repeat through the expense card's View
all link produces the same unfiltered result. On a fresh desktop overview,
select October and click Rent: the account destination also omits time and
shows 19 monthly Tenant transactions, including September and earlier.

Working controls: explicit `?time=2025-10` statement URLs and GraphQL reads
return -2500 USD income and 3007.42 USD expenses, HTTP200. The explicit account
URL shows one October Tenant transaction. No page errors occurred in the fresh
account-navigation repeat. Income Statement's raw credit signs differ from
Overview's presentation signs by design; only the lost period is reported.

Additional producer cause: `overview/components/money-movement-section.tsx`
stores its selected date locally at 185–190, but the View all Link at 147–150
has only route params. Category buttons at 113 call `navigateToAccount(account)`
without the selected date. `common/providers/ledger-provider/use-ledger-navigate-to-account.ts:8–17`
likewise builds only path params. Its other production caller is the generic
Account balances card, which must not acquire an unrelated local month.
The Money movement component has one Overview caller. Correct report API
responses establish that the month is lost before request generation.

This extends the existing navigation milestone via t007 rather than creating
another overlapping inbox item. The global retention repair alone cannot infer
a month that remains only in MovementCard state. Targeted history af5339de →
e63a78ee changes pointer styling, not month propagation; no later correction or
separate open/done board item was found. Partial-month ranges, combined filters,
relative/fiscal periods and a patched implementation remain unverified.

Additional evidence: `overview-month-navigation-evidence.json`,
`overview-month-before-1440.png`, `overview-month-before-390.png`,
`overview-month-after-390.png`, and `overview-month-account-all-1440.png` in the
same evidence directory. A mistaken Overview heading locator and an intentionally
hidden narrow Income Statement heading caused automation timeouts; settled
repeats above used the actual visible section headings.
