# ADR 001: Selling the beancount.io Plans in the Mobile Apps

- Status: Proposed (revived 2026-10-25) — the owner decided to sell the beancount.io plans in the iOS and Android apps. This revision replaces the 2026-07-27 design and ends the 2026-10-03 deferral. Nothing in it is implemented yet.
- Date: 2026-07-27 (revised 2026-10-25)
- Decision owners: Mobile and Backend
- Scope: plan purchase, plan changes, and plan limits on iOS and Android, and the Web and backend changes those require. Web billing through Stripe stays as [PRFAQ005](../prfaqs/PRFAQ005-plan-changes-and-yearly-billing.md) defines it.

## Goal

The iOS and Android apps sell the same self-serve plans as `beancount.io/pricing`, with the same limits, through each store's own billing:

| Plan         | Web monthly | Web yearly | Ledgers | Collaborators per ledger | Ledger entries | AI Assistant tokens a month |
| ------------ | ----------- | ---------- | ------- | ------------------------ | -------------- | --------------------------- |
| Free         | $0          | —          | 1       | 1                        | 1,000          | 20K                         |
| Premium      | $14.99      | $143.88    | 5       | 5                        | Unlimited      | 500K                        |
| Growth       | $99.99      | $959.88    | 20      | 10                       | Unlimited      | 2M                          |
| Organization | $499.99     | $4,799.88  | 500     | 50                       | Unlimited      | 10M                         |
| Enterprise   | Contact     | Contact    | ∞       | ∞                        | Unlimited      | ∞                           |

Limits come from `TIER_LIMITS` in `backend-cluster/backend-v2/src/features/stripe/service/stripe.ts`. The pricing page's other rows (backups, automation and integrations, OIDC SSO, multi-entity consolidation) are provided on request, as PRFAQ005 records. They apply to a plan however it was bought.

A subscriber has one Beancount plan whichever of Stripe, the App Store, or Google Play bills it, and the plan unlocks the same limits on the Web, the CLI, the API, and both apps.

## Current State (2026-10-25)

- **App Review rejected 1.20261002.50 for not offering the subscription through in-app purchase (guideline 3.1.1).** The app gives Web subscribers their paid limits but sells nothing itself.
- **The app sells nothing.** It has no purchase library, purchase screen, or plan-management surface. Commit `abfc55c1` removed the upgrade prompts from its quota and ledger-limit errors.
- **Some plan limits do not apply on mobile.** `backend-cluster/backend-v2/src/server/api/request-platform.ts` says "The mobile app is free independently of the account's web subscription". On a request marked as mobile:
  - ledger creation skips the ledger limit (`features/ledger/operations/create-ledger.ts:75`);
  - entry writes skip the 1,000-entry limit (`features/ledger/operations/directive-limit-bypass.ts`);
  - file import, receipt reading, and category suggestions skip the AI-token limit (`assertAssistedQuotaAvailable` in `features/llm/service/llm-service.ts:153`).

  Ask AI is not exempt: `features/ai-agent/service/agent-handler/self-hosted-agent-handler.ts:74` checks the token allowance on every client. So a Web plan changes what the app allows, which is what guideline 3.1.3(b) requires to be purchasable in the app. The exemptions are keyed on the client-supplied `x-app-id` header, which the code itself documents is "not proof of a native client".

- **Every plan limit already resolves through one function.** `getUserTier` (`features/stripe/operations/get-user-tier.ts`) lists the user's live Stripe subscriptions and takes the highest recognized tier. If Stripe is unreachable, it falls back to the last tier it verified, cached in `paid_customers.period_tier` and `current_period_end`. Its callers are ledger creation, collaborators, the entry-limit lookup, AI usage, the account profile, and API-key creation. No product code calls Stripe directly.
- **Billing verbs are GraphQL-only, and that is documented.** `BILLING_VERBS` in `backend-cluster/backend-v2/src/server/api/op-class.ts` exempts them from REST and MCP with recorded reasons and per-verb authorization actions.
- **Account deletion cancels Stripe subscriptions** (`features/auth/service/account-service.ts:348`).
- **Leftovers.** Three Stripe-shaped GraphQL documents in `mobile/src/common/graphql/queries/` have no caller: `SubscriptionStatus`, `CreateSubscriptionSession`, and `CancelSubscription`. They are allowlisted in `mobile/scripts/graphql-operations-allowlist.json`.

