import { useState, useTransition } from "react";
import { useQuery } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Loader2 } from "lucide-react";
import { CommitMetadata } from "./commit-metadata";
import { CommitFileList } from "./commit-file-list";
import { DiffViewer } from "@/common/components/diff-viewer";
import { GetCommitDetailsDocument } from "@/graphql/definitions";

interface CommitDetailProps {
  ledgerId: string;
  commitSha: string;
}

export function CommitDetail({ ledgerId, commitSha }: CommitDetailProps) {
  const { t } = useTranslations();
  const [loadedDiffSha, setLoadedDiffSha] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { data, loading, error, refetch } = useQuery(GetCommitDetailsDocument, {
    variables: { ledgerId, sha: commitSha },
  });

  const handleLoadDiff = () => {
    startTransition(() => {
      setLoadedDiffSha(commitSha);
    });
  };

  const commit = data?.getCommitDetails;
  const totalLines = commit
    ? commit.stats.additions + commit.stats.deletions
    : 0;
  const isLargeDiff = totalLines >= 1000;
  const showDiff = loadedDiffSha === commitSha;
  const isMissingCommit =
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((item) => item.extensions?.code === "NOT_FOUND");

  return (
    <div className="min-w-0">
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {t(
                isMissingCommit
                  ? "commits.notFound"
                  : getErrorMessageKey(error),
              )}
            </span>
            {!isMissingCommit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
              >
                {t("common.tryAgain")}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="space-y-3 p-4" aria-busy="true">
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      )}

      {!loading && !error && !commit && (
        <Alert className="m-4">
          <AlertDescription>{t("commits.notFound")}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && commit && (
        <div className="space-y-0">
          <CommitMetadata
            sha={commit.sha}
            message={commit.message}
            author={commit.author}
            stats={commit.stats}
            fileCount={commit.files.length}
          />

          <CommitFileList files={commit.files} />

          <div className="border-t border-border">
            {isLargeDiff && !showDiff ? (
              <div className="space-y-3 p-4">
                <Button
                  onClick={handleLoadDiff}
                  variant="outline"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("commits.loadingDiff")}
                    </>
                  ) : (
                    t("commits.loadLargeDiff")
                  )}
                </Button>

                {totalLines > 10000 && (
                  <Alert>
                    <AlertDescription>
                      {t("commits.largeDiffWarning", { totalLines })}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <DiffViewer diff={commit.diff || ""} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
