/**
 * Google Analytics utility functions
 * Provides type-safe wrappers for gtag analytics tracking
 */
import { config } from "@/config/config";

/**
 * Google Analytics 4 Measurement ID for the active environment's data stream.
 * Sourced from VITE_GA_MEASUREMENT_ID (see src/config/config.ts) so dev/staging
 * and production report to separate streams.
 */
const GA4_MEASUREMENT_ID = config.gaMeasurementId;

/**
 * Check if analytics is available and should be tracked.
 * Requires gtag to be loaded and a measurement ID to be configured.
 */
function isAnalyticsAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.gtag === "function" &&
    Boolean(GA4_MEASUREMENT_ID)
  );
}

// Private dispatcher — single call site for window.gtag so debug logging
// and future instrumentation live here, not spread across every wrapper.
// Mirrors the generic signature of Gtag.Gtag so every call site is fully
// type-checked against GtagCommands[Command] with no `any` required.
function callGtag<Command extends keyof Gtag.GtagCommands>(
  command: Command,
  ...args: Gtag.GtagCommands[Command]
): void {
  if (config.gaDebugMode) {
    console.log("[GA4]", command, ...args);
  }
  window.gtag(command, ...args);
}

export interface RouteViewParams {
  /** Normalized route pattern, e.g. "/ledger/:ledgerOwner/:ledgerName/balance-sheet". */
  route_pattern: string;
}

/** Fire a custom `route_view` event on every SPA navigation and initial load. */
export function trackRouteView(params: RouteViewParams): void {
  if (!isAnalyticsAvailable()) return;
  callGtag("event", "route_view", { route_pattern: params.route_pattern });
}

/**
 * Track a custom event
 * @param eventName - Name of the event to track
 * @param eventParams - Additional parameters for the event
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, unknown>,
): void {
  if (!isAnalyticsAvailable()) return;
  callGtag("event", eventName, eventParams);
}

/**
 * Set user properties for analytics
 * @param userId - User ID to associate with analytics
 */
export function setUserId(userId: string): void {
  if (!isAnalyticsAvailable()) return;

  // gtag("set") applies user_id globally to all subsequent events without
  // replacing the per-target config (which would reset debug_mode, etc.).
  callGtag("set", { user_id: userId });
}

/**
 * Clear the analytics identity (call on logout). Detaches user_id and resets
 * user properties so events after logout are not attributed to the previous
 * user.
 */
export function clearUserId(): void {
  if (!isAnalyticsAvailable()) return;

  callGtag("set", { user_id: null });
  callGtag("set", "user_properties", {
    plan_tier: null,
    ledger_count: null,
    has_linked_bank: null,
  });
}

/**
 * Track an error event
 * @param description - Description of the error
 * @param fatal - Whether the error is fatal (default: false)
 */
export function trackError(description: string, fatal = false): void {
  if (!isAnalyticsAvailable()) return;

  callGtag("event", "exception", {
    description,
    fatal,
  });
}

/**
 * Set GA4 user properties (applied to the user, not a single event).
 * Prefer the typed `setUserProperties` wrapper in ./events over this raw form.
 * @param properties - Key/value user properties
 */
export function setUserProperties(properties: Record<string, unknown>): void {
  if (!isAnalyticsAvailable()) return;

  callGtag("set", "user_properties", properties);
}
