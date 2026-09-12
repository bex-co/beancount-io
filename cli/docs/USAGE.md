# Usage

The Beancount.io CLI installs one command: `bea`. New here? Start with the
[first-month tutorial](TUTORIAL.md), then use this guide as the contract.

```text
# Local — works on .bean files
bea init [DIRECTORY] --currency USD
bea import EXPORT [--config importers.py] [--into FILE] [--apply]
bea import EXPORT.csv --csv date=Date,amount=Amount,payee=Payee --account Assets:Checking [--rules rules.toml]
bea check | format | query "<BQL>"
bea list <type> | bea add <type>          # eleven directive types; add transactions --from PATH
bea report balance-sheet | income-statement | trial-balance | overview
bea balance [ACCOUNT…]                    # trial balance pruned to matching subtrees
bea ask ["question"]                      # requires beancount-io[ask] and hosted credentials

# Cloud — the beancount.io hosted service
bea cloud login | logout | status
bea cloud ledger list | create [--clone] | show | clone | delete

# CLI maintenance
bea upgrade [--check]
```

Everything outside `bea cloud` works on local files (`ask` is the one exception: its model calls run through the hosted AI proxy). Everything under `bea cloud` needs a session from `bea cloud login` or `BEA_TOKEN`.

## One install — no separate Beancount setup

Install `bea` from Homebrew or PyPI. Customers do **not** install Beancount,
Beanquery, or Fava themselves, and do not put `bean-*` tools on `PATH`. The
`bea` frontend never loads those libraries; local ledger work runs through a
managed engine environment that `bea` provisions.

| Channel | Provisioning | Offline reuse | Upgrade |
| --- | --- | --- | --- |
| Homebrew (`brew install bex-co/tap/bea`) | Frontend and engine virtualenvs are created during installation | Local commands use the keg-local engine with no further download | `bea upgrade` → `brew upgrade bea` refreshes both |
| PyPI (`uv tool install beancount-io` or pipx) | First local command that needs the engine downloads the hash-pinned combination (needs network and `uv` on `PATH`) | Later commands reuse `$XDG_DATA_HOME/bea/engine/<version>` (default `~/.local/share/bea/engine/…`) | `bea upgrade` upgrades the frontend and rebuilds the matching engine |

If first-use or upgrade provisioning fails, fix network/`uv` availability and
retry a local command such as `bea check` — do not `pip install beancount`.
A broken managed environment is discarded and rebuilt on the next successful
provision; global `bean-check` decoys on `PATH` are ignored.

Optional Beangulp ingest adapters and Beanprice quote fetching are **not** in
the base install (tracked as milestone m20). Ledger-skill instructions that
still suggest installing Beancount separately are pending alignment (m21).

## Global options

Global options come before the command.

| Option | Description |
|---|---|
| `--file / -f PATH` | Ledger entry file. Overrides `BEA_FILE` and `./main.bean`. |
| `--json` | Emit the JSON envelope on stdout and JSON errors on stderr. Implies `--no-input`. |
| `--no-input` | Never prompt. Missing confirmation or input fails with exit 2 instead of waiting. |
| `--strict` | Refuse partial answers even in a terminal; `--allow-errors` opts into them. |
| `--yes / -y` | Answer confirmations with yes. |
| `--debug` | Include exception tracebacks; JSON errors gain a `traceback` string. |
| `--show-completion` / `--install-completion` | Print or install shell completion. |
| `--shell NAME` | Select bash, zsh, fish, powershell or pwsh when generating completion. |
| `--version` | Print the version and exit. Makes no network call. |
| `-h / --help` | Show help. |

```bash
bea --file main.bean check
bea --json list transaction --limit 100
bea --shell zsh --show-completion
```

### Choosing the ledger

Local commands resolve their target in this order:

1. `--file PATH`
2. `$BEA_FILE`
3. `./main.bean` in the working directory

If the resolved file does not exist, the command exits **2** and names all three sources. Hosted targeting (`--ledger`) is not implemented yet.
Passing a directory also exits **2** with a hint to select its root ledger file.
Hosted commands name ledgers as `owner/name`; local files are never implicitly
uploaded. `init` creates its target from its own argument or global `--file`
and ignores `BEA_FILE`; `format` uses its own positional path and likewise
ignores both.

### Non-interactive behavior

`--no-input` is implied whenever stdin is not a terminal, whenever `--json` is set, and when `CI` is truthy. In that mode nothing waits for a human. Import duplicate decisions still require `--duplicates`, and AI writes still require their own interactive permission:

```bash norun
# Needs hosted credentials; demonstrates the unattended refusal.
$ echo | bea cloud ledger delete alice/books
Error: Permanently delete ledger 'alice/books'? Refusing to ask — pass --yes to confirm without a prompt.
$ echo $?
2
```

