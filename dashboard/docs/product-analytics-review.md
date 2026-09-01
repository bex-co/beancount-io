# Product Analytics Review — Beancount Dashboard

**Author:** Product Analytics (first analytics hire)
**Date:** 2026-06-29
**Scope:** Every GA4 event, analytics helper, tracking call, and missing tracking opportunity in `beancount-dashboard`.
**Lens:** This is evaluated as a Product Analytics engineer, not a software engineer. The goal is better product and growth decisions from data — not more events for their own sake.

---

## Executive summary

The headline finding: **the analytics layer is wired up but almost nothing flows through it.** GA4 is installed and a clean, type-safe helper module exists, but of the four helper functions, only two are ever called. The product ships **zero behavioral events**. Today GA4 receives `page_view` and a `user_id` and nothing else.

Concretely, the company can currently answer "how many people visited the pricing-adjacent settings page" but **cannot answer a single product question that matters**: How many signups complete onboarding? What % of new users connect a bank or import their first transaction? Which feature predicts retention? What's the free→paid conversion rate? Where do users drop in the importer? None of this is measurable right now.

The good news is the foundation is sound. `trackEvent()` already exists at `src/common/lib/utils/analytics.ts:41` and works — it just has **no call sites**. The work ahead is overwhelmingly instrumentation and taxonomy, not plumbing. The single highest-leverage move is to define an event taxonomy and fire ~25 well-chosen events at the conversion and activation points already mapped below.

| Dimension | Current state |
|---|---|
| Analytics platform | GA4 only (`G-Y0WGKFHE3E`), gtag.js |
| Helper functions defined | 4 (`trackPageView`, `trackEvent`, `setUserId`, `trackError`) |
| Helper functions actually used | 2 (`trackPageView`, `setUserId`) |
| Custom behavioral events firing | **0** |
| Error events firing | **0** (`trackError` defined, never called) |
| Conversion/funnel events | **0** |
| Consent / privacy controls | **None** |
| Environments tracked | Production only |

---

## 1. Current analytics architecture

GA4 is loaded through gtag.js and rendered server-side into the document head, gated to production.

**Script injection** — `src/common/components/document/google-analytics.tsx`
- Hardcoded measurement ID `G-Y0WGKFHE3E` (line 3).
- Loads `googletagmanager.com/gtag/js` async (line 10) plus an inline init script.
- Inline bootstrap lives in `src/common/components/document/google-analytics.js.txt`, which calls `gtag("config","G-Y0WGKFHE3E")`.
- Mounted in `src/common/root-route/shell-component.tsx` inside `<ProductionOnly>`, so it only runs in prod builds.

**Helper module** — `src/common/lib/utils/analytics.ts`
- `isAnalyticsAvailable()` (line 15) — guards on `window.gtag` existing.
- `trackPageView(url?, title?)` (line 24) — sends a `page_view` event with `page_path`, `page_title`.
- `trackEvent(name, params?)` (line 41) — generic custom-event wrapper. **No call sites in the codebase.**
- `setUserId(userId)` (line 54) — re-runs `gtag("config", …, {user_id, send_page_view:false})`.
- `trackError(description, fatal)` (line 70) — sends GA4 `exception`. **No call sites in the codebase.**

**Runtime wiring** — two providers mounted in `src/common/providers/root-provider.tsx` (lines 18–19):
- `AnalyticsTrack` (`src/common/providers/analytics-track/index.tsx`) — subscribes to TanStack Router `onResolved` and calls `trackPageView()` on every navigation. SPA route changes are tracked. Good.
- `AnalyticsUserTracking` (`src/common/providers/analytics-user-tracking/index.tsx`) — reads `GetCurrentUser` and calls `setUserId()` once authenticated.

**Type surface** — `src/global.d.ts` declares `window.gtag` / `window.dataLayer`.

### Architectural issues a Product Analytics engineer cares about

