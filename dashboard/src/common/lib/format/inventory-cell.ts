/**
 * Format ledger inventory / amount maps (`{ USD: "123.45" }`) for display and CSV.
 *
 * Shared by Holdings and BQL so neither feature imports the other's helpers.
 * Decimal strings stay lossless — do not round through `Number`.
 */

export type InventoryAmountEntry = {
  currency: string;
  amount: string;
};

/** Column dtypes whose cells are currency→quantity maps from the ledger service. */
export const INVENTORY_LIKE_DTYPES = new Set(["Inventory", "Amount"]);

export function isInventoryLikeDtype(
  dtype: string | null | undefined,
): boolean {
  return dtype != null && INVENTORY_LIKE_DTYPES.has(dtype);
}

/**
 * Lossless decimal/quantity formatting for inventory map values.
 * Keeps API decimal strings intact so small units (e.g. 0.004 ETH) are not
 * rounded to zero. JSON numbers use String(n).
 */
export function formatDecimalCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return "";
    if (/^-?0(?:\.0+)?$/.test(trimmed)) return "0";
    return trimmed;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value);
    if (value === 0) return "0";
    return String(value);
  }

  return String(value);
}

/** Ordered list of `<amount> <currency>` entries for React or plain text. */
export function formatInventoryEntries(obj: object): InventoryAmountEntry[] {
  return Object.entries(obj).map(([currency, value]) => ({
    currency,
    amount: formatDecimalCell(value),
  }));
}

/**
 * Plain-text inventory cell for CSV (CRLF between units, matching Holdings).
 * Empty maps (`{}`) become an empty string — not the literal `{}`.
 */
export function formatInventoryCellText(obj: object): string {
  return formatInventoryEntries(obj)
    .map(({ currency, amount }) => `${amount} ${currency}`)
    .join("\r\n");
}

/**
 * Display string for a query/table cell when the column dtype is inventory-like.
 * Returns `null` when the cell should use the caller's non-inventory path.
 */
export function formatInventoryLikeCell(
  cell: unknown,
  dtype: string | null | undefined,
): string | null {
  if (!isInventoryLikeDtype(dtype)) return null;
  if (cell === null || cell === undefined) return "";
  if (typeof cell !== "object" || Array.isArray(cell)) return null;
  return formatInventoryCellText(cell);
}
