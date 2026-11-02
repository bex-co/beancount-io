# w7 · m6 — The web dashboard shows each billing source and sends plan changes to their home

**Worker:** worker1 **Goal:** every web subscriber sees the same plan card, can change billing only where it was bought, and never sees billing on a page opened from the app **Status:** blocked

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Plan card for every billing source — **DONE** | 1h30m | w7/m1/t010 |
| t002 | Store subscribers get no Stripe flows — **DONE** | 1h | t001 |
| t003 | Limit prompts follow the billing source and the plan owner — **DONE** | 1h | t001 |
| t004 | Duplicate-billing and store payment-problem banners — **DONE** | 45m | t001 |
| t005 | Switching from a store plan to Stripe — **DONE** | 1h30m | t002, w7/m2/t001 |
| t006 | Pages opened from the app hide pricing and billing — **DONE** | 1h30m | t001 |
| t007 | Adoption surface — **DONE** | 30m | t003, t004, t005, t006 |
| t008 | Simplify — **DONE** | 30m | t007 |
| t009 | Test coverage — **DONE** | 1h | t007 |
| t010 | Closeout | 15m | t008, t009 |

**Unblocked 2026-11-01** — the owner decided that a store-to-Stripe switch at the same or a lower tier defers the first Stripe charge to the store plan's end, so nobody pays twice; at a higher tier Stripe charges at once, with a warning first. t001 to t004 and t006 shipped earlier (`989895da0`, `66508069e`, `a331ac37b`, `08b3f7ec5`, `8d741331d`). The decision is the only part of m2/t001 that t005 needs. The milestone's browser check needs an account with a store row, which a local stack can seed.

## Blocked

**Blocked 2026-11-02** — every task but t010 is done (t005 `21afe06a5`, t007 `152da1cf3`, t008 `9b9a4e63a`, t009 `04d9176fc`). The owner's switch decision of 2026-11-01 is recorded in ADR 001 D15.

- **t010's browser check.** The definition of done asks for each billing source in a browser: Stripe, App Store, Google Play, Enterprise, and Free. Unit tests cover every state, but no environment has them all. Production can show Free, Enterprise, and Stripe once this dashboard is deployed, but it has no store rows until m3 and m4 record real sandbox purchases. The local docker-mac stack is shared and two days old, and it has no Stripe test keys. **Unblock:** either the dashboard is deployed and the owner or QA checks Free, Stripe, and Enterprise, with the store states checked once m3 or m4 writes a sandbox row; or a local stack with Stripe test keys is free to rebuild with seeded store rows.

Who can clear it: the owner.

## Definition of done

- Each billing source sees the D14 web behavior, verified in a browser for Stripe, App Store, Google Play, Enterprise, and free accounts.
- No Stripe flow is offered to a store-billed account, and collaborators at the owner's limit see no upgrade prompt.
- With the app marker, no dashboard page shows pricing, billing, or an upgrade prompt, and an app sign-up never reaches pricing.
- `yarn format:check`, `yarn lint`, `yarn test`, and `yarn build` from `dashboard/` pass, with the backend gates for t005.

## Source + Goal linkage

- **Source:** [ADR 001](../../../docs/adrs/ADR001-mobile-billing.md) (revised 2026-10-25), sequenced by `/pm for implementing ADR001 across all places` on 2026-11-01. Covers D5, D14 (Web), and D15 (web journeys).
- **Goal linkage:** A3 (community & distribution). App Review rejected iOS 1.20261002.50 under guideline 3.1.1: Web plans unlock features in the app, which sells nothing. Until both apps sell the beancount.io plans through their stores, no iOS release can ship, which freezes the app as a distribution channel and keeps Android behind the same release train.
- **Expected outcome:** web subscribers always see where their plan is managed, and pages the app opens no longer show billing inside the app.
- **Why now:** the app marker is a likely App Review trigger today (the commodities page opens inside the app), and m7 depends on its contract.
- **Adoption surface:** included, because the Billing tab and limit prompts are user-facing in every dashboard locale.
