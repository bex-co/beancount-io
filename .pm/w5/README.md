# w5 — General adoption worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Milestones

- [x] **m1** — Ledger sidebar: richer rows, honest states, post-create landing (9 tasks) ← from /pm-brainstorm 2026-08-17
- [x] **m2** — Accessibility pass on /ledger + gallery (8 tasks) ← from /pm-brainstorm 2026-08-17 — sequenced after m1 (both touch `LedgerItem`)

- [x] **m3** — [Install and verify the eight customer ledger skills](./done/m3/README.md) (8 tasks) ← approved `/pm-brainstorm for w5`; materialized 2026-09-12
- [x] **m4** — [Make real MCP agent journeys reproducible](./done/m4/README.md) (9 tasks) — rescoped 2026-09-15 to the hosted MCP endpoint ← promoted core scope of [w2/009](../w2/blocked/009.md); user routed to w5 on 2026-09-12
- [ ] **m5** — [Verify and complete shipped MCP accounting prompts](./blocked/m5/README.md) (9 tasks) — **blocked:** t001–t008 done and Codex measured ([w4/960](../w4/done/960.md)); the closeout needs `d812112f6` deployed and seen live ← approved w5 proposal; reconciled with shipped [w2/008](../w2/done/008.md) on 2026-09-13 — depends on m4 closeout

- [x] **m6** — [Authenticate live prices and report refresh failures](./done/m6/README.md) (7 tasks) ← PRFAQ003 launch gaps; requested 2026-09-21
- [x] **m7** — [Expose live-price provenance in ordinary reports](./done/m7/README.md) (6 tasks) ← PRFAQ003 launch gaps; requested 2026-09-21
- [x] **m8** — [Validate and release authenticated CLI live prices](./done/m8/README.md) (7 tasks) ← PRFAQ003 launch gaps; requested 2026-09-21

- [x] **m9** — [Complete a first month through the installed ledger skills](./done/m9/README.md) (8 tasks, ~5h) ← `/pm-brainstorm for w5`, all three proposals approved with `$pm all for w5` on 2026-09-27

- [x] **m10** — [Migrate an export and continue importing without duplicate transfers](./done/m10/README.md) (9 tasks, ~6h) ← `/pm-brainstorm for w5`, both proposals approved with `$pm for both to w5` on 2026-09-28

- [x] **m11** — [Publish the CLI fixes required by the migration journey](./done/m11/README.md) (8 tasks, ~5h) ← `/pm-brainstorm more for w5`, all three proposals approved with `$pm all for w5` on 2026-09-28

- [x] **m12** — [Graduate a CSV workflow into a tested, maintainable importer](./done/m12/README.md) (9 tasks, ~6h) ← `/pm-brainstorm for w5`, both proposals approved with `$pm for all for w5` on 2026-09-28

- [ ] **m13** — [Install the ledger skills and reach a first query on native Windows](./blocked/m13/README.md) (8 tasks, ~5½h) ← `/pm-brainstorm for w5`, both proposals approved with `$pm for all for w5` on 2026-09-28 — **blocked:** native Windows host access is required

## Dropped

