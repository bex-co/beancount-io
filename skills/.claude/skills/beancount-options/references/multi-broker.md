# Multi-broker handling

When the user holds options across multiple brokers, each broker's accounts must be isolated. Cross-broker effects are mostly out of scope, with one exception (cross-broker wash sales).

## Account isolation

Each broker gets its own subtree under `Assets:Brokerage:`:

```
Assets:Brokerage:Robinhood:Cash
Assets:Brokerage:Robinhood:Options
Assets:Brokerage:Robinhood:Stock
Assets:Brokerage:IBKR:Cash
Assets:Brokerage:IBKR:Options
Assets:Brokerage:IBKR:Stock
Assets:Brokerage:Schwab:Cash
...
```

When generating a transaction:
- The broker is determined from the user's description.
- Use only that broker's accounts in the transaction.
- Do not mix brokers in a single transaction.

## Detecting the broker

Order of preference:
1. User explicitly names it ("on Robinhood", "in my IBKR account")
2. User pastes a broker confirmation with the broker's letterhead/header
3. Skill asks if not specified

If only one broker exists in the user's ledger, default to it. Don't silently assume; mention the assumption ("appending to your Robinhood account; let me know if this is for a different broker").

## Append target

Different brokers may have different append targets in the user's ledger:
- Same single file
- Per-broker files (`robinhood.beancount`, `ibkr.beancount`)
- Per-year files within per-broker subdirectories

Detect the pattern from existing entries for that broker. If unclear, ask.

## Cross-broker wash sales

The one cross-broker concern that matters for tax accuracy. See `wash-sales.md`. Brokers don't see each other; the user is responsible for tracking these manually.

The skill doesn't auto-detect them. At most, flag for user awareness if they're trading the same underlying across brokers within 30-day windows.

## Common confusions

- **Same commodity symbol, different brokers**: a `AAPL_PUT_20260620_00150000` contract held at Robinhood and at IBKR are the same OCC symbol. They're tracked in separate `Options` accounts but share the commodity definition. Beancount handles this correctly because units are tracked per-account.
- **Don't merge cash across brokers.** A "transfer" between brokers is a separate transaction (debit one `Cash`, credit another), not a wash.
- **Currency**: most US brokers use USD. If the user has a CAD or other-currency account, make sure the cash leg's currency matches the broker.
