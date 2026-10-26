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

## Dropped

- ~~**046**~~ — social follower/following/starred lists answer an unknown user with an empty success — dropped 2026-10-21: documented behavior (`backend-cluster/backend-v2/docs/mcp.md`, social reads: "returns an empty page on upstream failure, so an empty result does not establish that the user has no followers or stars")
- ~~**088**~~ — `appendLedgerText` ignores its documented `pushtag`/`pushmeta` handling — dropped 2026-10-25: invalid probes; dated push/pop is a syntax error in real beancount too (verified on PyPI beancount 3.2.3), and undated push/pop applies tags, consumes the lines, and refuses unbalanced pops naming the line, exactly as documented

## Inbox

- [111](./111.md) — `listLedgerEntries` / journal returns `is_empty: false` alongside `total: 0` on filtered-to-zero results (ledger-level flag; should be result-level)
- [112](./112.md) — REST bank queries silently drop unknown keys instead of refusing them (m8/t005 follow-up; `.strict()` on `bankAccountQuery`)
- [113](./113.md) — every validated REST GET query schema silently drops unknown keys (32 routes verified; w23/112 pattern repo-wide; MCP/GraphQL strict)
- [114](./114.md) — REST file writes take no `dryRun` while MCP previews them (m9/t001 follow-up; flags exist only on MCP)
- [115](./115.md) — quoted `FROM "<table>"` names are silently ignored (any quoted name returns postings scope, even nonexistent tables; w23/109's quoted bypass is unsafe)
- [116](./116.md) — with-clause `FROM` resolves table-first where stock resolves column-first (`FROM accounts`: bare 34, +LIMIT 12, +WHERE errors; stock 34 in all forms)
- [117](./117.md) — `prompts/get` silently ignores unknown string args while tools refuse unknown keys (unknown number args refused, then ignored-in-spirit; full-surface strictness map)
- [118](./118.md) — `initialize` validation failures answer `-32603` with a raw zod dump instead of `-32602` + shaped `BAD_USER_INPUT` like every other method
- [119](./119.md) — set-typed BQL cells render space-joined in text (`runBqlQuery`, GraphQL, stock) but comma-joined in structured (MCP structured, REST; dtype says `set`, value is a string)
- [120](./120.md) — lifecycle mutations take no `dry_run` while every content mutation previews (m7 follow-up; `deleteLedger` destroys blind; no documented exclusion)
- [122](./122.md) — non-`count` aggregates over an empty set return a `str`-typed empty string (`sum`/`min`/`max`/`avg`/`first` → `""`; `count(*)` → `0` correct; stock yields zero rows — 022)
- [082](./blocked/082.md) — `createPullRequest` fails on production: Gitea 500 while creating the `pr-patch-*` branch, on MCP and REST alike — **blocked:** needs the Gitea server-log cause for one failing branch create (owner), then a production rerun
- [080](./blocked/080.md) — `/api-gateway/mcp` accepts any `Origin` (the MCP transport spec says a bad `Origin` MUST get 403); owner picks validate vs document — **blocked:** owner picks 403-on-foreign-Origin vs documented non-validation
- [075](./blocked/075.md) — typed BQL results return NULL as `""` (undocumented), so a missing payee or price reads as an empty string — **blocked:** documented as `""` (option a shipped); owner picks `null` on REST/MCP, `null` everywhere, or keeping `""`
- [072](./blocked/072.md) — concurrent writes (append, add entries, exact-text edits) still lose with `SERVICE_UNAVAILABLE` on production after w23/017; the production lost-race signature differs — **blocked:** needs one losing call's host status and body from the production ledger-service log (owner), then a post-deploy rerun
- [065](./blocked/065.md) — a ledger-pinned credential keeps the old name after a rename — **blocked:** owner picks repository-ID pins, canonical-name pins, or an accurate refusal (credential trust boundary)
- [059](./blocked/059.md) — every product-created ledger ships `auto_accounts`, so a misspelt account is silently opened — **blocked:** owner picks drop-plugin (which also limits AI categorization to existing accounts) vs report-new-accounts
- [022](./blocked/022.md) — report rustledger BQL gaps upstream (`cost(sum(position))`, `neg`/`filter_currency`, `meta('lineno')`, `AT value`, `BALANCES FROM`) — **blocked:** filing in an external tracker needs the user's approval
- [026](./blocked/026.md) — streaming archive route for MCP OAuth clients over 8 MiB (option 1 from 023) — **blocked:** an ADR 0007 trust-boundary decision for the owner
