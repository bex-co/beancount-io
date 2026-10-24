import { useId, useRef } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { CommitListItem } from "./commit-list-item";
import type { ListCommitsQuery } from "@/graphql/definitions";
import { ContinuationControl } from "@/common/components/continuation-control";

interface CommitsListProps {
  ledgerId: string;
  selectedCommitSha?: string;
  onCommitSelect?: (sha: string) => void;
  commits: ListCommitsQuery["listCommits"];
  loading: boolean;
  error?: Error;
  /** Re-reads the failed first page in place. */
  onRetry: () => void;
  retrying: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  paginationError: boolean;
  loadedOlderCount: number | null;
  onLoadMore: () => Promise<void>;
}

export function CommitsList({
  ledgerId,
  selectedCommitSha,
  onCommitSelect,
  commits,
  loading,
  error,
  onRetry,
  retrying,
  hasMore,
  loadingMore,
  paginationError,
  loadedOlderCount,
  onLoadMore,
}: CommitsListProps) {
  const { t } = useTranslations();
  const titleId = useId();
  const section = useRef<HTMLElement>(null);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="gap-3">
          <p>{t(getErrorMessageKey(error))}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            loading={retrying}
          >
            {t("common.tryAgain")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <section aria-label={t("commits.listTitle")}>
        <div className="flex h-10 items-center border-b border-border px-3">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="divide-y divide-border" aria-hidden="true">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex h-[60px] items-center gap-2.5 px-3">
              <Skeleton className="size-4 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={section} className="min-w-0" aria-labelledby={titleId}>
      <header className="flex h-10 items-center border-b border-border px-3">
        <h2 id={titleId} className="text-sm font-semibold">
          {t("commits.listTitle")}
        </h2>
      </header>
      {selectedCommitSha &&
        !commits.some((commit) => commit.sha === selectedCommitSha) && (
          <p className="border-b border-border p-3 text-sm text-muted-foreground">
            {t("commits.selectedOutsideHistory")}
          </p>
        )}
      <nav aria-label={t("commits.versionHistory")}>
        <ul className="divide-y divide-border">
          {commits.map((commit) => (
            <li key={commit.sha} className="min-w-0">
              <CommitListItem
                commit={commit}
                ledgerId={ledgerId}
                isSelected={commit.sha === selectedCommitSha}
                onSelect={onCommitSelect}
              />
            </li>
          ))}
        </ul>
      </nav>
      {commits.length === 0 && (
        <p className="flex h-[60px] items-center px-3 text-sm text-muted-foreground">
          {t("commits.noCommits")}
        </p>
      )}
      <ContinuationControl
        className="space-y-2 p-3"
        buttonClassName="w-full"
        hasMore={hasMore}
        loading={loadingMore}
        itemCount={commits.length}
        loadedCount={loadedOlderCount}
        formatLoaded={(count) => t("commits.loadedOlder", { count })}
        getEndFocusTarget={(previousCount) => {
          const links =
            section.current?.querySelectorAll<HTMLAnchorElement>("nav a");
          return links?.[Math.min(previousCount, links.length - 1)];
        }}
        onLoadMore={onLoadMore}
        label={t("commits.loadOlder")}
        loadingLabel={t("common.loading")}
        errorMessage={
          paginationError ? t("common.failedToLoadData") : undefined
        }
      />
    </section>
  );
}
