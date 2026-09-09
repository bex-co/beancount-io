# Your first month with `bea`

You will open a ledger, record a week of purchases, import the month's bank
export, reconcile against the statement, and read the month's reports. Every
command below runs as written from a CLI source checkout; without one, save
`docs/examples/first-month.csv` locally first and substitute its path.
Nothing here asks you to write Python or BQL.

## Week 1 — set up the books

Create a ledger starting August 2026 with $1,250 in checking, then open the one
account the template lacks for this month, the fuel subaccount. `init` already
opens `Expenses:Uncategorized`, where imports park rows they cannot categorize.

```bash
bea --no-input init august --currency USD --date 2026-08-01 \
  --opening-balance "Assets:Checking 1250"
bea --file august/main.bean add open --date 2026-08-01 --account Expenses:Transport:Fuel -c USD
```

## Week 2 — record daily purchases

Record buys as they happen; the date defaults to today, so backdated history
passes `--date` explicitly.

```bash
bea --file august/main.bean add transaction "Coffee" --date 2026-08-03 \
  --posting "Expenses:Dining 4.50" --posting "Assets:Checking"
bea --file august/main.bean add transaction "Weekly groceries" --date 2026-08-05 \
  --posting "Expenses:Groceries 62.30" --posting "Assets:Checking"
bea --file august/main.bean add transaction --date 2026-08-07 --payee "Employer" \
  --narration "August salary" --posting "Assets:Checking 2100" --posting "Income:Salary"
```

## Week 3 — import the bank export

The export for the rest of August is three rows:

```csv
Date,Payee,Amount
2026-08-10,Whole Foods,-28.40
2026-08-12,Shell,-35.00
2026-08-20,Mystery Shop,-9.99
```

Map its columns with `--csv` and categorize with two small rules. The third
row matches nothing, so it posts to the holding account with flag `!` — your
review queue for later.

```bash
cat > rules.toml <<'EOF'
[[rule]]
match = "whole foods|trader joe"
account = "Expenses:Groceries"

[[rule]]
match = "shell"
account = "Expenses:Transport:Fuel"
EOF
bea --file august/main.bean import docs/examples/first-month.csv \
  --csv date=Date,amount=Amount,payee=Payee --account Assets:Checking --rules rules.toml
bea --file august/main.bean import docs/examples/first-month.csv --apply
```

The preview runs flag-free the second time: the mapping is remembered. See
the [import guide](https://github.com/bex-co/beancount-io/blob/main/cli/docs/IMPORTING.md)
for the debit/credit form, currencies, and Python importers.

## Week 4 — reconcile against the statement

The August statement closes checking at **3206.81 USD**. Your books say
3209.81: the bank charged a 3.00 fee your export missed. Record the known fee,
then assert the statement balance on September 1. Beancount checks assertions
at the start of the day, so the next day's assertion includes all August 31
transactions:

```bash
bea --file august/main.bean add transaction "Bank fee" --date 2026-08-31 \
  --posting "Expenses:Fees 3.00" --posting "Assets:Checking"
bea --file august/main.bean add balance --date 2026-09-01 --account Assets:Checking \
  --amount "3206.81 USD"
bea --file august/main.bean list transaction --flag '!' --details
```

The queue holds the Mystery Shop row. `--details` shows its file and line
number. Open that location in your editor, change its `Expenses:Uncategorized`
posting to the right account, and change its flag from `!` to `*` once reviewed.
Keep the `import-id` line so the next import of this export still skips it.
Run `bea --file august/main.bean check` and list the `!` queue again to confirm
that the reviewed transaction is gone.

## Read the month

```bash
bea --file august/main.bean check
bea --file august/main.bean report income-statement --time 2026-08
bea --file august/main.bean report balance-sheet
bea --file august/main.bean report income-statement --time month
```

`--time 2026-08` pins the tutorial month; `--time month` always means the
current one, which is what you will reach for once your books are current.
From here, the [usage guide](https://github.com/bex-co/beancount-io/blob/main/cli/docs/USAGE.md)
covers queries, prices, and automation, and the [command
reference](https://github.com/bex-co/beancount-io/blob/main/cli/docs/REFERENCE.md)
lists every flag.
