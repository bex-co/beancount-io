import { config } from "@/config/config";

/**
 * Injects the GA4 gtag.js loader and bootstrap for the environment's data
 * stream. The measurement ID comes from VITE_GA_MEASUREMENT_ID (see
 * src/config/config.ts), so dev/staging builds report to a separate stream
 * from production and can be validated in GA4 DebugView before release.
 *
 * Renders nothing when no measurement ID is configured, so analytics is
 * disabled gracefully (e.g. local dev without a stream, or misconfigured envs).
 *
 * GA4 auto-collects `page_view` normally for built-in reports (Pages and
 * Screens, session attribution, etc.). Enable Enhanced Measurement "Page views"
 * in GA4 Admin → Data Streams so history-based SPA navigations are captured too.
 * Alongside this, AnalyticsProvider fires a custom `route_view` event with
 * normalized, PII-free parameters for product analytics (see track.ts).
 */
export function GoogleAnalytics() {
  const { gaMeasurementId, gaDebugMode } = config;

  if (!gaMeasurementId) return null;

  // debug_mode surfaces events in GA4 DebugView for non-production streams.
  const configOptions: Record<string, unknown> = {};
  if (gaDebugMode) configOptions.debug_mode = true;

  // Build the bootstrap inline so the measurement ID and flags are resolved at
  // build time per environment.
  const initScript = [
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    'gtag("js", new Date());',
    `gtag("config", ${JSON.stringify(gaMeasurementId)}, ${JSON.stringify(
      configOptions,
    )});`,
  ].join("\n");

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
      />
      <script dangerouslySetInnerHTML={{ __html: initScript }} />
    </>
  );
}
