# w23 · m10 — Unify the account-journal param spellings

**Worker:** worker1 **Goal:** agents pass `filterAccount`/`filter_account` and `withChildren`/`with_children` in either spelling on MCP, REST, and GraphQL without memorizing which surface takes which **Status:** todo (t001–t003 done)

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Map the param splits, decide canonical spellings ✅ | 30m | — |
| t002 | filterAccount alias end to end ✅ | 45m | t001 |
| t003 | withChildren alias end to end ✅ | 45m | t002 |
| t004 | Document the param spellings | 30m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- Both spellings of each account-journal param are accepted everywhere the param exists: `filter_account`/`filterAccount` and `with_children`/`withChildren` on the MCP resource, the REST query, and the GraphQL input; two different values in one call refuse rather than guess.
- No existing caller breaks: aliases only, no renames; the canonical spelling per surface is documented in `docs/mcp.md`.
- Parity tests prove both spellings and the conflict refusal on REST, GraphQL, and MCP; OpenAPI regen with no drift; package gates green.

## Source + Goal linkage

- **Source:** promoted from `w23/098` (inbox note): production audit 2026-10-26 shows `filter_account`/`with_children` snake on the MCP resource and REST query while GraphQL's `AccountJournalQueryInput` is already mixed (`filterAccount` camel beside `with_children` snake) — the only snake params in 60 resource templates.
- **Goal linkage:** A1 (agent-native accounting) — agents filter journals by counterparty account; the strict params refuse the documented camel convention.
- **Expected outcome:** an agent passes either spelling of either param on any surface and is refused only when it sends two different values; `docs/mcp.md` names the canonical spelling per surface.
- **Why now:** w23/m3 (done) established the alias pattern on entry spellings, w23/m8 (done) extended it to bank ids, and w23/m9 (done) closed the universal flags; this milestone closes the same naming family for the two journal params, sequenced right after so the pattern and parity tests stay coherent.
- **Adoption surface:** included — the milestone ships agent-facing argument names that must hold on every surface.
