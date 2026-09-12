import { formatLedgerDate } from "../../../common/date-format";
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

/** Display floor: money always reads with cents, so 1.5 shows as 1.50. */
const MIN_FRACTION_DIGITS = 2;
/** `Intl.NumberFormat` rejects anything above this. */
const MAX_FRACTION_DIGITS = 20;

/**
 * Fraction digits recorded in a posting's amount string, e.g. `"0.004"` → 3.
 *
 * The API returns amounts as decimal strings, which is the only place a
 * commodity's real scale survives: `parseFloat` keeps the value but loses the
 * intent, and formatting at a flat two digits then rounded 0.004 ETH to 0.00.
 */
export const amountScale = (number: string): number => {
  const dot = number.indexOf(".");
  if (dot < 0) return 0;
  return number.length - dot - 1;
};

/**
 * Unsigned magnitude for display.
 *
 * @param scale - Fraction digits the source recorded (see `amountScale`). Acts
 *   as the maximum, so a crypto reward of 0.004 ETH survives instead of
 *   rounding to 0.00.
 */
export const formatAmount = (
  value: number,
  currency: string,
  scale = MIN_FRACTION_DIGITS,
): string => {
  const maximumFractionDigits = Math.min(
    MAX_FRACTION_DIGITS,
    Math.max(MIN_FRACTION_DIGITS, scale),
  );
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: MIN_FRACTION_DIGITS,
    maximumFractionDigits,
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
    // A sum is only as coarse as its finest leg, so a bucket carries the
    // widest scale any of its postings recorded.
    const byCurrency = new Map<string, { value: number; scale: number }>();
    for (const p of cashPostings) {
      const value = parseFloat(p.units.number);
      if (!Number.isFinite(value)) continue;
      const currency = p.units.currency;
      const bucket = byCurrency.get(currency);
      const scale = amountScale(p.units.number);
      if (bucket) {
        bucket.value += value;
        bucket.scale = Math.max(bucket.scale, scale);
      } else {
        byCurrency.set(currency, { value, scale });
      }
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
          Math.abs(bucket[1].value) > Math.abs(best[1].value) ? bucket : best,
        );
      }
      const [currency, { value, scale }] = picked;
      return { text: formatAmount(value, currency, scale), value, currency };
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
  return {
    text: formatAmount(value, currency, amountScale(max.units.number)),
    value,
    currency,
  };
};

/**
 * Buckets entries into date sections, newest-page-first as the server returned
 * them.
 *
 * `searchQuery` filters client-side over the entries already loaded. The
 * transactions list leaves it empty — it searches server-side through
 * `JournalQueryInput.filter`, so paging is not capped at what is in memory. The
 * journal screen still passes one.
 */
export const groupToSections = (
  entries: JournalDirectiveType[],
  searchQuery = "",
  locale = "en",
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
    displayDate: formatLedgerDate(isoDate, locale),
    data: items,
  }));
};
