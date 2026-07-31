# w2 · m2 — beancount-importer-author: agent writes/repairs beangulp importers

**Worker:** worker2 **Goal:** from a sample file of an unsupported bank, an agent produces a working beangulp importer that passes its own test harness — and repairs an existing importer when the bank's format drifts **Status:** todo

## Tasks (in order)

| id   | title                                                       | est | depends_on |
| ---- | ----------------------------------------------------------- | --- | ---------- |
| t001 | SKILL.md skeleton: triggers/skip, relationship to import UX | 30m | —          |
| t002 | Distilled beangulp v3 reference (API + test harness)        | 1h  | t001       |
| t003 | Authoring workflow: sample-driven draft → test → iterate    | 1h  | t002       |
| t004 | Evals: fixture bank files + expected extractions            | 1h  | t003       |
| t005 | Adoption surface — skill discoverable on every surface      | 30m | t004       |
| t006 | Simplify                                                    | 20m | t005       |
| t007 | Test coverage — failure-mode evals                          | 45m | t005       |
| t008 | Closeout                                                    | 15m | t007       |

## Definition of done

Given a sample CSV/OFX file from a bank with no existing importer, the skill produces a beangulp importer whose extraction passes the beangulp test harness on that fixture; given a fixture importer plus a drifted sample file, the skill repairs it back to green. Evals pass; the skill never guesses column semantics it cannot verify against the sample.

## Source + Goal linkage

- **Source:** /pm-brainstorm 2026-07-31 — July 2026 skills-market research: importer authoring/maintenance is the #1 documented pain in every importer framework's own README (beancount_reds_importers calls importers "ugly and painful to write"); "agent writes the importer" is validated by community anecdote but productized by no one.
- **Goal linkage:** A1 — the agent maintains the ledger's ingestion machinery itself, extending upstream beangulp rather than replacing it (DO_NOT_DO-clean: wraps the official v3 framework).
- **Expected outcome:** a beancount user with an unsupported bank gets a tested importer from one sample file; observable via skill invocations and inbound importer-related contributions.
- **Why now:** deepest moat in the suite — genuinely hard to copy as a markdown-tips skill because it hinges on the test-harness loop; conventions (config block, discovery) are reusable from `beancount-options` today without waiting on other milestones. Adoption surface included: ships a new agent-facing skill.