1. **No event layer is actually used.** The architecture is "page views + identity" only. Everything in sections 3–7 is missing because `trackEvent` is never called.
2. **Likely double-counted page views on first load.** The inline init script fires `gtag("config", …)` (which sends an automatic `page_view`), and `AnalyticsTrack` *also* fires a manual `page_view` on mount (`analytics-track/index.tsx:13`). First-load sessions probably register two page views, inflating pageviews/session and deflating bounce. Fix: set `send_page_view:false` in the init config and let the manual tracker own all page views.
3. **High-cardinality, PII-bearing `page_path`.** `trackPageView` sends `window.location.pathname + search` (analytics.ts:27). URLs embed usernames, ledger names, account names, commit SHAs, and institution IDs (e.g. `/ledger/$ledgerOwner/$ledgerName/account/$accountName`). This (a) explodes the Pages report cardinality and (b) leaks potentially sensitive financial identifiers into Google. Recommend route-pattern normalization (send `/ledger/:owner/:name/account/:account`) and pushing the raw IDs into custom dimensions only where needed.
4. **Hardcoded measurement ID in 3 places**, no env switch. There is no separate dev/staging stream and `<ProductionOnly>` means **no debug data at all** — instrumentation can't be validated before it ships to real users. Recommend a `VITE_GA_MEASUREMENT_ID` (note: `CLAUDE.md` discourages env vars, but a measurement ID that differs by environment is exactly the "public key that differs by environment" exception the doc allows), plus GA4 `debug_mode` in non-prod.
5. **No consent management.** The app ships in 13 languages (EU users guaranteed) and handles financial data, yet there is no cookie/consent banner and GA loads unconditionally in prod. This is a GDPR/Consent-Mode gap and a compliance risk, not just an analytics nicety.
6. **No reverse-ETL / warehouse export configured** (see §14). All analysis is trapped in the GA4 UI.

---

## 2. Existing events

The complete inventory of what GA4 receives today:

| Event | Type | Where fired | Parameters sent | Notes |
|---|---|---|---|---|
| `page_view` | GA4 automatic + manual | `analytics-track/index.tsx:13,21` via `trackPageView` | `page_path`, `page_title` | Fires on initial load + every route change. Likely double-counted on first load. `page_path` carries PII/high cardinality. |
| `exception` | GA4 recommended | `trackError` (analytics.ts:70) | `description`, `fatal` | **Defined but never called.** No error boundary or `toast.error` hooks into it. |
| user_id binding | Identity (config) | `setUserId` (analytics.ts:54) | `user_id` | Sets identity post-auth. Good, but no `login`/`sign_up` event accompanies it. |

That's the entire dataset. **No conversion, engagement, monetization, or feature-usage events exist.**

---

## 3. Missing events (the core gap)

Below are the events that should exist, mapped to the exact handler where each should fire. Every one of these is a real, already-built user action found in the codebase. These are prioritized by decision value, not volume.

### Acquisition & onboarding
| Recommended event | Fire at | Why it matters |
|---|---|---|
| `sign_up` | OAuth-bound OTP success in `use-dashboard-oauth-auth.ts` | Top of every funnel. Distinguish `sign_up_started` vs `sign_up` (verified). |
| `login` | OAuth-bound password success in `use-dashboard-oauth-auth.ts` | Returning-user signal; powers DAU/WAU/MAU and retention. |
| `sign_up_otp_submitted` / `_failed` | `use-dashboard-oauth-auth.ts` | Email-verification drop-off is a classic silent funnel killer. |
| `password_reset_requested` / `password_reset_completed` | `forgot-password-page` (~L100), `reset-password-page` (~L100) | Account-recovery friction = lost reactivations. |
| `onboarding_welcome_viewed` | `welcome-page/index.tsx` | Start of the activation funnel (§8). |

### Activation — first value
| Recommended event | Fire at | Why it matters |
|---|---|---|
| `ledger_created` | `ledger-list.tsx:handleCreateLedger` (~L162), mutation `CreateLedger` | **The #1 activation milestone.** First ledger = account is "real". |
| `transaction_added` | `transaction-form.tsx:onSubmit` (~L214), mutation `BulkEntries` | Core product value. Manual entry path. |
| `import_started` | `import-page.tsx` upload step | Entry to the most valuable activation path. |
| `import_completed` | `use-import-submit.ts:submitImport` (~L33), mutation `BulkEntries` | Bulk first-value; include `transaction_count`. |
| `bank_link_started` | `use-plaid-link-launcher.ts:openPlaidLink` (~L29) | Plaid is the stickiest activation; track intent. |
| `bank_link_completed` | `use-plaid-token-exchange.ts:exchangePublicToken` (~L28), mutation `ExchangePlaidPublicToken` | Strongest activation + retention predictor for a finance app. |
| `bank_transactions_synced` | mutation `SyncPlaidTransactions` / `SubmitPlaidTransactionsToLedger` | Ongoing value realization from a linked bank. |