## Store Policy Constraints

- **Apple 3.1.1:** unlocking features or functionality in the app requires in-app purchase.
- **Apple 3.1.3(b):** a plan bought on the Web may be used in the app only if that plan is also offered as an in-app purchase.
- **Apple 3.1.3(c):** services sold directly to an organization for its members may be bought outside in-app purchase; consumer and single-user sales may not. Enterprise is a sales contract with an organization, so it qualifies.
- **Apple 3.1.2:** auto-renewable subscriptions must be available on all of the user's devices, and the app must describe what the user gets for the price before asking them to subscribe.
- **Google Play's Payments policy:** in-app digital subscriptions use Google Play's billing system. Google's alternative-billing and external-offer programs require enrollment and apply only in eligible regions.
- **Out of scope:** Apple's United States storefront now permits buttons and links to Web purchase. Linking out there, and Google's programs, would each be a separate later decision.

## Decision

### D1. Catalog: the six self-serve plan variants in both stores

| Canonical plan       | Stripe (existing)             | App Store product                   | Google Play subscription / base plan |
| -------------------- | ----------------------------- | ----------------------------------- | ------------------------------------ |
| Premium monthly      | Premium monthly Price ID      | `io.beancount.premium.monthly`      | `premium` / `monthly`                |
| Premium yearly       | Premium yearly Price ID       | `io.beancount.premium.yearly`       | `premium` / `yearly`                 |
| Growth monthly       | Growth monthly Price ID       | `io.beancount.growth.monthly`       | `growth` / `monthly`                 |
| Growth yearly        | Growth yearly Price ID        | `io.beancount.growth.yearly`        | `growth` / `yearly`                  |
| Organization monthly | Organization monthly Price ID | `io.beancount.organization.monthly` | `organization` / `monthly`           |
| Organization yearly  | Organization yearly Price ID  | `io.beancount.organization.yearly`  | `organization` / `yearly`            |

- **Configuration.** The mapping from a store product to tier and cycle is version-controlled backend configuration, next to the Stripe `SUBSCRIPTION_CONFIG`. Store credentials stay in environment secrets.
- **Enterprise** is not sold in the apps (3.1.3(c)). Free needs no product.
- **Prices.** Each store charges its own price points. At launch the US price point is the one nearest the Web USD price, and other storefronts use the store's equalized prices. A different store price is a pricing decision outside this ADR.
- **No offers at launch.** There are no trials or introductory offers, matching PRFAQ005's scope.
- **Displayed prices.** The app shows the price and terms the store returns; it never hard-codes a Stripe amount.

### D2. One set of limits on every client

The mobile plan exemptions end in the same app release that ships purchase. A plan cannot be sold in an app that already waives its limits, and the exemptions would remain reachable by anyone who sends the header.

- Ledger creation, entry writes, and assisted AI requests apply the owner's plan limits on every client. `requestPlatform` no longer affects plan limits.
- Nothing already stored is locked, per PRFAQ005's rules. Existing ledgers keep working above the ledger limit, and entries can always be edited and deleted. Only creating a ledger, adding entries past 1,000 on Free, and AI requests past the month's allowance are refused.
- Each refusal in the app opens the plan sheet (D14) instead of a dead-end error.
- Free mobile users above a Free limit lose the waiver. Release notes and the plan sheet say so.

### D3. Architecture: Stripe stays as it is; the stores become two more sources of the plan

The App Store and Google Play are merchants of record. They take payment, set local prices, collect tax, and handle renewal, refunds, and plan changes. Beancount receives signed evidence that an account holds a plan until a given time. In the backend, the two stores are therefore two more **sources** of a user's tier, not two more payment integrations.

`getUserTier` stays the single seam and becomes:

```text
effective tier = highestTier( Stripe tier (unchanged, live with cached fallback),
                              tiers of the user's active store subscriptions )
```

- **Stripe.** The Stripe path, `paid_customers`, Checkout, the Customer Portal, plan changes, and billing email are not migrated or rewritten.
- **Store reads.** Store state is read from Beancount's own tables, so a product request never waits on Apple or Google.

![Mobile billing architecture: the app buys in the App Store or Google Play and sends the evidence to the backend; the store billing service verifies it and writes store subscriptions; getUserTier takes the highest tier from the store rows and Stripe, which is unchanged.](../images/adr001-mobile-billing-architecture.svg)

Store notifications only trigger a fresh read of provider state; they are never trusted as the state itself.

