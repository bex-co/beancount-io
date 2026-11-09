# w23 · m34 — Bound a tool call's runtime and stop work when the client disconnects

**Worker:** worker1 **Goal:** A slow or hung ledger call ends with a hinted error inside a documented deadline on REST, GraphQL and MCP, and an abandoned call stops consuming the ledger. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Map existing timeouts and cancellation points | 30m | — |
| t002 | Reproduce a hung ledger call with a slow stub | 45m | t001 |
| t003 | Add a deadline in the shared ledger-call layer | 60m | t002 |
| t004 | Cancel in-flight work when the client disconnects | 45m | t003 |
| t005 | Document the timeout behavior | 20m | t003 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t008 |

## Definition of done

Tests with a never-returning ledger stub show the call ending with a hinted error within the deadline on all three surfaces, an aborted request cancelling the stub call, and writes pointing at `requestId` retry; the behavior is in the `docs/mcp.md` failure table; `yarn test` passes. If t001 finds a deadline already exists in the shared layer, shrink this milestone to documentation and tests.

## Source + Goal linkage

- **Source:** [w23/done/209](../../done/209.md), `/pm-brainstorm for w23` 2026-11-08, proposal 4.
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** An agent whose query hangs gets a prompt, actionable error rather than an indefinite wait, and one oversize call cannot hold the ledger.
- **Why now:** w23/209's ~12-minute outage was never explained and the route and tool files hold no deadline or abort handling; w23/m26 widened preview budgets, which concentrates long calls.
- **Adoption surface:** included: agents and integrators touch this surface directly.
