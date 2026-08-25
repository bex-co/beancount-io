# Assignment

When a short option is assigned, the option position closes and the user is forced into a stock trade at the strike. The original premium received does NOT become a separate income line — it adjusts the cost basis (or proceeds) of the resulting stock.

This matches IRS treatment and how brokers report on 1099-B.

## Cost basis convention reminder

Option cost basis is **per contract** (premium × 100), not per share. Original short put @ $2.10 = `{210.00 USD}` basis on a -1 unit position.

## Short put assigned (forced to buy 100 shares)

You sold a put for premium P, got assigned, must buy 100 shares at strike K. Stock per-share basis = K − P (where P is per-share premium). Equivalent: stock total cost = strike × 100 − option_basis.

Example: sold SPY 480P for $2.10 ($210 basis), assigned. Must buy 100 shares at $480.
- Stock per-share basis = 480 − 2.10 = $477.90
- Stock total cost = 100 × 477.90 = $47,790

```
2026-05-01 * "ASSN SPY 480P 5/1 → bought 100 SPY @ 480" ^spy-480p-20260501
  Assets:Brokerage:Robinhood:Cash                                  -48000.00 USD
  Assets:Brokerage:Robinhood:Options    1 SPY_PUT_20260501_00480000 {210.00 USD} @ 0.00 USD
  Assets:Brokerage:Robinhood:Stock      100 SPY {477.90 USD}
```

Math: -48000.00 + 210.00 + 47790.00 = 0 ✓

How it balances: the option closes at $0 disposal (would normally generate +$210 income), and the stock comes in at $47,790 (= $48,000 strike − $210 premium). The "phantom" $210 income from closing the short is exactly absorbed by reducing the stock basis. No `Income:Trading:OptionPremium` posting needed.

If you wrote stock basis at full strike ($480/share = $48,000 total) instead of the adjusted $477.90/share, beancount would force a balancing line — typically pushing the $210 to `Income:Trading:OptionPremium`. That's incorrect tax treatment.

## Short call assigned (forced to sell 100 shares)

You sold a call for premium P, got assigned, must sell 100 shares at strike K. Effective per-share proceeds = K + P.

### Covered call assignment

You held 100 shares at some basis B. Stock leaves at strike, premium folds into the effective sale price.

Example: held 100 AAPL at $148/share basis, sold 160C for $2.00 ($200 basis), assigned.
- Effective per-share disposal price = 160 + 2.00 = $162.00
- Realized gain on stock = (162 − 148) × 100 = $1,400

```
2026-06-20 * "ASSN AAPL 160C 6/20 → sold 100 AAPL @ 160" ^aapl-160c-20260620
  Assets:Brokerage:Robinhood:Cash                                  16000.00 USD
  Assets:Brokerage:Robinhood:Options    1 AAPL_CALL_20260620_00160000 {200.00 USD} @ 0.00 USD
  Assets:Brokerage:Robinhood:Stock     -100 AAPL {} @ 162.00 USD
  Income:Trading:CapitalGains
```

The `{}` empty cost selector tells beancount to match against any held lot of AAPL. The `@ 162.00 USD` (strike + premium per share) sets the effective disposal price. `Income:Trading:CapitalGains` auto-balances.

Math: 16000 + 200 + (-100 × 148 from inventory match) + Income = 0 → Income = -1400.00 (credit, gain).

Do NOT post `Income:Trading:OptionPremium` separately. The premium is folded into the disposal price.

### Naked call assignment (now short stock)

If you didn't own the shares, assignment puts you short 100 shares at K. Short stock basis = K + P (the price you "sold" them at).

```
2026-06-20 * "ASSN AAPL 160C 6/20 → short 100 AAPL @ 160" ^aapl-160c-20260620
  Assets:Brokerage:Robinhood:Cash                                  16000.00 USD
  Assets:Brokerage:Robinhood:Options    1 AAPL_CALL_20260620_00160000 {200.00 USD} @ 0.00 USD
  Assets:Brokerage:Robinhood:Stock     -100 AAPL {162.00 USD}
```

Math: 16000 + 200 + (-100 × 162) = 0 ✓

Income recognition happens when you eventually buy to close the short stock.

## What NOT to do on assignment

- **Don't book the premium as `Income:Trading:OptionPremium`.** It's already deferred into the stock's cost basis or disposal price.
- **Don't keep the option on the books.** It closes the day of assignment.
- **Qualified-CC implications**: if the call was a qualified covered call (sufficiently OTM, sufficient time-to-expiry), assignment doesn't break the underlying stock's holding period. If unqualified, assignment may convert long-term to short-term. This skill doesn't compute qualification; flag for user awareness if the holding period is near a year.

## Tax form impact

- The **option** does not appear on Form 8949 — no separate row for the assigned put or call.
- The **stock** disposition appears on Form 8949 with the basis already net of the premium (for puts assigned) or the disposal price already including the premium (for calls assigned).

This matches IRS treatment of options assigned at expiration.

## Verification check

After generating an assignment transaction, verify:
- The option leg uses `{<original_basis>} @ 0.00 USD` (closes the short)
- For puts: stock basis = strike × 100 − option_basis (per share = strike − premium per share)
- For covered calls: stock disposal price = strike + premium per share; `Income:Trading:CapitalGains` auto-balances
- No `Income:Trading:OptionPremium` posting on assignment
- Link matches the original opening transaction's link
- Run `bean-check` on the file — should pass with no errors
