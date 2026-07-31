# w2 · m6 — beancount-import: bank CSV/OFX to verified, deduplicated entries

**Worker:** worker2 **Goal:** an agent turns a bank/card CSV or OFX export into categorized, deduplicated, `bean-check`-clean ledger entries through a staged, confirm-gated pipeline — idempotent on re-import via an `import-id` metadata convention **Status:** done

## Tasks (in order)

| id   | title                                                            | est  | depends_on |
| ---- | ---------------------------------------------------------------- | ---- | ---------- |
| t001 | SKILL.md skeleton: seven-stage pipeline, triggers/skip, config block — **DONE** | 45m  | —          |
| t002 | Normalize references: CSV/OFX/QIF, column mapping, data sources — **DONE** | 1h   | t001       |
| t003 | Dedup + `import-id` metadata convention reference — **DONE** | 1h   | t001       |
| t004 | Categorization from ledger history: constrained few-shot rules — **DONE** | 45m  | t002       |
| t005 | Confirm + Write + Verify: review table, flags, bean-check gate — **DONE** | 45m  | t003, t004 |
| t006 | Evals: fixture exports incl. overlapping re-import — **DONE** | 1h   | t005       |
| t007 | Adoption surface — skill discoverable on every surface — **DONE** | 30m  | t006       |
| t008 | Simplify — **DONE** | 20m  | t007       |
| t009 | Test coverage — failure-mode + idempotency evals — **DONE** | 45m  | t007       |
| t010 | Closeout — **DONE** | 15m  | t009       |

## Definition of done

From a fixture bank CSV (and an OFX with FITIDs), the skill produces categorized draft entries staged for review, presents a per-row review table (target account, confidence, duplicates skipped, new `open` directives, target file), writes only after explicit confirmation into an already-existing file with each entry carrying `import-id` metadata, and passes `bean-check`. Importing the same file a second time yields **zero** new entries (idempotency). All evals pass; no write ever happens without confirmation.

## Source + Goal linkage

- **Source:** /pm-brainstorm 2026-07-31 (skills-market research: bank import with a human review gate is the #1 job-to-be-done) + the import-architecture design discussion of 2026-07-31 (seven-stage pipeline: Discover → Normalize → Stage → Dedup → Suggest → Confirm → Write+Verify).
- **Goal linkage:** A1 — the weekly-loop wedge: a coding agent maintains the ledger's most frequent chore with deterministic rails (`bean-check`, metadata-based dedup, git). Wraps standard formats and conventions; re-implements nothing upstream (DO_NOT_DO-clean). The `import-id: "<source>:<stable-id>"` metadata convention is designed to be adoptable by any other beancount tool, making dedup interoperable across tools.
- **Expected outcome:** a user with a bank export gets verified entries in one confirm; repeat weekly invocations (retention signal); together with shipped `beancount-reconcile` (w2/done/m1) this completes the import→reconcile weekly loop.
- **Why now:** m1 shipped the reconcile half of the loop; import is its natural upstream and the conventions here (config block reuse, `import-id`) feed m2 (`beancount-importer-author` codifies repeat sources into beangulp importers — the skill suggests that handoff after 3+ imports of the same source). Adoption surface included: ships a new agent-facing skill.
