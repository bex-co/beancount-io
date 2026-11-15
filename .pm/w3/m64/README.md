# w3 · m64 — Give the local `bea mcp` server resources and read-only prompts

**Worker:** worker3 **Goal:** agents on a local ledger read context cheaply and start multi-step reviews from served prompts, without the server gaining any write path **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Design the local resources and prompts | 40m | — |
| t002 | Serve resources over stdio | 60m | t001 |
| t003 | Serve read-only prompts over stdio | 60m | t001 |
| t004 | Prove it with a real client and document it | 40m | t002, t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

`initialize` advertises `resources` and `prompts`; each resource's content equals its `bea --json` command's output; each prompt returns with arguments substituted and rejects missing ones; no prompt directs a write through MCP; a test proves the ledger file's bytes are unchanged after every call; `cli/docs/MCP.md` documents the new surface.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w1` 2026-11-14 (revised after the user excluded `SELF_HOST` work), item 2; the user routed it to w3. Ground truth: `cli/docs/MCP.md` ("advertises tools only (no resources or prompts)"); the hosted resources and playbooks in `backend-cluster/backend-v2/docs/mcp.md`.
- **Goal linkage:** **A1 — Agent-native accounting**: local-ledger agents get the same cheap context reads and guided reviews hosted users already have.
- **Expected outcome:** Agents on a local ledger read accounts and errors without a tool call and start a month-end or spending review from a served prompt; local MCP sessions need fewer calls per task.
- **Why now:** It stays inside `bea mcp`'s documented no-write contract, so it needs no owner decision, and it makes the m63 Registry listing more useful.
- **Adoption surface:** included — `cli/docs/MCP.md`, the `bea mcp` connection snippets for Claude Code and Codex, and the CLI README
