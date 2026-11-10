# w23 · m36 — Give the same bad call the same failure on REST, GraphQL and MCP

**Worker:** worker1 **Goal:** A test matrix drives one invalid call through all three surfaces and fails when they answer with different error categories, and the known divergences are fixed. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Enumerate the bad-call set | 40m | — |
| t002 | Write the failure-parity matrix test | 60m | t001 |
| t003 | Fix the unknown-ledger write answer (w1/194) | 45m | t002 |
| t004 | Validate pagination bounds on the catalog reads (w1/205) | 40m | t002 |
| t005 | Record the remaining divergences | 30m | t002 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t008 |

## Definition of done

A matrix test sends each bad call (unknown ledger, missing file, out-of-range pagination, blank id, read-only credential writing, stale hash) through REST, GraphQL and MCP and asserts one error category per call; every allowed difference is listed with a written reason; reverting the `w1/194` fix turns the matrix red; `yarn test` and `yarn typecheck` pass in backend-v2.

## Source + Goal linkage

- **Source:** `w1/194`, `w1/205`; `/pm-brainstorm for w23` 2026-11-10, proposal 4. Complements `w23/done/226` (category to status mapping) and `w23/m21` (preview parity).
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** Agents that branch on the error category retry or give up correctly on whichever surface they use.
- **Why now:** The parity rule in the root AGENTS.md covers failure behavior, but only the category-to-status map is tested; QA iterations keep filing single mismatches one by one.
- **Adoption surface:** included: agents and integrators touch this surface directly.
