# First year: an investor household, from init to year-end review

Use the installed Beancount skills to keep one synthetic household's 2026:
initialize with investor accounts, seed existing holdings, buy a house,
import broker activity, pay the mortgage from statements, swap crypto,
close June, and review holdings and realized gains at year end. The same
prompts work in Claude Code and Codex. Review each proposal before
confirming it; every stage ends in a checkpoint you can verify with the
printed `bea` command against
[expectations](examples/first-year-investor/expectations.json).

This guide needs Git, Python 3.9+, **bea 0.3.1 or later**, and the customer
suite from [the installation guide](installation.md). No account, hosted
service, or personal financial data is involved. See the
[sample-data contract](examples/first-year-investor/README.md) for the
independent expected figures and their arithmetic. The
[first-month guide](first-month.md) is the everyday-money counterpart.

## Prepare a fresh workspace

Run this in a terminal. Adjust `SKILLS_SRC` if you installed elsewhere.

```sh
export SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
export RUN="$(mktemp -d "${TMPDIR:-/tmp}/beancount-first-year.XXXXXX")"
export BOOKS="$RUN/books"
export INPUTS="$RUN/inputs"
export BEA="$(command -v bea)"
export GIT_OPTIONAL_LOCKS=0
mkdir -p "$BOOKS" "$INPUTS"
cp "$SKILLS_SRC"/docs/skills/examples/first-year-investor/*.csv "$INPUTS/"
cp "$SKILLS_SRC"/docs/skills/examples/first-year-investor/*.md "$INPUTS/"
git -C "$BOOKS" init -q
git -C "$BOOKS" config user.name "Synthetic Ledger User"
git -C "$BOOKS" config user.email "synthetic@example.invalid"
python3 "$SKILLS_SRC/scripts/skills/beancount-skills.py" install "$BOOKS/.claude/skills" "$BOOKS/.agents/skills"
python3 "$SKILLS_SRC/scripts/skills/beancount-skills.py" verify "$BOOKS/.claude/skills" "$BOOKS/.agents/skills"
"$BEA" --version
cd "$BOOKS"
```

Start `claude` or `codex` from this terminal. Pick one agent per run; use a
fresh `RUN` for the other. The prompts refer to `./main.bean` and to
`INPUTS/` — expand that to the absolute `$INPUTS` path when you paste.

## 1. Initialize with investor accounts

<!-- prompt: init-investor -->
```text
Set up a new Beancount ledger in this directory, USD, open date 2026-01-01, no Fava, with an opening balance of 150,000 USD in checking. Household accounts: a brokerage Assets:Brokerage holding USD and VTI with FIFO booking; a crypto wallet Assets:Crypto:Wallet holding BTC and ETH (booking: leave the STRICT default); a rental property OakSt (commodity OAKST) with a mortgage. Show me the proposed account opens (and explain the booking-method choice) before writing anything.
```

Review the opens: brokerage `USD,VTI "FIFO"`, wallet `BTC,ETH` with no
booking written (STRICT default), shared `Income:Dividends` and
`Income:CapitalGains`, and the OakSt property/mortgage/escrow set. Approve
with a plain yes. Checkpoint:

```sh
"$BEA" --file ./main.bean --json --no-input check
"$BEA" --file ./main.bean --json --no-input query "SELECT sum(number) WHERE account = 'Assets:Checking' AND currency = 'USD'"
```

Expect a passing check and `150000.00` (checkpoint `initialized`).

## 2. Seed existing holdings

<!-- prompt: seed-holdings -->
```text
Seed my existing holdings into ./main.bean from two cost-basis exports: INPUTS/broker-holdings.csv into Assets:Brokerage and INPUTS/crypto-holdings.csv into Assets:Crypto:Wallet. Show the per-export tie-out to each file's total before writing; use each lot's printed acquisition date.
```

Expect one opening proposal per export — broker lots `10 VTI {100.00,
2023-05-01}` + `5 VTI {120.00, 2024-06-15}` + 1000.00 cash tying to the
export's 2600.00, and `0.500000 BTC {40000.00, 2025-01-10}` tying to
20000.00 — each balanced against `Equity:OpeningBalances` (created by `bea init`). Approve each.
Checkpoint `seeded`:

```sh
"$BEA" --file ./main.bean --json --no-input query "SELECT account, currency, cost_number, cost_date, sum(number) AS units WHERE cost_number IS NOT NULL GROUP BY account, currency, cost_number, cost_date ORDER BY account, cost_date"
```

## 3. Buy the house

<!-- prompt: buy-house -->
```text
I bought OakSt on 2026-02-01 for $500,000 (commodity OAKST). Closing statement: $115,000 cash from Assets:Checking, a $400,000 mortgage, $10,000 of closing costs capitalized into basis, $2,000 of fees expensed to Expenses:ClosingCosts (propose its open), and a $3,000 escrow seed. Record it in ./main.bean.
```

Expect the closing arithmetic shown tied (500000 + 10000 + 2000 + 3000 =
115000 + 400000), a 510,000.00 basis lot, and the mortgage opened at
−400,000.00. Approve. Checkpoint `purchased`: checking `35000.00`,
mortgage `-400000.00`, escrow `3000.00`:

```sh
"$BEA" --file ./main.bean --json --no-input query "SELECT sum(number) WHERE account = 'Liabilities:Mortgage:OakSt'"
```

## 4. Import April broker activity

<!-- prompt: import-activity -->
```text
Import INPUTS/broker-activity.csv into ./main.bean — my Assets:Brokerage activity export. First time for this source, so confirm the column and action mapping with me and persist it.
```

