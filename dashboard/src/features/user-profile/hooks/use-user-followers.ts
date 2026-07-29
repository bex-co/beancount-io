import { useQuery } from "@apollo/client/react";
import { GetUserFollowersDocument } from "@/graphql/definitions";

export function useUserFollowers(username: string, enabled = false) {
  const { data, loading, error } = useQuery(GetUserFollowersDocument, {
    variables: { username, page: 1, limit: 20 },
    skip: !username || !enabled,
  });

  return {
    followers: data?.getUserFollowers?.users || [],
    total: data?.getUserFollowers?.total || 0,
    loading,
    error,
  };
}
