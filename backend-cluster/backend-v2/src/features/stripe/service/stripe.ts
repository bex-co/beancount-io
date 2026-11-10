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

/** Each tier's plan name, as people read it in a message. */
export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  [SubscriptionTier.FREE]: "Free",
  [SubscriptionTier.PREMIUM]: "Premium",
  [SubscriptionTier.GROWTH]: "Growth",
  [SubscriptionTier.ORGANIZATION]: "Organization",
  [SubscriptionTier.ENTERPRISE]: "Enterprise",
};

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
    maxLedgers: 500,
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

export type BillingInterval = "month" | "year";

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
  /** Billing cycle, so plan changes classify without a Stripe call. */
  interval: BillingInterval;
  /**
   * Still billed to, and resolved for, the subscribers on it, but never sold
   * again: Checkout and plan changes both refuse it.
   */
  retired?: true;
}

/**
 * Interface for Stripe client configuration
 */
export interface StripeClientConfig {
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
  /**
   * The billing portal configuration every portal session uses: payment
   * methods, invoices and billing details only, so plan changes go through
   * changePlan. Account-specific like the price IDs, and not a secret.
   */
  portalConfigurationId: string;
  /**
   * The coupon behind each checkout recovery code: 20% off, once (ADR027 D3).
   * Created by hand in the Stripe Dashboard with this ID; not a secret.
   */
  recoveryCouponId: string;
  /**
   * The SendGrid unsubscribe group of the checkout recovery email
   * (ADR027 D6). Account-specific like the coupon, and not a secret.
   */
  recoveryEmailGroupId: number;
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
export const BILLING_CLIENT_ID = "beancount-web-prod";

export const SUBSCRIPTION_CONFIG: SubscriptionConfigMap = {
  [BILLING_CLIENT_ID]: {
    productIds: [
      "prod_LrLIJaWkCbz2uA",
      "prod_TwIDs5ys1JPw89",
      "prod_TwIDr09gy8HuYy",
    ],
    planIds: [
      "price_1L9ccEEqsEqs2tLVKPRV17wb", // $9.99/month (legacy)
      "price_1L9ccEEqsEqs2tLVbeBgHm9p", // $99.99/year (legacy)
      "price_1RrSOGEqsEqs2tLVFnyB34qG", // $14.99/month (Premium)
      "price_1US5htEqsEqs2tLVENCzLaZB", // $143.88/year (Premium)
      "price_1SyPdaEqsEqs2tLViLPUDoVi", // $99.99/month (Growth)
      "price_1SyPdbEqsEqs2tLV7PJyWZed", // $959.88/year (Growth)
      "price_1SyPdcEqsEqs2tLVCWEgU1PZ", // $499.99/month (Organization)
      "price_1SyPdfEqsEqs2tLVmK6zCrP6", // $4,799.88/year (Organization)
    ],
    plans: [
      {
        priceId: "price_1L9ccEEqsEqs2tLVKPRV17wb",
        type: PaymentType.RECURRING,
        description: "Beancount.io Basic - Monthly - $9.99/month (Legacy)",
        interval: "month",
        tier: SubscriptionTier.PREMIUM,
        retired: true,
      },
      {
        priceId: "price_1L9ccEEqsEqs2tLVbeBgHm9p",
        type: PaymentType.RECURRING,
        description: "Beancount.io Basic - Yearly - $99.99/year (Legacy)",
        interval: "year",
        tier: SubscriptionTier.PREMIUM,
        // Grandfathered (PRFAQ005 decision 3): its subscribers keep renewing.
        retired: true,
      },
      {
        priceId: "price_1RrSOGEqsEqs2tLVFnyB34qG",
        type: PaymentType.RECURRING,
        description: "Beancount.io Premium - Monthly - $14.99/month",
        interval: "month",
        tier: SubscriptionTier.PREMIUM,
      },
      {
        priceId: "price_1US5htEqsEqs2tLVENCzLaZB",
        type: PaymentType.RECURRING,
        description:
          "Beancount.io Premium - Yearly - $11.99/month billed yearly ($143.88/year)",
        interval: "year",
        tier: SubscriptionTier.PREMIUM,
      },
      {
        priceId: "price_1SyPdaEqsEqs2tLViLPUDoVi",
        type: PaymentType.RECURRING,
        description:
          "Beancount.io Growth - Monthly - $99.99/month (Smart Automation)",
        interval: "month",
        tier: SubscriptionTier.GROWTH,
      },
      {
        priceId: "price_1SyPdbEqsEqs2tLV7PJyWZed",
        type: PaymentType.RECURRING,
        description:
          "Beancount.io Growth - Yearly - $79.99/month billed yearly (Smart Automation)",
        interval: "year",
        tier: SubscriptionTier.GROWTH,
      },
      {
        priceId: "price_1SyPdcEqsEqs2tLVCWEgU1PZ",
        type: PaymentType.RECURRING,
        description:
          "Beancount.io Organization - Monthly - $499.99/month (Multi-Entity)",
        interval: "month",
        tier: SubscriptionTier.ORGANIZATION,
      },
      {
        priceId: "price_1SyPdfEqsEqs2tLVmK6zCrP6",
        type: PaymentType.RECURRING,
        description:
          "Beancount.io Organization - Yearly - $399.99/month billed yearly (Multi-Entity)",
        interval: "year",
        tier: SubscriptionTier.ORGANIZATION,
      },
    ],
    webhookSecret: config.stripe.webhookSecret,
    stripePubKey: config.stripe.publicKey,
    stripePriKey: config.stripe.privateKey,
    // The dashboard confirmation; Stripe fills in the session id.
    successUrl:
      "https://beancount.io/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}",
    cancelUrl: "https://beancount.io/pricing",
    // The dashboard's Billing tab, where the plan is managed.
    portalReturnUrl: "https://beancount.io/settings/billing",
    portalConfigurationId: "bpc_1US5i0EqsEqs2tLVVF907WfA",
    recoveryCouponId: "checkout-recovery-20",
    recoveryEmailGroupId: 38671,
    webhook: "https://beancount.io/api-gateway/stripe/webhook",
  },
};
