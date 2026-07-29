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

/**
 * Parse query result and generate ECharts configuration.
 */
export function parseQueryChart(result: QueryResultTable): ChartConfig | null {
  if (!canPlotQuery(result)) {
    return null;
  }

  const { types, rows } = result;
  const [firstType] = types;

  // Determine chart type based on first column
  const isDateBased = firstType.dtype === "date";
  const chartType = isDateBased ? "line" : "bar";

  // Extract data
  const categories: string[] = [];
  const values: number[] = [];

  rows.forEach((row) => {
    if (row.length >= 2) {
      const [category, value] = row;

      // Format category (date or string)
      let categoryStr = String(category);
      if (firstType.dtype === "date" && category) {
        categoryStr = String(category);
      }

      // Extract numeric value
      let numericValue = 0;
      if (typeof value === "number") {
        numericValue = value;
      } else if (typeof value === "object" && value !== null) {
        // Handle Inventory/Amount objects
        // Assuming the value object has a numeric property
        if ("number" in value && typeof value.number === "number") {
          numericValue = value.number;
        } else if ("value" in value && typeof value.value === "number") {
          numericValue = value.value;
        } else {
          // Try to extract first numeric value from object
          const numStr = JSON.stringify(value).match(/-?\d+\.?\d*/);
          if (numStr) {
            numericValue = parseFloat(numStr[0]);
          }
        }
      }

      categories.push(categoryStr);
      values.push(numericValue);
    }
  });

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: chartType === "line" ? "line" : "shadow",
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
    },
    series: [
      {
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
