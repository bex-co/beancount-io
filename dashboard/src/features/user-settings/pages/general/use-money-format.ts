import { useCallback } from "react";
import { useTranslations } from "@/common/hooks/use-translations";

/** Stripe amounts are in the currency's minor unit; this is the major unit. */
export function majorUnits(amount: number, currency: string): number {
  const digits =
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).resolvedOptions().maximumFractionDigits ?? 2;
  return amount / 10 ** digits;
}

/**
 * Formats an amount in the currency's minor unit in the **app** language,
 * like `useFormatCount` does for counts.
 */
export function useMoneyFormat(): (cents: number, currency?: string) => string {
  const { i18n } = useTranslations();
  const language = i18n.language;
  return useCallback(
    (cents: number, currency = "usd") =>
      new Intl.NumberFormat(language, {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(majorUnits(cents, currency)),
    [language],
  );
}

/** Formats a billing date in the app language, e.g. "Oct 17, 2027". */
export function useBillingDateFormat(): (value: string | Date) => string {
  const { i18n } = useTranslations();
  const language = i18n.language;
  return useCallback(
    (value: string | Date) =>
      new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(
        new Date(value),
      ),
    [language],
  );
}