### D4. Data model

The Drizzle schema may change in detail but keeps these concepts.

**`billing_identities`:** stable, non-secret identifiers supplied to the stores at purchase.

| Field                          | Purpose                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| `user_id`                      | Beancount account (text; not assumed to be a UUID)                   |
| `apple_app_account_token`      | Random UUID passed to StoreKit (`appAccountToken`); unique           |
| `google_obfuscated_account_id` | Opaque random value passed to Play Billing; unique; no personal data |

Both values are stored rather than derived, because notifications arrive carrying only the token and must be mapped back to an account.

**`store_subscriptions`:** current normalized state of each store subscription.

| Field                                     | Purpose                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `id`                                      | Internal ID                                                                          |
| `user_id`                                 | Owning account; **nullable** for a purchase not yet claimed (D9)                     |
| `provider`                                | `APP_STORE` or `GOOGLE_PLAY`                                                         |
| `environment`                             | `PRODUCTION` or `SANDBOX` (D8)                                                       |
| `external_id`                             | Apple original transaction ID; Google purchase token                                 |
| `replaced_by_id`                          | The row that superseded this one through a Google linked purchase token              |
| `product_id`, `base_plan_id`              | Store identifiers                                                                    |
| `tier`, `cycle`                           | Mapped from D1 configuration                                                         |
| `provider_status`                         | Store-native status, for diagnosis                                                   |
| `status`                                  | Normalized: `ACTIVE`, `GRACE`, `PENDING`, `ON_HOLD`, `EXPIRED`, `REVOKED`, `UNKNOWN` |
| `access_ends_at`                          | End of the paid or grace period                                                      |
| `will_renew`, `pending_product_id`        | Auto-renew state and any scheduled plan change                                       |
| `acknowledged_at`                         | Google acknowledgement time                                                          |
| `revoked_at`                              | Refund or revocation time                                                            |
| `provider_updated_at`, `last_verified_at` | Ordering and freshness                                                               |

- A unique constraint on (`provider`, `environment`, `external_id`) ensures one store purchase never grants access to two accounts.
- A store row grants its tier when `status` is `ACTIVE` or `GRACE`, `now < access_ends_at`, and the account owns the row.
- `PENDING`, `ON_HOLD`, `EXPIRED`, `REVOKED`, and `UNKNOWN` grant nothing. `UNKNOWN` also covers an unmapped product, which fails closed and raises an alert.

**`store_billing_events`:** idempotent notification inbox, unique on (`provider`, `environment`, `external_event_id`). It records received and processed times, attempt count, and redacted last error. A raw payload is retained only for replay, with personal data removed, for the retention period set in the release gates.

### D5. Effective tier and the billing source

- **Effective tier** is the highest tier any active source grants, Stripe or store. Plans from different sources never add up.
- **Billing source** is the source whose subscription will renew.
- **One renewing source per account.** Every purchase entry point (Web Checkout and plan changes, the in-app plan sheet) is offered only when no other source is set to renew.
- **Server-side guard.** Each Stripe verb that would create or change a subscription refuses with a typed `BILLED_BY_STORE` error while a store subscription will renew: `createSubscriptionSession`, `upgradeSubscription`, `previewPlanChange`, `changePlan`, and `resumeSubscription`. The UI hides these verbs too, but the server enforces the rule.
- **Duplicates.** A store purchase cannot be refused after the fact, because the store has already taken payment. When a store purchase arrives while another source renews:
  - it is accepted, and the highest tier applies;
  - the account is flagged as having duplicate billing;
  - the user is told where to cancel the other subscription;
  - support sees the duplicate in a metric.

### D6. Plan changes follow each source's own rules, configured to match PRFAQ005

PRFAQ005's rule is that gains apply immediately and losses apply at the end of the period already paid for.

- **App Store.** All six products sit in one subscription group, so an Apple ID holds one at a time. Group levels form a total order, highest first:
  1. Organization yearly
  2. Organization monthly
  3. Growth yearly
  4. Growth monthly
  5. Premium yearly
  6. Premium monthly

  Apple applies a move up the order immediately and refunds the unused part of the old plan prorated. It applies a move down at the next renewal. This reproduces PRFAQ005, including monthly to yearly as a gain. This behavior must be confirmed in the App Store sandbox before launch.