## Exit codes

| Code | Category | Meaning |
|---|---|---|
| 0 | — | Success |
| 1 | `validation` | Ledger or validation error, and the catch-all for any other runtime failure |
| 2 | `usage` | Bad arguments, missing target, missing extra, or input needed under `--no-input` |
| 3 | `auth` | Authentication or permission failure |
| 4 | `conflict` | Conflict, or a write whose outcome is unknown |

A nonzero exit does not universally mean nothing changed:
`add transactions --partial` can write accepted rows, recursive `format` can
format valid files while skipping broken ones, and
`cloud ledger create --clone` can create a ledger before cloning fails. Read
the operation result before retrying mutations.

In `--json` mode a failure writes nothing to stdout and one object to stderr:

```json
{
  "error": {
    "category": "validation",
    "message": "Ledger has 3 error(s). Pass --allow-errors to report anyway.",
    "exit_code": 1,
    "details": ["main.bean:1: Transaction does not balance: (2.50 USD)"]
  }
}
```

`request_id` is included when the backend supplied one.

Cloud commands map the server's HTTP status onto the same table, keeping the server's own message: `401`/`403` exit **3**, `400` exits **2**, `409` exits **4**, and everything else — including `404`, rate limiting, and server errors — exits **1**. A write whose outcome the CLI cannot know (a timeout mid-delete) exits **4** and says so rather than guessing.

## Creating a ledger

```bash
# bea init books prompts for currency, history start date, and opening
# balance when run in a terminal; the unattended form below runs anywhere.
bea --no-input init books --currency EUR --date 2026-08-01 \
  --opening-balance "Assets:Checking 1000" \
  --opening-balance "Liabilities:CreditCard -50"
```

These are alternative ways to create a new ledger. `init` never overwrites an
existing file. Pass a directory (creates `main.bean`) or a `.bean`/`.beancount`
path; the global `--file` can also name the new file, but use either that
argument or `--file`, not both. To backfill before the chosen date, edit the
relevant account opens and ensure the opening balances still describe that
history. New ledger files are
private by default (`0600` on POSIX: readable and writable only by their owner).
For group-readable books, explicitly run `chmod 640 books/main.bean` after
creation. Subsequent add/import/format writes preserve the file's permissions.
`BEA_FILE` does not redirect
`init`. Without a terminal, `--currency` is required and the date defaults to
today. Interactively, choose the earliest date you intend to record. Use
`--date` when importing older history; opening balances must be as of that date.
An inactive-account error shows the account's opening/closing date and file
location so you can correct the date without creating another open directive.
Invalid answers re-prompt the current question while keeping earlier answers.
Invalid command-line options still fail with exit **2**.

The personal template opens checking, savings, cash, credit card, salary,
interest, groceries, dining, rent, transport, utilities, fees, and opening
equity accounts. Opening balances use that currency and balance against
`Equity:OpeningBalances`; credit card debt is negative. Add other accounts with
`bea add open` before posting to them.

Currency symbols follow Beancount syntax, including custom and crypto symbols;
the CLI does not check an ISO currency registry. `init --currency US` is valid
syntax, but emits a typo warning because the symbol is not three uppercase
letters. The warning appears on stderr, or in `data.warnings` in JSON mode.
Lowercase input such as `usd` is normalized to `USD`.

## Checking, formatting, querying

```bash
# Parse, validate and realize the ledger
bea check

# Format to stdout, or rewrite the files with --in-place / -i
bea format main.bean               # formatted text on stdout; the file is untouched
bea format main.bean -o clean.bean # or to a file of your choosing
bea format -i main.bean            # rewrite it
bea format -i .                    # rewrite every .bean/.beancount file under a directory
bea format . --dry-run             # write nothing; list the files that would change
bea format . --check               # CI/pre-commit: exit 1 if any files need formatting

# Run a BQL query and print a table; omit the query for the interactive shell
bea query "SELECT account, sum(position) GROUP BY account"
bea query "PRINT"          # parseable directives, not a table
bea query                  # needs a terminal; exits 2 without one

# Upstream's own diagnostics and generators
bea doctor context main.bean 2026-01-02
bea example --seed 1 -o example.beancount
bea treeify < balances.txt
```

### `bea format` writes to stdout unless you ask for a file

Formatting used to rewrite whatever path it was given. It now prints the
formatted text and leaves the file alone; `--in-place` (`-i`) is what rewrites
it, and `--output FILE` (`-o`) writes somewhere else. `bea format -i .` is the
old `bea format .`.

This follows the formatter `bea` now runs, `bean-format`, whose default is the
safe one — a command that reads a path and silently rewrites it cannot be tried
out first. The same formatter is a text transformation and not a parse, so
formatting no longer refuses a file with a syntax error: it aligns the amounts
it recognises and leaves the rest alone. Run `bea check` to validate.

