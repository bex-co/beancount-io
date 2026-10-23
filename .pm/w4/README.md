# w4 — General adoption worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Inbox

- [1020 — Keep configured account roots in Overview cash flows](./1020.md) — minor; valid declared roles and renamed roots yield No Data Available beside correct 100/25 USD movement; both widths, exact producer and default-root controls, no writes.

- [1019 — Keep signed market values in Holdings gain percentages](./1019.md) — major; all four groupings/CSVs show +100% for a valid −300% loss under modeled reads; exact producer, independent arithmetic and zero/positive controls reproduced, no writes.

- [1018 — Keep negative chart axis ticks readable in Persian](./1018.md) — minor sibling of 1005; local fa Changes Over Time canvas y-axis reads `300.0-`…`2.1k-` at both widths; tables fixed in 1005, English unchanged, source-only observation.

- [1017 — Keep native amount stepping from rounding exact drafts](./1017.md) — major residual ofW1/028; both-width ArrowUp reduces valid large amount and prepares changed balanced postings; manual/ordinary controls and independent parsers pass, all writes blocked.





















































































- [265 — Keep financial text and private paths out of GA4 automatic events](./blocked/265.md) — major; dashboard QA, 2026-10-20; stream-editor completion dependency. — **blocked:** checklist shipped in `181e7a996`; needs a GA4 Editor to turn off Site search / history page views
- [289 — Preserve long amount digits in portrait statement print output](./blocked/289.md) — minor; dashboard QA, 2026-10-20. — **blocked:** fix shipped in `68e973700`; awaiting portrait PDF check

## Milestones

- [x] **m52** — [Preserve exact Net Worth amounts and monthly changes](./done/m52/README.md) (6 tasks) ← dashboard QA,2026-10-22; minor; valid producer-backed totals and±1 USD collapse after Number conversion; five native contexts and safe controls, no writes.

- [x] **m51** — [Preserve selected chart units when regrouping periods](./done/m51/README.md) (6 tasks) ← dashboard QA,2026-10-22; minor; enabled BTC resets on uncached and cached interval changes;1,408 API values exact, no writes.

- [x] **m50** — [Retry failed statement, Account Journal and commodity reads](./done/m50/README.md) (6 tasks) ← dashboard QA,2026-10-21/22; minor, promoted from328 with a sixth equivalent observer; current variables and read-only recovery preserved.

- [x] **m49** — [Keep entry-source saves within their pending draft session](./done/m49/README.md) (6 tasks) ← dashboard QA,2026-10-22; major client draft loss, pending source edits and a different newly opened entry draft disappear at an older modeled acknowledgement; failure/retry controls pass, no hosted writes.

- [x] **m48** — [Preserve receipt review through recording and failure](./done/m48/README.md) (6 tasks) ← dashboard QA,2026-10-22; minor, pending corrections disappear at success and failed Record drops the corrected review; promoted from973, local responses only.

- [x] **m47** — [Keep profile saves within their submitted dialog session](./done/m47/README.md) (6 tasks) ← dashboard QA,2026-10-22; minor, concurrent Enter requests and older completion closing a newer draft; promoted from975, all writes intercepted or locally modeled.

- [x] **m46** — [Preserve editor drafts through ledger refresh](./done/m46/README.md) (6 tasks) ← continuous dashboard QA, 2026-10-21; major. Done 2026-10-22: Out of date → Refresh keeps an already shown ledger page, unsaved file draft (bound to its original SHA) and unexecuted BQL query; failed refreshes keep content and offer Try Again.

- [x] **m45** — [Keep commodity quantities precise in Budget and statements](./done/m45/README.md) (6 tasks) ← promoted 331 and actual public statement QA, 2026-10-21; minor. Done 2026-10-22: statement cells and Budget readouts keep source commodity digits (4.00995 ETH, 0.0004 BTC) through one opt-in digit count on the shared formatter; ISO cash unchanged.

- [x] **m44** — [Refuse CSV currency-symbol conflicts before importing](./done/m44/README.md) (6 tasks) ← dashboard QA, 2026-10-21; major, accepted euro/pound tokens prepare as USD/EUR without conflict guidance; five real-UI requests preblocked, no hosted import.

