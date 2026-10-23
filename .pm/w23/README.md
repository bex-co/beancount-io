# w23 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Milestones

## Dropped

- ~~**046**~~ — social follower/following/starred lists answer an unknown user with an empty success — dropped 2026-10-21: documented behavior (`backend-cluster/backend-v2/docs/mcp.md`, social reads: "returns an empty page on upstream failure, so an empty result does not establish that the user has no followers or stars")

## Inbox

- [077](./077.md) — MCP `VALIDATION_FAILED` envelope drops `newLedgerErrors` (promised by tool descriptions; REST/GraphQL carry it)
- [076](./076.md) — on a new ledger `appendLedgerText` puts transactions above the template's `* Transactions` heading, unlike `addLedgerEntries`
- [075](./075.md) — typed BQL results return NULL as `""` (undocumented), so a missing payee or price reads as an empty string
- [074](./074.md) — a file batch within both documented caps (2 × 0.9 MB) fails with `SERVICE_UNAVAILABLE`: the ledger service's 2 MB body limit is hit internally
- [073](./073.md) — an MCP request over the 2 MiB cap gets 413 "could not be read as a JSON-RPC request", not a size message
- [072](./072.md) — concurrent writes (append, add entries, exact-text edits) still lose with `SERVICE_UNAVAILABLE` on production after w23/017; the production lost-race signature differs
- [071](./071.md) — a structured `budget` for an account the ledger doesn't have (not opened, no opened children) is accepted and never applies
- [070](./070.md) — REST answers a rejected bearer token (MCP audience, expired, malformed) with "send `Authorization: Bearer <token>`"
- [069](./069.md) — admin actions (collaborators, rename, delete) on a ledger the caller can read answer "Ledger not found"; 063 fixed leave only
- [065](./blocked/065.md) — a ledger-pinned credential keeps the old name after a rename — **blocked:** owner picks repository-ID pins, canonical-name pins, or an accurate refusal (credential trust boundary)
- [059](./blocked/059.md) — every product-created ledger ships `auto_accounts`, so a misspelt account is silently opened — **blocked:** owner picks drop-plugin (which also limits AI categorization to existing accounts) vs report-new-accounts
- [022](./blocked/022.md) — report rustledger BQL gaps upstream (`cost(sum(position))`, `neg`/`filter_currency`, `meta('lineno')`, `AT value`, `BALANCES FROM`) — **blocked:** filing in an external tracker needs the user's approval
- [026](./blocked/026.md) — streaming archive route for MCP OAuth clients over 8 MiB (option 1 from 023) — **blocked:** an ADR 0007 trust-boundary decision for the owner
