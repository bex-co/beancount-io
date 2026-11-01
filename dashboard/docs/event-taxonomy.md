# Event Taxonomy — Beancount Dashboard

**Owner:** Product Analytics
**Status:** live — **registration, login, page views** (v1 baseline) + activation/engagement events (`directive_added`, `file_edited`, `ai_agent_message_sent`, `bql_query_executed`, financial-statement export lifecycle) + monetization events (`upgrade_prompt_clicked`, `checkout_started`, the plan-change lifecycle, and a browser-side `purchase`)
**Code:** `src/common/analytics/events.ts` (registry + typed `track()`)
**Related:** `docs/product-analytics-review.md` (why these events)

This document defines how we name, structure, and govern analytics events. The goal is a small, stable, decision-driven set of events — not maximal coverage. Every event here exists to answer a specific product or growth question.

**v1 established a trustworthy baseline first:** `sign_up` (registration), `login`, and a single clean `page_view`. On top of that baseline we now also emit the first two activation/engagement events — `directive_added` and `file_edited` (§6) — pulled forward from the §7 roadmap. The remaining engagement/monetization events stay designed-but-not-wired in §7 until a decision needs them.

---

## 1. Principles

1. **Decision-first.** An event earns its place only if a named question depends on it (activation rate, free→paid conversion, importer drop-off, …). If no decision changes, don't track it.
2. **Few, well-shaped events beat many thin ones.** Prefer one `transaction_added` with a `source` parameter over four near-duplicate events.
3. **The registry is the single source of truth.** Event names and parameters live in one typed file (`events.ts`). Adding an event = adding a line there. No free-form `trackEvent("…")` for product events.
4. **Privacy by construction.** Never send raw usernames, ledger/account names, or monetary amounts. IDs are pseudonymized.
5. **Stable forever.** Renaming an event breaks historical continuity in GA4. Name carefully once; deprecate rather than rename.

---

## 2. Naming conventions

- **Format:** `snake_case`, `object_action`, past tense for completed actions — `ledger_created`, `transaction_added`, `bank_link_completed`.
- **Reuse GA4 recommended names** where an action maps cleanly (`sign_up`, `login`, `purchase`, `search`, `share`, `select_content`, `tutorial_begin`, `tutorial_complete`, `exception`). This unlocks GA4's built-in reports, conversions, and predictive audiences. Use a custom name only when no recommended event fits.
- **No reserved prefixes.** Avoid `ga_`, `google_`, `firebase_` prefixes and reserved names (GA4 rejects them).
- **Parameters:** `snake_case`. Keys ≤ 40 chars, string values ≤ 100 chars, ≤ 25 params per event (GA4 limits). Booleans/numbers are fine and preferred for filtering.

---

## 3. Event schema

Each event = a registry name + a typed parameter object. Parameters are the union of **event-specific params** and optional **standard params**.

### Standard params (attach whatever is in scope)

| Param | Type | Meaning |
|---|---|---|
| `plan_tier` | `FREE \| PREMIUM \| GROWTH \| ORGANIZATION \| ENTERPRISE` | Actor's subscription tier (mirrors `UserTier`). |
| `user_role` | `owner \| collaborator` | Relationship to the ledger. |
| `surface` | string | UI entry point, e.g. `sidebar`, `welcome`, `importer`. |

> **We do not send a per-ledger `ledger_id`.** A specific ledger's identity is
> not a useful analytics dimension: it is high-cardinality and opaque (GA4 would
> bucket it into `(other)` past ~500 values), and no growth/product decision
> turns on which ledger something happened in. Activation and engagement are
> measured at the **user** level — events are derived per `user_id`, which is
> also the warehouse join key for any rare per-ledger drill-down. Prefer bucketed
> attributes (`source`, `visibility`) over identifiers. See §9.

### User properties (set once on the user, not per event)

Set via `setUserProperties(...)`. These enable cohort comparisons (retention by tier, by language) without warehouse joins.

| Property | Type | Use |
|---|---|---|
| `plan_tier` | tier | Free vs. paid behavior splits |
| `signup_date` | ISO date | Cohort by signup week |
| `ledger_count` | number | Power-user segmentation |
| `has_linked_bank` | boolean | Activation-quality segmentation |
| `preferred_language` | string | Language-cohort growth analysis (15 locales) |

---

## 4. Privacy & PII rules

These are non-negotiable:

