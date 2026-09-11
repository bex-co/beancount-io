# w1 — General adoption worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Milestones

- [x] **m1** — Ask-page quick wins: focus, preset questions, stop & retry (9 tasks) ← from `/pm` invocation capturing the AI-chat UX review (2026-07-31)
- [x] **m2** — Scope useLedgerMeta to the selected ledger (fix wrong currency display) (5 tasks) ← from `/pm` invocation capturing the expo-mcp currency investigation (2026-07-31)
- [x] **m3** — Drag-to-resize left sidebar (7 tasks) ← from `/pm` invocation capturing the sidebar-resize research spike (2026-08-16)
- [x] **m4** — Connect the mobile app to a self-hosted server (9 tasks) ← from `/pm` invocation capturing the runtime server URL discussion (2026-08-22)
- [x] **m5** — OAuth 2.1-aligned native mobile authentication (15 tasks) ← from `/pm` handoff of the mobile OAuth migration investigation (2026-08-22)
- [x] **m6** — Native sign-up lands on registration; welcome screen loses the browser explainer (9 tasks) ← from `/pm-brainstorm` 2026-08-27 (mobile sign-up reproduced broken against the hosted service)
- [x] **m7** — First-party sign-in without a consent screen (8 tasks) ← from `/pm-brainstorm` 2026-08-27 — sequenced after m6 (both edit the dashboard mobile interaction page)
- [x] **m8** — Awesome Plain Text Accounting decision tool (8 tasks) ← from `w1/004` product review (2026-08-29)
- [x] **m9** — Email templates match the dashboard theme and visual language (8 tasks) ← from `/pm` request to polish email styling (2026-08-29)
- [x] **m10** — [Complete REST, MCP, and GraphQL operation and behavior parity](./done/m10/README.md) (34 tasks) ← explicit user request after MCP/parity audit (2026-09-06)
- [x] **m11** — Split the CLI into top-level local verbs + a `bea cloud` namespace (8 tasks) ← from `/pm` invocation capturing the CLI command-tree design discussion (2026-09-07)
- [x] **m12** — Migrate `bea cloud` from GraphQL to REST driven by the v1 OpenAPI spec (11 tasks) ← from `/pm` invocation capturing the CLI transport decision (2026-09-07) — sequenced after m11 (the cloud namespace is the generation target)
- [x] **m13** — Reads and reports: strict for automation, lenient for people (8 tasks) ← from CLI UX review 2026-09-08 (developer and beancount-user walkthrough of `cli/` docs and `bea 0.1.0`); user routed to w1
- [x] **m14** — Ledger writes stay git-friendly: `import-id` convention and append-only alignment (6 tasks) ← from CLI UX review 2026-09-08 (developer and beancount-user walkthrough of `cli/` docs and `bea 0.1.0`); user routed to w1 — sequenced before the w2/m25 release closeout
- [x] **m15** — Daily-use ergonomics for `bea`: search, balance, positional narration, terminal-width tables, small fixes (9 tasks) ← from CLI UX review 2026-09-08 (developer and beancount-user walkthrough of `cli/` docs and `bea 0.1.0`); user routed to w1
- [x] **m16** — No-code CSV import: column mapping and rules without a Python importer (8 tasks) ← from CLI UX review 2026-09-08 (developer and beancount-user walkthrough of `cli/` docs and `bea 0.1.0`); user routed to w1 — sequenced after m14
- [x] **m17** — CLI docs from one source: landing README, generated reference, executable examples, first-month tutorial (8 tasks) ← from CLI UX review 2026-09-08 (developer and beancount-user walkthrough of `cli/` docs and `bea 0.1.0`); user routed to w1 — sequenced after m13, m15, m16
- [x] **m18** — Ledger skills converge on `bea` (8 tasks) ← from CLI UX review 2026-09-08 (developer and beancount-user walkthrough of `cli/` docs and `bea 0.1.0`); user routed to w1 — sequenced after m14 and the w2/m25 release

## CLI QA inbox

- [014](./014.md) — CSV import rejects documented whitespace-trimmed headers
- [015](./015.md) — Duplicate CSV amount columns silently choose the last value
- [016](./016.md) — Unterminated CSV quotes silently absorb subsequent transactions
- [017](./017.md) — BQL JSON drops acquisition dates and labels from cost lots
- [018](./018.md) — Report account regex errors are misclassified and help says substring
- [019](./019.md) — Init rejects a one-satoshi BTC opening balance
- [020](./020.md) — Filtered balance keeps unrelated totals and valuation requirements
- [021](./021.md) — Tolerated ledger warnings corrupt subsequent JSON error output
