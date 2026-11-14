# w0 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Milestones

- [x] **m1** — [Translate the English copies shipped in non-English catalogs, and guard against them](./done/m1/README.md) (8 tasks) ← from dashboard QA 2026-10-15
- [x] **m2** — [Structured ledger writes refuse changes that would break the ledger](./done/m2/README.md) (7 tasks) ← from /pm-brainstorm for w0 2026-10-17
- [x] **m3** — [Make i18n:prepare safe to run and honest about English copies](./done/m3/README.md) (8 tasks) ← from /pm-brainstorm for w0 2026-10-17
- [x] **m4** — [A password reset ends every session the old password issued](./done/m4/README.md) (6 tasks) ← from security review 2026-10-18
- [x] **m5** — [Directive counting runs on the worker pool, not the request thread](./done/m5/README.md) (6 tasks) ← from security review 2026-10-18
- [x] **m6** — [Every app-mediated ledger write enforces the directive limit at one boundary](./done/m6/README.md) (7 tasks) ← from security review 2026-10-18; after m5
- [x] **m7** — [Login limits key on a trusted client address and on the account](./done/m7/README.md) (6 tasks) ← from security review 2026-10-18
- [x] **m8** — [Ledger archive downloads stream straight from Gitea](./done/m8/README.md) (7 tasks) ← from security review 2026-10-18; owner chose forwarding over removal
- [ ] **m9** — [An abandoned first Checkout gets one short recovery email](./blocked/m9/README.md) (10 tasks) ← from ADR027 2026-11-08 — **blocked:** the code shipped (t001–t005, t007–t009); the live email arrived (11-14); closeout waits on the tracking-fix deploy and three owner checks (Stripe's own recovery emails off, code entry in a real browser, a recovered purchase or a waiver)

## Dropped

- ~~**001**~~ — Close current-period earnings into equity on the hosted balance sheet — dropped 2026-10-15: superseded by [w6/m5](../w6/done/m5/README.md) (same root cause in the ledger balance-sheet producer). Additional evidence from this run: the Balance Sheet Markdown export labels a balanced ledger "internal draft" with a reconciliation difference equal to net profit, and the MCP `statements/balance-sheet` resource omits current earnings too.
- ~~**041**~~ — Browse ledgers' tab labels break mid-word at the largest text size — dropped 2026-10-15: reproduces only at AX5; at AX2 the tabs wrap on word boundaries ("Your / ledgers", "Starred", "Explore"). Out of scope per the `.pm/DO_NOT_DO.md` AX2 text-size ceiling.
- ~~**042**~~ — Settings' Invite Friends text breaks inside words at the largest text size — dropped 2026-10-15: reproduces only at AX5; at AX2 the summary breaks only between words. Out of scope per the AX2 ceiling.
- ~~**043**~~ — Account Picker's search placeholder is clipped at the largest text size — dropped 2026-10-15: reproduces only at AX5; at AX2 "Search accounts" renders whole and centered. Out of scope per the AX2 ceiling.
- ~~**044**~~ — Money flow shrinks accounts to ten characters at the largest text size — dropped 2026-10-15: reproduces only at AX5; at AX2 postings stay identifiable ("Assets:US…:Checking", "Income:US…le:Salary"), which is [w4/014](../w4/done/014.md)'s acceptance. Out of scope per the AX2 ceiling.

## Inbox

- [051 — Account deletion accepts an application-API OAuth token of any scope (latent; decision first, see w2/m12)](./blocked/051.md) — **blocked:** needs the owner's choice between requiring `ledger.admin`, a full-access token, or recording the current design.
- [055 — On a host with fewer than three cores, a small ledger's parse waits behind a large ledger's](./blocked/055.md) — **blocked:** the hosted worker count needs the plan's memory and cores; `RUSTLEDGER_WORKERS` and the startup count shipped.

Resolved notes are in [`done/`](./done/).

