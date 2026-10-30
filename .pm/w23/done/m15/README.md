# w23 · m15 — Gate file writes on new bean-check errors

**Worker:** worker1 **Goal:** file writes refuse new bean-check errors like entry writes, with an explicit override **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Shared new-error gate + MCP file tools (allow_invalid, dry_run refusal) — **DONE** | 60m | — |
| t002 | REST PUT/DELETE file gate (allowInvalid) — **DONE** | 45m | t001 |
| t003 | Flip the docs: file writes now refuse new errors — **DONE** | 30m | t002 |
| t004 | Adoption surface — **DONE** | 20m | t003 |
| t005 | Simplify — **DONE** | 30m | t004 |
| t006 | Test coverage — **DONE** | 45m | t004 |
| t007 | Closeout — **DONE** | 15m | t005, t006 |

## Definition of done

- `updateLedgerFiles`-family MCP tools, the in-product edit tool and REST `PUT`/`DELETE …/files/{path}` refuse a write that adds bean-check errors (VALIDATION_FAILED naming each), and `dry_run`/`dryRun` refuses the same write; `allow_invalid`/`allowInvalid` commits deliberately and still reports the errors.
- Pre-existing errors never block; GraphQL has no file-write path (N/A).
- Docs, OpenAPI snapshot, CLI client and tools/list budget are consistent; package gates green.

## Source + Goal linkage

- **Source:** promoted from `w23/149` (2026-10-30, owner chose the entry-style gate).
- **Goal linkage:** A1 (agent-native accounting) — one agent typo no longer corrupts a ledger behind `ok:true`.
- **Expected outcome:** an agent that writes a file gets the same safety net as when it writes entries.
- **Why now:** major severity silent-corruption note with the owner's decision recorded. Adoption surface included — agent-facing write behavior changes.
