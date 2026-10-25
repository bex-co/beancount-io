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
  // ECharts rounds nice ticks to 20 fractional places, so a series around
  // 1e-24 gets an out-of-range 0 tick. Plot such series scaled up by a power
  // of ten and label ticks in true source units instead (w4/1067).
  const maxAbs = Math.max(
    0,
    ...numericPrices.filter((value) => Number.isFinite(value)).map(Math.abs),
  );
  const scale =
    maxAbs > 0 && maxAbs < 1e-18 ? 10 ** -Math.floor(Math.log10(maxAbs)) : 1;
  const chartData = prices.map(
    (point) =>
      [point.date, parseFloat(point.value) * scale] as [string, number],
  );
  const dates = prices.map((point) => point.date);

  const formatTooltip = (dateStr: string): string => {
    const rawPrice = priceByDate.get(dateStr);
    if (rawPrice === undefined) return "";
    return `${formatDate(dateStr)}<br/>${pairLabel}: ${formatCommodityPriceLabel(rawPrice)}`;
  };

  const formatAxisTick = (value: number): string =>
    formatCommodityAxisTick(value / scale, numericPrices);

  return { dates, chartData, numericPrices, formatTooltip, formatAxisTick };
}