In `--json` mode the destination has to be explicit, because stdout carries the
envelope and nothing else: pass `-i`, `-o FILE`, `--check` or `--dry-run`.

Query tables preserve the precision of result values, including calculated
amounts and commodity quantities. Interactive queries and the `ask` BQL tool
use the same precision policy; cents are never discarded because most entries
in the ledger happen to use whole amounts.
An empty result prints `(no rows)` on stderr. JSON mode keeps the usual
envelope with an empty `rows` array and no human notice.

Reads are lenient in a terminal and strict everywhere else. `query`, `list`,
and `report` print the data with the loader errors as a banner on stderr and
exit 0 when stdout is a terminal; under `--json`, when stdout is piped, when
`CI` is truthy, or with `--strict`, they exit 1 instead unless `--allow-errors`
opts into the partial answer (the errors still print on stderr). If a JSON
command tolerates loader errors and then fails anyway, stderr still holds one
object: the loader lines ride along as `error.ledger_warnings`. `bea check`
always exits 1 on errors — reporting them is its whole job, so it has no
`--allow-errors` flag.
The same validation gate runs before the interactive BQL shell opens. Missing
format targets are usage errors. `format --dry-run` previews changes without
writing and exits **0** even when formatting is needed. Use `format --check`
for CI or a pre-commit hook: it leaves files untouched and exits **1** when
formatting is needed, **0** when all scanned files are formatted.

Every formatting mode reports syntax errors with each file's path and line,
skips that file, and exits **1**. A recursive run continues through the other
files; normal mode still formats valid files. Included files can be formatted
independently of their root ledger's account opens and options. In JSON mode,
failures return the scan result in `error.result`, including `formatted` and
`skipped` paths, `scanned`, `dry_run`, and `check`.

## Listing directives

`bea list <type>` reads a local `.bean` file. The eleven types are `transaction`, `open`, `close`, `balance`, `pad`, `note`, `event`, `price`, `commodity`, `document`, and `custom`.

| Option | Description |
|---|---|
| `--limit / -l` | Positive maximum results (default 50). The envelope reports `truncated` when more exist. |
| `--sort oldest/newest` | Transaction order, applied before the limit; default `newest`. Specify `oldest` in scripts that depend on ascending order. |
| `--details` | Transactions: render Beancount syntax with every posting, cost/price, metadata, and source location |
| `--flag` | Transactions: select a flag, such as `!` for entries needing review; applied before the limit. |
| `--search TEXT` | Transactions: case-insensitive substring over payee and narration; repeatable, applied before the limit. |
| `--tag TAG` | Transactions: tag with or without `#`; repeatable. |
| `--link LINK` | Transactions: link with or without `^`; repeatable. |
| `--from-date` | Only directives on or after this date (`YYYY-MM-DD`) |
| `--to-date` | Only directives on or before this date (`YYYY-MM-DD`) |
| `--account / -a` | Case-insensitive substring account filter (`transaction`, `note`, `balance`, `open`, `close`, `document`, `pad`) |
| `--currency / -c` | Exact symbol, case-insensitive (`price`, `commodity`); `eur` matches `EUR` |
| `--allow-errors` | Return data even though the ledger has loader errors (they still print on stderr) |

```bash
bea list transaction
bea list transaction --sort newest --details --limit 10
bea list transaction --account Expenses:Food --from-date 2026-01-01 --to-date 2026-03-31
bea list price --currency BTC
bea list open
bea list transaction --flag '!' --details
bea list transaction --search netflix --tag trip
```

The transaction table shows signed amounts by account and currency. With
`--account`, the amounts column is labeled `MATCHING POSTING AMOUNTS` and shows
only those postings. `--details` labels its output as transactions rendered in
Beancount syntax and shows every posting and its metadata, including inferred
amounts. Amounts on opposite sides are not combined into a zero total.


## Adding directives

`bea add <type>` appends to the resolved entry file only after the complete
candidate ledger passes Beancount parsing, booking, and validation. Relative
includes and document paths keep their original meaning. Unknown or closed
accounts, invalid currencies, unavailable cost lots, and unbalanced transactions
leave the original bytes unchanged. Account typos include suggested matches.
Account syntax follows Beancount: colon-separated segments with an uppercase
root; each subaccount starts with an uppercase letter or digit. Unicode
letters and configured root names are supported. Amounts use decimal notation
(e.g. `1000`, not `1e3`); native posting arithmetic such as `84/2 EUR` works.

For split ledgers, keep `--file` pointed at the root and choose the included
destination with `--into`. The destination must already exist and be included
by the root. Its path is relative to the root ledger's directory:

```bash
bea --file main.bean add transaction --into 2026.bean \
  --date 2026-08-02 -p "Expenses:Groceries 30" -p "Assets:Checking"
```

