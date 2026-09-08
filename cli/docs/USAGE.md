# Usage

The Beancount.io CLI installs one command: `bea`.

```text
# Local — works on .bean files
bea init [DIRECTORY] --currency USD
bea import EXPORT --config importers.py [--apply]
bea check | format | query "<BQL>"
bea list <type> | bea add <type>          # eleven directive types; add transactions --from PATH
bea report balance-sheet | income-statement | trial-balance | overview
bea ask ["question"]                      # requires beancount-io[ask] and hosted credentials

# Cloud — the beancount.io hosted service
bea cloud login | logout | status
bea cloud ledger list | create [--clone] | show | clone | delete

# CLI maintenance
bea upgrade [--check]
```

Everything outside `bea cloud` works on local files (`ask` is the one exception: its model calls run through the hosted AI proxy). Everything under `bea cloud` needs a session from `bea cloud login` or `BEA_TOKEN`.

## Global options

Global options come before the command.

| Option | Description |
|---|---|
| `--file / -f PATH` | Ledger entry file. Overrides `BEA_FILE` and `./main.bean`. |
| `--json` | Emit the JSON envelope on stdout and JSON errors on stderr. Implies `--no-input`. |
| `--no-input` | Never prompt. Missing confirmation or input fails with exit 2 instead of waiting. |
| `--yes / -y` | Answer confirmations with yes. |
| `--version` | Print the version and exit. Makes no network call. |
| `-h / --help` | Show help. |

```bash
bea --file ./books/main.bean check
bea --json list transaction --limit 100
bea --yes cloud ledger delete alice/old-books
```

### Choosing the ledger

Local commands resolve their target in this order:

1. `--file PATH`
2. `$BEA_FILE`
3. `./main.bean` in the working directory

If the resolved file does not exist, the command exits **2** and names all three sources. Hosted targeting (`--ledger`) is not implemented yet.

### Non-interactive behavior

`--no-input` is implied whenever stdin is not a terminal, whenever `--json` is set, and when `CI` is truthy. In that mode nothing waits for a human:

```bash
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
bea init books                         # interactive currency and opening balance
bea --no-input init books --currency EUR --date 2026-08-01 \
  --opening-balance "Assets:Checking 1000" \
  --opening-balance "Liabilities:CreditCard -50"
```

These are alternative ways to create a new ledger. `init` never overwrites an
existing file. Pass a directory (creates `main.bean`) or a `.bean`/`.beancount`
path; the global `--file` can also name the new file. `BEA_FILE` does not redirect
`init`. Without a terminal, `--currency` is required. Dates default to today.

The personal template opens checking, savings, cash, credit card, salary,
interest, groceries, dining, rent, transport, utilities, fees, and opening
equity accounts. Opening balances use that currency and balance against
`Equity:OpeningBalances`; credit card debt is negative. Add other accounts with
`bea add open` before posting to them.

## Checking, formatting, querying

```bash
# Parse, validate and realize the ledger
bea check

# Format a file, or every .bean/.beancount file under a directory
bea format main.beancount
bea format .
bea format . --dry-run

# Run a BQL query and print a table; omit the query for the interactive shell
bea query "SELECT account, sum(position) GROUP BY account"
bea query
```

`check`, `query`, `list`, and `report` all refuse to answer from a ledger that
does not load: a total computed over a broken ledger reads as authoritative and
is not. `query`, `list`, and `report` take `--allow-errors` to opt into the
partial answer, which still prints the errors on stderr; `bea check` has no such
flag, because reporting the errors is its whole job.
The same validation gate runs before the interactive BQL shell opens. Missing
format targets are usage errors; `--dry-run` leaves files untouched.

## Listing directives

`bea list <type>` reads a local `.bean` file. The eleven types are `transaction`, `open`, `close`, `balance`, `pad`, `note`, `event`, `price`, `commodity`, `document`, and `custom`.

| Option | Description |
|---|---|
| `--limit / -l` | Positive maximum results (default 50). The envelope reports `truncated` when more exist. |
| `--sort oldest/newest` | Transaction order, applied before the limit; default `oldest` |
| `--details` | Transactions: print every posting, cost/price, metadata, and source location |
| `--from-date` | Only directives on or after this date (`YYYY-MM-DD`) |
| `--to-date` | Only directives on or before this date (`YYYY-MM-DD`) |
| `--account / -a` | Substring account filter (`transaction`, `note`, `balance`, `open`, `close`, `document`, `pad`) |
| `--currency / -c` | Exact currency filter (`price`, `commodity`) |
| `--allow-errors` | Return data even though the ledger has loader errors (they still print on stderr) |

