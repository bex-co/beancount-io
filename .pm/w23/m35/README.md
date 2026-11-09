# w23 · m35 — Offer argument completion for MCP prompts and resource templates

**Worker:** worker1 **Goal:** Hosts that call `completion/complete` autocomplete ledger, month, account and bank-item arguments without leaking anything beyond the credential's reach. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Check whether Claude Code and Codex request completions | 40m | — |
| t002 | Declare completions and complete ledger and month | 60m | t001 |
| t003 | Complete account and item_id with authorization | 45m | t002 |
| t004 | Document completions and register the parity exception | 25m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

Evidence from the evaluated hosts shows they request completions; `completions` is declared and `completion/complete` answers `ledger`, `month`, `account` and `item_id`; a ledger-restricted or read-only credential receives only what it may see, with tests for refusal; the MCP-only exception is recorded in `docs/api-parity.md`; `yarn test` passes. If no host requests completions, block the milestone with that evidence instead of building.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w23` 2026-11-08, proposal 5; Prompts section of `docs/mcp.md`.
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** Slash-command users type fewer exact identifiers and make fewer malformed prompt calls.
- **Why now:** Prompts shipped but their arguments must be typed exactly (`owner/name`, `YYYY-MM`); the evidence task decides cheaply whether any host benefits.
- **Adoption surface:** included: agents and integrators touch this surface directly.
