/**
 * Event taxonomy — the single source of truth for product analytics events.
 *
 * Adding/changing an event means editing the `AnalyticsEvents` registry below.
 * Because `track()` is typed against this registry, event names and their
 * parameters are enforced at compile time, which prevents the taxonomy drift
 * that arises from calling the raw `trackEvent(name, params)` with free-form
 * strings.
 *
 * CURRENT FOCUS (v1): registration (`sign_up`), login (`login`), and page views.
 * route_view is NOT in this registry — it is a custom page-navigation event
 * owned by AnalyticsProvider (see analytics-provider.tsx + track.ts) that fires
 * alongside GA4's auto page_view with fully normalized, PII-free parameters.
 *
 * Conventions (see docs/event-taxonomy.md for the full spec):
 *  - snake_case, object_action, past tense for completed actions.
 *  - Reuse GA4 recommended names (sign_up, login, …) where they map cleanly so
 *    GA4's built-in reporting and predictive audiences light up.
 *  - Never send raw ledger/account names, per-user ids, or monetary amounts —
 *    prefer bucketed/derived attributes.
 */
import type { UserTier } from "@/common/hooks/use-user-limits";
import { trackEvent, setUserProperties as setRawUserProperties } from "./track";

/**
 * How a user authenticated. Only "password" is supported for now; add
 * other methods (e.g. "google", "github", "one_time_token") here when those
 * paths are instrumented.
 */
export type AuthMethod = "password";

/**
 * Kind of Beancount directive added through the "New directive" dialog.
 * Mirrors the four dialog tabs / the LedgerEntryType values the forms submit.
 */
export type DirectiveType = "transaction" | "balance" | "note" | "open";

/** Financial statement and browser output selected from a report page. */
export type ReportExportType =
  | "balance_sheet"
  | "profit_and_loss"
  | "cash_flow";
export type ReportExportFormat = "csv" | "markdown" | "print";
export type ReportExportFailure =
  | "csv_generation"
  | "markdown_generation"
  | "print_dialog";

/** Subscription tier. Mirrors UserTier so it stays in sync with billing. */
export type PlanTier = UserTier;

/**
 * Standard parameters that may accompany any event. Attach whatever is in
 * scope at the call site.
 *
 * NOTE: we deliberately do NOT carry a per-ledger id. A specific ledger's
 * identity is not a useful analytics dimension — it's high-cardinality, opaque,
 * and no growth/product decision turns on it. Cross-data analysis joins on
 * `user_id` (set via setUserId) in the warehouse, not on ledger_id. Prefer
 * bucketed/derived attributes (e.g. `source`, `visibility`) over ids.
 */
export interface StandardParams {
  /** Current subscription tier of the actor. */
  plan_tier?: PlanTier;
  /** Whether the actor owns the ledger or collaborates on it. */
  user_role?: "owner" | "collaborator";
  /** UI entry point that triggered the action, e.g. "sidebar", "welcome". */
  surface?: string;
}

/**
 * The canonical event registry.
 *
 * SCOPE (v1): intentionally limited to the two auth events we are focusing on
 * now. The broader activation / engagement / monetization events
 * (ledger_created, transaction_added, import_completed, bank_link_completed,
 * checkout_started, …) are documented as a roadmap in docs/event-taxonomy.md
 * and should be added here, one typed line each, as they are instrumented.
 */
export interface AnalyticsEvents {
  // --- Acquisition (GA4 recommended names) ---
  /**
   * Account created. Fired once registration actually completes — i.e. after
   * email OTP verification (use-otp-form.ts), NOT at form submit — so the metric
   * counts verified accounts and is not inflated by abandoned attempts.
   */
  sign_up: { method: AuthMethod };
  /**
   * Returning sign-in. Fired on password login and on one-time-token / OAuth
   * callback login. Powers DAU/WAU/MAU and retention.
   */
  login: { method: AuthMethod };
  /**
   * Coarse retirement signal for the old embedded-mobile token handoff. It is
   * emitted only when the WebView bridge exists and deliberately carries no
   * token, user, server, URL, or app-version value.
   */
  legacy_mobile_auth_completed: {
    flow: "password" | "otp" | "one_time_token";
  };

