import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { History } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import { cn } from "@/common/lib/utils/utils";
import { CommitsList } from "./commits-list";
import { CommitDetail } from "./commit-detail";
import { ListCommitsDocument } from "@/graphql/definitions";
import { Button } from "@/common/components/ui/button";
import { ReportLoadingState } from "@/common/components/state-components";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/common/components/ui/sheet";

const PAGE_SIZE = 30;

/** How far the list has been continued, for the list length it produced. */
interface Continuation {
  count: number;
  pages: number;
  lastPageSize: number | null;
  loadedOlderCount: number | null;
  failed: boolean;
  /** Whether the list has rendered at `count` since this was recorded. */
  shown: boolean;
}

interface CommitsSplitViewProps {
  ledgerId: string;
  selectedCommitSha?: string;
}

export default function CommitsSplitView({
  ledgerId,
  selectedCommitSha,
}: CommitsSplitViewProps) {
  return (
    <CommitsWorkspace
      key={ledgerId}
      ledgerId={ledgerId}
      selectedCommitSha={selectedCommitSha}
    />
  );
}

function CommitsWorkspace({
  ledgerId,
  selectedCommitSha,
}: CommitsSplitViewProps) {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const [historyOpen, setHistoryOpen] = useState(false);
  const paging = useRef(false);
  const active = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [continuation, setContinuation] = useState<Continuation | null>(null);
  const [ledgerOwner, ledgerName] = ledgerId.split("/");
  // Another commit is loading: the layout keeps this workspace mounted, so
  // the detail pane says so instead of showing the previous diff (w4/246).
  const pendingCommitSha = useRouterState({
    select: (state) => {
      if (!state.isLoading) return undefined;
      const params = state.pendingMatches?.at(-1)?.params as
        | { commitSha?: string }
        | undefined;
      return params?.commitSha;
    },
  });
  const detailPending =
    pendingCommitSha !== undefined && pendingCommitSha !== selectedCommitSha;

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  // Fetch commits list to enable auto-selection
  const {
    data: commitsData,
    loading: commitsLoading,
    error: commitsError,
    fetchMore,
    refetch,
  } = useQuery(ListCommitsDocument, {
    variables: {
      ledgerId,
      branch: "main",
      page: 1,
      limit: PAGE_SIZE,
    },
    // A newly mounted ledger starts with a fresh first page and cursor.
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: false,
  });

  // Try Again re-reads this ledger's first page, never page 2 through
  // `fetchMore`; the error and its busy button stay while it runs, and a
  // failed retry hands focus back to the button pressed (w4/1043).
  const firstPage = useQueryRetry(commitsError, refetch);

  const commits = commitsData?.listCommits || [];
  // Paging state belongs to the list it produced. Refresh replaces the list
  // with a fresh first page while this workspace stays mounted, so once that
  // list has shown and then changed, the continuation is stale and the next
  // page is 2 again (w4/1095). Until it has shown, it still applies: Apollo
  // can render the old list once more after a page's merge.
  if (
    continuation &&
    !continuation.shown &&
    continuation.count === commits.length
  ) {
    setContinuation({ ...continuation, shown: true });
  }
  const current =
    continuation &&
    (!continuation.shown || continuation.count === commits.length)
      ? continuation
      : null;
  const pagesLoaded = current?.pages ?? 1;
  const hasMore = (current?.lastPageSize ?? commits.length) >= PAGE_SIZE;

  const loadOlder = async () => {
    if (paging.current || !hasMore) return;
    paging.current = true;
    setLoadingMore(true);
    setContinuation(
      (previous) => previous && { ...previous, loadedOlderCount: null },
    );
    const base = commits.length;
    const previousShas = new Set(commits.map((commit) => commit.sha));
    let mergedCount: number | null = null;
    try {
      const result = await fetchMore({
        variables: { page: pagesLoaded + 1 },
        // A request from an unmounted ledger must not merge into a later
        // visit's fresh first page, even when Apollo still completes it, and
        // one that started before a Refresh must not merge into the
        // refreshed list.
        updateQuery: (previous, { fetchMoreResult }) => {
          if (!active.current || previous.listCommits?.length !== base) {
            return previous;
          }
          const listCommits = Array.from(
            new Map(
              [...previous.listCommits, ...fetchMoreResult.listCommits].map(
                (commit) => [commit.sha, commit],
              ),
            ).values(),
          );
          mergedCount = listCommits.length;
          return { ...previous, listCommits };
        },
      });
      if (!active.current) return;
      if (!result.data) throw new Error("Missing commit history page");
      if (mergedCount === null) return;
      const count = mergedCount;
      setContinuation({
        count,
        pages: pagesLoaded + 1,
        lastPageSize: result.data.listCommits.length,
        loadedOlderCount: new Set(
          result.data.listCommits
            .filter((commit) => !previousShas.has(commit.sha))
            .map((commit) => commit.sha),
        ).size,
        failed: false,
        shown: false,
      });
    } catch {
      if (active.current) {
        setContinuation({
          count: base,
          pages: pagesLoaded,
          lastPageSize: current?.lastPageSize ?? null,
          loadedOlderCount: null,
          failed: true,
          shown: false,
        });
      }
    } finally {
      paging.current = false;
      if (active.current) setLoadingMore(false);
    }
  };

  // Auto-select first commit if none selected
  useEffect(() => {
    const commits = commitsData?.listCommits || [];
    if (!selectedCommitSha && commits.length > 0 && !commitsLoading) {
      void navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/commit/$commitSha",
        params: { ledgerOwner, ledgerName, commitSha: commits[0].sha },
        replace: true, // Don't pollute history
      });
    }
  }, [
    selectedCommitSha,
    commitsData,
    commitsLoading,
    navigate,
    ledgerOwner,
    ledgerName,
  ]);

  const commitsList = (onCommitSelect?: (sha: string) => void) => (
    <CommitsList
      ledgerId={ledgerId}
      selectedCommitSha={selectedCommitSha}
      onCommitSelect={onCommitSelect}
      commits={commits}
      loading={commitsLoading && !commitsData}
      error={firstPage.failure}
      onRetry={firstPage.retry}
      retrying={firstPage.retrying}
      hasMore={hasMore}
      loadingMore={loadingMore}
      paginationError={current?.failed ?? false}
      loadedOlderCount={current?.loadedOlderCount ?? null}
      onLoadMore={loadOlder}
    />
  );

  return (
    <div className="grid h-full min-h-0 min-w-0 grid-cols-1 overflow-hidden border border-border bg-background xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <aside
        className={cn(
          "min-h-0 min-w-0 overflow-y-auto xl:block xl:border-r xl:border-border",
          selectedCommitSha ? "hidden" : "block",
        )}
      >
        {commitsList()}
      </aside>

      <section
        className={cn(
          "min-h-0 min-w-0 overflow-auto [--diff-sticky-offset:2.75rem] xl:block xl:[--diff-sticky-offset:0px]",
          selectedCommitSha ? "block" : "hidden",
        )}
        aria-label={t("commits.detailTitle")}
        aria-busy={detailPending || undefined}
      >
        {selectedCommitSha ? (
          <>
            <div className="sticky top-0 z-30 flex h-11 items-center border-b border-border bg-background/95 px-3 backdrop-blur xl:hidden">
              <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="max-w-full">
                    <History className="size-4" aria-hidden="true" />
                    <span className="truncate">
                      {t("commits.versionHistory")}
                    </span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[min(90vw,320px)] gap-0 p-0 sm:max-w-[320px]"
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>{t("commits.versionHistory")}</SheetTitle>
                    <SheetDescription>
                      {t("commits.selectCommitToView")}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto pt-10">
                    {commitsList(() => setHistoryOpen(false))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            {detailPending ? (
              <ReportLoadingState />
            ) : (
              <CommitDetail
                key={`${ledgerId}:${selectedCommitSha}`}
                ledgerId={ledgerId}
                commitSha={selectedCommitSha}
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
            {t("commits.selectCommitToView")}
          </div>
        )}
      </section>
    </div>
  );
}
