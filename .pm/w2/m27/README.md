# w2 · m27 — MCP discoverability: the server explains itself to agents

**Worker:** worker2 **Goal:** an agent connecting with any MCP client learns from `initialize` which ledger it holds and how to work, can tell read tools from destructive ones, finds its ledgers, the ledger's validity, and its vocabulary in one call each, sees concrete resources in clients that enumerate them, and pays under half today's tokens for the tool list **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Per-request server instructions in initialize | 45m | — |
| t002 | Tool annotations on every descriptor, enforced by a guard test | 45m | — |
| t003 | Hero read tools: listLedgers, checkLedger, getLedgerContext, getEntryContext | 3h | t001 |
| t004 | Concrete resources/list for the selected ledger | 60m | t003 |
| t005 | Lean, use-ordered tool list | 90m | t002 |
| t006 | Adoption surface | 30m | t004, t005 |
| t007 | Simplify | 30m | t006 |
| t008 | Test coverage | 60m | t006 |
| t009 | Closeout | 15m | t008 |

## Definition of done

Against a local docker-mac stack with Claude Code (`claude -p --strict-mcp-config`): `initialize` returns credential-specific `instructions`; every tool publishes annotations and a guard test enforces them; `listLedgers`, `checkLedger`, `getLedgerContext`, and `getEntryContext` exist as read tools and ADR 0008 records the exception; `resources/list` returns concrete entries for the credential's ledger and `ListMcpResourcesTool` shows them; `tools/list` is under 25 KB and starts with reads; the legacy entry tool and legacy resources are MCP-exempt with REST twins. Re-running the audit's three agent prompts uses no `listApiKeys` for ledger discovery and no raw-file audit for validation.

## Source + Goal linkage

- **Source:** MCP field audit 2026-09-08 (this checkout `main@60dbd7fd`, run against a local docker-mac stack with four `bcio_` keys, ~220 tool/resource calls, and three Claude Code `-p` agent sessions). All three agent sessions reported "no list-ledgers tool", "no errors/validation tool", and "resources returned empty"; `tools/list` measured 47,639 bytes with `runBqlQuery` in position 15.
- **Goal linkage:** A1 (agent-native accounting) — discoverability is the difference between an agent that uses the ledger's vocabulary and one that re-derives it from raw files every session.
- **Expected outcome:** the audit's baseline of 11 / 21 / 15 turns for three ordinary tasks drops, with the discovery turns (which ledger, is it valid, what accounts exist) gone; Claude Code and Codex users see annotated tools and real resources.
- **Why now:** m26 supplies the validation envelope `checkLedger` and the instructions refer to; the resource-invisibility finding contradicts ADR 0008's premise for the most common client and should be corrected before more reads are added as resources. Adoption surface task included because the milestone changes the documented tool and resource inventory.
