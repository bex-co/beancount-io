# w23 · m8 — Unify bank-tool parameter naming

**Worker:** worker1 **Goal:** agents drive bank sync/import without retry loops: every MCP bank tool accepts the camelCase id spelling REST/GraphQL use **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Reproduce + map the bank naming splits ✅ | 30m | — |
| t002 | MCP top-level id aliases end to end ✅ | 60m | t001 |
| t003 | MCP nested bank aliases end to end ✅ | 45m | t002 |
| t004 | Document bank naming | 30m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- Every MCP bank tool accepts the camelCase id spelling REST and GraphQL use (`itemId`, `accountId`, `transactionIds`), aliasing its snake_case spelling; two different ids in one call refuse rather than guess.
- The nested bank spellings alias too: the submit-item `transaction_id`/`target_account`/`source_account` triple and `map_account.ledger_account`, each with the same conflict refusal. (`transactions` vs `transactionIds` deliberately do NOT converge: full booking items vs bare id lists — t001.)
- Parity tests prove both spellings and the conflict refusal on all three surfaces; bank docs name the aliases; OpenAPI regen with no drift; package gates green.

## Source + Goal linkage

- **Source:** promoted from `w23/096` (inbox note): production audit 2026-10-26 shows MCP bank tools split snake_case (`item_id`, `account_id`, `transaction_ids`) against one camelCase outlier (`listStagedBankTransactions.accountId`), with no aliases either way, plus a `transactions` vs `transaction_ids` name split for the same batch concept on all three surfaces.
- **Goal linkage:** A1 (agent-native accounting) — agents drive bank sync/import; one tool spelling `accountId` where its siblings spell `account_id` is a guaranteed retry loop.
- **Expected outcome:** an agent pastes bank ids in either spelling into any bank tool on any surface and is refused only when it sends two different ids; import and discard take the same batch argument name.
- **Why now:** w23/m3 (done) established the alias pattern on entry tools; this milestone is the bank remainder, sequenced right after so the pattern and parity tests stay coherent. The note's cross-surface correction (REST/GraphQL are camelCase-only, so aliases point toward camelCase) sets the direction t001 verifies.
- **Adoption surface:** included — the milestone ships agent-facing argument names that must hold on every surface.