  // --- Activation / engagement ---
  /**
   * A directive was successfully added via the "New directive" dialog. Fired in
   * each form's mutation-success branch (transaction/balance/note/open-account),
   * so it counts only committed directives, not abandoned form opens. Slice by
   * `directive_type` to answer "did the user add a transaction?" specifically or
   * "any directive?" in aggregate. Raw ledger/account names are never sent.
   */
  directive_added: { directive_type: DirectiveType };
  /**
   * A raw ledger file edit was successfully saved in the file editor. Fired in
   * the save mutation's `onCompleted`, so it counts only genuine saves (the
   * editor guards against saving unchanged content). No file path is sent — it
   * can contain ledger/account structure (see docs/event-taxonomy.md §4).
   */
  file_edited: Record<string, never>;
  /**
   * A user sent a message to the AI agent on the /ledger/:owner/:name/agent
   * chat. Fired once per user-initiated send — both the chat-input submit and
   * the `?q=` deep-link auto-submit on load — but NOT on the SDK's automatic
   * post-approval continuation, which is not a user message. Powers agent
   * engagement frequency (messages per user / per session). `has_attachment`
   * distinguishes plain questions from file-processing requests; message text
   * and file contents are never sent (see docs/event-taxonomy.md §4).
   */
  ai_agent_message_sent: { has_attachment: boolean };
  /**
   * A user executed a BQL query. Fired once per real execution at the single
   * choke point (`bql/pages/index.tsx → executeQueryAndCache`), covering the
   * manual submit, history re-run, and `?query=` deep-link paths; success and
   * failure are counted alike. Engagement signal — frequency of BQL use per
   * user, measured by `event_name` alone. Intentionally parameter-less ("bare"):
   * the raw BQL text can embed account names (§4), and `success`/`duration_ms`
   * would each cost a GA4 custom-dimension slot (50-slot cap). `event_name` is a
   * free dimension, so this reports frequency with zero custom-dimension budget.
   */
  bql_query_executed: Record<string, never>;
  /**
   * A bounded interaction with the public Awesome PTA decision tool. The
   * destination is intentionally a coarse section/category rather than a URL
   * or project name, keeping the event useful without introducing an
   * unbounded acquisition dimension.
   */
  awesome_pta_action_clicked: {
    action: "section" | "guide" | "tool" | "hosted" | "contribute";
    destination:
      | "comparison"
      | "catalog"
      | "method"
      | "engine"
      | "editor"
      | "importer"
      | "reporting"
      | "mobile"
      | "hosted"
      | "contribute";
  };
  /**
   * Catalog-filter use without the selected value. In particular, free-form
   * search text never leaves the browser.
   */
  awesome_pta_filter_changed: {
    filter: "search" | "category" | "format" | "workflow";
    state: "applied" | "cleared";
  };
  /**
   * A user invoked a financial-statement export. These events intentionally
   * contain only bounded product dimensions: never ledger identifiers,
   * filenames, filter expressions, account names, or amounts.
   */
  report_export_started: {
    report_type: ReportExportType;
    format: ReportExportFormat;
  };
  report_export_completed: {
    report_type: ReportExportType;
    format: ReportExportFormat;
  };
  report_export_failed: {
    report_type: ReportExportType;
    format: ReportExportFormat;
    failure_category: ReportExportFailure;
  };

  // --- Monetization ---
  /**
   * A user clicked an "Upgrade" CTA that surfaces subscription intent at a
   * friction point and routes to the billing page (`/settings/general`) rather
   * than starting checkout inline: the AI-CFO usage panel, the importer premium
   * paywall, the collaborators/ledger limit walls, and the sidebar
   * directive-usage nudge. Captures intent at the moment of interest —
   * independent of whether a checkout is ever started — so it measures the top
   * of the monetization funnel (which friction points drive upgrade interest).
   * Always pair with `surface`; `target_tier` is attached when the CTA points at
   * a specific plan (the AI-CFO cards, the importer's Premium upsell) and omitted
   * for the generic limit nudges that just open the billing page.
   */
  upgrade_prompt_clicked: { target_tier?: PlanTier };
  /**
   * A new (free-tier) subscriber started Stripe Checkout from the billing page's
   * plan cards (`subscription-upgrade-cards.tsx`, settings › subscription). Fired
   * on click of a plan's "Upgrade" button on the new-subscriber
   * (`createSubscriptionSession` → hosted Checkout) path — the single,
   * consolidated checkout entry point — so it marks the paid transaction actually
   * beginning. `target_tier` is the plan being purchased. This is the deep funnel
   * stage below `upgrade_prompt_clicked`: intent → checkout_started → `purchase`
   * (the last fired server-side from the Stripe webhook). In-place tier changes by
   * existing subscribers (`upgradeSubscription`, no checkout session) are NOT
   * counted here. Note: `target_tier` (the plan being purchased) is distinct from
   * the standard `plan_tier`, which is the actor's *current* tier.
   */
  checkout_started: { target_tier: PlanTier };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

/**
 * Type-safe event tracker. The event name and its parameters are checked at
 * compile time against `AnalyticsEvents`. Prefer this over raw `trackEvent`
 * for every product event.
 *
 * @example
 * track("sign_up", { method: "password" });
 */
export function track<E extends AnalyticsEventName>(
  name: E,
  params: AnalyticsEvents[E] & StandardParams,
): void {
  trackEvent(name, params as unknown as Record<string, unknown>);
}

/**
 * User properties are set once on the GA4 user (not per event) and enable
 * cohort comparisons (e.g. retention by plan tier) without warehouse work.
 */
export interface AnalyticsUserProperties {
  plan_tier?: PlanTier;
  /** ISO date string, e.g. "2026-06-29". */
  signup_date?: string;
  ledger_count?: number;
  has_linked_bank?: boolean;
  /** i18n language code, e.g. "en", "zh". */
  preferred_language?: string;
}

/** Set typed GA4 user properties for cohorting. */
export function setUserProperties(props: AnalyticsUserProperties): void {
  setRawUserProperties(props as Record<string, unknown>);
}
