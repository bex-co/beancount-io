# w1 · m39 — Reach yearly billing from inside the product

**Worker:** worker1
**Goal:** A subscriber can preview and confirm any upgrade or monthly-to-yearly switch from Billing settings, pay exactly the amount shown, approve bank authentication without leaving the page, and land on a confirmation after Checkout.
**Status:** done

## Source + Goal linkage

- **Source:** [PRFAQ005](../../../../docs/prfaqs/PRFAQ005-plan-changes-and-yearly-billing.md) stage 1 (questions 13–18, decisions in question 21); user request on 2026-10-17 to arrange the work on w1.
- **Goal linkage:** **A2 — Frictionless onboarding.** The path from choosing a plan to working in a paid ledger has dead ends today. The dashboard starts every subscription and upgrade on the monthly price, so yearly billing is unreachable inside the product. Checkout returns to a page with no confirmation. A payment that needs bank approval is reported as failed.
- **Expected outcome:** a monthly subscriber reaches yearly billing from Billing settings and from every in-product upgrade prompt. Every new or changed subscription shows its charge before confirmation. A customer whose bank asks for approval completes it on the page.
- **Why now:** w1/m37 shipped and deployed the tier-resolution fixes this milestone builds on (only its cohort backfill is blocked, which this work does not depend on). m40 reuses this milestone's preview and change contract, so this ships first.
- **Adoption surface:** included. Billing settings, the change sheet and the Checkout return are customer-facing, and the dashboard's GraphQL billing contract changes.

## Scope and constraints

- Immediate change kinds only: upgrades and switches to yearly. Downgrades, switches to monthly, the cancel sheet and failed-renewal recovery are m40.
- PRFAQ005's decisions apply: new Premium yearly subscriptions cost $143.88 while the $99.99 price stays recognized; Yearly is the default cycle; Growth is the most popular plan; there are no refunds.
- Billing operations stay GraphQL-only and browser-session-only. Each gets its own authorization action and a parity-baseline entry with no REST or MCP eligibility, like today's billing aliases (`backend-cluster/backend-v2/authz/README.md` § Self-service billing).
- Automated tests use synthetic fixtures and mocked Stripe responses. The one live exercise is t015, added by user decision on 2026-10-18. The QA account from `beancount-io/.env` (`QA_EMAIL`, `QA_PASSWORD`) runs the real flows in production and pays with two single-use, 100%-off production coupons. No other live purchase, coupon redemption or subscription change is used as a test. Board evidence stays public-safe: no credentials, no coupon or promotion codes, and no customer, Stripe customer or subscription identifiers.
- Copy ships in every dashboard locale catalog through the feature locales (`dashboard/src/features/user-settings/locales/`).
- The marketing pricing page at `beancount.io/pricing` is served from outside this repository, and its matching changes are tracked there. This milestone defines and documents the contracts that page links to: `/settings/billing?plan=<tier>&billing=<monthly|yearly>` and the Checkout cancel return.

## Pricing-page compatibility (must not break)

The pricing page already sells subscriptions against this backend. In a browser it:

- asks `userProfile` and `subscriptionStatus { hasActiveSubscription }` whether the visitor is signed in and subscribed;
- creates Checkout with `createSubscriptionSession(clientId: "beancount-web-prod", priceId)`, using each tier's monthly and yearly price — today the Premium yearly price is the $99.99 one;
- sends subscribers to `/settings/general`;
- sends new visitors through `/sign-up/?next=/pricing?billing=yearly`.

This milestone ships before that page changes, so every task keeps that contract intact:

