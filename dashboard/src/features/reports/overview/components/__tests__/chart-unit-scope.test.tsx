/**
 * The unit disclosure, and the shape of the component that carries it.
 *
 * The note first shipped as a bare fragment beside the chart. Both
 * distribution charts are cells of a two-column grid, so that made the note a
 * cell of its own and pushed the Liabilities card onto the next row — a
 * regression no test caught, because nothing asserted the component's root.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChartUnitScope } from "../chart-unit-scope";
import { DistributionChart } from "../distribution-chart";

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

describe("DistributionChart layout", () => {
  const mixed = {
    account: "Assets",
    balance: null,
    children: [
      { account: "Assets:Cash", balance: { USD: 100 }, children: [] },
      { account: "Assets:Vacation", balance: { VACHR: 25 }, children: [] },
    ],
  };

  it("occupies exactly one element, note included", () => {
    // Its call sites are children of `grid grid-cols-1 lg:grid-cols-2`, so a
    // second root would take the neighbouring card's column.
    const { container } = render(
      <DistributionChart title="Assets" data={mixed} />,
    );
    expect(container.children).toHaveLength(1);
    expect(
      screen.getByText(/Balances in VACHR are not included/),
    ).toBeInTheDocument();
    // And the note is inside that same root, not a sibling of it.
    expect(container.firstElementChild?.textContent).toMatch(
      /Balances in VACHR are not included/,
    );
  });

  it("still occupies one element when nothing is omitted", () => {
    const { container } = render(
      <DistributionChart
        title="Liabilities"
        data={{
          account: "Liabilities",
          balance: null,
          children: [
            {
              account: "Liabilities:Slate",
              balance: { USD: 1768.88 },
              children: [],
            },
          ],
        }}
      />,
    );
    expect(container.children).toHaveLength(1);
    expect(screen.queryByText(/are not included/)).not.toBeInTheDocument();
  });
});