### Engagement — feature usage
| Recommended event | Fire at | Why it matters |
|---|---|---|
| `ai_agent_message_sent` | `ask-ai/index.tsx:submitQuestion` and `agent-chat-input.tsx` | AI is a marketed differentiator and a paid feature; usage is unmeasured. |
| `ai_agent_action_approved` | agent approve/execute path | Measures whether AI *output* is trusted/acted on, not just chatted with. |
| `bql_query_executed` | `bql/pages/index.tsx:executeQueryAndCache` (~L62), `QueryShell` | Power-user signal; predicts retention. Include `success`. |
| `report_viewed` | reports routes (balance-sheet, income-statement, trial-balance, overview, account) | Which reports drive the product? Currently invisible beyond raw page_view. |
| `receipt_parsed` | mutation `ParseReceiptWithLLM` / `InsertReceiptTransaction` | LLM feature adoption + cost-justification. |
| `file_edited` | `ledger-editor` mutations `UpdateLedgerFile` / `CreateLedgerFile` | Power-user editing depth. |
| `commit_viewed` / `pull_request_reviewed` | git feature; `ApprovePullRequest` / `RejectPullRequest` | Collaboration/version-control adoption. |

### Collaboration & growth loops
| Recommended event | Fire at | Why it matters |
|---|---|---|
| `collaborator_invited` | `collaborators-section/index.tsx:handleInvite` (~L66), mutation `AddLedgerCollaborator` | Team expansion = the core viral/expansion loop. |
| `collaborator_invite_accepted` | invite acceptance path | Completes the viral loop; measures K-factor. |
| `ledger_made_public` | `visibility-section/index.tsx`, mutation `UpdateLedger` | Public ledgers feed the gallery growth loop. |
| `ledger_starred` | mutations `StarLedger`/`UnstarLedger` | Engagement with discovery. |
| `gallery_search` / `gallery_ledger_opened` | `gallery-page/index.tsx` | Discovery funnel; does the gallery drive signups/forks? |
| `user_followed` | mutations `FollowUser`/`UnfollowUser` | Social graph growth. |

### Monetization (see §12)
| Recommended event | Fire at |
|---|---|
| `checkout_started` | `use-create-subscription-session.ts`, mutation `CreateSubscriptionSession` |
| `subscription_upgraded` | `use-upgrade-subscription.ts`, mutation `UpgradeSubscription` |
| `subscription_cancelled` | mutation `CancelSubscription` |
| `billing_portal_opened` | mutation `CreateStripePortalSession` |
| `upgrade_prompt_viewed` / `upgrade_prompt_clicked` | `src/common/components/ai-cfo-upgrade-panel.tsx` |

### Reliability
| Recommended event | Fire at |
|---|---|
| `exception` (actually wire `trackError`) | `src/common/components/error-boundary.tsx` and every `toast.error` site (~57 found) |
| `api_mutation_failed` | Apollo error link in `src/common/apollo/` — one central hook captures all mutation failures |

---

## 4. Event taxonomy improvements

There is no taxonomy today, so this is greenfield — which is the ideal time to set conventions before debt accrues.

**Naming convention.** Adopt `object_action` in `snake_case`, past tense for completed actions (GA4-idiomatic): `ledger_created`, `transaction_added`, `bank_link_completed`. Avoid GA4's reserved names except where you deliberately use a recommended event (`sign_up`, `login`, `purchase`, etc., listed in §5). Document the canonical list in one place.

**A typed event registry.** Right now `trackEvent(name, params)` takes arbitrary strings — that guarantees taxonomy drift the moment more than one engineer instruments. Introduce a typed wrapper so event names and their parameters are enforced at compile time:

```ts
// src/common/lib/utils/analytics-events.ts  (proposed)
type AnalyticsEvents = {
  ledger_created: { ledger_id: string; visibility: "public" | "private" };
  transaction_added: { ledger_id: string; entry_type: string; source: "manual" | "import" | "receipt" | "plaid" };
  bank_link_completed: { institution_id: string };
  bql_query_executed: { success: boolean; duration_ms: number };
  // …
};
export function track<E extends keyof AnalyticsEvents>(name: E, params: AnalyticsEvents[E]) {
  trackEvent(name, params);
}
```

This keeps the existing `analytics.ts` plumbing and adds a governed surface on top.