- **Never** send usernames, ledger names, account names, commit messages, or monetary amounts as event params or in `page_path`.
- **Prefer a derived attribute over an id.** Most "which entity" questions are better answered by a bucketed attribute (`source`, `visibility`, a size/age bucket) than by an identifier. Default to sending no id.
- **`institution_id` is the exception that is meaningful** — it is the public Plaid institution id (e.g. `ins_109508`), maps to a bank name, is bounded in cardinality, and is **not** user PII. Send it as-is (unhashed); "which banks do users connect" is a real integration/support decision.
- **If you ever must send an id**, use a low-cardinality, non-PII *public* identifier (like `institution_id`) or a derived bucket — never a raw/opaque per-user id. v1 sends no entity ids at all.
- `user_id` (the GA4 identity, set in `analytics-provider.tsx`) is the backend user id, used only as the cross-data join key — never rendered or combined with financial detail in GA.
- **The one monetary exception is `purchase`.** Its `value` and `currency` are what the customer paid *us* for a plan, discounts applied, and its `transaction_id` is the Stripe invoice id GA4 deduplicates purchases on. It is sent from the browser only, and never carries a ledger amount, email, name or Stripe customer id.
- Page paths are normalized to route patterns (see review §1, item 3) rather than raw URLs.

---

## 5. Using the registry (code)

The typed wrapper enforces names and params at compile time:

```ts
import { track } from "@/common/analytics";

// ✅ compiles — name + params match the registry
track("sign_up", { method: "password" });

// ✅ standard params (plan_tier, surface, user_role) may be added
track("login", { method: "password", surface: "login-form" });

// ❌ compile error — unknown event
track("signin", { method: "password" });

// ❌ compile error — missing required `method`
track("login", {});
```

User properties (typically set right after auth / when the profile loads):

```ts
import { setUserProperties } from "@/common/analytics";

setUserProperties({
  plan_tier: user.tier,
  signup_date: user.createdAt.slice(0, 10),
  has_linked_bank: user.plaidItems.length > 0,
  preferred_language: i18n.language,
});
```

---

## 6. v1 event catalog (focused scope)

Exactly what ships now. The auth + activation events are in the typed registry; `page_view` is handled separately (§6.1).

