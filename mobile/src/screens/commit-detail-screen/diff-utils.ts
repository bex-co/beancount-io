type DiffLineType = "added" | "removed" | "context";

export type DiffLine = {
  type: DiffLineType;
  content: string;
};

/**
 * Classify each line of a unified diff by where it sits, not by prefix alone.
 * Inside a hunk a `+`/`-` always marks content, even when the content starts
 * with `++`/`--` (deleting a `---` line emits `----`). The `--- a/file` and
 * `+++ b/file` headers only appear between `diff --git` and the first `@@`.
 */
export function parseDiff(diff: string): DiffLine[] {
  let inHunk = false;
  return diff.split("\n").map((line): DiffLine => {
    if (line.startsWith("diff --git")) {
      inHunk = false;
    } else if (line.startsWith("@@")) {
      inHunk = true;
    } else if (inHunk && line.startsWith("+")) {
      return { type: "added", content: line };
    } else if (inHunk && line.startsWith("-")) {
      return { type: "removed", content: line };
    }
    return { type: "context", content: line };
  });
}
