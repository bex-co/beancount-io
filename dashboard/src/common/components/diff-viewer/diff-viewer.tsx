import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { parseDiff, tokenize, Diff, Hunk } from "react-diff-view";
import type {
  FileData,
  HunkData,
  HunkTokens,
  RenderToken,
  TokenNode,
} from "react-diff-view";
import { List, useListRef } from "react-window";
import {
  tokenizeBeancountDiff,
  isBeancountFile,
  shouldHighlightDiff,
} from "@/common/lib/diff/syntax-highlighter";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useTranslations } from "@/common/hooks/use-translations";
import { getDiffFileId, parseDiffFileId } from "./diff-file-id";
import { hasRtlLetters, isolateRtlSource } from "@/common/lib/bidi/rtl-source";

// Virtualization thresholds
const VIRTUAL_SCROLL_THRESHOLD = 500; // Lines
const ROW_HEIGHT = 22; // Pixels per line
const FILE_HEADER_HEIGHT = 36;
const CONTAINER_HEIGHT = 600; // Max height in pixels
/** ~1s of frames waiting for the virtual list to become scrollable. */
const MAX_FOCUS_SCROLL_RETRIES = 60;

/** One-shot request to reveal a file once the parsed diff is ready. */
export interface DiffFileFocusRequest {
  fileId: string;
  token: number;
}

interface DiffViewerProps {
  diff: string;
  /** When set, scroll to this file once content can satisfy it. */
  focusRequest?: DiffFileFocusRequest | null;
}

// Change type from HunkData
type ChangeType = HunkData["changes"][number];

type FlattenedRow =
  | { type: "file-header"; data: FileData }
  | { type: "file-note"; data: FileData }
  | { type: "hunk-line"; data: ChangeType };

/**
 * Git ends a `---`/`+++` header with a TAB after a name containing
 * whitespace, and gitdiff-parser keeps that separator in the path, so the
 * file's section and its link disagreed (w4/263). A tab inside a real name
 * is always quoted and escaped, so a raw tab starts the separator.
 */
function withoutHeaderSeparator(path: string): string {
  const tab = path.indexOf("\t");
  return tab < 0 ? path : path.slice(0, tab);
}

function getDiffFilePath(file?: FileData): string {
  // Git uses /dev/null for the absent side of an added or deleted file.
  if (file?.newPath && file.newPath !== "/dev/null") return file.newPath;
  return file?.oldPath && file.oldPath !== "/dev/null" ? file.oldPath : "";
}

function isRenamed(file: FileData): boolean {
  return (
    Boolean(file.oldPath && file.newPath) &&
    file.oldPath !== "/dev/null" &&
    file.newPath !== "/dev/null" &&
    file.oldPath !== file.newPath
  );
}

/**
 * A rename names both sides, `old → new`; the section id stays on the new
 * path so links and rename-alias focus keep working (w2/109, w3/482).
 */
function getDiffFileHeading(file: FileData): string {
  return isRenamed(file)
    ? `${file.oldPath} → ${file.newPath}`
    : getDiffFilePath(file);
}

function hunksHaveRtlLetters(hunks: HunkData[]): boolean {
  return hunks.some((hunk) =>
    hunk.changes.some((change) => hasRtlLetters(change.content)),
  );
}

/**
 * react-diff-view's own token rendering, with each text run's RTL words in
 * their own isolate: a Persian account segment otherwise drew the amount
 * inside the account path (w2/118). The line keeps w4/226's LTR isolate.
 */
function renderIsolatedNode(node: TokenNode, key: number): ReactNode {
  if (node.type === "text") {
    return (
      <Fragment key={key}>{isolateRtlSource(String(node.value))}</Fragment>
    );
  }
  // Highlighter tokens carry their classes as an array, as the default
  // renderer's `classnames` call accepts.
  const names: unknown = node.className ?? node.properties?.className;
  const className =
    node.type === "mark"
      ? `diff-code-mark diff-code-mark-${node.markType}`
      : node.type === "edit"
        ? "diff-code-edit"
        : Array.isArray(names)
          ? names.join(" ")
          : (names as string | undefined);
  return (
    <span key={key} className={className}>
      {node.value
        ? isolateRtlSource(String(node.value))
        : node.children?.map(renderIsolatedNode)}
    </span>
  );
}

