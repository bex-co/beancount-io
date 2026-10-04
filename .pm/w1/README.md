# w1 — General adoption worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Milestones

Milestones m1–m23 are complete; no pending ADR014 follow-up milestones remain from that run. The block m23–m27 and m29 was materialized on 2026-09-16 from `/pm-brainstorm for w1`: five of them absorb the 2026-09-15/16 continuous CLI QA sweep by shared root cause rather than one note at a time, and m29 carries promoted work from w2/027. m23–m27 and m29 have shipped. There is no m28 — see `## Dropped`.

**Suggested order:** m25 → m26 → m27 → m29. The five CLI-sweep milestones are independent of one another and can be taken in any order; m23 shipped first because it fixes a silent ledger-wipe path (`w3/300`, critical) and establishes the exit contract the others are tested against. m29 is the non-sweep item and depends on nothing in this queue.

### Open

- [x] **m25** — [Every failure is a JSON envelope, and empty inputs are errors](./done/m25/README.md) (9 tasks) ← `/pm-brainstorm for w1` 2026-09-16 item 3; absorbs 24 CLI QA notes from w3 plus w5/004
- [x] **m26** — [Ledgers survive Windows editors and Unicode](./done/m26/README.md) (9 tasks) ← `/pm-brainstorm for w1` 2026-09-16 item 4; absorbs 9 CLI QA notes from w3
- [x] **m27** — [Amounts are exact on the way in and out](./done/m27/README.md) (10 tasks) ← `/pm-brainstorm for w1` 2026-09-16 item 5; absorbs 10 CLI QA notes from w3
- [x] **m29** — [`bea` resolves managed price includes locally](./done/m29/README.md) (10 tasks) ← promoted [w2/027](../w2/027.md); ADR 015 + PRFAQ002

## Dropped

- ~~**m28**~~ — Read-after-delete consistency for hosted slice deletes — dropped 2026-09-16: proposed by `/pm-brainstorm for w1` as a promotion of `w1/033`, but never materialized as open work. Triage the same day established that every layer of the delete path in this monorepo already applies synchronously — backend-v2 awaits the ledger-service call, the ledger service awaits a Gitea CAS commit with bounded retry, reads resolve live HEAD per load, and backend-v2 caches no journal or context read — so there is no async-apply code here to fix and no in-monorepo change can be proven against the acceptance. The work is still wanted and waits with its full record and **Unblock:** condition at [blocked/033](./blocked/033.md), which needs hosted diagnosis naming the lagging layer. Promoting it into a milestone would have duplicated that note and put unbuildable work in the open tree.

### Complete

- [x] **m24** — [Bank CSVs import as exported: delimiters, amounts, encodings, IDs](./done/m24/README.md) (12 tasks) ← `/pm-brainstorm for w1` 2026-09-16 item 2; absorbs 15 CLI QA notes from w3 plus w5/003
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

