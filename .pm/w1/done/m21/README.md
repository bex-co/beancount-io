# w1 · m21 — Ledger skills follow the one-install engine design

**Worker:** worker1 **Goal:** Claude Code and Codex complete existing ledger workflows through bea without redundant accounting-tool installation or assumptions about its private engine **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Adapt ledger initialization to the single bea installation — **DONE** | 45m | w1/m20/t008 |
| t002 | Align ledger skills with independent engine commands — **DONE** | 60m | t001 |
| t003 | Validate skills against installed isolated bea artifacts — **DONE** | 60m | t002 |
| t004 | Rehearse core and optional workflows for both agents — **DONE** | 45m | t003 |
| t005 | Adoption surface — **DONE** | 25m | t004 |
| t006 | Simplify — **DONE** | 30m | t005 |
| t007 | CI + test coverage — **DONE** | 45m | t005, t006 |
| t008 | Closeout — **DONE** | 15m | t007 |

## Definition of done

- m19 and m20 are complete; completed m18 remains archived with its original task status/history and a link to this follow-up.
- A user with bea installed can initialize, check, query/report, import, and write supported ledger data through the skills without another Beancount installation or private engine-path configuration.
- Requested Fava browser setup and no-bea/developer fallbacks remain explicit, legitimate independent workflows. Fava's separate runtime is not represented as a prerequisite for bea CLI operations.
- Optional ingest/quote guidance uses the actual m20 activation and commands. Skills do not import engine libraries into the frontend or silently substitute a different global engine after managed-engine failure.
- Confirmations, preview/apply, exact amounts, template behavior, and import-id conventions remain intact for both Claude Code and Codex.
- Skills CI exercises an installed isolated bea and a deliberately separate upstream oracle, with real fixtures and expected failures. Agent guidance/symlink checks pass and rehearsal evidence is recorded accurately.

## Source + Goal linkage

- **Source:** User request on 2026-09-11 to update m18/m20 for [ADR014](../../../docs/adrs/ADR014-cli-beancount-parity.md); follow-up to completed [m18](../done/m18/README.md).
- **Goal linkage:** **A1 — Agent-native accounting:** both coding agents use the supported CLI execution boundary. **A2 — Frictionless onboarding:** agents do not ask customers to install duplicate accounting tools.
- **Expected outcome:** Existing skills work with a single bea installation and the selected optional engine features, preserving safe ledger workflows and documented independent Fava/developer use.
- **Why now:** m18's completed work predates engine separation and still assumes shared environments. Sequence after m19/m20 so skills document real install/activation interfaces and test actual artifacts.
- **Closing tasks:** Adoption surface is included because the entire milestone changes agent-facing instructions, onboarding, and executable examples.

## Boundaries

This milestone adapts instructions, fixtures, and skills CI; it does not reopen completed accounting/template/dedup work or implement a new CLI engine. Any CLI contract defects found during rehearsal must be fixed before claiming the skills workflow works.