Confirm the mapping (Run Date/Action/Symbol/Quantity/Price/Amount/Fees,
`%m/%d/%Y`, YOU BOUGHT/YOU SOLD/DIVIDEND RECEIVED). Expect the buy staged
at `10 VTI {250.00 USD}` with its own 5.00 fee leg, the 42.50 dividend
against `Income:Dividends`, and the sell reducing the **2023-05-01** lot
(FIFO) with a booking-produced 1000.00 gain. Approve the batch.
Checkpoint `imported`: brokerage cash `32.50`, lots left 5/5/10:

```sh
"$BEA" --file ./main.bean --json --no-input query "SELECT cost_number, cost_date, sum(number) AS units WHERE account = 'Assets:Brokerage' AND currency = 'VTI' GROUP BY cost_number, cost_date ORDER BY cost_date"
```

Re-running the same import prompt must report every row as already
imported and write nothing.

## 5. Pay the mortgage from statements

Record the four payments from `INPUTS/loan-statements.md`, one prompt per
month or all four described together — each must tie to its printed new
balance before it is proposed:

<!-- prompt: mortgage-payments -->
```text
Record the OakSt mortgage payments from INPUTS/loan-statements.md (March through June, each paid on the 1st from Assets:Checking) in ./main.bean. Use each statement's printed principal/interest/escrow split, and show the new-balance tie for each payment before writing.
```

Expect four entries (principal 600/610/620/630, escrow +300 each).
Checkpoint `paid`: mortgage `-397540.00`, escrow `4200.00`, interest
total `5940.00`, checking `25400.00`:

```sh
"$BEA" --file ./main.bean --json --no-input query "SELECT sum(number) WHERE account = 'Liabilities:Mortgage:OakSt'"
"$BEA" --file ./main.bean --json --no-input query "SELECT sum(number) WHERE account = 'Expenses:Interest'"
```

As a negative control, try a fifth prompt with only the total ("July
payment was $2,400, rate 6%") in a throwaway copy: the skill must ask for
the printed split and write nothing.

## 6. Swap crypto

<!-- prompt: swap -->
```text
I swapped 0.2 BTC for 4 ETH on 2026-06-15 in Assets:Crypto:Wallet (./main.bean). The swap value was $12,000 total. Record it.
```

Expect one entry: the 2025-01-10 BTC lot disposed `@@ 12000.00`, 4 ETH at
`{3000.00 USD}`, and a booking-produced 4000.00 gain (2026 realized gains
now 5000.00). Approve. Checkpoint `swapped`.

## 7. Close June

Reconcile checking against `INPUTS/checking-statement-june.md` first
(one row: the June mortgage payment; opening 27800.00, closing 25400.00):

<!-- prompt: reconcile-june -->
```text
Reconcile Assets:Checking in ./main.bean against INPUTS/checking-statement-june.md (June 2026). Show the coverage and the tie-out before writing anything.
```

Expect the account tied to 25400.00 with the day-after balance assertion
(2026-07-01) proposed; approve it. Then close the month:

<!-- prompt: close-june -->
```text
Close June 2026 for ./main.bean. Checking's statement is INPUTS/checking-statement-june.md; no statements are supplied for the other accounts, so disclose each of them as unverified rather than presenting it as checked. Propose the commit (only main.bean) and do not stage or commit until I approve. Never push.
```

Expect checking **tied** with a 2026-07-01 assertion at 25400.00, every
other balance-carrying account listed unverified, and the subject
`close: 2026-06 — 1 tied, <n> not tied` with the actual count. Review,
then approve the commit (or decline it — the report stays valid either
way; the checkpoint `closed_june` in expectations records the facts).

## 8. Year-end review: prices, holdings, realized gains

<!-- prompt: year-end-prices -->
```text
Record year-end prices in ./main.bean, all dated 2026-12-01: VTI 300.00 USD, BTC 60000.00 USD, ETH 3000.00 USD, OAKST 620000.00 USD.
```

<!-- prompt: year-end-holdings -->
```text
What do I hold at year end and what is it worth, per lot, with unrealized gains? Ledger is ./main.bean. Also: what were my realized gains in 2026?
```

Answer the realized half with `bea report capital-gains --from-date 2026-01-01 --to-date 2026-12-31`, tied to the booked figure with the query below; the per-lot unrealized half stays BQL.

Expect (checkpoint `year_end`), each from shown queries: market values
VTI 6000.00, BTC 18000.00, ETH 12000.00, OAKST 620000.00; unrealized
+2400.00 / +6000.00 / 0.00 / +110000.00; and realized 2026 gains of
5000.00 tied to the booked `Income:CapitalGains` figure (1000.00 from the
April sell, held more than a year; 4000.00 from the swap, also more than
a year). Verify independently:

```sh
"$BEA" --file ./main.bean --json --no-input query "SELECT -sum(number) AS booked WHERE account ~ 'CapitalGains' AND currency = 'USD' AND date >= 2026-01-01 AND date < 2027-01-01"
"$BEA" --file ./main.bean --json --no-input check
```

## If a checkpoint fails

Stop and read the mismatch. A figure that disagrees with
`expectations.json` means an entry landed differently than the journey
describes — inspect the current entries before retrying any write (some
commands may already have succeeded, and replaying can duplicate). Keep
the failing workspace and transcript under this run; begin again in a
fresh `RUN` rather than deleting files to force a pass. Record
agent/CLI versions, source revision, elapsed time, interventions, and
checkpoint output if sharing a rehearsal.
