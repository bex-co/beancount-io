import {
  GetUserFollowersDocument,
  type GetUserFollowersQuery,
} from "@/graphql/definitions";
import { usePaginatedSocialList } from "./use-paginated-social-list";

type Follower = GetUserFollowersQuery["getUserFollowers"]["users"][number];

export function useUserFollowers(username: string, enabled = false) {
  const result = usePaginatedSocialList<
    Follower,
    GetUserFollowersQuery,
    {
      username: string;
      page: number;
      limit: number;
    }
  >({
    document: GetUserFollowersDocument,
    username,
    enabled,
    selectPage: (data) =>
      data?.getUserFollowers ? { items: data.getUserFollowers.users } : null,
    identityKey: (user) => user.username,
  });

  return {
    followers: result.items,
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
