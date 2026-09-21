# w5 — General adoption worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Milestones

- [x] **m1** — Ledger sidebar: richer rows, honest states, post-create landing (9 tasks) ← from /pm-brainstorm 2026-08-17
- [x] **m2** — Accessibility pass on /ledger + gallery (8 tasks) ← from /pm-brainstorm 2026-08-17 — sequenced after m1 (both touch `LedgerItem`)

- [x] **m3** — [Install and verify the eight customer ledger skills](./done/m3/README.md) (8 tasks) ← approved `/pm-brainstorm for w5`; materialized 2026-09-12
- [x] **m4** — [Make real MCP agent journeys reproducible](./done/m4/README.md) (9 tasks) — rescoped 2026-09-15 to the hosted MCP endpoint ← promoted core scope of [w2/009](../w2/009.md); user routed to w5 on 2026-09-12
- [ ] **m5** — [Verify and complete shipped MCP accounting prompts](./blocked/m5/README.md) (9 tasks) — **blocked:** needs the repairs deployed and a QA ledger with a linked bank ← approved w5 proposal; reconciled with shipped [w2/008](../w2/done/008.md) on 2026-09-13 — depends on m4 closeout

- [x] **m6** — [Authenticate live prices and report refresh failures](./done/m6/README.md) (7 tasks) ← PRFAQ003 launch gaps; requested 2026-09-21
- [x] **m7** — [Expose live-price provenance in ordinary reports](./done/m7/README.md) (6 tasks) ← PRFAQ003 launch gaps; requested 2026-09-21
- [x] **m8** — [Validate and release authenticated CLI live prices](./done/m8/README.md) (7 tasks) ← PRFAQ003 launch gaps; requested 2026-09-21

## Execution notes

Blocked milestones live under `blocked/` with their reason and unblock condition in a `## Blocked` section; they keep their task IDs and return to `wN/mN/` when work can resume.

Priority order is m3 → m4 → m5. Real-client MCP journeys run against the hosted endpoint, not a duplicate stack. m3 and m4 have no dependency on each other; m5/t001 depends on m4/t009. The customer skill installation work in m3 builds on w1/m21's completed accounting-engine integration. The larger Plaid sandbox journey remains an explicit deferred follow-up in w2/009. m5 verifies and repairs the four prompts already shipped by w2/008; it does not recreate their registration or bodies.

Authenticated CLI live-price milestones m6 → m7 → m8 completed with CLI 0.3.0 on 2026-09-21. The existing m5 blocker remains independent.