- [053](./053.md) — Query, balance and report JSON/CSV print tiny amounts in scientific notation (`1E-8`, `0E-8`) — **minor**, CLI QA 2026-10-02.
- [061](./061.md) — A ledger plugin or importer that prints to stdout corrupts the engine envelope: successful writes report exit 4 — **major**, CLI QA 2026-10-02.
- [066](./066.md) — Ctrl-C ends the interactive `bea query` shell (exit 130) and loses its history — **major**, CLI QA 2026-10-02.
- [067](./067.md) — The interactive query shell prints raw Python tracebacks for errors the one-shot path already explains — **minor**, CLI QA 2026-10-02.
- [068](./068.md) — `doctor roundtrip` and `doctor print-options` ignore syntax errors in included files and exit 0 — **minor**, CLI QA 2026-10-02.
- [070](./070.md) — `price status` reports a 1970 next refresh and no error for a never-fetched managed price source — **minor**, CLI QA 2026-10-02.
- [071](./071.md) — `bea balance ACCOUNT` hides closed accounts that still hold money, so totals disagree with the trial balance — **major**, CLI QA 2026-10-02.
- [072](./072.md) — Parents whose children cancel show `—` instead of the promised explicit zero for plain currencies and in filtered views — **minor**, CLI QA 2026-10-02.
- [073](./073.md) — A read-only included directory blocks every write with a raw `Errno 13` reported as a validation error — **minor**, CLI QA 2026-10-02.
- [074](./074.md) — A signal during Beancount parsing is swallowed: a stopped write can still land, or staging copies leak — **minor**, CLI QA 2026-10-02.
- [075](./075.md) — Write locks are case-sensitive on macOS, so writers using differently-cased paths can lose an add (partly verified) — **minor**, CLI QA 2026-10-02.
- [076](./076.md) — Concurrent commands on a ledger with managed prices fail at random with a raw `[Errno 2]` on the price cache — **major**, CLI QA 2026-10-03.
- [077](./077.md) — A truncated managed-price download is cached as a new revision and then pinned forever by 304s — **major**, CLI QA 2026-10-03.
- [078](./078.md) — The managed-price 5-second fetch limit is per socket read, so a slow server stalls every command — **minor**, CLI QA 2026-10-03.
- [079](./079.md) — `--offline` writes to the managed-price cache, and a read-only cache crashes loads with a raw `[Errno 13]` — **minor**, CLI QA 2026-10-03.
- [080](./080.md) — Every write and import preview leaves another full copy of each managed price feed in the cache — **minor**, CLI QA 2026-10-03.
- [081](./081.md) — Managed price feed validation accepts Unicode whitespace Beancount cannot parse, and replaces the last good revision — **minor**, CLI QA 2026-10-03.
- [082](./082.md) — A relative `XDG_CACHE_HOME` breaks every ledger that uses managed prices — **minor**, CLI QA 2026-10-03.
- [083](./083.md) — Beancount's load cache ignores newly matching include-glob files, so repeated `bea import --apply` writes duplicates — **major**, CLI QA 2026-10-03.
- [084](./084.md) — `bea treeify -o` writes before deciding the run failed: failed runs clobber the destination and same-path input becomes empty — **minor**, CLI QA 2026-10-03.
- [085](./085.md) — Unexpected engine exceptions lose their type and traceback: a bad BQL date literal exits 1 and `--debug` cannot locate it — **minor**, CLI QA 2026-10-03.
- [086](./086.md) — `bea example` date-order guard only fires when both dates are given; one-sided or short ranges crash upstream — **minor**, CLI QA 2026-10-03.
- [087](./087.md) — `bea format --check` is quadratic on long include chains (86 s for 1,500 files) — **minor**, CLI QA 2026-10-03.
- [092](./092.md) — `add transaction --json` output for a `{{total}}` cost is refused when fed back if the balancing leg was omitted — **minor**, CLI QA 2026-10-03.
- [093](./093.md) — `add transaction --json` output drops a `@@` total, so feeding it back writes a repeating `@` unit price — **minor**, CLI QA 2026-10-03.
- [094](./094.md) — Bulk-added posting metadata is written at posting indentation, so it reads as transaction metadata — **minor**, CLI QA 2026-10-03.
- [095](./095.md) — After an approved `ask` write, a failed turn claims "nothing was written to your ledger" and forgets the write — **major**, CLI QA 2026-10-03.
- [096](./096.md) — One long cell bypasses `ask`'s ~12,000-character query-result limit — **minor**, CLI QA 2026-10-03.
- [097](./097.md) — `ask` renders model Markdown links as disguised terminal hyperlinks — **minor**, CLI QA 2026-10-03.
- [098](./098.md) — The engine imports Python modules from the current directory, so untrusted folders run code and `check` modes disagree — **major**, CLI QA 2026-10-03.
- [099](./099.md) — Ledger writes keep only mode bits: group, ACLs, extended attributes and file flags are dropped — **major**, CLI QA 2026-10-03.
- [100](./100.md) — Appending to a ledger without a final newline drops the blank line before the new entry — **minor**, CLI QA 2026-10-03.
- [101](./101.md) — Plugin failures lose the exception type and point at the wrong `plugin` line — **minor**, CLI QA 2026-10-03.
- [102](./102.md) — An Emacs lock file (`.#main.bean`) fails directory formatting with advice to delete it — **minor**, CLI QA 2026-10-03.
- [103](./103.md) — `query -o /dev/null` fails with a raw errno and `-o /dev/stdout` leaks an engine usage error — **minor**, CLI QA 2026-10-03.
- [104](./104.md) — A write lands, then `bea` exits 1 when stdout cannot encode a non-ASCII path; a retry duplicates the entry — **minor**, CLI QA 2026-10-03.
- [105](./105.md) — A corrupt remembered-CSV record makes every later `import` for that ledger fail with a raw `TypeError` — **minor**, CLI QA 2026-10-03.
- [106](./106.md) — Narrow-terminal `list` tables still pad and truncate CJK/emoji by character count (gap in w3/391) — **minor**, CLI QA 2026-10-03.
- [107](./107.md) — With stdout closed (`>&-`), commands exit 1 with `'NoneType' object has no attribute 'flush'` after writes land — **minor**, CLI QA 2026-10-03.
- [108](./108.md) — Unknown keys inside bulk `units`/`cost`/`price` are silently dropped, so a typo sells the wrong lot — **major**, CLI QA 2026-10-03.
- [109](./109.md) — Bulk metadata errors abort the whole batch, ignore `--partial`, and name no row — **minor**, CLI QA 2026-10-03.
- [110](./110.md) — Bulk amounts accept `1_000`, Arabic-Indic and full-width digits that single `add` refuses — **minor**, CLI QA 2026-10-03.
- [111](./111.md) — Bulk dates accept numeric strings as Unix timestamps and other non-ISO spellings — **minor**, CLI QA 2026-10-03.
- [112](./112.md) — `add transactions --from -` leaks raw Python errors (exit 1) for undecodable, deeply nested or huge-integer stdin — **minor**, CLI QA 2026-10-03.
- [113](./113.md) — Bundled forecast/amortize plugin copies count as written rows, so `list --on-disk` disagrees with grep — **major**, CLI QA 2026-10-03.
- [115](./115.md) — `list pad` shows two columns both headed `SOURCE` when any pad is generated — **minor**, CLI QA 2026-10-03.
- [116](./116.md) — `add balance --pad-from` treats any "Unused Pad" error as "book balance already matches", hiding real padding — **minor**, CLI QA 2026-10-03.
- [117](./117.md) — A failed assertion on a parent account offers a ready-to-run opening adjustment despite subaccount activity — **minor**, CLI QA 2026-10-03.
- [118](./118.md) — The error collapser repeats identical messages for the same line — **minor**, CLI QA 2026-10-03.
- [124](./124.md) — Balance-sheet `net_profit` follows a different rule from the income statement's — **minor**, CLI QA 2026-10-03.
- [125](./125.md) — Report headlines read "Unavailable" when only an earlier interval row lacks a price — **minor**, CLI QA 2026-10-03.
- [126](./126.md) — `bea balance --json` always reports `account_filter_empty: false` — **minor**, CLI QA 2026-10-03.
- [127](./127.md) — USAGE.md's JSON automation examples show output the CLI doesn't produce — **minor**, CLI QA 2026-10-03.
- [128](./128.md) — Docs-example tests pass when a piped `bea` command fails and never check documented output — **minor**, CLI QA 2026-10-03.
- [130](./130.md) — A comma-decimal bank amount like `0,125` is imported 1000× too large — **major**, CLI QA 2026-10-03.
- [131](./131.md) — When no CSV date format fits the column, the error blames row 1 and an ISO format the user never chose — **minor**, CLI QA 2026-10-03.
- [132](./132.md) — Case-insensitive filters never match Turkish `İ`/`ı` against `i`/`I`, unlike `report -a` and import rules — **minor**, CLI QA 2026-10-03.
- [133](./133.md) — Managed price freshness compares `observed-at` as text and reads naive stamps in local time — **minor**, CLI QA 2026-10-03.
- [134](./134.md) — Ledger-controlled paths and diagnostics reach the terminal raw through bea's error and warning output — **minor**, CLI QA 2026-10-03.
- [135](./135.md) — `--allow-errors` treats an existing error as new when its message embeds a file path, blocking every write — **major**, CLI QA 2026-10-03.
- [136](./136.md) — Appends rewrite text inside strings: U+2028/U+2029 become newlines and continuation lines are re-indented — **major**, CLI QA 2026-10-03.
- [137](./137.md) — `add balance` reports a more precise assertion as a duplicate and records nothing — **minor**, CLI QA 2026-10-03.
- [138](./138.md) — `add price` treats prices generated by `implicit_prices` as ledger-written — **minor**, CLI QA 2026-10-03.
- [139](./139.md) — Close and ask skills detect recurring charges by `payee`, which `bea import` leaves empty for one-description CSVs — **minor**, CLI QA 2026-10-03.
- [140](./140.md) — Close checklist's period-end balance query has no date bound, so later entries change the result — **minor**, CLI QA 2026-10-03.
- [141](./141.md) — `bea treeify` output guard is bypassed by abbreviated long options and clustered short flags, overwriting the ledger — **major**, CLI QA 2026-10-03.
- [142](./142.md) — A `.output` line in the beanquery init file erases the ledger through one-shot `bea query --source` — **major**, CLI QA 2026-10-03.
- [143](./143.md) — Any `.output` line in the beanquery init file breaks every managed `bea query` with a raw AttributeError — **minor**, CLI QA 2026-10-03.
- [144](./144.md) — A partial `format -i` failure leads with "nothing was written" although earlier files were rewritten — **minor**, CLI QA 2026-10-03.
- [145](./145.md) — CSV query cells leak `filename`/`lineno`/`__tolerances__` metadata as a Python dict repr — **minor**, CLI QA 2026-10-03.
- [146](./146.md) — `bea --json query -o X.tsv` is refused with advice that `--json` itself refuses — **minor**, CLI QA 2026-10-03.
- [147](./147.md) — CSV query export doesn't neutralise spreadsheet formulas, and the docs don't say so — **minor**, CLI QA 2026-10-03.
- [148](./148.md) — Without a payee column, any same-day same-amount rows are "possible duplicates" and `--duplicates skip` drops real rows — **major**, CLI QA 2026-10-03.
- [149](./149.md) — The generated `import-id` ignores payee, so a reordered export marks a new row as an exact duplicate — **major**, CLI QA 2026-10-03.
- [150](./150.md) — A `sign=ledger` preview followed by the documented flag-free `--apply` writes the opposite sign — **minor**, CLI QA 2026-10-03.
- [151](./151.md) — Quoted semicolons in a comma CSV make delimiter detection choose `;` and refuse the file — **minor**, CLI QA 2026-10-03.
- [152](./152.md) — A blank first line hides the CSV header, and the error advice cannot work — **minor**, CLI QA 2026-10-03.
- [153](./153.md) — Contradictory double-negative CSV amounts like `(-5.00)` are silently booked as money in — **minor**, CLI QA 2026-10-03.
- [154](./154.md) — A `#` or `?` in a bare `query --source` path bypasses the ledger-alias guard and overwrites the ledger — **major**, CLI QA 2026-10-03.
- [155](./155.md) — `query --source` forwards the query without `--`, so a dash-leading query injects `--output=` past the guard — **major**, CLI QA 2026-10-03.
- [156](./156.md) — `doctor roundtrip` through a symlinked ledger overwrites and deletes a file beside the real ledger — **major**, CLI QA 2026-10-03.
- [157](./157.md) — Import blocks rows for account names with an unknown root and suggests a `bea add open` that cannot work — **major**, CLI QA 2026-10-03.
- [158](./158.md) — A zero-day `CLOSE ON` window inside a subquery bypasses the empty-window refusal — **minor**, CLI QA 2026-10-03.
- [159](./159.md) — The frontend include scan misses `include"x"` and escaped include strings, so `-o` guards let exports overwrite included ledger files — **major**, CLI QA 2026-10-03.
- [160](./160.md) — CSV import-ids collapse amounts beyond 28 significant digits, so a new row is skipped as an exact duplicate — **minor**, CLI QA 2026-10-03.
- [161](./161.md) — A stored `.run` query with `DISTINCT tags`/`GROUP BY tags` still leaks the raw compile error — **minor**, CLI QA 2026-10-03.
- [162](./162.md) — A malformed-CSV error names the last line of the file, not where the unclosed quote starts — **minor**, CLI QA 2026-10-03.
- [163](./163.md) — A ledger price written with a slash or unpadded date doesn't override the managed-feed price for that date — **major**, CLI QA 2026-10-03.
- [164](./164.md) — The `--meta` invalid-date check misses slash and unpadded dates and stores them as strings — **minor**, CLI QA 2026-10-03.
- [165](./165.md) — `add document` accepts a `../` path outside the ledger directory that the next `bea check` rejects (as "absolute") — **minor**, CLI QA 2026-10-03.
- [166](./166.md) — `bea format -` with non-UTF-8 stdin leaks a raw "can't encode … surrogates" error instead of the decode error — **minor**, CLI QA 2026-10-03.
- [167](./167.md) — A refused bulk add without `--partial` reloads the ledger once per row just to build its hint — **minor**, CLI QA 2026-10-03.
- [168](./168.md) — An `import-id` conflict inside the import file tells the user to edit a ledger entry that doesn't exist — **minor**, CLI QA 2026-10-03.
- [169](./169.md) — A schema-invalid bulk batch suggests `--partial` "for some of the 0" valid rows — **minor**, CLI QA 2026-10-03.

The three MCP QA findings filed on 2026-09-21/22 were drained on 2026-09-23: [035](./done/035.md), [036](./done/036.md), and [037](./done/037.md) shipped with regression coverage.

The four mobile QA findings filed on 2026-09-16 were drained the same day: [031](./done/031.md), [032](./done/032.md), and [034](./done/034.md) shipped with regression coverage, and [033](./blocked/033.md) is blocked.

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