```bash
bea list transaction
bea list transaction --sort newest --details --limit 10
bea list transaction --account Expenses:Food --from-date 2026-01-01 --to-date 2026-03-31
bea list price --currency BTC
bea list open
```


## Adding directives

`bea add <type>` appends to the resolved entry file only after the complete
candidate ledger passes Beancount parsing, booking, and validation. Relative
includes and document paths keep their original meaning. Unknown or closed
accounts, invalid currencies, unavailable cost lots, and unbalanced transactions
leave the original bytes unchanged. Account typos include suggested matches.

Examples below assume their accounts were opened and their dates, balances,
and document paths are valid for your ledger. Every add command accepts
`--allow-errors` for an intentional semantic error (such as staging an unused
pad before its balance assertion). Syntax errors are always rejected.
Concurrent CLI writers use a persistent hidden `.FILENAME.bea.lock` sidecar;
an external edit detected before replacement produces exit **4** and is preserved.

```bash
bea add transaction \
  --date 2026-04-30 \
  --narration "Coffee" \
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

bea add open  --date 2026-01-01 --account Assets:Cash --currency USD
bea add close --date 2026-12-31 --account Assets:OldAccount
bea add balance --date 2026-04-30 --account Assets:Cash --amount "1000 USD"
bea add pad --date 2026-01-01 --account Assets:Cash --source Equity:Opening-Balances --allow-errors
bea add note --date 2026-04-30 --account Assets:Cash --comment "ATM withdrawal"
bea add event --date 2026-04-30 --type location --description "New York"
bea add price --date 2026-04-30 --currency BTC --amount "62000 USD"
bea add commodity --date 2026-01-01 --currency VFINX
bea add document --date 2026-04-30 --account Assets:Cash --filename "receipts/april.pdf"
```

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

Validation includes accounting errors, not just JSON shape. The whole batch is
tried first so a sale can use a purchase appearing later in the input. Partial
recovery tries rows in input order and validates each accepted subset. When
some rows are written, the JSON error includes `result.written`, `written_rows`,
and `rejected_rows` (zero-based indexes); a failed atomic batch reports zero
written and `unwritten_rows` when the failure concerns the combined ledger.
This command appends supplied transactions and does not deduplicate them. Use
[`bea import`](IMPORTING.md) for extraction, preview, and duplicate review.

### Investment postings and metadata

Single `--posting` arguments take exactly `ACCOUNT NUMBER CURRENCY`. Use JSON
for costs and prices. Open `Assets:Brokerage` in AAPL and `Assets:Cash` in USD
before applying this purchase:

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

```bash
bea report overview
bea report income-statement
bea report balance-sheet
bea report trial-balance
```

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
Invalid intervals, dates, or reversed ranges exit **2**. Account filters select
transactions involving matching accounts and retain all their postings.

Account trees retain Beancount signs: income, liabilities, and equity are
normally negative. `net_profit` is `-(income + expenses)`, so a gain is positive
and a loss negative. The income statement includes actual period rows with
positive revenue, expenses, and profit. Overview JSON income/expense series
are interval flows; asset/liability series are balances as of each date.

Balance sheets include signed `current_earnings`, a derived
`valuation_adjustment`, and `equity_total` so converted assets, liabilities,
and total equity reconcile. These are report values and do not create ledger
directives. Prices after the report date do not affect its valuation.
Unconverted `units` reports do not claim an equity reconciliation or invent a
valuation adjustment across unlike commodities. `equity_reconciled` states
whether the derived reconciliation is available. Reports run with loader
errors also carry `ledger_valid: false` and `ledger_errors` in JSON.

Explicit currency conversion requires prices for every nonzero commodity in
the report and its intervals. A missing price exits **1**. With `--allow-errors`,
JSON marks `valuation: "partial"`, lists `missing_prices`, retains amounts in
their source currencies, and sets combined net profit/net worth to `null` in
the requested currency. It also withholds the derived equity adjustment and
equity total. Text shows the source amounts and says the total is unavailable.
`--conversion units` shows quantities; `at_cost` shows acquisition costs and
`at_value` uses market values with Fava's cost fallback when no price exists.

## Ask (optional extra)

`bea ask` needs the AI dependencies, which the default install does not carry:

```bash
uv tool install 'beancount-io[ask]'

# or, from a local clone of this repo
uv tool install './cli[ask]'
```

