# w1 · m16 — No-code CSV import: column mapping and rules without a Python importer

**Worker:** worker1 **Goal:** a newcomer imports their first bank CSV with one command that names the columns, and a repeat import is `bea import bank.csv --apply`; writing a Python importer becomes the advanced path, not the entry ticket **Status:** done

## Tasks (in order)

| id   | title                                                                                     | est | depends_on |
| ---- | ----------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | Built-in column-mapping importer behind `bea import --csv` — **DONE**                     | 90m | —          |
| t002 | `--rules FILE`: payee and narration patterns to accounts; unmatched rows flagged `!` — **DONE** | 60m | t001 |
| t003 | Remember the mapping and rules per source so a repeat import needs no flags — **DONE**    | 30m | t002       |
| t004 | Docs lead with the no-code path; ADR records why beangulp is not a hard dependency — **DONE** | 45m | t003   |
| t005 | Adoption surface — **DONE**                                                               | 20m | t004       |
| t006 | Simplify — **DONE**                                                                       | 30m | t005       |
| t007 | Test coverage — **DONE**                                                                  | 60m | t005       |
| t008 | Closeout — **DONE**                                                                       | 15m | t007       |

## Definition of done

- `bea import bank.csv --csv date=Date,amount=Amount,payee=Description --account Assets:Checking` previews every row through the existing preview, duplicate review, diff, validation, and `--apply` path with no Python file involved; `--csv` also accepts `narration=`, `id=`, `currency=`, and a `sign=` convention, and reports the first unparseable row with its line number.
- `--rules rules.toml` maps regular expressions over payee and narration to accounts; unmatched rows post to a configurable default account (default `Expenses:Uncategorized`, which must exist) with flag `!`, so `bea list transaction --flag '!'` is the categorization queue.
- After one successful `--csv` import, `bea import bank.csv` and `bea import bank.csv --apply` reuse the remembered mapping and rules for that root ledger, and `--config` still takes precedence when given.
- `cli/docs/IMPORTING.md` and `cli/README.md` show the no-code path first and the Python path second; `docs/adrs/ADR<NNN>-cli-beangulp-not-a-hard-dependency.md` records the footprint finding.
- The default installation gains no new dependency; `make check-all` passes from `cli/`.

## Source + Goal linkage

- **Source:** CLI UX review 2026-09-08 — importing a bank export requires writing a Python importer class; the docs say so plainly and the example importer works, but it is the steepest cliff in a newcomer's first week. Checked before proposing: beangulp's runtime dependencies are lxml, beautifulsoup4, chardet, click, and python-magic (which needs the libmagic system library), the same class of native-wheel relocation problem the Homebrew formula already fought with pydantic-core (w2/m25). A standard-library mapper like `cli/docs/examples/csv_importers.py` avoids that.
- **Goal linkage:** **A2 — Frictionless onboarding:** the first import is the moment a newcomer decides whether plain-text accounting is for them. **A1 — Agent-native accounting:** an agent can drive `--csv` and `--rules` from flags and JSON without authoring code, and the flagged queue is a deterministic handoff to `bea ask` or the `beancount-import` skill for categorization.
- **Expected outcome:** the import walkthrough in the docs no longer asks the reader to save a Python file; a weekly import is one command; `bea import --csv` appears in agent transcripts where the `beancount-importer-author` skill used to be invoked.
- **Why now:** preview, dedup, diff, validation, and atomic apply already exist (w2/m24); this is the last mile. Sequenced after m14 so the mapper writes the final `import-id` shape from day one. Adoption surface included: new flags, new docs, and a new ADR.
