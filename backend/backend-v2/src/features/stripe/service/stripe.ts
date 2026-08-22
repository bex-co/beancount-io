/**
 * Centralized configuration for Stripe integrations
 */

import { config } from "@/config/config";

/**
 * Payment type enum to distinguish between subscription and one-time payments
 */
export enum PaymentType {
  RECURRING = "subscription",
  ONE_OFF = "payment",
}

/**
 * Subscription tier enum
 * Defines the available subscription tiers for users
 */
export enum SubscriptionTier {
  FREE = "FREE",
  PREMIUM = "PREMIUM",
  GROWTH = "GROWTH",
  ORGANIZATION = "ORGANIZATION",
  ENTERPRISE = "ENTERPRISE",
}

/**
 * Global tier limits configuration
 * Defines resource limits for each subscription tier
 */
export const TIER_LIMITS = {
  [SubscriptionTier.FREE]: {
    maxLedgers: 1,
    maxCollaboratorsPerLedger: 1,
    aiCfoTokensMax: 20_000,
    maxDirectives: 1000,
  },
  [SubscriptionTier.PREMIUM]: {
    maxLedgers: 5,
    maxCollaboratorsPerLedger: 5,
    aiCfoTokensMax: 500_000,
    maxDirectives: -1, // Unlimited
  },
  [SubscriptionTier.GROWTH]: {
    maxLedgers: 20,
    maxCollaboratorsPerLedger: 10,
    aiCfoTokensMax: 2_000_000,
    maxDirectives: -1, // Unlimited
  },
  [SubscriptionTier.ORGANIZATION]: {
    maxLedgers: 100,
    maxCollaboratorsPerLedger: 50,
    aiCfoTokensMax: 10_000_000,
    maxDirectives: -1, // Unlimited
  },
  [SubscriptionTier.ENTERPRISE]: {
    maxLedgers: -1, // Unlimited
    maxCollaboratorsPerLedger: -1, // Unlimited
    aiCfoTokensMax: -1, // Unlimited
    maxDirectives: -1, // Unlimited
  },
} as const;

/**
 * Type definition for tier-based resource limits
 */
export type TierLimits = {
  maxLedgers: number;
  maxCollaboratorsPerLedger: number;
  aiCfoTokensMax: number;
  maxDirectives: number;
};

/**
 * Pure lookup of the limits for a subscription tier. No dependencies — prefer
 * this over reaching for a service when you already know the tier.
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Interface for plan configuration
 */
export interface PlanConfig {
  /** Price ID for this plan */
  priceId: string;
  /** Payment type (subscription or one-time) */
  type: PaymentType;
  /** Description of the plan */
  description: string;
  /** Subscription tier associated with this plan */
  tier: SubscriptionTier;
}

/**
 * Interface for Stripe client configuration
 */
export interface StripeClientConfig {
  /** Uses Stripe test-mode keys — new payments must not be created for this client when running in production */
  isDevOnly?: boolean;
  /** Product IDs for this client */
  productIds: string[];
  /** Plan IDs for this client */
  planIds: string[];
  /** Plan configurations with metadata */
  plans: PlanConfig[];
  /** Webhook secret for verifying Stripe signatures */
  webhookSecret?: string;
  /** Stripe public key */
  stripePubKey?: string;
  /** Stripe private key */
  stripePriKey?: string;
  /** URL to redirect after successful subscription */
  successUrl: string;
  /** URL to redirect after cancelled subscription */
  cancelUrl: string;
  /** URL to return to after leaving the Stripe customer portal */
  portalReturnUrl: string;
  /** Webhook URL for Stripe events */
  webhook: string;
}

/**
 * Type for subscription configuration by client ID
 */
export type SubscriptionConfigMap = {
  [clientId: string]: StripeClientConfig;
};

/**
 * Subscription configuration for all clients
 */
