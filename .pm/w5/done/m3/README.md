# w5 · m3 — Install and verify the eight customer ledger skills

**Worker:** worker1 **Goal:** a newcomer installs the complete customer suite, verifies it, and obtains a correct first ledger answer in Claude Code or Codex **Status:** done

**Estimate:** 3h implementation; 5h including standing closing tasks (8 tasks).

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Publish executable installation instructions for both agents — **DONE** | 45m | — |
| t002 | Add a user-runnable installed-suite verifier — **DONE** | 45m | w5/m3/t001 |
| t003 | Support repeat installation updates and removal — **DONE** | 45m | w5/m3/t001 |
| t004 | Publish a synthetic first-query walkthrough — **DONE** | 45m | w5/m3/t002, w5/m3/t003 |
| t005 | Adoption surface — **DONE** | 30m | w5/m3/t004 |
| t006 | Simplify — **DONE** | 30m | w5/m3/t005 |
| t007 | Test coverage — **DONE** | 45m | w5/m3/t005, w5/m3/t006 |
| t008 | Closeout — **DONE** | 15m | w5/m3/t006, w5/m3/t007 |

## Definition of done

- The documented commands work from a clean ledger workspace for Claude Code and Codex. Each agent discovers exactly the eight intended customer skills with all required supporting files.
- The installation verifier identifies missing skills, unresolved references, and missing sibling workflows with an actionable failure; it does not modify the installed tree or ledger.
- Repeat installation, update, and removal instructions preserve unrelated skills and report conflicts with locally modified content.
- The first-query walkthrough returns its known fixture result through beancount-ask, shows the query, and leaves ledger bytes unchanged. Record the tested client and CLI versions and setup time.
- Skills structural checks and applicable fixture validation pass; agent guidance and canonical skill-directory/symlink checks pass. Evidence distinguishes successful installed behavior from untested platforms.

## Source + Goal linkage

- **Source:** Approved `/pm-brainstorm for w5` proposal, materialized by `$pm for w5 for them all` on 2026-09-12; the installation gap in [skills/README.md](../../../../skills/README.md) and the [customer catalog](../../../../skills/CLAUDE.md).
- **Goal linkage:** **A1 — Agent-native accounting**, **A2 — Frictionless onboarding**, and **A3 — Community & distribution**: people adopting Beancount through a coding agent can install and invoke the existing ledger workflows without learning this monorepo's layout.
- **Expected outcome:** Fresh-install rehearsals measure setup time and first-invocation completion. Both agents discover the full suite and produce the known fixture result; this is installation evidence, not a claimed increase in production usage.
- **Why now:** Eight customer workflows already exist, so installation and discovery are the immediate missing adoption surface. w1/m19–m21 are now complete; build on their supported bea execution and installation guidance while adding the separate customer-skill installation path.
- **Adoption surface:** included. The installation instructions, verifier, and first-query walkthrough are directly used by customers and both coding agents.

## Boundaries

- Implementation belongs in `skills/`, with discovery pointers updated during Adoption surface. Reuse Git/file operations and supported agent installation mechanisms; do not introduce a general installer framework or new dependencies without user approval.
- Keep `skills/.claude/skills/` as the canonical customer source, separate from repository development skills. Installing the customer suite must not install maintenance, PM, or release workflows.
- Completed w1/m21 owns the accounting execution and optional engine installation integration. This milestone uses those supported current commands without copying that work or changing the CLI engine.
- Use synthetic fixtures and isolated destinations for rehearsals. Preserve unrelated skills and expose local modifications or name collisions before changing existing installations.

## What shipped

- `skills/docs/installation.md`: sparse Git checkout of `skills/` from the public repository, then `skills/scripts/beancount-skills.py install` links the eight `beancount-*` directories into `~/.claude/skills` (Claude Code) and/or `~/.agents/skills` (Codex), or into a single workspace. Also covers discovery checks, troubleshooting, updates with `git pull --ff-only`, local edits, name conflicts, and removal. Both agents' official docs state they follow symlinked skill folders.
- `skills/scripts/beancount-skills.py` (stdlib only):
  - `install` is all-or-nothing and changes nothing when a name is taken. It says whether a copy is identical or lists the files that differ.
  - `verify` is read-only. It checks the inventory, the frontmatter, `references/` files named in skill text (attributed to the owning sibling), and sibling mentions.
  - `uninstall` removes only links into the checkout.
