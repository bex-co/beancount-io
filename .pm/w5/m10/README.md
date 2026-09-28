# w5 · m10 — Migrate an export and continue importing without duplicate transfers

**Worker:** worker1 **Goal:** a newcomer migrates synthetic export history through installed skills and continues importing without duplicating either side of an internal transfer **Status:** in progress (t001 done)

**Estimate:** 4h implementation; 6h including standing closing tasks (9 tasks). Priority 2 after inbox 019, with no hard dependency on it.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Package the migration and overlapping-import fixtures — **DONE** | 45m | — |
| t002 | Add read-only migration checkpoints | 60m | w5/m10/t001 |
| t003 | Write the installed-suite migration walkthrough | 45m | w5/m10/t001 |
| t004 | Rehearse the migration journey through Claude Code | 45m | w5/m10/t002, w5/m10/t003 |
| t005 | Rehearse through Codex and publish comparable results | 45m | w5/m10/t004 |
| t006 | Adoption surface | 30m | w5/m10/t005 |
| t007 | Simplify | 30m | w5/m10/t006 |
| t008 | Test coverage | 45m | w5/m10/t006, w5/m10/t007 |
| t009 | Closeout | 15m | w5/m10/t007, w5/m10/t008 |

## Definition of done

- A newcomer can follow a self-contained guide with the installed customer suite and one bea installation through Monarch export migration and ongoing import.
- Every source row has an explicit disposition. Paired transfers represent two source rows in one transaction, retain both source identities, and account balances agree with independently stated anchors.
- Overlap-only imports from either transfer account leave the ledger unchanged; an export with genuinely new activity adds only that activity, exactly once.
- A conflicting independently stated balance remains visibly unresolved, without a fabricated adjustment or false success claim. Derived opening balances are labelled as consistency checks rather than independent evidence of complete history.
- Mapping approval precedes conversion. Declining conversion preserves the pre-conversion workspace. Read-only checkpoint verification preserves ledger and Git state.
- Claude Code and Codex each have real-session evidence for the main journey, both transfer-side overlaps, declined conversion, and conflicting balances. Records identify source/runtime versions, completion time, corrective interventions, checkpoint results, and limitations. Unavailable or failing runs cannot satisfy closeout.
- Required skills structural and behavioral checks and agent-guidance checks pass. Deterministic tests remain independent of paid agent access, and the guide is discoverable from customer entry points.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w5`, both proposals approved with `$pm for both to w5` on 2026-09-28. Builds on [w2/m3's shipped migration skill](../../w2/done/m3/README.md), [w5/m9's installed first-month journey](../done/m9/README.md), and the [existing migration skill and evals](../../../skills/.claude/skills/beancount-migrate/SKILL.md).
- **Goal linkage:** **A2 — Frictionless onboarding** (primary) and **A1 — Agent-native accounting**. People bringing existing financial history can establish a trustworthy ledger and continue maintaining it through either installed agent.
- **Expected outcome:** demonstrated migration-to-first-repeat-import completion with exact duplicate counts, elapsed time, and corrective intervention counts. These are rehearsal signals, not production adoption statistics or proof of general model reliability.
- **Why now:** installation and the first-month journey are complete. Historical dates, two-sided transfer identities, and independently anchored balances add onboarding risks not exercised by that journey. w5 has capacity while its existing external blockers remain independent.
- **Adoption surface:** included because the guide, checkpoints, and any repaired skill instructions are customer- and agent-facing.

## Boundaries and dependencies

- Implementation belongs in `skills/`; root discovery pointers may change during Adoption surface. Use `skills/tmp/` for run-owned workspaces and raw logs. Publish synthetic summaries only.
- Reuse the existing Monarch fixture, migration/import skills, source identity convention, and appropriate first-month verification helpers. This milestone verifies and explains existing capabilities; it does not presume a migration defect or rebuild the migration skill.
- Use supported bea commands rather than cross-package imports. Scope any demonstrated CLI defect as a separate repair; never edit ledger results or weaken checkpoints to conceal it.
- Mint/QBO walkthrough expansion, populated-ledger merges, investment lot reconstruction, new dependencies, and a general benchmark framework are out of scope.
- No dependency on inbox 019, blocked m5, or blocked 015. Both real agents must be available for rehearsal closeout; if access is unavailable, record the exact unblock condition rather than declaring success.
- No hosted ledger export, bank connection, deployment, or additional MCP test stack is needed.
