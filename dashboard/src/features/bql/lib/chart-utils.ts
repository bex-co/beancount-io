import type { EChartsOption } from "echarts";
import type { QueryResultTable } from "@/graphql/definitions";

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
 */
export function decodeQueryChartValue(
  value: unknown,
  dtype: string,
): { amount: number; unit?: string } | null {
  if (dtype === "Decimal" || dtype === "int") {
    const amount = parseFiniteNumber(value);
    return amount === null ? null : { amount };
  }

  if (dtype !== "Inventory" && dtype !== "Amount") {
    return null;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    const amount = parseFiniteNumber(value);
    return amount === null ? null : { amount };
  }

  const record = value as Record<string, unknown>;

  if ("number" in record || "currency" in record || "value" in record) {
    const amount = parseFiniteNumber(record.number ?? record.value);
    if (amount === null) return null;
    const unit =
      typeof record.currency === "string" ? record.currency : undefined;
    return unit ? { amount, unit } : { amount };
  }

  const entries = Object.entries(record);
  if (entries.length === 0) {
    return { amount: 0 };
  }
  if (entries.length !== 1) {
    return null;
  }

  const [unit, raw] = entries[0];
  const amount = parseFiniteNumber(raw);
  return amount === null ? null : { amount, unit };
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
  }

  if (categories.length === 0) {
    return null;
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: chartType === "line" ? "line" : "shadow",
      },
      valueFormatter: seriesUnit
        ? (value) => `${value as number} ${seriesUnit}`
        : undefined,
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
    },
    series: [
      {
        name: seriesUnit,
        type: chartType,
        data: values,
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
