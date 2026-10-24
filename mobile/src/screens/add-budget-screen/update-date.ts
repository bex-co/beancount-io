import { localDate } from "../../common/calendar-date";

/**
 * The dates an Update Budget may take. A directive dated before the budget's
 * current one saves, but the newer entry stays in force, so the Update changed
 * nothing and said nothing (w21/623): the date is limited to the current
 * entry's day or later, and starts on today. A budget that has not started has
 * no entry in force (the screen previews its earliest one), so nothing limits
 * it and an entry dated today takes effect today (w21/909).
 */
export function updateBudgetDates(
  currentDate: string | undefined,
  today: Date,
): { minimum: Date | undefined; initial: Date } {
  const match = currentDate
    ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(currentDate)
    : null;
  if (!match) return { minimum: undefined, initial: today };
  const minimum = localDate(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  const day = localDate(today.getFullYear(), today.getMonth(), today.getDate());
  if (minimum > day) return { minimum: undefined, initial: today };
  return { minimum, initial: today };
}
