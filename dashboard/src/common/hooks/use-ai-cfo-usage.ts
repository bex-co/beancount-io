import { useQuery } from "@apollo/client/react";
import {
  GetAiCfoUsageDocument,
  type GetAiCfoUsageQuery,
} from "@/graphql/definitions";

export function useAiCfoUsage() {
  const { data, loading, error, refetch } = useQuery<GetAiCfoUsageQuery>(
    GetAiCfoUsageDocument,
    { fetchPolicy: "cache-and-network" },
  );

  const usage = data?.aiCfoUsage ?? null;
  const aiCfoTokensUsed = usage?.aiCfoTokensUsed ?? 0;
  const aiCfoTokensMax = usage?.aiCfoTokensMax ?? 0;

  // AI CFO limit check (-1 means unlimited, 0 means disabled/not configured)
  const isAtAiCfoLimit =
    aiCfoTokensMax > 0 && aiCfoTokensUsed >= aiCfoTokensMax;

  return {
    usage,
    aiCfoTokensUsed,
    aiCfoTokensMax,
    isAtAiCfoLimit,
    isLoading: loading,
    error,
    refetch,
  };
}