All add commands and `import` support this separation. Validation includes the
entire root ledger; the root and other included files are preserved. Changes
to an included file or to files matched by an include glob abort the write.
Successful additions never modify existing lines. Appended lines are written
where `bea format` would put them given the file's current contents, so a
formatted file stays formatted after an add; when a new amount or account is
wider than any before it, a later `bea format` realigns only the older lines.
Writes respect the destination file's permissions: a read-only file produces
exit **3**, even when its directory permits replacement. This also applies to
import. A read-only root can still validate a writable `--into` file.
`bea format -i` is upstream's formatter writing the file itself, so a read-only
file fails there with exit **1** and the formatter's own message.

Payees, narrations, and string metadata are written on one line: runs of CR/LF
line breaks become spaces in single adds, bulk JSON, and imports. Quotes and
backslashes retain their contents. Human tables also flatten line breaks from
existing entries without modifying the ledger.

Examples below assume their accounts were opened and their dates, balances,
and document paths are valid for your ledger. Every add command, and `import`,
accepts `--allow-errors` for a semantic error that is intentional or already in
the books, such as a balance assertion that still fails. Syntax errors and pad
references to unknown or inactive accounts are always rejected. For an opening
adjustment, prefer an explicit atomic pad and balance:

```bash
bea add balance --date 2026-01-02 --account Assets:Checking \
  --amount "900 USD" --pad-from Equity:OpeningBalances
```

The pad defaults to the preceding day; `--pad-date` can select another date
before the assertion. Both accounts must be open by the pad date. Ordinary
`add balance` remains a strict assertion: review missing transactions before
choosing to create an adjustment. Advanced users can stage `add pad --allow-errors`,
add the later balance, then run `bea check`. The staged pad reports `Unused Pad`
until a matching balance consumes it; complete that pair before other writes.
Balance amounts accept native tolerance syntax, for example
`--amount '1538 ~ 1 EUR'`. The assertion succeeds only within the supplied
nonnegative tolerance. This also works with `--pad-from`.
Concurrent CLI writers use persistent locks under `$XDG_CACHE_HOME/bea/locks`
(default `~/.cache/bea/locks`), keyed by each file's resolved absolute path.
No lock files are created in ledger directories. Locks remain in the cache
after release so waiting writers always coordinate through the same file.
Stop any older CLI writers before deleting their leftover `.FILENAME.bea.lock`
sidecars. An external edit detected before replacement produces exit **4**
and is preserved.

```bash
bea add transaction "Coffee" \
  --date 2026-04-30 \
  --posting "Expenses:Food 12.50 USD" \
  --posting "Assets:Cash -12.50 USD"

# With payee, flag, tags, and links
bea add transaction \
  --date 2026-04-30 \
  --payee "Blue Bottle" \
  --narration "Coffee" \
  --flag "!" \
  --posting "Expenses:Food 12.50 USD" \
  --posting "Assets:Cash -12.50 USD" \
  --tag trip \
  --link "^inv-001"
```

```bash
bea add open --date 2026-01-01 --account Assets:Reserve --currency USD
bea add close --date 2026-12-31 --account Assets:OldAccount
bea add balance --date 2026-04-30 --account Assets:Cash --amount "1000 USD"
# Advanced two-step pad: complete the pair before adding anything else
bea add pad --date 2026-01-01 --account Assets:Savings --source Equity:OpeningBalances --allow-errors
bea add balance --date 2026-01-02 --account Assets:Savings --amount "50 USD"
bea add note --date 2026-04-30 --account Assets:Cash --comment "ATM withdrawal"
bea add event --date 2026-04-30 --type location --description "New York"
bea add price --date 2026-04-30 --currency BTC --amount "62000 USD"
bea add commodity --date 2026-01-01 --currency VFINX
bea add document --date 2026-04-30 --account Assets:Cash --filename "receipts/april.pdf" --tag trip --link "^inv-001"
```

`add transaction` defaults to today's date. One posting may omit its amount;
Beancount infers the balancing amount. When a numbered posting omits its
currency, the CLI uses the account's sole allowed currency, otherwise the
ledger's sole operating currency. Ambiguous currencies require an explicit
symbol. Other directive types keep their explicit dates. Only `add transaction`
defaults the date to today; the other types require it. The transaction flag
defaults to `*`; `!` marks an entry for review.

Narration is optional. Omitting `--narration` records empty text, displayed as
`(no narration)` in the table; `--payee` can still identify the other party.
Supply `--narration "Coffee"` when the purpose would otherwise be unclear.

Currency exchanges need a price annotation, for example
`-p 'Assets:Euro 100 EUR @ 1.08 USD' -p 'Assets:Checking -108 USD'`. Use the
actual rate for that transaction. A multi-currency imbalance includes this
hint; the CLI never inserts a rate to force the postings to balance.

