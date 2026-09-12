/**
 * Minimal unified diffs for dry-run previews (w2/m26): no new dependency, no
 * binary, pure string math. Common prefix/suffix trim, then an LCS diff over
 * the middle (capped — oversized middles fall back to whole-file -/+), then
 * standard `@@ -a,b +c,d @@` hunks with 3 lines of context.
 */

const CONTEXT_LINES = 3;
// LCS cells before falling back to whole-file replace (keeps pathological
// inputs — e.g. two minified blobs — from stalling an approval round-trip).
const MAX_LCS_CELLS = 2_000_000;
// Past this many lines per side the diff is noise; the preview says so.
const MAX_DIFF_LINES = 10_000;

type Op =
  | { kind: "equal"; aIndex: number; bIndex: number }
  | { kind: "delete"; aIndex: number }
  | { kind: "insert"; bIndex: number };

function splitLines(text: string): string[] {
  return text === "" ? [] : text.split("\n");
}

function lcsOps(a: string[], b: string[]): Op[] {
  const start = commonPrefix(a, b);
  const aEnd = a.length - commonSuffix(a, b, start);
  const bEnd = b.length - commonSuffix(a, b, start);
  const ops: Op[] = [];
  for (let i = 0; i < start; i++)
    ops.push({ kind: "equal", aIndex: i, bIndex: i });
  ops.push(
    ...diffMiddle(a.slice(start, aEnd), b.slice(start, bEnd), start, start),
  );
  const tail = a.length - aEnd;
  for (let i = 0; i < tail; i++)
    ops.push({ kind: "equal", aIndex: aEnd + i, bIndex: bEnd + i });
  return ops;
}

function commonPrefix(a: string[], b: string[]): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function commonSuffix(a: string[], b: string[], start: number): number {
  let i = 0;
  while (
    i < a.length - start &&
    i < b.length - start &&
    a[a.length - 1 - i] === b[b.length - 1 - i]
  )
    i++;
  return i;
}

function diffMiddle(a: string[], b: string[], aOff: number, bOff: number): Op[] {
  if (a.length === 0) return b.map((_, i) => ({ kind: "insert" as const, bIndex: bOff + i }));
  if (b.length === 0) return a.map((_, i) => ({ kind: "delete" as const, aIndex: aOff + i }));
  if (a.length * b.length > MAX_LCS_CELLS) {
    return [
      ...a.map((_, i) => ({ kind: "delete" as const, aIndex: aOff + i })),
      ...b.map((_, i) => ({ kind: "insert" as const, bIndex: bOff + i })),
    ];
  }
  // Classic DP LCS over the trimmed middle.
  const widths = new Array<number>(b.length + 1).fill(0);
  const table: number[][] = [widths.slice()];
  for (let i = 1; i <= a.length; i++) {
    const row = [0];
    for (let j = 1; j <= b.length; j++) {
      row.push(
        a[i - 1] === b[j - 1]
          ? (table[i - 1]?.[j - 1] ?? 0) + 1
          : Math.max(table[i - 1]?.[j] ?? 0, row[j - 1] ?? 0),
      );
    }
    table.push(row);
  }
  const ops: Op[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      i--;
      j--;
      ops.push({ kind: "equal", aIndex: aOff + i, bIndex: bOff + j });
    } else if (j > 0 && (i === 0 || (table[i]?.[j - 1] ?? 0) >= (table[i - 1]?.[j] ?? 0))) {
      j--;
      ops.push({ kind: "insert", bIndex: bOff + j });
    } else {
      i--;
      ops.push({ kind: "delete", aIndex: aOff + i });
    }
  }
  return ops.reverse();
}

/**
 * Render one file's unified diff. `before === null` is a creation,
 * `after === null` a deletion.
 */
export function unifiedDiff(
  path: string,
  before: string | null,
  after: string | null,
): string {
  const a = before === null ? [] : splitLines(before);
  const b = after === null ? [] : splitLines(after);
  const header = `--- a/${path}\n+++ b/${path}\n`;
  if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES) {
    return (
      `${header}@@ too large to preview ` +
      `(${a.length} → ${b.length} lines) @@\n`
    );
  }
  const ops = lcsOps(a, b);
  // Group into hunks: changed ops joined by at most 2×context equal lines.
  const hunks: Op[][] = [];
  let current: Op[] = [];
  let pendingEqual: Op[] = [];
  const flush = () => {
    if (current.length > 0) {
      hunks.push(current);
      current = [];
    }
  };
  for (const op of ops) {
    if (op.kind === "equal") {
      pendingEqual.push(op);
      if (pendingEqual.length > CONTEXT_LINES * 2) {
        // Gap too wide for one hunk: close the open hunk with trailing
        // context, and keep only potential leading context for the next one.
        // Between hunks `current` is empty, so nothing flushes until the
        // next change — no context-only hunks.
        if (current.length > 0) {
          current.push(...pendingEqual.slice(0, CONTEXT_LINES));
          flush();
        }
        pendingEqual = pendingEqual.slice(-CONTEXT_LINES);
      }
    } else {
      current.push(...pendingEqual);
      pendingEqual = [];
      current.push(op);
    }
  }
  if (current.length > 0) {
    current.push(...pendingEqual.slice(0, CONTEXT_LINES));
    flush();
  }
  if (hunks.length === 0) return "";
  // Line counters over the whole op stream locate each hunk's start.
  const hunkStarts: { aStart: number; bStart: number }[] = [];
  {
    let aPos = 0;
    let bPos = 0;
    let inHunk = false;
    const hunkOf = new Map<Op, number>();
    hunks.forEach((hunk, index) => hunk.forEach((op) => hunkOf.set(op, index)));
    for (const op of ops) {
      const index = hunkOf.get(op);
      if (index !== undefined && !inHunk) {
        inHunk = true;
        hunkStarts[index] = { aStart: aPos, bStart: bPos };
      }
      if (index === undefined && inHunk) inHunk = false;
      if (op.kind === "equal") {
        aPos++;
        bPos++;
      } else if (op.kind === "delete") {
        aPos++;
      } else {
        bPos++;
      }
    }
  }
  const out = [header];
  hunks.forEach((hunk, index) => {
    const { aStart, bStart } = hunkStarts[index] ?? { aStart: 0, bStart: 0 };
    let aCount = 0;
    let bCount = 0;
    const lines: string[] = [];
    for (const op of hunk) {
      if (op.kind === "equal") {
        aCount++;
        bCount++;
        lines.push(` ${a[op.aIndex]}`);
      } else if (op.kind === "delete") {
        aCount++;
        lines.push(`-${a[op.aIndex]}`);
      } else {
        bCount++;
        lines.push(`+${b[op.bIndex]}`);
      }
    }
    const from = aCount === 0 ? aStart : aStart + 1;
    const to = bCount === 0 ? bStart : bStart + 1;
    out.push(`@@ -${from},${aCount} +${to},${bCount} @@\n`);
    out.push(`${lines.join("\n")}\n`);
  });
  return out.join("");
}
