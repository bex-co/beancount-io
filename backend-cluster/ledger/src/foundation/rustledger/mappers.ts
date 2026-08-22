import type {
  AmountValue,
  BeancountError,
  CellValue,
  CostValue,
  PositionValue,
  QueryResult,
} from "@rustledger/wasm";

/**
 * A BQL query result reshaped from column-parallel arrays into per-row records
 * keyed by column name — the shape most report/journal/query endpoints want.
 * Pure transform; unit-tested without touching WASM.
 */
export interface QueryRecordsResult {
  columns: string[];
  rows: Record<string, CellValue>[];
  errors: BeancountError[];
}

/**
 * Zip a rustledger {@link QueryResult} (`columns` + `rows` as positional
 * `CellValue[]`) into `{ column: value }` records. Missing cells become `null`.
 */
export function queryResultToRecords(result: QueryResult): QueryRecordsResult {
  const { columns } = result;
  const rows = result.rows.map((row) => {
    const record = Object.create(null) as Record<string, CellValue>;
    columns.forEach((column, index) => {
      record[column] = row[index] ?? null;
    });
    return record;
  });
  return { columns, rows, errors: result.errors ?? [] };
}

function isAmount(cell: CellValue): cell is AmountValue {
  return (
    typeof cell === "object" &&
    cell !== null &&
    "number" in cell &&
    "currency" in cell
  );
}

function isUnitsCell(
  cell: CellValue,
): cell is { units: AmountValue; cost?: CostValue } {
  return typeof cell === "object" && cell !== null && "units" in cell;
}

function isPositionsCell(
  cell: CellValue,
): cell is { positions: PositionValue[] } {
  return typeof cell === "object" && cell !== null && "positions" in cell;
}

function formatAmount(amount: AmountValue): string {
  return `${amount.number} ${amount.currency}`;
}

/**
 * Render a rustledger {@link CellValue} as a human-readable string, mirroring
 * how a text/table renderer would display a BQL cell (amounts as
 * `"<number> <currency>"`, positions joined, arrays comma-separated). Pure;
 * unit-tested. Used when a caller needs the text projection of a query cell.
 */
export function formatCellValue(cell: CellValue): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "string") return cell;
  if (typeof cell === "number" || typeof cell === "boolean") {
    return String(cell);
  }
  if (isAmount(cell)) return formatAmount(cell);
  if (isUnitsCell(cell)) {
    const base = formatAmount(cell.units);
    return cell.cost
      ? `${base} {${cell.cost.number} ${cell.cost.currency}}`
      : base;
  }
  if (isPositionsCell(cell)) {
    return cell.positions
      .map((position) => formatAmount(position.units))
      .join(", ");
  }
  if (Array.isArray(cell)) {
    return cell.map((item) => formatCellValue(item)).join(", ");
  }
  // Remaining arm of the union: a nested `{ [key]: CellValue }` object.
  return Object.entries(cell)
    .map(([key, value]) => `${key}=${formatCellValue(value)}`)
    .join(", ");
}
