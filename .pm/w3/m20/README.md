# w3 · m20 — Expose reporting filters on Cash Flow and narrow layouts

**Status:** todo

## Tasks (in order)

| Task | Title                                                      | Estimate | Depends on |
| ---- | ---------------------------------------------------------- | -------- | ---------- |
| t001 | Expose global reporting filters on Cash Flow               | 20m      | —          |
| t002 | Provide a usable filter panel below the desktop breakpoint | 40m      | t001       |
| t003 | Verify filter commits and clearing across responsive views | 25m      | t002       |
| t004 | Adoption surface — verify discoverable reporting filters   | 20m      | t003       |
| t005 | Simplify the header and filter presentation changes        | 20m      | t004       |
| t006 | Test route visibility and responsive filter interactions   | 40m      | t004       |
| t007 | Closeout                                                   | 15m      | t005, t006 |

## Source + Goal linkage

- **Source:** promoted [004](../004.md), the preceding dashboard QA pass's
  Cash Flow header finding, extended with fresh narrow Journal evidence on
  2026-09-08. This is its sole implementation queue.
- **A2 — Frictionless onboarding:** a reader can inspect, change and clear the
  period/account/payee scope of a report from either a desktop or narrow browser.
- **Expected outcome:** the existing shared reporting filters remain reachable
  on supported routes and widths; readers do not need to edit URLs or widen a
  window to change an active filter.
- **Why now:** the original route omission and the responsive wrapper both hide
  the same shared controls. The expanded work is 85 implementation minutes
  across three tasks, plus 95 minutes of standing closing work (180 total), so
  it now warrants promotion from a sub-hour inbox item.
- **Adoption surface included:** the new narrow control is user-facing and must
  be discoverable. No API, financial-model, dependency or native-mobile change
  is required.

## Reproduced behavior

Severity: **minor**, dashboard. Production https://beancount.io, 2026-09-08,
Chrome 152, English/System light, authenticated QA reader of synthetic public
`open_ledger/crypto-example`. Local HEAD `a315c273`, freshly fetched main
`cc3f4c2f`; implicated header and controls unchanged there. Deployed SHA
unverified. The original 004 preserves its earlier public-example reproducer
and September 2017 Markdown evidence.

1. Fresh-open `/ledger/open_ledger/crypto-example/journal?time=2025` at 1440×1000.
   Time shows **2025**; Account, payee/tag and Clear all are present.
   Journal displays **Results 1–1 / 1**.
2. Fresh-load that same URL at 390×844. The one transaction remains, but Time,
   Account, payee/tag and Clear all disappear from the accessibility tree.
   The underlying Time input still contains 2025; its hidden ancestor is
   `div.hidden.lg:block`.
3. Open the real Sidebar, including Reports and Advanced. It offers navigation
   links and account search, with no replacement for these global filters.
4. Repeat at 768×1000: Time and Clear all are still absent. The actual Journal
   request returns HTTP 200, `time:"2025"`, offset 0, total 1, one row.
5. Resize to 1440×1000 and activate Clear all with Enter. The URL loses time,
   the Time input clears, and Journal returns **Results 1–60 / 68**. Its actual
   request is HTTP 200, time/account/filter empty, offset 0, total 68.
6. Recheck desktop `/ledger/open_ledger/crypto-example/cash-flow?time=2025`.
   Cash Flow renders with Monthly and At Cost values, but no Time, Account or
   Clear all. This independently retains 004's route-omission failure.

The monitored 768px/desktop clear repeat had no page errors or GraphQL errors.
All actions were reads or reversible browser preferences. Filters and Sidebar
were cleared/closed afterward. No production resources or ledger data changed.

## Root cause and boundaries

`dashboard/src/common/components/ledger-layout/layout-header.tsx:49–57`
omits Cash Flow from its route policy. At 71–74, every allowed route's sole
LedgerSearchControls caller is wrapped in `hidden lg:block`, with no narrow
replacement. These are two predicates governing the same header surface.

`common/components/ledger-search-controls/index.tsx:72–212` owns the shared
controls. Its current fixed horizontal layout and three minimum-width wrappers
must be adapted when used in a narrow panel. Keep the existing provider values,
option generation, commits and Clear all handler; do not create mobile-only
filter state. Use existing Sheet/Dialog and combobox primitives, with localized
names, active-state visibility and deliberate focus handling.

Affected current route policy: Overview, Journal, Income Statement, Balance
Sheet, Trial Balance, Account, Events and Statistics. Add Cash Flow, the
documented missing consumer. Preserve unrelated routes that do not use global
filters. Data consumers and API selectors remain unchanged.

m15 owns URL/provider/history synchronization; coordinate without duplicating
its implementation. 044 is the account report's separate interval/valuation
selectors. 048 is the wrong whole-ledger empty message for a filtered Overview:
settled desktop Clear all already works there, and its responsive recovery is
owned here. Do not add a second filter panel in those feature components.

## Definition of done

- [ ] Desktop Cash Flow exposes Time, Account and payee/tag controls, and the
      original 004 period change/clear agrees with the statement and export.
- [ ] At 390px and 768px, the exact Journal time=2025 route exposes a discoverable
      filter panel showing that selection; fields and suggestions fit the viewport.
- [ ] Clearing that selection through the narrow UI restores 68 transactions,
      clears account/filter/time in the shared state and URL, and retains
      unrelated valid route state.
- [ ] Keyboard opening, suggestion selection, Enter/blur commits, Escape dismissal
      and focus return work; resizing and reopening preserve committed values.
- [ ] Other supported filter routes use the same responsive controls; unrelated
      routes, report grouping/valuation and writer-only actions retain their behavior.
- [ ] Loading and failed attribute requests stay distinct from an empty selection.
- [ ] Meaningful route and browser interaction checks pass, along with dashboard
      format/lint/test/build; all closing tasks are complete before archival.

## Dedupe and limits

All-board searches for hidden filters, responsive filter controls and header
visibility found the overlapping original 004; promote and extend it instead
of adding another inbox implementation. Open milestone summaries were reviewed.
Targeted history traces both header predicates to `af5339de`; fetched main
has no repair. Existing m15, 044 and 048 own the adjacent scopes described above.

Only Journal's narrow global-filter absence and desktop working clear were
exercised in full here, with Cash Flow's desktop omission rechecked. All other
route effects are caller-traced, not separate live failures. The proposed panel,
combined filters inside it, other locales/browsers, screen readers, private/
writer states, forced offline/expiry and a patched implementation are unverified.
An assumed Cash Flow combobox name caused an automation timeout; Monthly is its
value, and the settled page rendered normally. No new loading failure is filed.

## Evidence

Ignored artifacts under `dashboard/tmp/qa-20260907-w3-loop/`:
`global-filter-visibility-evidence.json`, `global-filters-control-1440.png`,
`global-filters-hidden-390.png` and `global-filters-hidden-768.png`.
The JSON includes actual request inputs/status/counts and the expanded Sidebar
snapshot. The original three 004 artifacts in `dashboard/tmp/qa-20260907-w3/`
were independently checked and remain present.
