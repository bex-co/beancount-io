# w23 · m23 — Stress every parameter with hostile values, not just NUL

**Worker:** worker1 **Goal:** No parameter value shape produces a 5xx or a hang; each is refused with a `BAD_USER_INPUT` that names the parameter. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Extend the schema-derived scan with hostile values — **DONE** | 45m | — |
| t002 | Bound depth, array length and string length at the central guards — **DONE** | 45m | t001 |
| t003 | Run the same cases against REST and GraphQL — **DONE** | 30m | t002 |
| t004 | Document the limits — **DONE** | 20m | t003 |
| t005 | Adoption surface — **DONE** | 20m | t004 |
| t006 | Simplify — **DONE** | 20m | t005 |
| t007 | Test coverage — **DONE** | 30m | t005 |
| t008 | Closeout — **DONE** | 15m | t007 |

## Definition of done

- A test derives every input leaf from `MCP_TOOLS` and sends lone surrogates, oversize strings, deep nesting and huge arrays; none answers 5xx or hangs, each answers `BAD_USER_INPUT` naming the parameter.
- The same cases pass on the REST routes and GraphQL operations.
- The limits live in one module and the MCP guide states the same numbers.
- A new parameter is covered without editing the test.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-07), owner-approved: "them all for w23 and then /loopx w23", proposal 1. Extends [m22](../done/m22/README.md) beyond NUL; follows [w23/209](../done/209.md).
- **Goal linkage:** A1 — Agent-native accounting. A 5xx for a malformed value reads as an outage and sends an agent into retry loops.
- **Expected outcome:** Hostile-value findings stop appearing in MCP QA; new tools inherit the guarantee.
- **Why now:** The NUL guard, exempt list and scanner just landed; this is their cheapest extension.
