import { Link, useParams, useSearch } from "@tanstack/react-router";
import { useUserProfile } from "../hooks/use-user-profile";
import { FollowButton } from "../components/follow-button";
import { UserProfileHeader } from "../components/user-profile-header";
import { UserProfileTabs } from "../components/user-profile-tabs";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/common/components/ui/avatar";
import { Button } from "@/common/components/ui/button";
import { UserProfileSkeleton } from "../components/user-profile-skeleton";
import {
  BookOpen,
  MapPin,
  Link as LinkIcon,
  Calendar,
  Globe2,
  Users,
  ArrowLeft,
} from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useRootContext } from "@/common/hooks/use-root-context";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { toast } from "sonner";

export default function UserProfilePage() {
  const { username } = useParams({ from: "/ledger/$username" });
  const search = useSearch({ from: "/ledger/$username" });
  const {
    profile,
    isFollowing,
    activities,
    repositories,
    isInitialLoading,
    error,
    refetch,
  } = useUserProfile(username);
  const { t, i18n } = useTranslations();
  const { userProfile: currentUser } = useRootContext();
  const isOwnProfile = currentUser?.username === username;
  const isOpenLedger = username === "open_ledger";
  const example = isOpenLedger
    ? repositories.find((repo) => repo.name === "example" && !repo.isPrivate)
    : undefined;
  const joined = profile?.created ? new Date(profile.created) : null;

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/ledger/${encodeURIComponent(username)}`,
      );
      toast.success(t("userProfile.linkCopied"));
    } catch {
      toast.error(t("userProfile.copyLinkError"));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UserProfileHeader />
      <main className="flex-1">
        {isInitialLoading && !profile ? (
          <UserProfileSkeleton
            username={username}
            isOwnProfile={isOwnProfile}
            tab={search.tab || "overview"}
          />
        ) : error || !profile ? (
          <div className="mx-auto max-w-xl px-5 py-24 text-center">
            <BookOpen
              aria-hidden="true"
              className="mx-auto mb-6 size-10 text-muted-foreground"
            />
            <h1 className="text-2xl font-semibold">
              {t(
                !error ||
                  (CombinedGraphQLErrors.is(error) &&
                    error.errors.some(
                      (item) => item.extensions?.code === "NOT_FOUND",
                    )) ||
                  error.message.includes("not found")
                  ? "userProfile.userNotFound"
                  : "userProfile.errorLoadingProfile",
              )}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {error
                ? t(getErrorMessageKey(error))
                : t("userProfile.userNotFoundMessage", { username })}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" asChild>
                <Link to="/ledger">
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  {t("page.dashboard.goToDashboard")}
                </Link>
              </Button>
              {error && (
                <Button onClick={() => void refetch().catch(() => {})}>
                  {t("userProfile.tryAgain")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <section
              aria-labelledby="profile-name"
              className="border-b bg-muted/35"
            >
              <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
                {isOpenLedger && (
                  <p className="mb-5 flex items-center gap-2 text-xs font-medium tracking-widest text-primary uppercase">
                    <Globe2 aria-hidden="true" className="size-3.5" />
                    {t("userProfile.collectionLabel")}
                  </p>
                )}
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div className="min-w-0 max-w-2xl">
                    <div className="flex items-center gap-5">
                      <Avatar className="size-16 shrink-0 rounded-2xl border border-primary/15 sm:size-22">
                        <AvatarImage
                          src={profile.avatarUrl || undefined}
                          alt={profile.username}
                          className="rounded-2xl object-cover"
                        />
                        <AvatarFallback className="rounded-2xl bg-primary/8 text-3xl text-primary">
                          {isOpenLedger ? (
                            <BookOpen
                              aria-hidden="true"
                              className="size-9 stroke-[1.5]"
                            />
                          ) : (
                            profile.username[0]?.toUpperCase()
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h1
                          id="profile-name"
                          className="break-words font-serif text-4xl tracking-tight sm:text-5xl"
                        >
                          {profile.fullName ||
                            (isOpenLedger
                              ? t("userProfile.openLedgerName")
                              : profile.username)}
                        </h1>
                        <p className="mt-2 break-all text-sm text-muted-foreground">
                          @{profile.username}
                        </p>
                      </div>
                    </div>
                    {(profile.bio || isOpenLedger) && (
                      <p className="mt-5 max-w-xl text-sm leading-6 sm:text-base sm:leading-7 text-muted-foreground">
                        {profile.bio || t("userProfile.collectionDescription")}
                      </p>
                    )}
                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground">
                      {profile.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin
                            aria-hidden="true"
                            className="size-3.5 shrink-0"
                          />
                          {profile.location}
                        </span>
                      )}
                      {profile.website && (
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-w-0 items-center gap-1.5 rounded-sm hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <LinkIcon
                            aria-hidden="true"
                            className="size-3.5 shrink-0"
                          />
                          <span className="truncate">{profile.website}</span>
                        </a>
                      )}
                      {joined && !Number.isNaN(joined.getTime()) && (
                        <span className="flex items-center gap-1.5">
                          <Calendar aria-hidden="true" className="size-3.5" />
                          {t("userProfile.joined")}{" "}
                          <time dateTime={joined.toISOString()}>
                            {joined.toLocaleDateString(i18n.language, {
                              month: "long",
                              year: "numeric",
                            })}
                          </time>
                        </span>
                      )}
                      <Link
                        to="/ledger/$username"
                        params={{ username }}
                        search={{ tab: "followers" }}
                        className="flex items-center gap-1.5 rounded-sm hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <Users aria-hidden="true" className="size-3.5" />
                        <span className="font-medium text-foreground">
                          {profile.followersCount}
                        </span>
                        {t("userProfile.tabs.followers")}
                      </Link>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-3 md:items-end">
                    <div className="flex gap-3">
                      {!isOwnProfile && (
                        <FollowButton
                          username={profile.username}
                          isFollowing={isFollowing}
                          className="h-11 flex-1 px-5 md:flex-none"
                        />
                      )}
                      <Button
                        variant="outline"
                        onClick={() => void copyProfileLink()}
                        className="h-11 flex-1 px-4 md:flex-none"
                      >
                        <LinkIcon aria-hidden="true" className="size-4" />
                        {t("userProfile.copyLink")}
                      </Button>
                    </div>
                    {example && (
                      <Link
                        to="/ledger/$ledgerOwner/$ledgerName"
                        params={{
                          ledgerOwner: username,
                          ledgerName: example.name,
                        }}
                        className="flex min-h-8 items-center gap-2 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
                      >
                        <BookOpen aria-hidden="true" className="size-4" />
                        {t("userProfile.openExample")}
                      </Link>
                    )}
                    {!isOwnProfile && (
                      <p className="hidden text-xs text-muted-foreground md:block">
                        {t("userProfile.followDescription")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
            <div className="mx-auto w-full max-w-7xl px-5 pt-3 pb-14 sm:px-8 lg:px-12">
              <UserProfileTabs
                username={username}
                activities={activities}
                repositories={repositories}
                followersCount={profile.followersCount}
                followingCount={profile.followingCount}
                starredReposCount={profile.starredReposCount}
                initialTab={search.tab || "overview"}
              />
            </div>
          </>
        )}
      </main>
      <footer className="border-t px-5 py-6 text-center text-xs text-muted-foreground">
        {t("userProfile.footer")}
      </footer>
    </div>
  );
}