Document paths resolve relative to the file containing the directive. With
`--into years/2026.bean`, `--filename receipt.pdf` means `years/receipt.pdf`
beside that included file. Missing-document errors name this directory.

Use repeated `--meta` options for native Beancount transaction metadata:

```bash
bea add transaction -p 'Expenses:Groceries 30 USD' -p 'Assets:Checking' \
  --meta 'receipt:R-42' --meta 'reviewed:TRUE' \
  --meta 'rate: 1.125' --meta 'received: 2026-09-01'
```

Each argument contains one `key:value` pair. Bare text such as `note:hello`
or `receipt:IMG_1234.jpg` becomes a string. Valid native numbers, booleans,
dates and amounts retain their types, including when single-add JSON is reused
for bulk entry. Inner quotes force a string, e.g. `--meta 'code:"1234"'`;
`--meta 'note:""'` writes an empty string. Repeat `--meta` for different keys;
keys must be distinct and cannot use the reserved source fields `filename` or
`lineno`.

`add price` skips an exact date/commodity/amount match anywhere in the root
ledger's includes. It reports the existing location and exits **0** with
`written: 0` and `duplicate: true` in JSON. A different price or date remains
an explicit addition.

Aliases: `price` and `commodity` accept `--commodity`; `document` accepts
`--path`; `note` accepts `--message`. Existing option names remain supported.

### Custom directives

Values use a `kind:value` prefix. Supported kinds: `text`, `number`, `amount`, `account`, `bool`, `date`.

```bash
bea add custom \
  --date 2026-04-30 \
  --type budget \
  --value "text:travel" \
  --value "number:1000" \
  --value "amount:500 USD" \
  --value "account:Assets:Cash" \
  --value "bool:true" \
  --value "date:2026-04-30"
```

### Bulk transactions from JSON

```bash
bea add transactions --from transactions.json
bea add transactions --from transactions.json --partial
cat transactions.json | bea add transactions --from -
```

`transactions.json` must be an array of objects matching the `TransactionDirective` schema:

```json
[
  {
    "date": "2026-04-30",
    "flag": "*",
    "narration": "Groceries",
    "postings": [
      {"account": "Expenses:Food", "units": {"number": "45.00", "currency": "USD"}},
      {"account": "Assets:Cash", "units": {"number": "-45.00", "currency": "USD"}}
    ],
    "tags": [],
    "links": []
  }
]
```

Every row is validated before anything is written. If any row is invalid the ledger is left byte-identical and the command exits **1**, listing the rejected rows. `--partial` appends the valid rows instead — and still exits **1**, so a partial write can never look like a clean one.

A posting can also use `{"account":"Assets:Cash","amount":"-45 USD"}`.
Omit `units`/`amount` for a balancing posting. Supplying both forms or unknown
posting fields is rejected. Schema errors show a human row number, field path,
and example; `bea add transactions --help` contains a complete minimal batch.

Validation includes accounting errors, not just JSON shape. The whole batch is
tried first so a sale can use a purchase appearing later in the input. Partial
recovery tries rows in input order and validates each accepted subset. When
some rows are written, the JSON error includes `result.written`, `written_rows`,
and `rejected_rows` (zero-based indexes); a failed atomic batch reports zero
written and `unwritten_rows` when the failure concerns the combined ledger.
This command appends supplied transactions and does not deduplicate them. Use
[`bea import`](IMPORTING.md) for extraction, preview, and duplicate review.

### Investment postings and metadata

Single `--posting` arguments accept native Beancount cost and price syntax:

```bash
bea add transaction "Buy AAPL" --date 2026-08-02 \
  -p "Assets:Brokerage 10 AAPL {100 USD}" -p "Assets:Cash -1000 USD"
```

Per-unit and total prices (`@`, `@@`) and total costs (`{{...}}`) are supported.
JSON remains useful for batches and metadata. Open `Assets:Brokerage` in AAPL
and `Assets:Cash` in USD before applying this purchase:

```json
[
  {
    "date": "2026-08-02",
    "narration": "Buy AAPL",
    "meta": {"bank_id": "trade-001", "cleared": true},
    "postings": [
      {
        "account": "Assets:Brokerage",
        "units": {"number": "10", "currency": "AAPL"},
        "cost": {"number": "100", "currency": "USD", "date": "2026-08-02"}
      },
      {"account": "Assets:Cash", "units": {"number": "-1000", "currency": "USD"}}
    ]
  }
]
```