**Standard parameters on every event.** Define a small set always attached: `ledger_id` (hashed), `user_role` (owner/collaborator), `surface` (where in the UI), `plan_tier` (free/paid). Source the tier from `src/common/lib/subscription/tier-config.ts`.

**Identity hygiene.** `setUserId` is good, but pair it with GA4 `user_properties` for `plan_tier`, `signup_date`, `ledger_count`, `has_linked_bank` — these enable cohort comparisons without warehouse work.

**Privacy/PII rules in the taxonomy.** Never put usernames, ledger names, account names, or monetary amounts into event params or `page_path`. Use opaque IDs (hash the ledger id) and route patterns. Bake this into the registry's types (IDs only).

---

## 5. Suggested GA4 recommended events

GA4 gives special reporting treatment (and Google Ads / predictive-audience eligibility) to its named recommended events. Map the product's real actions onto them:

| GA4 recommended event | Map to product action | Handler |
|---|---|---|
| `sign_up` | Account creation (with `method`: password/google/github) | OAuth-bound account-verification handler |
| `login` | Returning sign-in (with `method`) | OAuth-bound authentication handler |
| `tutorial_begin` | Welcome/onboarding viewed | `welcome-page/index.tsx` |
| `tutorial_complete` | First ledger created (end of onboarding) | `ledger-list.tsx:handleCreateLedger` |
| `generate_lead` / `begin_checkout` | Subscription session created | `use-create-subscription-session.ts` |
| `add_payment_info` / `purchase` | Subscription started (fire `purchase` server-side from Stripe webhook for accuracy) | Stripe webhook → Measurement Protocol |
| `refund` | Subscription cancelled/refunded | `CancelSubscription` |
| `search` | Gallery / ledger search | `gallery-page/index.tsx` |
| `select_content` | Opening a report, ledger, or gallery item | reports routes, gallery |
| `share` | Ledger made public / invite sent | `visibility-section`, collaborators |
| `exception` | Errors (already defined, wire it) | `error-boundary.tsx`, toasts |

Using `purchase` with `value` and `currency` is what unlocks GA4 revenue reporting (§12). **Critically, fire `purchase` server-side via the Measurement Protocol from the Stripe webhook**, not from the client redirect — client-side checkout completion is unreliable (users close the tab, ad blockers, redirect drop-off).

---

## 6. Suggested custom events

Events with no GA4 recommended equivalent but high product value (these are the differentiators for *this* product):

- `import_step_viewed` — `{ step: "upload" | "configure" | "preview" | "submit" }` at `src/features/importer/pages/import-page.tsx`. Powers the importer micro-funnel (§8), the single most complex flow in the app.
- `import_failed` — `{ step, reason }` at `parse-error-display.tsx` / `use-import-submit.ts`. Where does importing break?
- `ai_agent_message_sent` — `{ has_attachment, ledger_id, message_length_bucket }`.
- `ai_agent_action_approved` / `ai_agent_action_rejected` — trust signal for the AI CFO.
- `bql_query_executed` — `{ success, duration_ms, has_visualization, from_history }`.
- `report_viewed` — `{ report_type, ledger_id }` across the 5 report sub-features.
- `bank_sync_completed` — `{ institution_id, new_transaction_count }`.
- `receipt_parsed` — `{ source: "upload" | "camera", success }`.
- `collaborator_invited` — `{ role, ledger_id }`.
- `plaid_relink_required` — fire when `CreatePlaidUpdateModeLinkToken` is used; broken bank links silently kill retention in finance apps.
- `cli_auth_confirmed` — `ConfirmCliAuthSession` mutation; measures developer/CLI adoption.
- `ssh_key_added` — `CreatePublicKey`; another power-user/Git-workflow signal.

---

## 7. Missing event parameters

Even the two events that *do* fire are under-parameterized, and the recommended events above need a consistent parameter spec.

**On the existing `page_view`:** add `ledger_id` (hashed), `is_authenticated`, `plan_tier`, and a normalized `route_pattern`. Today only `page_path`/`page_title` are sent (analytics.ts:30–33), so you can't segment pageviews by plan or auth state.

**On the existing `exception`:** `description` + `fatal` is too thin (analytics.ts:73). Add `error_source` (component/route), `feature`, `mutation_name`, and `error_code`. Without these you can see error *volume* but never *where* errors hurt conversion.

**Standard params every new event should carry:**

