# w23 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Milestones

- [x] **m1** — [Fence concurrent same-entry updates](./done/m1/README.md) (7 tasks) ← promoted from `w23/085` 2026-10-25
- [x] **m2** — [Fix the journal filter mini-language](./done/m2/README.md) (8 tasks) ← promoted from `w23/089` 2026-10-26
- [x] **m3** — [Unify mutation-tool parameter naming](./done/m3/README.md) (7 tasks) ← promoted from `w23/090` 2026-10-26
- [x] **m4** — [Guard deleting an included file](./done/m4/README.md) (7 tasks) ← promoted from `w23/091` 2026-10-26
- [x] **m5** — [Handle oversize BQL queries](./done/m5/README.md) (8 tasks) ← promoted from `w23/092` 2026-10-26
- [x] **m6** — [Complete the typed entry schema](./done/m6/README.md) (10 tasks) ← promoted from `w23/094` 2026-10-26
- [x] **m7** — [Preview every mutation with dry_run](./done/m7/README.md) (9 tasks) ← promoted from `w23/095` 2026-10-26
- [x] **m8** — [Unify bank-tool parameter naming](./done/m8/README.md) (8 tasks) ← promoted from `w23/096` 2026-10-26
- [x] **m9** — [Unify the universal write-flag spellings](./done/m9/README.md) (8 tasks) ← promoted from `w23/097` 2026-10-26
- [x] **m10** — [Unify the account-journal param spellings](./done/m10/README.md) (8 tasks) ← promoted from `w23/098` 2026-10-26
- [x] **m11** — [Unify the temp-asset object-key spellings](./done/m11/README.md) (8 tasks) ← promoted from `w23/100` 2026-10-26
- [x] **m12** — [Refuse unknown keys on every REST GET query](./done/m12/README.md) (8 tasks) ← promoted from `w23/113` 2026-10-26
- [x] **m13** — [Preview lifecycle mutations with dry_run](./done/m13/README.md) (9 tasks) ← promoted from `w23/120` 2026-10-26
- [ ] **m14** — [Render NULL cells honestly in BQL results](./m14/README.md) (8 tasks) ← promoted from `w23/122` 2026-10-27

## Dropped

- ~~**046**~~ — social follower/following/starred lists answer an unknown user with an empty success — dropped 2026-10-21: documented behavior (`backend-cluster/backend-v2/docs/mcp.md`, social reads: "returns an empty page on upstream failure, so an empty result does not establish that the user has no followers or stars")
- ~~**088**~~ — `appendLedgerText` ignores its documented `pushtag`/`pushmeta` handling — dropped 2026-10-25: invalid probes; dated push/pop is a syntax error in real beancount too (verified on PyPI beancount 3.2.3), and undated push/pop applies tags, consumes the lines, and refuses unbalanced pops naming the line, exactly as documented

## Inbox

- [115](./115.md) — quoted `FROM "<table>"` names are silently ignored (any quoted name returns postings scope, even nonexistent tables; w23/109's quoted bypass is unsafe)
- [116](./116.md) — with-clause `FROM` resolves table-first where stock resolves column-first (`FROM accounts`: bare 34, +LIMIT 12, +WHERE errors; stock 34 in all forms)
- [117](./117.md) — `prompts/get` silently ignores unknown string args while tools refuse unknown keys (unknown number args refused, then ignored-in-spirit; full-surface strictness map)
- [118](./118.md) — `initialize` validation failures answer `-32603` with a raw zod dump instead of `-32602` + shaped `BAD_USER_INPUT` like every other method
- [119](./119.md) — set-typed BQL cells render space-joined in text (`runBqlQuery`, GraphQL, stock) but comma-joined in structured (MCP structured, REST; dtype says `set`, value is a string)
- [124](./124.md) — unquoted `FROM accounts` resolves table-first on MCP (12) vs column-first on stock (34); w23/116's Resolved 'stock is table-first' premise disproven (0.2.0 + master source, direct execution)
- [125](./125.md) — `FROM <column>` fold gaps: `filename`/`lineno`/`meta` silently 0 (engine can't fold), `type`/`weight`/`other_accounts` + 5 more error where the engine folds or empties (pin covers 2 of 19 members)
- [127](./127.md) — `SELECT * AS x` collapses star: 1 declared col vs 31 cells per row, text drops 30 values (stock ParseErrors)
- [128](./128.md) — set equality constant-False on MCP (`tags = tags` → False; stock refuses) (it.3936)
- [129](./129.md) — GROUP BY inventory collapses to 1 group of 34 (DISTINCT finds 15; stock refuses) (it.3960)
- [130](./130.md) — inner bare-`FROM <table>` resolves column-first: real tables error, `accounts` folds (it.4207)
- [131](./131.md) — GROUP BY accepts bare non-grouped columns, silently reports first row's value (it.4594)
- [132](./132.md) — mixed-type `=`/`!=` never coerces: `date`/`number` vs string silently filters everything out (it.4986)
- [133](./133.md) — integer dead zone 2^53..i64::MAX, silent overflow NULL, bogus position-0 error past Decimal::MAX (it.5227-5235)
- [134](./134.md) — structured `dtype` lies for all-NULL aliased columns via alias-name fallback (it.5371-5377)
- [135](./135.md) — empty input masks unknown-function/column errors, fabricates `str` dtype (it.5710-5712)
- [136](./136.md) — computed-value dtypes flip to `str` on empty input (it.5722-5725)
- [137](./137.md) — ledger `permissions` ignore credential scopes; `FORBIDDEN` hints point at the lying field (it.6059-6061)
- [082](./blocked/082.md) — `createPullRequest` fails on production: Gitea 500 while creating the `pr-patch-*` branch, on MCP and REST alike — **blocked:** needs the Gitea server-log cause for one failing branch create (owner), then a production rerun
- [080](./blocked/080.md) — `/api-gateway/mcp` accepts any `Origin` (the MCP transport spec says a bad `Origin` MUST get 403); owner picks validate vs document — **blocked:** owner picks 403-on-foreign-Origin vs documented non-validation
- [075](./blocked/075.md) — typed BQL results return NULL as `""` (undocumented), so a missing payee or price reads as an empty string — **blocked:** documented as `""` (option a shipped); owner picks `null` on REST/MCP, `null` everywhere, or keeping `""`
- [072](./blocked/072.md) — concurrent writes (append, add entries, exact-text edits) still lose with `SERVICE_UNAVAILABLE` on production after w23/017; the production lost-race signature differs — **blocked:** needs one losing call's host status and body from the production ledger-service log (owner), then a post-deploy rerun
- [065](./blocked/065.md) — a ledger-pinned credential keeps the old name after a rename — **blocked:** owner picks repository-ID pins, canonical-name pins, or an accurate refusal (credential trust boundary)
- [059](./blocked/059.md) — every product-created ledger ships `auto_accounts`, so a misspelt account is silently opened — **blocked:** owner picks drop-plugin (which also limits AI categorization to existing accounts) vs report-new-accounts
- [022](./blocked/022.md) — report rustledger BQL gaps upstream (`cost(sum(position))`, `neg`/`filter_currency`, `meta('lineno')`, `AT value`, `BALANCES FROM`) — **blocked:** filing in an external tracker needs the user's approval
- [026](./blocked/026.md) — streaming archive route for MCP OAuth clients over 8 MiB (option 1 from 023) — **blocked:** an ADR 0007 trust-boundary decision for the owner
