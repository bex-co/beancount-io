/**
 * Compose rollups + detection + overrides into the Merchants directory sections:
 * a pinned Recurring block and the general list (with a recurring badge flag).
 *
 * Free of `@/` value imports so the jest-lite runner can require it.
 */

import {
  filterMerchants,
  sortMerchants,
  type MerchantAggregate,
  type MerchantSort,
} from "./aggregate-payees";
import type { RecurrenceVerdict } from "./detect-recurrence";
import {
  resolveRecurringVerdict,
  type RecurringOverride,
  type ResolvedCadence,
  type ResolvedRecurring,
} from "./resolve-recurring";

type MerchantSectionKey = "recurring" | "all";

export interface MerchantListItem {
  merchant: MerchantAggregate;
  resolved: ResolvedRecurring;
  /** True when this row sits in the pinned Recurring section. */
  inRecurringSection: boolean;
}

export interface MerchantSection {
  key: MerchantSectionKey;
  /** Translation key for the section header; null = no header chrome. */
  titleKey: "merchantsRecurringSection" | null;
  data: MerchantListItem[];
}

export type OverrideLookup = (payee: string) => RecurringOverride | null;

/**
 * Build directory sections. Search filters both; sort applies only inside the
 * general section — the Recurring pin keeps detection/override order
 * (next-expected ascending, overdue first).
 */
export function buildMerchantSections(
  merchants: readonly MerchantAggregate[],
  detections: ReadonlyMap<string, RecurrenceVerdict | null>,
  overrideForPayee: OverrideLookup,
  searchQuery: string,
  sort: MerchantSort,
): MerchantSection[] {
  const filtered = filterMerchants([...merchants], searchQuery);

  const items: MerchantListItem[] = filtered.map((merchant) => {
    const detection = detections.get(merchant.payee) ?? null;
    const resolved = resolveRecurringVerdict(
      detection,
      overrideForPayee(merchant.payee),
    );
    return {
      merchant,
      resolved,
      inRecurringSection: resolved.isRecurring,
    };
  });

  const recurring = items
    .filter((item) => item.inRecurringSection)
    .map((item) => ({ ...item, inRecurringSection: true }));
  recurring.sort(compareRecurring);

  const itemsByPayee = new Map(
    items.map((item) => [item.merchant.payee, item] as const),
  );

  const general = sortMerchants(
    items.map((item) => item.merchant),
    sort,
  ).map((merchant) => {
    const item = itemsByPayee.get(merchant.payee)!;
    return { ...item, inRecurringSection: false };
  });

  const sections: MerchantSection[] = [];
  if (recurring.length > 0) {
    sections.push({
      key: "recurring",
      titleKey: "merchantsRecurringSection",
      data: recurring,
    });
  }
  if (general.length > 0) {
    sections.push({
      key: "all",
      titleKey: null,
      data: general,
    });
  }
  return sections;
}

function compareRecurring(a: MerchantListItem, b: MerchantListItem): number {
  const aOver = a.resolved.detection?.isOverdue ? 0 : 1;
  const bOver = b.resolved.detection?.isOverdue ? 0 : 1;
  if (aOver !== bOver) {
    return aOver - bOver;
  }
  const aNext = a.resolved.detection?.nextExpected ?? "9999-99-99";
  const bNext = b.resolved.detection?.nextExpected ?? "9999-99-99";
  const byNext = aNext.localeCompare(bNext);
  if (byNext !== 0) {
    return byNext;
  }
  return a.merchant.payee.localeCompare(b.merchant.payee);
}

/** Cadence label translation key for a resolved cadence. */
export function cadenceLabelKey(
  cadence: ResolvedCadence | null,
): string | null {
  if (!cadence) {
    return null;
  }
  switch (cadence) {
    case "weekly":
      return "merchantsCadenceWeekly";
    case "biweekly":
      return "merchantsCadenceBiweekly";
    case "monthly":
      return "merchantsCadenceMonthly";
    case "quarterly":
      return "merchantsCadenceQuarterly";
    case "yearly":
      return "merchantsCadenceYearly";
    case "irregular":
      return "merchantsCadenceIrregular";
    default:
      return null;
  }
}