- [x] **m43** — [Keep contrast selections visible and readable](./done/m43/README.md) (11 tasks) ← dashboard QA, 2026-10-21; minor, promoted 273 with filter/tab label backplates and independently reproduced Calendar/Billing/Net Worth/Budget/Accounts/creation-radio selected-state cues.

- [x] **m42** — [Keep keyboard focus owned during and after modal submissions](./done/m42/README.md) (5 tasks) ← dashboard QA, 2026-10-20; minor, pending reverse-Tab escapes New Entry and failed submits lose the retry position.

- [x] **m41** — [Preserve acknowledged actions through refresh failures](./done/m41/README.md) (6 tasks) ← dashboard QA, 2026-10-20; minor, promoted 294 with independent Budget submission scope.

- [x] **m40** — [Keep picker popups sized and scrollable inside modals](./done/m40/README.md) (6 tasks) ← dashboard QA, 2026-10-20; minor, promoted 293 with independently reproduced Combobox wheel scope.

- [x] **m39** — [Recover Journal and dashboard from malformed saved lists](./done/m39/README.md) (7 tasks) ← dashboard QA, 2026-10-20; minor, preference decoding and cross-tab recovery.

- [x] **m38** — [Accept supported early-year dates across directive writes](./done/m38/README.md) (6 tasks) ← dashboard QA API controls, 2026-10-20; minor, backend-v2 shared date validation and eligible adapter parity.

- [x] **m37** — [Resolve README file and image references from their source path](./done/m37/README.md) (7 tasks) ← dashboard QA, 2026-10-20; minor, rendered file/image context and native hrefs. — deployed native links/images verified; owned fixture cleanup complete

- [x] **m36** — [Preserve profile and commit timestamps through hydration](./done/m36/README.md) (10 tasks) ← dashboard QA, 2026-10-20; minor. Done 2026-10-22: one shared `useHydratedTime()` keeps commit, activity and repository-card timestamps through hydration; deployed boundary/title controls and real SSR regressions pass.

- [ ] **m35** — [Keep form fields usable when suggestions fail](./blocked/m35/README.md) (6 tasks) ← dashboard QA, 2026-10-20; minor, four form suggestion wrappers. — **blocked:** fields now survive; deployed keyboard retry still loses focus, follow-up recorded

- [ ] **m34** — [Resolve multiline entry sources without splitting quoted strings](./blocked/m34/README.md) (6 tasks) ← dashboard QA, 2026-10-20; minor, ledger source resolution. — **blocked:** fix shipped in `a0fa2e619`; awaiting deployed dashboard reopen check

- [x] **m33** — [Keep New Entry drafts safe during submission](./done/m33/README.md) (6 tasks) ← dashboard QA, 2026-10-20; major, pending edits and late completion.

- [x] **m32** — [Preserve valid ledger dates across browser timezones](./done/m32/README.md) (6 tasks) ← dashboard QA, 2026-10-20; minor, shared picker and seven form integrations. — deployed date/payload journeys and dashboard gates verified 2026-10-20

- [x] **m31** — [Bound authentication abuse without losing account recovery](./done/m31/README.md) (11 tasks) ← user-approved rate-limit review and `$pm` / `$loopx w4`, 2026-10-19

- [x] **m29** — [Explore public examples before signing in](./done/m29/README.md) (9 tasks) ← approved `/pm-brainstorm for w4` candidate 1, 2026-09-27; mobile, ~4–5h implementation plus standing closing tasks

- [x] **m28** — [Locale-aware plurals on both clients](./done/m28/README.md) (8 tasks) ← promoted w4/187, filed from m27's wording deviation, 2026-09-26

- [x] **m27** — [Say which prices are stale, and only when they are](./done/m27/README.md) (7 tasks) ← user design review of m26's headline, 2026-09-26

- [x] **m26** — [Value Home and Accounts at market value, and say so on web and mobile](./done/m26/README.md) (10 tasks) ← user decision 2026-09-26 in a PM review of the Home net-worth basis; supersedes m11's display rules 1–2 and folds in w4/027 and w4/068

