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

[129](./129.md) is not listed below: it was promoted into [m35](./m35/README.md),
which links it as its reproduction record. [113](./113.md) stays parked — its
producer is an upstream `@rustledger/wasm` defect with no released fix (re-checked
2026-09-11, newest published version is still 0.24.0).

- [003](./003.md) — Bulk entry writes are not retry-safe after a false timeout
- [113](./113.md) — Lot reductions replace current market prices (blocked on upstream engine)
- [115](./115.md) — Mobile carries an account filter into a different ledger and hides its journal
- [120](./120.md) — Accounts loses search and type selection on browser Back
- [122](./122.md) — Mobile Back revives an account route under a different ledger
- [130](./130.md) — Mobile Reports recent entries use a different month from the chart
- [131](./131.md) — Journal loses the current page after an account drill-down
- [137](./137.md) — Transaction Share link closes its menu without opening the iOS share sheet
- [143](./143.md) — Chart contact leaves the ledger drawer unresponsive
- [152](./152.md) — Missing public profiles become internal server errors
- [154](./154.md) — Reveal the selected account when the native picker opens
- [156](./156.md) — Keep the last-posting automatic-balance toggle available when off
- [157](./157.md) — Unsupported BQL integer results are reported as a temporary outage
- [160](./160.md) — Holdings loses the selected grouping after an account drill-down
- [162](./162.md) — Make native wheel selection emphasis follow the option Confirm will save
- [164](./164.md) — Public ledger collection loses search, sorting and expansion on Back
- [165](./165.md) — Accept supported digit-led and Unicode names in native Open Account
- [168](./168.md) — Open the receipt photo picker without requiring broad library access
- [171](./171.md) — Preserve the exact target amount when chart counting finishes
- [175](./175.md) — Keep zero-balance accounts inside their actual parent branches
- [178](./178.md) — Retain directive types in the mobile account journal
- [179](./179.md) — Show a missing-file state when the editor query returns null