- `createSubscriptionSession` keeps its signature and keeps accepting every price the page sells, including the $99.99 Premium yearly price. Retiring that price as a sale is a follow-up, filed only once the page sells $143.88.
- `subscriptionStatus.hasActiveSubscription` keeps its meaning.
- `/settings/general` keeps reaching the plan UI in one click.
- Checkout's return URLs switch only after their dashboard destinations exist.
- t013 pins this contract with a regression test, and t014 checks it on the deployed site.
- Adding a dependency such as `@stripe/stripe-js` needs the user's approval (root `AGENTS.md`).

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Classify plan changes and preview them on the server — **DONE** | 45m | — |
| t002 | Apply immediate plan changes at the previewed amount and report bank authentication — **DONE** | 45m | t001 |
| t003 | Return Checkout to the dashboard and pin the billing portal configuration — **DONE** | 30m | t001, t008 |
| t004 | Operator: create the $143.88 Premium yearly price and the billing portal configuration — **DONE** | 20m | — |
| t005 | Offer the $143.88 Premium yearly price in the dashboard, and keep every price the pricing page sells working — **DONE** | 25m | t001, t004 |
| t006 | Billing settings tab: plan summary, "Pay yearly" line and every-tier plan row — **DONE** | 45m | t001 |
| t007 | Change sheet for upgrades and switches to yearly, with in-place bank authentication — **DONE** | 50m | t002, t006 |
| t008 | Confirmation after Checkout — **DONE** | 30m | t006 |
| t009 | Deep links and in-product upgrade prompts open a prefilled change sheet — **DONE** | 35m | t007 |
| t010 | Plan-change analytics events and a server-side purchase event — **DONE** | 40m | t007, t008 |
| t011 | Verify adoption surfaces for the billing changes — **DONE** | 20m | t005, t009, t010 |
| t012 | Run `/simplify` over the milestone diff — **DONE** | 25m | t011 |
| t013 | Prove classification, charging, authentication and return paths with meaningful tests — **DONE** | 40m | t011, t012 |
| t015 | Production payment test with the QA account and two 100%-off coupons — **DONE** | 50m | t004, t013 |
| t014 | Verify the deployed outcome and archive the milestone — **DONE** | 20m | t013, t015 |

**Total estimate:** ~8h50m. t002 and t006 can proceed in parallel after t001. t003 switches Checkout's return URLs only after t008's confirmation exists, so a paying customer is never sent to a missing page. The worker did t004 through the Stripe CLI.

## Definition of done

- `previewPlanChange` classifies every configured price pair as PRFAQ005 question 14 documents, and returns Stripe's previewed amount for immediate kinds. `changePlan` charges with the same proration time.
- A change that requires bank authentication returns `REQUIRES_ACTION` with what the dashboard needs to complete it, and the dashboard completes it in place. A declined payment leaves the plan unchanged and says so.
- `/settings/billing` shows the plan summary, the "Pay yearly" line on monthly plans and every tier, with Yearly selected and Growth marked most popular. A monthly subscriber can switch to yearly there and from every in-product upgrade prompt.
- A customer without a subscription checks out on the cycle they chose. Checkout returns to the dashboard confirmation, and a cancelled Checkout returns to the pricing page with the plan and cycle in the URL.
- Every portal session uses the pinned configuration.
- New Premium yearly subscriptions started from the dashboard use the $143.88 price. Subscribers on older prices still resolve to Premium and see their price labelled.
- The pricing page's contract above still holds: a test pins it, and the deployed site opens Checkout for a monthly and a yearly price.
- In production, the QA account passes t015 with two 100%-off coupons: yearly Checkout from the pricing page, then an upgrade; monthly Checkout from Billing, then a switch to yearly. Both subscriptions and codes are cleaned up afterwards.
- The analytics events in PRFAQ005 question 19 that belong to this stage fire once per action, and `dashboard/docs/event-taxonomy.md` documents them.
- Backend typecheck, tests, parity and OpenAPI drift gates pass, as do dashboard format, lint, tests, translations and build, all through their normal package scripts.
- The deployed revision passes a read-only hosted check with authorized or synthetic accounts, without a purchase. Task statuses and links agree, and completed work is moved into `done/` through `/pm`.

## Dropped

- ~~**t016**~~ — Operator: GA4 Measurement Protocol secret and stream ID in production — dropped 2026-10-20: the user chose to record `purchase` in the browser; the server-side reporter it would have switched on is retired by [w2/m54/t003](../../../w2/blocked/m54/done/t003.md).
