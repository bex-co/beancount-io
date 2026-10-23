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
- [986 — Reject day 366 in a non-leap CSV year](./986.md) — minor CLI date-validation gap; an explicit ordinal date in 2023 is accepted and written as January 1, 2024, reproduced 2026-10-22.
- [985 — Keep transaction details parseable when redirected](./985.md) — minor CLI follow-up to completed 834; bare source-location headings make the full details stream fail native parsing, reproduced 2026-10-22.
- [984 — Preserve account names when discovering documents](./984.md) — minor CLI inherited directory-walker NFKC mismatch; valid ligature/full-width account folders lose automatic receipts and doctor reports undeclared ASCII names, reproduced 2026-10-22.
- [983 — Preserve cover selectors from actual short-lot inventory](./983.md) — major CLI follow-up to completed 925; short-lot context loses or misapplies inventory across staged rows, Cost positions, dates and commodities, changing lot selection and repeat imports, reproduced 2026-10-22.
- [982 — Preserve labels in stranded-lot close advice](./982.md) — minor CLI follow-up to 909/913; omitted or unescaped labels make the copied recovery fail or leave wrong lots open, reproduced 2026-10-22.
- [981 — Preserve acquisition labels in import identities](./981.md) — major CLI follow-up to 899/915; empty/absent labels collapse and NFD/NFC labels split identity, causing skipped or duplicate purchases and false native-ID conflicts, reproduced 2026-10-22.
- [980 — Preserve trade dependencies in same-day bulk ordering](./980.md) — major CLI follow-up to 884; combined pairs reject a valid short cover, the fallback changes independent LIFO/HIFO lots, and newest-first custody transfers drop a bookable sale, reproduced 2026-10-22.

- [979 — Keep opposite-direction source legs distinct in native import matching](./979.md) — major CLI follow-up to 603/896; a sell-two/buy-one pair is falsely accepted as an exact one-share sale, hiding a native-ID source change, reproduced 2026-10-22.

- [978 — Match a cost-selected FIFO sale to its split booked twin](./978.md) — major CLI follow-up to 603; an ordinary stated-cost sale spanning two equal-cost lots is imported twice, reproduced 2026-10-22.

- [977 — Recognize unchanged multi-fill imports above twelve booked lots](./977.md) — major CLI follow-up to 896; two open-cost fills over 13 lots falsely conflict on reimport and a hand-entered twin is booked twice, reproduced 2026-10-22.

- [976 — Honor shared-ID transfer reservations before skipping rows](./976.md) — major CLI follow-up to 882; one transfer is offered twice under a reused shared reference and skip drops a real gift, reproduced 2026-10-22.

- [975 — Retain transfer history under a reused native reference](./975.md) — major CLI follow-up to 598/882; monthly reuse or collisions between individually unique sender references hide the older transfer, reproduced 2026-10-22.

- [974 — Keep native IDs when lot matching is incomplete](./974.md) — major CLI follow-up to 881; filtered Cash/Stock sale reimports lose native-ID ownership at the open-lot guard, reproduced 2026-10-22.

- [973 — Keep native-ID conflicts when a plugin filters the original row](./973.md) — major CLI follow-up to 881; a changed amount under an existing bank reference is imported as new, reproduced 2026-10-22.

- [972 — Strip the BOM before indexing written import identities](./972.md) — major CLI follow-up to 881; an unchanged CSV transaction is written twice when its first source line carries a BOM, reproduced 2026-10-22.

- [971 — Coalesce one source file shared by portable-export roles](./971.md) — minor CLI false collision; one included file also reached as a document or package resource prevents export, reproduced 2026-10-22.

- [970 — Recognize helpers beneath overlapping ledger Python paths](./970.md) — minor CLI export omission; an enabled ancestor hides an included directory's ordinary helper from snapshots, reproduced 2026-10-22.

- [969 — Export every imported namespace-package portion](./969.md) — minor CLI follow-up to 880; split namespace resources/modules are omitted from successful snapshots, reproduced 2026-10-22.

- [968 — Discover export helpers before plugin processing suppresses their import](./968.md) — minor CLI follow-up to 880; a cached idempotent plugin produces a successful snapshot missing its helper, reproduced 2026-10-22.

- [967 — Preserve literal quotes in CSV column mappings](./967.md) — trivial CLI mapping gap; valid quoted headers cannot be named losslessly, reproduced 2026-10-22.