export const SUBSCRIPTION_CONFIG: SubscriptionConfigMap = {
  "beancount-web-prod": {
    productIds: [
      "prod_LrLIJaWkCbz2uA",
      "prod_TwIDs5ys1JPw89",
      "prod_TwIDr09gy8HuYy",
    ],
    planIds: [
      "price_1L9ccEEqsEqs2tLVKPRV17wb", // $9.99/month (legacy)
      "price_1L9ccEEqsEqs2tLVbeBgHm9p", // $99.99/year (legacy)
      "price_1RrSOGEqsEqs2tLVFnyB34qG", // $14.99/month (Premium)
      "price_1SyPdaEqsEqs2tLViLPUDoVi", // $99.99/month (Growth)
      "price_1SyPdbEqsEqs2tLV7PJyWZed", // $959.88/year (Growth)
      "price_1SyPdcEqsEqs2tLVCWEgU1PZ", // $499.99/month (Organization)
      "price_1SyPdfEqsEqs2tLVmK6zCrP6", // $4,799.88/year (Organization)
    ],
    plans: [
      {
        priceId: "price_1L9ccEEqsEqs2tLVKPRV17wb",
        type: PaymentType.RECURRING,
        description: "Web Beancount Basic - Monthly - $9.99/month (Legacy)",
        tier: SubscriptionTier.PREMIUM,
      },
      {
        priceId: "price_1L9ccEEqsEqs2tLVbeBgHm9p",
        type: PaymentType.RECURRING,
        description: "Web Beancount Basic - Yearly - $99.99/year (Legacy)",
        tier: SubscriptionTier.PREMIUM,
      },
      {
        priceId: "price_1RrSOGEqsEqs2tLVFnyB34qG",
        type: PaymentType.RECURRING,
        description: "Web Beancount Premium - Monthly - $14.99/month",
        tier: SubscriptionTier.PREMIUM,
      },
      {
        priceId: "price_1SyPdaEqsEqs2tLViLPUDoVi",
        type: PaymentType.RECURRING,
        description:
          "Web Beancount Growth - Monthly - $99.99/month (Smart Automation)",
        tier: SubscriptionTier.GROWTH,
      },
      {
        priceId: "price_1SyPdbEqsEqs2tLV7PJyWZed",
        type: PaymentType.RECURRING,
        description:
          "Web Beancount Growth - Yearly - $79.99/month billed yearly (Smart Automation)",
        tier: SubscriptionTier.GROWTH,
      },
      {
        priceId: "price_1SyPdcEqsEqs2tLVCWEgU1PZ",
        type: PaymentType.RECURRING,
        description:
          "Web Beancount Organization - Monthly - $499.99/month (Multi-Entity)",
        tier: SubscriptionTier.ORGANIZATION,
      },
      {
        priceId: "price_1SyPdfEqsEqs2tLVmK6zCrP6",
        type: PaymentType.RECURRING,
        description:
          "Web Beancount Organization - Yearly - $399.99/month billed yearly (Multi-Entity)",
        tier: SubscriptionTier.ORGANIZATION,
      },
    ],
    webhookSecret: config.stripe.webhookSecret,
    stripePubKey: config.stripe.publicKey,
    stripePriKey: config.stripe.privateKey,
    successUrl: "https://beancount.io/pricing/?success=true",
    cancelUrl: "https://beancount.io/pricing",
    portalReturnUrl: "https://beancount.io/profile/settings",
    webhook: "https://beancount.io/api-gateway/stripe/webhook",
  },
  "beancount-web-dev": {
    isDevOnly: true,
    productIds: [
      "prod_LrLTND5aSgNlxd",
      "prod_TwHlbmV0ayeBpb",
      "prod_TwHlFwtMadm2S6",
    ],
    planIds: [
      "price_1L9cmbEqsEqs2tLVuCG0AcO8", // $9.99/month (legacy)
      "price_1L9cmbEqsEqs2tLVsGOgOQYg", // $99.99/year (legacy)
      "price_1RrSU7EqsEqs2tLVCQiyqgQy", // $14.99/month (Premium)
      "price_1SyPCpEqsEqs2tLVb89308vB", // $99.99/month (Growth)
      "price_1SyPCqEqsEqs2tLV16VV8qR1", // $959.88/year (Growth)
      "price_1SyPCsEqsEqs2tLVTVk0nzEM", // $499.99/month (Organization)
      "price_1SyPCtEqsEqs2tLV3tquQGTA", // $4,799.88/year (Organization)
    ],
    plans: [
      {
        priceId: "price_1L9cmbEqsEqs2tLVuCG0AcO8",
        type: PaymentType.RECURRING,
        description:
          "Web Beancount Basic - Monthly - $9.99/month (Legacy, Test)",
        tier: SubscriptionTier.PREMIUM,
      },
      {
        priceId: "price_1L9cmbEqsEqs2tLVsGOgOQYg",
        type: PaymentType.RECURRING,
        description:
          "Web Beancount Basic - Yearly - $99.99/year (Legacy, Test)",
        tier: SubscriptionTier.PREMIUM,
      },
      {
        priceId: "price_1RrSU7EqsEqs2tLVCQiyqgQy",
        type: PaymentType.RECURRING,
        description: "Web Beancount Premium - Monthly - $14.99/month (Test)",
        tier: SubscriptionTier.PREMIUM,
      },
      {
        priceId: "price_1SyPCpEqsEqs2tLVb89308vB",
        type: PaymentType.RECURRING,
        description:
          "Web Beancount Growth - Monthly - $99.99/month (Test, Smart Automation)",
        tier: SubscriptionTier.GROWTH,
      },
      {
        priceId: "price_1SyPCqEqsEqs2tLV16VV8qR1",
        type: PaymentType.RECURRING,
        description:
          "Web Beancount Growth - Yearly - $79.99/month billed yearly (Test, Smart Automation)",
        tier: SubscriptionTier.GROWTH,
      },
      {
        priceId: "price_1SyPCsEqsEqs2tLVTVk0nzEM",
        type: PaymentType.RECURRING,
        description:
          "Web Beancount Organization - Monthly - $499.99/month (Test, Multi-Entity)",
        tier: SubscriptionTier.ORGANIZATION,
      },
      {
        priceId: "price_1SyPCtEqsEqs2tLV3tquQGTA",
        type: PaymentType.RECURRING,
        description:
          "Web Beancount Organization - Yearly - $399.99/month billed yearly (Test, Multi-Entity)",
        tier: SubscriptionTier.ORGANIZATION,
      },
    ],
    webhookSecret: config.stripe.dev.webhookSecret,
    stripePubKey: config.stripe.dev.publicKey,
    stripePriKey: config.stripe.dev.privateKey,
    successUrl: "https://beancount.io/pricing/?success=true&env=dev",
    cancelUrl: "https://beancount.io/pricing?env=dev",
    portalReturnUrl: "https://beancount.io/profile/settings?env=dev",
    webhook: "https://beancount.io/api-gateway/stripe/webhook",
  },
};
