import type { AmountValue, CellValue, QueryResult } from "@rustledger/wasm";
import BigNumber from "bignumber.js";
import { formatCellValue } from "@/foundation/rustledger";
import type { ShellQueryResult } from "./ledger-shell-types";

type ShellCell = string | number | boolean | Record<string, unknown>;

/**
 * A fava `SimpleCounterInventory` — `{ currency: number }` — the shape the
 * dashboard's holdings/query tables render (each entry is a "<number> <currency>"
 * line). Values are decimal strings.
 */
type CurrencyMap = Record<string, string>;

function isInventoryCell(
  cell: CellValue,
): cell is { positions: { units: AmountValue }[] } {
  return typeof cell === "object" && cell !== null && "positions" in cell;
}

function isPositionCell(cell: CellValue): cell is { units: AmountValue } {
  return typeof cell === "object" && cell !== null && "units" in cell;
}

function isAmountCell(cell: CellValue): cell is AmountValue {
  return (
    typeof cell === "object" &&
    cell !== null &&
    "number" in cell &&
    "currency" in cell
  );
}

/** Digits after the decimal point as written, an exponent moving the point. */
function writtenScale(source: string): number {
  const match = /^[+-]?(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/u.exec(source);
  if (!match) return 0;
  const fraction = match[2]?.length ?? 0;
  return Math.max(0, fraction - Number(match[3] ?? 0));
}

/**
 * Port of fava's `simple_units`: reduce a list of `{ number, currency }` units
 * to a `{ currency: number }` map, summing per currency and **dropping zero
 * balances** (fava's `SimpleCounterInventory.add` pops a key when it nets to
 * zero — so a fully-zero inventory serialises to `{}`, an empty cell).
 */
function unitsToCurrencyMap(units: AmountValue[]): CurrencyMap {
  const groups = new Map<string, string[]>();
  units.forEach(({ number, currency }) => {
    const list = groups.get(currency) ?? [];
    list.push(number);
    groups.set(currency, list);
  });
  const out: CurrencyMap = {};
  groups.forEach((numbers, currency) => {
    const total = numbers.reduce((acc, n) => acc.plus(n), new BigNumber(0));
    if (total.isZero()) return; // fava drops zero-net balances
    // Preserve the original decimal formatting (e.g. "2950.00") when a currency
    // has a single position — the common case for these grouped holdings rows;
    // a repeated currency is summed at the widest scale written, as the tree and
    // series serializers do: `toString()` sent `5e-7` and dropped trailing zeros
    // (`1250.50` → `1250.5`) (w21/125, w21/329).
    out[currency] =
      numbers.length === 1
        ? numbers[0]
        : total.toFixed(Math.max(...numbers.map(writtenScale)));
  });
  return out;
}

/**
 * Beanquery-style dtype for a column. rustledger does not expose cursor schema,
 * so use the full non-null column plus the canonical BQL column name. Looking at
 * every row avoids first-row null mistakes; the name fallback preserves types
 * for empty result sets on the standard entries schema — except when the name
 * is an alias for another expression (w23/134), which reports `unknown`
 * instead of the lookalike's type.
 */
const EMPTY_ALIASES: ReadonlyMap<string, string> = new Map();

function classifyColumnDtype(
  rows: CellValue[][],
  columnIndex: number,
  columnName = "",
  aliases: ReadonlyMap<string, string> = EMPTY_ALIASES,
): string {
  const values = rows
    .map((row) => row[columnIndex])
    .filter((cell): cell is Exclude<CellValue, null> => cell !== null);
  const sample = values[0];
  const normalizedName = columnName.toLowerCase();

  if (sample === undefined) {
    const root = aliases.get(normalizedName);
    if (root !== undefined && root !== normalizedName) return "unknown";
    return dtypeFromColumnName(normalizedName);
  }
  if (typeof sample === "string") {
    if (
      values.every((value) => typeof value === "string" && isIsoDate(value))
    ) {
      return "date";
    }
    if (
      values.every(
        (value) => typeof value === "string" && isDecimalString(value),
      ) &&
      !STRING_COLUMNS.has(normalizedName)
    ) {
      return "Decimal";
    }
    return "str";
  }
  if (typeof sample === "number") {
    return values.every(
      (value) => typeof value === "number" && Number.isInteger(value),
    )
      ? "int"
      : "Decimal";
  }
  if (typeof sample === "boolean") return "bool";
  if (Array.isArray(sample)) return "set";
  if ("positions" in sample) return "Inventory";
  if ("units" in sample) return "Position";
  if ("number" in sample && "currency" in sample) return "Amount";
  return "object";
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;
const DECIMAL_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u;
const DATE_COLUMNS = new Set(["date", "open_date", "close_date"]);
const INT_COLUMNS = new Set(["count", "year", "month", "day", "id"]);
const DECIMAL_COLUMNS = new Set([
  "number",
  "cost_number",
  "price_number",
  "weight",
]);
const SET_COLUMNS = new Set(["tags", "links", "other_accounts", "accounts"]);
const INVENTORY_COLUMNS = new Set(["balance"]);
const POSITION_COLUMNS = new Set(["position"]);
const STRING_COLUMNS = new Set([
  "account",
  "currency",
  "flag",
  "payee",
  "narration",
  "type",
]);

function isIsoDate(value: string): boolean {
  return ISO_DATE_RE.test(value);
}

function isDecimalString(value: string): boolean {
  return DECIMAL_RE.test(value);
}

function dtypeFromColumnName(name: string): string {
  if (DATE_COLUMNS.has(name) || name.endsWith("_date")) return "date";
  if (INT_COLUMNS.has(name) || name.startsWith("count")) return "int";
  if (DECIMAL_COLUMNS.has(name) || name.endsWith("_number")) return "Decimal";
  if (SET_COLUMNS.has(name)) return "set";
  if (INVENTORY_COLUMNS.has(name)) return "Inventory";
  if (POSITION_COLUMNS.has(name)) return "Position";
  return "str";
}

/**
 * Coerce a rustledger `CellValue` into the shell DTO's cell union, mirroring
 * fava's per-column-datatype serialisation (`fava/core/query.py`) — the shapes
 * the dashboard's holdings/query tables were built for. Getting these right is
 * what stops an Inventory rendering as `[object Object]positions`:
 *
 * - `Inventory` (`{ positions }`) → `{ currency: number }` map (fava
 *   `InventoryColumn` → `simple_units`).
 * - `Amount` (`{ number, currency }`) → a single-entry `{ currency: number }`
 *   map (rustledger types some Inventory columns as a bare Amount; fava would
 *   still show a `<number> <currency>` line).
 * - `Position` (`{ units, cost? }`) → its string form (fava `PositionColumn` →
 *   `str`), e.g. `"2 GLD {205.78 USD}"`.
 * - string arrays (set-typed columns: tags/links/other_accounts/...) → the
 *   same sorted double-space rendering the text table uses (w23/119), so one
 *   cell reads one way on every surface. The dtype still says `set` while the
 *   value is a string, and an empty set reads `""` — returning real arrays is
 *   a three-surface contract change, still undecided.
 * - non-string arrays and any other object → their string form (fava
 *   `ObjectColumn` → `str`).
 */
function toShellCell(cell: CellValue): ShellCell {
  // The pre-migration backend-v2 adapter converted Fava's nullable cells to an
  // empty string before exposing them through GraphQL.
  if (cell === null || cell === undefined) return "";
  if (
    typeof cell === "string" ||
    typeof cell === "number" ||
    typeof cell === "boolean"
  ) {
    return cell;
  }
  if (Array.isArray(cell)) return formatArrayCell(cell);
  if (isInventoryCell(cell)) {
    return unitsToCurrencyMap(cell.positions.map((position) => position.units));
  }
  // Order matters: a Position also has `units`, so check it before Amount and
  // after Inventory. A bare Amount is treated as a one-position inventory.
  if (isPositionCell(cell)) return formatCellValue(cell);
  if (isAmountCell(cell)) return unitsToCurrencyMap([cell]);
  return formatCellValue(cell);
}

/**
 * Map a rustledger BQL {@link QueryResult} into the `ShellQueryResult` table
 * shape the dashboard expects (columns → `types`, positional rows → `rows`).
 */
export function queryResultToShellResult(
  result: QueryResult,
  aliases: ReadonlyMap<string, string> = EMPTY_ALIASES,
): ShellQueryResult {
  return {
    resultType: "table",
    table: {
      types: result.columns.map((name, index) => ({
        name,
        dtype: classifyColumnDtype(result.rows, index, name, aliases),
      })),
      rows: result.rows.map((row) => row.map((cell) => toShellCell(cell))),
      t: "table",
    },
  };
}

/**
 * One array cell, one string, in both renderers (w23/119). A set-typed cell —
 * every member a string — sorts its members and double-space-joins them, the
 * way stock beanquery prints a set, so text and structured agree; an empty set
 * reads `""`, the same as an empty value or NULL. Anything else (mixed arrays
 * hold numbers or objects, never set members) keeps fava's comma-joined form.
 */
function formatArrayCell(cell: CellValue[]): string {
  if (cell.every((item) => typeof item === "string")) {
    return [...cell].sort().join("  ");
  }
  return formatCellValue(cell);
}

function formatTextCell(cell: CellValue): string {
  if (typeof cell === "boolean") return cell ? "TRUE" : "FALSE";
  if (Array.isArray(cell)) return formatArrayCell(cell);
  return formatCellValue(cell);
}

function alignDecimalColumn(values: string[]): string[] {
  const parts = values.map((value) => {
    const match = /^([+-]?)(\d*)(?:\.(\d*))?$/u.exec(value);
    if (!match) return null;
    return {
      integralWidth: match[1].length + Math.max(1, match[2].length),
      fractionalWidth: match[3]?.length ?? 0,
    };
  });
  if (parts.some((part) => part === null)) return values;

  const integralWidth = Math.max(
    0,
    ...parts.map((part) => part?.integralWidth ?? 0),
  );
  const fractionalWidth = Math.max(
    0,
    ...parts.map((part) => part?.fractionalWidth ?? 0),
  );
  const width = integralWidth + (fractionalWidth > 0 ? fractionalWidth + 1 : 0);

  return values.map((value, index) => {
    const part = parts[index];
    if (part === null) return value;
    return `${" ".repeat(integralWidth - part.integralWidth)}${value}`.padEnd(
      width,
    );
  });
}

function center(value: string, width: number): string {
  const clipped = value.slice(0, width);
  const padding = Math.max(0, width - clipped.length);
  const left = Math.floor(padding / 2);
  return `${" ".repeat(left)}${clipped}${" ".repeat(padding - left)}`;
}

/**
 * Render a BQL result using beanquery 0.2's default text-table conventions:
 * empty result sets produce no text, headers are centered/truncated to the data
 * width, numeric columns are right-aligned, booleans are upper-case, and set
 * values use the renderer's two-space separator.
 */
export function queryResultToText(
  result: QueryResult,
  aliases: ReadonlyMap<string, string> = EMPTY_ALIASES,
): string {
  if (result.columns.length === 0 || result.rows.length === 0) return "";

  const columns = result.columns.map((name, index) => {
    const dtype = classifyColumnDtype(result.rows, index, name, aliases);
    const rawValues = result.rows.map((row) => formatTextCell(row[index]));
    const values =
      dtype === "Decimal" ? alignDecimalColumn(rawValues) : rawValues;
    return {
      values,
      width: Math.max(
        1,
        dtype === "date" ? 10 : 0,
        ...values.map((value) => value.length),
      ),
      rightAligned: dtype === "Decimal" || dtype === "int",
    };
  });
  const widths = columns.map((column) => column.width);
  const header = result.columns
    .map((name, index) => center(name, widths[index]))
    .join("  ");
  const separator = widths.map((width) => "-".repeat(width)).join("  ");
  const rows = result.rows.map((_, rowIndex) =>
    columns
      .map((column) => {
        const value = column.values[rowIndex];
        return column.rightAligned
          ? value.padStart(column.width)
          : value.padEnd(column.width);
      })
      .join("  "),
  );
  return [header, separator, ...rows].join("\n") + "\n";
}
