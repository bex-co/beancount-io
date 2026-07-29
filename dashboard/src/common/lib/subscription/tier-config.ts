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
  price: string;
  labelKey: string;
  popular?: boolean;
}

export const TIERS: TierInfo[] = [
  {
    key: "premium",
    userTier: "PREMIUM",
    rank: 1,
    price: "$14.99",
    labelKey: "aiAgent.premiumTier",
  },
  {
    key: "growth",
    userTier: "GROWTH",
    rank: 2,
    price: "$99.99",
    labelKey: "aiAgent.growthTier",
    popular: true,
  },
  {
    key: "organization",
    userTier: "ORGANIZATION",
    rank: 3,
    price: "$499.99",
    labelKey: "aiAgent.organizationTier",
  },
];

export function getTierInfo(tier: UserTier): TierInfo | null {
  return TIERS.find((t) => t.userTier === tier) ?? null;
}

export function getUpgradeTiers(tier: UserTier): TierInfo[] {
  const currentRank = TIER_RANK[tier] ?? 0;
  return TIERS.filter((t) => t.rank > currentRank);
}
