# w3 — Mobile budget parity & the agent-facing MCP endpoint (worker3)

**Worker:** worker3 — third workstream. It opened on budget tracking, bringing dashboard features to the mobile glance surface (m1–m3, from the 2026-08-09 budget-on-mobile PM spec; dashboard reference: `dashboard/src/features/ledger-data/budget/` — those three need zero backend changes, because every GraphQL operation they use already exists in the mobile schema). Widened at m4 to the backend's MCP endpoint: the surface a coding agent connects to, and the most direct expression of the A1 pillar this board exists to serve.

## Milestones

- [ ] **m1** — Budget read-only: Home panel + /budget page (13 tasks) ← from budget-on-mobile PM spec 2026-08-09
- [ ] **m2** — Budget management: add, update, delete from mobile (9 tasks) ← from budget-on-mobile PM spec 2026-08-09 — sequenced after m1
- [ ] **m3** — Budget localization & analytics-driven iteration (7 tasks) ← from budget-on-mobile PM spec 2026-08-09 — sequenced after m2
- [x] **m4** — Beancount MCP endpoint: make it connectable and keep it conformant (7 tasks) ← from `backend-cluster/backend-v2/docs/ADR0007-mcp-surface.md`
