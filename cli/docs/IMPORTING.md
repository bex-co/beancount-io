# Importing bank exports

A bank CSV needs no Python importer: name its columns with `--csv`, preview,
then apply. Bea previews the resulting Beancount directives, checks
duplicates, validates the candidate ledger, and applies only when requested.

```bash
bea --no-input init books --currency USD --date 2026-08-01
cat > statement.csv <<'EOF'
Date,Payee,Narration,Amount
2026-08-02,Whole Foods,groceries,-20.00
2026-08-03,Shell,gas,-40.00
2026-08-04,Unknown Shop,mystery,-9.99
EOF
bea --file books/main.bean add open --date 2026-08-01 --account Expenses:Transport:Fuel -c USD
bea --file books/main.bean add open --date 2026-08-01 --account Expenses:Uncategorized -c USD
cat > rules.toml <<'EOF'
[[rule]]
match = "whole foods|trader joe|corner market"
account = "Expenses:Groceries"

[[rule]]
match = "shell|chevron|exxon"
account = "Expenses:Transport:Fuel"
EOF
bea --file books/main.bean import statement.csv --csv date=Date,amount=Amount,payee=Payee,narration=Narration --account Assets:Checking --rules rules.toml
bea --file books/main.bean import statement.csv --apply
```

The first import previews every row; the mapping is remembered, so `--apply`
re-runs flag-free. The `rules.toml` above matches the bundled
[rules example](examples/rules.toml). The walkthrough as written exits **0**
throughout and leaves one `!`-flagged row for the categorization queue below.
A Python importer remains the advanced path for formats the column mapping
cannot express; it is documented second, under
[A Python importer (`--config`)](#a-python-importer---config).

The preview includes every directive, destination accounts, row status, date,
payee, signed source amount, a unified ledger diff, and validation errors.
Duplicate candidates show the existing entry and its source location beside
the explanation. Fix categories or account openings
in the mapping, rules, or ledger, then rerun the preview. `--apply`
recomputes the preview from the current files and refuses an invalid result.
A concurrent ledger change during preparation causes exit **4**; no entries
are appended. An `--apply` refused because duplicates need review also exits
**4**, including under `--no-input`. A successful preview or an explicit
decision to skip all duplicates exits **0**.
There is no automatic categorization model or hosted request in this command.

For split ledgers, add `--into 2026.bean` to write an included file while
`--file books/main.bean` continues to identify the validation root. The
destination is relative to the root ledger's directory and must already be
included. The preview's `into` and diff identify the actual destination.

## CSV without an importer (`--csv`)

The mapping implements the same identify/account/extract shape as a Python
importer, so preview, duplicate matching, validation, diff, and apply are
unchanged. The walkthrough above is the whole interface; this section is the
reference:

`--csv` takes `field=Column` pairs. `date` and `payee` are required;
`narration`, `id`, and `currency` are optional. Amounts take either
`amount=Column` or the `debit=A,credit=B` pair (exactly one of the two): with
the pair, exactly one cell per row must be filled, debits post negative.
Amounts default to bank sign (outflows negative); add `sign=ledger` when the
export uses the opposite convention. Dates parse as `%Y-%m-%d` unless
`--date-format` says otherwise. The currency defaults to the ledger's single
operating currency. `--account` names the source account and is required. The
file may start with a BOM; header cells are stripped before matching. Unknown
fields, missing columns, bad dates, and bad amounts fail with the row number
and column name. Misuse exits **2**.

An `id` column becomes `bank_id` metadata, so stable bank IDs deduplicate like
a Python importer's. Rows without one get the same `csv:sha256:` content hash
described under [Duplicate decisions](#duplicate-decisions).

### Categorization rules (`--rules`)

A TOML rules file categorizes rows by regex over payee, then narration
(case-insensitive); the first matching rule wins:

```toml
[[rule]]
match = "whole foods|trader joe"
account = "Expenses:Groceries"
```

See the bundled [rules example](examples/rules.toml). Each entry needs
`match` and `account`; a bad regex or a file without a `[[rule]]` list fails
naming the rule number. Rules beat a `category` column: an explicit
`category=Column` mapping, or a `Category` header when unmapped, categorizes
rows the rules skip. Rows nothing matches post to `--default-account`
(`Expenses:Uncategorized`) with flag `!`, while matched rows carry `*`. The
preview's `RULE` column names the winning pattern (or the category value, or
`unmatched`), and JSON rows carry the same value in `rule`. List the
categorization queue with `bea list transaction --flag '!'`, categorize, and
re-import only after opening any missing accounts: a rule naming an account
the ledger does not open fails validation with the `bea add open` command to
run.

The mapping is remembered per root ledger keyed by the CSV header row, so the
next import of the same export needs no flags: human output reports
`Using remembered column mapping for <file>` and JSON reports
`config_source` `remembered --csv`. An explicit `--csv` run updates the
remembered mapping. A changed header row matches nothing remembered, and the
missing-importer guidance names `--csv` again.

## A Python importer (`--config`)

For formats the column mapping cannot express, `bea import` calls configured
importers using the modern
[Beangulp interface](https://github.com/beancount/beangulp/blob/master/beangulp/importer.py):
`identify(filepath)`, `account(filepath)`, and `extract(filepath, existing)`.
The importer owns bank-specific parsing and categorization. The importer must
supply explicit amounts on source-account postings so duplicate matching uses
actual bank amounts.

```bash norun
# Needs a Python importer file; the runnable example below provides one.
bea --file books/main.bean import statement.csv --config importers.py
bea --file books/main.bean import statement.csv --apply
```

The Python configuration must export `CONFIG = [importer, ...]`. An import
executes this Python file, so use your own local configuration. The selected
path is remembered per root ledger. An explicit `--config` overrides it;
without a saved path, the CLI uses `importers.py` beside the root ledger.
It does not search the working directory or parent directories for Python files.
Human output reports `Using importers from <path> (<source>)` on stderr. The
source is `--config`, `remembered`, or `default beside root ledger`. JSON
includes the path in `config` and its source in `config_source`.
If multiple importers recognize the export, select one with `--importer NAME`.
An unknown name lists the available importer names; a recognized name whose
importer rejects the file reports that separately.
The configuration can import sibling modules. Importer output is captured in
the preview's `importer_output` field so it does not corrupt JSON.
For importer exceptions, put `--debug` before the command to see the traceback:

```bash norun
# Needs a Python importer file; shows where a traceback would appear.
bea --debug --file books/main.bean import statement.csv --config importers.py
```

With `--json --debug`, the traceback is a string in `error.traceback`; stderr
remains one JSON object and stdout stays empty on failure.

## A runnable example

The bundled [CSV example](examples/csv_importers.py) uses only the standard
library and Beancount, so it runs in the Homebrew installation without extras.
Its input is a categorized export with a signed checking-account amount.
From a CLI source checkout, run:

```bash
bea --no-input init books-py --currency USD --date 2026-08-01
cat > bank.csv <<'EOF'
Date,Payee,Narration,Amount,Currency,Category,BankID
2026-08-02,Cafe,Coffee,-5.25,USD,Expenses:Dining,bank-001
2026-08-03,Employer,Salary,1000,USD,Income:Salary,bank-002
EOF
bea --file books-py/main.bean import bank.csv --config docs/examples/csv_importers.py
bea --file books-py/main.bean import bank.csv --config docs/examples/csv_importers.py --apply
bea --file books-py/main.bean check
```

For a bank's native CSV, try [`--csv`](#csv-without-an-importer---csv)
first; for OFX or QIF, or a CSV the mapping cannot express, use an importer
for that exact format.
The sample is a configuration example, not a universal bank parser. Legacy
Beancount v2 importers that take a `FileMemo` need Beangulp's `Adapter` in the
configuration; the CLI calls the current interface directly.

## Duplicate decisions

`bea import` follows the [`import-id` convention](../../../skills/.claude/skills/beancount-import/references/dedup.md),
so entries written by the CLI and by the `beancount-import` / `beancount-migrate`
skills deduplicate against each other: the ledger itself is the dedup database.

- A stable transaction ID is strong evidence. By default the CLI checks
  transaction metadata `bank_id`, `fitid`, `transaction_id`, and `imported_id`,
  scoped to the importer's source account, and always checks `import-id` and
  `import-id-2`. Use repeated `--id-key KEY` options to replace the native-ID
  list for your importer (a custom key uses its own name as the namespace).
  IDs must be stable and unique within that account. An exact match is skipped;
  reused IDs with different dates, payees, narration, or source amounts are
  conflicts requiring review.
- A row with a native ID is written with `import-id: "<kind>:<id>"` (`bank_id`
  becomes `bank:`, `fitid` becomes `ofx:`). A row without one is written with
  `import-id: "csv:sha256:<16 hex>"` hashed from
  `date|amount|description|account` per the convention: the ISO date, the
  source amount with exactly two decimals, the narration (or payee when
  narration is empty) uppercased with whitespace collapsed, and the source
  account. Identical rows within one file take an occurrence suffix, so
  re-importing the same file skips every row. Keep this metadata when editing
  entries. New writes no longer carry the pre-release `bea_import_id` key, but
  existing entries with it still match on re-import.
- Date, normalized payee, and signed source amount/currency identify a *possible*
  duplicate even when bank IDs or narration differ. This does not prove
  duplication: two real purchases can have identical details. `--apply` requires
  `--duplicates skip` or `--duplicates include`; choose include to preserve
  legitimate repeated purchases. Review the rows before choosing;
  the choice applies to all possible matches in that invocation.
- Identical nontransaction directives are skipped. Import does not change the
  meaning of existing transactions or delete them, and never modifies existing
  lines: the appended block matches the destination's indentation and amount
  column, and `bea format` remains the only command that realigns a file.
  Amount corrections and recategorization of existing entries remain deliberate
  ledger edits.

Both existing entries and accepted rows in the same batch participate in
matching. `bea add transactions --from FILE.json` remains a plain validated
append operation and intentionally does not deduplicate.

## Python dependencies and metadata

No extra dependency is needed for the interface itself. Configurations that
import Beangulp or third-party importer packages need those packages in the
same Python environment as `bea`. Use an isolated environment for those imports:

```bash norun
# Needs network for the isolated environment plus a bank OFX export.
uv run --with beancount-io --with beangulp \
  bea --file books/main.bean import bank.ofx --config importers.py
```

Add `--with YOUR_IMPORTER_PACKAGE` when needed. This is separate from the
Homebrew-managed environment and does not alter its files.

Native transaction and posting metadata are retained, including booleans,
decimal numbers, dates, and amounts. Custom directive boolean/date values also
survive listing and serialization. See [the JSON reference](USAGE.md#investment-postings-and-metadata)
for the typed metadata representation used by `bea list transaction` and
`bea add transactions`.

Imported payees, narrations, and string metadata replace CR/LF line breaks with
spaces before preview, duplicate matching, and writing. A quoted multiline CSV
field therefore stays on one ledger line, keeping merchant-provided text
readable in diffs and tables. Quotes and backslashes retain their contents;
typed metadata retains its type.

In global `--json` mode, preview and successful application return the normal
envelope. An application blocked by conflicts or validation exits **4** or
**1** and includes the full preview in `error.result`, with `written: 0`.
Review refusals also list the affected preview row numbers and reasons in
the error details, including in human `--apply` output.
