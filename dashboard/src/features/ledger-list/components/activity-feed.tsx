import { useEffect, useRef, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { ContinuationControl } from "@/common/components/continuation-control";
import { Skeleton } from "@/common/components/ui/skeleton";
import { FeedCard } from "./feed-card";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import { useTranslations } from "@/common/hooks/use-translations";
import { GetFeedDocument, GetFeedQuery } from "@/graphql/definitions";

const ACTIVITY_SOURCE = "LEDGER_RSS";

/**
 * The user's own ledger activity: commits and pull requests on every ledger
 * they can see, newest first, with "Show More" paging. Releases and blog
 * posts have their own sections, so a day of posts cannot bury a commit.
 */
export function ActivityFeed() {
  const { i18n } = useTranslations();
  return <ActivityFeedWorkspace key={i18n.language} />;
}

function ActivityFeedWorkspace() {
  const { t, i18n } = useTranslations();
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState(false);
  const limit = 10;

  const heading = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {t("page.dashboard.activity")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("page.dashboard.activityDescription")}
        </p>
      </div>
    </div>
  );

  const { data, loading, error, refetch, fetchMore } = useQuery(
    GetFeedDocument,
    {
      variables: {
        offset: 0,
        limit,
        source: ACTIVITY_SOURCE,
        locale: i18n.language,
      },
      // Show the cached commits immediately, then revalidate: returning to the
      // dashboard after a commit should not show a list that predates it.
      fetchPolicy: "cache-and-network",
    },
  );
  const { failure, retrying, retry } = useQueryRetry(error, refetch);

  const handleShowMore = async () => {
    if (isLoadingMore) return;
    const newOffset = offset + limit;
    setIsLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          offset: newOffset,
          limit,
          source: ACTIVITY_SOURCE,
          locale: i18n.language,
        },
        updateQuery: (
          prev: GetFeedQuery,
          { fetchMoreResult }: { fetchMoreResult?: GetFeedQuery },
        ) => {
          if (!active.current || !fetchMoreResult) return prev;
          // Newer activity shifts the server's offset pages, so a page can
          // repeat cards already shown, or an id within itself. Append only
          // unseen ids; the offset still advances by the page requested
          // (w4/302).
          const seen = new Set(prev.getFeed.items.map((item) => item.id));
          const unseen = fetchMoreResult.getFeed.items.filter(
            (item) => !seen.has(item.id) && Boolean(seen.add(item.id)),
          );
          return {
            getFeed: {
              ...fetchMoreResult.getFeed,
              items: [...prev.getFeed.items, ...unseen],
            },
          };
        },
      });
      if (!active.current) return;
      setOffset(newOffset);
      setPaginationError(false);
    } catch {
      if (active.current) setPaginationError(true);
    } finally {
      if (active.current) setIsLoadingMore(false);
    }
  };

  // Nothing was loaded, so the failure is all there is to show. A failed
  // refresh of cards already shown keeps them instead (w4/984).
  if (failure && !data) {
    return (
      <div className="space-y-5">
        {heading}
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm mb-2 text-muted-foreground">
            {t("page.dashboard.feedError")}
          </p>
          <Button
            onClick={retry}
            loading={retrying}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("page.dashboard.retry")}
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && !data) {
    return (
      <div className="space-y-5">
        {heading}
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-4 shadow-sm sm:p-5"
              aria-hidden="true"
            >
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="size-9 shrink-0 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // What is shown is from an earlier load; say so, with the same read's
  // retry, rather than replacing it (w4/984).
  const refreshFailed = failure && (
    <Alert>
      <AlertCircle className="text-destructive" />
      <AlertDescription className="flex flex-wrap items-center gap-2">
        <span>{t("page.dashboard.activityRefreshFailed")}</span>
        <Button onClick={retry} loading={retrying} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("page.dashboard.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
  const items = data?.getFeed.items || [];
  const hasMore = data?.getFeed.hasMore || false;

  // Empty state
  if (items.length === 0) {
    return (
      <div className="space-y-5">
        {heading}
        {refreshFailed}
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            {t("page.dashboard.activityEmpty")}
          </p>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="space-y-5">
      {heading}

      {refreshFailed}

      {/* Feed items */}
      <div className="space-y-3">
        {items.map((item) => (
          <FeedCard key={item.id} {...item} />
        ))}
      </div>

      <ContinuationControl
        className="flex flex-col items-center gap-3 pt-2 pb-8"
        hasMore={hasMore}
        loading={loading || isLoadingMore}
        itemCount={items.length}
        onLoadMore={handleShowMore}
        label={t("page.dashboard.showMore")}
        retryLabel={t("page.dashboard.retry")}
        errorMessage={
          paginationError ? t("page.dashboard.feedError") : undefined
        }
      />
    </div>
  );
}
