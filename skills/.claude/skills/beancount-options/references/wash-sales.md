# Wash sales

A wash sale occurs when you close an options position at a **loss** and re-open a "substantially identical" position within 30 days (before or after the loss). The IRS disallows the loss for the year and rolls it into the cost basis of the replacement position.

## Within a single broker

Brokers compute and report wash-sale adjustments on the 1099-B (box 1g). **Trust the broker**. Don't try to compute it from scratch in beancount.

When a wash sale is reported:
1. Record the loss-side close normally (the realized loss auto-balances into `Income:Trading:OptionPremium`), tag it `#wash-sale`, and add metadata showing the disallowed amount.
2. Record the replacement position with basis = its own gross premium × 100 **plus** the disallowed amount, posting the uplift as a credit to `Income:Trading:OptionPremium`. The loss disappears from the current year's P&L (net zero across the two entries) and re-appears as reduced gain / increased loss when the replacement closes — exactly the IRS deferral.

```
2026-06-01 * "BTO AAPL 150P 6/20" ^aapl-150p-20260620-long
  Assets:Brokerage:Robinhood:Cash                                       -200.65 USD
  Assets:Brokerage:Robinhood:Options     1 AAPL_PUT_20260620_00150000 {200.00 USD}
  Expenses:Trading:Fees                                                   0.65 USD

2026-06-15 * "STC AAPL 150P 6/20 (wash sale)" #wash-sale ^aapl-150p-20260620-long
  wash_sale_disallowed: 50.00 USD
  Assets:Brokerage:Robinhood:Cash                                        149.35 USD
  Assets:Brokerage:Robinhood:Options    -1 AAPL_PUT_20260620_00150000 {200.00 USD} @ 150.00 USD
  Expenses:Trading:Fees                                                   0.65 USD
  Income:Trading:OptionPremium

2026-06-20 * "BTO AAPL 150P 7/18 (replacement; basis carries the disallowed loss)" #wash-sale ^aapl-150p-20260718-long
  Assets:Brokerage:Robinhood:Cash                                       -180.65 USD
  Assets:Brokerage:Robinhood:Options     1 AAPL_PUT_20260718_00150000 {230.00 USD}
  Expenses:Trading:Fees                                                   0.65 USD
  Income:Trading:OptionPremium                                          -50.00 USD
```

Math: the STC auto-balances to `Income:Trading:OptionPremium +50.00` (a debit — the $50 realized loss). The replacement BTO carries `{230.00 USD}` basis ($1.80 premium × 100 + $50 disallowed), and its explicit `-50.00 USD` credit offsets the loss, so the pair nets to zero in the current year while the basis defers the loss into the replacement. All three transactions balance individually.

This is approximate — beancount can't enforce the substantially-identical determination. The broker's 1099-B is authoritative.

## Across brokers

If the user closes a position at Broker A and opens substantially identical at Broker B within 30 days, **neither 1099-B will catch it**. The user is responsible for tracking and reporting cross-broker wash sales themselves.

This skill flags the possibility but doesn't auto-detect cross-broker wash sales in v1. If the user has multiple broker accounts and frequent options trading, recommend they manually review at year-end.

## What "substantially identical" means for options

- Same underlying + same type (call/put) + same strike + same expiry → definitely substantially identical
- Different strike or different expiry → usually not, but IRS guidance is murky for very close substitutes
- Different underlying → not

The skill doesn't make this determination. It just records what the broker reports.

## Common confusions

- **Only losses trigger wash-sale rules.** Closing at a gain is not a wash sale even if you re-open immediately.
- **Both directions of the 30-day window count**: 30 days before or after the loss.
- **Disallowed loss is rolled into replacement basis**, not lost forever. It comes back when the replacement is closed (assuming no further wash sale).