- [966 — Keep leap day in February's current fiscal year](./966.md) — minor CLI period-selection finding; clock-controlled Feb29 reports select the next fiscal year, reproduced 2026-10-22.
- [965 — Give mixed-type query ordering a consistent comparison rule](./965.md) — minor CLI follow-up to 760; source permutations change ORDER BY and LIMIT results, reproduced 2026-10-21.
- [964 — Report tool-description drift, not only prompt drift](./964.md) — minor backend-v2 eval-harness finding from the w5/m5 Codex measurement ([w4/960](../w4/done/960.md)); observed 2026-10-21.
- [963 — Limit Codex eval sessions to the eval server, as Claude Code's are](./963.md) — minor backend-v2 eval-harness finding from the w5/m5 Codex measurement; observed 2026-10-21.
- [962 — Accept "rejected … lacks `ledger.write`" as a read-only refusal](./962.md) — trivial backend-v2 eval scoring finding from the w5/m5 Codex measurement; observed 2026-10-21.
- [961 — Keep QA writes and agent-eval resets off each other's ledger](./961.md) — minor eval/QA-contract finding from the w5/m5 Codex measurement; which ledger QA uses is the user's call; observed 2026-10-21.
- [959 — Treat repeated allowed currencies as one during transaction inference](./959.md) — minor CLI existing-ledger/native-import inference finding; USD/EUR and split-file controls reproduced 2026-10-21.
- [958 — Keep unused unopened accounts out of remembered CSV settings](./958.md) — minor CLI memory-guard follow-up to 452/714; empty, skipped and fully categorized exports reproduced 2026-10-21.
- [957 — Allow instrument units in the portfolio preset's holdings account](./957.md) — minor CLI first-purchase setup finding; reproduced twice in USD/EUR on 2026-10-21.
- [938 — Exclude generated prices and balances from duplicate and conflict checks](./938.md) — major CLI skipped-write gap; quote and balance guards count generated rows as authored, so forced corrections/assertions report zero-write success, reproduced 2026-10-21.
- [939 — Use display columns for query-to-tree conversion](./939.md) — minor CLI integration gap; wide CJK accounts make valid BQL tables refuse, while wide narrations leave ordinary accounts flat in a successful partial tree, reproduced 2026-10-21.
- [940 — Keep known net profit when unpriced income and expense cancel](./940.md) — minor CLI report inconsistency; equal foreign-commodity flows leave known 20 USD profit, but its sole period reports unavailable beside the correct headline, reproduced 2026-10-21.
- [941 — Write an `import-id` on hosted bank imports so the shared dedup contract sees them](./941.md) — minor backend-v2 finding from w5/m5/t004; observed 2026-10-21.
- [942 — Report the written file and entry hashes from `importStagedBankTransactions`](./942.md) — trivial backend-v2 finding from w5/m5/t004; observed 2026-10-21.
- [943 — Preserve a numeric zero import-id as a supplied identity](./943.md) — major CLI double-booking gap; zero is replaced with a content hash, so a corrected amount under the same supplied ID writes as a new payment at exit 0, reproduced 2026-10-21.
- [944 — Normalize native Beancount query input with its loaded text](./944.md) — minor CLI query mismatch; decomposed accented filters omit real expenses and copied stored names refuse after the helper normalizes the source, reproduced 2026-10-21.
- [945 — Refuse init when a case-variant target would shadow the existing default ledger](./945.md) — minor CLI onboarding gap; `main.BEAN` bypasses the sibling-root check on case-insensitive APFS, switching ordinary reports from the existing 100 USD book to an empty template, reproduced 2026-10-21.
- [946 — Keep calculated allocation fractions out of a cents ledger's report display precision](./946.md) — minor CLI report issue; a plugin splitting a 10.00 USD expense into thirds makes every human USD total print 27 decimals, while source cents and exact JSON remain intact, reproduced 2026-10-21.
- [947 — Keep closed holdings when their converted balance is zero](./947.md) — minor CLI balance-filter issue; closed holdings disappear at zero converted value, including distinct long/short lots with zero net units and cost in every conversion, extended 2026-10-22.
- [948 — Recognize reused bank references in overlapping statements before skipping rows](./948.md) — major CLI missed-payment issue; one already-imported occurrence makes two dated source payments look duplicate, so even include writes nothing and Cash stays -7.75 instead of -15.50 USD, reproduced 2026-10-21.
- [949 — Preserve inferred compound-cost parts in single-add JSON round trips](./949.md) — minor CLI round-trip gap after 801; successful inferred-cost trades return JSON that bulk replay refuses as unbalanced, while resolved-cost controls work, reproduced 2026-10-21.
- [950 — Resolve inferred costs and prices before import hashing and comparison](./950.md) — major CLI missed-trade gap; omitted cost/price parts merge distinct purchases or hide currency corrections, while numeric inference also makes unchanged bank-ID trades falsely conflict, reproduced 2026-10-21.
- [951 — Check imported balances against every dated row in the batch](./951.md) — major CLI used-pad guard gap; newest-first entries accept a stale EUR assertion with a hidden −50 EUR adjustment and refuse the correct assertion, reproduced 2026-10-21.
- [952 — Invalidate the ledger cache when a local plugin helper changes](./952.md) — minor CLI stale-accounting follow-up to 326; edited fee helper leaves four read commands at 1 USD while fresh loads calculate 12.50 USD, reproduced 2026-10-21.
- [953 — Name generator extraction failures without the configuration repair hint](./953.md) — minor CLI diagnostic follow-up to 852; deferred extract() exits get an unrelated Ingest/main-guard remedy while immediate method exits are correctly identified, reproduced 2026-10-21.
- [954 — Find ledger suffix case variants during directory formatting](./954.md) — minor CLI formatting-discovery gap; `.BEAN` and mixed-case ledgers are omitted from successful directory checks and mixed-directory applies, reproduced 2026-10-21.
- [955 — Count same-day assertions before treating a pad as staged](./955.md) — major CLI financial-guard gap; add and import silently backdate a EUR adjustment when the pad's existing USD assertion has the new assertion's date, reproduced 2026-10-21.
- [956 — Preserve valid Unicode spaces in read account filters](./956.md) — minor CLI wrong-account read regression from 626; trailing-space names select 100 USD instead of their 200 USD, while list/balance include both accounts, reproduced 2026-10-21.

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
