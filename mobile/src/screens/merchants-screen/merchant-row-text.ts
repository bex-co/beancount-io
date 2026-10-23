import { formatLedgerDateShort } from "../../common/date-format";
import type { useTranslations } from "../../common/hooks/use-translations";
import { formatMerchantAmount } from "../merchant-detail-screen/selectors/format-merchant-total";
import {
  cadenceLabelKey,
  type MerchantListItem,
} from "./selectors/merchant-sections";

type Translate = ReturnType<typeof useTranslations>["t"];

function primaryTypical(detection: {
  typicalAmountByCurrency: Record<string, number>;
  primaryCurrency: string;
}): { currency: string; amount: number } | null {
  const { typicalAmountByCurrency: amounts, primaryCurrency: currency } =
    detection;
  const amount = amounts[currency];
  return amount === undefined ? null : { currency, amount };
}

/**
 * Everything a Merchants row says, and the label VoiceOver reads for it. The
 * label was the payee alone, so a row showing "Netflix · Monthly · ~$15.99 ·
 * Overdue" read "Netflix, button" (w21/139). It now says what the row shows,
 * plus the count and "Recurring" a Recurring-section row leaves to its
 * section header.
 */
export function merchantRowText(
  item: MerchantListItem,
  t: Translate,
  locale: string,
  today: string,
  /** The ledger's own currency, whose symbol another currency then reads by code. */
  primaryCurrency?: string,
) {
  const { merchant, resolved, inRecurringSection } = item;
  const showBadge = resolved.isRecurring && !inRecurringSection;
  const detection = resolved.detection;

  const countLabel = t("merchantsTransactionCount", {
    count: merchant.transactionCount,
  });
  // A last date after today is a pre-entered payment, not one made
  // (w21/167). With every entry pre-entered, the next is the first: the
  // furthest read as the one coming (w21/761).
  const lastDate = !merchant.lastDate
    ? ""
    : merchant.lastDate > today
      ? t("merchantsScheduled", {
          date: formatLedgerDateShort(
            merchant.firstDate && merchant.firstDate > today
              ? merchant.firstDate
              : merchant.lastDate,
            locale,
          ),
        })
      : formatLedgerDateShort(merchant.lastDate, locale);

  let subtitle = countLabel;
  let cadenceLabel: string | null = null;
  let trailingAmount: string | null = null;
  let trailingMeta: string | null = lastDate || null;
  let trailingOverdue = false;

  if (inRecurringSection && resolved.isRecurring) {
    const cadenceKey = cadenceLabelKey(resolved.cadence);
    cadenceLabel = cadenceKey ? t(cadenceKey) : "";
    const typical = detection ? primaryTypical(detection) : null;
    // Signed as the detail's header is: a paycheck is -$5,000.00, not a bill
    // of $5,000.00 (w21/461).
    trailingAmount = typical
      ? `${detection?.isApproximate ? "~" : ""}${formatMerchantAmount(
          { total: typical.amount, currency: typical.currency },
          primaryCurrency,
        )}`
      : null;
    subtitle = cadenceLabel;
    if (detection?.nextExpected) {
      const next = formatLedgerDateShort(detection.nextExpected, locale);
      if (detection.isLapsed) {
        // Stopped, not late: say when it last happened (w21/267).
        trailingMeta = t("merchantsLastPaid", {
          date: formatLedgerDateShort(detection.lastPaid, locale),
        });
      } else if (detection.isOverdue) {
        // A missed bill stays Overdue with the next one pre-entered; the
        // pre-entered one is named as scheduled (w21/167).
        trailingMeta = detection.scheduled
          ? `${t("merchantsOverdue")} · ${t("merchantsScheduled", {
              date: formatLedgerDateShort(detection.scheduled, locale),
            })}`
          : t("merchantsOverdue");
        trailingOverdue = true;
      } else if (detection.nextExpected < today) {
        // Past but within the grace before Overdue: "Next Oct 21" on Oct 23
        // read a missed payment as upcoming (w21/759).
        trailingMeta = t("merchantsDueOn", { date: next });
      } else {
        trailingMeta = t("merchantsNextExpected", { date: next });
      }
    } else {
      trailingMeta = null;
    }
  }

  const accessibilityLabel = [
    merchant.payee,
    countLabel,
    resolved.isRecurring ? t("merchantsRecurringBadge") : null,
    cadenceLabel,
    trailingAmount,
    trailingMeta,
  ]
    .filter((part): part is string => !!part)
    .join(", ");

  return {
    showBadge,
    subtitle,
    lastDate,
    trailingAmount,
    trailingMeta,
    trailingOverdue,
    accessibilityLabel,
  };
}
