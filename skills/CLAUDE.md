# Beancount Skills

Claude Code skills that automate beancount workflows for [Beancount.io](https://beancount.io/) prosumers (see root `CLAUDE.md` for repo-wide rules).

A "skill" here is a Claude Code skill — markdown instructions + reference files + optional scripts that load on demand based on user intent. Skills declared in this package auto-load when Claude Code is run from inside `skills/` (the `.claude/skills/<name>/` discovery convention).

## Layout

```
skills/
  .claude/
    skills/
      beancount-init/         Scaffold a new beancount + fava ledger repo
        SKILL.md
      beancount-options/      Convert natural-language options trades into beancount transactions
        SKILL.md
        references/           Per-strategy guidance loaded on demand
        evals/                Test prompts + fixtures for skill-creator iteration
  tmp/                        Scratch space — gitignored, safe for experiments
```

## Skills

| Skill | Purpose |
|---|---|
| `beancount-init` | Scaffold a fresh `main.bean` + Fava + uv project from an empty directory. Triggers on `/beancount-init` or "set up a new beancount repo". |
| `beancount-options` | Turn human-language descriptions of options trades (CSP, covered call, vertical, condor, roll, assignment, exercise, expiration, …) into balanced beancount transactions. Uses per-contract cost basis, IRS-aligned assignment treatment, and runs `bean-check` to verify before reporting success. |
| `ship` | Codex entry point for the repository's canonical [`/ship` workflow](../.claude/commands/ship.md). |

## Conventions

### Skill structure

Each skill lives at `.claude/skills/<name>/` with:
- `SKILL.md` — frontmatter (`name`, `description` for triggering) + body instructions. Keep under ~500 lines; spill into `references/` for deep nuance.
- `references/` — files loaded on demand when the body points to them.
- `evals/` — `evals.json` + fixtures for `skill-creator` iteration.

### Validation

For any skill that emits beancount, run `bean-check` on the resulting file before declaring success. The `beancount-options` skill bakes this into its workflow as a "Verify" phase.

`bean-check` lives in a venv at `/tmp/beancount_venv/bin/bean-check` from the iter-2/3 dev work; install via `pip install beancount` if missing.

### Iterating on a skill

Use the `skill-creator` skill (`/skill-creator`) for the build → eval → review loop. Outputs land in `tmp/<skill-name>-workspace/` (gitignored). The `beancount-options` workspace from the original 4-iteration build sits at `tmp/beancount-options-workspace/` for reference (iter-1 broken snapshot, iter-2/3 benchmarks, trigger eval queries).

### Scratch space

`skills/tmp/` is gitignored. Drop ledgers, eval outputs, throwaway scripts there while iterating. Don't put scratch at the repo root or inside `.claude/`.

### Adding a new skill

1. Create `.claude/skills/<new-name>/SKILL.md` with `name` and `description` frontmatter.
2. Be explicit in `description` about both when to trigger AND when to skip — Claude tends to undertrigger, but false positives are equally bad.
3. Build a few realistic test prompts in `evals/evals.json`, run them with and without the skill (via `skill-creator` workflow), iterate.
4. Update this CLAUDE.md's Skills table.
