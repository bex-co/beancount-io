# Repository Development Skills

Internal workflows for developing and maintaining this monorepo. Follow the [root guide](../CLAUDE.md) for repository-wide rules.

The canonical implementations live in the real directory `.agents/skills/` relative to the repository root. Codex reads that directory; Claude Code reads the same files through `.claude/skills -> ../.agents/skills`. Edit the canonical files and keep the link relative.

Customer-facing `beancount-*` ledger skills belong in [`skills/.claude/skills/`](../skills/.claude/skills), documented in [`skills/CLAUDE.md`](../skills/CLAUDE.md). Keep them separate from this development suite.

## Skills

| Skill | Purpose |
| ----- | ------- |
| `mermaid` | Draw and syntax-check architecture and dependency diagrams. |
| `pm` | Maintain the public `.pm` board; canonical board conventions and the only workflow that writes board state. |
| `pm-brainstorm` | Propose roadmap milestones and tasks as text for `/pm` to materialize. |
| `loop-worker` | Implement and ship a workstream one milestone at a time. |
| `ship` | Rebase, commit, and push the current `main` branch. |
| `mobile-release` | Prepare and publish mobile store releases and localized listings. |
| `qa-find-bugs-cli` | Exercise real `bea` commands against isolated synthetic ledgers. |
| `qa-find-bugs-dashboard` | Exercise dashboard journeys with Playwright and reproduce findings. |
| `qa-find-bugs-mobile` | Exercise native mobile journeys with Expo MCP and reproduce findings. |
| `routine-logic-simplifier` | Simplify convoluted logic with behavior pinned by tests. |
| `routine-logic-bugfixer` | Prove and fix bugs in tricky logic with regression tests. |
| `routine-dup-unifier` | Merge equivalent duplicated implementations within a package. |
| `routine-dead-code-removal` | Verify detector findings and remove unreachable code. |
| `routine-useless-test-pruner` | Prove tests cannot detect broken behavior, then remove them. |
| `routine-shipped-feature-inliner` | Remove obsolete gates for fully shipped features. |
| `routine-flaky-test-fixer` | Reproduce and fix nondeterministic CI tests. |
| `routine-abstraction-improver` | Flatten unnecessary indirection. |
| `routine-abstraction-police` | Fix imports that violate documented architectural boundaries. |

The `routine-shared/` and `qa-shared/` directories contain shared contracts and helpers; they have no `SKILL.md` and are not independently invokable skills. Each routine reads [its shared contract](skills/routine-shared/contract.md) first; each QA skill reads [the QA contract](skills/qa-shared/contract.md).

## Conventions

Each skill lives at `.agents/skills/<name>/SKILL.md` with `name` and `description` frontmatter. Use `references/`, `evals/`, `scripts/`, or `agents/` only when the workflow needs them. Keep sibling references relative so the Claude Code alias resolves them too. Use canonical `.agents/skills/` paths for repository-root commands and GitHub links.

When adding a development skill, update this catalog and run the checks below. Use `.agents/tmp/` for scratch work; it is gitignored. Use the `skill-creator` workflow when iterating on skill behavior.

### Shared suite conventions — routine-*

The `routine-*` skills are autonomous maintenance passes over this monorepo (discover → prove → fix → verify → ship). Their shared contract lives canonically at `.agents/skills/routine-shared/contract.md` (not a skill — no `SKILL.md`); every routine reads it first. The invariants it defines:

- **One finding per `/ship`, never batched**; the next finding waits for the shipped SHA.
- **Never ship red**: the owning package's checks (the same table as `loop-worker`'s step 3) are the only gate — `/ship` has none. A package with no covering automated check (backend-v2, agent-box, deploy) means STOP, not ship.
- **Proof over suspicion**: a detector hit or grep match is a candidate; each skill defines its proof (failing test, still-green sabotage, empty reference sweep).
- **Budget**: 3 shipped findings per invocation, then a summary of shipped / skipped / nothing-found.
- **Universal STOPs**: new dependencies, cross-package API-contract changes, `DO_NOT_DO.md` conflicts, unpinnable behavior changes, unexplained red checks.
- **Never touch**: lockfiles, codegen output, `.pm/` (routines never write the board), `.env*`, vendored fava, the `AGENTS.md`/skills symlinks.
- **Scope argument**: `/routine-* [package-or-path]`; empty means survey, pick one target, announce it. The contract's symptom→owner table keeps the nine skills' territories disjoint.

### Validation

From the repository root, using the existing CLI environment for Beancount fixtures:

```zsh
python3 scripts/check-agent-guidance.py
python3 skills/scripts/ci-check.py
python3 skills/scripts/test_ci_check.py
node --test .agents/skills/qa-shared/scripts/qa-login.test.mjs
```

The skills CI workflow covers both skill trees. Instruction changes also require `.agents/AGENTS.md` to remain a relative symlink to its sibling `CLAUDE.md`.
