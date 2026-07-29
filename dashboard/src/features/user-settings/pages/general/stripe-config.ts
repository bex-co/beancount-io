/**
 * Stripe configuration for subscription plans
 * Contains client IDs and price IDs for different environments
 */

export type StripeEnvironment = "production" | "development";

export type SubscriptionTier = "premium" | "growth" | "organization";

export interface TierPricing {
  monthly: string;
  yearly: string;
}

export interface StripePlanConfig {
  clientId: string;
  premium: TierPricing;
  growth: TierPricing;
  organization: TierPricing;
  environment: StripeEnvironment;
  // Legacy fields for backward compatibility
  monthly: string;
  yearly: string;
}

/**
 * Stripe plan configurations by environment
 */
const STRIPE_PLANS: Record<StripeEnvironment, StripePlanConfig> = {
  production: {
    clientId: "beancount-web-prod",
    premium: {
      monthly: "price_1RrSOGEqsEqs2tLVFnyB34qG", // $14.99/month
      yearly: "price_1L9ccEEqsEqs2tLVbeBgHm9p", // $99.99/year (legacy)
    },
    growth: {
      monthly: "price_1SyPdaEqsEqs2tLViLPUDoVi", // $99.99/month
      yearly: "price_1SyPdbEqsEqs2tLV7PJyWZed", // $79.99/month billed yearly ($959.88/year)
    },
    organization: {
      monthly: "price_1SyPdcEqsEqs2tLVCWEgU1PZ", // $499.99/month
      yearly: "price_1SyPdfEqsEqs2tLVmK6zCrP6", // $399.99/month billed yearly ($4,799.88/year)
    },
    // Legacy fields for backward compatibility (pointing to Premium tier)
    monthly: "price_1RrSOGEqsEqs2tLVFnyB34qG", // $14.99/month
    yearly: "price_1L9ccEEqsEqs2tLVbeBgHm9p", // $99.99/year
    environment: "production",
  },
  development: {
    clientId: "beancount-web-dev",
    premium: {
      monthly: "price_1RrSU7EqsEqs2tLVCQiyqgQy", // $14.99/month (test)
      yearly: "price_1L9cmbEqsEqs2tLVsGOgOQYg", // $99.99/year (test, legacy)
    },
    growth: {
      monthly: "price_1SyPCpEqsEqs2tLVb89308vB", // $99.99/month (test)
      yearly: "price_1SyPCqEqsEqs2tLV16VV8qR1", // $79.99/month billed yearly (test, $959.88/year)
    },
    organization: {
      monthly: "price_1SyPCsEqsEqs2tLVTVk0nzEM", // $499.99/month (test)
      yearly: "price_1SyPCtEqsEqs2tLV3tquQGTA", // $399.99/month billed yearly (test, $4,799.88/year)
    },
    // Legacy fields for backward compatibility (pointing to Premium tier)
    monthly: "price_1RrSU7EqsEqs2tLVCQiyqgQy", // $14.99/month (test)
    yearly: "price_1L9cmbEqsEqs2tLVsGOgOQYg", // $99.99/year (test)
    environment: "development",
  },
};

/**
 * Get Stripe plan configuration for a specific environment
 *
 * @param env - The environment to get configuration for (defaults to production)
 * @returns Stripe plan configuration for the specified environment
 *
 * @example
 * ```typescript
 * // Get production config
 * const prodConfig = getStripePlanConfig('production');
 *
 * // Get development config
 * const devConfig = getStripePlanConfig('development');
 * ```
 */
export const getStripePlanConfig = (
  env: StripeEnvironment | null | undefined = "production",
): StripePlanConfig => {
  // Default to production if env is null/undefined or invalid
  const environment: StripeEnvironment =
    env === "development" ? "development" : "production";

  return STRIPE_PLANS[environment];
};

/**
 * Get Stripe plan configuration from URL query parameters
 * Supports ?env=dev to switch to development mode
 *
 * @returns Stripe plan configuration based on URL parameter
 *
 * @example
 * ```typescript
 * // URL: /settings/general → production config
 * // URL: /settings/general?env=dev → development config
 * const config = getStripePlanConfigFromUrl();
 * ```
 */
export const getStripePlanConfigFromUrl = (): StripePlanConfig => {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return getStripePlanConfig("production");
  }

  // Read env parameter from URL
  const params = new URLSearchParams(window.location.search);
  const envParam = params.get("env");

  // Use development config if env=dev, otherwise production
  const environment: StripeEnvironment =
    envParam === "dev" ? "development" : "production";

  return getStripePlanConfig(environment);
};

/**
 * Get pricing for a specific tier
 *
 * @param tier - The subscription tier to get pricing for
 * @param env - The environment (defaults to production)
 * @returns Tier-specific pricing configuration
 *
 * @example
 * ```typescript
 * const growthPricing = getTierPricing('growth');
 * console.log(growthPricing.monthly); // Growth monthly price ID
 * console.log(growthPricing.yearly); // Growth yearly price ID
 * ```
 */
export const getTierPricing = (
  tier: SubscriptionTier,
  env: StripeEnvironment | null | undefined = "production",
): TierPricing => {
  const config = getStripePlanConfig(env);
  return config[tier];
};

/**
 * Export the current plan config as a constant for convenience
 * @deprecated Use getStripePlanConfigFromUrl() for dynamic environment switching
 */
export const stripePlanConfig = getStripePlanConfig("production");
