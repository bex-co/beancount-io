import {
  GetUserFollowingDocument,
  type GetUserFollowingQuery,
} from "@/graphql/definitions";
import { usePaginatedSocialList } from "./use-paginated-social-list";

type FollowingUser = GetUserFollowingQuery["getUserFollowing"]["users"][number];

export function useUserFollowing(username: string, enabled = false) {
  const result = usePaginatedSocialList<
    FollowingUser,
    GetUserFollowingQuery,
    {
      username: string;
      page: number;
      limit: number;
    }
  >({
    document: GetUserFollowingDocument,
    username,
    enabled,
    selectPage: (data) =>
      data?.getUserFollowing ? { items: data.getUserFollowing.users } : null,
    identityKey: (user) => user.username,
  });

  return {
    following: result.items,
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
