# w2 · m27 — MCP discoverability: the server explains itself to agents

**Worker:** worker2 **Goal:** an agent connecting with any MCP client learns from `initialize` which ledger it holds and how to work, can tell read tools from destructive ones, finds its ledgers, the ledger's validity, and its vocabulary in one call each, sees concrete resources in clients that enumerate them, and pays under half today's tokens for the tool list **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Per-request server instructions in initialize | 45m | — — **DONE** |
| t002 | Tool annotations on every descriptor, enforced by a guard test | 45m | — — **DONE** |
| t003 | Hero read tools: listLedgers, checkLedger, getLedgerContext, getEntryContext | 3h | t001 — **DONE** |
| t004 | Concrete resources/list for the selected ledger | 60m | t003 — **DONE** |
| t005 | Lean, use-ordered tool list | 90m | t002 — **DONE** |
| t006 | Adoption surface | 30m | t004, t005 — **DONE** |
| t007 | Simplify | 30m | t006 — **DONE** |
| t008 | Test coverage | 60m | t006 — **DONE** |
| t009 | Closeout | 15m | t008 — **DONE** |

## Closeout notes (t009)

- DoD deviations (both user-approved mid-milestone, recorded in code/ADR): `tools/list` gates at ~60 KB, not 25 KB (output schemas alone are ~29 KB and ADR 0008 D8 requires them; floor with all outputs deleted is still ~33 KB); surface-parity `DEFERRED mcp` moves 0 → 4 for the four compat-only removals (REST twins kept).
- Verified without a live redeploy (running stack serves the pre-m27 image; no spare credential): full unit suite 269 suites / 4258 tests green, plus real-socket conformance (15 checks incl. new check 9), resources/list, and tools/list suites. Recommend re-running the audit's three agent prompts after deploy.

## Definition of done

Against a local docker-mac stack with Claude Code (`claude -p --strict-mcp-config`): `initialize` returns credential-specific `instructions`; every tool publishes annotations and a guard test enforces them; `listLedgers`, `checkLedger`, `getLedgerContext`, and `getEntryContext` exist as read tools and ADR 0008 records the exception; `resources/list` returns concrete entries for the credential's ledger and `ListMcpResourcesTool` shows them; `tools/list` is under 25 KB and starts with reads; the legacy entry tool and legacy resources are MCP-exempt with REST twins. Re-running the audit's three agent prompts uses no `listApiKeys` for ledger discovery and no raw-file audit for validation.

## Source + Goal linkage

- **Source:** MCP field audit 2026-09-08 (this checkout `main@60dbd7fd`, run against a local docker-mac stack with four `bcio_` keys, ~220 tool/resource calls, and three Claude Code `-p` agent sessions). All three agent sessions reported "no list-ledgers tool", "no errors/validation tool", and "resources returned empty"; `tools/list` measured 47,639 bytes with `runBqlQuery` in position 15.
- **Goal linkage:** A1 (agent-native accounting) — discoverability is the difference between an agent that uses the ledger's vocabulary and one that re-derives it from raw files every session.
- **Expected outcome:** the audit's baseline of 11 / 21 / 15 turns for three ordinary tasks drops, with the discovery turns (which ledger, is it valid, what accounts exist) gone; Claude Code and Codex users see annotated tools and real resources.
- **Why now:** m26 supplies the validation envelope `checkLedger` and the instructions refer to; the resource-invisibility finding contradicts ADR 0008's premise for the most common client and should be corrected before more reads are added as resources. Adoption surface task included because the milestone changes the documented tool and resource inventory.
