# w4 — General adoption worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Milestones

- [ ] **m23** — [Prevent native authentication forms from putting passwords in URLs](./m23/README.md) (6 tasks) ← repeated dashboard QA, 2026-09-18

- [ ] **m22** — [Expose read-only state in Monaco readers](./m22/README.md) (6 tasks) ← promoted w4/102 with Entry Context evidence, repeated dashboard QA, 2026-09-17

- [ ] **m21** — [Preserve amounts and units in overview charts](./m21/README.md) (7 tasks) ← repeated dashboard QA, 2026-09-17

- [ ] **m20** — [Name Budget, Commodities, Statistics and Settings tables](./m20/README.md) (6 tasks) ← promoted w4/091 with Statistics evidence, repeated dashboard QA, 2026-09-17

- [ ] **m19** — [Preserve URL fragments in login continuations](./m19/README.md) (6 tasks) ← repeated dashboard QA, 2026-09-17

- [ ] **m18** — [Make complete BQL cell values readable](./m18/README.md) (6 tasks) ← promoted w4/078 with PRINT evidence, repeated dashboard QA, 2026-09-17

- [ ] **m17** — [Keep profile search updates from hijacking ledger navigation](./m17/README.md) (6 tasks) ← repeated dashboard QA, 2026-09-17

- [ ] **m16** — [Preserve statement chart selection through report reads](./m16/README.md) (6 tasks) ← repeated dashboard QA, 2026-09-17

- [ ] **m15** — [Associate authentication validation errors with their fields](./m15/README.md) (6 tasks) ← promoted w4/082, repeated dashboard QA, 2026-09-17

- [ ] **m14** — [Restore truthful Catalan navigation and Journal labels](./m14/README.md) (6 tasks) ← from repeated dashboard QA, 2026-09-17

- [x] **m1** — Download Balance Sheet and P&L as CSV or print-ready PDF (9 tasks) ← from financial-report export PM research and `/pm` handoff, 2026-08-15
- [x] **m2** — Cash flow report: statement page, charts, exports, account status (10 tasks) ← from `dashboard/docs/ADR002-cash-flow-report.md`, 2026-08-20
- [x] **m3** — Ledger-declared cash-flow roles (`cash-flow-role` metadata) (10 tasks) ← from `dashboard/docs/PRFAQ-cash-flow-ledger-classification.md`, 2026-08-25

