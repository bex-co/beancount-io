import { formatLedgerDateShort } from "../../../common/date-format";
import type { useTranslations } from "../../../common/hooks/use-translations";

type Translate = ReturnType<typeof useTranslations>["t"];

/**
 * The span under a merchant's total. The last date may be a pre-entered payment,
 * not one made: say so (w21/335). One day is one date, not "Feb 10, 2026 – Feb
 * 10, 2026" (w21/616). When even the first is after today, the whole span is
 * pre-entered: "Oct 25, 2026 – Scheduled Oct 31, 2026" read its first as made
 * (w21/761).
 */
export function merchantDateRangeText(
  firstDate: string,
  lastDate: string,
  today: string,
  locale: string,
  t: Translate,
): string {
  const first = formatLedgerDateShort(firstDate, locale);
  const last = formatLedgerDateShort(lastDate, locale);
  if (firstDate > today) {
    const span =
      firstDate === lastDate
        ? first
        : t("merchantDetailDateRange", { first, last });
    return t("merchantsScheduled", { date: span });
  }
  const scheduled = lastDate > today;
  const lastText = scheduled ? t("merchantsScheduled", { date: last }) : last;
  if (firstDate === lastDate) return lastText;
  return t("merchantDetailDateRange", { first, last: lastText });
}
