# Usage

The Beancount.io CLI installs one command: `bea`.

```bash
# Local — works on .bean files
bea check | format | query "<BQL>"
bea list <type> | bea add <type>          # eleven directive types; add transactions --from PATH
bea report balance-sheet | income-statement | trial-balance | overview
bea ask ["question"]                      # requires beancount-io[ask] and hosted credentials

# Cloud — the beancount.io hosted service
bea cloud login | logout | status
bea cloud ledger list | create [--clone] | show | clone | delete [--yes]

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

## Checking, formatting, querying

```bash
# Parse, validate and realize the ledger
bea check

# Format every .bean file under a directory in place (bean-format --in-place)
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

## Listing directives

`bea list <type>` reads a local `.bean` file. The eleven types are `transaction`, `open`, `close`, `balance`, `pad`, `note`, `event`, `price`, `commodity`, `document`, and `custom`.

| Option | Description |
|---|---|
| `--limit / -l` | Maximum results (default 50). The envelope reports `truncated` when more exist. |
| `--from-date` | Only directives on or after this date (`YYYY-MM-DD`) |
| `--to-date` | Only directives on or before this date (`YYYY-MM-DD`) |
| `--account / -a` | Substring account filter (`transaction`, `note`, `balance`, `open`, `close`, `document`, `pad`) |
| `--currency / -c` | Exact currency filter (`price`, `commodity`) |
| `--allow-errors` | Return data even though the ledger has loader errors (they still print on stderr) |

```bash
bea list transaction
bea list transaction --account Expenses:Food --from-date 2026-01-01 --to-date 2026-03-31
bea list price --currency BTC
bea list open
```


## Adding directives

`bea add <type>` appends a formatted directive to the resolved entry file.

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
bea add pad --date 2026-01-01 --account Assets:Cash --source Equity:Opening-Balances
bea add note --date 2026-04-30 --account Assets:Cash --comment "ATM withdrawal"
bea add event --date 2026-04-30 --type location --description "New York"
bea add price --date 2026-04-30 --currency BTC --amount "62000 USD"
bea add commodity --date 2026-01-01 --currency VFINX
bea add document --date 2026-04-30 --account Assets:Cash --filename "receipts/april.pdf"
```

### Custom directives

Values use a `kind:value` prefix. Supported kinds: `text`, `number`, `amount`, `account`.

```bash
bea add custom \
  --date 2026-04-30 \
  --type budget \
  --value "text:travel" \
  --value "number:1000" \
  --value "amount:500 USD" \
  --value "account:Assets:Cash"
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

## Reports

```bash
bea report overview
bea report income-statement
bea report balance-sheet
bea report trial-balance
```

All four accept `--conversion / -x` (default `USD`), `--time / -t`, `--account / -a`, and `--allow-errors`. All but `trial-balance` also accept `--interval / -i` (`monthly`, `quarterly`, `yearly`, `weekly`, `daily`; default `monthly`).

```bash
bea report income-statement --time 2026 --interval quarterly
bea report balance-sheet --conversion EUR
```

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
bea cloud ledger delete alice/my-books --yes    # or run with --yes
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

In a terminal, `bea` asks PyPI at most once a day whether a newer release
exists, and prints one line on stderr after the command's own output:

```
bea 1.3.0 is available (you have 1.2.3) — run 'bea upgrade' to update.
```

It never runs at all under `--json`, `--no-input`, `CI`, or
`BEA_NO_UPDATE_NOTIFIER=1`, without a terminal on stderr, or from a development
install. Every outcome — including a failure — is cached for 24 hours in
`~/.config/bea/update-check.json`, so an offline machine waits at most once a
day and prints nothing. `bea --version` adds the same line from that cache
only, and makes no network call.

## JSON output

Every read-side command accepts `--json`: `check`, `query`, `list <type>`, all four `report` commands, `cloud status`, and `cloud ledger list`. `format` and `add` also emit an envelope so a script can confirm what was written.

The envelope is always:

```json
{
  "bea": "0.1.0",
  "target": {"file": "/home/alice/books/main.bean"},
  "data": "…",
  "truncated": false
}
```

`target` is `{"file": "<absolute path>"}` for commands that resolve a ledger, `{"directory": "<absolute path>"}` for `format`, and `{"server": "<api url>"}` for hosted commands. Bounded lists also carry `limit`. Amounts are objects with decimal **strings** — never floats — and dates are ISO `YYYY-MM-DD`.

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

$ bea --json ledger list --limit 10 | jq '.data[0].full_name'
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
