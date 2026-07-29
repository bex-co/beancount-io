# Usage

## Authentication

All commands that talk to the API require a session. Authentication uses a browser-based device flow — run it once and the token is stored at `~/.beancount-cli/credentials.json`.

```bash
# Open browser for login, store token locally
beancount-cli auth login

# Print current user
beancount-cli auth whoami

# Revoke token and clear stored credentials
beancount-cli auth logout
```

## Ledger management

```bash
# Create a new ledger, download its initial archive, and set up a local git remote
beancount-cli ledger create my-books

# Choose a custom local directory
beancount-cli ledger create my-books --dir ./accounting/my-books

# Create a private ledger
beancount-cli ledger create my-books --private

# Skip archive download (create remote only)
beancount-cli ledger create my-books --no-extract

# List all your ledgers
beancount-cli ledger list
```

`ledger create` does the following automatically:
1. Creates the remote ledger on Beancount.io
2. Downloads the initial archive (`.zip`) and extracts it to the target directory
3. Runs `git init` and configures the git remote
4. Writes `.beancount-ledger.json` with the ledger metadata

After creation, push with your Beancount.io email and password:

```bash
cd my-books
git add -A && git commit -m "initial"
git push -u origin main
```

## Writing directives

All `write` commands append a formatted beancount directive to a `.bean` file.

### Transaction

```bash
beancount-cli write transaction \
  --file main.bean \
  --date 2026-04-30 \
  --narration "Coffee" \
  --posting "Expenses:Food 12.50 USD" \
  --posting "Assets:Cash -12.50 USD"

# With payee, flag, tags, and links
beancount-cli write transaction \
  --file main.bean \
  --date 2026-04-30 \
  --payee "Blue Bottle" \
  --narration "Coffee" \
  --flag "!" \
  --posting "Expenses:Food 12.50 USD" \
  --posting "Assets:Cash -12.50 USD" \
  --tag trip \
  --link "^inv-001"
```

### Bulk transactions from JSON

```bash
beancount-cli write transactions --file main.bean --from transactions.json
```

`transactions.json` must be an array of transaction objects matching the `TransactionDirective` schema:

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

### Open / Close

```bash
beancount-cli write open  --file main.bean --date 2026-01-01 --account Assets:Cash --currency USD
beancount-cli write close --file main.bean --date 2026-12-31 --account Assets:OldAccount
```

### Balance assertion

```bash
beancount-cli write balance \
  --file main.bean \
  --date 2026-04-30 \
  --account Assets:Cash \
  --amount "1000 USD"
```

### Pad

```bash
beancount-cli write pad \
  --file main.bean \
  --date 2026-01-01 \
  --account Assets:Cash \
  --source Equity:Opening-Balances
```

### Note

```bash
beancount-cli write note \
  --file main.bean \
  --date 2026-04-30 \
  --account Assets:Cash \
  --comment "ATM withdrawal"
```

### Event

```bash
beancount-cli write event \
  --file main.bean \
  --date 2026-04-30 \
  --type location \
  --description "New York"
```

### Price

```bash
beancount-cli write price \
  --file main.bean \
  --date 2026-04-30 \
  --currency BTC \
  --amount "62000 USD"
```

### Commodity

```bash
beancount-cli write commodity \
  --file main.bean \
  --date 2026-01-01 \
  --currency VFINX
```

### Document

```bash
beancount-cli write document \
  --file main.bean \
  --date 2026-04-30 \
  --account Assets:Cash \
  --filename "receipts/april.pdf"
```

### Custom

Values use a `kind:value` prefix. Supported kinds: `text`, `number`, `amount`, `account`.

```bash
beancount-cli write custom \
  --file main.bean \
  --date 2026-04-30 \
  --type budget \
  --value "text:travel" \
  --value "number:1000" \
  --value "amount:500 USD" \
  --value "account:Assets:Cash"
```

## Reading directives

All `read` commands load a `.bean` file and list directives of the given type. The `--file` option defaults to `main.bean` in the current directory.

### Common options

| Option | Description |
|---|---|
| `--file / -f` | `.bean` file to read (default: `main.bean`) |
| `--limit / -l` | Maximum results to return (default: 50) |
| `--from-date` | Only include directives on or after this date (`YYYY-MM-DD`) |
| `--to-date` | Only include directives on or before this date (`YYYY-MM-DD`) |
| `--account / -a` | Filter by account name (substring match; account-based directives only) |
| `--currency / -c` | Filter by currency symbol (price and commodity only) |
| `--json` | Output machine-readable JSON |

### Transactions

```bash
beancount-cli read transaction

# Filter by account and date range
beancount-cli read transaction --account Expenses:Food --from-date 2026-01-01 --to-date 2026-03-31

# Return up to 100 results as JSON
beancount-cli read transaction --limit 100 --json
```

### Notes

```bash
beancount-cli read note
beancount-cli read note --account Assets:Checking
```

### Prices

```bash
beancount-cli read price
beancount-cli read price --currency BTC
```

### Balance assertions

```bash
beancount-cli read balance
beancount-cli read balance --account Assets:Cash
```

### Open / Close

```bash
beancount-cli read open
beancount-cli read close
```

### Commodities

```bash
beancount-cli read commodity
beancount-cli read commodity --currency VFINX
```

### Events

```bash
beancount-cli read event
beancount-cli read event --from-date 2026-01-01
```

### Documents

```bash
beancount-cli read document
beancount-cli read document --account Assets:Checking
```

### Custom directives

```bash
beancount-cli read custom
```

### Pad directives

```bash
beancount-cli read pad
```

## Machine-readable output

Every command accepts `--json` for structured output suitable for agents and scripts:

```bash
beancount-cli auth whoami --json
# {"success": true, "data": {"id": "...", "email": "...", "username": "...", "tier": "free"}}

beancount-cli ledger list --json
# {"success": true, "data": [...]}
```

On error, exit code is non-zero and the output is:

```json
{"success": false, "error": "Session expired. Run 'beancount-cli auth login' to re-authenticate."}
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `BEANCOUNT_API_URL` | `https://api.v3.beancount.io` | GraphQL API base URL |
| `BEANCOUNT_DASHBOARD_URL` | `https://dashboard.v3.beancount.io` | Dashboard URL (used for device login flow) |
