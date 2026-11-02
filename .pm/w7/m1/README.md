# w7 · m1 — Plan limits resolve from Stripe and store subscriptions alike

**Worker:** worker1 **Goal:** the backend can hold App Store and Google Play subscriptions and resolves one plan per account from Stripe and the stores together, with no change for anyone without a store subscription **Status:** in progress (t001, t002, t003, t004, t005, t006, t007 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Store product catalog — **DONE** | 45m | — |
| t002 | Store billing tables — **DONE** | 1h30m | t001 |
| t003 | Merge store tiers into getUserTier — **DONE** | 1h | t002 |
| t004 | One renewing source: BILLED_BY_STORE and the restricted portal — **DONE** | 1h30m | t003 |
| t005 | subscriptionStatus reports the billing source — **DONE** | 1h | t004 |
| t006 | Limit errors say whose plan set the limit — **DONE** | 1h | t003 |
| t007 | Adoption surface — **DONE** | 30m | t005, t006 |
| t008 | Simplify | 30m | t007 |
| t009 | Test coverage | 1h | t007 |
| t010 | Closeout | 15m | t008, t009 |

## Definition of done

- With no store rows, every user's tier, every Stripe flow, and every existing billing test is unchanged.
- `getUserTier` merges store rows outside the Stripe fallback, and `period_tier` stays Stripe-only; tests prove both.
- The five Stripe verbs refuse with `BILLED_BY_STORE` while a store subscription will renew, and the portal opens restricted.
- `subscriptionStatus` returns the billing-source fields, and limit errors say whose plan set the limit on GraphQL, REST, and MCP.
- `yarn typecheck`, `yarn test`, and `yarn generate-v1-openapi` from `backend-cluster/backend-v2/` pass.

## Source + Goal linkage

- **Source:** [ADR 001](../../../docs/adrs/ADR001-mobile-billing.md) (revised 2026-10-25), sequenced by `/pm for implementing ADR001 across all places` on 2026-11-01. Covers D1, D3–D5, and D13, and Rollout step 1.
- **Goal linkage:** A3 (community & distribution). App Review rejected iOS 1.20261002.50 under guideline 3.1.1: Web plans unlock features in the app, which sells nothing. Until both apps sell the beancount.io plans through their stores, no iOS release can ship, which freezes the app as a distribution channel and keeps Android behind the same release train.
- **Expected outcome:** nothing visible yet. The backend can hold store subscriptions, and clients and agents reading a limit error learn whose plan would have to change.
- **Why now:** every other ADR 001 milestone (m2–m9) builds on these tables, the merged tier, and the guard. It ships dark, because no store rows exist until m3 and m4.
- **Adoption surface:** included, because limit errors change shape on REST and MCP, which agents read.
