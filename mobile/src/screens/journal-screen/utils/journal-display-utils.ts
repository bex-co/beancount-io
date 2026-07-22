import {
  JournalDirectiveType,
  JournalPosting,
  JournalTransaction,
  isJournalTransaction,
} from "../types";

export type JournalSection = {
  isoDate: string;
  displayDate: string;
  data: JournalDirectiveType[];
};

export const formatDisplayDate = (isoDate: string): string => {
  try {
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return isoDate;
  }
};

export const formatAmount = (value: number, currency: string): string => {
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === "USD" ? `$${formatted}` : `${formatted} ${currency}`;
};

/** A transaction's headline amount: one currency, never a cross-currency sum. */
export type EntryAmount = {
  /** Unsigned formatted magnitude, e.g. "$3,177.39" or "355.63 RGAGX". */
  text: string;
  /** Signed value, so callers decide the "+" prefix and the color. */
  value: number;
  currency: string;
};

/** Currency a posting is *priced* in, when it holds a commodity at cost. */
const moneyCurrencyOf = (p: JournalPosting): string | undefined =>
  p.cost?.currency ?? p.price?.currency ?? undefined;

/**
 * The one number to show for a transaction, in a single currency.
 *
 * Netting Assets/Liabilities postings answers "what moved in or out", but the
 * legs are only commensurable when they share a currency: a fund purchase pairs
 * `-3,177.39 USD` with `+355.63 RGAGX`, and adding those produces a number that
 * means nothing. So legs are bucketed by currency and summed within a bucket,
 * never across.
 *
 * With several buckets we want the money leg, not the commodity leg: prefer the
 * currency some posting quotes its cost or price in (in a trade that is the
 * cash side), and otherwise the bucket with the largest magnitude. When no
 * Assets/Liabilities posting exists at all (an Income → Expenses entry, say),
 * fall back to the single largest posting.
 *
 * @returns The amount, or null when the transaction has no usable posting.
 */
export const selectTransactionAmount = (
  txn: JournalTransaction,
): EntryAmount | null => {
  const postings = txn.postings ?? [];
  if (!postings.length) return null;

  const cashPostings = postings.filter(
    (p) =>
      p.account.startsWith("Assets:") || p.account.startsWith("Liabilities:"),
  );

  if (cashPostings.length > 0) {
    const byCurrency = new Map<string, number>();
    for (const p of cashPostings) {
      const value = parseFloat(p.units.number);
      if (!Number.isFinite(value)) continue;
      const currency = p.units.currency;
      byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + value);
    }

    const buckets = Array.from(byCurrency.entries());
    if (buckets.length > 0) {
      let picked = buckets[0];
      if (buckets.length > 1) {
        const moneyCurrencies = new Set(
          postings.map(moneyCurrencyOf).filter(Boolean),
        );
        const money = buckets.filter(([currency]) =>
          moneyCurrencies.has(currency),
        );
        const candidates = money.length > 0 ? money : buckets;
        picked = candidates.reduce((best, bucket) =>
          Math.abs(bucket[1]) > Math.abs(best[1]) ? bucket : best,
        );
      }
      const [currency, value] = picked;
      return { text: formatAmount(value, currency), value, currency };
    }
  }

  let max: JournalPosting | null = null;
  for (const p of postings) {
    const value = parseFloat(p.units.number);
    if (!Number.isFinite(value)) continue;
    if (
      max === null ||
      Math.abs(value) > Math.abs(parseFloat(max.units.number))
    )
      max = p;
  }
  if (max === null) return null;

  const value = parseFloat(max.units.number);
  const currency = max.units.currency;
  return { text: formatAmount(value, currency), value, currency };
};

export const groupToSections = (
  entries: JournalDirectiveType[],
  searchQuery: string,
): JournalSection[] => {
  const q = searchQuery.toLowerCase().trim();
  const filtered = q
    ? entries.filter((entry) => {
        if (isJournalTransaction(entry)) {
          return (
            entry.payee?.toLowerCase().includes(q) ||
            entry.narration?.toLowerCase().includes(q) ||
            entry.postings.some((p) => p.account.toLowerCase().includes(q))
          );
        }
        return entry.directive_type.toLowerCase().includes(q);
      })
    : entries;

  const groups = new Map<string, JournalDirectiveType[]>();
  for (const entry of filtered) {
    const isoDate = entry.date.slice(0, 10);
    if (!groups.has(isoDate)) groups.set(isoDate, []);
    groups.get(isoDate)!.push(entry);
  }

  return Array.from(groups.entries()).map(([isoDate, items]) => ({
    isoDate,
    displayDate: formatDisplayDate(isoDate),
    data: items,
  }));
};