- [x] **m4** — Mobile ledger discovery and starred ledgers (10 tasks) ← from user-approved pm-brainstorm 2026-09-05
- [x] **m5** — Ledger links open in the app (10 tasks) ← from `/pm-brainstorm for w4` 2026-09-08; user approved all four
- [x] **m6** — Create a ledger from mobile (8 tasks) ← from `/pm-brainstorm for w4` 2026-09-08; user approved all four
- [x] **m7** — Screen-reader pass on the mobile core journeys (9 tasks) ← from `/pm-brainstorm for w4` 2026-09-08; user approved all four
- [ ] **m8** — [Localized Google Play listing from the canonical metadata](./blocked/m8/README.md) (8 tasks) — **blocked:** needs a Play Console check that the applied listing is public. ← from `/pm-brainstorm for w4` 2026-09-08; user approved all four
- [ ] **m9** — [`bea price fetch`: keep commodity and currency prices current through upstream bean-price](./blocked/m9/README.md) (9 tasks) — **blocked:** needs a decision to re-scope onto the shipped `bea price` passthrough or drop. ← from `/pm-brainstorm for w4` 2026-09-10; user handed items 1, 6, 7 to `/pm` 2026-09-11 (issue 176)
- [ ] **m10** — [GitHub contributor front door: issue and PR templates, security policy, code of conduct, seeded good first issues](./blocked/m10/README.md) (9 tasks) — **blocked:** forms, PR template, and CI check shipped; needs the security reporting channel and approval for labels, good first issues, and the issue 176 reply. ← from `/pm-brainstorm for w4` 2026-09-10; user handed items 1, 6, 7 to `/pm` 2026-09-11
- [ ] **m11** — [Mobile says what a converted balance means: units for commodities, labelled cost basis, disclosed omissions](./blocked/m11/README.md) (9 tasks) — **blocked:** implementation shipped (t001–t004); the on-screen check needs a signed-in QA session. ← promoted w4/016 with w4/027 folded in; user approved `/pm-brainstorm for w4` item 2 and its display rule, 2026-09-15
- [x] **m12** — [Make mobile's `lint:deadcode` see unused GraphQL documents and test-only modules](./done/m12/README.md) (7 tasks) ← promoted w4/025; user approved `/pm-brainstorm for w4` item 4 and its allowlist recommendation, 2026-09-15

- [ ] **m13** — [Preserve ledger pages through loading and hydration](./m13/README.md) (6 tasks) ← repeated dashboard QA, promoted w4/073, 2026-09-17

## Dropped

- ~~**102**~~ — Source-viewer read-only accessibility state — dropped 2026-09-17: promoted to [m22](./m22/README.md), preserving original evidence and adding Entry Context plus fallback-mode scope; shared integration and checks exceed one hour.

- ~~**091**~~ — Budget/Commodities table identities — dropped 2026-09-17: promoted to [m20](./m20/README.md), preserving original evidence and adding all three Statistics tables; coordinated repair and checks exceed one hour.

- ~~**078**~~ — BQL inventory clipping — dropped 2026-09-17: promoted to [m18](./m18/README.md), preserving the original evidence and adding PRINT multiline values; expanded implementation and verification exceed one hour.

- ~~**082**~~ — Sign-in and recovery error associations — dropped 2026-09-17: promoted to [m15](./m15/README.md), preserving the evidence and adding independently reproduced registration fields; the expanded repair now exceeds one hour.

- ~~**073**~~ — Journal shared-filter page reset regression — dropped 2026-09-17: superseded by [m13](./m13/README.md), which preserves the original evidence and adds the independently reproduced Accounts typing failure at the same pending boundary.

- ~~**025**~~ — Seven dead GraphQL operations and a 19-case test for a hook that doesn't exist, all invisible to `lint:deadcode` — dropped 2026-09-15: promotion to w4/m12 completed ([done/m12](./done/m12/README.md)); the operations, the test-only module and the pinned strings are deleted, and `yarn lint:deadcode` now catches both shapes.
- ~~**065**~~ — German is the only locale that leaves "YTD" untranslated — dropped 2026-09-14: not a miss but a recorded choice. `mobile/src/translations/__tests__/known-gaps.ts` lists `rangeYTD` in German's `SAME_AS_ENGLISH` entry with the reason "Range chips: M reads as Monat, and YTD is the standard term in German finance UIs", and the locale-integrity suite enforces it. Replacing it needs a native speaker's call, which the note itself deferred (SJB or JTD).
- ~~**018**~~ — m5 follow-up: ledger links do not open the app in production — dropped 2026-09-14: duplicate of `w4/blocked/001` ("Set hosted APP_LINKS env so AASA stops 404ing"), which waits on the same hosted `APP_LINKS_APPLE_TEAM_ID` / `APP_LINKS_ANDROID_SHA256` configuration. Its warm and cold repros, the deliberate unset-env 404, and its extended acceptance (JSON content type, validators, the deferred physical-device check) were appended to `blocked/001.md`.
- ~~**012**~~ — Extends w3/217: on a billion-scale ledger the Accounts balance itself is truncated — dropped 2026-09-14: duplicate of the open `w3/217` ("Keep Accounts row identities readable beside large balances"), which owns the same `AccountTable` row and cause; the note itself asked to be folded in rather than fixed separately. Its severity raise to major, the AX1 and 19-character-balance acceptance, and its evidence were appended to `w3/217`.
- ~~**057**~~ — Money formatter rounds every amount to 2 decimals — dropped 2026-09-13: duplicate of the open `w3/189` ("The account journal rounds a posting the transactions list shows in full"), which identifies the same `groupThousands()` `toFixed(2)` cause at the same lines, carries the full call-site list and the product decision, and predates it. The two genuinely new observations — the `w4/016` fix-ordering interaction and the undocumented number-locale pin — were appended to `w3/189` instead.

## Execution notes

Blocked milestones live under `blocked/` with their reason and unblock condition in a `## Blocked` section; they keep their task IDs and return to `wN/mN/` when work can resume.

## Blocked inbox follow-up

- [ ] [096 — Verify protected-route login history](./blocked/096.md) — blocked on a native-toolbar Back reproduction; automated traversal alone is insufficient.
