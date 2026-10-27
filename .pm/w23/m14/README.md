# w23 · m14 — Render NULL cells honestly in BQL results

**Worker:** worker1 **Goal:** NULL cells render as null with their natural dtype on every surface; strict-vs-lenient NULL builtins triaged **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Reproduce + map the NULL rendering gaps | 30m | — |
| t002 | Null-cell rendering end to end | 60m | t001 |
| t003 | Dtype propagation for null/empty columns | 45m | t002 |
| t004 | Strict-camp verdicts, adapt or upstream-file | 45m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- NULL cells render as null (not `""`) with the expression's natural dtype on REST, GraphQL, MCP text + structured, and dashboard tables; empty-set non-`count` aggregates read NULL with a numeric dtype.
- The one-row-vs-zero-row empty-aggregate split stays with `w23/blocked/022`; this milestone owns cell content only.
- Every strict-camp builtin (`substr`/`subst`/`date`/`weekday`) is adapted or upstream-filed with its rationale recorded; no strict/lenient inconsistency left untriaged.
- Package gates green in every touched package.

## Source + Goal linkage

- **Source:** promoted from `w23/122` (inbox note): production probes 2026-10-26 show every non-`count` aggregate over an empty filter returning a `str`-typed `""`, every NULL cast mistyped `str`, and a strict/lenient split across NULL builtins no single rule predicts. Root causes in our shell: `toShellCell` coerces null to `""` (`ledger-shell-mappers.ts`) and the dtype classifier falls back to `str` for all-null columns.
- **Goal linkage:** A1 (agent-native accounting) — agents summing filtered postings get `""`/`str` instead of NULL/numeric, breaking numeric downstream code; honest nulls keep agent pipelines typed.
- **Expected outcome:** an agent can filter, aggregate, and group without defending against empty strings where NULLs belong, on every surface.
- **Why now:** w23/122's six probe iterations map the whole defect space at once (value, dtype, strictness); fixing the value without the dtype (or vice versa) would leave half the probes red. Adoption surface included — the milestone ships agent-facing query rendering.