| Parameter | Source | Enables |
|---|---|---|
| `ledger_id` (hashed) | route params | Per-ledger engagement, multi-ledger behavior |
| `plan_tier` | `tier-config.ts` | Free vs paid behavior splits |
| `user_role` | collaborator data | Owner vs collaborator usage |
| `surface` | calling component | Which UI entry point drives action |
| `source` | flow context | e.g. transaction `source`: manual/import/plaid/receipt |
| `success` | mutation result | Failure-rate analysis on every action |
| `duration_ms` | timing | Performance↔behavior correlation (BQL, import, AI) |

**User properties (set once, not per-event):** `signup_date`, `plan_tier`, `ledger_count`, `has_linked_bank`, `preferred_language` (the app has 13 locales — language cohorts are a real growth lever), `is_collaborator`.

---

## 8. Funnel definitions

None of these are measurable today. Each maps to existing handlers, so all are instrumentable now.

**Funnel A — Signup → Activation (the north-star funnel)**
1. `onboarding_welcome_viewed` (welcome-page)
2. `sign_up` (use-register-form)
3. `sign_up_otp_submitted` → verified (use-otp-form)
4. `ledger_created` (ledger-list:handleCreateLedger)
5. First value: `transaction_added` OR `import_completed` OR `bank_link_completed`

The drop between 2→3 (email verification) and 4→5 (created a ledger but never added data) are where most SaaS leaks. Currently invisible.

**Funnel B — Importer micro-funnel** (`src/features/importer`)
`import_started` → `import_step_viewed{upload}` → `{configure}` (account mapping) → `{preview}` → `import_completed`. The account-mapping step (`account-mapping-table.tsx`) is the usual abandonment point; instrument it explicitly.

**Funnel C — Bank linking** (`src/features/plaid`)
`bank_link_started` (openPlaidLink) → Plaid Link opened → `bank_link_completed` (exchangePublicToken) → `bank_transactions_synced` → `transactions_submitted_to_ledger`. Plaid abandonment inside the SDK vs. token-exchange failure are very different problems; separating them tells you whether it's a trust issue or a bug.

**Funnel D — Free → Paid** (§12)
`upgrade_prompt_viewed` (ai-cfo-upgrade-panel) → `upgrade_prompt_clicked` → `checkout_started` (CreateSubscriptionSession) → `purchase` (Stripe webhook). This is the revenue funnel and currently has **zero** instrumentation.

**Funnel E — AI agent value loop**
`ai_agent_message_sent` → response received → `ai_agent_action_approved`. Measures whether the AI is a toy or a tool.

---

## 9. Activation metrics

Define and instrument an explicit **activation event**. For a personal-finance ledger app, the most defensible definition:

> **Activated user = created a ledger AND added first financial data (manual transaction, completed import, or linked bank) within 7 days of signup.**

Supporting metrics to build once §3 events exist:
- **Time-to-first-ledger** (`sign_up` → `ledger_created`).
- **Time-to-first-value** (`sign_up` → first `transaction_added`/`import_completed`/`bank_link_completed`).
- **Activation rate** overall and by acquisition `method` and `preferred_language`.
- **Path-to-activation mix:** what share activate via manual entry vs. import vs. Plaid? (Hypothesis worth testing: Plaid-activated users retain best — design onboarding to push it.)
- **"Aha-moment" candidate:** linking a bank or completing first import. Validate by correlating each with week-4 retention once data accrues.

The current welcome flow (`welcome-page/index.tsx`) funnels straight to "Create your first ledger" — instrument that as the activation on-ramp.

---

## 10. Retention metrics

Retention is completely unmeasurable today because there are no recurring engagement events — `page_view` alone can't distinguish a bounced visitor from a power user.

Build, once engagement events exist:
- **Classic DAU/WAU/MAU and DAU/MAU stickiness ratio**, keyed off `login` + meaningful action events (not page views).
- **N-day / N-week retention curves** (D1/D7/D30, W1–W8) segmented by activation path and plan tier.
- **Feature-based retention:** compare retention of users who linked a bank vs. didn't; used the AI agent vs. didn't; have collaborators vs. solo. These comparisons directly tell product which features to push in onboarding.
- **Resurrection / dormancy:** `login` after ≥30 days inactive.
- **Plaid health as a leading churn indicator:** a `plaid_relink_required` that's never resolved is a near-certain churn signal in finance apps — instrument `CreatePlaidUpdateModeLinkToken` and alert on unresolved relinks.
- **Subscription retention / renewal** vs. `subscription_cancelled` (§12).

