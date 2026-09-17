# w1 — General adoption worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Milestones

Milestones m1–m23 are complete; no pending ADR014 follow-up milestones remain from that run. The block m23–m27 and m29 was materialized on 2026-09-16 from `/pm-brainstorm for w1`: five of them absorb the 2026-09-15/16 continuous CLI QA sweep by shared root cause rather than one note at a time, and m29 carries promoted work from w2/027. m23 has shipped; m24–m27 and m29 remain open. There is no m28 — see `## Dropped`.

**Suggested order:** m24 → m25 → m26 → m27 → m29. The five CLI-sweep milestones are independent of one another and can be taken in any order; m23 shipped first because it fixes a silent ledger-wipe path (`w3/300`, critical) and establishes the exit contract the others are tested against. m29 is the non-sweep item and depends on nothing in this queue.

### Open

- [ ] **m24** — [Bank CSVs import as exported: delimiters, amounts, encodings, IDs](./m24/README.md) (12 tasks) ← `/pm-brainstorm for w1` 2026-09-16 item 2; absorbs 15 CLI QA notes from w3 plus w5/003
- [ ] **m25** — [Every failure is a JSON envelope, and empty inputs are errors](./m25/README.md) (9 tasks) ← `/pm-brainstorm for w1` 2026-09-16 item 3; absorbs 24 CLI QA notes from w3 plus w5/004
- [ ] **m26** — [Ledgers survive Windows editors and Unicode](./m26/README.md) (9 tasks) ← `/pm-brainstorm for w1` 2026-09-16 item 4; absorbs 9 CLI QA notes from w3
- [ ] **m27** — [Amounts are exact on the way in and out](./m27/README.md) (10 tasks) ← `/pm-brainstorm for w1` 2026-09-16 item 5; absorbs 10 CLI QA notes from w3
- [ ] **m29** — [`bea` resolves managed price includes locally](./m29/README.md) (10 tasks) ← promoted [w2/027](../w2/027.md); ADR 015 + PRFAQ002

## Dropped

- ~~**m28**~~ — Read-after-delete consistency for hosted slice deletes — dropped 2026-09-16: proposed by `/pm-brainstorm for w1` as a promotion of `w1/033`, but never materialized as open work. Triage the same day established that every layer of the delete path in this monorepo already applies synchronously — backend-v2 awaits the ledger-service call, the ledger service awaits a Gitea CAS commit with bounded retry, reads resolve live HEAD per load, and backend-v2 caches no journal or context read — so there is no async-apply code here to fix and no in-monorepo change can be proven against the acceptance. The work is still wanted and waits with its full record and **Unblock:** condition at [blocked/033](./blocked/033.md), which needs hosted diagnosis naming the lagging layer. Promoting it into a milestone would have duplicated that note and put unbuildable work in the open tree.

### Complete

- [x] **m23** — [Exit status tells the truth: no success without the effect](./done/m23/README.md) (11 tasks) ← `/pm-brainstorm for w1` 2026-09-16 item 1; absorbs 24 CLI QA notes from w3
- [x] **m22** — [Fix published CLI exports, native help, and shell output reset](./done/m22/README.md) (7 tasks) ← published 0.2.0 QA, 2026-09-12; user routed to w1

- [x] **m19** — [Independent Beancount engine and complete bea command parity](./done/m19/README.md) (23 tasks) ← ADR014 replan, 2026-09-11; license resolution, complete engine separation, and installed-artifact proof
- [x] **m20** — [Optional accounting tools in the independent engine](./done/m20/README.md) (8 tasks) ← ADR014 replan, 2026-09-11; after m19; optional tools stay in the engine
- [x] **m21** — [Ledger skills follow the one-install engine design](./done/m21/README.md) (8 tasks) ← ADR014 replan, 2026-09-11; after m20; follow-up to completed m18

