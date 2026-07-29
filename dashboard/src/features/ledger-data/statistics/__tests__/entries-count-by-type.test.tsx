import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EntriesCountByType } from "../entries-count-by-type";
import * as apolloClient from "@apollo/client/react";
import type { GetLedgerEntriesCountPerTypeQuery } from "@/graphql/definitions";
import type { MockQueryResult } from "@/test/mocks/apollo";

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

// Mock Apollo Client
vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

// Type-safe mock function for useQuery
function mockUseQueryReturn(
  result: MockQueryResult<GetLedgerEntriesCountPerTypeQuery>,
): MockQueryResult<GetLedgerEntriesCountPerTypeQuery> {
  return result;
}

// Helper to create mock data with entries
function createEntriesMockData(
  entries: Array<{ type: string; number: number }>,
): MockQueryResult<GetLedgerEntriesCountPerTypeQuery> {
  return mockUseQueryReturn({
    data: {
      getLedgerEntriesCountPerType: entries.map((e) => ({
        __typename: "EntriesByType" as const,
        type: e.type,
        number: e.number,
      })),
    },
    loading: false,
    error: undefined,
  });
}

describe("EntriesCountByType", () => {
  it("should render with responsive table structure when data is loaded", () => {
    // Mock successful data query
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      createEntriesMockData([
        { type: "Transaction", number: 100 },
        { type: "Balance", number: 20 },
      ]),
    );

    const { container } = render(<EntriesCountByType ledgerId="test-id" />);

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
    expect(screen.getByText("Transaction")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
  });

  it("should render loading state with responsive skeleton", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: undefined,
        loading: true,
        error: undefined,
      }),
    );

    render(<EntriesCountByType ledgerId="test-id" />);

    // Verify loading state is rendered
    expect(screen.getByText("Loading entry statistics...")).toBeInTheDocument();
  });

  it("should render error state when query fails", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: undefined,
        loading: false,
        error: new Error("Query failed"),
      }),
    );

    render(<EntriesCountByType ledgerId="test-id" />);

    // Verify error state is rendered
    expect(
      screen.getByText("Failed to load entries statistics"),
    ).toBeInTheDocument();
  });

  describe("Card component removal refactoring", () => {
    it("should use div wrapper instead of Card component", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createEntriesMockData([{ type: "Transaction", number: 100 }]),
      );

      const { container } = render(<EntriesCountByType ledgerId="test-id" />);

      // Verify NO Card component is present
      const rootDiv = container.querySelector("div > div");
      expect(rootDiv).toBeInTheDocument();
      expect(rootDiv?.getAttribute("data-slot")).not.toBe("card");
    });

    it("should use h3 heading instead of CardTitle", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createEntriesMockData([{ type: "Transaction", number: 100 }]),
      );

      render(<EntriesCountByType ledgerId="test-id" />);

      const title = screen.getByText("Entries Count by Type");
      expect(title.tagName).toBe("H3");
      expect(title.className).toContain("font-semibold");
      expect(title.className).toContain("mb-2");
    });

    it("should use paragraph for description instead of CardDescription", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createEntriesMockData([{ type: "Transaction", number: 100 }]),
      );

      render(<EntriesCountByType ledgerId="test-id" />);

      const description = screen.getByText(/Total 100 entries across 1 types/);
      expect(description.tagName).toBe("P");
      expect(description.className).toContain("text-sm");
      expect(description.className).toContain("text-muted-foreground");
      expect(description.className).toContain("mb-4");
    });

    it("should not have CardHeader or CardContent wrappers", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createEntriesMockData([{ type: "Transaction", number: 100 }]),
      );

      const { container } = render(<EntriesCountByType ledgerId="test-id" />);

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

      render(<EntriesCountByType ledgerId="test-id" />);

      const title = screen.getByText("Entries Count by Type");
      expect(title.tagName).toBe("H3");

      const description = screen.getByText("Loading entry statistics...");
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

      render(<EntriesCountByType ledgerId="test-id" />);

      const errorTitle = screen.getByText("Error");
      expect(errorTitle.tagName).toBe("H3");

      const description = screen.getByText("Failed to load entries statistics");
      expect(description.tagName).toBe("P");
      expect(description.className).toContain("text-sm");
      expect(description.className).toContain("text-muted-foreground");
    });
  });
});
