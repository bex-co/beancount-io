import type { CommodityPairWithPrices } from "@/graphql/definitions";

/**
 * How a commodity pair is written on screen.
 *
 * One definition, because the price-history table takes its accessible name
 * from this string while the card renders it as the visible title: if the two
 * were spelled out separately, a change to one would silently give the table a
 * name that no longer matches what the reader sees.
 */
export function commodityPairLabel(
  commodity: Pick<CommodityPairWithPrices, "base" | "quote">,
): string {
  return `${commodity.base}/${commodity.quote}`;
}
