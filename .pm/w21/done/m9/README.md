# w21 · m9 — `beancount-report-pack`: a reconciled Markdown/CSV report pack

**Worker:** worker1 **Goal:** an agent produces a statement pack whose figures tie to a fixed ledger snapshot **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Write the report-pack skill contract — **DONE** | 40m | w21/m6 |
| t002 | Generation script: statements, schedules and evidence index — **DONE** | 75m | t001 |
| t003 | Tie-out checks that fail loudly — **DONE** | 60m | t002 |
| t004 | SKILL.md, evals and fixture ledger — **DONE** | 50m | t003 |
| t005 | Installer and CI checks include the new skill — **DONE** | 30m | t004 |
| t006 | Adoption surface — **DONE** | 20m | t005 |
| t007 | Simplify — **DONE** | 20m | t006 |
| t008 | Test coverage — **DONE** | 30m | t006 |
| t009 | Closeout — **DONE** | 15m | t008, t007 |

## Definition of done

The skill generates CSV and Markdown statements plus an evidence index on the example ledger; every tie-out passes there and fails on the broken fixture; the skills CI passes.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w21` 2026-11-05, candidate 4; ADR020 section 2 (P2)
- **Goal linkage:** **A1 — Agent-native accounting**: a new customer skill.
- **Expected outcome:** Small-business owners and their agents hand over verifiable statements; skill invocations and installs rise.
- **Why now:** The reports exist and m6 provides CSV; ADR020 orders this first among portable-reporting skills.
- **Dependency:** w21/m6
- **Adoption surface:** included — a new customer skill
