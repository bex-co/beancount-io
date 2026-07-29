import { useQuery } from "@apollo/client/react";
import { NetworkStatus } from "@apollo/client";
import { GetUserProfileDocument } from "@/graphql/definitions";

export function useUserProfile(username: string) {
  const { data, loading, error, refetch, networkStatus } = useQuery(
    GetUserProfileDocument,
    {
      variables: { username },
      skip: !username,
      notifyOnNetworkStatusChange: true,
    },
  );

  const isFollowing: boolean | undefined =
    data?.getUserProfile?.isFollowing ?? undefined;

  // Differentiate between initial load and refetch
  const isInitialLoading = networkStatus === NetworkStatus.loading;
  const isRefetching = networkStatus === NetworkStatus.refetch;

  return {
    profile: data?.getUserProfile?.profile || null,
    isFollowing,
    activities: data?.getUserProfile?.activities || [],
    repositories: data?.getUserProfile?.repositories || [],
    loading,
    isInitialLoading,
    isRefetching,
    error,
    refetch,
  };
}
