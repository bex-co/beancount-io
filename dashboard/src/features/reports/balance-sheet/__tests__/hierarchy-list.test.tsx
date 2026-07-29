import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HierarchyList } from "../hierarchy-list";
import type { SerializableTreeNode } from "@/graphql/definitions";

// Mock the ledger context hook
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerOwner: "alice", ledgerName: "book" }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: React.ComponentProps<"a"> & {
    to: string;
    params: Record<string, string>;
  }) => (
    <a
      href={Object.entries(params).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => v.toLocaleString(),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

describe("HierarchyList", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should render empty message when data is empty array", () => {
      render(<HierarchyList data={[]} />);

      expect(screen.getByText("No data available")).toBeInTheDocument();
    });

    it("should render empty message when data is null", () => {
      render(
        <HierarchyList data={null as unknown as SerializableTreeNode[]} />,
      );

      expect(screen.getByText("No data available")).toBeInTheDocument();
    });
  });

  describe("Basic rendering", () => {
    it("should render table header with column labels", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: 1000 },
        }),
      ];

      render(<HierarchyList data={data} />);

      expect(screen.getByText("common.accountColumn")).toBeInTheDocument();
      expect(screen.getByText("USD")).toBeInTheDocument();
      expect(screen.getByText("common.otherColumn")).toBeInTheDocument();
    });

    it("should render tree node with account name", () => {
      const data = [
        createNode({
          account: "Assets:Bank",
          balanceChildren: { USD: 1000 },
        }),
      ];

      render(<HierarchyList data={data} />);

      // Should show last part of account name
      expect(screen.getByText("Bank")).toBeInTheDocument();
    });

    it("should render multiple nodes", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: 1000 },
        }),
        createNode({
          account: "Liabilities",
          balanceChildren: { USD: 500 },
        }),
      ];

      render(<HierarchyList data={data} />);

      expect(screen.getByText("Assets")).toBeInTheDocument();
      expect(screen.getByText("Liabilities")).toBeInTheDocument();
    });
  });

  describe("Balance display", () => {
    it("should display primary currency balance", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: 1234.56 },
        }),
      ];

      render(<HierarchyList data={data} primaryCurrency="USD" />);

      expect(screen.getByText("1,234.56")).toBeInTheDocument();
    });

    it("should display dash for zero balance", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: 0 },
        }),
      ];

      render(<HierarchyList data={data} primaryCurrency="USD" />);

      // There are two dashes - one for primary currency and one for other column
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBe(2);
    });

    it("should display dash when balance is empty string", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: "" },
        }),
      ];

      render(<HierarchyList data={data} primaryCurrency="USD" />);

      // There are two dashes - one for primary currency and one for other column
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBe(2);
    });

    it("should use balanceChildren over balance", () => {
      const data = [
        createNode({
          account: "Assets",
          balance: { USD: 500 },
          balanceChildren: { USD: 1000 },
        }),
      ];

      render(<HierarchyList data={data} primaryCurrency="USD" />);

      // Should use balanceChildren value
      expect(screen.getByText("1,000")).toBeInTheDocument();
    });
  });

  describe("Other currencies column", () => {
    it("should display other currencies excluding primary", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: 1000, EUR: 800, GBP: 700 },
        }),
      ];

      render(<HierarchyList data={data} primaryCurrency="USD" />);

      expect(screen.getByText("EUR")).toBeInTheDocument();
      expect(screen.getByText("GBP")).toBeInTheDocument();
    });

    it("should show +N more when more than 3 other currencies", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: {
            USD: 1000,
            EUR: 800,
            GBP: 700,
            JPY: 100000,
            CHF: 900,
          },
        }),
      ];

      render(<HierarchyList data={data} primaryCurrency="USD" />);

      expect(screen.getByText(/\+1 more/)).toBeInTheDocument();
    });

    it("should display dash when no other currencies", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: 1000 },
        }),
      ];

      render(<HierarchyList data={data} primaryCurrency="USD" />);

      // Should have dash for other column
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  describe("Tree expansion", () => {
    it("should expand nodes by default", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: 1000 },
          children: [
            toChild(
              createNode({
                account: "Assets:Bank",
                balanceChildren: { USD: 500 },
              }),
            ),
          ],
        }),
      ];

      render(<HierarchyList data={data} />);

      // Child should be visible by default
      expect(screen.getByText("Bank")).toBeInTheDocument();
    });

    it("should toggle node expansion on click", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: 1000 },
          children: [
            toChild(
              createNode({
                account: "Assets:Bank",
                balanceChildren: { USD: 500 },
              }),
            ),
          ],
        }),
      ];

      render(<HierarchyList data={data} />);

      // Find the toggle button (chevron)
      const toggleButton = screen.getByRole("button");

      // Click to collapse
      fireEvent.click(toggleButton);

      // Child should no longer be visible
      expect(screen.queryByText("Bank")).not.toBeInTheDocument();

      // Click to expand again
      fireEvent.click(toggleButton);

      // Child should be visible again
      expect(screen.getByText("Bank")).toBeInTheDocument();
    });
  });

  describe("Account navigation", () => {
    it("should render the account name as a link to the account page", () => {
      const data = [
        createNode({
          account: "Assets:Bank",
          balanceChildren: { USD: 1000 },
        }),
      ];

      render(<HierarchyList data={data} />);

      expect(screen.getByRole("link", { name: "Bank" })).toHaveAttribute(
        "href",
        "/ledger/alice/book/account/Assets:Bank",
      );
    });
  });

  describe("Primary currency handling", () => {
    it("should use default USD as primary currency", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: 1000, EUR: 800 },
        }),
      ];

      render(<HierarchyList data={data} />);

      // USD column should show the USD value in header
      expect(screen.getByText("USD")).toBeInTheDocument();
    });

    it("should use specified primary currency", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: 1000, EUR: 800 },
        }),
      ];

      render(<HierarchyList data={data} primaryCurrency="EUR" />);

      // EUR should be in header
      expect(screen.getByText("EUR")).toBeInTheDocument();
    });
  });

  describe("Nested hierarchy", () => {
    it("should render deeply nested structure", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: 3000 },
          children: [
            toChild(
              createNode({
                account: "Assets:Bank",
                balanceChildren: { USD: 2000 },
                children: [
                  toChild(
                    createNode({
                      account: "Assets:Bank:Checking",
                      balanceChildren: { USD: 1000 },
                    }),
                  ),
                ],
              }),
            ),
          ],
        }),
      ];

      render(<HierarchyList data={data} />);

      expect(screen.getByText("Assets")).toBeInTheDocument();
      expect(screen.getByText("Bank")).toBeInTheDocument();
      expect(screen.getByText("Checking")).toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    it("should apply custom className", () => {
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: 1000 },
        }),
      ];

      const { container } = render(
        <HierarchyList data={data} className="custom-class" />,
      );

      // The scroll container should have the custom class
      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });
});
