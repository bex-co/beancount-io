import { createPersistentVar } from "@/common/apollo/persistent-var";
import type { RecurringOverride } from "@/screens/merchants-screen/selectors/resolve-recurring";

export type { RecurringOverride };

/**
 * Manual recurring / not-recurring choices for merchants, keyed by ledger then
 * payee. Device-local display preference (same class as theme/locale) — never
 * written to the ledger. Detection is pure derived state; an override always
 * beats it when present (see `resolveRecurringVerdict`).
 */

/** ledgerId → payee → override */
export type MerchantRecurringOverrides = Record<
  string,
  Record<string, RecurringOverride>
>;

export const [
  merchantRecurringOverridesVar,
  loadMerchantRecurringOverrides,
  flushMerchantRecurringOverrides,
] = createPersistentVar<MerchantRecurringOverrides>(
  "merchantRecurringOverrides",
  {},
);

export function setRecurringOverride(
  ledgerId: string,
  payee: string,
  override: RecurringOverride,
): void {
  const current = merchantRecurringOverridesVar();
  const forLedger = current[ledgerId] ?? {};
  merchantRecurringOverridesVar({
    ...current,
    [ledgerId]: {
      ...forLedger,
      [payee]: override,
    },
  });
}

export function clearRecurringOverride(ledgerId: string, payee: string): void {
  const current = merchantRecurringOverridesVar();
  const forLedger = current[ledgerId];
  if (!forLedger || !(payee in forLedger)) {
    return;
  }
  const nextLedger = { ...forLedger };
  delete nextLedger[payee];
  const next: MerchantRecurringOverrides = { ...current };
  if (Object.keys(nextLedger).length === 0) {
    delete next[ledgerId];
  } else {
    next[ledgerId] = nextLedger;
  }
  merchantRecurringOverridesVar(next);
}

export function overrideFor(
  overrides: MerchantRecurringOverrides,
  ledgerId: string,
  payee: string,
): RecurringOverride | null {
  return overrides[ledgerId]?.[payee] ?? null;
}

/**
 * Toggle helper for the merchant-view control: mark recurring when off,
 * mark not-recurring when detection would otherwise pin it, clear when the
 * user undoes a manual mark that matches detection.
 */
export function toggleRecurringOverride(
  ledgerId: string,
  payee: string,
  currentlyRecurring: boolean,
  detected: boolean,
): void {
  if (!currentlyRecurring) {
    setRecurringOverride(ledgerId, payee, "recurring");
    return;
  }
  if (detected) {
    setRecurringOverride(ledgerId, payee, "notRecurring");
    return;
  }
  clearRecurringOverride(ledgerId, payee);
}
