# w21 · m7 — `bea report budget`: budget versus actual

**Worker:** worker1 **Goal:** a native, offline budget variance report that never treats a missing budget as zero **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Establish the budget directive contract | 40m | — |
| t002 | Engine read: budget, actual, variance per period | 60m | t001 |
| t003 | `bea report budget` with text, `--json`, `--time`, `--interval` | 45m | t002 |
| t004 | Fixture tests: missing budget, overspend, multi-currency, carry-over | 45m | t003 |
| t005 | Point the variance recipes at the new report | 30m | t004 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t008, t007 |

## Definition of done

`bea report budget` prints budget, actual and variance per account and period with `--json`; a missing budget is shown as absent; tests assert hand-computed variances; the variance recipes cite the command.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w21` 2026-11-05, candidate 2; ADR020 variance rule
- **Goal linkage:** **A1 — Agent-native accounting** (agents get a stable JSON budget view instead of hand-written BQL) and **A2**.
- **Expected outcome:** Personal-finance adopters and agents get budget variance offline; skill invocations for variance questions cite it.
- **Why now:** The CLI is the only entry without a budget view and ADR020 already fixes the missing-is-not-zero rule.
- **Risk:** t001 may find no reusable convention; then the milestone blocks for an owner decision.
- **Parity:** CLI-native only.
- **Adoption surface:** included — new command and skill references
