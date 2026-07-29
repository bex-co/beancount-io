import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { CommitListItem } from "./commit-list-item";
import type { ListCommitsQuery } from "@/graphql/definitions";

interface CommitsListProps {
  ledgerId: string;
  selectedCommitSha?: string;
  onCommitSelect?: (sha: string) => void;
  commits: ListCommitsQuery["listCommits"];
  loading: boolean;
  error?: Error;
}

export function CommitsList({
  ledgerId,
  selectedCommitSha,
  onCommitSelect,
  commits,
  loading,
  error,
}: CommitsListProps) {
  const { t } = useTranslations();

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t(getErrorMessageKey(error))}</AlertDescription>
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
    <section className="min-w-0" aria-labelledby="commits-list-title">
      <header className="flex h-10 items-center border-b border-border px-3">
        <h2 id="commits-list-title" className="text-sm font-semibold">
          {t("commits.listTitle")}
        </h2>
      </header>
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
    </section>
  );
}
