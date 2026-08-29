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
