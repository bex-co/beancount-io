# w23 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Milestones

- [x] **m1** — [Fence concurrent same-entry updates](./done/m1/README.md) (7 tasks) ← promoted from `w23/085` 2026-10-25
- [x] **m2** — [Fix the journal filter mini-language](./done/m2/README.md) (8 tasks) ← promoted from `w23/089` 2026-10-26
- [x] **m3** — [Unify mutation-tool parameter naming](./done/m3/README.md) (7 tasks) ← promoted from `w23/090` 2026-10-26
- [ ] **m4** — [Guard deleting an included file](./m4/README.md) (7 tasks) ← promoted from `w23/091` 2026-10-26

## Dropped

- ~~**046**~~ — social follower/following/starred lists answer an unknown user with an empty success — dropped 2026-10-21: documented behavior (`backend-cluster/backend-v2/docs/mcp.md`, social reads: "returns an empty page on upstream failure, so an empty result does not establish that the user has no followers or stars")
- ~~**088**~~ — `appendLedgerText` ignores its documented `pushtag`/`pushmeta` handling — dropped 2026-10-25: invalid probes; dated push/pop is a syntax error in real beancount too (verified on PyPI beancount 3.2.3), and undated push/pop applies tags, consumes the lines, and refuses unbalanced pops naming the line, exactly as documented

## Inbox

- [092](./092.md) — BQL queries over ~16 KB URL-encoded fail with `INTERNAL_SERVER_ERROR` instead of a documented limit refusal
- [093](./093.md) — append refusal hint claims "valid Beancount" when the errors include parse errors (rescoped 2026-10-26: the dry-run premise was wrong, previews report errors by design)
- [094](./094.md) — typed entry insert has `price` but no `cost`: agents cannot record lot costs except as raw text
- [095](./095.md) — five mutation tools have no `dry_run`: rename, typed add, and all three entry-source writes
- [096](./096.md) — bank tool arguments mix `snake_case` and `camelCase` with no alias
- [082](./blocked/082.md) — `createPullRequest` fails on production: Gitea 500 while creating the `pr-patch-*` branch, on MCP and REST alike — **blocked:** needs the Gitea server-log cause for one failing branch create (owner), then a production rerun
- [080](./blocked/080.md) — `/api-gateway/mcp` accepts any `Origin` (the MCP transport spec says a bad `Origin` MUST get 403); owner picks validate vs document — **blocked:** owner picks 403-on-foreign-Origin vs documented non-validation
- [075](./blocked/075.md) — typed BQL results return NULL as `""` (undocumented), so a missing payee or price reads as an empty string — **blocked:** documented as `""` (option a shipped); owner picks `null` on REST/MCP, `null` everywhere, or keeping `""`
- [072](./blocked/072.md) — concurrent writes (append, add entries, exact-text edits) still lose with `SERVICE_UNAVAILABLE` on production after w23/017; the production lost-race signature differs — **blocked:** needs one losing call's host status and body from the production ledger-service log (owner), then a post-deploy rerun
- [065](./blocked/065.md) — a ledger-pinned credential keeps the old name after a rename — **blocked:** owner picks repository-ID pins, canonical-name pins, or an accurate refusal (credential trust boundary)
- [059](./blocked/059.md) — every product-created ledger ships `auto_accounts`, so a misspelt account is silently opened — **blocked:** owner picks drop-plugin (which also limits AI categorization to existing accounts) vs report-new-accounts
- [022](./blocked/022.md) — report rustledger BQL gaps upstream (`cost(sum(position))`, `neg`/`filter_currency`, `meta('lineno')`, `AT value`, `BALANCES FROM`) — **blocked:** filing in an external tracker needs the user's approval
- [026](./blocked/026.md) — streaming archive route for MCP OAuth clients over 8 MiB (option 1 from 023) — **blocked:** an ADR 0007 trust-boundary decision for the owner
