# w21 · m8 — `bea mcp`: local read-only stdio MCP server

**Worker:** worker1 **Goal:** coding agents can query a local ledger over MCP without an account **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Design the local MCP tool surface | 45m | — |
| t002 | Implement the stdio transport | 90m | t001 |
| t003 | Implement the read-only tools with bounds and error shapes | 60m | t002 |
| t004 | Integration test with a real MCP client over stdio | 50m | t003 |
| t005 | Document Claude Code and Codex setup | 30m | t004 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t008, t007 |

## Definition of done

`bea mcp --file ledger.bean` connects from Claude Code and Codex via the documented config; its read-only tools match the equivalent `bea ... --json` output; a test proves no tool changes the ledger bytes.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w21` 2026-11-05, candidate 3
- **Goal linkage:** **A1 — Agent-native accounting**: local-ledger users get an MCP entry point.
- **Expected outcome:** Installs and agent-directory references rise; local users stop writing BQL glue.
- **Why now:** The hosted MCP exists but local-only users have nothing; agent adoption is the board's top signal.
- **Risk:** A new dependency requires owner approval; t001 prefers a minimal stdio implementation.
- **Parity:** Local CLI entry point, outside the customer-API parity gate; stated in t001.
- **Adoption surface:** included — a new agent-facing command
