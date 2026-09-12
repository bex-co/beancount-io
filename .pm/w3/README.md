# w3 — General adoption worker queue (worker3)

**Worker:** worker3 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Milestones

- [ ] **m34** — Preserve decimal amounts in native multi-posting drafts (6 tasks) ← from native QA 2026-09-11

- [ ] **m1** — Budget read-only: Home panel + /budget page (13 tasks) ← from budget-on-mobile PM spec 2026-08-09
- [ ] **m2** — Budget management: add, update, delete from mobile (9 tasks) ← from budget-on-mobile PM spec 2026-08-09 — sequenced after m1
- [x] **m3** — Budget localization & analytics-driven iteration (7 tasks) ← from budget-on-mobile PM spec 2026-08-09 — sequenced after m2
- [x] **m4** — Beancount MCP endpoint: make it connectable and keep it conformant (7 tasks) ← from `backend-cluster/backend-v2/docs/ADR0007-mcp-surface.md`
- [x] **m5** — Surface parity groundwork: honest counts and the MCP resource layer (8 tasks) ← from `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md`
- [x] **m6** — Port the ledger vocabulary reads to REST and MCP together (7 tasks) ← from `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md`
- [x] **m7** — Port the report and journal reads to REST and MCP (8 tasks) ← from `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md`
- [x] **m8** — Port the bank-import family to REST and MCP (8 tasks) ← from `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md`
- [x] **m9** — Restore defense in depth on the Plaid services (5 tasks) ← prerequisite of m8, found in w3/m8/t001
- [x] **m10** — Dashboard personal access tokens: create, verify, and document the API-key path (7 tasks) ← direct user request, 2026-08-29
- [x] **m11** — Reliable entry context for public-ledger readers (7 tasks) ← dashboard QA, 2026-09-07
- [x] **m12** — Execute and restore the BQL query shown in the editor (6 tasks) ← dashboard QA, 2026-09-07
- [x] **m13** — Make account journal filters affect the returned entries (8 tasks) ← repeated dashboard QA, 2026-09-07
- [x] **m14** — Make Statistics postings counts honor the active filters (8 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m15** — Keep ledger filters consistent with navigation and history (7 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m16** — Preserve parent-account postings in Cash Flow (6 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m17** — Make commit file links reach deferred and virtualized diffs (6 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m18** — Keep lot reductions from replacing current market prices (7 tasks) ← repeated dashboard QA, 2026-09-08 — **ABANDONED** 2026-09-10, blocked on an upstream engine fix that does not exist; carried forward as [113](./113.md)
- [x] **m19** — Keep import values valid from parsing through configuration (8 tasks) ← promoted038 and repeated dashboard QA, 2026-09-08
- [x] **m20** — Expose reporting filters on Cash Flow and narrow layouts (7 tasks) ← promoted004 and repeated dashboard QA, 2026-09-08
- [x] **m21** — Continue profile social lists beyond the first page (7 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m22** — Localize relative timestamps and date calendars (8 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m23** — Restore focus after Journal, Budget and Account dialogs (8 tasks) ← promoted050 and repeated dashboard QA, 2026-09-08
- [x] **m24** — Keep typed dates consistent with submitted entries (6 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m25** — Preserve table structure while keeping row actions accessible (6 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m26** — Prepare complete transaction amounts from eligible postings (6 tasks) ← promoted067 and repeated dashboard QA, 2026-09-08
- [x] **m27** — Preserve explicit amounts when a posting omits currency (6 tasks) ← repeated dashboard QA and verified upstream fix, 2026-09-08
- [x] **m28** — Keep BQL values connected to their columns (6 tasks) ← promoted028 and repeated dashboard QA, 2026-09-08
- [x] **m29** — Protect file drafts during navigation and cancellation (6 tasks) ← promoted041 and repeated dashboard QA, 2026-09-08

- [ ] **m30** — Apply shared account filters to account-journal reads (8 tasks) ← continuous dashboard QA, 2026-09-11

- [ ] **m31** — Complete the Entry Context keyboard journey (6 tasks) ← continuous dashboard QA,2026-09-11

- [ ] **m32** — Expose statement hierarchy tables to assistive technology (6 tasks) ← continuous dashboard QA,2026-09-11

- [ ] **m33** — Preserve import configuration across Back (6 tasks) ← continuous dashboard QA,2026-09-11

- [ ] **m35** — Keep report results and exports tied to their completed request (7 tasks) ← promoted129 and pending-conversion QA

- [ ] **m36** — Reject lossy CSV amount conversions before import (6 tasks) ← residual m19 validation boundary, dashboard QA2026-09-11

## Inbox

- [003](./003.md) — Bulk entry writes are not retry-safe after a false timeout
- [105](./105.md) — Mobile Settings clips invitation copy in Spanish and at larger text sizes
- [109](./109.md) — Mobile Home and journal round nonzero crypto rewards to zero
- [111](./111.md) — Mobile recurring switch has no accessible name
- [112](./112.md) — Mobile merchant detail fails for punctuated payee names
- [113](./113.md) — Lot reductions replace current market prices (blocked on upstream engine)
- [114](./114.md) — Read-only account filter offers Create and sends users to a blocked screen
- [115](./115.md) — Mobile carries an account filter into a different ledger and hides its journal
- [116](./116.md) — Journal truncates nonzero units and precise quotes to two decimals
- [117](./117.md) — Download ZIP fails without user feedback when archive discovery rejects
- [118](./118.md) — Smart Import accepts reordered CSV headers but swaps monetary values
- [119](./119.md) — m17 follow-up: initial virtual diff selection is consumed before the list is ready
- [120](./120.md) — Accounts loses search and type selection on browser Back
- [121](./121.md) — Mobile read-only budget history exposes Delete
- [122](./122.md) — Mobile Back revives an account route under a different ledger
- [123](./123.md) — Mobile Home budget rows omit amounts from native accessibility
- [124](./124.md) — Mobile budget charts lack an accessible data summary
- [125](./125.md) — Hierarchy chart clicks move accounts off-screen with no reset control
- [126](./126.md) — Trial Balance narrow view selection leaves the wrong chart displayed
- [127](./127.md) — Collapsed report charts remain keyboard-focusable
- [128](./128.md) — Expandable mobile report categories omit accessible amounts
- [129](./129.md) — Report filter changes expose old results without pending feedback
- [130](./130.md) — Mobile Reports recent entries use a different month from the chart
- [131](./131.md) — Journal loses the current page after an account drill-down
- [132](./132.md) — Current plan summary ignores the selected app language
- [133](./133.md) — Report pages discard invalid-input error guidance
- [134](./134.md) — Cash Flow keeps an old error after the filter is corrected
- [135](./135.md) — Editing a multiline import description joins its lines
- [136](./136.md) — Import Select All hides partially selected state
- [137](./137.md) — Transaction Share link closes its menu without opening the iOS share sheet
- [138](./138.md) — Empty Statistics periods render NaN percentages
- [139](./139.md) — A one-month Net Worth chart has no visible data point
- [140](./140.md) — Stop offering broken links for generated mobile transactions
- [141](./141.md) — Import rejects a valid calendar date in a different browser timezone
- [142](./142.md) — Import preview hides existing field errors until an unrelated edit
- [143](./143.md) — Chart contact leaves the ledger drawer unresponsive
- [144](./144.md) — Net Worth and Recent Activity dates ignore the selected language
- [145](./145.md) — Money Movement drill-down widens a range spanning partial months
- [146](./146.md) — Generated padding rows open an unusable Entry Context dialog
- [147](./147.md) — Report chart toolbars clip conversion controls on narrow screens
- [148](./148.md) — Trial Balance hides its conversion selector below desktop width
- [149](./149.md) — Name the native posting amount fields and expose their signed values
- [150](./150.md) — Holdings hides CSV downloads on narrow screens
- [151](./151.md) — Keep native navigation action labels inside the bar
- [152](./152.md) — Missing public profiles become internal server errors
- [153](./153.md) — Dark-theme statement PDFs retain black page margins
- [154](./154.md) — Reveal the selected account when the native picker opens
- [155](./155.md) — Generated payee suggestions treat literal punctuation as regex syntax
- [156](./156.md) — Keep the last-posting automatic-balance toggle available when off
- [157](./157.md) — Unsupported BQL integer results are reported as a temporary outage
- [158](./158.md) — Balance Sheet chart controls reset collapsed account branches
- [159](./159.md) — Give the shared native Back control a spoken name and button role
- [160](./160.md) — Holdings loses the selected grouping after an account drill-down
- [161](./161.md) — Closing the narrow sidebar loses keyboard focus
- [162](./162.md) — Make native wheel selection emphasis follow the option Confirm will save
- [163](./163.md) — Gallery Escape abandons keyboard focus in the search field
- [164](./164.md) — Public ledger collection loses search, sorting and expansion on Back
- [165](./165.md) — Accept supported digit-led and Unicode names in native Open Account
- [166](./166.md) — Errors table source navigation is pointer-only
- [167](./167.md) — Keep native wheel picker actions and rows usable at large text sizes
- [168](./168.md) — Open the receipt photo picker without requiring broad library access
- [169](./169.md) — Account suggestions extend above short browser viewports
- [170](./170.md) — Auth next guard accepts a tab-obfuscated external redirect
- [171](./171.md) — Preserve the exact target amount when chart counting finishes
- [172](./172.md) — Password reset calls a validation outage an expired token
- [173](./173.md) — Expose account-tree disclosure independently from account navigation
- [174](./174.md) — Size Home chart pages for wrapped large-text amounts
- [175](./175.md) — Keep zero-balance accounts inside their actual parent branches
- [176](./176.md) — Expose receipt camera actions and flash state to accessibility
- [177](./177.md) — Keep merchant and transaction search feedback above the keyboard
- [178](./178.md) — Retain directive types in the mobile account journal
- [179](./179.md) — Show a missing-file state when the editor query returns null
- [180](./180.md) — Let search fields grow enough to display enlarged typed text
- [181](./181.md) — Keep merchant rows readable at enlarged text sizes
- [182](./182.md) — Let the filter Apply button fit enlarged text
- [183](./183.md) — Keep enlarged report category names distinguishable
- [184](./184.md) — Keep confirmation dialog actions above the keyboard
- [185](./185.md) — Mobile accepts a reversed custom date range and breaks Transactions