For a sale, use negative units with the existing cost and optionally
`"price": {"number": "120", "currency": "USD"}` on that posting, plus the cash
proceeds and realized gain postings. Booking validates that the lot exists.
Cost dates are optional; specify one to select a particular acquisition lot.
Transaction and posting `meta` preserve text and booleans; numeric, date and
amount metadata use tagged objects: `{"kind":"number","value":"1.125"}`,
`{"kind":"date","value":"2026-08-03"}`, or
`{"kind":"amount","number":"5.25","currency":"USD"}`. JSON listing includes
`source.filename`/`source.lineno` separately; those locations are never written
back as transaction metadata.

## Reports

Report interval breakdowns cover the complete requested period, including more
than 100 daily or monthly intervals. The interval selects the aggregation
grain, not a limit on the returned history.

```bash
bea report overview
bea report income-statement
bea report balance-sheet
bea report trial-balance
bea balance Checking
```

`bea balance [ACCOUNT…]` prunes the trial balance to the subtrees whose
account names contain any argument (case-insensitive), keeping ancestors for
structure. Closed accounts are excluded from filtered views. With no argument
it prints the trial balance; `--conversion`, `--time`, and `--allow-errors`
work as in reports.

All four accept `--conversion / -x`, `--time / -t`, `--account / -a`, and
`--allow-errors`. Conversion defaults to the ledger's single operating
currency. With zero or multiple operating currencies, it defaults to `units`
and keeps currencies separate. All but `trial-balance` accept `--interval / -i`
(`monthly`, `quarterly`, `yearly`, `weekly`, `daily`; default `monthly`).

```bash
bea report income-statement --time 2026 --interval quarterly
bea report balance-sheet --conversion EUR
```

Each report states its period, as-of date, account filter, and valuation.
Invalid intervals, dates, reversed ranges, and malformed account filters exit
**2**. `--account` takes a parent account (`Expenses:Food`) or a regular
expression (`'Expenses:(Food|Rent)'`); it selects transactions involving
matching accounts and retains all their postings.

Account trees retain Beancount signs: income, liabilities, and equity are
normally negative. `net_profit` is `-(income + expenses)`, so a gain is positive
and a loss negative. The income statement includes actual period rows with
the same signed income and expenses as the account trees. Net profit remains
positive for a gain; JSON labels this with `net_profit_signs: "positive_for_gain"`.
Older versions returned positive revenue in the period rows; consumers should
now use `-(income + expenses)` consistently. Overview JSON income/expense series
are interval flows; asset/liability series are balances as of each date.

Balance sheets include signed `current_earnings`, a derived
`valuation_adjustment`, and `equity_total` so converted assets, liabilities,
and total equity reconcile. These are report values and do not create ledger
directives. Prices after the report date do not affect its valuation.
Unconverted `units` reports do not claim an equity reconciliation or invent a
valuation adjustment across unlike commodities. `equity_reconciled` states
whether the derived reconciliation is available. Reports run with loader
errors also carry `ledger_valid: false` and `ledger_errors` in JSON.

Reports convert what has a price and keep the rest in units. Each interval
row is valued at its own date, so a later quote cannot value an earlier
interval: earlier rows stay in the source commodity while later rows convert.
A missing price never fails a terminal report — stderr carries one summary
line per commodity, for example `VACHR has no USD price at any date; shown in
units` or `EUR → USD has no price before 2026-08-31; earlier rows shown in
EUR`. Under `--json`, with piped stdout, under `CI`, or with `--strict`, a
missing price exits **1** unless `--allow-errors` is passed; the error's
`details` carry the same per-commodity summary, and `error.result` keeps the
dated triples in `missing_price_dates` (`from`, `to`, `date`) alongside
`missing_prices` for automation (a null date means no quote at any date).
Partial JSON marks `valuation: "partial"`, lists `missing_prices`, retains
amounts in their source currencies, and sets combined net profit/net worth to
`null` in the requested currency. It also withholds the derived equity
adjustment and equity total. Text shows the source amounts and says the total
is unavailable.
`--conversion units` shows quantities; `at_cost` shows acquisition costs and
`at_value` uses market values with Fava's cost fallback when no price exists.

Text amounts are rounded to the display precision the ledger uses for each
currency (half up, so `4.9050 USD` of converted dining reads `4.91 USD`);
JSON keeps the full-precision decimal string (`"4.9050"`).

## Ask (optional extra)

`bea ask` needs the AI dependencies, which the default install does not carry:

```bash norun
# Installs software; needs uv plus network.
uv tool install 'beancount-io[ask]'

# or, from a local clone of this repo
uv tool install './cli[ask]'
```

With Homebrew, keep the managed base CLI and run the optional AI environment
with `uvx --from 'beancount-io[ask]' bea ask "QUESTION" --print`. Both installations
use the same `bea cloud login` credentials. Model calls use the hosted
Beancount.io AI service even though the ledger is local.

```bash norun
# Needs the ask extra plus hosted credentials and a real ledger.
# Interactive session over your ledger
bea ask

# One question, one answer, no REPL
bea ask "what did I spend on groceries last month?" --print
```