```bash
# Interactive session over your ledger
bea ask

# One question, one answer, no REPL
bea ask "what did I spend on groceries last month?" --print
```

Without the extra the command exits **2** with the install command. It also needs hosted credentials: the model runs through the Beancount.io AI proxy, so a local ledger still requires `bea cloud login`. `bea ask` has no `--json` mode; use `bea query` for machine-readable results.

## Cloud: authentication

Hosted commands need a session. `bea cloud login` prints a one-time code and opens the dashboard's device page; enter the code there, check that the device shown is this machine, and approve. The link itself carries no secret, so a device page opened from anywhere else cannot authorize this CLI. The credential is stored at `~/.config/bea/credentials.json` (mode 0600, in a 0700 directory).

```bash
bea cloud login
bea cloud status
bea cloud logout
```

`bea cloud status` reports the credential source (`file` or `environment`), its expiry, and the account it belongs to. For CI, set `BEA_TOKEN` instead of logging in — it is never written to disk, and `cloud status` reports `source: environment`.

## Cloud: hosted ledgers

```bash
# Create a hosted ledger — private unless --public is passed
bea cloud ledger create my-books
bea cloud ledger create my-books --public --description "Shared books"

# Create and clone in one step
bea cloud ledger create my-books --clone
bea cloud ledger create my-books --clone --dir ./accounting/my-books

# List, inspect, clone, delete
bea cloud ledger list
bea cloud ledger show alice/my-books
bea cloud ledger clone alice/my-books
bea cloud ledger delete alice/my-books          # asks for confirmation
bea --yes cloud ledger delete alice/my-books   # global switches precede the command
```

Cloning uses `git clone` over SSH, so it needs Git and working SSH access. If a clone fails after the ledger was created, the command exits nonzero and prints the manual `git clone` command — the ledger exists either way.

## Updating

`bea upgrade` hands the update to whichever package manager installed this copy
— Homebrew, uv, or pipx — and never rewrites its own installed files.

```bash
# Report the installed and latest versions and the command that would run
$ bea upgrade --check
bea 1.2.3 (installed by: homebrew)
Latest release: 1.3.0
Would run: brew upgrade bea

# Run it
$ bea upgrade
```

| Install channel | What `bea upgrade` runs |
|---|---|
| Homebrew (`brew install bex-co/tap/bea`) | `brew upgrade bea` |
| uv tool (`uv tool install beancount-io`) | `uv tool upgrade beancount-io` |
| pipx | `pipx upgrade beancount-io` |
| A checkout (editable install) | Nothing; prints `git pull` and `uv sync --all-groups`, exits 0 |
| Anything else | Nothing; exits **2** naming both install channels |

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

Every read-side command accepts global `--json`: `check`, `query`, `list <type>`, all four `report` commands, `cloud status`, and `cloud ledger list`. `init`, `import`, `format`, and `add` also emit an envelope so a script can confirm what was written. Usage failures, including unknown commands and missing global option values, follow the same JSON error contract.

The envelope is always:

```json
{
  "bea": "0.1.0",
  "target": {"file": "/home/alice/books/main.bean"},
  "data": "…",
  "truncated": false
}
```

`target` is `{"file": "<absolute path>"}` for commands that resolve a ledger (including formatting one file), `{"directory": "<absolute path>"}` for formatting a directory, and `{"server": "<api url>"}` for hosted commands. Bounded lists also carry `limit`. Amounts use decimal **strings** — never floats — and dates are ISO `YYYY-MM-DD`.

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

$ bea --json cloud ledger list --limit 10 | jq '.data[0].full_name'
"alice/my-books"

$ bea --json cloud status | jq '{source: .data.source, tier: .data.tier}'
{"source": "file", "tier": "free"}
```

Report JSON carries the same tree the text renderer walks — `account`, `balance`, `balance_children`, `has_txns`, `children` — not a rendering of it.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `BEA_FILE` | — | Ledger entry file, when `--file` is not passed |
| `BEA_TOKEN` | — | Hosted credential for unattended jobs; never written to disk |
| `BEA_CONFIG_DIR` | `$XDG_CONFIG_HOME/bea`, else `~/.config/bea` | Per-user state: credentials, `ask` history, user skills |
| `BEA_API_URL` | `https://api.v3.beancount.io` | API base URL |
| `BEA_DASHBOARD_URL` | `https://beancount.io` | Dashboard URL, used by the device login flow |
| `BEA_NO_UPDATE_NOTIFIER` | — | Truthy disables the update notice entirely |
| `CI` | — | Truthy implies `--no-input`, and disables the update notice |
