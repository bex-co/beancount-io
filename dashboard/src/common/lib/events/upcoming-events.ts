import { format } from "date-fns";

/**
 * How many events fall inside the inclusive window from today to
 * `upcomingEventsDays` days ahead.
 *
 * Events carry a plain calendar date, so the window has to be the viewer's
 * calendar days too. `toISOString()` converts local midnight to UTC first,
 * which moves both bounds a day in any zone east or west of UTC — counting
 * yesterday in UTC+14, and hiding the last eligible day. `format` reads the
 * local year/month/day parts instead.
 */
export function countUpcomingEvents(
  events: Array<{ date: string }>,
  upcomingEventsDays: number,
  now: Date = new Date(),
) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + upcomingEventsDays);

  const todayString = format(today, "yyyy-MM-dd");
  const endDateString = format(endDate, "yyyy-MM-dd");

  return events.filter(
    (event) => event.date >= todayString && event.date <= endDateString,
  ).length;
}
