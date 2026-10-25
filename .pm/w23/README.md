# w23 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Milestones

- [ ] **m1** — [Fence concurrent same-entry updates](./m1/README.md) (7 tasks) ← promoted from `w23/085` 2026-10-25

## Dropped

- ~~**046**~~ — social follower/following/starred lists answer an unknown user with an empty success — dropped 2026-10-21: documented behavior (`backend-cluster/backend-v2/docs/mcp.md`, social reads: "returns an empty page on upstream failure, so an empty result does not establish that the user has no followers or stars")

## Inbox

- [082](./blocked/082.md) — `createPullRequest` fails on production: Gitea 500 while creating the `pr-patch-*` branch, on MCP and REST alike — **blocked:** needs the Gitea server-log cause for one failing branch create (owner), then a production rerun
- [080](./blocked/080.md) — `/api-gateway/mcp` accepts any `Origin` (the MCP transport spec says a bad `Origin` MUST get 403); owner picks validate vs document — **blocked:** owner picks 403-on-foreign-Origin vs documented non-validation
- [075](./blocked/075.md) — typed BQL results return NULL as `""` (undocumented), so a missing payee or price reads as an empty string — **blocked:** documented as `""` (option a shipped); owner picks `null` on REST/MCP, `null` everywhere, or keeping `""`
- [072](./blocked/072.md) — concurrent writes (append, add entries, exact-text edits) still lose with `SERVICE_UNAVAILABLE` on production after w23/017; the production lost-race signature differs — **blocked:** needs one losing call's host status and body from the production ledger-service log (owner), then a post-deploy rerun
- [065](./blocked/065.md) — a ledger-pinned credential keeps the old name after a rename — **blocked:** owner picks repository-ID pins, canonical-name pins, or an accurate refusal (credential trust boundary)
- [059](./blocked/059.md) — every product-created ledger ships `auto_accounts`, so a misspelt account is silently opened — **blocked:** owner picks drop-plugin (which also limits AI categorization to existing accounts) vs report-new-accounts
- [022](./blocked/022.md) — report rustledger BQL gaps upstream (`cost(sum(position))`, `neg`/`filter_currency`, `meta('lineno')`, `AT value`, `BALANCES FROM`) — **blocked:** filing in an external tracker needs the user's approval
- [026](./blocked/026.md) — streaming archive route for MCP OAuth clients over 8 MiB (option 1 from 023) — **blocked:** an ADR 0007 trust-boundary decision for the owner
