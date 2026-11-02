# w7 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Milestones

- [x] **m1** — [Plan limits resolve from Stripe and store subscriptions alike](./done/m1/README.md) (10 tasks) ← ADR 001 implementation via `/pm` 2026-11-01
- [ ] **m2** — [Store products, notifications, and release-gate decisions are in place](./blocked/m2/README.md) (8 tasks) ← ADR 001 implementation via `/pm` 2026-11-01 — **blocked:** owner decisions and store console setup
- [ ] **m3** — [App Store purchases verify and stay current on the backend](./blocked/m3/README.md) (7 tasks) ← ADR 001 implementation via `/pm` 2026-11-01 — **blocked:** App Store sandbox products
- [ ] **m4** — [Google Play purchases verify, acknowledge, and stay current on the backend](./blocked/m4/README.md) (6 tasks) ← ADR 001 implementation via `/pm` 2026-11-01 — **blocked:** m3/t002 and m2/t003
- [ ] **m5** — [Store subscriptions reconcile on a schedule and support can see them](./blocked/m5/README.md) (8 tasks) ← ADR 001 implementation via `/pm` 2026-11-01 — **blocked:** m3 and m4
- [ ] **m6** — [The web dashboard shows each billing source and sends plan changes to their home](./blocked/m6/README.md) (10 tasks) ← ADR 001 implementation via `/pm` 2026-11-01 — **blocked:** the browser check across billing sources
- [ ] **m7** — [The apps show the plan, its billing source, and limit refusals that say whose plan it is](./blocked/m7/README.md) (9 tasks) ← ADR 001 implementation via `/pm` 2026-11-01 — **blocked:** the backend and dashboard deploy, then m3/t004
- [ ] **m8** — [The apps sell and restore the plans through the App Store and Google Play](./blocked/m8/README.md) (13 tasks) ← ADR 001 implementation via `/pm` 2026-11-01 — **blocked:** store products in both consoles (m2)
- [ ] **m9** — [Launch: end-to-end store tests, the end of the mobile waivers, and the store release](./blocked/m9/README.md) (10 tasks) ← ADR 001 implementation via `/pm` 2026-11-01 — **blocked:** the website maintainer's marker work, then m2, m5, m6, and m8

## Dropped

- ~~**005**~~ — A `billing`-only `subscriptionStatus` pays for the full Stripe view — dropped 2026-11-01, superseded by w7/m6/t008. The first reason given here was wrong: the banners did send the full query, and for an account with Stripe history that meant the full Stripe read on every page load. t008 adds a billing-only view that the banners use.

