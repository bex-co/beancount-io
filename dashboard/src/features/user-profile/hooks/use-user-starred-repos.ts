import { useQuery } from "@apollo/client/react";
import { GetUserStarredReposDocument } from "@/graphql/definitions";

export function useUserStarredRepos(username: string, enabled = false) {
  const { data, loading, error } = useQuery(GetUserStarredReposDocument, {
    variables: { username, page: 1, limit: 20 },
    skip: !username || !enabled,
  });

  return {
    starredRepos: data?.getUserStarredRepos?.repositories || [],
    total: data?.getUserStarredRepos?.total || 0,
    loading,
    error,
  };
}
