import {
  formatCommodityAxisTick,
  formatCommodityPriceLabel,
} from "./format-commodity-price";

export type CommodityPricePoint = {
  date: string;
  value: string;
};

/**
 * Shared chart label plumbing for CommodityChart tooltips and y-axis ticks.
 * Keeps source decimal strings for display while plotting with numbers.
 */
export function buildCommodityChartLabels(
  prices: CommodityPricePoint[],
  pairLabel: string,
  formatDate: (date: string) => string,
) {
  const priceByDate = new Map(prices.map((point) => [point.date, point.value]));
  const numericPrices = prices.map((point) => parseFloat(point.value));
  const chartData = prices.map((point) => [
    point.date,
    parseFloat(point.value),
  ] as [string, number]);
  const dates = prices.map((point) => point.date);

  const formatTooltip = (dateStr: string): string => {
    const rawPrice = priceByDate.get(dateStr);
    if (rawPrice === undefined) return "";
    return `${formatDate(dateStr)}<br/>${pairLabel}: ${formatCommodityPriceLabel(rawPrice)}`;
  };

  const formatAxisTick = (value: number): string =>
    formatCommodityAxisTick(value, numericPrices);

  return { dates, chartData, numericPrices, formatTooltip, formatAxisTick };
}