- ~~**032**~~ — Catalog search `private` filter validated but inert — dropped 2026-10-02: the finding reads an include flag as an only filter. The upstream search takes `private` (include private ledgers the caller can see, on by default) and `is_private` (only private ones) as separate parameters, and the three transcripts — `private=true`, `private=false`, no filter — are each consistent with that. Mapping `private` onto `is_private`, or rejecting it, would break a working parameter. Re-file as a documentation note if the two names prove confusing in practice.
- ~~**044**~~ — Mistyped list cursor returns -32603 with a raw Zod dump — dropped 2026-10-02: a numeric `cursor` or a `tools/call` with no `name` is a malformed protocol envelope that no conforming MCP client sends, and the MCP SDK's dispatcher refuses it before any handler of ours runs. Re-coding it means overriding the SDK's own request validation for every list method, for an input only a hand-written probe produces.
- ~~**049**~~ — Responses without `Origin` carry an empty `Access-Control-Allow-Origin` — dropped 2026-10-02: no caller can observe a difference. A request with no `Origin` is not a cross-origin browser request, an empty allow-origin grants nothing, and non-browser clients ignore the header.
- ~~**050**~~ — PUT/PATCH get the router's plain-text 405 — dropped 2026-10-02: PUT and PATCH are not MCP transport methods and no client sends them; the router's standard 405 is already a correct refusal. The in-band, authenticated 405 that ADR007 D9 asks for covers GET and DELETE, the two methods the transport defines.
- ~~**052**~~ — Missing rename source refused BAD_USER_INPUT, not NOT_FOUND — dropped 2026-10-02: the note records the throw as deliberate and offers "or document the category" as a fix. Its sibling for comparison gets NOT_FOUND only by accident of wording (see [036](./done/036.md)), and the one real question — which code a missing file should carry on the edit and rename paths — is already in [051](./done/051.md).
- ~~**466**~~ — SIGTERM/SIGHUP to `treeify`/`doctor`/`example` leaves the upstream child running — dropped 2026-10-15: duplicates open [437](./437.md), which covers the same `capture_native` gap for `example`, `treeify` and doctor captures, plus cloud `git clone` and `upgrade`; the work stays tracked there.

## Inbox

- [987 — Respect forecast boundaries for compact transaction flags](./987.md) — major CLI follow-up to completed 934; a compact forecast entry is skipped during root selection, allowing a false balance assertion into a previously valid working book, reproduced 2026-10-22.
- [988 — Recognize compact option and plugin declarations when choosing a root](./988.md) — major CLI wrong-context balance write/refusal; native compact settings are missed, reproduced 2026-10-22.
- [989 — Find account-providing roots for flagged postings](./989.md) — minor CLI false refusal; native posting flags hide unopened accounts from plugin-root discovery, reproduced 2026-10-22.
- [990 — Keep adjacent ticker text out of the account tree](./990.md) — minor CLI rendering defect; a bare ticker consumes the next account candidate during tree-column selection, reproduced 2026-10-22.
- [991 — Compare source amounts when a plugin changes posting count](./991.md) — major CLI follow-up to completed 937; a calculated split copy passes as written and falsely skips a changed bank amount, reproduced 2026-10-22.
- [992 — Use authored price facts across filtered and transformed views](./992.md) — minor CLI follow-up to completed 938; filtered quotes append repeatedly or miss conflicts, while inverse-only views falsely skip an unauthored reverse quote, reproduced 2026-10-22.
- [993 — Use authored balance assertions for repeat and conflict decisions](./993.md) — minor CLI follow-up to completed 938; filtered assertions append again, while a transformed assertion reverses the real source duplicate/conflict decisions, reproduced 2026-10-22.
- [994 — Resolve inferred acquisition costs before reply and import decisions](./994.md) — major CLI follow-up to completed 949/950; compound, ordinary `{USD}` and inferred-currency costs lose distinct purchases or correction conflicts; compound reply replay also fails, reproduced 2026-10-23.
- [995 — Resolve inferred posting prices before import identity decisions](./995.md) — major CLI follow-up to completed 950; inferred unit/total prices collapse distinct purchases and hide bank-ID corrections, reproduced 2026-10-23.
- [996 — Prefer authored native-ID amounts over agreeing transformed entries](./996.md) — major CLI residual from completed 973; a changed bank amount matching a calculated view bypasses the authored owner and falsely skips, reproduced after the fix on 2026-10-23.
- [997 — Preserve exact inferred cents in doctor trees](./997.md) — minor CLI scoped-precision follow-up; inferred 10.50 USD salary displays as 10 in doctor trees while its footer/query remain correct, reproduced 2026-10-23.
- [986 — Reject day 366 in a non-leap CSV year](./986.md) — minor CLI date-validation gap; an explicit ordinal date in 2023 is accepted and written as January 1, 2024, reproduced 2026-10-22.
- [985 — Keep transaction details parseable when redirected](./985.md) — minor CLI follow-up to completed 834; bare source-location headings make the full details stream fail native parsing, reproduced 2026-10-22.
- [984 — Preserve account names when discovering documents](./984.md) — minor CLI inherited directory-walker NFKC mismatch; valid ligature/full-width account folders lose automatic receipts and doctor reports undeclared ASCII names, reproduced 2026-10-22.
- [983 — Preserve cover selectors from actual short-lot inventory](./983.md) — major CLI follow-up to completed 925; short-lot context loses or misapplies inventory across staged rows, Cost positions, dates and commodities, changing lot selection and repeat imports, reproduced 2026-10-22.
- [982 — Preserve labels in stranded-lot close advice](./982.md) — minor CLI follow-up to 909/913; omitted or unescaped labels make the copied recovery fail or leave wrong lots open, reproduced 2026-10-22.
- [981 — Preserve acquisition labels in import identities](./981.md) — major CLI follow-up to 899/915; empty/absent labels collapse and NFD/NFC labels split identity, causing skipped or duplicate purchases and false native-ID conflicts, reproduced 2026-10-22.
- [980 — Preserve trade dependencies in same-day bulk ordering](./980.md) — major CLI follow-up to 884; combined pairs reject a valid short cover, the fallback changes independent LIFO/HIFO lots, and newest-first custody transfers drop a bookable sale, reproduced 2026-10-22.

