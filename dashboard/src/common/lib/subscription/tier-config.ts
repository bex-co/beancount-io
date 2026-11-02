import type { UserTier } from "@/common/hooks/use-user-limits";
import type { SubscriptionTier } from "@/features/user-settings/pages/general/stripe-config";

export const TIER_RANK: Record<UserTier, number> = {
  FREE: 0,
  PREMIUM: 1,
  GROWTH: 2,
  ORGANIZATION: 3,
  ENTERPRISE: 4,
};

export interface TierInfo {
  key: SubscriptionTier;
  userTier: UserTier;
  rank: number;
  labelKey: string;
  popular?: boolean;
}

export const TIERS: TierInfo[] = [
  {
    key: "premium",
    userTier: "PREMIUM",
    rank: 1,
    labelKey: "aiAgent.premiumTier",
  },
  {
    key: "growth",
    userTier: "GROWTH",
    rank: 2,
    labelKey: "aiAgent.growthTier",
    popular: true,
  },
  {
    key: "organization",
    userTier: "ORGANIZATION",
    rank: 3,
    labelKey: "aiAgent.organizationTier",
  },
];

/** Where the Enterprise card sends people: the plan is arranged with us. */
export const ENTERPRISE_CONTACT_URL = "https://beancount.io/tg";

export function getTierInfo(tier: UserTier): TierInfo | null {
  return TIERS.find((t) => t.userTier === tier) ?? null;
}

/** The message key naming a tier's plan, Free and Enterprise included. */
export function planLabelKey(tier: UserTier): string {
  if (tier === "ENTERPRISE") return "userSettings.enterprisePlan";
  return getTierInfo(tier)?.labelKey ?? "userSettings.freePlan";
}

export function getUpgradeTiers(tier: UserTier): TierInfo[] {
  const currentRank = TIER_RANK[tier] ?? 0;
  return TIERS.filter((t) => t.rank > currentRank);
}

/** The next tier up, for a prompt about a limit the current tier hits. */
export function getNextTier(tier: UserTier): TierInfo | null {
  return getUpgradeTiers(tier)[0] ?? null;
}

/** The paid tier a subscription key names; every key has one. */
export function tierInfoByKey(key: SubscriptionTier): TierInfo {
  const info = TIERS.find((tier) => tier.key === key);
  if (!info) throw new Error(`Unknown subscription tier ${key}`);
  return info;
}
