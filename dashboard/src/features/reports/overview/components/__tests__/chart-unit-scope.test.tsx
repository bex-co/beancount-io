/** The unit disclosure under a chart drawn in one unit. */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChartUnitScope } from "../chart-unit-scope";

vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => <div data-testid="chart" />,
  default: () => <div data-testid="chart" />,
}));
vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (value: number) => String(value),
}));

describe("ChartUnitScope", () => {
  it("names the units the chart is not showing", () => {
    render(<ChartUnitScope unit="USD" units={["IRAUSD", "USD", "VACHR"]} />);
    expect(
      screen.getByText(/Balances in IRAUSD, VACHR are not included/),
    ).toBeInTheDocument();
    expect(screen.getByText(/shown in USD/)).toBeInTheDocument();
  });

  it("renders nothing when every unit is accounted for", () => {
    const { container } = render(<ChartUnitScope unit="USD" units={["USD"]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is no unit at all", () => {
    const { container } = render(<ChartUnitScope unit={null} units={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
