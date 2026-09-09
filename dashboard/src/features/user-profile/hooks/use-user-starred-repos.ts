import {
  GetUserStarredReposDocument,
  type GetUserStarredReposQuery,
} from "@/graphql/definitions";
import { usePaginatedSocialList } from "./use-paginated-social-list";

type StarredRepo =
  GetUserStarredReposQuery["getUserStarredRepos"]["repositories"][number];

export function useUserStarredRepos(username: string, enabled = false) {
  const result = usePaginatedSocialList<
    StarredRepo,
    GetUserStarredReposQuery,
    {
      username: string;
      page: number;
      limit: number;
    }
  >({
    document: GetUserStarredReposDocument,
    username,
    enabled,
    selectPage: (data) =>
      data?.getUserStarredRepos
        ? { items: data.getUserStarredRepos.repositories }
        : null,
    identityKey: (repo) => repo.fullName,
  });

  return {
    starredRepos: result.items,
    total: result.total,
    loading: result.loading,
    loadingMore: result.loadingMore,
    hasMore: result.hasMore,
    error: result.error,
    loadMoreError: result.loadMoreError,
    loadMore: result.loadMore,
    retryLoadMore: result.retryLoadMore,
  };
}
