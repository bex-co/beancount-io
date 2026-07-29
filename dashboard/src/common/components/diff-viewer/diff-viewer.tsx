import { useMemo, useState } from "react";
import { parseDiff, Diff, Hunk } from "react-diff-view";
import type { FileData, HunkData } from "react-diff-view";
import { List } from "react-window";
import {
  tokenizeBeancountDiff,
  isBeancountFile,
  shouldHighlightDiff,
} from "@/common/lib/diff/syntax-highlighter";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useTranslations } from "@/common/hooks/use-translations";
import { getDiffFileId } from "./diff-file-id";

// Virtualization thresholds
const VIRTUAL_SCROLL_THRESHOLD = 500; // Lines
const ROW_HEIGHT = 22; // Pixels per line
const FILE_HEADER_HEIGHT = 36;
const CONTAINER_HEIGHT = 600; // Max height in pixels

interface DiffViewerProps {
  diff: string;
}

// Change type from HunkData
type ChangeType = HunkData["changes"][number];

type FlattenedRow =
  | { type: "file-header"; data: FileData }
  | { type: "hunk-line"; data: ChangeType };

export function DiffViewer({ diff }: DiffViewerProps) {
  const { t } = useTranslations();
  const [firstVisibleRow, setFirstVisibleRow] = useState(0);
  // Parse the unified diff into file objects
  const files: FileData[] = useMemo(() => {
    if (!diff || diff.trim() === "") {
      return [];
    }

    try {
      return parseDiff(diff, { nearbySequences: "zip" });
    } catch (error) {
      console.error("Failed to parse diff:", error);
      return [];
    }
  }, [diff]);

  // Calculate total lines in diff
  const totalDiffLines = useMemo(() => {
    return files.reduce((sum, file) => {
      return (
        sum +
        file.hunks.reduce((hunkSum, hunk) => hunkSum + hunk.changes.length, 0)
      );
    }, 0);
  }, [files]);

  // Determine if we should apply syntax highlighting
  const shouldHighlight = shouldHighlightDiff(totalDiffLines);

  // Tokenize Beancount files for syntax highlighting (conditionally)
  const tokenizedFiles = useMemo(() => {
    return files.map((file) => {
      // Skip tokenization for large diffs
      if (!shouldHighlight) {
        return { file, tokens: null };
      }

      // Only apply syntax highlighting to .bean/.beancount files
      if (!isBeancountFile(file.newPath || file.oldPath || "")) {
        return { file, tokens: null };
      }

      try {
        const tokens = tokenizeBeancountDiff(file.hunks);
        return { file, tokens };
      } catch (error) {
        console.warn(`Failed to tokenize ${file.newPath}:`, error);
        return { file, tokens: null };
      }
    });
  }, [files, shouldHighlight]);

  // Check if we should use virtual scrolling
  const shouldVirtualize = totalDiffLines > VIRTUAL_SCROLL_THRESHOLD;

  // Flatten hunks into array of rows for virtualization
  const flattenedRows = useMemo<FlattenedRow[]>(() => {
    if (!shouldVirtualize) return [];

    const rows: FlattenedRow[] = [];

    files.forEach((file) => {
      rows.push({ type: "file-header", data: file });

      file.hunks.forEach((hunk) => {
        hunk.changes.forEach((change) => {
          rows.push({ type: "hunk-line", data: change });
        });
      });
    });

    return rows;
  }, [files, shouldVirtualize]);

  const currentVirtualFile = useMemo(() => {
    for (
      let index = Math.min(firstVisibleRow, flattenedRows.length - 1);
      index >= 0;
      index--
    ) {
      const row = flattenedRows[index];
      if (row?.type === "file-header") {
        return row.data.newPath || row.data.oldPath || t("common.unknown");
      }
    }
    return files[0]?.newPath || files[0]?.oldPath || t("common.unknown");
  }, [files, firstVisibleRow, flattenedRows, t]);

  const isMalformedDiff =
    files.length === 0 ||
    files.every(
      (file) => !file.newPath && !file.oldPath && file.hunks.length === 0,
    );

  if (!diff || diff.trim() === "") {
    return (
      <div className="space-y-2 p-4" data-testid="diff-viewer">
        <h2 className="text-base font-semibold">{t("commits.changes")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("commits.noChanges")}
        </p>
      </div>
    );
  }

  if (isMalformedDiff) {
    return (
      <div className="space-y-3 p-4" data-testid="diff-viewer">
        <h2 className="text-base font-semibold">{t("commits.changes")}</h2>
        <Alert variant="destructive">
          <AlertDescription>{t("commits.diffParseError")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render virtualized view for large diffs
  if (shouldVirtualize && flattenedRows.length > 0) {
    return (
      <div className="space-y-3 p-4" data-testid="diff-viewer">
        <h2 className="text-base font-semibold">{t("commits.changes")}</h2>

        {!shouldHighlight && (
          <Alert>
            <AlertDescription>
              {t("commits.largeDiffWarning", { totalLines: totalDiffLines })}
            </AlertDescription>
          </Alert>
        )}

        <div className="overflow-clip rounded-md border border-border">
          <div className="flex h-9 items-center border-b border-border bg-muted px-3 font-mono text-xs font-semibold">
            <span className="truncate">{currentVirtualFile}</span>
          </div>
          <List<Record<string, never>>
            data-testid="virtualized-diff"
            rowCount={flattenedRows.length}
            rowHeight={(index) =>
              flattenedRows[index]?.type === "file-header"
                ? FILE_HEADER_HEIGHT
                : ROW_HEIGHT
            }
            rowProps={{} as Record<string, never>}
            style={{ height: CONTAINER_HEIGHT, width: "100%" }}
            onRowsRendered={({ startIndex }) => setFirstVisibleRow(startIndex)}
            rowComponent={({ ariaAttributes, index, style }) => {
              const row = flattenedRows[index];

              if (row.type === "file-header") {
                const filename =
                  row.data.newPath || row.data.oldPath || t("common.unknown");
                return (
                  <div
                    {...ariaAttributes}
                    id={getDiffFileId(filename)}
                    style={style}
                    className="flex items-center border-b border-border bg-muted/60 px-3 font-mono text-xs font-semibold"
                  >
                    {filename}
                  </div>
                );
              }

              // Render simple line without complex Hunk component
              const change = row.data;
              const prefix =
                change.type === "insert"
                  ? "+"
                  : change.type === "delete"
                    ? "-"
                    : " ";
              const colorClass =
                change.type === "insert"
                  ? "bg-green-50 dark:bg-green-950/30"
                  : change.type === "delete"
                    ? "bg-red-50 dark:bg-red-950/30"
                    : "";

              // Get line number based on change type
              const lineNum =
                change.type === "insert" || change.type === "delete"
                  ? change.lineNumber
                  : change.newLineNumber;

              return (
                <div
                  {...ariaAttributes}
                  style={style}
                  className={`flex px-2 font-mono text-xs leading-[22px] ${colorClass}`}
                >
                  <span className="mr-2 w-8 shrink-0 text-right text-muted-foreground">
                    {lineNum || ""}
                  </span>
                  <span className="w-4 shrink-0">{prefix}</span>
                  <span className="flex-1 whitespace-pre">
                    {change.content}
                  </span>
                </div>
              );
            }}
          />
        </div>
      </div>
    );
  }

  // Render non-virtualized view for small diffs (with full Diff/Hunk components)
  return (
    <div className="space-y-3 p-4" data-testid="diff-viewer">
      <h2 className="text-base font-semibold">{t("commits.changes")}</h2>

      <div className="overflow-clip rounded-md border border-border">
        <div className="diff-viewer-container">
          {tokenizedFiles.map(({ file, tokens }) => {
            const filename =
              file.newPath || file.oldPath || t("common.unknown");

            return (
              <div
                key={filename}
                id={getDiffFileId(filename)}
                className="border-b border-border last:border-b-0"
              >
                <div className="sticky top-[var(--diff-sticky-offset,0px)] z-20 flex h-9 items-center border-b border-border bg-muted/95 px-3 font-mono text-xs font-semibold backdrop-blur">
                  {filename}
                </div>

                {/* Diff hunks */}
                <Diff
                  viewType="unified"
                  diffType={file.type}
                  hunks={file.hunks}
                  tokens={tokens}
                >
                  {(hunks: HunkData[]) =>
                    hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)
                  }
                </Diff>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
