import { ChevronDown, FileText } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";
import { getDiffFileId } from "@/common/components/diff-viewer/diff-file-id";

interface CommitFileListProps {
  files: Array<{
    filename: string;
    additions: number;
    deletions: number;
  }>;
}

export function CommitFileList({ files }: CommitFileListProps) {
  const { t } = useTranslations();

  return (
    <details
      className="group border-t border-border"
      data-testid="commit-file-list"
    >
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <ChevronDown
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
        {t("commits.filesChanged")}
      </summary>

      <nav
        aria-label={t("commits.filesChanged")}
        className="border-t border-border"
      >
        <ul className="divide-y divide-border">
          {files.map((file) => (
            <li key={file.filename}>
              <a
                href={`#${getDiffFileId(file.filename)}`}
                className="flex min-h-10 min-w-0 items-center gap-2 px-4 py-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <FileText
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">
                  {file.filename}
                </span>
                <span className="shrink-0 text-xs text-green-700 dark:text-green-400">
                  +{file.additions}
                </span>
                <span className="shrink-0 text-xs text-red-700 dark:text-red-400">
                  -{file.deletions}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
