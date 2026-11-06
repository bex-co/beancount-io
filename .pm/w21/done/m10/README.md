# w21 · m10 — `beancount-business-metrics`: cash, burn and runway

**Worker:** worker1 **Goal:** agents answer burn and runway questions from classified cash movements and refuse unsupported metrics **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Write the metrics contract — **DONE** | 40m | — |
| t002 | Query recipes over cash-flow JSON — **DONE** | 50m | t001 |
| t003 | Runway with honest refusals — **DONE** | 45m | t002 |
| t004 | SKILL.md, evals and fixture with transfers and financing — **DONE** | 60m | t003 |
| t005 | Adoption surface — **DONE** | 20m | t004 |
| t006 | Simplify — **DONE** | 20m | t005 |
| t007 | Test coverage — **DONE** | 30m | t005 |
| t008 | Closeout — **DONE** | 15m | t007, t006 |

## Definition of done

On the fixture, burn excludes financing and internal transfers and equals the hand-computed value; asking for ARR, CAC, LTV or retention without a dataset is refused; the skills CI passes.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w21` 2026-11-05, candidate 5; ADR020 section 2 (P2)
- **Goal linkage:** **A1 — Agent-native accounting**: a new customer skill.
- **Expected outcome:** Early-stage teams get a trustworthy burn view; skill invocations rise.
- **Why now:** w21/m4 just shipped `report cash-flow`, the data source.
- **Adoption surface:** included — a new customer skill
