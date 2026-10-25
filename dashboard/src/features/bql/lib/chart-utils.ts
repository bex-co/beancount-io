import type { EChartsOption } from "echarts";
import type { QueryResultTable } from "@/graphql/definitions";
import { CONFINED_TOOLTIP } from "@/common/lib/chart/tooltip";

export interface ChartConfig {
  type: "line" | "bar";
  option: EChartsOption;
}

/**
 * Detect if query results can be visualized as a chart.
 * Following Fava's logic: 2 columns, first is date/string, second is numeric.
 */
export function canPlotQuery(result: QueryResultTable): boolean {
  const { types } = result;

  if (!types || types.length !== 2) {
    return false;
  }

  const [firstType, secondType] = types;

  // First column should be date or string
  const firstIsDateOrString =
    firstType.dtype === "date" || firstType.dtype === "str";

  // Second column should be numeric or inventory
  const secondIsNumeric =
    secondType.dtype === "Decimal" ||
    secondType.dtype === "int" ||
    secondType.dtype === "Inventory" ||
    secondType.dtype === "Amount";

  return firstIsDateOrString && secondIsNumeric;
}

/** The cell's own decimal text — what a tooltip should say, not the float. */
function sourceText(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value);
}

/** Parse a JSON number or decimal string into a finite number. */
export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Decode a BQL chart cell using the shell wire contract:
 * - Decimal/int: JSON number or decimal string
 * - Inventory/Amount: single-currency map `{ UNIT: "1.23" }`, or legacy
 *   `{ number, currency }` Amount objects
 *
 * Multi-unit maps and unparseable cells return null so the chart is omitted.
 * `text` keeps the source decimal: `amount` is a float for plotting and can
 * lose digits a ledger value really has (w4/254).
 */
export function decodeQueryChartValue(
  value: unknown,
  dtype: string,
): { amount: number; text: string; unit?: string } | null {
  if (dtype === "Decimal" || dtype === "int") {
    const amount = parseFiniteNumber(value);
    return amount === null ? null : { amount, text: sourceText(value) };
  }

  if (dtype !== "Inventory" && dtype !== "Amount") {
    return null;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    const amount = parseFiniteNumber(value);
    return amount === null ? null : { amount, text: sourceText(value) };
  }

  const record = value as Record<string, unknown>;

  if ("number" in record || "currency" in record || "value" in record) {
    const raw = record.number ?? record.value;
    const amount = parseFiniteNumber(raw);
    if (amount === null) return null;
    const text = sourceText(raw);
    const unit =
      typeof record.currency === "string" ? record.currency : undefined;
    return unit ? { amount, text, unit } : { amount, text };
  }

  const entries = Object.entries(record);
  if (entries.length === 0) {
    return { amount: 0, text: "0" };
  }
  if (entries.length !== 1) {
    return null;
  }

  const [unit, raw] = entries[0];
  const amount = parseFiniteNumber(raw);
  return amount === null ? null : { amount, text: sourceText(raw), unit };
}

/**
 * Below this, a series is plotted scaled. ECharts still draws 1e-18 (the
 * extent needs 19 decimals) and collapses from about 1e-20; series down to
 * here keep their plain axis.
 */
const SMALLEST_UNSCALED = 1e-15;

/**
 * The power of ten a series is plotted in, or 0 to plot it as is. ECharts
 * rounds an automatic axis extent to 20 decimals, so a series whose values
 * are all smaller than about 1e-19 collapses to [0, 0]: zero-height bars and
 * a flat line (w4/1049). Such a series is plotted scaled by `10^-exponent`.
 */
function displayExponent(values: readonly number[]): number {
  // A supported result can hold more points than the runtime accepts as
  // spread arguments; fold instead of expanding every point (w4/1076).
  let largest = 0;
  for (const value of values) {
    const magnitude = Math.abs(value);
    if (magnitude > largest) largest = magnitude;
  }
  return largest > 0 && largest < SMALLEST_UNSCALED
    ? Math.floor(Math.log10(largest))
    : 0;
}

/**
 * Parse query result and generate ECharts configuration.
 * Returns null when the result shape is unplottable or any value cannot be
 * decoded without inventing a number (multi-unit, missing, malformed).
 */
export function parseQueryChart(result: QueryResultTable): ChartConfig | null {
  if (!canPlotQuery(result)) {
    return null;
  }

  const { types, rows } = result;
  const [firstType, secondType] = types;

  const isDateBased = firstType.dtype === "date";
  const chartType = isDateBased ? "line" : "bar";

  const categories: string[] = [];
  const values: number[] = [];
  // Each point's source decimal, by index, so a repeated category label
  // never borrows another row's text.
  const texts: string[] = [];
  let seriesUnit: string | undefined;

  for (const row of rows) {
    if (row.length < 2) {
      return null;
    }

    const [category, value] = row;
    const decoded = decodeQueryChartValue(value, secondType.dtype);
    if (decoded === null) {
      return null;
    }

    if (decoded.unit) {
      if (seriesUnit === undefined) {
        seriesUnit = decoded.unit;
      } else if (seriesUnit !== decoded.unit) {
        return null;
      }
    }

    categories.push(String(category ?? ""));
    values.push(decoded.amount);
    texts.push(decoded.text);
  }

  if (categories.length === 0) {
    return null;
  }

  // A tiny series is drawn in a power of ten its ticks name ("2e-24"); the
  // tooltip still says each row's exact decimal.
  const exponent = displayExponent(values);
  const plotted =
    exponent === 0 ? values : values.map((value) => value * 10 ** -exponent);

  const option: EChartsOption = {
    tooltip: {
      ...CONFINED_TOOLTIP,
      trigger: "axis",
      axisPointer: {
        type: chartType === "line" ? "line" : "shadow",
      },
      // Say the source value; the plotted float may have dropped digits.
      valueFormatter: (value, dataIndex) => {
        const text = texts[dataIndex] ?? String(value);
        return seriesUnit ? `${text} ${seriesUnit}` : text;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: categories,
      boundaryGap: chartType === "bar",
    },
    yAxis: {
      type: "value",
      name: seriesUnit,
      ...(exponent === 0
        ? {}
        : {
            axisLabel: {
              formatter: (tick: number) =>
                tick === 0
                  ? "0"
                  : `${Number(tick.toPrecision(12))}e${exponent}`,
            },
          }),
    },
    series: [
      {
        name: seriesUnit,
        type: chartType,
        data: plotted,
        smooth: chartType === "line",
        areaStyle: chartType === "line" ? {} : undefined,
      },
    ],
  };

  return {
    type: chartType,
    option,
  };
}
