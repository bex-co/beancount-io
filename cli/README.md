# beancount-io

`bea` is the command-line interface for [Beancount.io](https://beancount.io).
Create and edit plain-text Beancount ledgers, import bank exports, validate
accounts, run BQL queries, and generate financial reports. Local bookkeeping
needs no Beancount.io account. Optional AI assistance and hosted ledger
management use your Beancount.io credentials.

The Python distribution is **`beancount-io`**; its executable is **`bea`**.
This reference describes the current source tree. Run `bea --version` and
`bea COMMAND --help` to check the version and options you have installed.

## Contents

- [Install](#install) · [Quick start](#quick-start)
- [Command map and global options](#command-map-and-global-options)
- [Create a ledger](#create-a-ledger) · [Write safely and use split ledgers](#write-safely-and-use-split-ledgers)
- [Add directives](#add-directives) · [Import bank exports](#import-bank-exports)
- [List directives](#list-directives) · [Check, format, and query](#check-format-and-query)
- [Financial reports](#financial-reports)
- [AI assistance](#ai-assistance) · [Cloud commands](#cloud-commands)
- [JSON and automation](#json-and-automation) · [Configuration and stored state](#configuration-and-stored-state)
- [Update and uninstall](#update-and-uninstall)
- [Development](#development) · [Releases](#releases) · [License](#license)

## Install

### Homebrew

On macOS or Linux with Homebrew:

```bash
brew install bex-co/tap/bea
bea --version
bea --help
```

The formula installs a managed Python environment with the release's
hash-pinned dependencies. The release workflow tests the exact source archive
through a clean Homebrew installation on macOS before publishing it.

### uv

Alternatively, install with [uv](https://docs.astral.sh/uv/) and Python 3.12
or newer:

```bash
uv tool install beancount-io
```

The default installation, including Homebrew, omits AI dependencies. If you
use uv and want `bea ask`, install the extra:

```bash
uv tool install 'beancount-io[ask]'
```

Homebrew users can run the optional command in a separate uv environment
without replacing their `bea` installation:

```bash
uvx --from 'beancount-io[ask]' bea ask --help
```

See [AI assistance](#ai-assistance) for authentication and data flow.

## Quick start

Create a ledger, record a purchase, and inspect the result:

```bash
bea --no-input init ~/my-books --currency USD --date 2026-08-01 \
  --opening-balance "Assets:Checking 1000"
cd ~/my-books

bea add transaction "Coffee" --date 2026-08-02 \
  --posting "Expenses:Dining 12.50" --posting "Assets:Checking"

bea check
bea list transaction --limit 10
bea report balance-sheet
bea query "SELECT account, sum(position) GROUP BY account"
```

The purchase leaves **987.50 USD** in checking. The currency comes from the
account, and Beancount fills in the balancing posting. Use your own history
start date and balances when creating real books; accounts must be open on
the dates you record.

For everyday capture, `add transaction` defaults to today. For guided setup,
run `bea init books` in a terminal. For a bank export, start with an
[import preview](#import-bank-exports).

## Command map and global options

| Command | Purpose |
| --- | --- |
| `bea init [DIRECTORY]` | Create a local ledger with common accounts |
| `bea add TYPE` | Append one of eleven directive types |
| `bea add transactions --from FILE.json` | Append a batch of transactions |
| `bea import SOURCE` | Preview or apply a configured bank importer |
| `bea list TYPE` | Inspect directives and filter transactions |
| `bea check` | Validate the complete ledger |
| `bea format [PATH]` | Format a file or recursively format a directory |
| `bea query [BQL]` | Run a query or start the interactive BQL shell |
| `bea report TYPE` | Overview, income statement, balance sheet, or trial balance |
| `bea balance [ACCOUNT…]` | Trial-balance subtrees for matching accounts |
| `bea ask [QUESTION]` | Ask about a local ledger through the hosted AI service |
| `bea cloud …` | Sign in and manage hosted ledgers |
| `bea upgrade [--check]` | Check for an update or invoke the owning package manager |

Put global options **before the command**:

```bash
bea --file books/main.bean check
bea --json list transaction --limit 100
bea --debug import bank.csv --config importers.py
```

| Global option | Behavior |
| --- | --- |
| `--file / -f PATH` | Select the local root ledger |
| `--json` | Use machine-readable output; implies `--no-input`; see [exceptions](#json-and-automation) |
| `--no-input` | Disable CLI prompts; missing required input or confirmation exits 2 |
| `--strict` | Refuse partial answers even in a terminal; `--allow-errors` opts into them |
| `--yes / -y` | Confirm operations such as cloud deletion; does not grant AI write permission |
| `--debug` | Include exception tracebacks in human errors or `error.traceback` in JSON |
| `--shell NAME` | Choose `bash`, `zsh`, `fish`, `powershell`, or `pwsh` for completion |
| `--show-completion` | Print shell completion; detect the shell unless `--shell` is supplied |
| `--install-completion` | Install completion for the detected or selected shell |
| `--version` | Print the installed version and exit without a network request |
| `--help / -h` | Show help; also available on subcommands |

For example, `bea --shell zsh --show-completion` works when a wrapper prevents
shell detection. `bea check -f main.bean` is not accepted; use
`bea -f main.bean check`.

### Choose the target

Local ledger commands resolve the entry file in this order: `--file PATH`,
then `BEA_FILE`, then `main.bean` in the working directory. The target must be
an existing file. Missing files and directory targets exit 2 with guidance.

Two commands choose their own paths:

- `init` creates a new file from its directory/file argument, or from global
  `--file`. It ignores `BEA_FILE`.
- `format` uses its own positional path, defaulting to the working directory.
  Global `--file` and `BEA_FILE` do **not** select the formatting target.

Cloud commands target the hosted service and use `owner/name` for ledger
identity. There is no global `--ledger` option or implicit upload of local
files.

## Create a ledger

```bash
bea init books
```

The wizard asks for the operating currency, earliest history date, and
checking opening balance. Invalid answers re-prompt the current question
while preserving earlier answers. Unattended setup requires `--currency`:

```bash
bea --no-input init books --currency EUR --date 2026-08-01 \
  --opening-balance "Assets:Checking 1000" \
  --opening-balance "Liabilities:CreditCard -50"
```

These are alternative setup examples; `init` never overwrites an existing
file. The path defaults to `.`. A directory creates `main.bean`; a
`.bean`/`.beancount` path names the new file directly. Use either that
argument or global `--file`, not both.

| Option | Default and meaning |
| --- | --- |
| `--currency / -c SYMBOL` | Required without a terminal; interactive default `USD` |
| `--date YYYY-MM-DD` | Opening/history date; interactive prompt or today |
| `--opening-balance "ACCOUNT NUMBER"` | Repeat for template asset/liability accounts; amounts use the operating currency |

All template accounts open on that date:

| Root | Accounts |
| --- | --- |
| Assets | `Assets:Checking`, `Assets:Savings`, `Assets:Cash` |
| Liabilities | `Liabilities:CreditCard` |
| Income | `Income:Salary`, `Income:Interest` |
| Expenses | `Expenses:Groceries`, `Expenses:Dining`, `Expenses:Rent`, `Expenses:Transport`, `Expenses:Utilities`, `Expenses:Fees` |
| Equity | `Equity:OpeningBalances` |

Opening balances are dated as of the opening day and offset against
`Equity:OpeningBalances`. Credit card debt is negative. Add other accounts
with `bea add open`. To backfill before the chosen date, edit the relevant
account opens and ensure the opening balances still describe that history.

Currency input is normalized to uppercase. Beancount symbols include custom
and crypto commodities; there is no ISO registry check. A symbol such as `US`
is valid syntax but triggers a typo warning because it is not three uppercase
letters. JSON setup returns such warnings in `data.warnings`.

New ledger files are private: **0600 on POSIX**, readable and writable only
by the owner. To make a ledger group-readable, explicitly run
`chmod 640 books/main.bean`. Later writes preserve its permissions.

## Write safely and use split ledgers

`add` and `import --apply` load the entire candidate ledger through
Beancount's parser, booking, plugins, and validation before replacing the
destination atomically. Invalid changes leave the original bytes intact.
Read-only destinations fail with exit 3, even if directory permissions would
allow replacement.

By default, additions go to the root file. For a split ledger, keep `--file`
pointed at the root and use `--into` to choose an included file:

```beancount
; books/main.bean
option "operating_currency" "USD"
include "accounts.bean"
include "2026.bean"
```

```bash
bea --file books/main.bean add transaction --into 2026.bean \
  --date 2026-08-02 -n "Groceries" \
  -p "Expenses:Groceries 30" -p "Assets:Checking"
```

Here `accounts.bean` must already open the accounts. The destination must
exist and be included by the root; relative `--into` paths resolve beside
the root. All add commands, imports, and interactive AI writes support this
option. A read-only root can validate a writable included destination.

Concurrent CLI writes coordinate through locks in the cache directory.
Changes to the root, included files, or include-glob membership during
preparation abort the write with exit 4 and a retry message. Successful adds
and imports never modify existing lines: the appended block matches the
destination's indentation and amount column, and `bea format` is the only
command that realigns a file.

`bea add TYPE --allow-errors` is an explicit way to stage semantic errors.
Syntax must still parse, and pad accounts must still be active. Prefer the
atomic `add balance --pad-from` workflow below to an unfinished pad/balance pair.

## Add directives

Every single-directive command accepts `--date YYYY-MM-DD`, `--into FILE`,
and `--allow-errors`. **Only `add transaction` defaults the date to today**;
the other types require it.

### Transactions

```bash
bea add transaction "Groceries" --payee "Corner Market" \
  -p "Expenses:Groceries 30" -p "Assets:Checking" \
  --flag '!' --tag household --link receipt-42 --meta 'receipt:IMG_42.jpg'
```

| Transaction option | Meaning |
| --- | --- |
| `--posting / -p POSTING` | Required; repeat for each posting |
| `--date YYYY-MM-DD` | Transaction date; default today |
| `--flag CHARACTER` | One-character flag; default `*`; `!` marks an entry for review |
| `--payee TEXT` | Optional other party |
| `--narration / -n TEXT` | Optional description; empty narration is valid and lists as `(no narration)` |
| `--tag TAG` | Repeatable; accepts a tag with or without `#` |
| `--link LINK` | Repeatable; accepts a link with or without `^` |
| `--meta KEY:VALUE` | Repeatable transaction metadata |

Postings accept native Beancount syntax:

- One posting may omit its amount; Beancount infers the balance.
- A numbered posting may omit currency when the account has one allowed
  currency, or the ledger has one compatible operating currency. Specify a
  symbol when it is ambiguous.
- Decimal amounts and arithmetic such as `84/2 EUR` work. Use decimal
  notation such as `1000`, not exponent notation such as `1e3`.
- Costs use `{100 USD}` or total-cost syntax `{{1000 USD}}`; prices use `@`
  or `@@`. Cost-lot booking validates purchases and sales.

For example, after opening a brokerage account:

```bash
bea add open --date 2026-08-01 -a Assets:Brokerage -c AAPL
bea add transaction "Buy AAPL" --date 2026-08-03 \
  -p "Assets:Brokerage 2 AAPL {100 USD}" -p "Assets:Checking -200 USD"
```

A currency exchange needs its actual transaction rate, for example
`-p "Assets:Euro 100 EUR @ 1.08 USD" -p "Assets:Checking -108 USD"`, with
`Assets:Euro` open in EUR. The CLI never invents a rate to balance a trade.

Metadata values such as `--meta 'receipt:IMG_42.jpg'` become strings. Native
numbers, booleans, dates, and amounts retain their types:

```text
--meta 'reviewed:TRUE'
--meta 'rate:1.125'
--meta 'received:2026-08-03'
--meta 'fee:2.50 USD'
--meta 'code:"1234"'
```

Inner quotes force a string; `--meta 'note:""'` records an empty one. Keys
must be distinct and cannot use reserved source fields `filename` or `lineno`.
Payees, narrations, and string metadata in single adds, bulk adds, and imports
replace CR/LF line breaks with spaces. Quotes and backslashes retain their
contents, keeping bank-supplied transaction text readable in ledger diffs.

### Other directive types

The table lists required fields and any extra optional fields. The shared
`--date`, `--into`, and `--allow-errors` options also apply.

| Type | Required fields | Optional fields and aliases |
| --- | --- | --- |
| `open` | `--account / -a` | Repeated `--currency / -c` to constrain allowed currencies |
| `close` | `--account / -a` | — |
| `balance` | `--account / -a`, `--amount "NUMBER CURRENCY"` | `--pad-from ACCOUNT`, `--pad-date YYYY-MM-DD`; amount accepts `NUMBER ~ TOLERANCE CURRENCY` |
| `pad` | `--account / -a`, `--source / -s` | — |
| `note` | `--account / -a`, `--comment / --message / -m` | — |
| `event` | `--type / -t`, `--description / -d` | — |
| `price` | `--currency / --commodity / -c`, `--amount "NUMBER CURRENCY"` | The currency option names the commodity being priced |
| `commodity` | `--currency / --commodity / -c` | — |
| `document` | `--account / -a`, `--filename / --path` | Repeated `--tag` and `--link` |
| `custom` | `--type / -t` | Repeated `--value / -v KIND:VALUE` |

Account names follow Beancount syntax: a capitalized root and colon-separated
segments beginning with an uppercase letter or digit. Unicode letters and
configured root names are supported. Unknown or closed account errors include
account creation guidance or the relevant open/close locations.

A balance assertion checks the balance at the **start of its date**. To
record a balancing adjustment and its assertion together:

```bash
bea add balance --date 2026-08-31 -a Assets:Checking \
  --amount "1538 ~ 1 USD" --pad-from Equity:OpeningBalances
```

This adds a pad on the previous day and a balance with a nonnegative tolerance.
Use `--pad-date` to choose another earlier day. Both accounts must be active
when the pad runs. A standalone pad needs a later balance to consume it;
`--allow-errors` can stage that intermediate state, but cannot bypass an
invalid pad account.

`add price` skips an exact date/commodity/price duplicate anywhere in the
included ledger and reports its existing location. This is a successful
no-op: JSON has `written: 0` and `duplicate: true`. A different date or price
is a new directive.

Document paths resolve relative to the file containing the directive, not
the shell's working directory. With `--into years/2026.bean`, a filename of
`receipt.pdf` means `years/receipt.pdf` beside that included file. The document
must exist for normal validation.

Custom values support `text`, `number`, `amount`, `account`, `bool`, and `date`:

```bash
bea add custom --date 2026-08-01 --type budget \
  --value "text:travel" --value "amount:500 USD"
```

### Bulk transactions from JSON

`bea add transactions --from transactions.json` accepts a JSON **array** (use `--from -` to read it from stdin):

```json
[
  {
    "date": "2026-08-04",
    "narration": "Groceries",
    "postings": [
      {"account": "Expenses:Groceries", "amount": "45.00 USD"},
      {"account": "Assets:Checking"}
    ],
    "meta": {"receipt": "R-43", "reviewed": true}
  }
]
```

The transaction requires `date` and `postings`. Optional fields are `flag`
(default `*`), `payee`, `narration`, `tags`, `links`, and `meta`.

| Posting field | Shape |
| --- | --- |
| `account` | Required account name |
| `amount` | Shorthand string, e.g. `"-45 USD"` |
| `units` | Alternative to `amount`: `{"number":"-45","currency":"USD"}` |
| `cost` | `{"number":"100","currency":"USD"}`; optional `date` and `label` |
| `price` | `{"number":"120","currency":"USD"}` |
| `flag` | Optional posting flag |
| `meta` | Optional posting metadata object |

Omit `amount` and `units` for the balancing posting. Supplying both or unknown
posting fields is an error. Store decimal numbers as strings to preserve
precision. Transaction and posting metadata use JSON strings/booleans directly;
other native types use tagged objects:

```json
{
  "rate": {"kind": "number", "value": "1.125"},
  "received": {"kind": "date", "value": "2026-08-04"},
  "fee": {"kind": "amount", "number": "2.50", "currency": "USD"}
}
```

JSON transaction listings also contain `source.filename` and `source.lineno`.
That optional `source` object is accepted on input but never written as metadata.

The complete batch is validated before writing. Any rejected row normally
leaves the ledger unchanged and exits 1. `--partial` instead tries rows in
input order, writes the valid subset, and **still exits 1** if any row was
rejected. JSON failures report the outcome in `error.result`, including
`written`, `written_rows`, and `rejected_rows` where applicable. JSON row
indexes are zero-based; human row numbers are one-based. Bulk add accepts
`--into` and `--allow-errors` and does **not** deduplicate transactions.

See the [detailed usage examples](https://github.com/bex-co/beancount-io/blob/main/cli/docs/USAGE.md#adding-directives)
for additional directive and investment examples.

## Import bank exports

An importer parses and categorizes a specific bank format. Bea previews its
output, checks duplicates, validates the candidate ledger, and writes only
when `--apply` is present:

```bash
bea import bank.csv --config importers.py
bea import bank.csv --apply
```

The Python configuration exports `CONFIG = [importer, ...]`. Importers use the
modern Beangulp interface: `identify(filepath)`, `account(filepath)`, and
`extract(filepath, existing)`. Source-account postings must contain explicit
amounts for duplicate matching. There is no built-in universal bank parser,
automatic categorization model, or hosted AI call in this command.

| Option | Behavior |
| --- | --- |
| `--config PATH` | Python configuration; explicit path takes precedence |
| `--importer NAME` | Choose a configured importer; unknown names list the available names |
| `--apply` | Recompute the preview and apply accepted entries |
| `--duplicates review/skip/include` | Default `review`; decide how to handle possible matches |
| `--id-key KEY` | Repeat to replace the default bank-ID metadata keys |
| `--into FILE` | Write an included file while validating against the root |

Configuration lookup uses the explicit `--config`, then the path remembered
for that root ledger, then `importers.py` beside the root. It does not search
parent directories or an unrelated working directory. Human output names the
path and its source; JSON uses `config` and `config_source` (`--config`,
`remembered`, or `default beside root ledger`). Configuration files execute
Python, so use a configuration you trust. Sibling Python imports work.

The preview contains row numbers, dates, payees, source amounts, accounts,
duplicate reasons and existing locations, a proposed diff, and validation
errors. Correct the importer or ledger and preview again as needed.

Duplicate matching considers existing entries and accepted rows in the batch:

- Stable IDs in `bank_id`, `fitid`, `transaction_id`, or `imported_id` are
  scoped to the source account, and `import-id` / `import-id-2` always match.
  Exact matches are skipped; a reused ID with conflicting transaction details
  requires review.
- Imported rows carry `import-id` metadata (`bank:<id>` for bank IDs,
  `csv:sha256:<16 hex>` content hashes otherwise) shared with the ledger
  skills, so CLI and skill imports deduplicate each other. Retain this
  metadata to recognize repeat imports; pre-release `bea_import_id` entries
  still match.
- Matching date, normalized payee, and signed source amount/currency signal
  a **possible duplicate**, even when bank IDs or narrations differ.
- Identical nontransaction directives are skipped.

Possible duplicates block `--apply` with exit 4 and the affected row numbers.
After reviewing, use `--duplicates skip` or `--duplicates include`; that
choice applies to all possible matches in the invocation. Skipping all rows
is a successful no-op. Validation failures exit 1. Both refusal paths write
zero entries and include the preview in JSON `error.result`. No confirmation
flag turns an ID conflict or invalid ledger into an accepted import.

The [import guide](https://github.com/bex-co/beancount-io/blob/main/cli/docs/IMPORTING.md)
includes a runnable [categorized CSV importer](https://github.com/bex-co/beancount-io/blob/main/cli/docs/examples/csv_importers.py),
legacy-adapter guidance, and dependency setup. The interface itself needs no
extra package; importers that import Beangulp or third-party packages need
those dependencies in the Python environment running `bea`. For example:

```bash
uv run --with beancount-io --with beangulp \
  bea --file books/main.bean import bank.ofx --config importers.py
```

Add `--with YOUR_IMPORTER_PACKAGE` when needed. Importer output is captured in
`importer_output` rather than mixed into JSON. Use global `--debug` for an
importer exception's traceback.

## List directives

`bea list TYPE` supports `transaction`, `open`, `close`, `balance`, `pad`,
`note`, `event`, `price`, `commodity`, `document`, and `custom`.

| Option | Applies to | Behavior |
| --- | --- | --- |
| `--limit / -l N` | All types | Positive limit; default 50 |
| `--from-date YYYY-MM-DD` | All types | Inclusive lower date bound |
| `--to-date YYYY-MM-DD` | All types | Inclusive upper date bound |
| `--allow-errors` | All types | Return partial data despite loader errors |
| `--account / -a TEXT` | Transaction, open, close, balance, pad, note, document | Case-insensitive account substring |
| `--currency / -c SYMBOL` | Price, commodity | Case-insensitive exact symbol; price filters the commodity being priced |
| `--sort newest/oldest` | Transaction | Default `newest`; applied before the limit |
| `--flag CHARACTER` | Transaction | Filter a flag before applying the limit |
| `--search TEXT` | Transaction | Case-insensitive substring over payee and narration; repeatable |
| `--tag TAG` | Transaction | Tag with or without `#`; repeatable |
| `--link LINK` | Transaction | Link with or without `^`; repeatable |
| `--details` | Transaction | Render Beancount syntax, all postings, metadata, and source locations |

```bash
bea list transaction --limit 10
bea list transaction --flag '!' --details
bea list transaction -a checking --from-date 2026-08-01 --to-date 2026-08-31
bea list transaction --search netflix --tag trip
bea list price --currency eur
```

Transaction tables show signed posting amounts. With `--account`, the column
is labeled `MATCHING POSTING AMOUNTS` and contains only matching postings.
`--details` and JSON still include **all** postings of each selected
transaction. Details are rendered from loaded entries, including inferred
amounts; they are not byte-for-byte source excerpts.

Other directive lists retain chronological order. JSON returns the directive
array in `data`, with `limit` and `truncated` in the envelope. Increase the
limit when you need the full result; local lists have no page option.

## Check, format, and query

### Check

```bash
bea check
```

`check` loads and validates the root and its includes, returning exit 0 for a
valid ledger and exit 1 for ledger errors. There are no command-specific
options. `query`, `list`, and `report` are lenient in a terminal — they print
the data with the errors as a banner on stderr and exit 0 — and strict under
`--json`, with piped stdout, under `CI`, or with `--strict`, where they exit 1
unless `--allow-errors` requests the partial answer.

### Format

```bash
bea format main.bean
bea format books
bea format books --dry-run
bea format books --check
```

The positional target is a `.bean`/`.beancount` file or a directory, searched
recursively; it defaults to `.`. This is independent of global `--file`.
Formatting preserves permissions and can process included files without
loading their root accounts or executing plugins.

| Mode | Writes files? | Exit status when formatting is needed |
| --- | --- | --- |
| Default | Yes, one atomic replacement per changed file | 0 after success |
| `--dry-run` | No; reports files it would format | 0 |
| `--check` | No; suitable for CI and pre-commit hooks | 1; 0 when already formatted |

Every mode reports syntax errors with a file and line, skips those files, and
exits 1. A recursive run continues through the other files; normal mode may
therefore format valid files while returning an error. JSON scan results
contain `scanned`, `formatted` (changed or would-change paths), `skipped`,
`dry_run`, and `check`; on failure they appear in `error.result`.

### Query

```bash
bea query "SELECT account, sum(position) GROUP BY account"
bea --json query "SELECT date, payee, narration LIMIT 10"
bea query
```

Queries use Beanquery's BQL against the loaded ledger. Table output preserves
the full precision of result values, including calculated amounts. An empty
result prints `(no rows)` on stderr; JSON returns an empty `data.rows` array.
JSON also includes `data.columns`, each with a `name` and `type`.

The default BQL table has one row per posting. Use `SELECT DISTINCT` when you
want distinct combinations of fields such as date, payee, and narration.

Omitting the query opens the interactive BQL shell after validation. Use
`exit` or `quit` to leave. A query argument is required without a terminal or
in JSON mode. `--allow-errors` permits querying a ledger with loader errors.

## Financial reports

| Command | Output |
| --- | --- |
| `bea report overview` | Assets, liabilities, income, expenses, net worth, and interval series |
| `bea report income-statement` | Income/expense account trees, net profit, and period rows |
| `bea report balance-sheet` | Asset/liability/equity trees and derived equity reconciliation |
| `bea report trial-balance` | Account balances across the ledger |

All four reports accept these options:

| Option | Behavior |
| --- | --- |
| `--conversion / -x VALUE` | Currency symbol, `units`, `at_cost`, or `at_value` |
| `--time / -t PERIOD` | Year, month, day, or range; relative periods such as `month` and `year` also work |
| `--account / -a FILTER` | Select entries involving matching accounts; retains all their postings |
| `--allow-errors` | Show partial results with loader errors or missing prices identified |

All except `trial-balance` also accept `--interval / -i`: `monthly` (default),
`quarterly`, `yearly`, `weekly`, or `daily`.

```bash
bea report overview --time 2026-08
bea report income-statement --time 2026 --interval quarterly
bea report balance-sheet --time "2026-01 - 2026-08" --conversion USD
bea report trial-balance --conversion units
bea balance Checking
```

`bea balance [ACCOUNT…]` is a trial balance pruned to the subtrees whose
account names contain any argument (case-insensitive), keeping ancestors for
structure with their totals. Closed accounts are excluded from filtered views.
With no argument it prints the trial balance.
It accepts `--conversion`, `--time`, and `--allow-errors`, and returns the
same tree shape in JSON.

Time filters include `2026`, `2026-08`, `2026-08-31`, `2026-Q3`, `2026-W32`,
and relative `year`, `quarter`, `month`, `week`, or `day`. Offsets such as
`month-1` select previous periods. Fiscal forms (`FY2026`, `FY2026-Q3`,
`fiscal_year`, `fiscal_quarter`) use the ledger's Fava fiscal-year settings,
defaulting to a December 31 year end. Ranges accept `START - END` or
`START to END` and include the final period. Account matching supports account
components and case-insensitive regular expressions. Invalid or reversed
date ranges exit 2.

### Valuation and signs

The default conversion is the ledger's sole operating currency. With zero or
multiple operating currencies, it is `units`, which keeps commodities
separate. `at_cost` uses acquisition costs; `at_value` uses market values with
cost fallback where a quote is unavailable.

Reports convert what has a price and keep the rest in units. Each interval
row is valued at its own date, so a June quote cannot value a January
interval: earlier rows stay in the source commodity while later rows convert.
A missing price never fails a terminal report — stderr carries one summary
line per commodity, for example `VACHR has no USD price at any date; shown in
units`. Under `--json`, with piped stdout, under `CI`, or with `--strict`, a
missing price exits 1 unless `--allow-errors` is passed; the error details
carry the same per-commodity summary. Record a historically appropriate quote
with `bea add price --date DATE -c EUR --amount "RATE USD"`, or use
`--conversion units` to inspect unconverted quantities.

Partial conversion keeps source-currency amounts and marks combined totals
unavailable. JSON has `valuation: "partial"`, `missing_prices`, and
`missing_price_dates` (`from`, `to`, `date`); affected net-profit/net-worth
totals are `null` in the requested currency. A null missing-price date means
no quote was available at any date for an unfiltered summary.

Text amounts use the ledger's display precision per currency (half up);
JSON keeps full-precision decimal strings.

Reports retain Beancount signs: income, liabilities, and equity are normally
negative. **Net profit is `-(income + expenses)`**, positive for a gain.
Income-statement period rows use the same signs as the summary. Overview
income/expense series are interval flows; asset/liability series are balances.

The balance sheet derives `current_earnings`, `valuation_adjustment`, and
`equity_total` for reconciliation; it does not write new ledger directives.
`equity_reconciled` indicates whether that reconciliation is available.
Unconverted units, missing prices, or an invalid ledger prevent it from
claiming a complete reconciliation.

Report JSON identifies `period.start`, `period.end_exclusive`, `as_of`,
`conversion`, `account_filter`, `balance_signs`, `ledger_valid`, and
`ledger_errors`. Use these fields when comparing or storing report results.

## AI assistance

`bea ask` requires **both** the optional `ask` dependencies and Beancount.io
credentials. Sign in with `bea cloud login`, or supply `BEA_TOKEN`.

```bash
# With the uv-installed ask extra:
bea cloud login
bea ask "What did I spend on groceries last month?" --print

# With the base CLI installed by Homebrew:
uvx --from 'beancount-io[ask]' bea ask "What did I spend last month?" --print
```

`bea ask` without `--print / -p` opens an interactive session in a terminal.
An optional question pre-fills the input; submit it to begin. Use `--print` to
answer once and exit. Non-interactive mode also answers once and requires a
question. `ask` has no JSON output; use `bea query` for machine-readable data.

Ledger queries and validation run locally, while the model runs through the
hosted Beancount.io AI service. Questions, supplied skill context, and tool
results are sent to that service. The current command uses `gpt-4o` and has no
model-selection flag.

Interactive edits are previewed, confirmed, validated, and written atomically.
Choose `--into FILE` for an included destination. The write tool accepts dated
directives; edit options, includes, and plugins directly in the ledger. AI
write permission is separate from global `--yes`. One-answer/non-interactive
mode cannot obtain that permission and does not apply AI-proposed writes.

### Project instructions for Ask

Ask discovers `NAME/SKILL.md` files in:

1. `.agents/skills/` under the **working directory**, regardless of `--file`.
2. `skills/` under the [user configuration directory](#configuration-and-stored-state).

Project skills override user skills with the same name. Each file needs YAML
frontmatter with a nonempty `name` and `description`, followed by Markdown
instructions. Invalid files are skipped. Ask initially supplies the model
with names and descriptions; it loads full instructions on demand. Interactive
prompt history is saved in `ask_history` in the configuration directory.

## Cloud commands

Cloud commands provide account sign-in and hosted ledger management. They do
not change which local file `--file` selects.

| Command | Arguments and behavior |
| --- | --- |
| `bea cloud login` | Interactive browser/device sign-in; stores credentials locally |
| `bea cloud logout` | Attempts remote logout and clears stored credentials; does not unset `BEA_TOKEN` in your shell |
| `bea cloud status` | Show the authenticated account and credential status |
| `bea cloud ledger list` | `--page` (default 1), `--limit` (default 50, API maximum 100) |
| `bea cloud ledger show OWNER/NAME` | Show a hosted ledger |
| `bea cloud ledger create NAME` | Optional `--description / -d`; `--private / --public` (default private) |
| `bea cloud ledger clone OWNER/NAME` | Clone over SSH; optional `--dir PATH` |
| `bea cloud ledger delete OWNER/NAME` | Permanently delete; asks for confirmation or requires global `--yes` unattended |

Creation also accepts `--clone` and `--dir PATH` to clone the new ledger.
Cloning requires Git and configured SSH access; the default destination is
the ledger name under the working directory.

```bash
bea cloud login
bea cloud ledger list
bea cloud ledger create my-books --private --clone --dir ./my-books
bea --json cloud ledger show alice/my-books
bea --no-input --yes cloud ledger delete alice/old-books
```

Replace `alice` with the ledger owner. Creation and cloning are separate
operations: if cloning fails after creation, the hosted ledger still exists.
The CLI reports uncertain remote write outcomes as exit 4; inspect the hosted
state before retrying.

## JSON and automation

Use global `--json` for structured results:

```bash
bea --json --file books/main.bean list transaction --limit 100
bea --json --file books/main.bean report overview --time 2026-08
```

A successful result has this envelope; `bea` contains the installed version:

```json
{
  "bea": "0.1.0",
  "target": {"file": "/home/alice/books/main.bean"},
  "data": [],
  "truncated": false,
  "limit": 100
}
```

`data` is command-specific. `limit` appears for limited listings. Targets use
`file`, `directory`, or `server`, or are `null` for untargeted operations.
Writes to an included file also identify `into`. Dates are ISO strings and
decimal quantities are strings, preserving precision.
The [directive models](https://github.com/bex-co/beancount-io/blob/main/cli/src/cli/directives/models.py)
define the exact object fields for directive listings and bulk input.

Failures write the error object to stderr instead of a success on stdout:

```json
{
  "error": {
    "category": "validation",
    "message": "Transaction does not balance.",
    "exit_code": 1,
    "details": ["main.bean:18: Transaction does not balance: (2.50 USD)"]
  }
}
```

`details`, `result`, `request_id`, and `traceback` are included when applicable.
`result` carries useful operation state, such as an import preview or a
partially accepted batch. `--debug` adds the traceback.

### Exit codes

| Code | Error category | Meaning |
| --- | --- | --- |
| 0 | — | Success, including previews and intentional duplicate skips |
| 1 | `validation` | Ledger/schema error, formatting check failure, or other runtime failure |
| 2 | `usage` | Invalid arguments, missing file/input, or missing optional dependencies |
| 3 | `auth` | Authentication or permission failure, including a read-only destination |
| 4 | `conflict` | Concurrent change, import review required, existing init target, or uncertain remote write outcome |

A nonzero exit does not universally mean nothing changed:
`add transactions --partial` can write accepted rows; recursive `format` can
format valid files while skipping broken ones; `cloud ledger create --clone`
can create a ledger before cloning fails. Read the operation result before
retrying mutations.

Cloud HTTP errors use the same categories: 400 maps to 2, 401/403 to 3, 409 to
4, and other statuses to 1. An uncertain remote mutation outcome maps to 4.

### Prompts and output exceptions

CLI prompts are disabled with `--no-input`, `--json`, non-terminal stdin, or
a truthy `CI`. Supply all required inputs and use `--yes` for a deliberate
cloud deletion. Import duplicate decisions still require `--duplicates`; AI
writes still require their own interactive permission.

Local bookkeeping commands and `upgrade` return JSON envelopes, as do cloud
status and ledger listing, inspection, creation, and deletion. Current
exceptions are:

- `ask` rejects JSON mode.
- `cloud login` requires interaction, so JSON mode cannot start it.
- Successful `cloud logout` and `cloud ledger clone` emit no JSON success
  object; use their exit status.
- Help, version, and completion output retain their own text formats.
- `upgrade` can stream package-manager output to stderr, including in JSON
  mode; its external package manager controls any prompts of its own.

Human diagnostics normally use stderr. Terminal reads show loader warnings
and missing-price summaries as a banner; strict reads need `--allow-errors`
for the partial answer. Report JSON records loader errors in `ledger_errors`.
Partial results should not be treated as a successful ledger check.

## Configuration and stored state

There is no general-purpose CLI configuration file. Environment variables
select targets, endpoints, and state directories:

| Variable | Purpose and default |
| --- | --- |
| `BEA_FILE` | Root ledger fallback after `--file`; otherwise `./main.bean` |
| `BEA_CONFIG_DIR` | Override the entire user configuration directory |
| `XDG_CONFIG_HOME` | Configuration base when `BEA_CONFIG_DIR` is unset: `$XDG_CONFIG_HOME/bea`, falling back to `~/.config/bea` |
| `XDG_CACHE_HOME` | Cache base: `$XDG_CACHE_HOME/bea`, falling back to `~/.cache/bea` |
| `BEA_TOKEN` | Hosted credential override; takes precedence over stored credentials and is not saved to disk |
| `BEA_API_URL` | Hosted API base; default `https://api.v3.beancount.io` |
| `BEA_DASHBOARD_URL` | Browser sign-in destination base; default `https://beancount.io` |
| `BEA_NO_UPDATE_NOTIFIER` | Disable passive update notices when truthy |
| `CI` | Disable interaction and passive update notices when truthy |

Truthy values are `1`, `true`, `yes`, and `on`, ignoring case and surrounding
whitespace. The configuration directory contains `credentials.json`,
`ask_history`, user `skills/`, remembered importer paths under `importers/`,
and channel-specific update-check JSON caches. Stored credentials use mode
0600 on POSIX. Exported environment tokens remain under your shell's control.

Persistent write locks live in the **cache** directory's `locks/`, keyed by
resolved file path. They remain after release to keep waiting processes
coordinated; no lock sidecars are created in ledger directories.

Local ledger commands do not need hosted credentials. Passive update checks
may contact the package registry or tap; set `BEA_NO_UPDATE_NOTIFIER=1` to
disable them. Explicit `upgrade --check` still checks for an update. Ledger
plugins and importer configurations run their own Python code and control
any I/O they perform.

## Update and uninstall

```bash
bea upgrade --check
bea upgrade
```

`--check` reports the installed version, latest available version, and detected
installation method without running an upgrade. An unavailable latest version
is reported as unknown. `upgrade` invokes the package manager that owns the
installation:

| Installation | Upgrade directly | Uninstall |
| --- | --- | --- |
| Homebrew | `brew upgrade bea` | `brew uninstall bea` |
| uv tool | `uv tool upgrade beancount-io` | `uv tool uninstall beancount-io` |
| pipx | `pipx upgrade beancount-io` | `pipx uninstall beancount-io` |

Editable checkouts receive manual update guidance and exit 0; unrecognized
installations receive guidance and exit 2. The CLI does not replace its own
installed files. `--check` returns success even when the latest version cannot
be determined. A failed package-manager run exits 1.

Interactive installed copies make a best-effort update check at most once a
day, using the installation's channel. Notices are suppressed under JSON,
non-interactive use, CI, development installs, or
`BEA_NO_UPDATE_NOTIFIER=1`. `--version` only consults an existing cache.
Uninstalling the executable leaves your ledgers and user state in place.

## Development

Run package commands from `cli/`:

```bash
git clone https://github.com/bex-co/beancount-io.git
cd beancount-io/cli
uv sync --all-groups
uv run bea --help
make check-all
```

Development dependencies include the Ask extra. The CLI uses Python 3.12+,
Typer, Beancount v3, Beanquery, Pydantic, and a vendored Fava reporting subset.
It does not start the Fava web interface.

| Path | Responsibility |
| --- | --- |
| `src/cli/` | Command UX, directives, write safety, imports, credentials, API client, and Ask |
| `src/fava/` | Vendored reporting library; retain `NOTICE.fava` attribution |
| `tests/` | CLI, accounting, automation, and release regression tests |
| `docs/` | Detailed [usage](https://github.com/bex-co/beancount-io/blob/main/cli/docs/USAGE.md) and [import](https://github.com/bex-co/beancount-io/blob/main/cli/docs/IMPORTING.md) guides and examples |
| `openapi/v1.json` | Pinned contract for generated hosted commands and REST transport |
| `scripts/` | Code generation, release validation, formula rendering, and installation smoke tests |

| Make target | Purpose |
| --- | --- |
| `lint` | Ruff checks |
| `deadcode` | High-confidence Vulture detection |
| `deadcode-fix` | Remove Ruff-fixable unused imports/variables, then rerun Vulture; review the diff |
| `format` / `format-check` | Format/check Python source; separate from the `bea format` ledger command |
| `typecheck` | Strict mypy checks |
| `test` | Pytest suite |
| `check-all` | Handoff/CI gate: lint, deadcode, format-check, typecheck, test, and spec-check |
| `spec-check` | Check the OpenAPI pin against the backend's canonical spec |
| `spec-sync` | Refresh the pin from the canonical backend spec |
| `codegen` | Regenerate the REST client and cloud command stubs |
| `release-check` | Validate the release tag/version format |
| `release-lock` | Export hash-pinned release dependencies |

Do not hand-edit generated API clients, command stubs, or lockfiles. Update
dependencies with uv; `uv.lock` is tracked, while `requirements.lock` is
generated for release and ignored by Git. Keep scratch files under `tmp/`.
See [the package guide](https://github.com/bex-co/beancount-io/blob/main/cli/CLAUDE.md)
for architecture boundaries and contribution rules.

## Releases

The [Release (cli) workflow](https://github.com/bex-co/beancount-io/blob/main/.github/workflows/release-cli.yml)
runs on `cli-vX.Y.Z` tags. The version must use canonical numeric components,
match `pyproject.toml`, and tag a commit on `main`. Prerelease suffixes are
not accepted by the current release tooling.

The workflow validates the tag, runs `make check-all`, exports a hash-pinned
`requirements.lock`, builds the source distribution and wheel, and tests that
exact source distribution through a temporary Homebrew tap on macOS. After
the checks pass, it publishes to PyPI using trusted publishing, creates the
GitHub Release, and pushes `Formula/bea.rb` to `bex-co/homebrew-tap`.
Publication is sequential across these services; a downstream failure may
require rerunning the workflow to finish distributing an already-published
version.

### Prepare and tag

After choosing the release version, update `pyproject.toml` and regenerate
the lock with `uv lock`. From `cli/`, validate and test the installation:

```bash
make check-all
make release-lock
release_version=$(make -s release-check)
uv build --out-dir tmp/release
bash scripts/test-homebrew.sh "tmp/release/beancount_io-${release_version}.tar.gz"
```

The local Homebrew test requires that `bea` is not already installed through
Homebrew. It installs an unlinked keg and cleans up that keg and its temporary
tap on exit. Python and uv prerequisites installed by Homebrew may remain.

Commit the version change and land it on `main` before tagging that commit:

```bash
release_version=$(make -s release-check)
git tag "cli-v${release_version}"
git push origin "cli-v${release_version}"
```

### Publishing setup and rehearsal

Configure these once outside the repository:

- **PyPI trusted publishing:** register project `beancount-io` with owner
  `bex-co`, repository `beancount-io`, workflow `release-cli.yml`, and
  environment `production`. Configure TestPyPI likewise for rehearsals;
  publishing uses no stored PyPI API token.
- **`BEA_TAP_PUSH_KEY`:** a write deploy key for `bex-co/homebrew-tap`, stored
  as a repository or `production` environment secret. A tag release checks
  for this key before either channel publishes.

Manual `workflow_dispatch` runs the build and installation checks. With
`test: true` (the default), it also publishes to **TestPyPI**, without creating
a GitHub Release or updating the tap. With `test: false`, a manual run performs
validation only. Neither manual mode requires the tap key.

## License

[MIT](https://github.com/bex-co/beancount-io/blob/main/LICENSE) © Beancount.io.
Vendored Fava attribution is preserved in
[NOTICE.fava](https://github.com/bex-co/beancount-io/blob/main/cli/NOTICE.fava).
