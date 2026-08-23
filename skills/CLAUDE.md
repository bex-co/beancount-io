# Beancount Agent Skills

Cross-compatible Claude Code and Codex skills that automate Beancount workflows for [Beancount.io](https://beancount.io/) users (see root `CLAUDE.md` for repo-wide rules).

A skill is a `SKILL.md` instruction package with optional references, evals, scripts, and agent metadata. The canonical implementations live here under `.claude/skills/`; the repository-root `.agents/skills` symlink exposes the same tree to Codex. Do not create platform-specific copies.

## Layout

```
skills/
  .claude/
    skills/
      beancount-ask/          Answer ledger questions with shown, re-runnable BQL (read-only)
      beancount-close/        Month-end close ritual: reconcile all, assert, report, commit
      beancount-import/       Import a bank/card export (CSV/OFX/QIF) as categorized, deduplicated entries
      beancount-importer-author/  Write/repair tested beangulp importers from a sample file
      beancount-init/         Scaffold a new beancount + fava ledger repo
        SKILL.md
      beancount-migrate/      Migrate Mint/Monarch/QBO export history into a fresh ledger
      beancount-options/      Convert natural-language options trades into beancount transactions
        SKILL.md
        references/           Per-strategy guidance loaded on demand
        evals/                Test prompts + fixtures for skill-creator iteration
      beancount-reconcile/    Reconcile one account against a bank/broker statement
        SKILL.md
        references/           Statement-format + matching guidance loaded on demand
        evals/                Statement+ledger fixtures per mismatch class
      mermaid/                Draw syntax-verified Mermaid architecture diagrams
        SKILL.md
      pm/                     Codex entry point for the root /pm command
      pm-brainstorm/          Codex entry point for /pm-brainstorm
      ship/                   Codex entry point for the root /ship command
  tmp/                        Scratch space — gitignored, safe for experiments
```

Most stateful `beancount-*` skills have `references/` and `evals/`; small skills such as `beancount-init` may be self-contained. Mutating ledger workflows share the applicable trust rails: propose-then-confirm before writes, categorization restricted to existing accounts, `bean-check` as the verification gate, and the `import-id` convention from `.claude/skills/beancount-import/references/dedup.md` for externally sourced entries. Read-only skills do not pretend to have a write/confirmation phase.

## Skills

| Skill                       | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beancount-ask`             | Answer analytical questions about the ledger ("top expenses", "net worth", "what subscriptions crept up") with tested BQL recipes via `bean-query`. Strictly read-only; every figure comes from a query shown with the answer — never model arithmetic. Ambiguous questions get a clarifying question, not a silent interpretation.                                                                                                                                                                                                   |
| `beancount-close`           | Month-end close ritual: enumerate active accounts, reconcile each (delegating to `beancount-reconcile`), verify period-end assertions, detect recurring-entry gaps (reported, never fabricated), sweep `!` flags, and land the period's P&L/BS report as a confirm-gated git commit whose body is the close report. Red `bean-check` blocks the commit. Triggers on "close the month".                                                                                                                                                |
| `beancount-import`          | Import a bank/card export file (CSV, OFX/QFX, QIF) as categorized, deduplicated ledger entries. Seven-stage pipeline (Discover → Normalize → Stage → Dedup → Suggest → Confirm → Write+Verify): categorizes from the ledger's own payee history (existing accounts only — never invents), stamps every entry with `import-id` metadata so re-imports are no-ops, confirm-gated, `bean-check`-verified. Triggers on "import this CSV" / "record my bank export".                                                                       |
| `beancount-importer-author` | Write or repair a beangulp (beancount v3) importer from a sample export file, driven by beangulp's golden-file test harness — draft → generate → eyeball → `test` until green; a red harness is never handed over. Graduation path from `beancount-import` (reads its config block as the spec); minimal-patch drift repair keeps old goldens green. Triggers on "write an importer for X" / "my importer broke".                                                                                                                     |
| `beancount-init`            | Scaffold a fresh `main.bean` + Fava + uv project from an empty directory. Triggers on `/beancount-init` or "set up a new beancount repo".                                                                                                                                                                                                                                                                                                                                                                                             |
| `beancount-migrate`         | Migrate full history from a finance-app export (Mint, Monarch, QuickBooks Online, or any category-tagged CSV) into a fresh ledger: confirm-gated account/category mapping, transfer-pair dedup, opening balances + endpoint `balance` assertions that tie to stated balances, and a migration report that reconciles row counts and balances against the source — deltas surfaced, never forced. Composes `beancount-init`; entries carry `import-id` so later imports dedup against migrated history.                                |
| `beancount-options`         | Turn human-language descriptions of options trades (CSP, covered call, vertical, condor, roll, assignment, exercise, expiration, …) into balanced beancount transactions. Uses per-contract cost basis, IRS-aligned assignment treatment, and runs `bean-check` to verify before reporting success.                                                                                                                                                                                                                                   |
| `beancount-reconcile`       | Reconcile one account against a bank/broker statement (CSV or pasted PDF text). Diffs statement vs ledger into mismatch classes (missing, duplicate, amount-mismatch, date-drift), and — only after confirmation — appends the missing transactions plus a period-end `balance` assertion that ties the account out. Append-only (reports suspects/duplicates/mismatches for manual fixing); never writes a failing assertion; `bean-check`-gated. Triggers on "reconcile my checking account" / "does my ledger match my statement". |
| `mermaid`                   | Draw concise, syntax-verified Mermaid architecture diagrams for a repo component, document, system, or dependency flow. Verifies the diagram renders via `mermaid-cli` before answering.                                                                                                                                                                                                                                                                                                                                              |
| `ship`                      | Codex entry point for the repository's canonical [`/ship` workflow](../.claude/commands/ship.md).                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `pm`                        | Codex entry point for the canonical [`/pm` workflow](../.claude/commands/pm.md) — arrange the public `.pm` adoption board (the only writer to `.pm/`).                                                                                                                                                                                                                                                                                                                                                                                |
| `pm-brainstorm`             | Codex entry point for the canonical [`/pm-brainstorm` workflow](../.claude/commands/pm-brainstorm.md) — propose adoption milestones as text; `/pm` materializes them.                                                                                                                                                                                                                                                                                                                                                                 |

## Conventions

### Skill structure

Each skill lives at `.claude/skills/<name>/` with:

- `SKILL.md` — frontmatter (`name`, `description` for triggering) + body instructions. Keep under ~500 lines; spill into `references/` for deep nuance.
- `references/` — optional files loaded on demand when the body points to them.
- `evals/` — optional `evals.json` + fixtures for `skill-creator` iteration.
- `scripts/` / `agents/` — optional executable helpers or platform metadata when the skill needs them.

### Shared suite conventions

Shared contracts for the `beancount-*` suite (apply each one only to skills that use that behavior, and point to its canonical definition rather than restating it):

- **Ledger discovery**: `fd -e beancount -e bean .` (fallback `find`); the "main" file has `option`/`plugin`/`include` directives or the most `open`s. Confirm when ambiguous.
- **Config blocks**: persisted state lives in `;; <skill-name> config` comment blocks at the top of the main file. Shapes differ deliberately — `beancount-import`'s is **per-source** (stanza per export source; `sign: negative=outflow` is format-speak), `beancount-reconcile`'s is **per-account** (`sign: asset|liability` is account-type-speak; the two encodings describe the same convention). Blocks coexist; skills may read each other's (importer-author reads import's as its spec).
- **`import-id` metadata**: the dedup convention for every entry that originates from an external source — canonical grammar and hash normalization in `.claude/skills/beancount-import/references/dedup.md` (migrate's `mint:`/`monarch:`/`qbo:` prefixes and importer-author's generated importers follow it).
- **Categorization fallback**: suggestions come only from accounts already opened; no confident prior → `Expenses:Uncategorized`, visibly flagged. Never invent an account.
- **Balance-assertion date**: assert the day **after** the period end (beancount checks at start-of-date) — canonical explanation in `.claude/skills/beancount-reconcile/SKILL.md`.
- **Fuzzy-match tolerance**: ±3 days, symmetric (import's dedup, migrate's transfer pairing, reconcile's date-drift window).

### Validation

For any skill that emits beancount, run `bean-check` on the resulting file before declaring success. The `beancount-options` skill bakes this into its workflow as a "Verify" phase.

Use the CLI environment for `bean-check`; CI installs it with `uv sync --all-groups` in `cli/`.

Before opening a skills PR, run the structural suite locally:

```zsh
# from repo root (needs cli deps for bean-check)
cd cli && uv sync --all-groups && cd ..
python3 skills/scripts/ci-check.py
```

This checks SKILL.md frontmatter, `evals.json` validity and fixture paths, Python syntax under skills, the skills-package links, and `bean-check` on every `*ledger.beancount` (with known failure-mode fixtures listed in the script). Run `python3 scripts/check-agent-guidance.py` from the repository root for every `CLAUDE.md` / `AGENTS.md` pair.

### Iterating on a skill

Use the `skill-creator` skill (`/skill-creator`) for the build → eval → review loop. Outputs land in `tmp/<skill-name>-workspace/` (gitignored).

### Scratch space

`skills/tmp/` is gitignored. Drop ledgers, eval outputs, throwaway scripts there while iterating. Don't put scratch at the repo root or inside `.claude/`.

### Adding a new skill

1. Create `.claude/skills/<new-name>/SKILL.md` with `name` and `description` frontmatter.
2. Be explicit in `description` about both when to trigger AND when to skip — Claude tends to undertrigger, but false positives are equally bad.
3. Build a few realistic test prompts in `evals/evals.json`, run them with and without the skill (via `skill-creator` workflow), iterate.
4. Update this CLAUDE.md's Skills table.
