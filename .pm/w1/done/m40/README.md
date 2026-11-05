# w1 · m40 — Downgrade, switch to monthly and survive a failed renewal without losing paid time

**Worker:** worker1
**Goal:** Downgrades and switches from yearly to monthly are scheduled for the end of the paid period and can be undone. Cancelling offers one cheaper alternative. A failed renewal keeps paid limits while Stripe retries. Ledger-count and collaborator limits are enforced as PRFAQ005 decided.
**Status:** done

## Source + Goal linkage

- **Source:** [PRFAQ005](../../../../docs/prfaqs/PRFAQ005-plan-changes-and-yearly-billing.md) stage 2 (questions 5, 6, 9, 10, 14–18, and question 21 items 1, 4 and 6); user request on 2026-10-17 to arrange the work on w1.
- **Goal linkage:**
  - **A2 — Frictionless onboarding:** a customer who needs a cheaper plan keeps working in their books instead of cancelling.
  - **A1 — Agent-native accounting:** the ledger-count and collaborator fixes apply on GraphQL, REST and MCP alike, so an agent gets the same limit and the same error a person does.
- **Expected outcome:**
  - A downgrade or switch to monthly shows its effective date and can be undone until then.
  - The downgrade sheet shows each limit against current usage.
  - A subscriber whose renewal fails keeps their plan and sees what to fix and by when.
  - Ledger-count limits fire at every tier, and collaborator limits follow the ledger owner's plan.
- **Why now:** today the only way to pay less is to cancel, and a failed renewal drops a subscriber to Free before Stripe's first retry. This reuses m39's preview and change contract, so it follows m39. t003 and t004 do not depend on m39 and can start in parallel.
- **Adoption surface:** included. The change and cancel sheets, the banner, the emails and the limit errors are all customer- or agent-facing.

## Scope and constraints

PRFAQ005's question 21 decisions apply:

- Failed renewals follow Stripe's current retry schedule: paid limits stay while the subscription is `past_due`, with no extra grace beyond it. This deliberately changes the `past_due` part of the active-status policy that w1/m37 preserved; trial and refund policy are unchanged.
- There are no refunds.
- A downgrade deletes nothing.
- The mobile app's exemptions from the ledger-count check and the entry cap are intended and stay.
- Pricing-table features are provided on request and get no tier check.
- The AI Assistant allowance stays per calendar month in UTC.

Working constraints:

- Automated tests use synthetic fixtures and mocked Stripe responses. The one live exercise is t014, added by user decision on 2026-10-18. The QA account from `beancount-io/.env` (`QA_EMAIL`, `QA_PASSWORD`) runs the real flows in production and pays with two single-use, 100%-off production coupons. No other live purchase, coupon redemption or subscription change is used as a test. Board evidence stays public-safe: no credentials, no coupon or promotion codes, and no customer, Stripe customer or subscription identifiers.
- Emails go through the existing SendGrid templates. Copy ships in every dashboard locale catalog.

## Pricing-page compatibility

m39's README records what `beancount.io/pricing` relies on, and m40 keeps all of it except one deliberate change:

- t003 makes `past_due` count as paid, so `subscriptionStatus.hasActiveSubscription` becomes true for a subscriber whose renewal is being retried.
- The pricing page then shows that subscriber "Manage subscription" instead of offering a second Checkout. That is the intended behaviour, and t012 pins it with a test.
- Nothing else the pricing page calls changes: `createSubscriptionSession`, its accepted prices, `/settings/general` and the sign-up `next` round trip.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Schedule downgrades and switches to monthly for the end of the paid period — **DONE** | 50m | w1/m39/t002 |
| t002 | Keep one pending change at a time: status, replacement and undo — **DONE** | 40m | t001 |
| t003 | Keep paid limits while a renewal is past due, and never fall back to Free on a Stripe error — **DONE** | 40m | — |
| t004 | Count every owned ledger, and check collaborators against the ledger owner's plan — **DONE** | 35m | — |
| t005 | Email when a plan change is scheduled and before it takes effect — **DONE** | 40m | t002, t006 |
| t006 | Operator: Stripe retry, upcoming-invoice and renewal-reminder settings — **DONE** | 15m | — |
| t007 | Downgrade sheet: limits against usage, plan features and the split choice — **DONE** | 50m | t001, t002, w1/m39/t007 |
| t008 | Scheduled-change panel and the cancel sheet — **DONE** | 40m | t002, t007 |
| t009 | Failed-renewal banner on every dashboard page — **DONE** | 30m | t003 |
| t010 | Verify adoption surfaces for downgrades, recovery and limit errors — **DONE** | 20m | t004, t005, t008, t009 |
| t011 | Run `/simplify` over the milestone diff — **DONE** | 25m | t010 |
| t012 | Prove scheduling, recovery and limit behaviour with meaningful tests — **DONE** | 40m | t010, t011 |
| t014 | Production payment test with the QA account and two 100%-off coupons — **DONE** | 50m | t006, t012 |
| t015 | Beancount sends its own failed-renewal and yearly-renewal emails — **DONE** | 40m | t005, t006 |
| t016 | A failed renewal gets a month (yearly: two) before the plan ends, with less email — **DONE** | 30m | t015 |
| t013 | Verify the deployed outcome and archive the milestone — **DONE** | 20m | t012, t014 |

**Total estimate:** ~8h15m. t003 and t004 are independent of m39 and of each other. t006 is the user's Stripe work and gates t005 and the closeout.

## Definition of done

- **Downgrade sheet:** the preview and the sheet show the effective date, nothing due today, each limit against current usage, and the plan features exactly as the pricing table lists them.
- **Scheduling:** a downgrade or switch to monthly creates a schedule whose next phase starts at the current period end, with no invoice today. At the phase change, the tier resolves to the new plan.
- **One pending change:** a scheduled change, a pending cancellation and a new change never coexist. Status always names the single pending change, and **Keep current plan** and **Resume** undo it.
- **Split choice:** a higher tier combined with a switch to monthly offers both of PRFAQ005's options, with amounts from the server.
- **Cancel sheet:** offers one alternative, records an optional reason, and gives both buttons equal weight.
- **Failed renewals:** a `past_due` subscriber keeps paid limits on every path (quotas, account profile, CLI status) until Stripe stops retrying. A Stripe lookup error with a verified cached paid tier keeps that tier. Every dashboard page shows the banner with the next retry date and a working **Update payment method**.
- **Ledger count:** refused at the limit for every tier, whatever ledgers the owner collaborates on and in whatever order the ledger service lists them. Mobile creation still skips the check.
- **Collaborators:** checked against the ledger owner's plan, and refused with the resource-limit error on GraphQL, REST and MCP.
- **Emails:** one on scheduling, and one reminder before the change takes effect. Neither repeats on webhook retries.
- **Gates:** backend typecheck, tests, parity and OpenAPI drift gates pass, as do dashboard format, lint, tests, translations and build.
- **Production payment test:** the QA account passes t014 with two 100%-off coupons, covering scheduling, undo, split, cancel, resume, emails and limit errors, with everything cleaned up afterwards.
- **Deployed check:** the deployed revision passes the remaining read-only hosted check. Completed work is moved into `done/` through `/pm`.

## Unblocked

- **t013** — unblocked 2026-11-04: the owner confirmed both 2026-10-19 scheduling emails arrived once each. Closed.
