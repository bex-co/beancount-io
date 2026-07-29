import { config } from "@/config/config";

/**
 * Renders children only when analytics is configured for the current
 * environment (i.e. VITE_GA_MEASUREMENT_ID is set). This replaces the previous
 * production-only gate so instrumentation can be exercised against a
 * dev/staging GA4 stream and validated in DebugView before reaching prod.
 */
export const AnalyticsEnabled = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  if (config.analyticsEnabled) {
    return children;
  }
  return null;
};
