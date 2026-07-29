interface Config {
  apiUrl: string;
  ssrApiUrl: string;
  /**
   * Google Analytics 4 Measurement ID for the current environment's data stream.
   * Set per-environment (separate dev/staging vs. production streams) via
   * VITE_GA_MEASUREMENT_ID. When unset, analytics is disabled gracefully.
   */
  gaMeasurementId: string | undefined;
  /**
   * Whether analytics is enabled. True only when a measurement ID is configured.
   */
  analyticsEnabled: boolean;
  /**
   * Whether to send GA4 events with debug_mode (surfaces them in the GA4
   * DebugView for validation). Enabled for every non-production build so
   * instrumentation can be verified against a dev/staging stream before it
   * reaches the production stream.
   */
  gaDebugMode: boolean;
}

// Add runtime validation (only in development mode)
const apiUrl = import.meta.env.VITE_API_URL;
const ssrApiUrl = import.meta.env.VITE_SSR_API_URL || apiUrl;
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || undefined;
// const gaMeasurementId = "G-Y0WGKFHE3E";
const gaDebugMode = !import.meta.env.PROD;

if (import.meta.env.MODE === "development" && !apiUrl) {
  console.error("[Config] VITE_API_URL is not set!");
}

export const config: Config = {
  apiUrl,
  ssrApiUrl,
  gaMeasurementId,
  analyticsEnabled: Boolean(gaMeasurementId),
  gaDebugMode,
};
