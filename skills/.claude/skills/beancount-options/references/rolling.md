# Rolling

A "roll" is a single broker action that simultaneously closes one option position and opens a new one. Brokers usually display rolls as a single net credit or debit.

For beancount, **roll = two transactions, not one**. Each is a discrete tax event; combining them obscures the close P&L and complicates 1099-B reconciliation.

## Mechanics

A roll = BTC the existing position + STO the new position, on the same trade date. Each transaction has its own `^link`. The two are independent for tax purposes:

- The **close** transaction realizes gain/loss on the original short.
- The **open** transaction starts a new short with cost basis equal to its OWN gross premium × 100, NOT the net of the roll.

## Example: rolling a CSP down and out

You sold AAPL 150P expiring 6/20 for $1.50 ($150 basis). With expiry approaching, you decide to roll: buy back the 150P 6/20 for $0.40, sell to open the 145P 7/18 for $0.85. Fees $0.65 per leg.

Two transactions:

```
2026-05-02 * "BTC AAPL 150P 6/20" ^aapl-150p-20260620
  Assets:Brokerage:Robinhood:Cash                                       -40.65 USD
  Assets:Brokerage:Robinhood:Options    1 AAPL_PUT_20260620_00150000 {150.00 USD} @ 40.00 USD
  Expenses:Trading:Fees                                                  0.65 USD
  Income:Trading:OptionPremium

2026-05-02 * "STO AAPL 145P 7/18" ^aapl-145p-20260718
  Assets:Brokerage:Robinhood:Cash                              84.35 USD
  Assets:Brokerage:Robinhood:Options    -1 AAPL_PUT_20260718_00145000 {85.00 USD}
  Expenses:Trading:Fees                                          0.65 USD
```

Per-transaction balance:
- BTC: -40.65 + 150 + 0.65 + Income = 0 → Income = -110.00 (credit, $110 realized gain on close)
- STO: 84.35 + (-85) + 0.65 = 0 ✓

Net cash effect across both: 84.35 − 40.65 = +$43.70 (the broker's $45 net credit minus combined $1.30 fees). Matches.

## Why two transactions, not one

Combining both legs into one transaction would:
- Mix two distinct tax events
- Make 1099-B reconciliation harder (the broker reports the close as one row, the open creates a separate position whose basis is its own STO premium)
- Confuse the cost basis of the new short (it's the new STO price, not the net of the roll)

## Variations

### Roll up

BTC current strike, STO higher strike, same or different expiry. Same structure.

### Roll out (same strike, later expiry)

BTC current expiry, STO later expiry, same strike. Same structure.

### Roll for credit vs debit

Sign of net cash determines credit/debit. Doesn't change the transaction structure — just the cash leg amounts.

### Roll on assignment day

Some brokers allow rolling up to the moment of assignment. If the option was technically already exercised, what looks like a roll is really an assignment + a new short. Verify with the user; if post-assignment, generate an assignment transaction (see `assignment.md`) plus a new STO.

### Rolling a multi-leg position

Rolling a vertical = BTC the entire spread (one transaction with both legs) + STO a new spread (one transaction with two new legs). Still two transactions total, each with its own `^link`. Don't try to roll leg-by-leg unless the broker actually fills them separately.

## Common confusions

- **Net premium isn't the new basis.** New STO's basis is its OWN gross premium × 100 ($85.00 in the example), not the $0.45 net credit × 100.
- **Don't reuse the old `^link` on the new STO.** New position, new identifier.
- **Don't combine into one fancy multi-posting transaction.** It might balance but it's wrong for taxes.
- **Per-leg fees.** If broker reports separate fees for close and open, fold each into its own `Expenses:Trading:Fees`. If only a combined fee, split or assign to one leg — small inconsistency, harmless.

## Verification check

After generating a roll, verify:
- Two transactions exist (not one)
- Close transaction's `^link` matches the original open
- New open has a fresh `^link`
- New open's cost basis = its own STO premium × 100 (NOT the net of the roll)
- Net cash across both transactions matches the broker's reported net credit/debit
- Run `bea --file "$ledger" check` against the root — both transactions should balance. The no-bea path is in beancount-init's `references/compatibility.md`.
