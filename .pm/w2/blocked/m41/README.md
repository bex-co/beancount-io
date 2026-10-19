# w2 · m41 — Rewrite the accumulated skill fixes as plain procedures

**Worker:** worker2 **Goal:** each `beancount-*` SKILL.md and shared reference reads as a positive procedure. Version-specific `bea` caveats live in one section that records the version each applies to, and the suite declares and checks a minimum `bea` version. No rule is lost. **Status:** blocked (t001–t004 done; t005 waits on Codex)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](./done/t001.md) | Declare the minimum `bea` and collect its version notes — **DONE** | 45m | — |
| [t002](./done/t002.md) | Compact ask, close, and init — **DONE** | 45m | t001 |
| [t003](./done/t003.md) | Compact import and importer-author — **DONE** | 45m | t001 |
| [t004](./done/t004.md) | Compact reconcile, migrate, and options — **DONE** | 45m | t001 |
| t005 | Prove nothing was lost — **BLOCKED** | 45m | t002, t003, t004 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 15m | t006 |
| t008 | Test coverage | 30m | t006, t007 |
| t009 | Closeout | 15m | t008 |

## Blocked

- **t005 Prove nothing was lost (2026-10-19)** — its Claude Code half and the deterministic checks are done (see t005's Partial result); the definition of done also needs "one high-risk eval per skill passes on both clients", and Codex cannot run here: its account reported its usage limit on 2026-10-19 ("try again at Nov 17th, 2026"). t006–t009 depend on t005, so the milestone waits with it. Shipped baseline: t001–t004 (`f151ef445`, `1c5ac1b7a`, `b0595785f`, `13b62cfb2`) and the evidence record. **Unblock:** Codex usage is available again (after 2026-11-17, or on an account with quota); then `/pm unblock w2/m41`, run the nine evals listed in the rehearsal record on Codex, append the results, and continue at t006. **Who can clear it:** the operator who holds the Codex account.

## Definition of done

- `bea-cli.md` states the suite's minimum `bea` version and how to check it once per session. `skills/README.md` and `docs/skills/installation.md` state the same version, and a CI check fails when they disagree.
- Version-specific caveats (older batch schemas, the default `list` limit, optional libmagic, `bea ingest` rejecting `--json`, and others the tasks find) sit in one `bea-cli.md` section, each marked with the version range it applies to. Skill bodies point there instead of carrying the caveat inline.
- Each skill body is rewritten as steps and rules stated positively. A prohibition stays only when it guards a real failure, and it is then stated once.
- Every rule removed or merged is listed in the task that changed it, with where it moved or why it no longer applies (for example, fixed at or below the minimum `bea`).
- `python3 scripts/skills/ci-check.py`, `test_ci_check.py`, and `test_beancount_skills.py` pass. The first-month journey passes `scripts/verify-first-month.py` on at least one client after the change. One high-risk eval per skill passes on both clients, recorded with versions and dates.

## Source + Goal linkage

- **Source:** agentic-skill review of `skills/` at the user's request, 2026-10-18. Months of QA fixes have accumulated as one-line patches: "Do not point at a nonexistent `ingest.py`", "older `bea` batch schemas require…", "the system libmagic library is optional…". Each fixed a real failure, but together they read as patch notes and push the procedure out of view. A cleanup pass started the same day (dropping init's 50-line `.gitignore` listing and options' repeated confirmation block). This milestone finishes it with a rule against losing anything.
- **Goal linkage:** **A1 — Agent-native accounting.** Instruction-file quality is the pillar's own measure, and shorter, positive procedures are followed more reliably and are cheaper to load.
- **Expected outcome:** an agent loading any skill reads the workflow first and the caveats only when relevant. A maintainer can tell from one section which caveats to delete when the minimum `bea` moves.
- **Why now:** [w6/m6](../../../w6/blocked/m6/README.md) will bundle these texts into immutable ClawHub versions, and [m40](../m40/README.md) adds a ninth skill that should follow the compacted style rather than copy the current one. Run after [m39](../m39/README.md) where possible, so the renamed files are rewritten once. Adoption surface is included because skill text is what agents read.

## Out of scope

- Descriptions and routing ([m38](../../done/m38/README.md)).
- Changing any workflow's behavior, confirmation gates, or trust rails.
- Dropping the no-`bea` fallback (a separate decision, [w2/080](../080.md)).
