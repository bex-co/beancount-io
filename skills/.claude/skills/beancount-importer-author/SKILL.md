---
name: beancount-importer-author
description: Write or repair a beangulp importer (the beancount v3 import framework) for a bank/card export format, tested against a sample file until its own harness passes. Use this skill whenever the user wants a reusable Python importer — "write an importer for my Chase CSV", "make this source a real importer", "my importer broke, the bank changed the format", "codify this import so I don't need the agent every week" — or when beancount-import suggests graduating a repeatedly-imported source. The skill drafts the importer (csvbase for CSVs, raw beangulp.Importer otherwise), generates golden files, and iterates until `test` is green; wiring into the user's import script is confirm-gated. SKIP when the user just wants this one file's transactions in the ledger (beancount-import), wants to reconcile (beancount-reconcile), or is migrating full app history (beancount-migrate). The core trigger is "make/fix the reusable importer for this source".
---

# beancount-importer-author

Produce a **tested** beangulp importer from a sample export file — or repair one the bank's format drift broke — and never hand over anything whose harness isn't green.

This skill exists because importers are the most-complained-about chore in beancount: every bank's export is different, formats drift, and a subtly wrong importer silently corrupts data for months. beangulp ships a golden-file test harness that makes correctness *checkable* — the skill's job is to drive that loop: draft → generate golden → eyeball → test → iterate. The deterministic artifact then does the weekly work for free; the agent is only needed again when the format changes.

## Scope — what this skill does and does not touch

**Does:** author one importer per run (Python file), with golden-file tests, from a sample export; repair an existing importer against a new sample; wire the importer into the user's `import.py` (confirm-gated).

**Does not:** import transactions into the ledger (that's running the importer, or `beancount-import`); categorize (beangulp extraction posts the source leg; categorization stays with `smart_importer` or `beancount-import` — don't hardcode guessed counter-accounts); scrape banks; edit the ledger.

Read `references/beangulp-api.md` before writing any code. **Verify the installed API before trusting it or this reference**: `python -c "import beangulp, inspect; help(beangulp.Importer)"` — beangulp's API has sharp edges and versions differ.

## Workflow

Five phases: **Intake → Draft → Test → Wire → (or) Repair.**

### 1. Intake

Need three things:

1. **A sample export file** — no importer gets written without one; ask for a real (redacted is fine) sample.
2. **The target account** — which ledger account this source feeds (`account()`'s return). If a `;; beancount-import config` block exists for this source (the graduation path), **read it as the spec** — schema defined in beancount-import's SKILL.md Discover section: it already holds the confirmed column mapping, sign convention, date format, and account — do not re-ask what the user already confirmed there.
3. **Where importers live** — existing `import.py` / `importers/` layout in the user's ledger repo; match its conventions. None yet? Propose `importers/<source>.py` + a minimal `import.py`.

Inspect the sample's header + rows. Anything the config block doesn't already answer and the data can't prove (sign convention, MDY/DMY): **ask, never guess** — a guessed sign becomes a silently wrong importer.

### 2. Draft

- **CSV sources → `beangulp.importers.csvbase.Importer`** (declarative column mapping — less code, fewer bugs). Raw `beangulp.Importer` subclass only when csvbase can't express it (OFX, multi-table files, weird encodings).
- `identify()` must be **narrow**: match the header signature and/or filename pattern, not just `.csv` — over-matching importers claim other sources' files, a classic footgun.
- Extraction posts the **source-account leg only** (plus balance directives if the file carries balances). No invented counter-accounts.
- **Attach `import-id` metadata to every extracted transaction**, per beancount-import's `references/dedup.md` grammar: the row's native ID when the format has one (OFX `FITID`), else `csv:sha256:` **recomputed deterministically per row** with that reference's exact normalization — never read from config, never random. This keeps the graduated importer's output dedup-compatible with history the `beancount-import` skill already wrote.
- Include `if __name__ == '__main__': from beangulp.testing import main; main(Importer(...))` so the importer file is its own test CLI.

### 3. Test — the non-negotiable loop

```bash
mkdir -p importers/tests/<source> && cp <sample> importers/tests/<source>/
python importers/<source>.py generate importers/tests/<source>   # writes golden .beancount next to sample
# eyeball the golden file WITH THE USER — dates, signs, payees, amounts against the sample
python importers/<source>.py test importers/tests/<source>       # must be green
```

The golden-file eyeball is the human gate: generated goldens encode whatever the importer *does*, right or wrong — confirm a few rows against the raw sample before blessing them. Iterate draft ↔ test until green. **A red harness is never handed over as done** — if it can't be made green, say exactly what's unresolved.

Also sanity-run `extract` and `bean-check` the output appended to a scratch copy of the ledger when the user wants end-to-end proof.

### 4. Wire

Show the diff to `import.py` (adding the importer to the list) and any new files; write only on explicit yes. Suggest committing the importer + tests together so drift-repairs have a baseline.

### 5. Repair (drift path)

When an existing importer fails on a new file:

1. Reproduce: run `identify`/`extract` on the new sample, capture the exact failure (or the silent mis-extraction — diff extract output against a few hand-read rows).
2. Diagnose the drift: renamed headers, new columns, date-format change, sign flip.
3. **Patch minimally** — don't rewrite a working importer to fix a header rename.
4. Add the new sample to the test corpus, regenerate its golden (eyeball it), keep the old samples' goldens passing too — drift repair must not break historical re-imports.
5. Green harness on old + new samples, then show the patch for confirmation.

## What NOT to do

- Don't write an importer without a sample file, and don't hand over a red or untested one.
- Don't guess signs/dates/columns — config block first, provable data second, ask third.
- Don't over-match in `identify()`.
- Don't hardcode counter-account categorization into the importer.
- Don't bless golden files without eyeballing rows against the raw sample with the user.
- Don't rewrite on a drift-repair when a minimal patch does, and don't let old goldens go red.
- Don't wire into `import.py` without explicit confirmation.
