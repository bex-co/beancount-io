/**
 * Pure comparison of the stock beanquery oracle against the ledger engine's
 * answer, plus the deviation allowlist. No engine, no I/O: the replayer
 * (`replay-bql-oracle.ts`) feeds it data, and the unit tests feed it fixtures.
 *
 * A query is compared on five axes, so an allowlist entry can excuse exactly
 * the difference it documents and nothing wider:
 *
 *   outcome    one side refused the query, the other answered it
 *   columns    different column names (or a different count)
 *   dtype      a column carries a different type name
 *   row-count  a different number of rows
 *   cells      a different value in a row both sides returned
 *
 * Two refusals always agree: stock's exception class and the engine's message
 * are not reproduced, only that the query was refused.
 */

export const DIFFERENCE_KINDS = [
  "outcome",
  "columns",
  "dtype",
  "row-count",
  "cells",
] as const;

export type DifferenceKind = (typeof DIFFERENCE_KINDS)[number];

export type OracleResult =
  | { error: string }
  | {
      columns: { name: string; dtype: string }[];
      rows: unknown[][];
    };

export type EngineResult =
  | { error: string }
  | {
      columns: { name: string; dtype: string }[];
      rows: unknown[][];
    };

export type Difference = { kind: DifferenceKind; detail: string };

export type AllowlistEntry = {
  id: string;
  differences: DifferenceKind[];
  reference: string;
  note?: string;
};

function sortedStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sortedStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${sortedStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** `{USD: "1.15"}` (engine) and `["1.15", "USD"]` (stock) both read `1.15 USD`. */
function amountText(cell: unknown): string | null {
  if (Array.isArray(cell) && cell.length === 2) {
    return `${String(cell[0])} ${String(cell[1])}`;
  }
  if (cell !== null && typeof cell === "object") {
    const entries = Object.entries(cell as Record<string, unknown>);
    if (entries.length === 1) return `${String(entries[0][1])} ${entries[0][0]}`;
  }
  return null;
}

/** An inventory is a sorted list of `number currency` positions. */
function inventoryPositions(cell: unknown): string[] | null {
  if (Array.isArray(cell)) return cell.map(String).sort();
  if (cell !== null && typeof cell === "object") {
    return Object.entries(cell as Record<string, unknown>)
      .map(([currency, number]) => `${String(number)} ${currency}`)
      .sort();
  }
  return null;
}

/**
 * Renders one cell in the form both sides can share. The representation
 * differences removed here are the ones that carry no meaning: an Amount is a
 * pair in stock and a one-entry map in the engine, an Inventory is a list in
 * stock and a map in the engine, a set is a list in stock and the
 * double-space-joined string stock itself prints in the engine, and a number
 * is a number or its decimal text. Anything else compares as it is.
 */
export function normalizeCell(dtype: string, cell: unknown): string {
  if (cell === null || cell === undefined) return "null";
  if (dtype === "Amount") {
    const text = amountText(cell);
    if (text !== null) return JSON.stringify(text);
  }
  if (dtype === "Inventory") {
    const positions = inventoryPositions(cell);
    if (positions !== null) return JSON.stringify(positions);
  }
  if (dtype === "set" && Array.isArray(cell)) {
    return JSON.stringify([...cell].map(String).sort().join("  "));
  }
  if (typeof cell === "number") return JSON.stringify(String(cell));
  return sortedStringify(cell);
}

function describe(result: OracleResult | EngineResult): string {
  return "error" in result
    ? `refused (${result.error})`
    : `${result.rows.length} row(s)`;
}

export function compareQuery(
  oracle: OracleResult,
  engine: EngineResult,
): Difference[] {
  const oracleRefused = "error" in oracle;
  const engineRefused = "error" in engine;
  if (oracleRefused || engineRefused) {
    return oracleRefused === engineRefused
      ? []
      : [
          {
            kind: "outcome",
            detail: `stock ${describe(oracle)}, engine ${describe(engine)}`,
          },
        ];
  }

  const differences: Difference[] = [];
  const stockNames = oracle.columns.map((column) => column.name);
  const engineNames = engine.columns.map((column) => column.name);
  const sameShape = stockNames.length === engineNames.length;
  if (!sameShape || stockNames.some((name, i) => name !== engineNames[i])) {
    differences.push({
      kind: "columns",
      detail: `stock [${stockNames.join(", ")}], engine [${engineNames.join(", ")}]`,
    });
  }
  if (sameShape) {
    oracle.columns.forEach((column, index) => {
      const other = engine.columns[index];
      if (column.dtype !== other.dtype) {
        differences.push({
          kind: "dtype",
          detail: `column ${index} "${column.name}": stock ${column.dtype}, engine ${other.dtype}`,
        });
      }
    });
  }
  if (oracle.rows.length !== engine.rows.length) {
    differences.push({
      kind: "row-count",
      detail: `stock ${oracle.rows.length} row(s), engine ${engine.rows.length}`,
    });
    return differences;
  }
  if (!sameShape) return differences;

  for (let row = 0; row < oracle.rows.length; row += 1) {
    for (let col = 0; col < oracle.columns.length; col += 1) {
      const stock = normalizeCell(oracle.columns[col].dtype, oracle.rows[row][col]);
      const ours = normalizeCell(engine.columns[col].dtype, engine.rows[row][col]);
      if (stock !== ours) {
        differences.push({
          kind: "cells",
          detail: `row ${row} column ${col} "${oracle.columns[col].name}": stock ${stock}, engine ${ours}`,
        });
        return differences;
      }
    }
  }
  return differences;
}

/** Throws, naming the entry, on anything a reviewer could not trust. */
export function parseAllowlist(
  raw: unknown,
  knownIds: ReadonlySet<string>,
): AllowlistEntry[] {
  if (!Array.isArray(raw)) throw new Error("allowlist must be a JSON array");
  const seen = new Set<string>();
  return raw.map((item: unknown, index) => {
    const entry = item as Partial<AllowlistEntry> | null;
    const where = `allowlist entry ${index}${entry?.id ? ` (${entry.id})` : ""}`;
    if (!entry || typeof entry.id !== "string" || entry.id === "") {
      throw new Error(`${where}: missing id`);
    }
    if (!knownIds.has(entry.id)) {
      throw new Error(`${where}: no such query in the oracle`);
    }
    if (seen.has(entry.id)) throw new Error(`${where}: listed twice`);
    seen.add(entry.id);
    if (typeof entry.reference !== "string" || entry.reference.trim() === "") {
      throw new Error(`${where}: every deviation must cite a reference`);
    }
    if (
      !Array.isArray(entry.differences) ||
      entry.differences.length === 0 ||
      entry.differences.some((kind) => !DIFFERENCE_KINDS.includes(kind))
    ) {
      throw new Error(
        `${where}: differences must be a non-empty subset of ${DIFFERENCE_KINDS.join(", ")}`,
      );
    }
    return entry as AllowlistEntry;
  });
}

export type Verdict = {
  /** Differences no allowlist entry excuses. */
  unexpected: { id: string; differences: Difference[] }[];
  /** Allowlisted differences that no longer occur: remove them. */
  stale: { id: string; kinds: DifferenceKind[] }[];
  allowed: number;
};

export function judge(
  found: ReadonlyMap<string, Difference[]>,
  allowlist: readonly AllowlistEntry[],
): Verdict {
  const byId = new Map(allowlist.map((entry) => [entry.id, entry]));
  const verdict: Verdict = { unexpected: [], stale: [], allowed: 0 };
  for (const [id, differences] of found) {
    const entry = byId.get(id);
    const excused = new Set<DifferenceKind>(entry?.differences ?? []);
    const open = differences.filter((d) => !excused.has(d.kind));
    if (open.length > 0) verdict.unexpected.push({ id, differences: open });
    else if (differences.length > 0) verdict.allowed += 1;
  }
  for (const entry of allowlist) {
    const present = new Set((found.get(entry.id) ?? []).map((d) => d.kind));
    const kinds = entry.differences.filter((kind) => !present.has(kind));
    if (kinds.length > 0) verdict.stale.push({ id: entry.id, kinds });
  }
  return verdict;
}
