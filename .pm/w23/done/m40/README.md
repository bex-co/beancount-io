# w23 · m40 — Run what the served text tells an agent to run

**Worker:** worker1 **Goal:** The BQL statements, column lists and identifier handoffs that prompts, tool descriptions and hints tell an agent to use are executed in CI against fixtures, and the ones that fail are fixed. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Extract the executable claims from served text — **DONE** | 40m | — |
| t002 | Run each statement on the engine over a fixture — **DONE** | 50m | t001 |
| t003 | Fix spending-report and the false description claims (w1/230, w1/226) — **DONE** | 40m | t002 |
| t004 | Write the identifier handoff matrix — **DONE** | 50m | — |
| t005 | Make the bank tools accept the field the list returns (w1/224) — **DONE** | 45m | t004 |
| t006 | Update docs and hints for the corrected text — **DONE** | 15m | t003, t005 |
| t007 | Adoption surface — **DONE** | 20m | t006 |
| t008 | Simplify — **DONE** | 20m | t007 |
| t009 | Test coverage — **DONE** | 30m | t007 |
| t010 | Closeout — **DONE** | 15m | t009 |

## Definition of done

A test extracts the BQL statements from `prompts/get` bodies and the column and function lists from tool descriptions and runs them on the engine over a fixture ledger; a handoff test feeds each field a list read returns into the tool the text sends the agent to; the `spending-report` total is one currency on an `@`-priced fixture; `runBqlQuery` no longer lists a column that does not exist; breaking any of them turns CI red; `yarn test` and `yarn typecheck` pass in backend-v2.

## Source + Goal linkage

- **Source:** `w1/224`, `w1/226`, `w1/230`; `/pm-brainstorm more for w23` 2026-11-10, proposal 3. Complements `w23/done/m33` (names resolve) and `w5/blocked/m5` (prompt playbooks).
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** An agent that follows a served playbook or a tool description gets a working call and a correct number, not a failed call or a two-currency total.
- **Why now:** `w23/m33` checks that names exist; it does not run the statement or follow the field. QA keeps finding text that is well-named and wrong: `cost(position)` in the spending prompt, a `change` column that does not exist, and bank tools whose text says `itemId` while the lookup takes the row `id`.
- **Adoption surface:** included: prompts and tool descriptions are the agent-facing surface, including the LobeHub copy of the descriptions.
