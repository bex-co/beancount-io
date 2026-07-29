import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HierarchyTreeMap } from "../hierarchy-tree-map";
import type { SerializableTreeNode } from "@/graphql/definitions";

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

// Mock ReactECharts to avoid canvas rendering
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: unknown }) => (
    <div data-testid="react-echarts" data-option={JSON.stringify(option)}>
      Mocked Chart
    </div>
  ),
}));

describe("HierarchyTreeMap", () => {
  // Helper function to create test nodes
  const createNode = (
    overrides: Partial<SerializableTreeNode>,
  ): SerializableTreeNode => ({
    __typename: "SerializableTreeNode",
    account: "TestAccount",
    balance: {},
    balanceChildren: {},
    cost: null,
    costChildren: null,
    children: [],
    hasTxns: false,
    ...overrides,
  });

  // Type-safe helper to convert SerializableTreeNode to children array format
  const toChild = (node: SerializableTreeNode): Record<string, unknown> =>
    node as unknown as Record<string, unknown>;

  describe("Empty state", () => {
    it("should render no data message when data is null", () => {
      render(
        <HierarchyTreeMap
          data={null as unknown as SerializableTreeNode}
          title="Test"
        />,
      );

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.title.text).toBe("No Data Available");
    });

    it("should render empty message when total value is 0", () => {
      const emptyData = createNode({
        account: "Assets",
        balanceChildren: { USD: 0 },
      });

      render(<HierarchyTreeMap data={emptyData} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.title.text).toBe("Chart is empty.");
    });
  });

  describe("Basic rendering", () => {
    it("should render chart with title", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1000 },
      });

      render(<HierarchyTreeMap data={data} title="Assets Overview" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.title.text).toBe("Assets Overview");
    });

    it("should render treemap series", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1000 },
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].type).toBe("treemap");
    });
  });

  describe("Value calculation", () => {
    it("should use balanceChildren for value calculation", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1500 },
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].data[0].value).toBe(1500);
    });

    it("should handle multiple currencies by using only specified currency", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1000, EUR: 800 },
      });

      render(<HierarchyTreeMap data={data} title="Test" currency="USD" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // Should only use USD value
      expect(option.series[0].data[0].value).toBe(1000);
    });
  });

  describe("Inverse mode", () => {
    it("should negate values when inverse is true", () => {
      const data = createNode({
        account: "Liabilities",
        balanceChildren: { USD: 500 },
      });

      render(<HierarchyTreeMap data={data} title="Test" inverse />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].data[0].value).toBe(-500);
    });

    it("should not negate values when inverse is false", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 500 },
      });

      render(<HierarchyTreeMap data={data} title="Test" inverse={false} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].data[0].value).toBe(500);
    });
  });

  describe("Hierarchical data", () => {
    it("should render nested structure", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 3000 },
        children: [
          toChild(
            createNode({
              account: "Assets:Bank",
              balanceChildren: { USD: 2000 },
            }),
          ),
          toChild(
            createNode({
              account: "Assets:Investments",
              balanceChildren: { USD: 1000 },
            }),
          ),
        ],
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // Should have children in the treemap data
      expect(option.series[0].data[0].children).toHaveLength(2);
    });

    it("should preserve account names in treemap data", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 2000 },
        children: [
          toChild(
            createNode({
              account: "Assets:Bank",
              balanceChildren: { USD: 1000 },
            }),
          ),
        ],
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].data[0].name).toBe("Assets");
      expect(option.series[0].data[0].children[0].name).toBe("Assets:Bank");
    });
  });

  describe("Color assignment", () => {
    it("should assign colors to tree nodes", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1000 },
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].data[0].itemStyle.color).toBeDefined();
    });
  });

  describe("Chart configuration", () => {
    it("should enable animation", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1000 },
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.animation).toBe(true);
      expect(option.animationDuration).toBe(1000);
    });

    it("should configure tooltip", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1000 },
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.tooltip.trigger).toBe("item");
    });

    it("should configure zoom on node click", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1000 },
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].nodeClick).toBe("zoomToNode");
    });

    it("should hide breadcrumb navigation", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1000 },
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].breadcrumb.show).toBe(false);
    });
  });

  describe("Currency handling", () => {
    it("should use USD by default", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1000, EUR: 800 },
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // Default currency is USD
      expect(option.series[0].data[0].value).toBe(1000);
    });

    it("should use specified currency", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1000, EUR: 800 },
      });

      render(<HierarchyTreeMap data={data} title="Test" currency="EUR" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].data[0].value).toBe(800);
    });
  });

  describe("className prop", () => {
    it("should apply className to container", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1000 },
      });

      const { container } = render(
        <HierarchyTreeMap data={data} title="Test" className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("Edge cases", () => {
    it("should handle string balance values", () => {
      // Note: Testing edge case where balance value comes as string from GraphQL
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: "1500.50" },
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].data[0].value).toBe(1500.5);
    });

    it("should handle empty children array", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 1000 },
        children: [],
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].data[0].children).toBeUndefined();
    });

    it("should handle deeply nested structures", () => {
      const data = createNode({
        account: "Assets",
        balanceChildren: { USD: 10000 },
        children: [
          toChild(
            createNode({
              account: "Assets:Bank",
              balanceChildren: { USD: 5000 },
              children: [
                toChild(
                  createNode({
                    account: "Assets:Bank:Checking",
                    balanceChildren: { USD: 3000 },
                    children: [
                      toChild(
                        createNode({
                          account: "Assets:Bank:Checking:Main",
                          balanceChildren: { USD: 2000 },
                        }),
                      ),
                    ],
                  }),
                ),
              ],
            }),
          ),
        ],
      });

      render(<HierarchyTreeMap data={data} title="Test" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // Should have nested children
      expect(
        option.series[0].data[0].children[0].children[0].children,
      ).toHaveLength(1);
    });
  });
});