const renderIsolatedToken: RenderToken = (token, _renderDefault, index) =>
  renderIsolatedNode(token, index);

export function DiffViewer({ diff, focusRequest = null }: DiffViewerProps) {
  const { t } = useTranslations();
  const [firstVisibleRow, setFirstVisibleRow] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useListRef(null);
  const handledTokenRef = useRef<number | null>(null);
  // Bumped per animation frame while waiting for the virtual list's scroller
  // element, so the focus effect re-runs until the scroll can actually apply.
  const [listReadyTick, setListReadyTick] = useState(0);
  const retryTokenRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  // Parse the unified diff into file objects
  const files: FileData[] = useMemo(() => {
    if (!diff || diff.trim() === "") {
      return [];
    }

    try {
      return parseDiff(diff, { nearbySequences: "zip" }).map((file) => ({
        ...file,
        oldPath: withoutHeaderSeparator(file.oldPath),
        newPath: withoutHeaderSeparator(file.newPath),
      }));
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
      if (!isBeancountFile(getDiffFilePath(file))) {
        return { file, tokens: null };
      }

      try {
        const tokens = tokenizeBeancountDiff(file.hunks);
        return { file, tokens };
      } catch (error) {
        console.warn(`Failed to tokenize ${getDiffFilePath(file)}:`, error);
        return { file, tokens: null };
      }
    });
  }, [files, shouldHighlight]);

  // A file with RTL letters renders through tokens, plain ones when it has
  // no highlighting, so each line's RTL words can be isolated.
  const renderedFiles = useMemo(
    () =>
      tokenizedFiles.map(({ file, tokens }) => {
        if (!hunksHaveRtlLetters(file.hunks)) {
          return { file, tokens, renderToken: undefined };
        }
        let lineTokens: HunkTokens | null = tokens;
        if (!lineTokens) {
          try {
            lineTokens = tokenize(file.hunks);
          } catch {
            lineTokens = null;
          }
        }
        return {
          file,
          tokens: lineTokens,
          renderToken: lineTokens ? renderIsolatedToken : undefined,
        };
      }),
    [tokenizedFiles],
  );

  // Check if we should use virtual scrolling
  const shouldVirtualize = totalDiffLines > VIRTUAL_SCROLL_THRESHOLD;

  // Flatten hunks into array of rows for virtualization
  const flattenedRows = useMemo<FlattenedRow[]>(() => {
    if (!shouldVirtualize) return [];

    const rows: FlattenedRow[] = [];

    files.forEach((file) => {
      rows.push({ type: "file-header", data: file });
      if (file.hunks.length === 0) rows.push({ type: "file-note", data: file });

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
        return getDiffFileHeading(row.data) || t("common.unknown");
      }
    }
    return (files[0] && getDiffFileHeading(files[0])) || t("common.unknown");
  }, [files, firstVisibleRow, flattenedRows, t]);

  useLayoutEffect(() => {
    if (!focusRequest) return;
    if (handledTokenRef.current === focusRequest.token) return;

    const filename = parseDiffFileId(focusRequest.fileId);
    if (!filename || filename === "/dev/null") {
      handledTokenRef.current = focusRequest.token;
      return;
    }

    if (files.length === 0) return;

    // A current path wins over a rename alias when the old name is reused.
    const focusedFile =
      files.find((file) => getDiffFilePath(file) === filename) ??
      files.find((file) => file.oldPath === filename);
    if (!focusedFile) {
      handledTokenRef.current = focusRequest.token;
      return;
    }

    if (shouldVirtualize) {
      const index = flattenedRows.findIndex(
        (row) => row.type === "file-header" && row.data === focusedFile,
      );
      if (index < 0) return;

      const list = listRef.current;
      // react-window exposes its imperative handle before the scroller element
      // is attached; `scrollToRow` then silently no-ops. Consuming the token
      // here lost deep-linked selections on first load, so wait for readiness.
      if (!list?.element) {
        if (retryTokenRef.current !== focusRequest.token) {
          retryTokenRef.current = focusRequest.token;
          retryCountRef.current = 0;
        }
        if (retryCountRef.current >= MAX_FOCUS_SCROLL_RETRIES) {
          // The list never became scrollable; stop retrying rather than spin.
          handledTokenRef.current = focusRequest.token;
          return;
        }
        retryCountRef.current += 1;
        const frame = requestAnimationFrame(() =>
          setListReadyTick((tick) => tick + 1),
        );
        return () => cancelAnimationFrame(frame);
      }

      list.scrollToRow({
        index,
        align: "start",
        behavior: "auto",
      });
      rootRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
      handledTokenRef.current = focusRequest.token;
      return;
    }

    const target = rootRef.current?.ownerDocument.getElementById(
      getDiffFileId(getDiffFilePath(focusedFile)),
    );
    if (!target) return;

    target.scrollIntoView({ block: "start", behavior: "auto" });
    handledTokenRef.current = focusRequest.token;
  }, [
    focusRequest,
    files,
    flattenedRows,
    listRef,
    shouldVirtualize,
    listReadyTick,
  ]);

  // Clear handled-token tracking when the request is cancelled (commit change).
  useEffect(() => {
    if (!focusRequest) {
      handledTokenRef.current = null;
    }
  }, [focusRequest]);

  // A file with no hunks — a pure rename, a mode-only or binary change —
  // otherwise renders as a heading over nothing.
  const emptyFileNote = (file: FileData) =>
    isRenamed(file)
      ? t("commits.renamedWithoutChanges")
      : t("commits.noLineChanges");

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
      <div ref={rootRef} className="space-y-3 p-4" data-testid="diff-viewer">
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
            className="diff-source"
            listRef={listRef}
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
                  getDiffFilePath(row.data) || t("common.unknown");
                return (
                  <div
                    {...ariaAttributes}
                    id={getDiffFileId(filename)}
                    style={style}
                    className="flex items-center border-b border-border bg-muted/60 px-3 font-mono text-xs font-semibold"
                  >
                    {getDiffFileHeading(row.data) || filename}
                  </div>
                );
              }

              if (row.type === "file-note") {
                return (
                  <div
                    {...ariaAttributes}
                    style={style}
                    className="px-3 text-xs leading-[22px] text-muted-foreground"
                  >
                    {emptyFileNote(row.data)}
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
                    {isolateRtlSource(change.content)}
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
    <div ref={rootRef} className="space-y-3 p-4" data-testid="diff-viewer">
      <h2 className="text-base font-semibold">{t("commits.changes")}</h2>

      <div className="overflow-clip rounded-md border border-border">
        <div className="diff-viewer-container">
          {renderedFiles.map(({ file, tokens, renderToken }) => {
            const filename = getDiffFilePath(file) || t("common.unknown");

            return (
              <div
                key={filename}
                id={getDiffFileId(filename)}
                className="border-b border-border last:border-b-0"
              >
                <div className="sticky top-[var(--diff-sticky-offset,0px)] z-20 flex h-9 items-center border-b border-border bg-muted/95 px-3 font-mono text-xs font-semibold backdrop-blur">
                  {getDiffFileHeading(file) || filename}
                </div>

                {file.hunks.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    {emptyFileNote(file)}
                  </p>
                ) : (
                  <Diff
                    className="diff-source"
                    viewType="unified"
                    diffType={file.type}
                    hunks={file.hunks}
                    tokens={tokens}
                    renderToken={renderToken}
                  >
                    {(hunks: HunkData[]) =>
                      hunks.map((hunk) => (
                        <Hunk key={hunk.content} hunk={hunk} />
                      ))
                    }
                  </Diff>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
