import { useState, useEffect } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/common/components/ui/tabs";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { useUserFollowers } from "../hooks/use-user-followers";
import { useUserFollowing } from "../hooks/use-user-following";
import { useUserStarredRepos } from "../hooks/use-user-starred-repos";
import { UserListItem } from "./user-list-item";
import { RepositoryListItem } from "./repository-list-item";
import { BookOpen, ChevronDown, Loader2, Star, Users } from "lucide-react";
import { LedgerCollection } from "./ledger-collection";
import { ProfileActivity } from "./profile-activity";
import type {
  UserActivityFeedItem,
  UserRepository,
  GetUserFollowersQuery,
  GetUserFollowingQuery,
  GetUserStarredReposQuery,
} from "@/graphql/definitions";
import { useNavigate } from "@tanstack/react-router";

interface UserProfileTabsProps {
  username: string;
  activities: UserActivityFeedItem[];
  repositories: UserRepository[];
  followersCount: number;
  followingCount: number;
  starredReposCount: number;
  initialTab?: string;
}

function SocialContinuation({
  hasMore,
  loadingMore,
  loadMoreError,
  onLoadMore,
  onRetry,
  label,
}: {
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: Error | null;
  onLoadMore: () => void;
  onRetry: () => void;
  label: string;
}) {
  const { t } = useTranslations();
  if (!hasMore && !loadMoreError) return null;

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      {loadMoreError && (
        <div className="flex flex-col items-center gap-2">
          <p role="alert" className="text-sm text-destructive">
            {t("userProfile.loadMoreError")}
          </p>
          <Button variant="outline" onClick={onRetry} className="h-11 px-6">
            {t("common.tryAgain")}
          </Button>
        </div>
      )}
      {hasMore && !loadMoreError && (
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="h-11 px-6"
        >
          {loadingMore ? (
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ChevronDown className="mr-2 size-4" aria-hidden="true" />
          )}
          {label}
        </Button>
      )}
    </div>
  );
}

