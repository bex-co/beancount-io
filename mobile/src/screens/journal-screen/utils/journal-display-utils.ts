import { JournalDirectiveType, isJournalTransaction } from "../types";

export type JournalSection = {
  isoDate: string;
  displayDate: string;
  total: string;
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

export const getSectionTotal = (entries: JournalDirectiveType[]): string => {
  let net = 0;
  let currency = "USD";
  let found = false;

  for (const entry of entries) {
    if (!isJournalTransaction(entry) || entry.flag === "!") continue;
    const cashPostings = entry.postings.filter(
      (p) =>
        p.account.startsWith("Assets:") || p.account.startsWith("Liabilities:"),
    );
    for (const p of cashPostings) {
      net += parseFloat(p.units.number);
      currency = p.units.currency;
      found = true;
    }
  }

  if (!found) return "$0.00";
  const formatted = formatAmount(net, currency);
  if (net > 0) return `+${formatted}`;
  if (net < 0) return `-${formatAmount(Math.abs(net), currency)}`;
  return formatted;
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
    total: getSectionTotal(items),
    data: items,
  }));
};
