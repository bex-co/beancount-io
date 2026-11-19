# w22 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Milestones

- [x] **m1** — [`bea update transaction`: resolve the review queue in place](./done/m1/README.md) (9 tasks) ← `/pm-brainstorm for cli` 2026-10-24
- [x] **m2** — [No-code OFX/QFX import through upstream beangulp](./done/m2/README.md) (8 tasks) ← `/pm-brainstorm for cli` 2026-10-24
- [x] **m3** — [Holdings and register reports](./done/m3/README.md) (9 tasks) ← `/pm-brainstorm for cli` 2026-10-24
- [x] **m4** — [`bea report capital-gains`: realized gains by lot](./done/m4/README.md) (7 tasks) ← `/pm-brainstorm for cli` 2026-10-24
- [x] **m5** — [A reusable CI check for ledger repositories](./done/m5/README.md) (8 tasks) ← `/pm-brainstorm for cli` 2026-10-24
- [x] **m6** — [Backend parity for holdings, register, and capital-gains](./done/m6/README.md) (7 tasks) ← promoted from `w22/003` 2026-10-25
- [x] **m8** — [Self-hosted deployments: no verification page, no plan limits](./done/m8/README.md) (7 tasks) ← self-host request 2026-11-07
- [x] **m9** — [One-click "Deploy to bex" for the self-hosted stack](./done/m9/README.md) (8 tasks) ← deploy-badge request 2026-11-07
- [ ] **m10** — [Bank Sync: set one target account for every selected staged row](./blocked/m10/README.md) (8 tasks) ← promoted from `w22/051` 2026-11-14 (user report 2026-11-08); user routed to w22 via /pmx — **blocked:** shipped except t004, the browser check (Persian RTL layout, hover tooltip, one Apply and Submit with staged rows), which needs a Plaid sandbox bank connected to the QA ledger (the owner's yes) and a dashboard build that carries the control; t008 Closeout waits on it
- [ ] **m12** — [`bea` signs Git in on a self-hosted stack: nothing to paste](./m12/README.md) (11 tasks) ← owner request 2026-11-18, reviewing the self-hosted launch post

## Dropped

- ~~**m7**~~ — One click to deploy beancount to bex (owner checklist, no tasks) — dropped 2026-11-09: superseded, with the owner's confirmation. Every open item on the checklist shipped elsewhere: mail and plan limits in [m8](./done/m8/README.md), the public-URL and deploy-form work and the clean-workspace browser check in [m9](./done/m9/README.md), the repeatable smoke script in [006](./done/006.md).
- ~~**m11**~~ — Every deployment says which commit it runs (promoted from `w22/052`) — dropped 2026-11-15: owner decision. Reporting the deployed commit was not worth what it costs: a per-deploy value on a public manifest, and on bex a variable the platform does not supply, so a hand-set one goes stale. Its code, tests and docs were removed in the same change; `DO_NOT_DO.md` is unchanged.
- ~~**054**~~ — The agent evaluation report records the deployed revision it observed — dropped 2026-11-15: it only existed to read the commit m11 reported; removed with m11, and the report says again that the endpoint reports none.
