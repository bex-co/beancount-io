import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountLastEntries } from "../account-last-entries";
import * as apolloClient from "@apollo/client/react";
import type { GetLedgerAccountLastEntriesQuery } from "@/graphql/definitions";
import type { MockQueryResult } from "@/test/mocks/apollo";

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: "test-id" }),
}));

// Mock Apollo Client
vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

// Type-safe mock function for useQuery
function mockUseQueryReturn(
  result: MockQueryResult<GetLedgerAccountLastEntriesQuery>,
): MockQueryResult<GetLedgerAccountLastEntriesQuery> {
  return result;
}

// Helper to create mock data with account entries
function createAccountEntriesMockData(
  entries: Array<{
    account: string;
    date: string;
    balance: Record<string, unknown>;
  }>,
): MockQueryResult<GetLedgerAccountLastEntriesQuery> {
  return mockUseQueryReturn({
    data: {
      getLedgerAccountLastEntries: entries.map((e) => ({
        __typename: "AccountLastEntry" as const,
        account: e.account,
        date: e.date,
        balance: e.balance,
      })),
    },
    loading: false,
    error: undefined,
  });
}

describe("AccountLastEntries", () => {
  it("should render with responsive table structure when data is loaded", () => {
    // Mock successful data query
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      createAccountEntriesMockData([
        {
          account: "Assets:Bank:Checking",
          date: "2025-10-18",
          balance: { USD: "1000.00" },
        },
        {
          account: "Expenses:Food",
          date: "2025-10-17",
          balance: { USD: "500.00" },
        },
      ]),
    );

    const { container } = render(<AccountLastEntries ledgerId="test-id" />);

    // Verify the responsive wrapper structure exists
    const overflowContainer = container.querySelector(
      ".overflow-hidden .overflow-x-auto",
    );
    expect(overflowContainer).toBeInTheDocument();

    // Verify table headers have whitespace-nowrap
    const headers = screen.getAllByRole("columnheader");
    headers.forEach((header) => {
      expect(header.className).toContain("whitespace-nowrap");
    });

    // Verify data is rendered
    expect(screen.getByText("Assets:Bank:Checking")).toBeInTheDocument();
    expect(screen.getByText("Expenses:Food")).toBeInTheDocument();
  });

  it("should render loading state with responsive skeleton", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: undefined,
        loading: true,
        error: undefined,
      }),
    );

    render(<AccountLastEntries ledgerId="test-id" />);

    // Verify loading state is rendered
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });

  it("should render error state when query fails", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: undefined,
        loading: false,
        error: new Error("Query failed"),
      }),
    );

    render(<AccountLastEntries ledgerId="test-id" />);

    // Verify error state is rendered
    expect(
      screen.getByText("Failed to load account entries"),
    ).toBeInTheDocument();
  });

  describe("Card component removal refactoring", () => {
    it("should use div wrapper instead of Card component", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createAccountEntriesMockData([
          {
            account: "Assets:Bank:Checking",
            date: "2025-10-18",
            balance: { USD: "1000.00" },
          },
        ]),
      );

      const { container } = render(<AccountLastEntries ledgerId="test-id" />);

      // Verify NO Card component is present (Card components would have specific data attributes or classes)
      // Card components typically have classes like "rounded-lg", "border", "shadow-sm" together
      const rootDiv = container.querySelector("div > div");
      expect(rootDiv).toBeInTheDocument();

      // Ensure it's a simple div, not a Card
      expect(rootDiv?.getAttribute("data-slot")).not.toBe("card");
    });

    it("should use h3 heading instead of CardTitle", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createAccountEntriesMockData([
          {
            account: "Assets:Bank:Checking",
            date: "2025-10-18",
            balance: { USD: "1000.00" },
          },
        ]),
      );

      render(<AccountLastEntries ledgerId="test-id" />);

      // Find the title element
      const title = screen.getByText("Account Last Entries");

      // Verify it's an h3 element, not a CardTitle component
      expect(title.tagName).toBe("H3");
      expect(title.className).toContain("font-semibold");
      expect(title.className).toContain("mb-2");
    });

    it("should use paragraph for description instead of CardDescription", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createAccountEntriesMockData([
          {
            account: "Assets:Bank:Checking",
            date: "2025-10-18",
            balance: { USD: "1000.00" },
          },
        ]),
      );

      render(<AccountLastEntries ledgerId="test-id" />);

      // Find the description paragraph
      const description = screen.getByText(
        /Last entry date and balance for 1 Accounts/,
      );

      // Verify it's a p element, not a CardDescription component
      expect(description.tagName).toBe("P");
      expect(description.className).toContain("text-sm");
      expect(description.className).toContain("text-muted-foreground");
      expect(description.className).toContain("mb-4");
    });

    it("should not have CardHeader or CardContent wrappers", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createAccountEntriesMockData([
          {
            account: "Assets:Bank:Checking",
            date: "2025-10-18",
            balance: { USD: "1000.00" },
          },
        ]),
      );

      const { container } = render(<AccountLastEntries ledgerId="test-id" />);

      // Verify no elements with card-header or card-content data attributes
      expect(
        container.querySelector('[data-slot="card-header"]'),
      ).not.toBeInTheDocument();
      expect(
        container.querySelector('[data-slot="card-content"]'),
      ).not.toBeInTheDocument();
    });

    it("should maintain consistent structure in loading state", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        mockUseQueryReturn({
          data: undefined,
          loading: true,
          error: undefined,
        }),
      );

      render(<AccountLastEntries ledgerId="test-id" />);

      // Verify h3 title in loading state
      const title = screen.getByText("Account Last Entries");
      expect(title.tagName).toBe("H3");

      // Verify p description in loading state
      const description = screen.getByText("Loading data...");
      expect(description.tagName).toBe("P");
      expect(description.className).toContain("text-sm");
      expect(description.className).toContain("text-muted-foreground");
    });

    it("should maintain consistent structure in error state", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        mockUseQueryReturn({
          data: undefined,
          loading: false,
          error: new Error("Query failed"),
        }),
      );

      render(<AccountLastEntries ledgerId="test-id" />);

      // Verify h3 title in error state
      const errorTitle = screen.getByText("Error");
      expect(errorTitle.tagName).toBe("H3");

      // Verify p description in error state
      const description = screen.getByText("Failed to load account entries");
      expect(description.tagName).toBe("P");
      expect(description.className).toContain("text-sm");
      expect(description.className).toContain("text-muted-foreground");
    });
  });
});
