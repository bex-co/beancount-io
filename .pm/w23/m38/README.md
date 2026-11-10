# w23 · m38 — Key every per-ledger mechanism on one canonical ledger identity

**Worker:** worker1 **Goal:** The spelling of `owner/name` (case, whitespace, slashes) can no longer change which idempotency record, cache entry or limit a request shares, and a malformed ledger names the rule it broke on every surface. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Audit every key built from ledger spelling | 30m | — |
| t002 | Key idempotency on one canonical ledger id (w1/234) | 40m | t001 |
| t003 | Name the failing slug rule when the MCP `ledger` is malformed (w1/235) | 25m | — |
| t004 | Write the ledger-spelling matrix | 45m | t002, t003 |
| t005 | Document the ledger spelling rule once | 20m | t004 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t008 |

## Definition of done

A matrix test sends the 33 ledger spellings from `w1/235` through a read tool, a write tool with a `requestId`, the resource, REST and GraphQL and asserts each one resolves to the same ledger identity or is refused naming the broken slug rule; the same `requestId` retried with a different owner case commits once; reverting the canonicalization turns the matrix red; `yarn test` and `yarn typecheck` pass in backend-v2.

## Source + Goal linkage

- **Source:** `w1/234`, `w1/235`; `/pm-brainstorm more for w23` 2026-11-10, proposal 1.
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** An agent that retries a write with the ledger spelled differently no longer duplicates a transaction, and a typo in `ledger` tells it which rule failed instead of reading as "no ledger given".
- **Why now:** `requestId` exists only to prevent a duplicate write. `ledger-entry-service.ts` builds `ledgerId` from the caller's raw `owner/name` and feeds it to `CACHE_KEYS.ledger.entryWriteRequest`, so one spelling variant defeats it; other keys built the same way have not been audited.
- **Adoption surface:** included: agents and integrators touch the `ledger` parameter on every tool.
