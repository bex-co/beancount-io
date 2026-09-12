# w1 · m18 — Ledger skills converge on `bea`

**Worker:** worker1 **Goal:** the `beancount-*` skills and the CLI stop being two products under one name: one starter ledger, one dedup convention, and skills that use `bea`'s validated writes, preview, and JSON reads when the command is installed **Status:** done

## Tasks (in order)

| id   | title                                                                                     | est | depends_on |
| ---- | ----------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | `beancount-init` builds on `bea init`; one starter template and one equity account name — **DONE** | 45m | — |
| t002 | `beancount-import` writes through `bea import --csv` / `bea add transactions` when available — **DONE** | 60m | t001 |
| t003 | `beancount-reconcile`, `beancount-close`, and `beancount-ask` prefer `bea` for checks, pads, and reads — **DONE** | 45m | t002 |
| t004 | Skills CI runs `bea check` beside `bean-check`; `skills/CLAUDE.md` names the shared rails — **DONE** | 30m | t003 |
| t005 | Adoption surface — **DONE**                                                               | 20m | t004       |
| t006 | Simplify — **DONE**                                                                       | 30m | t005       |
| t007 | Test coverage — **DONE**                                                                  | 45m | t005       |
| t008 | Closeout — **DONE**                                                                       | 15m | t007       |

## Definition of done

- Running `/beancount-init` with `bea` on PATH produces the same `main.bean` as `bea init` plus the skill's uv project, Makefile, and `.gitignore`; without `bea` the skill writes the identical template itself. Both spell the equity account `Equity:OpeningBalances`.
- `/beancount-import` with `bea` on PATH stages through `bea import … ` (preview, duplicate review, diff) and writes only through `bea import --apply` or `bea add transactions --from -`, so every written entry passes full-ledger validation; the `import-id` values it writes match `references/dedup.md` and `bea import` treats them as exact duplicates (m14).
- `/beancount-reconcile` and `/beancount-close` verify with `bea check` and create opening adjustments with `bea add balance --pad-from`; `/beancount-ask` documents `bea --json query` and `bea --json balance` as its first tools with `bean-query` as the fallback.
- `python3 skills/scripts/ci-check.py` runs `bea check` on every `*ledger.beancount` fixture when the CLI environment is present and reports the same pass/fail set as `bean-check`.
- `skills/CLAUDE.md` and each edited `SKILL.md` describe the "prefer `bea`, fall back to bean-*" rule once; `python3 scripts/check-agent-guidance.py` and the skills CI pass.

## Source + Goal linkage

- **Source:** CLI UX review 2026-09-08 — the shared skills shell out to `bean-check` and `bean-query` and never to `bea`; `beancount-init` scaffolds a different ledger than `bea init` (five accounts opened today and `Equity:Opening-Balances` versus thirteen accounts and `Equity:OpeningBalances`); the skills' `import-id` convention and the CLI's `bea_import_id` were two dedup schemes in one repository.
- **Goal linkage:** **A1 — Agent-native accounting:** this is the pillar's definition; an agent should get atomic validated writes, duplicate review, and JSON reads from the CLI instead of reimplementing them in prose. **A2 — Frictionless onboarding:** one starter ledger regardless of whether the user typed `/beancount-init` or `bea init`.
- **Expected outcome:** a Claude Code or Codex user who installs `bea` and the skills sees them cooperate: a skill-imported month and a CLI-imported month never double-book, and skill transcripts show `bea --json` calls instead of hand-rolled parsing.
- **Why now:** sequenced after m14 (the dedup convention) and after the first published release (w2/m25) so the skills can state a real install line; before that, telling agents to call `bea` would send them to an install that fails. Adoption surface included: every change is agent-facing and must hold for both Claude Code and Codex.

## ADR014 follow-up — 2026-09-11

This milestone remains the completed bea-first skills baseline; its task IDs, completion records, and original definition of done are retained. [ADR014](../../../../docs/adrs/ADR014-cli-beancount-parity.md) introduces a separate engine and changes the installation assumptions used above.

- [m19](../m19/README.md) owns the complete CLI process boundary, engine provisioning, license resolution, and release verification (**done**).
- [m20](../m20/README.md) keeps optional importer/provider execution inside the reviewed engine environment (**done**).
- [m21](../../m21/README.md) adapts skills/CI to one bea-ledger installation, explicit Fava/developer workflows, supported optional activation, independent reference checks, and equivalent behavior for Claude Code and Codex.

The prior shared-venv and unconditional upstream-install guidance must not be reused as proof of ADR014 completion. The original template, deduplication, and validated-write work is not being reopened.
