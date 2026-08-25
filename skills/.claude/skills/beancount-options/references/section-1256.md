# Section 1256 (broad-based index options)

Some options qualify as "Section 1256 contracts" under U.S. tax code, with very different tax treatment from regular equity options:

- **60/40 treatment**: 60% long-term capital gain/loss, 40% short-term, regardless of holding period.
- **Mark-to-market at year-end**: open positions are treated as if closed on December 31 at fair market value. Any unrealized gain/loss is recognized.
- Reported on **Form 6781**, not Form 8949.

## What qualifies

- Broad-based index options: SPX, NDX, RUT, VIX, XSP, OEX
- Not single-stock options (AAPL, MSFT, etc.)
- Not narrow-based ETFs in most cases — but SPY, QQQ, IWM are technically equity options on ETFs and follow normal rules

If the underlying is a single stock or ETF (other than the broad-based indexes listed), use regular treatment.

## What this skill does in v1

- **Generates the same transaction structure** as regular equity options. The beancount mechanics don't change.
- **Flags index options** when detected so the user knows Section 1256 treatment applies.
- **Does NOT compute** mark-to-market, 60/40 split, or Form 6781 figures. That's a year-end reconciliation task (phase 2).

## Recommended tagging

Tag index option transactions with `#section-1256` to make them filterable for year-end tax export:

```
2026-05-01 * "STO SPX 4500P 6/20" ^spx-4500p-20260620 #section-1256
  Assets:Brokerage:IBKR:Cash                              4499.35 USD
  Assets:Brokerage:IBKR:Options    -1 SPX_PUT_20260620_04500000 {4500.00 USD}
  Expenses:Trading:Fees                                          0.65 USD
```

## Year-end mark-to-market (deferred to phase 2)

For now, just flag to the user that any open Section 1256 position at year-end will need to be marked-to-market for tax purposes. They'll need to:
1. Look up FMV at end of year
2. Recognize unrealized gain/loss as 60/40
3. Reset basis to FMV for the new year

This skill won't generate those transactions in v1.