| Event | GA4 type | Fire at (file → handler) | Params | Question it answers |
|---|---|---|---|---|
| `sign_up` | recommended | `features/auth/hooks/use-otp-form.ts → onSubmit` (after `VerifySignUpOtp` succeeds) | `method` | Verified signups by method/language; top of funnel |
| `login` | recommended | `features/auth/hooks/use-login-form.ts → onSubmit` (password) | `method` (`"password"`) | DAU/WAU/MAU, retention |
| `legacy_mobile_auth_completed` | custom | `common/providers/react-native-bridge-provider/legacy-auth-bridge.ts` when the old embedded-mobile token handoff completes inside the WebView bridge; carries no token, user, server, URL or app version | `flow` (`password \| otp \| one_time_token`) | Retirement: is anyone still signing in through the legacy mobile handoff? |
| `directive_added` | custom | `features/journal/components/new-directive-dialog/{transaction,balance,note,open-account}-form.tsx` — each form's mutation-success branch (next to `onSuccess?.()`) | `directive_type` (`transaction \| balance \| note \| open`) | Activation: do users add directives? Which kinds? (filter `directive_type=transaction` for transactions specifically) |
| `file_edited` | custom | `features/ledger-editor/file-editor/components/ledger-file-view/index.tsx → handleSaveFile` (save mutation `onCompleted`) | — (no path sent, see §4) | Engagement: do users edit raw ledger files directly? |
| `ai_agent_message_sent` | custom | `features/ai-agent/pages/agent/page.tsx` — `handleSubmit` (chat-input send, `surface=chat_input`) and the `?q=` auto-submit effect (`surface=deep_link`); NOT the SDK's post-approval auto-continuation | `has_attachment`, `surface` (no message text / file content, see §4) | Engagement: how often do users chat with the agent? (frequency per user / session; slice `has_attachment` for file-processing use) |
| `bql_query_executed` | custom | `features/bql/pages/index.tsx → executeQueryAndCache` (single choke point for manual submit / history re-run / `?query=` deep-link; fires per execution, success and failure alike) | — (**bare by design**, see note) | Engagement: how often do users run BQL queries? (frequency per user, by `event_name`) |
| `changelog_release_opened` | custom | `features/ledger-list/components/whats-new.tsx` when a user opens a release from the "What's new" block; no release identifiers | `surface` (`dashboard`) | Engagement: do users read release notes from the dashboard? |
| `report_export_started` | custom | `features/reports/export/statement-export-menu.tsx → runAction` before CSV, Markdown, or print handoff | `report_type` (`balance_sheet \| profit_and_loss`), `format` (`csv \| markdown \| print`) | Adoption: which statement export paths do users invoke? |
| `report_export_completed` | custom | Same handler, once after the browser accepts the download or print action | `report_type`, `format` | Reliability: which export actions reach browser handoff? |
| `report_export_failed` | custom | Same handler's catch branch, at most once per action | `report_type`, `format`, `failure_category` (`csv_generation \| markdown_generation \| print_dialog`) | Reliability: which bounded failure class prevents export? |
| `upgrade_prompt_clicked` | custom | Every in-app upgrade CTA that opens the billing page's change sheet on a recommended plan (`/settings/billing?plan=…&from=<surface>`, contract in `src/routes/settings.billing.tsx`) instead of checking out inline: `common/components/ai-cfo-upgrade-panel.tsx` (`surface=ai_cfo_panel`), `features/importer/components/steps/upload/parse-error-display.tsx` (`surface=importer_paywall`), `common/components/limit-indicator.tsx` (`surface=ledgers_limit`/`collaborators_limit`), `common/components/ledger-layout/directive-usage-indicator.tsx` (`surface=directive_usage`) — fired by the shared `common/components/upgrade-prompt-link.tsx` on click | `surface` (`ai_cfo_panel \| importer_paywall \| ledgers_limit \| collaborators_limit \| directive_usage`), `target_tier?` (the recommended plan; omitted only when no tier is above) | Monetization intent: which friction points drive upgrade interest (top of funnel) |
| `checkout_started` | custom | `features/user-settings/pages/general/subscription-section.tsx → startCheckout`, when the change sheet's `NEW` confirm sends a reader without a subscription to Stripe Checkout (`createSubscriptionSession`) | `target_tier`, `surface` (where the change started, see `plan_change_previewed`) | Monetization: how many new subscribers begin Stripe Checkout, by target plan and entry point (funnel stage below `upgrade_prompt_clicked`) |
| `billing_toggle_changed` | custom | `features/user-settings/pages/general/subscription-plan-picker.tsx` — the monthly/yearly switch above Billing's plan rows, only when it changes | `to` (`monthly \| yearly`), `surface` (`settings_billing`) | Yearly is the default: how many readers switch to monthly before choosing (PRFAQ005 question 19) |
| `plan_change_previewed` | custom | `features/user-settings/pages/general/plan-change-sheet.tsx` — once per preview response the sheet can describe (it has a `kind`); refused previews are not counted | `kind` (`NEW \| UPGRADE \| TO_YEARLY \| DOWNGRADE \| TO_MONTHLY \| SPLIT`), `from` / `to` (plan values: `free`, `premium_monthly`, `growth_yearly`, …; `from` is the plan Billing shows, legacy prices included), `surface` (`settings_billing \| pay_yearly_offer \| deep_link` or the prompt's `upgrade_prompt_clicked` surface) | Which changes readers consider, from where |
| `plan_change_confirmed` | custom | Same sheet, on its confirm button (pay-and-switch, continue-to-checkout for `NEW`, or schedule for a change at the period end; a split's "now" option reports `to` on yearly) | Same as `plan_change_previewed` | Preview → confirm rate per change kind |
| `payment_action_required` | custom | Same sheet, when `changePlan` returns `REQUIRES_ACTION` (the bank must approve; the sheet asks with Stripe.js, or links to Stripe's page when Stripe.js cannot run) | Same as `plan_change_previewed` | How often a change needs authentication |
| `payment_action_completed` | custom | Same sheet, when the bank approves that payment through Stripe.js and the change lands | Same as `plan_change_previewed` | Required → completed rate of in-sheet approvals |
| `payment_action_failed` | custom | Same sheet, when `changePlan` returns `FAILED`, or the bank or customer refuses the in-sheet approval (nothing changed) | Same as `plan_change_previewed` | Authentication/decline failure rate |
| `plan_change_scheduled` | custom | `features/user-settings/pages/general/plan-change-sheet.tsx` — when `changePlan` returns `SCHEDULED` (a downgrade, a switch to monthly, or a split's monthly-at-renewal option) | Same as `plan_change_previewed` | How many changes wait for the period end, by kind |
| `plan_change_reverted` | custom | `subscription-section.tsx` — the Scheduled panel's **Keep current**, once `cancelScheduledPlanChange` succeeds | `from` (current plan value), `to` (the plan the undone change would have moved to) | How often a scheduled change is taken back |
| `cancel_started` | custom | `subscription-section.tsx` — the **Cancel subscription** button opens the cancel sheet | `from` (current plan value) | Top of the cancellation funnel |
| `cancel_confirmed` | custom | Same section, once `cancelSubscription` succeeds from the cancel sheet | `from`, `reason?` (`too_expensive \| missing_features \| unused \| switched_service \| other`; also stored as the subscription's Stripe `cancellation_details.feedback`) | Cancellations and why; started → confirmed rate shows what the sheet's alternative saves |
| `subscription_resumed` | custom | Same section, once `resumeSubscription` succeeds (the Scheduled panel's **Resume**) | `from` (current plan value) | How many pending cancellations are withdrawn |
| `purchase` | recommended | `features/user-settings/lib/purchase.ts`, from two places: the Checkout confirmation on `/settings/billing?checkout=success` once the webhook has recorded the subscription (its first invoice, `subscription_create`), and the change sheet when an immediate change takes effect (`ACTIVE`, or `REQUIRES_ACTION` once the bank approves). Every plan that takes effect counts, whatever its invoice charged — a discount only changes `value`, which may be 0. Once per invoice per browser (remembered in `localStorage`, else once per page load); a pending confirmation or a scheduled change sends none, and a change that takes effect without an invoice is celebrated but has no `transaction_id` to count. Not counted, the accepted cost of browser-only counting (w2/m54): a buyer who closes the tab before the confirmation; a bank approval that leaves the page (a redirect method, or payment on the hosted invoice page); and a confirmation link opened more than 24 hours after its invoice (a bookmark or another browser). A delayed payment method whose first invoice is still unpaid when the confirmation loads counts at what it has collected, often 0 | `transaction_id` (invoice id), `value`, `currency`, `items[]` (`item_id` price, `item_name` plan, `item_variant` `month \| year` when the price is known, `price`, `quantity`) | `checkout_started` → `purchase` completion; yearly share of new and changed subscriptions |

> **Why `directive_added` (with a `directive_type` param) instead of the roadmap's `transaction_added`.** The dialog adds four directive kinds, not just transactions. Per principle #2 (few well-shaped events over many thin ones), one `directive_added{directive_type}` answers both "did the user add *any* directive?" (activation, in aggregate) and "…a transaction?" (slice by `directive_type`). It fires only in each form's mutation-success branch, so abandoned/failed form opens aren't counted. Inline edits of an *existing* directive (`entry-context-dialog.tsx`) are intentionally excluded — that is editing, not adding.
>
> **Why `file_edited` sends no path.** A raw file path can encode ledger/account structure; §4 forbids it. The event fires in the save mutation's `onCompleted` only, and the editor guards against saving unchanged content (`text-file-view.tsx`), so one genuine save = one event.
>
> **Why `bql_query_executed` is bare (no `success`/`duration_ms`).** GA4 event-scoped custom dimensions are capped (50 on standard properties), and every event parameter you want to slice on consumes one slot — whereas `event_name` is a free, always-on dimension. So this event carries **no** parameters: it answers "how often does a user run BQL?" from the event count alone, at zero custom-dimension cost. The raw BQL text is also PII (embeds account names, §4) and must never be sent; `success`/`duration_ms` were deliberately dropped rather than spend two slots on a single event. If a success/latency breakdown is ever needed, prefer a separate `bql_query_failed` event name (still free) over adding a param.
>
> **Why statement export events use bounded dimensions only.** Ledger names,
> filenames, time/account/advanced filters, account paths, currencies, and
> amounts are all excluded. The report kind, output format, and two-value
> failure category are sufficient to measure adoption and reliability without
> exposing financial context or creating high-cardinality analytics data.

**Why `sign_up` fires at OTP verification, not form submit.** The account is only confirmed after the email OTP step (`VerifySignUpOtp` returns the session token). Firing at form submit would inflate the signup count with abandoned/unverified attempts — the same metric-hygiene reasoning behind suppressing automatic page views. The register-form submit can be added later as a separate funnel-entry event (`sign_up_started`) if we want drop-off between submit and verification.

**Scope note.** v1 instruments only the password path, so `AuthMethod` is just `"password"` and the OAuth / one-time-token callback (`auth-callback-page`) is intentionally **not** tracked yet. When social/SSO login is instrumented, extend `AuthMethod` (e.g. `"google"`, `"one_time_token"`) and fire `login` there — noting the callback can't reliably distinguish a new OAuth account from a returning one, so it should emit `login`, not `sign_up`, unless the backend signals "new user".

### 6.1 page_view — manual only, automatic collection disabled

`page_view` is **not** in the typed registry; it is a special GA4 event owned end-to-end by our code so we control exactly when it fires and avoid inflated counts.

- **Emitted by:** `trackPageView()` (`src/common/analytics/track.ts`), driven by the SPA route tracker in `src/common/analytics/analytics-provider.tsx` — once on mount, once per resolved route change, with a dedupe on the raw location so one navigation = one event. Params: `page_path`, `page_title`, `page_location`. `page_title` is the route pattern as well, also applied with `gtag("set")`: ledger pages put the ledger's name in `document.title`, and gtag would otherwise report that title as every event's page title (`dt`), so the bootstrap starts from a fixed `Beancount.io` title (w4/1118).
- **Path is a normalized ROUTE PATTERN, not the raw URL.** The tracker derives the active route template from `router.state.matches` and converts it to e.g. `/ledger/:ledgerOwner/:ledgerName` (search params dropped). This is mandatory: raw paths would leak usernames / ledger / account names / commit SHAs into GA4 and blow out page-path cardinality (→ `(other)` bucketing). `page_location` is sent as `origin + pattern` so GA4's standard Pages report shows the pattern.
- **Automatic source #1 (code-controlled):** gtag's automatic initial `page_view` is disabled via `send_page_view: false` in the config bootstrap (`google-analytics.tsx`). The same bootstrap starts `page_location` at the bare origin and cuts `page_referrer` to its origin, so no raw URL reaches GA4 before the tracker's first `page_view`. The auth routes' query strings carry live credentials (`/auth/reset-password/?token=`, `/auth/callback?oneTimeToken=`), and the page after a reset is referred by that URL (w0/053).
- **Automatic source #2 (GA4 console — action required):** GA4 **Enhanced Measurement** auto-sends `page_view` on page loads *and on browser-history changes* (SPA navigations). This is a data-stream setting that **cannot** be controlled from code. It **must be turned OFF** in **GA4 Admin → Data Streams → [stream] → Enhanced Measurement** (disable "Page views", or at minimum its "page changes based on browser history events" option). If left on, every navigation is counted twice.
- **Automatic source #3 (GA4 console — action required): Site search.** Enhanced Measurement's **Site search** reads the real URL's query parameters — `q`, `s`, `search`, **`query`**, `keyword` — and sends a `view_search_results` event with the value as `search_term`, independently of everything our code sends. The BQL page keeps its bookmarked query in `?query=`, so with Site search on, a reload of a query URL sends the **entire BQL text** (account names, payees, amounts) to GA4 — the raw-BQL rule in §4 broken by a tag we do not control (w4/265). **Turn Site search OFF** in the same Enhanced Measurement panel. Do not try to fix this in code: changing `page_location` does not affect `search_term`, and there is no supported gtag option for it.
- **Net result:** exactly one `page_view` per page/navigation, from one source we own, and no `view_search_results`.

> ✅ Setup checklist for each stream (dev/staging + prod): confirm `send_page_view:false` is live; in **GA4 Admin → Data Streams → [stream] → Enhanced Measurement**, turn **off "Page views"** (including "page changes based on browser history events") **and "Site search"**; then verify with the real tag — collector requests blocked locally or DebugView — that loading and reloading `/ledger/…/query?query=<marker SQL>` emits no `view_search_results`/`search_term` and no `page_location` containing `?query=`, that Files tree → blob navigation emits only the pattern `page_view`, and that a single `page_view` fires on load and on in-app navigation. A jsdom dataLayer test cannot see these automatic events.

---

## 7. Roadmap (v2+) — designed, not yet in the registry

Add these to `AnalyticsEvents` (one typed line each) as they are instrumented. Grouped by purpose; full rationale in the review doc §3.

- **Activation:** `ledger_created{visibility}` (`ledger-list.tsx → handleCreateLedger`), `import_completed{transaction_count}` (`use-import-submit.ts`), `bank_link_completed{institution_id}` (`use-plaid-token-exchange.ts`). _(`directive_added` — the generalization of the originally-planned `transaction_added` — is now live; see §6.)_
- **Onboarding:** `tutorial_begin` (welcome viewed), `sign_up_started` (register-form submit), `sign_up_otp_submitted`/`_failed`, `password_reset_requested`/`_completed`.
- **Activation depth:** `import_started`, `import_step_viewed{step}`, `import_failed{step,reason}`, `bank_link_started`, `bank_transactions_synced`, `plaid_relink_required`.
- **Engagement:** `ai_agent_action_approved`/`_rejected`, `report_viewed{report_type}`, `receipt_parsed`. _(`file_edited`, `ai_agent_message_sent`, and `bql_query_executed` are now live; see §6. Note `bql_query_executed` shipped **bare** — no `success`/`duration_ms` — to conserve the custom-dimension budget.)_
- **Collaboration / growth loops:** `collaborator_invited`, `collaborator_invite_accepted`, `ledger_made_public`, `ledger_starred`, `gallery_search`/`gallery_ledger_opened`, `user_followed`.
- **Monetization:** `upgrade_prompt_clicked`, `checkout_started`, the plan-change lifecycle (`billing_toggle_changed`, `plan_change_previewed`, `plan_change_confirmed`, `payment_action_required`, `payment_action_completed`, `payment_action_failed`) and the browser-side `purchase` are live (see §6). Shipped deviations from the original design: (1) the param is `target_tier` (the plan being purchased), not `plan_tier` — the standard `plan_tier` already means the actor's *current* tier; (2) Billing's change sheet is the single `createSubscriptionSession` entry point — every other upgrade CTA deep-links to `/settings/billing` with a recommended plan and emits `upgrade_prompt_clicked` for intent; (3) `purchase` is sent from the browser (w2/m54), so it carries the session's traffic source natively. The PRFAQ005 stage 2 lifecycle (`plan_change_scheduled`, `plan_change_reverted`, `cancel_started`, `cancel_confirmed{reason}`, `subscription_resumed`) is live too. Still designed-but-not-wired: `upgrade_prompt_viewed` (impression) and `billing_portal_opened`.
- **Reliability:** wire `trackError` into `error-boundary.tsx` and a central Apollo error link (`exception` with `feature`, `mutation_name`).

---

## 8. Governance

**Adding an event**
1. Confirm a specific decision/metric needs it (link it to a funnel/metric in the review doc).
2. Add a line to `AnalyticsEvents` in `events.ts` with a typed param object.
3. Call `track("…", {…})` at the real handler. Add standard params in scope (`plan_tier`, `user_role`, `surface`) — but not entity ids (see §9).
4. Validate in **GA4 DebugView** — non-prod builds already send `debug_mode` (see `google-analytics.tsx`). Point a local build at the dev/staging stream (`VITE_GA_MEASUREMENT_ID`) and confirm the event + params arrive.
5. Register it as a custom dimension in GA4 if you need to segment/report on a param.

**Changing an event**
- Add new params (safe). **Never** rename an event or repurpose a param — it silently breaks historical continuity. Deprecate instead: stop firing the old one, add the new one, note the cutover date.

**Reviewing**
- Naming + params reviewed against this doc in PR. The typed registry makes most violations a compile error rather than a review nit.

**QA**
- Every new event must be seen in DebugView before merge. Unit-test the call wiring where practical (`__tests__/events.test.ts` covers the wrapper contract).

---

## 9. Why this shape (rationale)

The biggest risk for a first analytics taxonomy is sprawl: dozens of inconsistently-named events that no one trusts. This design fights that three ways — a **typed registry** (drift becomes a type error), a **decision-first rule** (no event without a question), and **GA4-recommended-name reuse** (free reporting power). Starting v1 with just `sign_up`, `login`, and a clean `page_view` means we establish a trustworthy acquisition + traffic baseline first — and prove the pipeline end-to-end (DebugView → reports) — before expanding along the §7 roadmap without reworking conventions.

**On dropping `ledger_id` (and entity ids generally).** It's tempting to stamp every event with the id of the entity it touched, but a raw/hashed `ledger_id` is a poor analytics dimension: it's high-cardinality (GA4 buckets it into `(other)` past ~500 values, so you can't slice by it), opaque (you can't read it in a report), and decision-irrelevant (growth/product questions are about *users and behaviors*, not individual ledgers). The right level of analysis for GA4 is the **user**: activation = first `ledger_created` per `user_id`; engagement = event frequency per user. The rare genuine per-ledger question (e.g. "do ledgers with >1000 entries retain better?") is a **warehouse** query joined on `user_id` against the backend DB — not something a GA event param can answer well. So we send decision-relevant *attributes* (`source`, `visibility`) and keep ids out, with `institution_id` retained only because it is a low-cardinality, human-mappable, non-PII public identifier that answers a real "which bank" question.
