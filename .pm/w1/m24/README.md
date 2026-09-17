# w1 · m24 — Bank CSVs import as exported: delimiters, amounts, encodings, IDs

**Worker:** worker1 **Goal:** the documented no-code CSV path works on the exports people actually download — semicolon and tab delimiters, cp1252 and BOM encodings, currency symbols and accounting negatives, blank trailer rows, and bank identifier columns — without writing a Python importer **Status:** todo (t001, t002, t003, t004, t005, t006, t007 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Sniff CSV delimiters and accept a `--csv delimiter=` override — **DONE** | 45m | — |
| t002 | Decode BOM, cp1252 and latin-1 exports with a `--csv encoding=` override — **DONE** | 30m | — |
| t003 | Parse the amount spellings real bank exports use — **DONE** | 45m | — |
| t004 | Skip blank rows and name the columns that tied for a role — **DONE** | 30m | — |
| t005 | Recognize bare id columns and align `--id-key` with what the CSV path writes — **DONE** | 30m | — |
| t006 | Refuse an empty rules match and honor the category column the preview promises — **DONE** | 45m | — |
| t007 | Make sticky CSV recall visible and safe — **DONE** | 45m | — |
| t008 | Block preview rows whose counter-account is not open | 30m | — |
| t009 | Adoption surface | 25m | t001, t002, t003, t004, t005, t006, t007, t008 |
| t010 | Simplify | 30m | t009 |
| t011 | Test coverage | 45m | t009, t010 |
| t012 | Closeout | 15m | t011 |

## Definition of done

- A fixture set of real-world-shaped exports imports through the documented no-code path with no Python importer and no manual editing: a US bank export using `$1,000.00` and `(4.50)`, an EU export delimited by `;` with `1.000,00` amounts, a tab-delimited broker export, a cp1252 file with accented payees, a UTF-8 BOM file, a file with blank trailer rows, and a file whose identifier column is a bare `ID`.
- For each fixture, `bea import --csv auto` previews correctly, `--apply` writes, and `bea check` passes afterwards; running the same import twice reports duplicates rather than writing the rows again.
- Non-finite amounts (`NaN`, `Infinity`) and rows whose counter-account is not open are blocked at preview and can never be applied; `--apply` refuses while any row is blocked.
- A header where two columns claim one role fails with both columns named and the resolving `--csv` line shown; an undecodable file fails with the byte offset and the encodings tried.
- Remembered CSV settings are printed in every preview, are never applied to an export whose convention disagrees, and are never discarded silently; a missing remembered rules path degrades to a warning.
- Rules refuse an empty `match` and can match the category column the preview suggests. `cli/docs/IMPORTING.md` and `cli/docs/TUTORIAL.md` describe this behavior and every fenced example in them runs in CI; `cd cli && make check-all` passes.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w1` 2026-09-16, item 2. Absorbs continuous CLI QA inbox notes w3/226 (major), 227, 237 (major), 256, 263, 265, 276, 279 (major), 280, 281, 308 (major), 310, 311 (major), 342, 368, and w5/003 (same cause as w3/281).
- **Goal linkage:** **A2 — Frictionless onboarding**, with **A1** for the agent route: the no-code CSV import is the tutorial's fourth step and the `beancount-import` skill's primary path. An import that fails on the first real bank file is an onboarding cliff, not a missing power feature.
- **Expected outcome:** A newcomer with a non-US or Windows-exported bank file completes the tutorial's import step with the file they already have, and the `beancount-import` skill stops falling back to "write a Python importer" for ordinary exports.
- **Why now:** w1/m16 shipped the no-code path and w1/m14 fixed its dedup convention; this is the second wave, found by running real export shapes through it. `w3/226` currently stops every semicolon-delimited export on step one and then offers a recovery that cannot work, so the documented path is broken for a large share of non-US users. Sequenced before further import features so they build on a parser that reads real files.
- **Adoption surface:** included — the importing guide, the tutorial, the generated reference and the `beancount-import` / `beancount-migrate` skills are all customer- and agent-facing.
