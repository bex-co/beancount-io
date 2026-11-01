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
 * GA4 never sees a raw URL (docs/event-taxonomy.md §6.1, w0/053). The
 * automatic `page_view` is off and `page_location` starts as the bare origin;
 * AnalyticsProvider then sets it to `origin + route pattern` and sends the one
 * `page_view` per navigation (see track.ts). Raw URLs carry credentials: the
 * password-reset link's `?token=` and the one-time sign-in link's
 * `?oneTimeToken=`. `page_referrer` is cut to its origin for the same reason,
 * since the page after a reset is referred by the token URL. Enhanced
 * Measurement "Page views" must stay OFF in GA4 Admin → Data Streams: it
 * reads the raw URL on every history change. Enhanced Measurement "Site
 * search" must stay OFF too: it reads `?query=` itself and would send the
 * full BQL text as `search_term`, which no option here can stop (w4/265).
 */
export function GoogleAnalytics() {
  const { gaMeasurementId, gaDebugMode } = config;

  if (!gaMeasurementId) return null;

  // debug_mode surfaces events in GA4 DebugView for non-production streams.
  const configOptions: Record<string, unknown> = { send_page_view: false };
  if (gaDebugMode) configOptions.debug_mode = true;

  // Build the bootstrap inline so the measurement ID and flags are resolved at
  // build time per environment. The location and referrer are the browser's,
  // reduced to origins before gtag can read them, and the title is fixed so
  // gtag never reads a ledger name from document.title (w4/1118).
  const initScript = [
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    'gtag("js", new Date());',
    `gtag("config", ${JSON.stringify(gaMeasurementId)}, Object.assign(${JSON.stringify(
      configOptions,
    )}, { page_location: location.origin + "/", page_referrer: document.referrer ? new URL(document.referrer).origin + "/" : "", page_title: "Beancount.io" }));`,
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
