# Customer-Facing Beancount Skills

Cross-compatible Claude Code and Codex skills that automate Beancount workflows for [Beancount.io](https://beancount.io/) users (see root `AGENTS.md` for repo-wide rules).

This package contains only the eight customer-facing `beancount-*` ledger skills, with canonical implementations under `.claude/skills/` relative to this package. See [README.md](README.md) for the user-facing catalog. Repository development skills live separately in [`../.agents/skills/`](../.agents/skills), with conventions in [`../.agents/AGENTS.md`](../.agents/AGENTS.md). The repository-root `.claude/skills` links to that internal tree.

## Layout

```
skills/
  .claude/
    skills/
      beancount-ask/          Answer ledger questions with shown, re-runnable BQL (read-only)
      beancount-close/        Month-end close ritual: reconcile all, assert, report, commit
      beancount-import/       Import a bank/card export (CSV/OFX/QIF) as categorized, deduplicated entries
      beancount-importer-author/  Write/repair tested beangulp importers from a sample file
      beancount-init/         Scaffold a new ledger (bea init + check; optional Fava)
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
  docs/                       Installation, first-query, first-month, migration, and importer graduation guides, fixtures, rehearsal evidence
  scripts/                    CI checks, suite installer, journey checkpoint verifiers, and tests
  tmp/                        Scratch space — gitignored, safe for experiments
```

Customers install the suite by linking each `beancount-*` directory from a sparse Git checkout into their agent's skill directory with `scripts/beancount-skills.py` ([docs/installation.md](docs/installation.md)). The helper is stdlib-only, owns exactly the directories under `.claude/skills/beancount-*`, and must never install development skills. When skill text starts depending on a new supporting file or sibling, keep the reference in the forms its `verify` resolves: `references/<name>.md` or a bare lowercase `<name>.md`, with the owning sibling named on the same line.

Most stateful `beancount-*` skills have `references/` and `evals/`; small skills may be self-contained. Mutating ledger workflows share the applicable trust rails: propose-then-confirm before writes, categorization restricted to existing accounts, the `import-id` convention from `.claude/skills/beancount-import/references/dedup.md` for externally sourced entries — and a shared tool preference: **one `bea` install** for writes, checks, and JSON reads. Do not tell customers to `pip install beancount` / `beanquery`, and do not configure private engine paths. If the managed engine fails while `bea` is installed, repair/retry provisioning — do not silently fall back to a global `bean-*` tool. Without `bea`, developer bean-* tools or installing `bea` are the explicit fallbacks. Optional Beangulp/Beanprice use `bea engine enable beangulp|beanprice`, then `bea ingest` / `bea price`. Fava browser setup is a separate uv/Fava runtime, not a prerequisite for `bea` operations.

The `bea` primitives are `init` (new ledgers), `add open` (new accounts), `add transactions --from -` (validated batch writes), `add balance` with `--pad-from` (assertions and opening adjustments), `import --csv` with `--rules` (bank exports), `check` (validation), `--json query` / `--json balance` / `list transaction --search` (reads), and `report income-statement --time <month>` (period summaries). Read-only skills do not pretend to have a write/confirmation phase.

The shared execution contract lives in `.claude/skills/beancount-init/references/bea-cli.md`; explicit developer fallbacks and the no-bea init template live beside it in `compatibility.md`. Every ledger command selects the root with `--file`; every directive write selects the approved destination with `--into`. Use decimal strings in batch JSON, preserve source IDs, and distinguish per-command atomicity from multi-command workflows. `add transactions` does not deduplicate, so inspect current entries before retrying a successful batch after a later failure.

CSV details live in `.claude/skills/beancount-import/references/bea-import.md`: pass confirmed sign, account, mapping, date format, durable rules path and destination on every run. The CLI does not remember sign and remembers only the rules path. Its same-date duplicate detector does not replace the suite's ±3-day manual-entry review; mixed keep/skip decisions require a reviewed batch preserving the original source IDs.

The installed-suite [first-month guide](docs/first-month.md) composes init → import → reconcile → ask → close on one synthetic ledger. Its read-only `scripts/verify-first-month.py` checks exact ledger and Git effects against `docs/examples/first-month/expectations.json`; [real-client evidence](docs/first-month-rehearsal.md) remains separate from deterministic tests. The [migration guide](docs/migration.md) runs beancount-migrate on a Monarch export, then beancount-import on overlapping bank exports; `scripts/verify-migration.py` checks it against `docs/examples/migration/expectations.json`, with [real-client evidence](docs/migration-rehearsal.md) kept separately. Its overlap steps rely on `bea import` matching migrated `monarch:sha256:` digests and `import-id-2`, which first ships in `beancount-io` 0.3.1.

The [importer graduation guide](docs/importer-graduation.md) composes importer-author → import from existing CSV history, then repairs renamed headers. It uses a separate Beangulp 0.2.0 authoring environment and public `bea ingest` execution; source-only extraction remains separate from approved balanced writes. Its read-only `scripts/verify-importer-graduation.py` checks independent source identities, exact ledger effects, original goldens, and workspace/Git preservation against `docs/examples/importer-graduation/expectations.json`. The [two-client rehearsal evidence](docs/importer-graduation-rehearsal.md) records macOS runs on published `bea` 0.3.1 and a targeted Codex sandbox-cache correction; it does not establish native Windows or arbitrary importer dependency support.

## Skills

| Skill                             | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beancount-ask`                   | Answer analytical questions about the ledger ("top expenses", "net worth", "what subscriptions crept up") with tested BQL recipes via `bea --json query` (developer `bean-query` only when `bea` is absent). Strictly read-only; every figure comes from a query shown with the answer — never model arithmetic. Ambiguous questions get a clarifying question, not a silent interpretation.                                                                                                                                                                                                   |
| `beancount-close`                 | Month-end close ritual: enumerate active accounts, reconcile each (delegating to `beancount-reconcile`), verify period-end assertions, detect recurring-entry gaps (reported, never fabricated), sweep `!` flags, and land the period's P&L/BS report as a confirm-gated git commit whose body is the close report. A red check (`bea check`; `bean-check` only without `bea`) blocks the commit. Triggers on "close the month".                                                                                                                                                |
| `beancount-import`                | Import a bank/card export file (CSV, OFX/QFX, QIF) as categorized, deduplicated ledger entries. Prefers `bea` when installed (CSV via `bea import --csv` with a rules file, OFX/QIF written with `bea add transactions --from -`, verified with `bea check`); otherwise the seven-stage pipeline. Optional graduated ingest uses `bea engine enable beangulp` then `bea ingest`. Triggers on "import this CSV" / "record my bank export". |
| `beancount-importer-author`       | Write or repair a beangulp (beancount v3) importer from a sample export file, driven by beangulp's golden-file test harness — draft → generate → eyeball → `test` until green; a red harness is never handed over. Enable Beangulp with `bea engine enable beangulp` when using `bea ingest`; authoring may use a local project venv (not the bea frontend). Graduation path from `beancount-import`. Triggers on "write an importer for X" / "my importer broke".                                                                                                                     |
| `beancount-init`                  | Scaffold a fresh `main.bean` from an empty directory via `bea init` + `bea check` when installed (no second Beancount install); optional Fava (`uv add fava`, Makefile) only when requested; without `bea`, writes the same fourteen-account template. Triggers on `/beancount-init` or "set up a new beancount repo".                                                                                                                                                                                                                                                                                                                                                                                             |
| `beancount-migrate`               | Migrate full history from a finance-app export (Mint, Monarch, QuickBooks Online, or any category-tagged CSV) into a fresh ledger: confirm-gated account/category mapping, transfer-pair dedup, opening balances + endpoint `balance` assertions that tie to stated balances, and a migration report that reconciles row counts and balances against the source — deltas surfaced, never forced. Composes `beancount-init`; entries carry `import-id` so later imports dedup against migrated history.                                |
| `beancount-options`               | Turn human-language descriptions of options trades (CSP, covered call, vertical, condor, roll, assignment, exercise, expiration, …) into balanced beancount transactions. Uses per-contract cost basis, IRS-aligned assignment treatment, and verifies with `bea check` (or `bean-check` without `bea`) before reporting success.                                                                                                                                                                                                                                   |
| `beancount-reconcile`             | Reconcile one account against a bank/broker statement (CSV or pasted PDF text). Diffs statement vs ledger into mismatch classes (missing, duplicate, amount-mismatch, date-drift), and — only after confirmation — writes the missing transactions plus a period-end `balance` assertion that ties the account out, through `bea` when installed (`bea add transactions --from -`, `bea add balance`, `--pad-from` for opening adjustments) or appended text otherwise. Reports suspects/duplicates/mismatches for manual fixing; never writes a failing assertion; check-gated. Triggers on "reconcile my checking account" / "does my ledger match my statement". |

## Conventions

### Skill structure

Each customer-facing skill lives at `.claude/skills/beancount-<name>/` within this package, with:

- `SKILL.md` — frontmatter (`name`, `description` for triggering) + body instructions. Keep under ~500 lines; spill into `references/` for deep nuance.
- `references/` — optional files loaded on demand when the body points to them.
- `evals/` — optional `evals.json` + fixtures for `skill-creator` iteration.
- `scripts/` / `agents/` — optional executable helpers or platform metadata when the skill needs them.

### Shared suite conventions — beancount-*

Shared contracts for the `beancount-*` suite (apply each one only to skills that use that behavior, and point to its canonical definition rather than restating it):

- **Ledger discovery**: `fd -e beancount -e bean .` (fallback `find`); the "main" file has `option`/`plugin`/`include` directives or the most `open`s. Confirm when ambiguous.
- **Config blocks**: persisted state lives in `;; <skill-name> config` comment blocks at the top of the main file. Shapes differ deliberately — `beancount-import`'s is **per-source**, including sources handled by the CSV mapper (retain the confirmed sign and durable rules path), and `beancount-reconcile`'s is **per-account**. Import's `negative=outflow` describes an export format; reconcile's `asset|liability` describes account type. Blocks coexist; importer-author reads import's block as its spec. Edit only the reviewed comment block after confirmation; directive writes still go through `bea`.
- **`import-id` metadata**: the dedup convention for every entry that originates from an external source — canonical grammar and hash normalization in `.claude/skills/beancount-import/references/dedup.md` (migrate's `mint:`/`monarch:`/`qbo:` prefixes and importer-author's generated importers follow it; `bea import` writes and matches the same convention, so CLI and skill imports deduplicate each other).
- **Categorization fallback**: suggestions come only from accounts already opened; no confident prior → `Expenses:Uncategorized`, visibly flagged. Never invent an account.
- **Balance-assertion date**: assert the day **after** the period end (beancount checks at start-of-date) — canonical explanation in `.claude/skills/beancount-reconcile/SKILL.md`.
- **Fuzzy-match tolerance**: ±3 days, symmetric (import's dedup, migrate's transfer pairing, reconcile's date-drift window).

### Validation

For any skill that emits beancount, run `bea check` when `bea` is installed (managed engine). Without `bea`, a developer `bean-check` is acceptable; prefer telling the user to install `bea` over `pip install beancount`. The `beancount-options` skill bakes verification into its workflow.

Before opening a skills PR, run the structural suite locally:

```zsh
# from repo root (cli provides bea + the upstream oracle)
cd cli && uv sync --all-groups && cd ..
python3 skills/scripts/ci-check.py
python3 skills/scripts/test_ci_check.py
python3 skills/scripts/test_beancount_skills.py   # installer, first query/month, executable bea recipes
python3 scripts/check-agent-guidance.py
```

This checks both customer and development skill trees: SKILL.md frontmatter, `evals.json` validity and fixture paths, Python syntax, the separate skill directories and Claude Code link, `bea check` with global `bean-*` scrubbed from PATH, and a deliberate oracle `uv run --project cli bean-check` on every `*ledger.beancount` (with known failure-mode fixtures listed in the script). One-install guidance is gated across customer entrypoints and supporting Markdown. Behavioral tests execute marked command recipes from the shared references against isolated ledgers, covering CSV sign/rules on repeat imports, reconcile's decimal tie-out read, close's and ask's recurring-merchant reads over a payee-less import, close's date-bounded period-end balances, the wider duplicate-query window, included-file destinations, failed batches/assertions, and historical initialization. The same test entrypoint loads the first-month, migration, and importer graduation verifier tests and their deterministic journeys; no paid client calls run in CI.

### Iterating on a skill

Use the `skill-creator` skill (`/skill-creator`) for the build → eval → review loop. Outputs land in `tmp/<skill-name>-workspace/` (gitignored).

### Scratch space

`skills/tmp/` is gitignored. Drop ledgers, eval outputs, throwaway scripts there while iterating. Don't put scratch at the repo root or inside `.claude/`.

### Adding a new skill

1. For a customer ledger workflow, create `.claude/skills/beancount-<name>/SKILL.md` with `name` and `description` frontmatter. Put internal repository workflows in `../.agents/skills/` instead.
2. Be explicit in `description` about both when to trigger AND when to skip — Claude tends to undertrigger, but false positives are equally bad.
3. Build a few realistic test prompts in `evals/evals.json`, run them with and without the skill (via `skill-creator` workflow), iterate.
4. Update this AGENTS.md's Skills table and the customer catalog in README.md.
5. `install` links the new directory automatically. Update the expected inventory in `scripts/test_beancount_skills.py`, plus the suite count in `docs/installation.md`, `README.md`, and the root `README.md`.
