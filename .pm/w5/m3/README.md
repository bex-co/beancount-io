# w5 · m3 — Install and verify the eight customer ledger skills

**Worker:** worker1 **Goal:** a newcomer installs the complete customer suite, verifies it, and obtains a correct first ledger answer in Claude Code or Codex **Status:** todo

**Estimate:** 3h implementation; 5h including standing closing tasks (8 tasks).

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Publish executable installation instructions for both agents | 45m | — |
| t002 | Add a user-runnable installed-suite verifier | 45m | w5/m3/t001 |
| t003 | Support repeat installation updates and removal | 45m | w5/m3/t001 |
| t004 | Publish a synthetic first-query walkthrough | 45m | w5/m3/t002, w5/m3/t003 |
| t005 | Adoption surface | 30m | w5/m3/t004 |
| t006 | Simplify | 30m | w5/m3/t005 |
| t007 | Test coverage | 45m | w5/m3/t005, w5/m3/t006 |
| t008 | Closeout | 15m | w5/m3/t006, w5/m3/t007 |

## Definition of done

- The documented commands work from a clean ledger workspace for Claude Code and Codex. Each agent discovers exactly the eight intended customer skills with all required supporting files.
- The installation verifier identifies missing skills, unresolved references, and missing sibling workflows with an actionable failure; it does not modify the installed tree or ledger.
- Repeat installation, update, and removal instructions preserve unrelated skills and report conflicts with locally modified content.
- The first-query walkthrough returns its known fixture result through beancount-ask, shows the query, and leaves ledger bytes unchanged. Record the tested client and CLI versions and setup time.
- Skills structural checks and applicable fixture validation pass; agent guidance and canonical skill-directory/symlink checks pass. Evidence distinguishes successful installed behavior from untested platforms.

## Source + Goal linkage

- **Source:** Approved `/pm-brainstorm for w5` proposal, materialized by `$pm for w5 for them all` on 2026-09-12; the installation gap in [skills/README.md](../../../skills/README.md) and the [customer catalog](../../../skills/CLAUDE.md).
- **Goal linkage:** **A1 — Agent-native accounting**, **A2 — Frictionless onboarding**, and **A3 — Community & distribution**: people adopting Beancount through a coding agent can install and invoke the existing ledger workflows without learning this monorepo's layout.
- **Expected outcome:** Fresh-install rehearsals measure setup time and first-invocation completion. Both agents discover the full suite and produce the known fixture result; this is installation evidence, not a claimed increase in production usage.
- **Why now:** Eight customer workflows already exist, so installation and discovery are the immediate missing adoption surface. w1/m19–m21 are now complete; build on their supported bea execution and installation guidance while adding the separate customer-skill installation path.
- **Adoption surface:** included. The installation instructions, verifier, and first-query walkthrough are directly used by customers and both coding agents.

## Boundaries

- Implementation belongs in `skills/`, with discovery pointers updated during Adoption surface. Reuse Git/file operations and supported agent installation mechanisms; do not introduce a general installer framework or new dependencies without user approval.
- Keep `skills/.claude/skills/` as the canonical customer source, separate from repository development skills. Installing the customer suite must not install maintenance, PM, or release workflows.
- Completed w1/m21 owns the accounting execution and optional engine installation integration. This milestone uses those supported current commands without copying that work or changing the CLI engine.
- Use synthetic fixtures and isolated destinations for rehearsals. Preserve unrelated skills and expose local modifications or name collisions before changing existing installations.