- [x] **m1** — Ask-page quick wins: focus, preset questions, stop & retry (9 tasks) ← from `/pm` invocation capturing the AI-chat UX review (2026-07-31)
- [x] **m2** — Scope useLedgerMeta to the selected ledger (fix wrong currency display) (5 tasks) ← from `/pm` invocation capturing the expo-mcp currency investigation (2026-07-31)
- [x] **m3** — Drag-to-resize left sidebar (7 tasks) ← from `/pm` invocation capturing the sidebar-resize research spike (2026-08-16)
- [x] **m4** — Connect the mobile app to a self-hosted server (9 tasks) ← from `/pm` invocation capturing the runtime server URL discussion (2026-08-22)
- [x] **m5** — OAuth 2.1-aligned native mobile authentication (15 tasks) ← from `/pm` handoff of the mobile OAuth migration investigation (2026-08-22)
- [x] **m6** — Native sign-up lands on registration; welcome screen loses the browser explainer (9 tasks) ← from `/pm-brainstorm` 2026-08-27 (mobile sign-up reproduced broken against the hosted service)
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
- [x] **m18** — [Ledger skills converge on `bea`](./done/m18/README.md) (8 tasks) ← CLI UX review 2026-09-08; completed baseline; ADR014 installation/skills follow-up is tracked in m21

## Inbox

No open inbox notes. The four mobile QA findings filed on 2026-09-16 were drained the same day: [031](./done/031.md), [032](./done/032.md), and [034](./done/034.md) shipped with regression coverage, and [033](./blocked/033.md) is blocked.

## Blocked

Blocked notes live under [`blocked/`](./blocked/) with their reason and **Unblock:** condition; they keep their IDs and return to the open tree when work can resume.

- [033](./blocked/033.md) — Slice-delete success precedes removal by minutes; a refetch resurrects the row — **blocked:** no async-apply code exists in this monorepo and the acceptance cannot be proven here. **Unblock:** hosted diagnosis naming the lagging layer, or a local full-stack repro. Cleared by the user (hosted access plus QA credentials).

## Absorbed CLI QA notes (m23–m27)

The 2026-09-15/16 continuous CLI QA sweep filed 151 findings in `w3`. Eighty-two of them share five root-cause classes and are absorbed by m23–m27 rather than drained one at a time; each absorbed note carries a **Promoted** disposition line naming its milestone and task, and stays open in `w3` as the reproducer of record until that milestone's closeout closes it with `/pm done`. The remaining `w3` notes have heterogeneous causes and stay in that queue for `/loopx w3`.

**Coordination with `/loopx w3`.** A concurrent drain of `w3` is fixing some of these notes individually, which is fine and is not wasted work — but it means an absorbed note may already be shipped by the time its milestone is picked up. The rule: before starting any task in m23–m27, check whether its absorbed notes already sit in `w3/done/`; if one does, read the shipped fix and its regression test first, then narrow the task to what is genuinely left. At closeout, a task whose work landed that way is closed with a `## Closed by triage` section citing the commit and tests, per `.agents/skills/pm/SKILL.md`. A milestone keeps its value even when most of its notes arrive pre-fixed, because the shared contract, the matrix test and the documentation are the parts no individual note fix delivers — but if every note in a cluster is fixed and that contract already holds, close the milestone rather than inventing work for it.

Already fixed by `/loopx w3` as of 2026-09-16 (fourteen of the eighty-two, plus w5/003 and w5/004, all now in their queues' `done/`): m23 — w3/236, 249. m24 — w3/226, 227, 237. m25 — w3/233, 234, 238, 239, 250. m26 — w3/248, 251, 252. m27 — w3/240. This list is a snapshot, not a ledger; re-check `w3/done/` at pickup time.

| Milestone | Absorbed notes |
| --- | --- |
| m23 | w3/236, 249, 262, 269, 273, 277, 282, 300, 301, 317, 318, 319, 320, 321, 323, 332, 336, 338, 345, 363, 364, 369, 370, 371 |
| m24 | w3/226, 227, 237, 256, 263, 265, 276, 279, 280, 281, 308, 310, 311, 342, 368; w5/003 |
| m25 | w3/233, 234, 238, 239, 250, 268, 270, 274, 286, 287, 294, 296, 298, 299, 302, 312, 314, 327, 328, 333, 335, 358, 359, 360; w5/004 |
| m26 | w3/248, 251, 252, 257, 258, 266, 275, 278, 283 |
| m27 | w3/240, 259, 260, 272, 291, 297, 304, 309, 365, 367 |
