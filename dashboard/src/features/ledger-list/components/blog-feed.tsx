import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Activity, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Skeleton } from "@/common/components/ui/skeleton";
import { FeedCard } from "./feed-card";
import { useTranslations } from "@/common/hooks/use-translations";
import { GetFeedDocument, GetFeedQuery } from "@/graphql/definitions";

/**
 * Latest-updates feed component
 * Displays paginated product news and traceable ledger activity
 * Features:
 * - Pagination with "Show More" button
 * - Loading state with skeleton loaders
 * - Error state with retry button
 * - Empty state message
 */
export function BlogFeed() {
  const { t, i18n } = useTranslations();
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const limit = 10;

  const heading = (
    <div className="flex items-center gap-3 border-b border-border pb-4">
      <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Activity className="size-5" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {t("page.dashboard.blogFeed")}
      </h1>
    </div>
  );

  const { data, loading, error, refetch, fetchMore } = useQuery(
    GetFeedDocument,
    {
      variables: { offset: 0, limit, locale: i18n.language },
    },
  );

  const handleShowMore = async () => {
    if (isLoadingMore) return;
    const newOffset = offset + limit;
    setIsLoadingMore(true);
    try {
      await fetchMore({
        variables: { offset: newOffset, limit, locale: i18n.language },
        updateQuery: (
          prev: GetFeedQuery,
          { fetchMoreResult }: { fetchMoreResult?: GetFeedQuery },
        ) => {
          if (!fetchMoreResult) return prev;
          return {
            getFeed: {
              ...fetchMoreResult.getFeed,
              items: [...prev.getFeed.items, ...fetchMoreResult.getFeed.items],
            },
          };
        },
      });
      setOffset(newOffset);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="space-y-5">
        {heading}
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-border bg-card p-4 sm:p-5"
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

  // Error state
  if (error) {
    return (
      <div className="space-y-5">
        {heading}
        <div className="border border-border bg-card p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm mb-2 text-muted-foreground">
            {t("page.dashboard.feedError")}
          </p>
          <Button onClick={() => refetch()} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("page.dashboard.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const items = data?.getFeed.items || [];
  const hasMore = data?.getFeed.hasMore || false;

  // Empty state
  if (items.length === 0) {
    return (
      <div className="space-y-5">
        {heading}
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("page.dashboard.noFeedItems")}
          </p>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="space-y-5">
      {heading}

      {/* Feed items */}
      <div className="space-y-3">
        {items.map((item) => (
          <FeedCard key={item.id} {...item} />
        ))}
      </div>

      {/* Show More button */}
      {hasMore && (
        <div className="flex justify-center pt-2 pb-8">
          <Button
            onClick={handleShowMore}
            variant="outline"
            disabled={loading || isLoadingMore}
          >
            {isLoadingMore && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("page.dashboard.showMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
