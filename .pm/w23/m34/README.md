# w23 · m34 — Make a ledger timeout tell the agent what happened and how to retry

**Worker:** worker1 **Goal:** A slow or hung ledger call ends inside its documented deadline with an error that says the write may have committed and how to retry safely, the same on REST, GraphQL and MCP. **Status:** todo (t001–t003, t005 done)

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Map existing timeouts and cancellation points — **DONE** | 30m | — |
| t002 | Reproduce a hung ledger call with a slow stub — **DONE** | 45m | t001 |
| t003 | Add a deadline in the shared ledger-call layer — **DONE** (reshaped: timeout hint, not a new deadline) | 60m | t002 |
| t005 | Document the timeout behavior — **DONE** | 20m | t003 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t008 |

## Definition of done

Tests with a never-answering ledger stub show the call ending at the deadline with a hinted `SERVICE_UNAVAILABLE` on REST, GraphQL and MCP, the socket released, and the hint naming `requestId` for writes; the deadlines and the hint are in the `docs/mcp.md` failure table; `yarn test` passes. (Reshaped 2026-11-08: t001 found the deadline already exists in the shared layer, and cancel-on-disconnect was dropped.)

## Source + Goal linkage

- **Source:** `w23/done/209`, `/pm-brainstorm for w23` 2026-11-08, proposal 4.
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** An agent whose query hangs gets a prompt, actionable error rather than an indefinite wait, and one oversize call cannot hold the ledger.
- **Why now:** w23/209's ~12-minute outage was never explained and the route and tool files hold no deadline or abort handling; w23/m26 widened preview budgets, which concentrates long calls.
- **Adoption surface:** included: agents and integrators touch this surface directly.

## Dropped

- ~~**t004**~~ — Cancel in-flight work when the client disconnects — dropped 2026-11-08: t001 found the shared client already bounds every call (30 s reads, 90 s writes) and releases its socket at the deadline (t002), so an abandoned read holds the engine for at most 30 s. Aborting a *write* on disconnect would recreate the abort-after-commit duplicate a retry then repeats, the very hazard `FAVA_WRITE_TIMEOUT_MS` was raised to avoid (w3/003). The benefit is small and the cost is a correctness risk, so the work is unwanted, not blocked.
