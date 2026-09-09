import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
import {
  DiffViewer,
  getDiffFileId,
  parseDiffFileId,
  type DiffFileFocusRequest,
} from "@/common/components/diff-viewer";
import { GetCommitDetailsDocument } from "@/graphql/definitions";

interface CommitDetailProps {
  ledgerId: string;
  commitSha: string;
}

function fileIdFromHash(hash: string): string | null {
  const fileId = hash.startsWith("#") ? hash.slice(1) : hash;
  return parseDiffFileId(fileId) === null ? null : fileId;
}

function focusFromLocation(token: number): DiffFileFocusRequest | null {
  if (typeof window === "undefined") return null;
  const fileId = fileIdFromHash(window.location.hash);
  return fileId ? { fileId, token } : null;
}

export function CommitDetail({ ledgerId, commitSha }: CommitDetailProps) {
  const { t } = useTranslations();
  const [loadedDiffSha, setLoadedDiffSha] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const focusSeqRef = useRef(0);
  // Parent remounts this component when ledger/commit changes (via `key`), so
  // initialize the pending destination from the current hash once per entry.
  const [focusRequest, setFocusRequest] = useState<DiffFileFocusRequest | null>(
    () => focusFromLocation(0),
  );

  const requestFileFocus = useCallback((fileId: string) => {
    if (parseDiffFileId(fileId) === null) return;
    focusSeqRef.current += 1;
    setFocusRequest({ fileId, token: focusSeqRef.current });
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const fileId = fileIdFromHash(window.location.hash);
      if (fileId) requestFileFocus(fileId);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [requestFileFocus]);

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

  const activeFocus = !isLargeDiff || showDiff ? focusRequest : null;

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

          <CommitFileList
            files={commit.files}
            onFileSelect={(filename) =>
              requestFileFocus(getDiffFileId(filename))
            }
          />

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
              <DiffViewer diff={commit.diff || ""} focusRequest={activeFocus} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
