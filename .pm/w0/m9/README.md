# w0 · m9 — An abandoned first Checkout gets one short recovery email

**Worker:** worker1 **Goal:** a signed-in customer who leaves their first Checkout without paying gets one three-line email about 90 minutes after they started, with a single-use 20% code and a link back to the same plan, as [ADR027](../../../docs/adrs/ADR027-backend-v2-checkout-recovery-email.md) decides **Status:** in progress (t001–t004 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Checkout sessions expire after 90 minutes with recovery on | 30m | — | — **DONE**
| t002 | Recovery config and SendGrid unsubscribe group support | 45m | — | — **DONE**
| t003 | Eligibility and paid-since checks | 45m | t002 | — **DONE**
| t004 | Claim, promotion code, three-line email, and rollback | 45m | t003 | — **DONE**
| t005 | Handle `checkout.session.expired` in the webhook | 20m | t004 |
| t006 | Owner setup and live-mode verification | 30m | t001, t005 |
| t007 | Adoption surface | 15m | t006 |
| t008 | Simplify | 15m | t007 |
| t009 | Test coverage | 30m | t007, t008 |
| t010 | Closeout | 10m | t009 |

## Definition of done

- Every session `createSubscriptionSession` creates sets `expires_at` 90 minutes out and `after_expiration.recovery: { enabled: true, allow_promotion_codes: true }`, and sets no `consent_collection`.
- On `checkout.session.expired`, the handler sends one email only when every ADR027 D2 check holds: existing user with an email, current non-retired plan, never a paid subscription, no later session for the user that is `complete` or `open`, address not suppressed in the recovery group, and no earlier recovery email. Every other case acknowledges with `processed: false`.
- The key `checkout-recovery:<userId>` makes it once per person: two expired sessions for one user yield one email and one promotion code. A failed code creation or send deactivates any code it created, releases the claim, and rethrows.
- The promotion code is on coupon `checkout-recovery-20`, with `max_redemptions: 1`, `expires_at` 48 hours out, `first_time_transaction`, and `metadata.source: "checkout-recovery"`. The email body is three lines, says the code expires in 48 hours, and links the recovery URL (or the pricing page when it is missing), with List-Unsubscribe and a footer unsubscribe link.
- In live mode on an owner account, an abandoned session produced the email, the recovery URL reopened the same plan, the code applied, and the completed session bound to the right user with `recovered_from` set (evidence in the closeout).
- backend-v2 `yarn typecheck` and `yarn test` pass, and `surface-parity.test.ts` is unchanged.

## Source + Goal linkage

- **Source:** [ADR027](../../../docs/adrs/ADR027-backend-v2-checkout-recovery-email.md), reviewed 2026-11-08. That review moved the expiry to 90 minutes, rewrote the paid-since check for Stripe's list filters, recorded the owner's decision to send without promotional consent, and changed the email to say "48 hours" instead of a UTC date.
- **Goal linkage:** **A2 — Frictionless onboarding.** Someone who picks a plan and stalls on the payment form today hears nothing, and their session lingers for 24 hours. After this, one reminder takes them back to the plan they already chose.
- **Expected outcome:** first-time customers who leave Checkout get one way back to the same plan. Stripe reports how many recovery codes were redeemed and how many sessions were recovered (`times_redeemed`, `recovered_from`), with no new analytics table.
- **Why now:** the ADR is settled and every building block already exists: the idempotent `sent_billing_emails` claim, SendGrid delivery, and the webhook handler's verification. Today `checkout.session.expired` is ignored.
- **Adoption surface:** included. The email is customer-facing, and the ADR index row and backend-v2's billing configuration (`.env.example`) must describe the shipped behavior.
- **Out of scope (ADR027 open questions):** a no-code reminder for returning customers, and a holdout group.
- **Legal risk accepted by the owner (ADR027 D6):** the email goes out without promotional consent. Keep the unsubscribe working; do not add a second email or a larger discount.
