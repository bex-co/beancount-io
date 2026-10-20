---
name: beancount-options
description: Record a described options trade or lifecycle event as validated transactions in a local Beancount ledger through bea, after review and confirmation. Use for single-leg or multi-leg opens, closes, rolls, assignment, exercise and expiration, including pasted broker confirmations. Skip options education, pricing/greeks, tax planning, analytics, broker statement imports, other manual entries (beancount-add), share, fund, and crypto trades and realized-gains reports (beancount-trade), ledger `option` settings such as operating_currency, and ledgers hosted on Beancount.io.
license: MIT-0
metadata:
  openclaw:
    homepage: 'https://github.com/bex-co/beancount-io/tree/main/skills'
    requires:
      anyBins:
        - bea
        - bean-check
    install:
      - id: brew
        kind: brew
        formula: bex-co/tap/bea
        bins:
          - bea
        label: Install bea (Homebrew)
      - id: uv
        kind: uv
        package: beancount-io
        bins:
          - bea
        label: Install bea (uv)
  hermes:
    category: finance
    tags:
      - beancount
      - accounting
      - options-trading
      - investments
---

# beancount-options

Turn natural-language options descriptions into correct beancount transactions.

This skill exists because options accounting in beancount has subtle mechanics that are easy to get wrong by hand: short-position cost basis lives in negative-quantity holdings, premium becomes part of stock cost basis on assignment, multi-leg trades need link grouping, and the four close paths (close, expire, assign, exercise) produce different P&L treatment. The skill takes a description, infers the strategy and outcome, generates the correct transaction(s), and — only after explicit confirmation — appends them to the user's ledger.

## Prefer `bea`

Read beancount-init's `references/bea-cli.md` (from this skill's folder, `../beancount-init/references/bea-cli.md`; a copy at `references/bea-cli.md` when this skill was installed alone) before running ledger commands: it defines explicit root/destination paths, JSON batches, checks, and safe retries. Without `bea`, use beancount-init's `references/compatibility.md`.

Write approved account opens and transactions through `bea`. Preserve cost
basis, inferred postings, tags and links. Use structured JSON batches for
explicit lots and the shared native `add transaction --posting` recipe for
`{}` lot selection or total-cost syntax. Keep the strategy-specific reasoning
and confirmation below.

## Scope

**Does:** turn a described options trade or lifecycle event into new transactions, appended to the user's ledger after confirmation and validated through the root check.

**Does not:** modify or bulk-rewrite existing transactions; touch `option`, `plugin`, or `include` directives; compute wash sales, greeks, P&L curves, or other analytics; import broker statements (a different workflow); record other manual entries (`beancount-add`); record share, fund, or crypto trades or report realized gains (`beancount-trade`).

## Workflow

Five phases, in order: **Discover → Parse → Generate → Confirm + Write → Verify**.

### 1. Discover

Local ledger files only. If the ledger is hosted on Beancount.io and its MCP server is connected, use that server's tools instead (beancount-init's `references/bea-cli.md`, Hosted ledgers).

Before generating anything, learn the user's ledger. Look for beancount files in the working directory:

```bash
fd -e beancount -e bean . | head -20
# fallback: find . -maxdepth 4 \( -name '*.beancount' -o -name '*.bean' \)
```

The "main" file is typically the one with `option`, `plugin`, or `include` directives at the top, or the largest file with `open` directives. Once found, scan it for:

- **Existing options accounts**: `^[0-9]{4}-[0-9]{2}-[0-9]{2} open .*Option`
- **Existing brokerage hierarchy**: `^[0-9]{4}-[0-9]{2}-[0-9]{2} open Assets:[^:]+:[^:]+:` (capture the broker name segment)
- **Existing option commodity symbols**: any prior options-shaped commodities used in postings
- **Existing config block**: a comment block at the top starting with `;; beancount-options config`
- **Append target**: the file where existing options entries currently live (could be the main file or an included subfile, possibly year-bucketed by date)

