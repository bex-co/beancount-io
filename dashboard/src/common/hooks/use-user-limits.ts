import { useQuery } from "@apollo/client/react";
import {
  GetCurrentUserDocument,
  type GetCurrentUserQuery,
} from "@/graphql/definitions";

export type UserTier =
  | "FREE"
  | "PREMIUM"
  | "GROWTH"
  | "ORGANIZATION"
  | "ENTERPRISE";

export interface UserLimits {
  ledgersUsed: number;
  ledgersMax: number;
  collaboratorsPerLedgerMax: number;
  maxDirectives: number;
}

export function useUserLimits() {
  const { data, loading, error, refetch } = useQuery<GetCurrentUserQuery>(
    GetCurrentUserDocument,
    { fetchPolicy: "cache-and-network" },
  );

  const userProfile = data?.userProfile;
  const tier = (userProfile?.tier as UserTier) || "FREE";
  const limits: UserLimits | null = userProfile?.limits || null;

  // Helper booleans. -1 is an unlimited allowance, which no count reaches
  // (w4/313); a finite cap, zero included, is reached at its value.
  const isAtLedgerLimit = limits
    ? limits.ledgersMax !== -1 && limits.ledgersUsed >= limits.ledgersMax
    : false;
  const isPremium = tier === "PREMIUM";
  const isFree = tier === "FREE";
  const isGrowth = tier === "GROWTH";
  const isOrganization = tier === "ORGANIZATION";
  const isEnterprise = tier === "ENTERPRISE";
  // Helper: Check if user has any paid tier
  const isPaidTier = tier !== "FREE";

  return {
    tier,
    limits,
    isLoading: loading,
    error,
    refetch,
    // Helper flags
    isAtLedgerLimit,
    isPremium,
    isFree,
    isGrowth,
    isOrganization,
    isEnterprise,
    isPaidTier,
  };
}