For finance specifically, a "recurring habit" metric (e.g. % of activated users active in ≥3 distinct weeks per month) is a better north star than raw MAU, because budgeting is an inherently periodic behavior.

---

## 11. Feature adoption metrics

The app has ~17 features and **zero feature-level usage data**. For each major feature, track **reach** (% of active users who used it), **frequency**, and **depth**:

| Feature | Adoption event | Files |
|---|---|---|
| Importer | `import_completed` / 30d actives | `src/features/importer` |
| Plaid | `bank_link_completed` / actives | `src/features/plaid` |
| AI agent | `ai_agent_message_sent` reach + msgs/user | `src/features/ai-agent` |
| BQL | `bql_query_executed` reach | `src/features/bql` |
| Reports | `report_viewed` by `report_type` | `src/features/reports/*` |
| Journal editing | `transaction_added`, `file_edited` | `src/features/journal`, `ledger-editor` |
| Receipt LLM | `receipt_parsed` | `src/features/receipt` |
| Collaboration | `collaborator_invited` reach | `src/features/collaboration` |
| Git / PRs | `pull_request_reviewed` | `src/features/git` |
| Gallery / social | `gallery_search`, `user_followed` | gallery, `user-profile` |
| CLI / SSH | `cli_auth_confirmed`, `ssh_key_added` | oauth, settings.ssh-keys |

Two decisions this unlocks immediately: (1) **which features justify their build/maintenance cost** (e.g. is the LLM receipt parser — which has real per-call cost — actually used?), and (2) **which features to surface earlier in onboarding** because they correlate with retention (§10).

---

## 12. Revenue metrics

This is the most expensive blind spot. There is a full subscription/billing surface (`src/graphql/mutation/subscription.graphql`: `CreateSubscriptionSession`, `UpgradeSubscription`, `CancelSubscription`, `CreateStripePortalSession`; UI in `src/features/user-settings/pages/general/subscription-section.tsx` and `src/common/components/ai-cfo-upgrade-panel.tsx`) with **no monetization analytics whatsoever.**

Instrument:
- **Revenue funnel (Funnel D):** `upgrade_prompt_viewed` → `upgrade_prompt_clicked` → `checkout_started` → `purchase`.
- **`purchase` with `value`/`currency` fired server-side from the Stripe webhook** via GA4 Measurement Protocol — do not rely on the client redirect (`CreateSubscriptionSession` returns a Stripe URL; the user leaves your app). This is the only way to get trustworthy revenue in GA4.
- **MRR, ARPU, free→paid conversion rate, trial→paid** (if trials exist), tied to plan tiers in `tier-config.ts`.
- **Churn & retention of revenue:** `subscription_cancelled`, voluntary vs. involuntary (failed payment via `RefreshPlaidItemStatus`-style billing events), reactivation via `billing_portal_opened`.
- **Upgrade trigger attribution:** which feature gate drove the upgrade? The `ai-cfo-upgrade-panel` suggests AI is the paywalled hook — confirm with `upgrade_prompt_viewed{trigger}` so you know which paywall converts.
- **Expansion revenue** from collaboration/seats if pricing is per-seat.

GA4 alone is weak for subscription/MRR analysis; pair it with the warehouse export (§14) where Stripe data can join cleanly.

---

## 13. Dashboard recommendations

Build these in GA4 (Explorations) initially, migrating to BI on the warehouse (§14) as complexity grows:

1. **Acquisition & Activation dashboard** — signups by `method`/language, activation rate, time-to-value, Funnel A visualization.
2. **Onboarding drop-off** — Funnels A/B/C as GA4 Funnel explorations; alert when any step's conversion drops week-over-week.
3. **Feature adoption matrix** — reach/frequency/depth per feature (§11), sliced by plan tier.
4. **Retention cohorts** — GA4 cohort exploration by signup week and by activation path.
5. **Revenue dashboard** — funnel D, MRR/ARPU/conversion, churn (needs §12 + Stripe join).
6. **Reliability dashboard** — `exception` volume by `feature`/`mutation_name`, and crucially **error-rate vs. conversion** (do importer errors cause abandonment?).
7. **AI/LLM cost-vs-value** — agent messages, approval rate, receipt parses against the upgrade funnel, to justify LLM spend.
8. **Executive one-pager** — north-star (weekly-active activated users), activation rate, free→paid, D30 retention, MRR. One screen for leadership.

