import {
  entryFlagBadge,
  entryFlagBadgeText,
} from "../../transactions-screen/entry-row/entry-row-flag";

export type HeroBadge = {
  key: "flag" | "upcoming";
  text: string;
  /** A pending entry warns; a forecast, a pad or a future date is noted. */
  tone: "warning" | "neutral";
};

/**
 * The marks beside the hero's date, as the entry's row reads them: its flag's
 * badge (Pending, Forecast, Pad, or any other flag as written), then Upcoming
 * for a date after today. Only Pending was shown, so a forecast opened from
 * its "Forecast · Upcoming" row read as a booked transaction (w21/777).
 */
export function selectHeroBadges(
  entry: { flag?: string; date: string },
  today: string,
  labels: { pending: string; forecast: string; pad: string; upcoming: string },
): HeroBadge[] {
  const badges: HeroBadge[] = [];
  const flag = entryFlagBadge(entry.flag);
  if (flag !== null) {
    badges.push({
      key: "flag",
      text: entryFlagBadgeText(flag, labels),
      tone: flag.kind === "pending" ? "warning" : "neutral",
    });
  }
  const day = entry.date.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day > today) {
    badges.push({ key: "upcoming", text: labels.upcoming, tone: "neutral" });
  }
  return badges;
}
