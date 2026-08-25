# The wheel

The wheel is a sequence of single-leg trades:

1. Sell a cash-secured put on a stock you'd be willing to own.
2. If it expires worthless: keep premium, sell another CSP. Repeat from step 1.
3. If assigned: now own 100 shares with cost basis = strike − put premium per share.
4. Sell a covered call on those shares.
5. If the call expires worthless: keep premium, sell another CC. Repeat from step 4.
6. If the call gets assigned: shares leave at strike + call premium per share. Realize stock gain/loss. Back to step 1.

Each step is its own transaction (or sequence). There's no "wheel" entity in beancount — the strategy is a workflow.

## What the skill should track

When the user describes any wheel step:
- Generate the appropriate single-leg or assignment transaction following `single-leg.md` and `assignment.md`.
- Optionally tag transactions with `#wheel` for cycle queries later.
- A wheel-specific tag like `^wheel-aapl-2026q2` can span multiple transactions if the user wants explicit grouping.

## Worked example: full wheel cycle

### Step 1: Sell a CSP

```
2026-05-01 * "STO AAPL 150P 6/20 (wheel)" ^aapl-150p-20260620 #wheel
  Assets:Brokerage:Robinhood:Cash                              149.35 USD
  Assets:Brokerage:Robinhood:Options    -1 AAPL_PUT_20260620_00150000 {150.00 USD}
  Expenses:Trading:Fees                                          0.65 USD
```

### Step 2: Assigned, now own 100 shares

```
2026-06-20 * "ASSN AAPL 150P → bought 100 AAPL @ 150 (wheel)" ^aapl-150p-20260620 #wheel
  Assets:Brokerage:Robinhood:Cash                                  -15000.00 USD
  Assets:Brokerage:Robinhood:Options    1 AAPL_PUT_20260620_00150000 {150.00 USD} @ 0.00 USD
  Assets:Brokerage:Robinhood:Stock      100 AAPL {148.50 USD}
```

Effective stock basis: $148.50 (strike $150 − put premium $1.50/share).

### Step 3: Sell a CC against those shares

```
2026-06-25 * "STO AAPL 160C 7/18 (wheel cc)" ^aapl-160c-20260718 #wheel
  Assets:Brokerage:Robinhood:Cash                              199.35 USD
  Assets:Brokerage:Robinhood:Options    -1 AAPL_CALL_20260718_00160000 {200.00 USD}
  Expenses:Trading:Fees                                          0.65 USD
```

### Step 4: Call expires worthless

```
2026-07-18 * "EXP AAPL 160C 7/18 worthless (wheel)" ^aapl-160c-20260718 #wheel
  Assets:Brokerage:Robinhood:Options    1 AAPL_CALL_20260718_00160000 {200.00 USD} @ 0.00 USD
  Income:Trading:OptionPremium
```

Realize +$200 income (full premium kept). Stock still held.

### Step 5: Sell another CC — and this time it gets assigned (two events, two transactions)

```
2026-07-25 * "STO AAPL 165C 8/15 (wheel cc)" ^aapl-165c-20260815 #wheel
  Assets:Brokerage:Robinhood:Cash                              249.35 USD
  Assets:Brokerage:Robinhood:Options    -1 AAPL_CALL_20260815_00165000 {250.00 USD}
  Expenses:Trading:Fees                                          0.65 USD

2026-08-15 * "ASSN AAPL 165C → sold 100 AAPL @ 165 (wheel)" ^aapl-165c-20260815 #wheel
  Assets:Brokerage:Robinhood:Cash                                  16500.00 USD
  Assets:Brokerage:Robinhood:Options    1 AAPL_CALL_20260815_00165000 {250.00 USD} @ 0.00 USD
  Assets:Brokerage:Robinhood:Stock     -100 AAPL {} @ 167.50 USD
  Income:Trading:CapitalGains
```

Stock gain: ($167.50 − $148.50) × 100 = +$1,900.

### Step 6: Back to step 1 — start a new wheel

A new `^link` and a new tag (`#wheel-cycle-2`) signal a new cycle.

## Common confusions

- **No "wheel" position in beancount.** The wheel is a workflow; each transaction stands alone.
- **Stock basis decreases on CSP assignment**, increases (effectively) on CC assignment via proceeds adjustment. The premium is always inside cost basis at the moment it would otherwise become income.
- **Don't double-count premium.** When a CSP is assigned, the put premium has already reduced stock basis — don't ALSO book it as income.
- **Tagging discipline.** Consistent `#wheel` or `^wheel-aapl-cycle1` makes querying full-cycle P&L trivial.
