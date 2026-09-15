import type { MerchantSort } from "./selectors/aggregate-payees";

/**
 * Translation key for the Merchants sort button's accessible name.
 *
 * An icon-only button is named for what activating it does, so it names the
 * *other* order: while the list is sorted by count, the button reads "Sort
 * alphabetically". The icon deliberately keeps showing the order already
 * applied, so the icon and the name describe different things.
 */
export function merchantsSortButtonLabelKey(
  sort: MerchantSort,
): "merchantsSortAlphabetical" | "merchantsSortByCount" {
  return sort === "count"
    ? "merchantsSortAlphabetical"
    : "merchantsSortByCount";
}
