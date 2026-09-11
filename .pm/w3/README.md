# w3 — General adoption worker queue (worker3)

**Worker:** worker3 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Milestones

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
- [ ] **m18** — Keep lot reductions from replacing current market prices (7 tasks) ← repeated dashboard QA, 2026-09-08
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

## Inbox

- [003](./003.md) — Bulk entry writes are not retry-safe after a false timeout
- [097](./097.md) — Shared mobile commit links stack the destination twice

- [098](./098.md) — BQL completion keeps the typed prefix before the suggested query

- [099](./099.md) — BQL suggestions accumulate duplicates after returning to Query

- [100](./100.md) — Mobile file editor retains the previous ledger document after a link switch

- [101](./101.md) — Mobile picker confirms the first option instead of its displayed initial selection

- [102](./102.md) — Valid BQL block comments fail in hosted queries

- [103](./103.md) — Loading buttons lose their accessible names

- [104](./104.md) — Guest Star and Follow discard the sign-in return destination
