# w2 · m54 — A purchase ends on a confirmation that celebrates it, and analytics counts it in the browser

**Worker:** worker2 **Goal:** Every successful payment — a new subscription through Stripe Checkout or an upgrade charged inside Billing — ends in the dashboard on a confirmation that says what the customer now has, celebrates it once, and records one GA4 `purchase` from the browser. Checkout no longer returns to the marketing pricing page, and the dormant server-side purchase reporter is retired so there is one purchase source. **Status:** blocked (t001–t010 done; t011 waits for the deploy)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Return Checkout to the dashboard confirmation, and dashboard-started checkouts to Billing on cancel — **DONE** | 40m | — |
| t002 | Report the invoice an immediate plan change charged — **DONE** | 30m | — |
| t003 | Retire the server-side Measurement Protocol `purchase` reporter — **DONE** | 35m | — |
| t004 | Confirmation lands from Checkout: session id, cancelled notice, "Start using" when there is no way back — **DONE** | 40m | t001 |
| t005 | Record one client-side GA4 `purchase` per paid transaction — **DONE** | 40m | t002, t003, t004 |
| t006 | Celebrate a successful payment with confetti, once, and never for reduced motion — **DONE** | 35m | t004, t005 |
| t007 | Translate the new confirmation and cancel copy into every dashboard locale — **DONE** | 25m | t004, t006 |
| t008 | Verify adoption surfaces for the purchase changes — **DONE** | 20m | t005, t006, t007 |
| t009 | Run `/simplify` over the milestone diff — **DONE** | 30m | t008 |
| t010 | Prove return paths, purchase counting and the celebration with meaningful tests — **DONE** | 35m | t008, t009 |
| t011 | Verify a real purchase in production and archive the milestone | 30m | t010 |

**Total estimate:** ~6h. t001, t002 and t003 are independent backend tasks and can run in parallel. t004 needs t001's return URLs; t005 needs t002's invoice id and t003's removal so the two sources never overlap.

## Definition of done

- A paid Stripe Checkout, started from the marketing pricing page or from Billing, returns to `https://beancount.io/settings/billing?checkout=success&session_id=<id>`. The confirmation waits for the webhook, then shows the plan, renewal date and what was unlocked, with "Back to work" when the purchase began at an in-product prompt and "Start using <plan>" otherwise.
- A Checkout cancelled from Billing returns to Billing with a "nothing was charged" notice. A cancel from the marketing pricing page still returns there with the plan and cycle preselected, and that page's `createSubscriptionSession` call is unchanged.
- Exactly one GA4 `purchase` is sent from the browser per plan invoice — a Checkout subscription's first invoice on the confirmation, or the invoice of an immediate in-sheet change — with a non-empty `transaction_id`, `value` (what the invoice charged, 0 included), `currency` and `items`. A refresh, a back navigation, a second tab or a pending confirmation sends none. Nothing depends on whether a discount applied.
- Confetti plays once whenever a plan takes effect — a confirmed Checkout or an immediate in-sheet change — whatever it charged; never while confirming, on a timeout, or when the reader prefers reduced motion; and the confetti code is not in the entry chunk.
- The backend sends no Measurement Protocol `purchase` and has no `GA_MEASUREMENT_PROTOCOL_SECRET` setting.
- Verified in production after a deploy (t011).

## Source + Goal linkage

- **Source:** user decisions on 2026-10-20: after payment, land on the dashboard confirmation; record GA purchases client-side rather than through the Measurement Protocol; add a confetti celebration. This replaces the open half of [w1/m39/t003](../../../w1/done/m39/done/t003.md) and supersedes w1/m39/t016 and w1/178 (both dropped). Research recap: Stripe recommends a custom success page that carries `{CHECKOUT_SESSION_ID}` while fulfillment stays on webhooks, which the confirmation already does.
- **Goal linkage:** **A2 — Frictionless onboarding.** The moment after paying is when a new subscriber starts using what they bought. Today Checkout drops them on a marketing page that neither confirms the payment nor leads back into the product, and the confirmation built for them is unreachable.
- **Expected outcome:** every buyer lands in the product knowing the payment worked and with one obvious next step; the purchase funnel (`checkout_started` → `purchase`) is measurable without operator setup. Adoption surface is included because the change is reader-facing (dashboard copy, event taxonomy, backend environment variables).
- **Why now:** the confirmation (w1/m39/t008) and the way-back memory (w1/m39/t009) shipped; only the return URL and a purchase signal stood between them and every paying customer.

## Revised — 2026-10-21

User decision: nothing depends on whether a discount applied or an amount is $0. GA4 `purchase` and the confetti follow a plan taking effect, not money moving — a fully discounted Checkout or a change settled by credit counts at `value` 0 and celebrates like any other; a change that takes effect without an invoice celebrates but has no `transaction_id` to count. The yearly renewal reminder goes out for a $0 renewal too, stating its amount. QA purchases flow through the same GA stream as real ones, unfiltered, so the production test exercises the real path.

## Blocked

**t011 is blocked:** the production check needs this milestone deployed. Everything else is on `main` (a83111079, 6378b7d88, 59771a0ab, ac0299bbb, abcb700fa). **Unblock:** the operator deploys backend-v2 first — it carries migration `0025_drop_reported_purchases.sql` and the new GraphQL fields (`createSubscriptionSession(returnTo)`, `PlanChangeResult.invoiceId/amountCharged/currency`, `Subscription.latestInvoice`) — and then the dashboard, whose queries select those fields and fail against an older backend. Proving a counted `purchase` also needs a small real charge, with the user's go-ahead, watched in GA4 Realtime or DebugView by someone with GA access. Cleared by the operator and the user.