- [x] **m25** — [Reach the Latin-script locales with a half-translated guard](./done/m25/README.md) (7 tasks) ← promoted w4/157, filed from the w4/m24/t010 review, 2026-09-20

- [x] **m24** — [Repair the Ukrainian catalogs' first-word find/replace damage](./done/m24/README.md) (12 tasks) ← promoted w4/152, filed while closing w4/149, 2026-09-20

- [x] **m23** — [Prevent native authentication forms from putting passwords in URLs](./done/m23/README.md) (6 tasks) ← repeated dashboard QA, 2026-09-18

- [x] **m22** — [Expose read-only state in Monaco readers](./done/m22/README.md) (6 tasks) ← promoted w4/102 with Entry Context evidence, repeated dashboard QA, 2026-09-17

- [x] **m21** — [Preserve amounts and units in overview charts](./done/m21/README.md) (7 tasks) ← repeated dashboard QA, 2026-09-17

- [x] **m20** — [Name Budget, Commodities, Statistics and Settings tables](./done/m20/README.md) (6 tasks) ← promoted w4/091 with Statistics evidence, repeated dashboard QA, 2026-09-17

- [x] **m19** — [Preserve URL fragments in login continuations](./done/m19/README.md) (6 tasks) ← repeated dashboard QA, 2026-09-17

- [x] **m18** — [Make complete BQL cell values readable](./done/m18/README.md) (6 tasks) ← promoted w4/078 with PRINT evidence, repeated dashboard QA, 2026-09-17

- [x] **m17** — [Keep profile search updates from hijacking ledger navigation](./done/m17/README.md) (6 tasks) ← repeated dashboard QA, 2026-09-17

- [x] **m16** — [Preserve statement chart selection through report reads](./done/m16/README.md) (6 tasks) ← repeated dashboard QA, 2026-09-17

- [x] **m15** — [Associate authentication validation errors with their fields](./done/m15/README.md) (6 tasks) ← promoted w4/082, repeated dashboard QA, 2026-09-17

- [x] **m14** — [Restore truthful Catalan navigation and Journal labels](./done/m14/README.md) (6 tasks) ← from repeated dashboard QA, 2026-09-17

- [x] **m1** — Download Balance Sheet and P&L as CSV or print-ready PDF (9 tasks) ← from financial-report export PM research and `/pm` handoff, 2026-08-15
- [x] **m2** — Cash flow report: statement page, charts, exports, account status (10 tasks) ← from `dashboard/docs/ADR002-cash-flow-report.md`, 2026-08-20
- [x] **m3** — Ledger-declared cash-flow roles (`cash-flow-role` metadata) (10 tasks) ← from `dashboard/docs/PRFAQ-cash-flow-ledger-classification.md`, 2026-08-25

- [x] **m4** — Mobile ledger discovery and starred ledgers (10 tasks) ← from user-approved pm-brainstorm 2026-09-05
- [x] **m5** — Ledger links open in the app (10 tasks) ← from `/pm-brainstorm for w4` 2026-09-08; user approved all four
- [x] **m6** — Create a ledger from mobile (8 tasks) ← from `/pm-brainstorm for w4` 2026-09-08; user approved all four
- [x] **m7** — Screen-reader pass on the mobile core journeys (9 tasks) ← from `/pm-brainstorm for w4` 2026-09-08; user approved all four
- [x] **m8** — [Localized Google Play listing from the canonical metadata](./done/m8/README.md) (8 tasks) ← from `/pm-brainstorm for w4` 2026-09-08; user approved all four
- [ ] **m9** — [`bea price fetch`: keep commodity and currency prices current through upstream bean-price](./blocked/m9/README.md) (9 tasks) — **blocked:** needs a decision to re-scope onto the shipped `bea price` passthrough or drop. ← from `/pm-brainstorm for w4` 2026-09-10; user handed items 1, 6, 7 to `/pm` 2026-09-11 (issue 176)
- [ ] **m10** — [GitHub contributor front door: issue and PR templates, security policy, code of conduct, seeded good first issues](./blocked/m10/README.md) (9 tasks) — **blocked:** forms, PR template, and CI check shipped; needs the security reporting channel, approval for labels/contributor issues, and signed-in issue-chooser verification; issue176 already has the maintainer reply. ← from `/pm-brainstorm for w4` 2026-09-10; user handed items 1, 6, 7 to `/pm` 2026-09-11
- [x] **m11** — [Mobile says what a converted balance means: units for commodities, labelled cost basis, disclosed omissions](./done/m11/README.md) (9 tasks) ← promoted w4/016 with w4/027 folded in; user approved `/pm-brainstorm for w4` item 2 and its display rule, 2026-09-15
- [x] **m12** — [Make mobile's `lint:deadcode` see unused GraphQL documents and test-only modules](./done/m12/README.md) (7 tasks) ← promoted w4/025; user approved `/pm-brainstorm for w4` item 4 and its allowlist recommendation, 2026-09-15

- [x] **m13** — [Preserve ledger pages through loading and hydration](./done/m13/README.md) (6 tasks) ← repeated dashboard QA, promoted w4/073, 2026-09-17

## Dropped

- ~~**985**~~ — Stop Create Ledger's Next from submitting the ledger before Review — dropped 2026-10-22: duplicate of [314](./done/314.md), the earlier and fuller report of the same Details → Next CreateLedger defect, filed without finding it.

- ~~**328**~~ — Offer a retry after a statement or Account Journal read fails — dropped 2026-10-22: promoted to [m50](./done/m50/README.md), preserving all evidence and adding independently repeated Commodities primary-read failure; six observer integrations plus regressions exceed one hour, with no new historical group.

- ~~**973**~~ — Freeze receipt review edits while recording — dropped 2026-10-22: promoted to [m48](./done/m48/README.md), preserving the original report and adding independently repeated failed-record review loss; separate pending/failure repairs and real regressions exceed one hour.

- ~~**975**~~ — Guard pending Change Name submissions from Enter — dropped 2026-10-22: promoted to [m47](./done/m47/README.md), retaining the reproducer and adding independently repeated pending dialog/draft ownership; two implementation tasks plus real regressions exceed one hour.

- ~~**331**~~ — Preserve fractional commodity values in Budget readouts — dropped2026-10-21: promoted to [m45](./done/m45/README.md), preserving all modeled Budget evidence and adding actual Trial Balance/Balance Sheet precision loss; two renderers and computed precision regressions exceed one hour.

- ~~**273**~~ — Keep active picker options identifiable in forced colors — dropped 2026-10-21: promoted to [m43](./done/m43/README.md), preserving all evidence and adding independently reproduced JournalFilters/default Tabs label backplates; four styling targets and rendered acceptance exceed one hour.

- ~~**294**~~ — Preserve an acknowledged star action when its metadata refresh fails — dropped 2026-10-20: promoted to [m41](./done/m41/README.md), preserving Star evidence and adding the independent Budget acknowledgement/read failure; two controllers and regressions exceed one hour.

- ~~**293**~~ — Keep the DatePicker calendar reachable in short viewports — dropped 2026-10-20: promoted to [m40](./done/m40/README.md), preserving all evidence and adding the independent modal Combobox wheel failure; the shared repair and regression scope exceed one hour.

- ~~**016**~~ — Commodity accounts are shown as an unlabelled USD cost basis — and a commodity with no cost renders as $0.00 — dropped 2026-09-26: promotion to [m11](./done/m11/README.md) completed; the milestone's verification record carries the outcome, and w4/m26 superseded its valuation basis.

- ~~**188**~~ — Type-check `count` for dashboard plural keys — dropped 2026-09-26: folded into [m28](./done/m28/README.md) as t008, since m28's definition of done already requires it.

- ~~**187**~~ — Locale-aware plurals on both clients — dropped 2026-09-26: promoted to [m28](./done/m28/README.md), preserving the note's scope; the work spans two packages and exceeds one hour.

- ~~**068**~~ — Mobile valuation toggle: cost, market value, or units per ledger — dropped 2026-09-26: superseded by [m26](./done/m26/README.md). Home and Accounts now value at market and show the cost basis beside the figure, so a per-ledger toggle is no longer planned; the web report pages keep their existing selector.

- ~~**027**~~ — "Net Worth" is a cost basis, and nothing on screen says so — dropped 2026-09-26: superseded by [m26](./done/m26/README.md). The user chose this note's option 2 (value at market and disclose stale prices) over option 1, which m11 had shipped; m26 carries the note's evidence and acceptance.

- ~~**102**~~ — Source-viewer read-only accessibility state — dropped 2026-09-17: promoted to [m22](./done/m22/README.md), preserving original evidence and adding Entry Context plus fallback-mode scope; shared integration and checks exceed one hour.

- ~~**091**~~ — Budget/Commodities table identities — dropped 2026-09-17: promoted to [m20](./done/m20/README.md), preserving original evidence and adding all three Statistics tables; coordinated repair and checks exceed one hour.

- ~~**078**~~ — BQL inventory clipping — dropped 2026-09-17: promoted to [m18](./done/m18/README.md), preserving the original evidence and adding PRINT multiline values; expanded implementation and verification exceed one hour.

- ~~**082**~~ — Sign-in and recovery error associations — dropped 2026-09-17: promoted to [m15](./done/m15/README.md), preserving the evidence and adding independently reproduced registration fields; the expanded repair now exceeds one hour.

- ~~**073**~~ — Journal shared-filter page reset regression — dropped 2026-09-17: superseded by [m13](./done/m13/README.md), which preserves the original evidence and adds the independently reproduced Accounts typing failure at the same pending boundary.

- ~~**025**~~ — Seven dead GraphQL operations and a 19-case test for a hook that doesn't exist, all invisible to `lint:deadcode` — dropped 2026-09-15: promotion to w4/m12 completed ([done/m12](./done/m12/README.md)); the operations, the test-only module and the pinned strings are deleted, and `yarn lint:deadcode` now catches both shapes.
- ~~**065**~~ — German is the only locale that leaves "YTD" untranslated — dropped 2026-09-14: not a miss but a recorded choice. `mobile/src/translations/__tests__/known-gaps.ts` lists `rangeYTD` in German's `SAME_AS_ENGLISH` entry with the reason "Range chips: M reads as Monat, and YTD is the standard term in German finance UIs", and the locale-integrity suite enforces it. Replacing it needs a native speaker's call, which the note itself deferred (SJB or JTD).
- ~~**018**~~ — m5 follow-up: ledger links do not open the app in production — dropped 2026-09-14: duplicate of `w4/blocked/001` ("Set hosted APP_LINKS env so AASA stops 404ing"), which waits on the same hosted `APP_LINKS_APPLE_TEAM_ID` / `APP_LINKS_ANDROID_SHA256` configuration. Its warm and cold repros, the deliberate unset-env 404, and its extended acceptance (JSON content type, validators, the deferred physical-device check) were appended to `blocked/001.md`.
- ~~**012**~~ — Extends w3/217: on a billion-scale ledger the Accounts balance itself is truncated — dropped 2026-09-14: duplicate of the open `w3/217` ("Keep Accounts row identities readable beside large balances"), which owns the same `AccountTable` row and cause; the note itself asked to be folded in rather than fixed separately. Its severity raise to major, the AX1 and 19-character-balance acceptance, and its evidence were appended to `w3/217`.
- ~~**057**~~ — Money formatter rounds every amount to 2 decimals — dropped 2026-09-13: duplicate of the open `w3/189` ("The account journal rounds a posting the transactions list shows in full"), which identifies the same `groupThousands()` `toFixed(2)` cause at the same lines, carries the full call-site list and the product decision, and predates it. The two genuinely new observations — the `w4/016` fix-ordering interaction and the undocumented number-locale pin — were appended to `w3/189` instead.

## Execution notes

Blocked milestones live under `blocked/` with their reason and unblock condition in a `## Blocked` section; they keep their task IDs and return to `wN/mN/` when work can resume.

## Blocked inbox follow-up

- [ ] [096 — Verify protected-route login history](./blocked/096.md) — blocked on a current protected-query trigger and native-toolbar Back reproduction; original Import/History triggers retired, automated traversal alone is insufficient.
