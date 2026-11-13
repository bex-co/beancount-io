# w23 · m35 — Offer argument completion for MCP prompts and resource templates

**Worker:** worker1 **Goal:** Hosts that call `completion/complete` autocomplete ledger, month, account and bank-item arguments without leaking anything beyond the credential's reach. **Status:** blocked

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

## Blocked

**Blocked 2026-11-08** — what is blocked: the whole milestone. Its first task (t001) is the evidence gate and the Definition of done says to block rather than build when no evaluated host requests completions.

**Blocker:** no evidence that Claude Code or Codex sends `completion/complete` for prompt arguments. Public sources found 2026-11-08: Codex's MCP support is documented for tools only (this repository's `docs/mcp.md` already says Codex 0.154.0 does not use prompts), third-party Codex write-ups mention resource reads, output schemas and elicitations but not completions, and the Claude Code feature requests for completion support in prompts and the `@` mention UI show no confirmed shipped fix. Building a `completions` capability that no host calls would be milestone theater. No code was written; the server declares no `completions` capability today.

**Unblock:** an observation that an evaluated host calls it: run `yarn mcp:agent-eval` (billed; owner approval) for the Claude Code prompt journeys against the hosted endpoint with the QA account and record the JSON-RPC methods the host sent, or cite a Claude Code or Codex release note shipping prompt-argument completion. If a host sends `completion/complete`, run `/pm unblock w23/m35` and start at t002. Who can clear it: the owner (approving the billed agent run), or any worker given release-note evidence.

**Re-checked 2026-11-12** (after the w23 inbox was drained) — still blocked, condition unchanged. A search of the Claude Code and Codex release notes and write-ups finds no entry shipping `completion/complete` support for prompt or resource-template arguments. The one lead, Claude Code issue `anthropics/claude-code#41860` (send `completion/complete` for resource template parameters in the `@` mention UI), was closed by the stale bot as "not planned" on 2026-05-22, shipped nothing, and never mentions prompts; the "resolved" in a search summary was the bot's lock wording. Unblock and owner unchanged: an observed host call, from a billed `yarn mcp:agent-eval` run (owner approval) or a Claude Code or Codex release note citing prompt-argument completion; then `/pm unblock w23/m35` and start at t002. Who: the owner, for the billed run.