Report findings to the user before generating, so they can correct any misdetection. If discovery is ambiguous, ask:
- Where is your main beancount file?
- Have you been recording options trades before? (If yes, point to one — we'll match its style.)

If no prior options activity exists, propose:
- Account hierarchy: `Assets:Brokerage:<BrokerName>:{Cash,Options,Stock}` and `Income:Trading:OptionPremium`
- Commodity format: OCC-style (`AAPL_PUT_20260620_00150000`)
- Append target: the main file unless obvious sub-files exist

Persist the choice as a config comment block at the top of the main file:

```
;; beancount-options config
;; commodity_format: occ_v1
;; append_target: ./transactions/2026.beancount
;; broker_default: Robinhood
```

This is the contract going forward — re-read it on every invocation rather than re-detecting from scratch. Write the block as part of the first confirmed append (never before it); when prior options entries exist without one, propose adding it in that run's confirmation.

### 2. Parse

Reduce the user's description to a structured representation:

| Field | Required | Notes |
|---|---|---|
| underlying | yes | Ticker symbol |
| strategy | yes | single-leg, vertical, calendar, condor, etc. |
| action | yes | open, close, expire, assign, exercise, roll |
| broker | yes | Ask if not specified or detectable |
| trade_date | yes | Default: today |
| legs[] | yes | Each leg: direction (long/short), type (call/put), strike, expiry, qty |
| premium_per_contract | open/close only | Net or per-leg, depending on input |
| fees | optional | Folded into cash leg |

Parsing rules:
- If the user pastes a broker confirmation, extract fields directly. Brokers vary; common patterns include `Sold to Open 1 AAPL Jun 20 '26 $150 Put @ 1.50`.
- If conversational, identify what's stated and ask for what's missing. **Don't guess** premiums, strikes, or expiries — wrong basis math is harder to spot later than a follow-up question.
- For multi-leg trades, recommend pasting the full fill confirmation. If they describe leg-by-leg, gather all legs before generating.

### 3. Generate

Each strategy + outcome maps to a transaction template. **Read the matching `references/<strategy>.md` file before generating**, even if the pattern feels obvious. References encode edge cases you might miss.

Universal generation rules — apply unless a reference file overrides:

- **Cost basis is per CONTRACT, not per share.** Each option contract is 1 unit in beancount. The unit's cost basis equals the **gross dollar premium** (premium × 100). For a $1.50 premium contract: `{150.00 USD}`, NOT `{1.50 USD}`.
  - Why: `-1 X {1.50 USD}` has posting weight -$1.50, but the cash leg is +$150. The transaction won't balance. Per-contract basis (`{150.00 USD}`) does balance against a per-contract cash leg.
- **Cost basis on shorts**: negative units, basis = gross premium × 100 per contract.
- **Cost basis on longs**: positive units, basis = gross premium × 100 per contract.
- **Fees: explicit `Expenses:Trading:Fees` posting**. Cash leg = net premium (gross − fees for STO/STC, gross + fees for BTO/BTC). Don't fold fees into cost basis. This keeps cost basis as a clean dollar number, which makes assignment arithmetic produce clean per-share stock basis (strike − premium-per-share = whole cents).
- **Multi-leg open in one fill**: one transaction, all legs as separate postings, single shared `^link`.
- **Multi-leg close**: same — one transaction per fill ticket, linked.
- **Roll**: two transactions (close then open), each with its own `^link`. Don't combine. See `references/rolling.md`.
- **Assignment**: option closes at $0; resulting stock opens with cost basis adjusted for the original premium. No income line for the option itself. See `references/assignment.md`.
- **Exercise** (long option you exercised): mirror of assignment — premium adjusts stock basis, no separate option income. See `references/exercise.md`.
- **Expiration**: identical to a close at $0 premium.
- **`{}` disposal requires the held lot**: a `-100 AAPL {}` posting matches an existing stock lot in that account. If the shares aren't booked in the ledger yet, book (or ask about) the purchase first — otherwise `bea check` fails with the unintuitive `Too many missing numbers for currency group 'USD'`.

### 4. Confirm + Write

Show the target path, any new `open` directives, and the transactions exactly as they will be written, then ask:

```
Target file: ./transactions/2026.beancount

New account opens (if any):
2026-05-01 open Assets:Brokerage:Robinhood:Options
2026-05-01 open Income:Trading:OptionPremium USD
2026-05-01 open Expenses:Trading:Fees USD

Proposed transaction:
2026-05-01 * "STO AAPL 150P 6/20" ^aapl-150p-20260620
  Assets:Brokerage:Robinhood:Cash                              149.35 USD
  Assets:Brokerage:Robinhood:Options    -1 AAPL_PUT_20260620_00150000 {150.00 USD}
  Expenses:Trading:Fees                                          0.65 USD

Append to ./transactions/2026.beancount? (yes/no)
```

On yes, open the approved new accounts with the shared `add open` recipe,
then write the confirmed batch:

```sh
bea --file "$ledger" --json --no-input add transactions --from "$batch" --into "$target"
```

Use the proposed destination, including for year-bucketed files; validate
through the root ledger. Native lot-selection transactions use the shared
`add transaction --posting` recipe with the same root and destination.
Update only the reviewed config comment block.
On no, revise the proposal. Never write before confirmation. If a command
fails, inspect earlier successful writes before retrying the batch.

### 5. Verify

Verify the root ledger after writing:

```sh
bea --file "$ledger" --json --no-input check
```

Use beancount-init's `references/compatibility.md` only when `bea` is absent.

If the check reports **any** errors (transaction does not balance, lot booking
failure, undeclared account, etc.), report the exact check output instead of
success, propose a fix when the error identifies the cause, and leave the
written entries in place so the user can see what failed.

This step exists because the cost-basis arithmetic is subtle, especially for assignment, exercise, and multi-leg trades. Catching an error now is much cheaper than discovering it later during 1099-B reconciliation.

If no checker is available, report the result as unvalidated and suggest installing `bea`; manual posting weights do not establish correct lot booking.

## Universal mechanics

### Commodity naming

If existing options trades use a convention, conform to it. Otherwise default to OCC-style:

```
<UNDERLYING>_<TYPE>_<YYYYMMDD>_<STRIKE_PADDED>
```

`STRIKE_PADDED` is 8 digits: 5 dollars + 3 decimal places. Examples:
- $150 strike → `00150000`
- $9.50 strike → `00009500`
- $2,500 strike (e.g. AMZN pre-split) → `02500000`

Full example: `AAPL_PUT_20260620_00150000` for AAPL $150 put expiring June 20, 2026.

Optional commodity directive with metadata for queries:
```
2026-05-01 commodity AAPL_PUT_20260620_00150000
  underlying: "AAPL"
  expiry: 2026-06-20
  strike: 150.00 USD
  option_type: "PUT"
```

### Account structure

```
Assets:Brokerage:<BrokerName>:Cash
Assets:Brokerage:<BrokerName>:Options
Assets:Brokerage:<BrokerName>:Stock
Income:Trading:OptionPremium
Income:Trading:CapitalGains
Expenses:Trading:Fees
```

Detect the broker name from existing accounts and preserve case. If the broker doesn't yet exist in the ledger, generate `open` directives alongside the trade.

### The four outcomes

| Outcome | Option position | Stock side-effect | Income line |
|---|---|---|---|
| Buy/Sell to close | → 0 | None | Yes (P&L = open premium − close premium) |
| Expire worthless | → 0 at $0 | None | Yes (full premium) |
| Assigned (short) | → 0 at $0 | Forced trade at strike | None — premium adjusts stock basis |
| Exercised (long) | → 0 at $0 | Voluntary trade at strike | None — premium adjusts stock basis |

### Trade date convention

Always use the **trade date** (date the order filled), not settlement. 1099-B reports trade date in both date columns; matching it now saves reconciliation pain later.

### Fees

Use an explicit `Expenses:Trading:Fees` posting. The cash leg holds the **net** premium (gross premium ± fees, depending on direction); the option leg's cost basis holds the **gross** premium × 100.

Why this convention:
- Keeps cost basis as a clean whole-dollar number, so assignment math produces clean per-share stock basis (strike − premium-per-share = whole cents).
- Fees per trade are easy to query at year-end; net proceeds for 1099-B reconciliation are still recoverable (gross proceeds − fees).
- Folding fees into basis would produce fractional-cent stock basis values like $148.5065/share that are awkward to read.

## Strategy routing

Identify the strategy and read the matching reference file before generating.

| Strategy | Reference |
|---|---|
| Cash-secured put, naked put, naked call, long call, long put | `references/single-leg.md` |
| Covered call, protective put, collar, married put | `references/stock-plus-option.md` |
| Bull call spread, bear call spread, bull put spread, bear put spread, debit/credit spread | `references/verticals.md` |
| Iron condor, iron butterfly, condor, butterfly, broken-wing variants | `references/condors-and-butterflies.md` |
| Long/short straddle, long/short strangle | `references/volatility-strategies.md` |
| Calendar spread, double calendar, diagonal spread | `references/calendars-and-diagonals.md` |
| Wheel strategy (CSP→assign→CC→assign sequence) | `references/wheel.md` |
| Synthetic long/short, conversion, reversal, ratio spread, jade lizard | `references/exotics.md` |

Outcome-specific:
- Assignment | `references/assignment.md`
- Exercise (long option) | `references/exercise.md`
- Rolling (BTC + STO same broker action) | `references/rolling.md`

Tax carve-outs:
- Index options (SPX, NDX, RUT, VIX, XSP) — Section 1256 | `references/section-1256.md`
- Wash sales | `references/wash-sales.md`
- Multi-broker considerations | `references/multi-broker.md`

If a description doesn't fit cleanly into one of these, default to single-leg or verticals and ask the user to confirm the strategy name.

## Edge cases worth surfacing

- **Fractional/sub-dollar strikes**: handled by OCC's 3-decimal strike encoding.
- **Adjusted contracts** (post-split, post-merger): non-standard. Ask the user for the OCC symbol the broker assigned.
- **Mini contracts** (10-share multiplier): rare but exists. Ask explicitly if there's any chance.
- **Same-day open and close**: still two transactions.
- **Partial closes**: closing N of M open contracts is supported; remaining stay open at original basis.
- **Index options**: trigger Section 1256 reference; note 60/40 treatment and Form 6781 implications; this skill does not compute them.
- **Dividends during a covered call holding period**: dividends post separately to `Income:Dividends`. Qualified-CC rules can affect tax treatment of the dividend itself — see stock-plus-option reference.
- **LEAPS held >1 year then closed**: only options case where long-term capital gains apply for **long** positions. Short positions are always short-term regardless of holding period.
