import { useState, useEffect } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/common/components/ui/tabs";
import { useTranslations } from "@/common/hooks/use-translations";
import { useUserFollowers } from "../hooks/use-user-followers";
import { useUserFollowing } from "../hooks/use-user-following";
import { useUserStarredRepos } from "../hooks/use-user-starred-repos";
import { UserListItem } from "./user-list-item";
import { RepositoryListItem } from "./repository-list-item";
import { Loader2 } from "lucide-react";
import type {
  UserActivityFeedItem,
  UserRepository,
  GetUserFollowersQuery,
  GetUserFollowingQuery,
  GetUserStarredReposQuery,
} from "@/graphql/definitions";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface UserProfileTabsProps {
  username: string;
  activities: UserActivityFeedItem[];
  repositories: UserRepository[];
  followersCount: number;
  followingCount: number;
  starredReposCount: number;
  initialTab?: string;
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
  const { followers, loading: followersLoading } = useUserFollowers(
    username,
    activeTab === "followers",
  );
  const { following, loading: followingLoading } = useUserFollowing(
    username,
    activeTab === "following",
  );
  const { starredRepos, loading: starredLoading } = useUserStarredRepos(
    username,
    activeTab === "starred",
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <TabsList
          variant="underline"
          className="w-full justify-start min-w-max sm:min-w-0"
        >
          <TabsTrigger value="overview" className="whitespace-nowrap">
            {t("userProfile.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="starred" className="whitespace-nowrap">
            {t("userProfile.tabs.starred")} ({starredReposCount})
          </TabsTrigger>
          <TabsTrigger value="following" className="whitespace-nowrap">
            {t("userProfile.tabs.following")} ({followingCount})
          </TabsTrigger>

          <TabsTrigger value="followers" className="whitespace-nowrap">
            {t("userProfile.tabs.followers")} ({followersCount})
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Overview Tab */}
      <TabsContent value="overview" className="pt-4 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left: Activity Feed */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold">
              {t("userProfile.recentActivity")}
            </h2>
            {activities.length === 0 ? (
              <p className="text-muted-foreground">
                {t("userProfile.noActivity")}
              </p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) =>
                  activity.repoName ? (
                    <Link
                      key={activity.id}
                      to="/ledger/$ledgerOwner/$ledgerName"
                      params={{
                        ledgerOwner: username,
                        ledgerName: activity.repoName,
                      }}
                      className="block"
                    >
                      <Card className="cursor-pointer hover:border-foreground/20 transition-colors">
                        <CardHeader className="">
                          <CardTitle className="text-sm font-medium">
                            {activity.content}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary">
                              {activity.repoName}
                            </Badge>
                            <span>
                              {formatDistanceToNow(
                                new Date(activity.createdAt),
                                {
                                  addSuffix: true,
                                },
                              )}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ) : (
                    <Card key={activity.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {activity.content}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(activity.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Right: Repositories */}
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold">
              {t("userProfile.repositories")}
            </h2>
            {repositories.length === 0 ? (
              <p className="text-muted-foreground">
                {t("userProfile.noRepositories")}
              </p>
            ) : (
              <div className="space-y-3">
                {repositories.slice(0, 10).map((repo) => (
                  <Link
                    key={repo.fullName}
                    to="/ledger/$ledgerOwner/$ledgerName"
                    params={{ ledgerOwner: username, ledgerName: repo.name }}
                    className="block"
                  >
                    <Card className="cursor-pointer hover:border-foreground/20 transition-colors">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          {repo.name}
                        </CardTitle>
                      </CardHeader>
                      {repo.description && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground">
                            {repo.description}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge
                              variant={
                                repo.isPrivate ? "destructive" : "secondary"
                              }
                            >
                              {repo.isPrivate
                                ? t("userProfile.private")
                                : t("userProfile.public")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {t("userProfile.updated")}{" "}
                              {formatDistanceToNow(new Date(repo.updatedAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {followers.map(
                (
                  user: GetUserFollowersQuery["getUserFollowers"]["users"][number],
                ) => (
                  <UserListItem key={user.username} {...user} />
                ),
              )}
            </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {following.map(
                (
                  user: GetUserFollowingQuery["getUserFollowing"]["users"][number],
                ) => (
                  <UserListItem key={user.username} {...user} />
                ),
              )}
            </div>
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
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
