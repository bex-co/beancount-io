# w3 — Mobile budget & dashboard parity (worker3)

**Worker:** worker3 — third workstream; brings dashboard features to the mobile glance surface, starting with budget tracking. Sourced from the 2026-08-09 budget-on-mobile PM spec (dashboard reference: `dashboard/src/features/ledger-data/budget/`). Zero backend changes — every GraphQL operation already exists in the mobile schema.

## Milestones

- [ ] **m1** — Budget read-only: Home panel + /budget page (13 tasks) ← from budget-on-mobile PM spec 2026-08-09
- [ ] **m2** — Budget management: add, update, delete from mobile (9 tasks) ← from budget-on-mobile PM spec 2026-08-09 — sequenced after m1
- [ ] **m3** — Budget localization & analytics-driven iteration (7 tasks) ← from budget-on-mobile PM spec 2026-08-09 — sequenced after m2
