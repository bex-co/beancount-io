import { useLedgerGuard } from "@/components/ledger-guard";
import { useLedgerReadContextQuery } from "@/generated-graphql/graphql";
import { ledgerPrimaryCurrency } from "../currency-util";

/**
 * The guarded ledger's primary currency, read from the cache the `LedgerGuard`
 * already filled, so a list of rows adds no requests: its first
 * `operating_currency`, else the ledger's own commodity (w21/415), as the
 * headlines and the merchant header read it. Rows read only the option, so in
 * a ledger without one a USD row said "−$60.00" under a header that read USD
 * by code against the ledger's CAD (w21/732). Undefined until that read lands.
 */
export function useOperatingCurrency(): string | undefined {
  const ledgerId = useLedgerGuard();
  const { data } = useLedgerReadContextQuery({
    variables: { ledgerId },
    fetchPolicy: "cache-only",
  });
  const ledger = data?.getLedger;
  return ledger
    ? ledgerPrimaryCurrency(
        ledger.options.operatingCurrency,
        ledger.attributes.currencies ?? [],
      )
    : undefined;
}