Without the extra the command exits **2** with the install command. It also needs hosted credentials: the model runs through the Beancount.io AI proxy, so a local ledger still requires `bea cloud login`. `bea ask` has no `--json` mode; use `bea query` for machine-readable results. Ledger queries and validation run locally, while questions, supplied skill context, and tool results are sent to the hosted service. The current command uses `gpt-4o` and has no model-selection flag.

Interactive write requests are validated before confirmation, then appended
atomically only if the root ledger and included files still match the preview.
Use `ask --into FILE` for an included destination. The write tool accepts dated
directives; configure plugins, options and includes separately. Noninteractive
sessions do not write ledger entries. AI write permission is separate from
global `--yes`: one-answer and non-interactive mode cannot obtain it and never
apply AI-proposed writes.

Ask discovers project skills as `NAME/SKILL.md` files in `.agents/skills/`
under the working directory (regardless of `--file`) and user skills in
`skills/` under the configuration directory. Project skills override user
skills with the same name. Each file needs YAML frontmatter with a nonempty
`name` and `description`, followed by Markdown instructions; invalid files are
skipped. Names and descriptions are supplied up front and full instructions
load on demand. Interactive prompt history is saved in `ask_history` in the
configuration directory.

## Cloud: authentication

Hosted commands need a session. `bea cloud login` prints a one-time code and opens the dashboard's device page; enter the code there, check that the device shown is this machine, and approve. The link itself carries no secret, so a device page opened from anywhere else cannot authorize this CLI. The credential is stored as `credentials.json` in the configuration directory — `$BEA_CONFIG_DIR` when set, else `~/.config/bea` (mode 0600, in a 0700 directory).

```bash norun
# Needs a browser and hosted credentials.
bea cloud login
bea cloud status
bea cloud logout
```

`bea cloud status` reports the credential source (`file` or `environment`), its expiry, and the account it belongs to. For CI, set `BEA_TOKEN` instead of logging in — it is never written to disk, and `cloud status` reports `source: environment`. `cloud logout` revokes the stored session and deletes the credential file. When `BEA_TOKEN` is set, `cloud logout` changes nothing: it neither revokes the token (another job may share it) nor unsets it in the shell — unset the variable yourself, or revoke the token from the dashboard.

## Cloud: hosted ledgers

```bash norun
# Needs hosted credentials; delete also shows global-before-command order.
# Create a hosted ledger — private unless --public is passed
bea cloud ledger create my-books
bea cloud ledger create my-books --public --description "Shared books"

# Create and clone in one step
bea cloud ledger create my-books --clone
bea cloud ledger create my-books --clone --dir ./accounting/my-books

# List, inspect, clone, delete
bea cloud ledger list                         # --page 1, --limit 50 (API maximum 100)
bea cloud ledger show alice/my-books
bea cloud ledger clone alice/my-books
bea cloud ledger delete alice/my-books          # asks for confirmation
bea --yes cloud ledger delete alice/old-books   # global switches precede the command
```

Cloning uses `git clone` over SSH, so it needs Git and working SSH access. If a clone fails after the ledger was created, the command exits nonzero and prints the manual `git clone` command — the ledger exists either way.

## Updating

`bea upgrade` hands the update to whichever package manager installed this copy
— Homebrew, uv, or pipx — and never rewrites its own installed files. After the
manager finishes, it also refreshes the managed Beancount engine so frontend
and engine versions stay paired.

```bash norun
# Needs network for the latest-version check; versions vary by machine.
# Report the installed and latest versions and the command that would run
$ bea upgrade --check
bea 1.2.3 (installed by: homebrew)
Latest release: 1.3.0
Would run: brew upgrade bea

# Run it
$ bea upgrade
```

| Install channel | What `bea upgrade` runs | Uninstall |
|---|---|---|
| Homebrew (`brew install bex-co/tap/bea`) | `brew upgrade bea` | `brew uninstall bea` |
| uv tool (`uv tool install beancount-io`) | `uv tool upgrade beancount-io` | `uv tool uninstall beancount-io` |
| pipx | `pipx upgrade beancount-io` | `pipx uninstall beancount-io` |
| A checkout (editable install) | Nothing; prints `git pull` and `uv sync --all-groups`, exits 0 | — |
| Anything else | Nothing; exits **2** naming both install channels | — |

Uninstalling the executable leaves ledgers and user state in place.

If the manager itself fails, the command exits **1** and says so; nothing about
the installation is changed. `--check` reports and runs nothing.

### The update notice

In a terminal, `bea` asks its installation channel at most once a day whether a newer release
exists, and prints one line on stderr after the command's own output:

```
bea 1.3.0 is available (you have 1.2.3) — run 'bea upgrade' to update.
```

