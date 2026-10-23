import { amountCurrencySymbols } from "../utils/csv-validator";
import type { ImportConfigTransactionValues } from "./import-config-draft";

/** Selected rows whose amount symbol names currencies other than the import's. */
type ImportCurrencyConflict = {
  symbol: string;
  currencies: readonly string[];
  /** One-based row numbers, as the mapping table shows them. */
  rows: number[];
};

/**
 * An import posts every selected row in one Currency, so a row written as
 * `€-1.25` under USD would be booked as dollars with no conversion (w4/m44).
 * Group the selected rows whose own symbols rule the Currency out, by symbol,
 * in table order; a row with two contradicting symbols is named under each.
 * Bare numbers and `$`/`¥` amounts never conflict.
 */
export function findImportCurrencyConflicts(
  transactions: Pick<
    ImportConfigTransactionValues,
    "rowIndex" | "amountInput" | "selected"
  >[],
  currency: string,
): ImportCurrencyConflict[] {
  const bySymbol = new Map<string, ImportCurrencyConflict>();
  for (const txn of transactions) {
    if (!txn.selected) continue;
    for (const found of amountCurrencySymbols(txn.amountInput)) {
      if (found.currencies.includes(currency)) continue;
      const conflict = bySymbol.get(found.symbol) ?? { ...found, rows: [] };
      conflict.rows.push(txn.rowIndex + 1);
      bySymbol.set(found.symbol, conflict);
    }
  }
  return [...bySymbol.values()];
}
