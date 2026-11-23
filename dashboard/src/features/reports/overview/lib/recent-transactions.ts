import { DirectiveType } from "@/common/types/journal";

/** Calendar dates sort by their ISO digits. Match today or any earlier prefix. */
function throughDatePredicate(today: string) {
  const earlier = Array.from(
    today.matchAll(/[1-9]/g),
    (digit) => `${today.slice(0, digit.index)}[0-${Number(digit[0]) - 1}]`,
  );
  return `date:"^(?:${[...earlier, `${today}$`].join("|")})"`;
}

/**
 * The newest transactions through today. Keep the reader's Time expression,
 * including relative and fiscal ranges, and apply the date bound before the
 * journal limit. Recent activity, the date heading and the loader share it.
 */
export function recentTransactionsVariables({
  ledgerId,
  account,
  filter,
  time,
  today,
}: {
  ledgerId: string;
  account: string;
  filter: string;
  time: string;
  today: string;
}) {
  const through = throughDatePredicate(today);
  return {
    ledgerId,
    query: {
      account: account || undefined,
      filter: filter.trim() ? `(${filter}) ${through}` : through,
      time: time || undefined,
      directiveTypes: [DirectiveType.TRANSACTION],
      offset: 0,
      limit: 8,
    },
  };
}
