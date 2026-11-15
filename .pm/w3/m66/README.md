# w3 · m66 — `beancount-investor-update`: a recurring factual update from reviewed books

**Worker:** worker3 **Goal:** a founder turns a reviewed report pack and separately sourced operating metrics into an investor update whose numbers agree everywhere **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Write the skill | 60m | w3/m65/t008 |
| t002 | Check every repeated number agrees | 45m | t001 |
| t003 | Add fixtures and evals | 60m | t002 |
| t004 | Register the skill in the suite | 30m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

The skill passes skills CI and the installer tests; its evals show a consistent update produced from the fixture, a conflicting figure refused with both locations, an unsupported ARR request refused, and a missing figure left missing.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w1` 2026-11-14 (revised after the user excluded `SELF_HOST` work), item 4; the user routed it to w3. [ADR020](../../../docs/adrs/ADR020-skills-accounting-workflow-candidates.md) (Proposed) P3 `beancount-investor-update`.
- **Goal linkage:** **A1 — Agent-native accounting**, and A3: the suite covers a recurring business deliverable end to end.
- **Expected outcome:** Founders keeping books in Beancount get investor updates whose numbers agree with their reviewed pack; new skill invocations appear.
- **Why now:** It builds on m65's reviewed pack, so it is sequenced after m65. Shipping it leaves no unscheduled ADR020 candidate.
- **Adoption surface:** included — the new skill in every suite inventory, the installer, the root `AGENTS.md` skills row, its `docs/skills/` guide, and the same trigger on Claude Code and Codex
