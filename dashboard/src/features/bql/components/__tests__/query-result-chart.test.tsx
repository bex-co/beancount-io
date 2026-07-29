import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryResultChart } from "../query-result-chart";
import type { ChartConfig } from "../lib/chart-utils";

vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option, style }: any) => (
    <div
      data-testid="react-echarts"
      data-option={JSON.stringify(option)}
      style={style}
    />
  ),
}));

describe("QueryResultChart", () => {
  const mockChartConfig: ChartConfig = {
    type: "line",
    option: {
      xAxis: { data: ["2024-01"] },
      series: [{ data: [100] }],
    },
  };

  it("should render without error", () => {
    const { container } = render(
      <QueryResultChart chartConfig={mockChartConfig} />,
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it("should render the ReactECharts component", () => {
    render(<QueryResultChart chartConfig={mockChartConfig} />);

    expect(screen.getByTestId("react-echarts")).toBeInTheDocument();
  });

  it("should pass the option prop to ReactECharts", () => {
    render(<QueryResultChart chartConfig={mockChartConfig} />);

    const echartsEl = screen.getByTestId("react-echarts");
    const passedOption = JSON.parse(echartsEl.getAttribute("data-option")!);
    expect(passedOption).toEqual(mockChartConfig.option);
  });

  it("should apply height style to ReactECharts", () => {
    render(<QueryResultChart chartConfig={mockChartConfig} />);

    const echartsEl = screen.getByTestId("react-echarts");
    expect(echartsEl).toHaveStyle({ height: "400px", width: "100%" });
  });

  it("should have container div with correct max-height style", () => {
    const { container } = render(
      <QueryResultChart chartConfig={mockChartConfig} />,
    );

    const wrapperDiv = container.firstChild as HTMLElement;
    expect(wrapperDiv).toHaveStyle({ maxHeight: "400px" });
  });

  it("should have container div with w-full class", () => {
    const { container } = render(
      <QueryResultChart chartConfig={mockChartConfig} />,
    );

    const wrapperDiv = container.firstChild as HTMLElement;
    expect(wrapperDiv).toHaveClass("w-full");
  });
});
