import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { History } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";
import { cn } from "@/common/lib/utils/utils";
import { CommitsList } from "./commits-list";
import { CommitDetail } from "./commit-detail";
import { ListCommitsDocument } from "@/graphql/definitions";
import { Button } from "@/common/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/common/components/ui/sheet";

interface CommitsSplitViewProps {
  ledgerId: string;
  selectedCommitSha?: string;
}

export default function CommitsSplitView({
  ledgerId,
  selectedCommitSha,
}: CommitsSplitViewProps) {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ledgerOwner, ledgerName] = ledgerId.split("/");

  // Fetch commits list to enable auto-selection
  const {
    data: commitsData,
    loading: commitsLoading,
    error: commitsError,
  } = useQuery(ListCommitsDocument, {
    variables: {
      ledgerId,
      branch: "main",
      page: 1,
      limit: 30,
    },
  });

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
      commits={commitsData?.listCommits || []}
      loading={commitsLoading}
      error={commitsError}
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
            <CommitDetail ledgerId={ledgerId} commitSha={selectedCommitSha} />
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