For finance data, prefer **Looker Studio / a BI tool on BigQuery** over the GA4 UI for anything customer-facing or board-level, because of GA4's sampling and cardinality limits.

---

## 14. BigQuery opportunities

GA4's native **BigQuery export is free and should be enabled on day one** — it's the highest-leverage infrastructure move here and removes GA4 UI sampling/cardinality ceilings.

What it unlocks for this product specifically:
- **Joining GA4 events with backend data** (ledgers, subscriptions, Plaid items) on `user_id` — already set via `setUserId`, so the join key exists. This is where real questions get answered: "do users with >2 ledgers convert better?", "does Plaid-linking predict 90-day retention?".
- **Accurate, unsampled funnels and retention** beyond GA4's UI limits.
- **Revenue/MRR modeling** by joining Stripe data with behavioral events.
- **Cohort LTV** and **path-to-activation** analysis.
- **ML opportunities** native to BigQuery: churn-propensity and upgrade-propensity models (BQML) feeding GA4 predictive audiences for lifecycle marketing.
- **Server-side event ingestion** (Measurement Protocol → BigQuery) for the events that must be trustworthy (`purchase`, `bank_link_completed`), independent of client ad-blockers.
- **Cardinality-heavy dimensions** (ledger_id, institution_id) live comfortably in BigQuery, so you can keep them out of GA4 custom dimensions and out of `page_path`.

Recommended pipeline: GA4 → BigQuery (streaming export) → dbt models (sessions, users, funnels, subscriptions) → Looker Studio/BI. Stripe and the app's Postgres can sync into the same warehouse for the joins above.

---

## 15. Top 10 highest-impact improvements

Ranked by decision value per unit of effort.

1. **Define the event taxonomy + typed registry and ship the activation events.** Wire `sign_up`, `login`, `ledger_created`, `transaction_added`, `import_completed`, `bank_link_completed`. This alone takes the company from "blind" to "can measure the activation funnel." Foundation: `src/common/lib/utils/analytics.ts` (add typed `analytics-events.ts`). *Highest impact, modest effort.*
2. **Instrument the revenue funnel and fire `purchase` server-side from the Stripe webhook.** Monetization is completely dark today (`subscription.graphql`, `ai-cfo-upgrade-panel.tsx`). Without this, no growth/pricing decision is data-informed.
3. **Enable the free GA4 → BigQuery export now**, before more data accrues. Unlocks every cross-data-source question (§14) and removes GA4 sampling limits.
4. **Wire `trackError` into the error boundary and `toast.error` sites.** It's already written (`analytics.ts:70`) and called nowhere. Connect `src/common/components/error-boundary.tsx` + a central Apollo error link. Lets you correlate errors with conversion drop.
5. **Fix page-view double counting and PII in `page_path`.** Set `send_page_view:false` in the init script, normalize URLs to route patterns, strip usernames/ledger/account names. Fixes data *quality* and a privacy exposure at once (`google-analytics.js.txt`, `analytics.ts:27`).
6. **Add a consent/Consent-Mode banner.** 13 locales + financial data + unconditional GA load = GDPR risk. Compliance + data-trust, not optional.
7. **Instrument the importer and Plaid micro-funnels** (Funnels B/C). These are the highest-value and highest-friction activation paths; knowing where they break is directly actionable (`src/features/importer`, `src/features/plaid`).
8. **Add standard params + user properties** (`plan_tier`, `ledger_id` hashed, `language`, `has_linked_bank`). Turns flat counts into segmentable insight with near-zero marginal effort once the registry exists (§7).
9. **Add a dev/staging GA stream + `debug_mode`, controlled by `VITE_GA_MEASUREMENT_ID`.** Today `<ProductionOnly>` means instrumentation can't be validated before hitting real users — a recipe for silent broken tracking.
10. **Instrument feature-adoption reach for the cost-bearing features (AI agent, receipt LLM, BQL).** Directly answers "is this feature worth its compute/maintenance cost and should it move earlier in onboarding?" (`src/features/ai-agent`, `src/features/receipt`, `src/features/bql`).

---

### Closing note

The encouraging part: this is not a rescue job, it's a build-out. The plumbing (`trackEvent`, `setUserId`, SPA route tracking, identity) is already in place and clean. With roughly 25 well-chosen events fired at handlers that already exist, plus the free BigQuery export, the company moves from "page views only" to a fully measurable activation, retention, and revenue picture. Start with items 1–4 above; they convert the largest blind spots into decisions the fastest.
