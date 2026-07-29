/**
 * Analytics module — all Google Analytics (GA4) code lives here.
 *
 * - track.ts ............ type-safe gtag wrappers (trackEvent, trackError, …)
 * - google-analytics.tsx  GA4 script injection for the document <head>
 * - analytics-provider.tsx runtime page-view + user-id tracking
 * - analytics-enabled.tsx  gate that renders only when a GA stream is configured
 * - gtag.d.ts ........... window.gtag / window.dataLayer global typings
 *
 * Environment config (measurement ID, debug mode, enabled flag) is derived
 * from VITE_GA_MEASUREMENT_ID in src/config/config.ts.
 */
export { GoogleAnalytics } from "./google-analytics";
export { AnalyticsProvider } from "./analytics-provider";
export { AnalyticsEnabled } from "./analytics-enabled";
export {
  trackRouteView,
  trackEvent,
  setUserId,
  clearUserId,
  trackError,
} from "./track";

// Typed event taxonomy — prefer these over the raw trackEvent for product events.
export { track, setUserProperties } from "./events";
export type {
  AnalyticsEvents,
  AnalyticsEventName,
  AnalyticsUserProperties,
  StandardParams,
  AuthMethod,
  PlanTier,
} from "./events";
