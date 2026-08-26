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

      // Top-level rows show the full account path
      expect(screen.getByText("Assets:Bank")).toBeInTheDocument();
      expect(screen.queryByText("Bank")).not.toBeInTheDocument();
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

    it("shows dashes for exact-decimal zeros in every currency", () => {
      // Totals keep "0.00"/"0" entries for currencies whose legs cancel out;
      // they read as "-" rather than "0 IRAUSD".
      const data = [
        createNode({
          account: "Assets",
          balanceChildren: { USD: "0.00", IRAUSD: "0", VACHR: "355" },
        }),
      ];

      render(<HierarchyList data={data} primaryCurrency="USD" />);

      expect(screen.getAllByText("-")).toHaveLength(1);
      expect(screen.queryByText("IRAUSD")).not.toBeInTheDocument();
      expect(screen.getByText("VACHR")).toBeInTheDocument();
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

      expect(screen.getByRole("link", { name: "Assets:Bank" })).toHaveAttribute(
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

  describe("declared role indicator (cash-flow rows)", () => {
    const withRoleSource = (
      node: SerializableTreeNode,
      roleSource: "declared" | "heuristic",
    ): SerializableTreeNode =>
      ({ ...node, roleSource }) as SerializableTreeNode;

    it("marks declared rows with the declared badge", () => {
      const data = [
        withRoleSource(
          createNode({
            account: "Expenses:Rent",
            balanceChildren: { USD: -1500 },
          }),
          "declared",
        ),
      ];

      render(<HierarchyList data={data} />);

      const badge = screen.getByText("page.cashFlow.declaredRoleBadge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute(
        "title",
        "page.cashFlow.declaredRoleTooltip",
      );
    });

    it("leaves heuristic rows unmarked", () => {
      const data = [
        withRoleSource(
          createNode({
            account: "Expenses:Rent",
            balanceChildren: { USD: -1500 },
          }),
          "heuristic",
        ),
      ];

      render(<HierarchyList data={data} />);

      expect(
        screen.queryByText("page.cashFlow.declaredRoleBadge"),
      ).not.toBeInTheDocument();
    });

    it("renders no badge for nodes without a role source", () => {
      const data = [
        createNode({
          account: "Assets:Bank",
          balanceChildren: { USD: 1000 },
        }),
      ];

      render(<HierarchyList data={data} />);

      expect(
        screen.queryByText("page.cashFlow.declaredRoleBadge"),
      ).not.toBeInTheDocument();
    });
  });

  describe("summary rows (plain totals below the tree)", () => {
    it("renders summary labels as plain text, not account links", () => {
      const data = [
        createNode({
          account: "Expenses:Rent",
          balanceChildren: { USD: -1500 },
        }),
      ];

      render(
        <HierarchyList
          data={data}
          summaryRows={[
            {
              label: "Operating Activities",
              balance: { USD: -1500 },
              bold: true,
            },
          ]}
        />,
      );

      // The tree row links to the real account; the summary label does not
      // link anywhere.
      expect(
        screen.getByRole("link", { name: "Expenses:Rent" }),
      ).toHaveAttribute("href", "/ledger/alice/book/account/Expenses:Rent");
      expect(screen.getByText("Operating Activities")).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Operating Activities" }),
      ).not.toBeInTheDocument();
      expect(screen.getAllByRole("link")).toHaveLength(1);
    });

    it("places summary rows below every tree row", () => {
      const { container } = render(
        <HierarchyList
          data={[
            createNode({
              account: "Expenses:Rent",
              balanceChildren: { USD: -1500 },
            }),
            createNode({
              account: "Income:Salary",
              balanceChildren: { USD: 5000 },
            }),
          ]}
          summaryRows={[
            { label: "Operating Activities", balance: { USD: 3500 } },
          ]}
        />,
      );

      const text = container.textContent ?? "";
      const totalAt = text.indexOf("Operating Activities");
      expect(totalAt).toBeGreaterThan(text.indexOf("Expenses:Rent"));
      expect(totalAt).toBeGreaterThan(text.indexOf("Income:Salary"));
    });

    it("emphasizes bold summary rows only", () => {
      render(
        <HierarchyList
          data={[]}
          summaryRows={[
            { label: "Opening", balance: { USD: 1000 } },
            { label: "Net change", balance: { USD: 250 }, bold: true },
          ]}
        />,
      );

      expect(
        screen.getByText("Net change").closest(".font-semibold"),
      ).not.toBeNull();
      expect(screen.getByText("Opening").closest(".font-semibold")).toBeNull();
    });

    it("formats summary amounts through the same columns as tree rows", () => {
      render(
        <HierarchyList
          data={[
            createNode({
              account: "Assets:Bank",
              balanceChildren: { USD: 1000 },
            }),
          ]}
          primaryCurrency="USD"
          summaryRows={[
            { label: "Empty section total", balance: {} },
            {
              label: "Multi-currency total",
              balance: { USD: 250.5, EUR: 100 },
            },
          ]}
        />,
      );

      // Dashes: the tree row's other column, and both columns of the empty
      // summary row.
      expect(screen.getAllByText("-")).toHaveLength(3);
      // Primary-currency amount and other-currency amount both render.
      expect(screen.getByText("250.5")).toBeInTheDocument();
      expect(screen.getByText("EUR")).toBeInTheDocument();
    });

    it("renders the header and summary rows when the tree is empty", () => {
      render(
        <HierarchyList
          data={[]}
          summaryRows={[{ label: "Financing Activities", balance: {} }]}
        />,
      );

      expect(screen.getByText("Financing Activities")).toBeInTheDocument();
      expect(screen.queryByText("No data available")).not.toBeInTheDocument();
      expect(screen.getByText("common.accountColumn")).toBeInTheDocument();
    });
  });
});