- [979 — Keep opposite-direction source legs distinct in native import matching](./979.md) — major CLI follow-up to 603/896; a sell-two/buy-one pair is falsely accepted as an exact one-share sale, hiding a native-ID source change, reproduced 2026-10-22.

- [978 — Match a cost-selected FIFO sale to its split booked twin](./978.md) — major CLI follow-up to 603; an ordinary stated-cost sale spanning two equal-cost lots is imported twice, reproduced 2026-10-22.













The 27 findings from the MCP QA auth sweep against the hosted endpoint (023–054, less the five under [Dropped](#dropped)) were fixed in `backend-cluster/backend-v2` and closed on 2026-10-02 and 2026-10-03; each note under [`done/`](./done/) records what shipped and in which commit. None has been re-observed against the hosted endpoint yet — the fixes reach it with the next backend deploy.

## Blocked inbox

- [431 — `add balance`/`add price`/bare-number adds load the ledger twice for pre-checks](./blocked/431.md) — blocked on a maintainer choice between a pre-commit hook in the shared write validation and plugin-free pre-checks that change refusals.
- [015 — Decide the supported way to give a custom importer a third-party dependency](./blocked/015.md) — blocked on the CLI product owner's choice of the supported environment; the new work does not depend on this decision.

## Execution notes

**Approved sequence:** m12 → m13. m12 completed on 2026-09-29 with both installed-agent journeys on published bea 0.3.1; its guide, independent checkpoints, header repair, and sandbox-cache correction are shipped. m13 is parked until a native Windows host is accessible; all eight tasks depend on that baseline, and live-client acceptance additionally needs both native agents authenticated. Neither milestone changes blocked m5 or 015.

Blocked milestones live under `blocked/` with their reason and unblock condition in a `## Blocked` section; they keep their task IDs and return to `wN/mN/` when work can resume.

As of 2026-09-29, m10, m11, m12 and inbox 019–022 are complete. `beancount-io` 0.3.1 (tag `cli-v0.3.1`) is published to PyPI and Homebrew, and the migration journey passed on it in both clients. m9 and inbox 016–018 are complete. m5 and 015 retain their recorded external unblock conditions. w5 remains a general-purpose adoption queue.

The earlier sequence was m3 → m4 → m5. Real-client MCP journeys run against the hosted endpoint, not a duplicate stack. m3 and m4 have no dependency on each other; m5/t001 depends on m4/t009. The customer skill installation work in m3 builds on w1/m21's completed accounting-engine integration. The larger Plaid sandbox journey remains an explicit deferred follow-up in w2/009. m5 verifies and repairs the four prompts already shipped by w2/008; it does not recreate their registration or bodies.

Authenticated CLI live-price milestones m6 → m7 → m8 completed with CLI 0.3.0 on 2026-09-21. The existing m5 blocker remains independent.
