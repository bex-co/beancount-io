import { useCallback, useState } from "react";
import {
  getCookie,
  setCookie,
} from "@/common/hooks/use-cookie-storage-state/cookie";
import type { ConversionOption } from "@/common/types/chart";

/** The conversion every report starts from until the reader picks another. */
const DEFAULT_REPORT_CONVERSION: ConversionOption = "at_cost";

const PRESENTATION_CONVERSIONS = new Set(["at_cost", "at_value", "units"]);

/** Kept across visits; a session cookie would forget the choice. */
const COOKIE_OPTIONS = { expires: 365, path: "/", sameSite: "lax" } as const;

/** Cookie holding one ledger's report conversion choice. */
export function reportConversionCookieKey(ledgerId: string): string {
  return `beancount.reportConversion.${encodeURIComponent(ledgerId)}`;
}

/**
 * A stored conversion applies only while the page still offers it: cost,
 * market value, units, or the ledger's own primary currency. Anything else — a
 * currency from an earlier operating-currency option, a hand-edited cookie —
 * falls back to the default rather than querying an option the page cannot
 * show.
 */
export function resolveReportConversion(
  stored: string | undefined,
  primaryCurrency: string,
): ConversionOption {
  if (
    stored &&
    (PRESENTATION_CONVERSIONS.has(stored) || stored === primaryCurrency)
  ) {
    return stored as ConversionOption;
  }
  return DEFAULT_REPORT_CONVERSION;
}

function readStoredConversion(ledgerId: string): string | undefined {
  try {
    return getCookie(reportConversionCookieKey(ledgerId));
  } catch {
    return undefined;
  }
}

/**
 * The conversion a report loader prefetches, so a server render queries the
 * same variables the page will. Loaders do not know the ledger's primary
 * currency, so a stored currency passes through and the page validates it; a
 * stale one only costs the prefetch.
 */
export function storedReportConversion(ledgerId: string): ConversionOption {
  const stored = readStoredConversion(ledgerId);
  return stored && /^[A-Za-z0-9_'.-]{1,24}$/.test(stored)
    ? (stored as ConversionOption)
    : DEFAULT_REPORT_CONVERSION;
}

/**
 * The ledger's report conversion, shared by every report page. Choosing one on
 * Balance Sheet is what Income Statement, Cash Flow, Trial Balance, and account
 * reports open with for the same ledger, and it survives a reload. The value
 * lives in a cookie, so server and client render the same choice.
 *
 * The cookie is read for the current ledger on every render rather than once,
 * so a report page that stays mounted across a ledger switch follows the new
 * ledger instead of carrying the old one's choice.
 */
export function useReportConversion(
  ledgerId: string,
  primaryCurrency: string,
): [ConversionOption, (value: ConversionOption) => void] {
  const [chosen, setChosen] = useState<{ ledgerId: string; value: string }>();

  const stored =
    chosen?.ledgerId === ledgerId
      ? chosen.value
      : readStoredConversion(ledgerId);

  const setConversion = useCallback(
    (value: ConversionOption) => {
      setChosen({ ledgerId, value });
      try {
        setCookie(reportConversionCookieKey(ledgerId), value, COOKIE_OPTIONS);
      } catch (error) {
        console.warn("Failed to persist the report conversion:", error);
      }
    },
    [ledgerId],
  );

  return [resolveReportConversion(stored, primaryCurrency), setConversion];
}
