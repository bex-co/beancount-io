# ADR 012: Beangulp is not a hard dependency — no-code CSV import via `--csv`

- Status: Accepted — documents the footprint finding and the as-built `--csv` / `--rules` / remembered-mapping design
- Date: 2026-09-08
- Decision owners: CLI (`cli/`)
- Scope: why the default `bea` installation does not depend on beangulp, and
  how `bea import` handles a bank CSV with no Python importer: column
  mapping, pattern categorization, the unmatched queue, remembered mappings,
  and duplicate identity. Related: the [`import-id` convention](../../skills/.claude/skills/beancount-import/references/dedup.md)
  shared with the ledger skills.

## Context

Writing a Beangulp importer is the steepest step in onboarding: a new user
with a bank CSV must write Python before `bea import` does anything. The CLI
already owned preview, duplicate matching, validation, diff, and apply;
only parsing and categorization were importer-owned. A column mapping plus
ordered regex rules covers the common bank CSV without executing user code,
while anything fancier (multi-account splits, OFX/QIF, per-bank quirks) still
takes a Python importer.

Beangulp cannot be that default path because of its footprint. Its runtime
dependencies are lxml, beautifulsoup4, chardet, click, and python-magic —
and python-magic needs the libmagic system library, which no wheel provides.
That is the same class of native-wheel relocation problem the Homebrew
formula already fought with pydantic-core (w2/m25): every native dependency
is a platform-matrix and install-failure risk for a newcomer running
`brew install` or `uv tool install`. The mapper in
`cli/src/cli/csv_mapper.py` is therefore standard library only
(`csv`, `re`, `hashlib`, `tomllib`), reusing the parsing approach already
proven by the bundled `cli/docs/examples/csv_importers.py`. Beangulp is not
in the default install at all: users whose Python importers import it provide
it through their own environment (`uv run --with beangulp`); the mapper never
imports it.

## Decision

- The mapper (`cli/src/cli/csv_mapper.py`) implements the same
  identify/account/extract shape as a Python importer, so everything
  downstream is unchanged. Standard library only: beangulp stays optional.
- The mapping names `date`, `payee` (required), `amount` or the
  `debit`/`credit` pair (exactly one), plus optional `narration`, `id`,
  `currency`, `category`, and `sign=bank|ledger` (default bank: outflows
  negative). Misuse exits 2 naming the field, row, and column.
- Categorization precedence is rules, then the `category` column (explicit
  mapping, else an auto-detected `Category` header), then `--default-account`.
  Rules run in file order against payee first, then narration
  (case-insensitive); the first match wins. Unmatched rows post to the default
  with flag `!` — a categorization queue listed with
  `bea list transaction --flag '!'` — instead of failing the import.
- Rules may name accounts the ledger has not opened; that fails validation
  with the `bea add open` command to run. The importer never opens accounts:
  opening is a ledger decision the user confirms.
- The mapping is remembered per root ledger keyed by a SHA-256 of the CSV
  header row — never file contents — so a bare re-import of the same export
  recalls it (`config_source` `remembered --csv`). An explicit `--csv` run
  updates the record; a changed header matches nothing and the guidance names
  `--csv` again.
- Duplicate identity reuses the shared convention: an `id` column becomes
  `bank_id` metadata, otherwise the `csv:sha256:` content hash, so CLI and
  skill imports deduplicate against each other.

## Consequences

- CSV onboarding needs no Python; importer authors keep the full interface
  for formats the mapper cannot express.
- First-match-wins rules stay predictable at the cost of no scoring or
  learning; the `!` queue is the explicit escape hatch.
- Remembered mappings keyed by header silently stop matching when the bank
  renames a column — by design, surfacing the guidance again rather than
  mis-mapping.
