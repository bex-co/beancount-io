# w3 · m65 — Add a read-only review reference to `beancount-report-pack`

**Worker:** worker3 **Goal:** an agent reviews an existing report pack and returns cell-level tie-outs, exceptions, and disclosed checks without changing the artifact **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Write the review reference | 60m | — |
| t002 | Build a report pack with seeded errors | 45m | — |
| t003 | Add evals for the review | 45m | t001, t002 |
| t004 | Document the review in the guide | 20m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

On the seeded fixture the review reports every seeded error with its address, discloses skipped checks, leaves the pack's hash unchanged, and never calls itself an audit; `python3 scripts/skills/ci-check.py` passes.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w1` 2026-11-14 (revised after the user excluded `SELF_HOST` work), item 3; the user routed it to w3. [ADR020](../../../docs/adrs/ADR020-skills-accounting-workflow-candidates.md) (Proposed) P2 `beancount-report-review`, "Implementation status" and "Proposed decision" sections.
- **Goal linkage:** **A1 — Agent-native accounting**: an agent can check a report pack before a person relies on it.
- **Expected outcome:** Users of `beancount-report-pack` ask their agent to review a pack and get addressed, reproducible findings; report-pack invocations that include a review appear.
- **Why now:** `beancount-report-pack` (w21/m9) and `beancount-business-metrics` (w21/m10) have shipped, and ADR020 can close only once the owner schedules or removes this candidate; this materializes it.
- **Adoption surface:** included — the skill catalog in `skills/AGENTS.md`, `skills/README.md`, the `docs/skills/` guide, and the same trigger on Claude Code and Codex
