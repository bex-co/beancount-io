import { useParams, useSearch } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { useUserProfile } from "../hooks/use-user-profile";
import { FollowButton } from "../components/follow-button";
import { UserProfileHeader } from "../components/user-profile-header";
import { UserProfileTabs } from "../components/user-profile-tabs";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/common/components/ui/avatar";
import { Loader2, MapPin, Link as LinkIcon, Calendar } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { GetCurrentUserDocument } from "@/graphql/definitions";

export default function UserProfilePage() {
  const { username } = useParams({ from: "/ledger/$username" });
  const search = useSearch({ from: "/ledger/$username" });
  const initialTab = search.tab || "overview";
  const {
    profile,
    isFollowing,
    activities,
    repositories,
    isInitialLoading,
    error,
  } = useUserProfile(username);
  const { t } = useTranslations();

  // Get current logged-in user
  const { data: currentUserData } = useQuery(GetCurrentUserDocument);
  const currentUsername = currentUserData?.userProfile?.username;

  // Check if viewing own profile
  const isOwnProfile = currentUsername === username;

  // Only show full-page loader on initial load, not on refetch
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    // Check if it's a user not found error (404) or other error
    const isUserNotFound =
      (CombinedGraphQLErrors.is(error) &&
        error.errors.some(
          (gqlError) => gqlError.extensions?.code === "NOT_FOUND",
        )) ||
      error?.message?.includes("not found") ||
      !profile;

    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold">
          {isUserNotFound
            ? t("userProfile.userNotFound")
            : t("userProfile.errorLoadingProfile")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isUserNotFound
            ? t("userProfile.userNotFoundMessage", { username })
            : t(getErrorMessageKey(error))}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <UserProfileHeader />

      {/* Profile Content - Main container with max-width and responsive padding */}
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6 lg:mt-8">
        {/* Profile Header */}
        <div className="border border-border rounded-lg sm:rounded-xl overflow-hidden shadow-sm">
          <div className="bg-card">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                {/* Avatar */}
                <Avatar className="size-16 sm:size-20 lg:size-24 shrink-0">
                  <AvatarImage
                    src={profile.avatarUrl || undefined}
                    alt={profile.username}
                  />
                  <AvatarFallback className="text-3xl sm:text-4xl lg:text-5xl">
                    {profile.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 w-full min-w-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="min-w-0 w-full sm:w-auto">
                      <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                        {profile.fullName || profile.username}
                      </h1>
                      <p className="text-xs sm:text-sm lg:text-base text-muted-foreground truncate">
                        @{profile.username}
                      </p>
                    </div>
                    {!isOwnProfile && (
                      <FollowButton
                        username={profile.username}
                        isFollowing={isFollowing}
                        className="w-full sm:w-auto shrink-0"
                      />
                    )}
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed">
                      {profile.bio}
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-x-3 gap-y-2 sm:gap-x-4 text-xs sm:text-sm text-muted-foreground">
                    {profile.location && (
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="size-3 sm:size-4 shrink-0" />
                        <span className="truncate">{profile.location}</span>
                      </div>
                    )}
                    {profile.website && (
                      <div className="flex items-center gap-1 min-w-0">
                        <LinkIcon className="size-3 sm:size-4 shrink-0" />
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline truncate"
                        >
                          {profile.website}
                        </a>
                      </div>
                    )}
                    {profile.created && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Calendar className="size-3 sm:size-4 shrink-0" />
                        <span>
                          {t("userProfile.joined")}{" "}
                          {new Date(profile.created).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 sm:mt-6 lg:mt-8 pb-6 sm:pb-8">
          <UserProfileTabs
            username={username}
            activities={activities}
            repositories={repositories}
            followersCount={profile.followersCount}
            followingCount={profile.followingCount}
            starredReposCount={profile.starredReposCount}
            initialTab={initialTab}
          />
        </div>
      </main>
    </div>
  );
}
