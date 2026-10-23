import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Text a reader gets from a rendered Budget card. Each test file keeps its own
 * `react-echarts` mock, which captures the chart option passed in here.
 */
export const valueAfter = (label: string) =>
  screen.getByText(label, { selector: "p" }).nextElementSibling?.textContent;

export const variance = () =>
  screen
    .getByText("Variance", { selector: "p" })
    .parentElement?.nextElementSibling?.textContent?.replace(/\s+/g, " ");

/** Open Period data and return its body rows as cell text. */
export async function periodRows() {
  await userEvent.setup().click(screen.getByText("Period data"));
  const table = screen.getByRole("table", { name: /Period data$/ });
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent?.replace(/\s+/g, " ").trim()),
    );
}

type ChartOption = {
  series?: Array<{ name: string; data: number[] }>;
  tooltip?: { formatter?: (params: unknown) => string };
};

/** The tooltip over the last period, with the params ECharts passes. */
export function lastTooltip(option: ChartOption, date: string) {
  return option.tooltip!.formatter!(
    option.series!.map((series, seriesIndex) => ({
      name: date,
      seriesName: series.name,
      seriesIndex,
      dataIndex: series.data.length - 1,
      value: series.data.at(-1),
      color: "#000",
    })),
  )
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