It never runs at all under `--json`, `--no-input`, `CI`, or
`BEA_NO_UPDATE_NOTIFIER=1`, without a terminal on stderr, or from a development
install. Every outcome — including a failure — is cached for 24 hours in
`~/.config/bea/update-check.json` (or `update-check-homebrew.json` for Homebrew),
so an offline machine waits at most once a
day and prints nothing. `bea --version` adds the same line from that cache
only, and makes no network call.
Homebrew checks the published tap formula; PyPI-only releases are never
advertised to a Homebrew installation before the tap can install them.

## JSON output

Every read-side command accepts global `--json`: `check`, `query`, `list <type>`, all four `report` commands, `cloud status`, `cloud ledger list`, and `cloud ledger show`. `init`, `import`, `format`, `add`, `cloud ledger create`, and `cloud ledger delete` also emit an envelope so a script can confirm what was written (create returns the new ledger's metadata, delete the deleted ledger's id). Usage failures, including unknown commands and missing global option values, follow the same JSON error contract.

The envelope is always:

```json
{
  "bea": "0.1.0",
  "target": {"file": "/home/alice/books/main.bean"},
  "data": "…",
  "truncated": false
}
```

`target` is `{"file": "<absolute path>"}` for commands that resolve a ledger (including formatting one file), `{"directory": "<absolute path>"}` for formatting a directory, and `{"server": "<api url>"}` for hosted commands. Bounded lists also carry `limit`, and paged hosted lists (`cloud ledger list`) also carry the `page` that was served. Amounts use decimal **strings** — never floats — and dates are ISO `YYYY-MM-DD`.

```bash
$ bea --json check
{"bea": "0.1.0", "target": {"file": "/tmp/books/main.bean"}, "data": {"valid": true, "errors": []}, "truncated": false}

$ bea --json list transaction --limit 2 | jq .data[0].postings[0].units
{
  "number": "1000.00",
  "currency": "USD"
}

$ bea --json query "SELECT account, sum(position) GROUP BY account" | jq .data.columns
[
  {"name": "account", "type": "str"},
  {"name": "total", "type": "Inventory"}
]

$ bea --json report income-statement | jq .data.net_profit
{"USD": "12.50"}
```

```bash norun
# Needs hosted credentials.
$ bea --json cloud ledger list --limit 10 | jq '.data[0].full_name'
"alice/my-books"

$ bea --json cloud status | jq '{source: .data.source, tier: .data.tier}'
{"source": "file", "tier": "free"}
```

Report JSON carries the same tree the text renderer walks — `account`, `balance`, `balance_children`, `has_txns`, `children` — not a rendering of it.

Commands that cannot produce JSON keep their own shapes: `ask` rejects JSON
mode, `cloud login` requires interaction, successful `cloud logout` and
`cloud ledger clone` emit no JSON success object (use their exit status), and
help, version, and completion output stay textual. `upgrade` can stream
package-manager output to stderr even in JSON mode. The
[directive models](https://github.com/bex-co/beancount-io/blob/main/cli/src/cli/directives/models.py)
define the exact object fields for directive listings and bulk input.

## Environment variables

There is no general-purpose CLI configuration file. Environment variables
select targets, endpoints, and state directories:

| Variable | Default | Description |
|---|---|---|
| `BEA_FILE` | — | Ledger entry file, when `--file` is not passed |
| `BEA_TOKEN` | — | Hosted credential for unattended jobs; never written to disk |
| `BEA_CONFIG_DIR` | `$XDG_CONFIG_HOME/bea`, else `~/.config/bea` | Per-user state: credentials, `ask` history, user skills |
| `XDG_DATA_HOME` | `~/.local/share` | Root for the managed PyPI engine under `…/bea/engine/<version>` |
| `BEA_API_URL` | `https://api.v3.beancount.io` | API base URL |
| `BEA_DASHBOARD_URL` | `https://beancount.io` | Dashboard URL, used by the device login flow |
| `BEA_NO_UPDATE_NOTIFIER` | — | Truthy disables the update notice entirely |
| `CI` | — | Truthy implies `--no-input`, and disables the update notice |

Homebrew sets `BEA_ENGINE_DIR` to the keg-local engine so installs never look
for a separately provisioned copy. Advanced overrides (`BEA_ENGINE_PYTHON`,
`BEA_UV`) exist for tests and recovery tooling; ordinary installs do not need
them.

Truthy values are `1`, `true`, `yes`, and `on`, ignoring case and surrounding
whitespace. The configuration directory holds `credentials.json` (mode 0600 on
POSIX), `ask_history`, user `skills/`, remembered importer paths and column
mappings under `importers/`, and channel-specific update-check caches.
Ledger plugins and importer configurations run their own Python code and
control any I/O they perform.
