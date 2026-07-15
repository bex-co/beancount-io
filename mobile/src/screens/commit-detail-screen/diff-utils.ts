export type DiffLineType = "added" | "removed" | "context";

export type DiffLine = {
  type: DiffLineType;
  content: string;
};

export function classifyDiffLine(line: string): DiffLine {
  if (line.startsWith("+") && !line.startsWith("+++")) {
    return { type: "added", content: line };
  }
  if (line.startsWith("-") && !line.startsWith("---")) {
    return { type: "removed", content: line };
  }
  return { type: "context", content: line };
}

export function parseDiff(diff: string): DiffLine[] {
  return diff.split("\n").map(classifyDiffLine);
}
