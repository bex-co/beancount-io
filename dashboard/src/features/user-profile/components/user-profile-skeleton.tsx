import type { ReactNode } from "react";
import { Skeleton } from "@/common/components/ui/skeleton";
import { useTranslations } from "@/common/hooks/use-translations";

// Preserve the real text's wrapping so the surrounding layout stays in place.
function TextSkeleton({ children }: { children: ReactNode }) {
  return (
    <span className="box-decoration-clone rounded-sm bg-accent text-transparent motion-safe:animate-pulse">
      {children}
    </span>
  );
}

export function UserProfileSkeleton({
  username,
  isOwnProfile,
  tab = "overview",
}: {
  username: string;
  isOwnProfile: boolean;
  tab?: string;
}) {
  const { t } = useTranslations();
  const isOpenLedger = username === "open_ledger";

  return (
    <div role="status" aria-label={t("common.loading")}>
      <div aria-hidden="true">
        <div className="border-b bg-muted/35">
          <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
            {isOpenLedger && (
              <div className="mb-5 flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
                <Skeleton className="size-3.5" />
                <TextSkeleton>{t("userProfile.collectionLabel")}</TextSkeleton>
              </div>
            )}
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="min-w-0 max-w-2xl">
                <div className="flex items-center gap-5">
                  <Skeleton className="size-16 shrink-0 rounded-2xl sm:size-22" />
                  <div className="min-w-0">
                    <div className="break-words font-serif text-4xl tracking-tight sm:text-5xl">
                      <TextSkeleton>
                        {isOpenLedger
                          ? t("userProfile.openLedgerName")
                          : username}
                      </TextSkeleton>
                    </div>
                    <div className="mt-2 break-all text-sm">
                      <TextSkeleton>@{username}</TextSkeleton>
                    </div>
                  </div>
                </div>
                {isOpenLedger && (
                  <p className="mt-5 max-w-xl text-sm leading-6 sm:text-base sm:leading-7">
                    <TextSkeleton>
                      {t("userProfile.collectionDescription")}
                    </TextSkeleton>
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-xs">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-3 md:items-end">
                <div className="flex gap-3">
                  {!isOwnProfile && (
                    <Skeleton className="h-11 w-25 flex-1 md:flex-none" />
                  )}
                  <Skeleton className="h-11 w-28 flex-1 md:flex-none" />
                </div>
                {isOpenLedger && (
                  <div className="flex min-h-8 items-center gap-2 text-sm font-medium lg:hidden">
                    <Skeleton className="size-4" />
                    <TextSkeleton>{t("userProfile.openExample")}</TextSkeleton>
                  </div>
                )}
                {!isOwnProfile && (
                  <p className="hidden text-xs md:block">
                    <TextSkeleton>
                      {t("userProfile.followDescription")}
                    </TextSkeleton>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl px-5 pt-3 pb-14 sm:px-8 lg:px-12">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex min-w-max border-b sm:min-w-0">
              {[
                ["overview", "userProfile.tabs.overview"],
                ["starred", "userProfile.tabs.starred"],
                ["following", "userProfile.tabs.following"],
                ["followers", "userProfile.tabs.followers"],
              ].map(([value, label]) => (
                <div
                  key={value}
                  className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-4 text-sm font-medium sm:px-4 ${value === tab ? "border-primary" : "border-transparent"}`}
                >
                  {value !== "following" && <Skeleton className="size-4" />}
                  <TextSkeleton>
                    {t(label)}
                    {value !== "overview" && " (0)"}
                  </TextSkeleton>
                </div>
              ))}
            </div>
          </div>
          {tab === "overview" ? (
            <div className="grid grid-cols-1 items-start gap-8 pt-6 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-10">
              <div className="min-w-0">
                <div className="mb-6">
                  <div className="flex items-center gap-3 text-xl font-semibold tracking-tight">
                    <TextSkeleton>{t("userProfile.repositories")}</TextSkeleton>
                    <Skeleton className="h-5 w-8" />
                  </div>
                  <p className="mt-1.5 text-sm">
                    <TextSkeleton>
                      {t("userProfile.browseDescription")}
                    </TextSkeleton>
                  </p>
                </div>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                  <Skeleton className="h-11 sm:flex-1" />
                  <Skeleton className="h-11 sm:w-41" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Array.from({ length: 12 }, (_, index) => (
                    <LedgerCardSkeleton key={index} />
                  ))}
                </div>
                <div className="mt-6 flex flex-col items-center gap-4">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-11 w-48" />
                </div>
              </div>
              <div className="min-w-0 space-y-6">
                {isOpenLedger && (
                  <div className="hidden rounded-xl border border-primary/15 bg-primary/5 p-6 lg:block">
                    <Skeleton className="mb-5 size-6" />
                    <p className="mb-2 text-xs font-medium">
                      <TextSkeleton>
                        {t("userProfile.newToBeancount")}
                      </TextSkeleton>
                    </p>
                    <div className="text-lg font-semibold tracking-tight">
                      <TextSkeleton>
                        {t("userProfile.startExample")}
                      </TextSkeleton>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">
                      <TextSkeleton>
                        {t("userProfile.exampleDescription")}
                      </TextSkeleton>
                    </p>
                    <div className="mt-5 flex items-center gap-2 text-sm font-medium">
                      <TextSkeleton>
                        {t("userProfile.openExample")}
                      </TextSkeleton>
                      <Skeleton className="size-4" />
                    </div>
                  </div>
                )}
                <div className="rounded-xl border bg-card p-5 sm:p-6">
                  <div className="mb-6 flex items-center gap-2 text-sm font-semibold">
                    <Skeleton className="size-4" />
                    <TextSkeleton>
                      {t("userProfile.recentActivity")}
                    </TextSkeleton>
                  </div>
                  {Array.from({ length: 5 }, (_, index) => (
                    <div
                      key={index}
                      className="flex gap-3 pb-6 [&:nth-last-child(2)]:pb-0"
                    >
                      <Skeleton className="size-7 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 pt-0.5">
                        <Skeleton className="h-5 w-4/5" />
                        <Skeleton className="mt-1 h-4 w-20" />
                      </div>
                    </div>
                  ))}
                  <Skeleton className="mt-5 h-10 w-full" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 sm:gap-4 sm:pt-6 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) =>
                tab === "starred" ? (
                  <LedgerCardSkeleton key={index} />
                ) : (
                  <div
                    key={index}
                    className="flex items-center gap-4 rounded-xl border bg-card p-6"
                  >
                    <Skeleton className="size-12 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LedgerCardSkeleton() {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Skeleton className="size-11 rounded-lg" />
        <Skeleton className="h-6.5 w-18 rounded-full" />
      </div>
      <div className="flex h-7 items-center">
        <Skeleton className="h-5 w-1/3" />
      </div>
      <div className="mt-2 mb-5 h-10 space-y-2 py-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="mt-auto flex items-center gap-2 border-t pt-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="ms-auto size-4" />
      </div>
    </div>
  );
}
