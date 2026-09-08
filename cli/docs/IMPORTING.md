# Importing bank exports

`bea import` calls configured importers using the modern
[Beangulp interface](https://github.com/beancount/beangulp/blob/master/beangulp/importer.py):
`identify(filepath)`, `account(filepath)`, and `extract(filepath, existing)`.
The importer owns bank-specific parsing and categorization. Bea previews the
returned Beancount directives, checks duplicates, validates the candidate
ledger, and applies it only when requested.
The importer must supply explicit amounts on source-account postings so
duplicate matching uses actual bank amounts.

```bash
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

```bash
bea --debug --file books/main.bean import statement.csv --config importers.py
```

With `--json --debug`, the traceback is a string in `error.traceback`; stderr
remains one JSON object and stdout stays empty on failure.

The preview includes every directive, destination accounts, row status, date,
payee, signed source amount, a unified ledger diff, and validation errors.
Duplicate candidates show the existing entry and its source location beside
the explanation. Fix categories or account openings
in the configuration or ledger, then rerun the preview. `--apply` recomputes
the preview from the current files and refuses an invalid result. A concurrent
ledger change during preparation causes exit **4**; no entries are appended.
An `--apply` refused because duplicates need review also exits **4**, including
under `--no-input`. A successful preview or an explicit decision to skip all
duplicates exits **0**.
There is no automatic categorization model or hosted request in this command.

For split ledgers, add `--into 2026.bean` to write an included file while
`--file books/main.bean` continues to identify the validation root. The
destination is relative to the root ledger's directory and must already be
included. The preview's `into` and diff identify the actual destination.

## A runnable example

The bundled [CSV example](examples/csv_importers.py) uses only the standard
library and Beancount, so it runs in the Homebrew installation without extras.
Its input is a categorized export with a signed checking-account amount:

```csv
Date,Payee,Narration,Amount,Currency,Category,BankID
2026-08-02,Cafe,Coffee,-5.25,USD,Expenses:Dining,bank-001
2026-08-03,Employer,Salary,1000,USD,Income:Salary,bank-002
```

From a CLI source checkout, save that as `bank.csv`, then run:

```bash
bea --no-input init books --currency USD --date 2026-08-01
bea --file books/main.bean import bank.csv --config docs/examples/csv_importers.py
bea --file books/main.bean import bank.csv --config docs/examples/csv_importers.py --apply
bea --file books/main.bean check
```

For a bank's native CSV, OFX, or QIF, use an importer for that exact format.
The sample is a configuration example, not a universal bank parser. Legacy
Beancount v2 importers that take a `FileMemo` need Beangulp's `Adapter` in the
configuration; the CLI calls the current interface directly.

## Duplicate decisions

- A stable transaction ID is strong evidence. By default the CLI checks
  transaction metadata `bank_id`, `fitid`, `transaction_id`, and `imported_id`,
  scoped to the importer's source account. Use repeated `--id-key KEY` options
  to replace that list for your importer. IDs must be stable and unique within
  that account. An exact match is skipped; reused IDs with different dates,
  payees, narration, or source amounts are conflicts requiring review.
- Each imported source row gets `bea_import_id` metadata based on the source
  bytes, source account, and row index. Repeating an identical export skips
  those rows even without a bank ID. Keep this metadata when editing entries.
- Date, normalized payee, and signed source amount/currency identify a *possible*
  duplicate even when bank IDs or narration differ. This does not prove
  duplication: two real purchases can have identical details. `--apply` requires
  `--duplicates skip` or `--duplicates include`; choose include to preserve
  legitimate repeated purchases. Review the rows before choosing;
  the choice applies to all possible matches in that invocation.
- Identical nontransaction directives are skipped. Import does not change the
  meaning of existing transactions or delete them; the destination's alignment
  follows `bea format`. Amount corrections and recategorization of
  existing entries remain deliberate ledger edits.

Both existing entries and accepted rows in the same batch participate in
matching. `bea add transactions --from FILE.json` remains a plain validated
append operation and intentionally does not deduplicate.

## Python dependencies and metadata

No extra dependency is needed for the interface itself. Configurations that
import Beangulp or third-party importer packages need those packages in the
same Python environment as `bea`. Use an isolated environment for those imports:

```bash
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