- `skills/docs/first-query.md`: synthetic walkthrough using the existing `beancount-ask` eval ledger, with the expected June 2026 figures, a re-runnable `bea --json query`, and a checksum check.
- Adoption pointers: `skills/README.md` Install section, root `README.md` entry point, `skills/CLAUDE.md` layout/validation/new-skill checklist, root `CLAUDE.md` CI description, and a new step in `.github/workflows/ci-skills.yml`.

## Evidence (2026-09-14, macOS)

Versions: Claude Code 2.1.270, Codex 0.154.0, `bea 0.1.0` (Homebrew), Git 2.49.0, Python 3.14.3.

| Check | Claude Code | Codex |
| --- | --- | --- |
| Install scope rehearsed | Workspace `.claude/skills` | User `~/.agents/skills` (isolated `HOME`) and workspace `.agents/skills` |
| Discovery prompt (installation guide step 3) | Exactly the eight `beancount-*` skills; the init event listed the same eight | Exactly the eight, in both scopes |
| First query | Invoked `beancount-ask`, read `references/bql-recipes.md` through the link, answered 141.60 / 50.00 / 17.99 USD with queries shown; 35 s | Read `beancount-ask` through the user-scope link; same figures and query under `--sandbox read-only`; 56 s |
| Ledger bytes | SHA-256 unchanged (`shasum -c` OK) | SHA-256 unchanged (`shasum -c` OK) |

- Setup time: the documented sparse clone from GitHub took about 1 s (2 MB, root files plus `skills/` only, no `.agents/`). `install` for two destinations, the workspace setup, and `verify` took under 1 s. The agent rehearsal cloned a local snapshot of this change through the same documented commands, because the helper was not yet on `main`.
- Not rehearsed: Claude Code at user scope (`~/.claude/skills`), because Claude Code's login does not carry over to an isolated `HOME` and the rehearsal did not write to a real user skill directory. Linux, Windows, and interactive `/skills` listings are also unrehearsed. The customer docs state these limits.
- Automated: `python3 skills/scripts/test_beancount_skills.py` (18 tests) covers:
  - install into a destination that holds an unrelated sentinel skill
  - a no-op repeat install
  - all-or-nothing conflicts, both for an edited copy and an identical copy, plus a dangling foreign link
  - the documented backup recovery
  - read-only `verify`, checked by snapshots of the destination, the source, and the ledger
  - a missing own reference and a missing sibling-owned reference, each attributed to its owner
  - a missing composed sibling, a dangling link, and bad frontmatter
  - unrelated skills and prose file names that must not cause failures
  - uninstall removing only links into the checkout
  - the Git path, using the clone and sparse-checkout flags parsed from `installation.md`: the checkout holds only `skills/`, `pull --ff-only` keeps non-overlapping local edits and refuses overlapping ones, and skills added upstream get linked
  - the walkthrough, where the figures come from an independent parse of the fixture, and the documented query run through `bea` returns them without changing the ledger
- Native checks: `python3 skills/scripts/ci-check.py`, `python3 skills/scripts/test_ci_check.py` (14 tests), and `python3 scripts/check-agent-guidance.py` pass.
- Secret scan: gitleaks is clean on every changed path. A full `gitleaks dir .` reports findings only in gitignored local build output, env files, and local deploy data, none of which is tracked.
- Simplify (`/simplify`, four review angles):
  - Applied: collapsed repeated path and existence logic, added a single action map, added test helpers, added a single independently computed expected answer, parsed Git test commands from the docs, and removed the `verify` eval-fixture check (CI already covers it).
  - Applied: moved the dated rehearsal record out of the customer doc into this README, and cut the third copy of the install block from the root README.
  - Deferred: replacing the reference scan with a comparison against the checkout's file inventory. On a link install that comparison would compare the checkout with itself and miss files deleted from the checkout.
  - Deferred: minor test-speed items worth about 1 s each.
