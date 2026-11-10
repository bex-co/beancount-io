# w23 · m37 — Turn the numeric claims in docs/mcp.md into executable checks

**Worker:** worker1 **Goal:** Every default, limit, error code and capability flag that `docs/mcp.md` states is compared to the served contract, and the known contradictions are corrected. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Extract the numeric claims into a claims table | 50m | — |
| t002 | Test the claims against the served contract | 60m | t001 |
| t003 | Correct the contradictions (w1/200, w1/203) | 40m | t002 |
| t004 | Stop advertising listChanged on the stateless endpoint (w1/196) | 20m | t002 |
| t005 | Adoption surface | 20m | t003, t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

A test extracts the declared defaults, limits, error codes and capability flags from a checked-in claims table and compares each to `initialize`, `tools/list` and the runtime constants; changing a documented default by one makes it fail; the eight contradictions in `w1/200`, the `>N` wording of `w1/203` and the `listChanged` claim of `w1/196` are resolved; `yarn test` passes in backend-v2.

## Source + Goal linkage

- **Source:** `w1/200`, `w1/203`, `w1/196`; `/pm-brainstorm for w23` 2026-11-10, proposal 5. Complements `w23/done/m33` (names resolve) by pinning values.
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** Developers who write a client from the documentation get the behavior the documentation states.
- **Why now:** m33 pinned names, but doc replays still find stale values; a values gate stops the drift at the source.
- **Adoption surface:** included: agents and integrators touch this surface directly.