export function UserProfileTabs({
  username,
  activities,
  repositories,
  followersCount,
  followingCount,
  starredReposCount,
  initialTab = "overview",
}: UserProfileTabsProps) {
  const { t } = useTranslations();
  const navigate = useNavigate({ from: "/ledger/$username" });
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    void navigate({
      to: ".",
      search: {
        tab: newTab as "overview" | "starred" | "following" | "followers",
      },
      replace: true,
    });
  };

  // Sync state when URL changes (browser back/forward)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Lazy load tab data only when tab becomes active
  const {
    followers,
    loading: followersLoading,
    loadingMore: followersLoadingMore,
    hasMore: followersHasMore,
    loadMoreError: followersLoadMoreError,
    loadMore: loadMoreFollowers,
    retryLoadMore: retryFollowers,
  } = useUserFollowers(username, activeTab === "followers");
  const {
    following,
    loading: followingLoading,
    loadingMore: followingLoadingMore,
    hasMore: followingHasMore,
    loadMoreError: followingLoadMoreError,
    loadMore: loadMoreFollowing,
    retryLoadMore: retryFollowing,
  } = useUserFollowing(username, activeTab === "following");
  const {
    starredRepos,
    loading: starredLoading,
    loadingMore: starredLoadingMore,
    hasMore: starredHasMore,
    loadMoreError: starredLoadMoreError,
    loadMore: loadMoreStarred,
    retryLoadMore: retryStarred,
  } = useUserStarredRepos(username, activeTab === "starred");

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full gap-0"
    >
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <TabsList
          variant="underline"
          className="w-full justify-start min-w-max sm:min-w-0"
        >
          <TabsTrigger
            value="overview"
            className="gap-2 whitespace-nowrap px-3 py-4 text-sm sm:px-4"
          >
            <BookOpen aria-hidden="true" className="size-4" />
            {t("userProfile.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger
            value="starred"
            className="gap-2 whitespace-nowrap px-3 py-4 text-sm sm:px-4"
          >
            <Star aria-hidden="true" className="size-4" />
            {t("userProfile.tabs.starred")} ({starredReposCount})
          </TabsTrigger>
          <TabsTrigger
            value="following"
            className="gap-2 whitespace-nowrap px-3 py-4 text-sm sm:px-4"
          >
            {t("userProfile.tabs.following")} ({followingCount})
          </TabsTrigger>

          <TabsTrigger
            value="followers"
            className="gap-2 whitespace-nowrap px-3 py-4 text-sm sm:px-4"
          >
            <Users aria-hidden="true" className="size-4" />
            {t("userProfile.tabs.followers")} ({followersCount})
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="pt-6 sm:pt-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-10">
          <LedgerCollection
            key={`collection-${username}`}
            username={username}
            repositories={repositories}
          />
          <ProfileActivity
            key={`activity-${username}`}
            username={username}
            activities={activities}
            example={
              username === "open_ledger"
                ? repositories.find(
                    (repo) => repo.name === "example" && !repo.isPrivate,
                  )
                : undefined
            }
          />
        </div>
      </TabsContent>

      {/* Followers Tab */}
      <TabsContent value="followers" className="pt-4 sm:pt-6">
        <div>
          {followersLoading && (
            <div className="flex justify-center py-6 sm:py-8">
              <Loader2 className="size-6 sm:size-8 animate-spin" />
            </div>
          )}
          {!followersLoading && followers.length === 0 && (
            <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
              {t("userProfile.noFollowers")}
            </p>
          )}
          {!followersLoading && followers.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {followers.map(
                  (
                    user: GetUserFollowersQuery["getUserFollowers"]["users"][number],
                  ) => (
                    <UserListItem key={user.username} {...user} />
                  ),
                )}
              </div>
              <SocialContinuation
                hasMore={followersHasMore}
                loadingMore={followersLoadingMore}
                loadMoreError={followersLoadMoreError}
                onLoadMore={() => void loadMoreFollowers()}
                onRetry={() => void retryFollowers()}
                label={t("userProfile.showMore")}
              />
            </>
          )}
        </div>
      </TabsContent>

      {/* Following Tab */}
      <TabsContent value="following" className="pt-4 sm:pt-6">
        <div>
          {followingLoading && (
            <div className="flex justify-center py-6 sm:py-8">
              <Loader2 className="size-6 sm:size-8 animate-spin" />
            </div>
          )}
          {!followingLoading && following.length === 0 && (
            <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
              {t("userProfile.noFollowing")}
            </p>
          )}
          {!followingLoading && following.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {following.map(
                  (
                    user: GetUserFollowingQuery["getUserFollowing"]["users"][number],
                  ) => (
                    <UserListItem key={user.username} {...user} />
                  ),
                )}
              </div>
              <SocialContinuation
                hasMore={followingHasMore}
                loadingMore={followingLoadingMore}
                loadMoreError={followingLoadMoreError}
                onLoadMore={() => void loadMoreFollowing()}
                onRetry={() => void retryFollowing()}
                label={t("userProfile.showMore")}
              />
            </>
          )}
        </div>
      </TabsContent>

      {/* Starred Repos Tab */}
      <TabsContent value="starred" className="pt-4 sm:pt-6">
        <div>
          {starredLoading && (
            <div className="flex justify-center py-6 sm:py-8">
              <Loader2 className="size-6 sm:size-8 animate-spin" />
            </div>
          )}
          {!starredLoading && starredRepos.length === 0 && (
            <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
              {t("userProfile.noStarredRepos")}
            </p>
          )}
          {!starredLoading && starredRepos.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {starredRepos.map(
                  (
                    repo: GetUserStarredReposQuery["getUserStarredRepos"]["repositories"][number],
                  ) => (
                    <RepositoryListItem
                      key={repo.fullName}
                      {...repo}
                      ownerUsername={username}
                    />
                  ),
                )}
              </div>
              <SocialContinuation
                hasMore={starredHasMore}
                loadingMore={starredLoadingMore}
                loadMoreError={starredLoadMoreError}
                onLoadMore={() => void loadMoreStarred()}
                onRetry={() => void retryStarred()}
                label={t("userProfile.showMore")}
              />
            </>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
