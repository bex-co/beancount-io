import { merchantKey } from "../../../common/merchant-key";
import type { MerchantAggregate } from "../../merchants-screen/selectors/aggregate-payees";

/**
 * The spellings the detail reads by: those of the directory row its payee now
 * belongs to, else the ones it was opened with (rollup not loaded, or the
 * payee gone). Kept from the route, an edit that recased the payee left the
 * detail on its old spelling, so it read "1 transaction · $4.00" while
 * Merchants counted 2 (w21/724). The same list comes back as the same array,
 * so the detail's queries are not asked again for nothing.
 */
export function merchantSpellings(
  opened: readonly string[],
  merchants: readonly MerchantAggregate[],
): readonly string[] {
  const key = merchantKey(opened[0] ?? "");
  const row = merchants.find((merchant) => merchantKey(merchant.payee) === key);
  if (!row) return opened;
  const current = [row.payee, ...(row.otherSpellings ?? [])];
  const same =
    current.length === opened.length &&
    current.every((spelling) => opened.includes(spelling));
  return same ? opened : current;
}
