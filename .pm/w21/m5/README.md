# w21 · m5 — Entries that fail booking stay listed, marked, and out of every balance

**Worker:** worker1 **Goal:** a transaction the engine cannot book (for example a sale with no matching lot) is shown as "not booked" and counted nowhere, so balances sum to zero as Beancount's do **Status:** todo (t001–t006 done)

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Mark transactions that failed booking in the ledger snapshot — **DONE** | 60m | — |
| t002 | Balances skip not-booked transactions — **DONE** | 60m | t001 |
| t003 | BQL skips not-booked transactions — **DONE** | 45m | t001 |
| t004 | Carry the not-booked flag on REST, GraphQL and MCP — **DONE** | 60m | t002 |
| t005 | Show a "Not booked" marker in the mobile app and the dashboard — **DONE** | 60m | t004 |
| t006 | Adoption surface — **DONE** | 20m | t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t007, t008 |

## Definition of done

On the fixture below, the trial balance matches `bean-query` (cash 4000.00, 10 VTI at cost 100, no gains) and sums to zero; a BQL query agrees; the booking error is still listed; the QA Sell entry is still returned by the journal and Entry Context, flagged as not booked on REST, GraphQL and MCP; and both apps mark it.

```
2026-01-02 * "QA Fund"   ; BrCash +5000.00, Equity -5000.00
2026-02-01 * "QA Buy"
  Assets:Broker  10 VTI {100.00 USD}
  Assets:BrCash  -1000.00 USD
2026-03-01 * "QA Sell"
  Assets:Broker  -5 VTI {101.00 USD} @ 120.00 USD
  Assets:BrCash  600.00 USD
  Income:Gains
```

**Deploy order:** ledger service, then backend-v2, then the apps.

## Source + Goal linkage

- **Source:** promoted from w21/678 (owner decision 2026-10-30: option b, list the entry marked and keep it out of balances so the user can open and fix it, w21/367).
- **Goal linkage:** **A2 — Frictionless onboarding** (a first-time user who mistypes a sale sees honest numbers, not figures Beancount itself would reject) and **A1 — Agent-native accounting** (an agent reading balances gets the same numbers as `bean-query`).
- **Expected outcome:** Accounts, net worth and account detail agree with Beancount on ledgers that contain a failed-booking entry, and the entry is easy to find and fix.
- **Why now:** it is a major-severity numeric disagreement with the reference tool, and the owner has decided the behavior.
- **Parity:** REST, GraphQL and MCP together (t004).
- **Adoption surface:** included — users and agents see balances and the marker.