- **Google Play.** Each tier is one subscription with `monthly` and `yearly` base plans. The app changes plans through Play Billing replacement, passing the current purchase token:
  - gains apply immediately: `charge-prorated-price` when the billing period stays the same, otherwise `with-time-proration`;
  - losses use `deferred`.

  The backend follows `linkedPurchaseToken` and marks the replaced row with `replaced_by_id`.

- **Stripe.** Unchanged (PRFAQ005).
- **Across sources.** There is no proration. To switch, the user turns off renewal at the current source, which lifts the one-renewing-source guard, then buys at the new one. During the overlap, the higher tier applies.

### D7. Purchase and lifecycle flows

**iOS purchase**

1. The signed-in app fetches the six products, and its `appAccountToken` from the backend.
2. StoreKit 2 runs the purchase with that token.
3. The app sends the signed transaction to `confirmStorePurchase`.
4. The backend verifies the JWS with Apple's App Store Server Library, checking bundle ID, environment, product, and token owner. When needed, it reads current state from the App Store Server API.
5. The backend upserts the row in one transaction.
6. The app finishes the transaction only after the backend accepts it. On the next launch, the app re-sends unfinished transactions.

App Store Server Notifications V2 for renewals, renewal-preference changes, billing retry, grace, expiry, refund, and revocation go to one REST endpoint for both environments. The signed payload is verified before use.

**Android purchase**

1. The app fetches the three subscriptions and their base-plan offers.
2. It launches billing with `obfuscatedAccountId`, adding the old purchase token and replacement mode for a plan change.
3. A pending purchase grants nothing.
4. On a completed purchase, the app sends the product and purchase token to `confirmStorePurchase`.
5. The backend reads `purchases.subscriptionsv2.get`, verifies package, product, account, and state, and upserts the row.
6. The backend acknowledges the purchase after it is stored. The client finishes the purchase after the backend responds.

Real-time developer notifications (RTDN) arrive through a Pub/Sub push subscription. The endpoint verifies the push's OIDC token, then re-reads the subscription; it does not act on the notification type alone.

The client never submits a tier, expiry, active flag, price, or currency as trusted data.

### D8. Sandbox purchases in production

App Review and TestFlight buy with Apple's sandbox against the production app, and Google license testers buy test purchases with real tokens. The production backend therefore:

