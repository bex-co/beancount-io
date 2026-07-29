import { useQuery } from "@apollo/client/react";
import { GetUserFollowingDocument } from "@/graphql/definitions";

export function useUserFollowing(username: string, enabled = false) {
  const { data, loading, error } = useQuery(GetUserFollowingDocument, {
    variables: { username, page: 1, limit: 20 },
    skip: !username || !enabled,
  });

  return {
    following: data?.getUserFollowing?.users || [],
    total: data?.getUserFollowing?.total || 0,
    loading,
    error,
  };
}
