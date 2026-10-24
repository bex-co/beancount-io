import {
  NO_FILTERS,
  type TransactionFilters,
} from "../../screens/transactions-screen/filters/types";

/** The account filter's length limit (w21/361). */
const MAX_ACCOUNT_LENGTH = 256;

const pad = (n: number): string => String(n).padStart(2, "0");

const lastDayOf = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/** One Fava time period (`2025`, `2025-Q1`, `2025-03`, `2025-03-09`) as days. */
const periodDays = (
  text: string,
): { start: string; end: string } | undefined => {
  // The server reads no date before year 1: 0000 would be sent and refused,
  // failing the list instead of opening it unfiltered (w21/960).
  if (/^0000(?!\d)/.test(text)) return undefined;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (day) {
    const [y, m, d] = [Number(day[1]), Number(day[2]), Number(day[3])];
    if (m < 1 || m > 12 || d < 1 || d > lastDayOf(y, m)) return undefined;
    return { start: text, end: text };
  }
  const month = /^(\d{4})-(\d{2})$/.exec(text);
  if (month) {
    const [y, m] = [Number(month[1]), Number(month[2])];
    if (m < 1 || m > 12) return undefined;
    return {
      start: `${month[1]}-${month[2]}-01`,
      end: `${month[1]}-${month[2]}-${pad(lastDayOf(y, m))}`,
    };
  }
  const quarter = /^(\d{4})-Q([1-4])$/i.exec(text);
  if (quarter) {
    const y = Number(quarter[1]);
    const q = Number(quarter[2]);
    const lastMonth = q * 3;
    return {
      start: `${quarter[1]}-${pad(lastMonth - 2)}-01`,
      end: `${quarter[1]}-${pad(lastMonth)}-${pad(lastDayOf(y, lastMonth))}`,
    };
  }
  if (/^\d{4}$/.test(text)) {
    return { start: `${text}-01-01`, end: `${text}-12-31` };
  }
  return undefined;
};

/**
 * The window a dashboard `time` expression names: a period, or two joined as
 * `2025-01 - 2025-03`. Weeks and anything else unparsed filter nothing.
 */
const timeWindow = (
  time: string,
): { start: string; end: string } | undefined => {
  const parts = time.split(/\s+-\s+/);
  if (parts.length > 2) return undefined;
  const first = periodDays(parts[0].trim());
  const last = parts.length === 2 ? periodDays(parts[1].trim()) : first;
  if (!first || !last || first.start > last.end) return undefined;
  return { start: first.start, end: last.end };
};

/**
 * The Transactions filters a dashboard journal link asks for. The dashboard
 * keeps `account` and `time` on every ledger page, so a copied journal URL
 * carries them; a link without them opens unfiltered, not under whatever
 * filter was left in the app (w21/344). `filter` (free-text query syntax) has
 * no counterpart in the app and is ignored.
 */
export function journalLinkFilters(
  searchParams: URLSearchParams,
): TransactionFilters {
  const account = (searchParams.get("account") ?? "").trim();
  const window = timeWindow((searchParams.get("time") ?? "").trim());
  return {
    ...NO_FILTERS,
    ...(window
      ? { range: "custom", startDate: window.start, endDate: window.end }
      : {}),
    ...(account && account.length <= MAX_ACCOUNT_LENGTH ? { account } : {}),
  };
}
