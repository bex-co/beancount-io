# w23 · m12 — Refuse unknown keys on every REST GET query

**Worker:** worker1 **Goal:** every REST GET query schema refuses undeclared keys with 400 instead of silently dropping the filter **Status:** todo (t001–t004 done)

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Audit and map every REST GET query schema ✅ | 30m | — |
| t002 | Strictify ledger GET query schemas ✅ | 45m | t001 |
| t003 | Strictify non-ledger GET query schemas ✅ | 30m | t001 |
| t004 | Per-route regression tests ✅ | 45m | t002, t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- Every REST GET query schema is strict except the documented exceptions (`accounts` status leniency, `feature-flags` freeform `userId`, `bank-accounts` pass-through with no schema); an undeclared key answers 400 `VALIDATION_FAILED` naming the key.
- MCP and GraphQL behavior is unchanged (already strict); shared schemas parsed by MCP resource readers destructure path vars out first (w23/112 hazard).
- A regression test per strictified route asserts 400 on an undeclared key; OpenAPI regen with no uncommitted drift; package gates green.

## Source + Goal linkage

- **Source:** promoted from `w23/113` (inbox note): QA sweep 2026-10-26 found 32 lenient REST GET query schemas (23 ledger + 2 bank + 7 non-ledger) against 5 already strict; only REST drops the key while MCP refuses and GraphQL rejects by construction.
- **Goal linkage:** A1 (agent-native accounting) — an agent pasting `account_name` for `account` gets a silently unfiltered page today; strictness turns it into a fixable, named error.
- **Expected outcome:** any REST GET with a misspelled query key fails loudly naming the key, on every route; no dashboard, mobile, or CLI caller depends on the leniency.
- **Why now:** w23/112 proved the one-word fix plus the shared-schema reader hazard on the bank pair; the sweep is fresh and the pattern is mechanical — doing it now keeps the strictness coherent across all 32 routes at once.
- **Adoption surface:** included — the milestone changes REST refusal behavior that dashboard, mobile, and CLI callers may depend on.
