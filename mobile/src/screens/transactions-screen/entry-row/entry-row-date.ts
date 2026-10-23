import { formatLedgerDateShort } from "../../../common/date-format";

/**
 * The line under a card row's name when the card shows dates: the day it is
 * dated, marked upcoming when that is after today, then the narration. The
 * cards that list recent entries (Home, Reports) have no `DateSectionHeader`
 * to say when a row happened, and the journal comes newest first with
 * pre-entered future payments on top, so a rent due next month read as if it
 * had been paid (w21/261).
 */
export function entryRowDateLine({
  date,
  today,
  locale,
  upcomingLabel,
  secondary,
}: {
  /** The entry's date, ISO (a time part is ignored). */
  date: string | null | undefined;
  today: string;
  locale: string;
  upcomingLabel: string;
  secondary: string | null;
}): string | null {
  const day = date?.slice(0, 10);
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return secondary;
  return [
    formatLedgerDateShort(day, locale),
    day > today ? upcomingLabel : null,
    secondary,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

/**
 * The row's second line on a list whose headers already name the day
 * (Transactions): "Upcoming" before the narration for an entry dated after
 * `today`, as `entryRowDateLine` says it on Home. A forecast's projected
 * entries filled the first screen, none told from booked ones (w21/746).
 */
export function entryRowUpcomingLine({
  date,
  today,
  upcomingLabel,
  secondary,
}: {
  /** The entry's date, ISO (a time part is ignored). */
  date: string | null | undefined;
  today: string;
  upcomingLabel: string;
  secondary: string | null;
}): string | null {
  const day = date?.slice(0, 10);
  const upcoming =
    day && /^\d{4}-\d{2}-\d{2}$/.test(day) && day > today
      ? upcomingLabel
      : null;
  return [upcoming, secondary].filter(Boolean).join(" · ") || null;
}
