import { parseDecimalNumber } from "@/common/lib/beancount/decimal-number";
import type { JournalTransaction } from "@/common/types/journal";

/** An import row as far as a duplicate check needs it. */
interface DuplicateCandidate {
  id: string;
  /** Canonical `YYYY-MM-DD`. */
  date: string;
  /** The exact decimal the import books on the source account. */
  amountDecimal: string;
}

/** One value however it is spelled: `-3.25`, `-3.250` and `-03.25` match. */
function decimalKey(value: string): string | null {
  const parsed = parseDecimalNumber(value);
  if (parsed === null) return null;
  const trimmed = parsed.includes(".")
    ? parsed.replace(/0+$/, "").replace(/\.$/, "")
    : parsed;
  return trimmed === "-0" ? "0" : trimmed;
}

/**
 * The rows that look already booked: an existing transaction on the same day
 * with a posting to the import's source account for the same amount and
 * currency, as Smart Import itself books a row. Re-uploading a file, or a
 * statement that overlaps the last one, booked every row a second time
 * (w2/122). Matching is one for one, so two identical coffees against one
 * booked coffee flag only one row.
 */
export function findLikelyDuplicates(
  rows: readonly DuplicateCandidate[],
  existing: readonly JournalTransaction[],
  sourceAccount: string,
  currency: string,
): Set<string> {
  const booked = new Map<string, number>();
  for (const transaction of existing) {
    for (const posting of transaction.postings ?? []) {
      if (posting.account !== sourceAccount) continue;
      if (posting.units?.currency !== currency) continue;
      const amount = decimalKey(String(posting.units.number));
      if (amount === null) continue;
      const key = `${transaction.date}|${amount}`;
      booked.set(key, (booked.get(key) ?? 0) + 1);
    }
  }
  const duplicates = new Set<string>();
  for (const row of rows) {
    const amount = decimalKey(row.amountDecimal);
    if (amount === null) continue;
    const key = `${row.date}|${amount}`;
    const left = booked.get(key) ?? 0;
    if (left === 0) continue;
    booked.set(key, left - 1);
    duplicates.add(row.id);
  }
  return duplicates;
}