- accepts sandbox and test evidence;
- grants the plan to the purchasing account, with `environment = SANDBOX` (or Google's test-purchase flag) recorded;
- excludes those rows from revenue and conversion metrics.

A sandbox row and a production row never satisfy each other's uniqueness or claims. Rejecting sandbox evidence would make the reviewer's purchase fail.

### D9. Ownership, restore, and unclaimed purchases

- **Restore** re-sends the store's current entitlements (`Transaction.currentEntitlements` on iOS, `getAvailablePurchases` on Android) through `confirmStorePurchase`. The backend verifies each one; nothing is granted locally.
- **Unclaimed purchases.** A purchase that arrives without a Beancount token is stored with `user_id` null. Examples are a purchase made before sign-in on that device, or a notification for a token the backend has not seen. The first signed-in account that presents it claims it.
- **No silent transfers.** A purchase already owned by another account is never transferred silently. The app explains the conflict and offers support. Transfer rules for deleted and merged accounts are a release gate.
- **Disabled at launch.** Family Sharing, App Store offer codes, and promoted in-app purchases are off. Each needs a claim path before it is enabled.

### D10. Account deletion

- **Stripe:** unchanged; subscriptions are cancelled.
- **Google Play:** renewal is cancelled through the Play Developer API before the account is deleted.
- **App Store:** the developer cannot cancel an Apple subscription. Before deletion is confirmed, the app and the dashboard say that the App Store subscription keeps billing until it is cancelled in the Apple account, and the app offers StoreKit's manage-subscriptions sheet. Deletion then proceeds, and the store rows lose their `user_id` while they are retained for audit.

### D11. Refunds and revocations

- A refunded or revoked store subscription stops granting its tier at the verified revocation time. PRFAQ005's downgrade rules then apply.
- AI tokens already used are not clawed back, and ledger data is never locked.
- Stripe refunds and disputes keep their current handling.

### D12. Reconciliation

- **Hourly:** the job re-reads rows that changed or whose `access_ends_at` falls within 48 hours, and acknowledges any verified, unacknowledged Google purchase. Google refunds an unacknowledged purchase after three days.
- **Daily:** a sweep re-reads every active row.
- **Objective:** a missed notification leaves a plan wrong for at most 24 hours. Mismatches are metered and alerted.

### D13. API surface and parity

- **`Query.subscriptionStatus`** gains the billing source, store product and cycle, `will_renew`, any scheduled change, and a management destination suited to the provider. It keeps its existing GraphQL-only billing exemption.
- **New verbs.** `Query.storeBillingIdentity` (Apple account token and Google obfuscated ID) and `Mutation.confirmStorePurchase` (provider plus signed transaction or purchase token; also used for restore and claim) are registered in `BILLING_VERBS` with:
  - new authorization actions, and a matching update to the OpenFGA model in `backend-cluster/backend-v2/authz/`;
  - a new recorded REST reason: store purchase evidence exists only inside the native app, whose API client is GraphQL;
  - the existing MCP billing exemption.
- **Store notifications** are provider-to-server REST callbacks, outside the customer-facing parity table.
- **The Stripe verbs** in D5 gain the `BILLED_BY_STORE` refusal.
- **Leftovers.** When the store verbs land, the allowlisted mobile `SubscriptionStatus` document is rewritten for the extended fields. `CreateSubscriptionSession` and `CancelSubscription` are Stripe Checkout and cancellation, which the app never uses, so they are deleted.

### D14. Mobile and Web user interface

- **Library.** The app uses `expo-iap`, which supports StoreKit 2, Play Billing subscription offers, and Play replacement modes. Adding it follows the repository's dependency approval. Purchase needs a development build; it does not run in Expo Go.
- **Plan screen.** A plan screen in Settings, plus a plan sheet opened from every refused limit:
  - creating a ledger;
  - adding an entry past 1,000;
  - Ask AI over the allowance;
  - receipt or import AI over the allowance.

  The sheet compares the plans with the same rows as the pricing page and shows store prices. It also shows 3.1.2 disclosures (what each plan includes, price, period, auto-renewal), Terms and Privacy links, Restore Purchases, and Manage Subscription (StoreKit's sheet on iOS; Play's subscriptions page for the package on Android).

- **Stripe-billed users in the app** see that their plan is billed through beancount.io and get no purchase button. Outside the US storefront, the app shows no link to Web purchase.
- **Store-billed users on the Web dashboard** see which store bills them and how to manage it there; Stripe plan flows are not offered.
- **Feature flag.** A server-side switch per provider in the public configuration (`readFeatureFlags`) can stop new purchases without removing verified access. The purchase surface is on in builds sent to review, because a hidden feature would violate guideline 2.3.1.
- **Quality.** All strings go into the 13 locales. Screens are checked in light and dark themes and at large text sizes.

## Rollout Plan

1. **Backend, with no visible change.** Add the D4 tables, store verification and notification endpoints (sandbox first), the merged `getUserTier`, the `BILLED_BY_STORE` guard, the extended `subscriptionStatus`, and the new verbs with authz and parity entries. With no store rows, every user's tier is unchanged.
2. **Store setup.**
   - App Store Connect: the Paid Apps agreement and tax and banking details; one subscription group with the six products at the D6 levels, plus review screenshots and notes; notification URLs for production and sandbox.
   - Play Console: the payments profile; three subscriptions with two base plans each; the RTDN Pub/Sub topic; service-account permission to view financial data and manage orders and subscriptions; license testers.
3. **Mobile.** Add `expo-iap`, the plan screen and sheet, restore, management, and the deletion warning. Run sandbox and license-tester end-to-end tests against a staging backend.
4. **Launch, in one app release on both platforms.** Remove the D2 exemptions and turn on purchase. Submit the six in-app purchases with the app version. Replace "no in-app purchases" in the App Store descriptions in all 14 locales and in the Play copy. Include a demo account in review notes. Use a staged rollout on Play.

## Reliability and Operations

- Every handler is idempotent, and provider timestamps or a fresh read prevent stale events from overwriting newer state.
- Purchase tokens, signed transactions, keys, and service credentials are never logged.
- Metrics cover notification lag, verification and acknowledgement failures, unknown products, reconciliation mismatches, duplicate billing, and sandbox versus production counts.
- Support tooling can show a user's sources and normalized rows and can trigger reconciliation. It cannot grant a store plan.

## Testing Strategy

- Unit-test every store-status-to-normalized-status mapping, the effective-tier merge, the one-renewing-source guard, and the `BILLED_BY_STORE` refusals.
- Contract-test JWS verification, Play API parsing, product mapping, and inbox idempotency with recorded, redacted fixtures.
- **App Store:** a local StoreKit configuration, the sandbox, and TestFlight. Cover each D6 level change, cancellation, billing retry, grace, refund, and revocation.
- **Google Play:** license testers with accelerated renewals. Cover each replacement mode, pending purchases, grace, account hold, cancellation, refund, and an acknowledgement recovered by reconciliation.
- **End to end:**
  - purchase interrupted by app termination;
  - restore, and claim of an unclaimed purchase;
  - a purchase owned by another account;
  - duplicate and out-of-order notifications, and a missed notification fixed by reconciliation;
  - a cross-source duplicate;
  - account deletion with each source;
  - each D2 limit refusal opening the plan sheet.
- Check the plan screens in light and dark themes, at large text sizes, and in every locale.

## Consequences

### Positive

- The apps sell every self-serve plan on the pricing page, which satisfies guidelines 3.1.1 and 3.1.3(b).
- One plan and one set of limits apply on every client, and the header-based waiver disappears.
- The Stripe path and existing subscribers are untouched. The change is additive behind the existing `getUserTier` seam.

### Negative

- Store purchases cost Apple's and Google's commission, and store prices drift from Web prices across storefronts.
- Free users of the app lose the mobile waivers for new ledgers, entries past 1,000, and assisted AI past the allowance.
- Beancount operates two store integrations: verification, notifications, acknowledgement, reconciliation, and their policy changes.
- Plan state now lives in two shapes: Stripe through `paid_customers` and live reads, stores through `store_subscriptions`.

## Alternatives Considered

- **RevenueCat.** Rejected by owner decision on 2026-10-25. Beancount keeps the store integrations and plan data in its own backend.
- **A provider-neutral billing domain that also migrates Stripe** (this ADR's 2026-07-27 design: dual-write, backfill, shadow comparison, an authorization switch). Not adopted. It rewrites a working Stripe path to gain nothing the merged `getUserTier` lacks. Revisit if a fourth source appears or if tier resolution must stop calling Stripe live.
- **Stripe Checkout for mobile purchases.** Rejected by store policy outside the programs named under Store Policy Constraints.
- **Keeping the mobile plan exemptions.** Rejected. The app would sell plans whose limits it waives, and the waiver remains reachable through a header.
- **A tier-independent app with no purchase** (exempting Ask AI too). Rejected because it contradicts the goal.

## Rollback and Failure Containment

- The per-provider switch stops new purchases. Verified store rows keep granting access until `access_ends_at`.
- If store notifications or reads fail, stored rows grant access only until `access_ends_at`; access is never extended on an unread state.
- Reconciliation is safe to repeat and is the recovery path for missed events.
- Removing the D2 exemptions is a code change, not a flag. Rolling it back needs an app release, because the plan sheet ships in the same release.

## Open Questions and Release Gates

Each item needs an owner before implementation starts. No production release happens until the ownership, duplicate-billing, refund and revocation, sandbox, and reconciliation paths pass end-to-end tests.

- Store price points per storefront, and whether they differ from Web prices.
- Whether any user who relied on the mobile waivers is grandfathered.
- Purchase-transfer rules between accounts, and handling for merged and deleted accounts.
- Grace-period length in each store.
- Retention period for notification payloads and billing audit data.
- Support ownership and response targets for store billing.
- Whether to link to Web purchase on the US storefront, as a separate decision.

## References

- [PRFAQ005: Plan changes and yearly billing](../prfaqs/PRFAQ005-plan-changes-and-yearly-billing.md)
- [ADR 008: API surface parity](./ADR008-backend-v2-surface-parity.md) and `backend-cluster/backend-v2/docs/api-parity.md`
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple auto-renewable subscriptions and subscription groups](https://developer.apple.com/app-store/subscriptions/)
- [Apple App Store Server Library](https://developer.apple.com/documentation/AppStoreServerAPI/simplifying-your-implementation-by-using-the-app-store-server-library)
- [Apple App Store Server Notifications](https://developer.apple.com/documentation/AppStoreServerNotifications)
- [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)
- [Google Play backend integration](https://developer.android.com/google/play/billing/backend)
- [Google Play subscription lifecycle and replacement modes](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
- [Expo in-app purchase guide](https://docs.expo.dev/guides/in-app-purchases/)
