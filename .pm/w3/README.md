# w3 — General adoption worker queue (worker3)

**Worker:** worker3 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Milestones

- [ ] **m1** — Budget read-only: Home panel + /budget page (13 tasks) ← from budget-on-mobile PM spec 2026-08-09
- [ ] **m2** — Budget management: add, update, delete from mobile (9 tasks) ← from budget-on-mobile PM spec 2026-08-09 — sequenced after m1
- [x] **m3** — Budget localization & analytics-driven iteration (7 tasks) ← from budget-on-mobile PM spec 2026-08-09 — sequenced after m2
- [x] **m4** — Beancount MCP endpoint: make it connectable and keep it conformant (7 tasks) ← from `backend-cluster/backend-v2/docs/ADR0007-mcp-surface.md`
