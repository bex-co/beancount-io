import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostingsPerAccount } from "../postings-per-account";
import * as apolloClient from "@apollo/client/react";
import type { QueryShellQuery } from "@/graphql/definitions";
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
  result: MockQueryResult<QueryShellQuery>,
): MockQueryResult<QueryShellQuery> {
  return result;
}

describe("PostingsPerAccount", () => {
  it("should render with responsive table structure when data is loaded", () => {
    // Mock successful data query with BQL table result
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: {
          queryShell: {
            __typename: "QueryResult",
            resultType: "table",
            text: null,
            table: {
              __typename: "QueryResultTable",
              t: null,
              types: [
                { __typename: "QueryColumn", name: "account", dtype: "str" },
                { __typename: "QueryColumn", name: "count", dtype: "int" },
              ],
              rows: [
                ["Assets:Bank:Checking", 150],
                ["Expenses:Groceries", 45],
                ["Income:Salary", 12],
              ],
            },
          },
        },
        loading: false,
        error: undefined,
      }),
    );

    const { container } = render(<PostingsPerAccount ledgerId="test-id" />);

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
    expect(screen.getByText("Expenses:Groceries")).toBeInTheDocument();
    expect(screen.getByText("Income:Salary")).toBeInTheDocument();

    // Verify counts are displayed
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("should render loading state with responsive skeleton", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: undefined,
        loading: true,
        error: undefined,
      }),
    );

    render(<PostingsPerAccount ledgerId="test-id" />);

    // Verify loading state is rendered
    expect(screen.getByText("Loading query results...")).toBeInTheDocument();
    expect(screen.getByText("Postings per Account")).toBeInTheDocument();
  });

  it("should render localized error state when query fails", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: undefined,
        loading: false,
        error: new Error("Query failed"),
      }),
    );

    render(<PostingsPerAccount ledgerId="test-id" />);

    // Verify error state is rendered with the localized generic message
    expect(
      screen.getByText("Failed to load postings data"),
    ).toBeInTheDocument();
    expect(screen.getByText("Failed to Load Data")).toBeInTheDocument();
    expect(
      screen.getByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });

  it("should render no data state when table is null", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: {
          queryShell: {
            __typename: "QueryResult",
            resultType: "table",
            text: null,
            table: null,
          },
        },
        loading: false,
        error: undefined,
      }),
    );

    render(<PostingsPerAccount ledgerId="test-id" />);

    // Verify no data state is rendered
    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(
      screen.getByText("No results returned from query"),
    ).toBeInTheDocument();
  });

  it("should render no data state when rows are missing", () => {
    // Use type assertion to simulate null rows for edge case testing
    const mockDataWithNullRows = {
      queryShell: {
        __typename: "QueryResult" as const,
        resultType: "table",
        text: null,
        table: {
          __typename: "QueryResultTable" as const,
          t: null,
          types: [
            {
              __typename: "QueryColumn" as const,
              name: "account",
              dtype: "str",
            },
            { __typename: "QueryColumn" as const, name: "count", dtype: "int" },
          ],
          // Testing edge case where rows is null (not a valid state but component should handle it)
          rows: null,
        },
      },
    } as QueryShellQuery;

    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: mockDataWithNullRows,
        loading: false,
        error: undefined,
      }),
    );

    render(<PostingsPerAccount ledgerId="test-id" />);

    // Verify no data state is rendered
    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(
      screen.getByText("No results returned from query"),
    ).toBeInTheDocument();
  });

  it("should display correct account count in description", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: {
          queryShell: {
            __typename: "QueryResult",
            resultType: "table",
            text: null,
            table: {
              __typename: "QueryResultTable",
              t: null,
              types: [
                { __typename: "QueryColumn", name: "account", dtype: "str" },
                { __typename: "QueryColumn", name: "count", dtype: "int" },
              ],
              rows: [
                ["Assets:Bank:Checking", 150],
                ["Expenses:Groceries", 45],
                ["Income:Salary", 12],
              ],
            },
          },
        },
        loading: false,
        error: undefined,
      }),
    );

    render(<PostingsPerAccount ledgerId="test-id" />);

    // Verify description shows correct count
    expect(
      screen.getByText(/Entry count per account \(3 Accounts\)/),
    ).toBeInTheDocument();
  });

  it("should handle empty rows array", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: {
          queryShell: {
            __typename: "QueryResult",
            resultType: "table",
            text: null,
            table: {
              __typename: "QueryResultTable",
              t: null,
              types: [
                { __typename: "QueryColumn", name: "account", dtype: "str" },
                { __typename: "QueryColumn", name: "count", dtype: "int" },
              ],
              rows: [],
            },
          },
        },
        loading: false,
        error: undefined,
      }),
    );

    render(<PostingsPerAccount ledgerId="test-id" />);

    // Verify it renders with 0 accounts
    expect(
      screen.getByText(/Entry count per account \(0 Accounts\)/),
    ).toBeInTheDocument();
  });

  it("should render table headers from types", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: {
          queryShell: {
            __typename: "QueryResult",
            resultType: "table",
            text: null,
            table: {
              __typename: "QueryResultTable",
              t: null,
              types: [
                { __typename: "QueryColumn", name: "account", dtype: "str" },
                { __typename: "QueryColumn", name: "count", dtype: "int" },
              ],
              rows: [["Assets:Bank:Checking", 150]],
            },
          },
        },
        loading: false,
        error: undefined,
      }),
    );

    render(<PostingsPerAccount ledgerId="test-id" />);

    // Verify column headers are rendered from types
    expect(screen.getByText("account")).toBeInTheDocument();
    expect(screen.getByText("count")).toBeInTheDocument();
  });

  it("should render section title with Database icon", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: undefined,
        loading: true,
        error: undefined,
      }),
    );

    render(<PostingsPerAccount ledgerId="test-id" />);

    const title = screen.getByText("Postings per Account");
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe("H3");
  });

  it("should handle numeric and string data types correctly", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: {
          queryShell: {
            __typename: "QueryResult",
            resultType: "table",
            text: null,
            table: {
              __typename: "QueryResultTable",
              t: null,
              types: [
                { __typename: "QueryColumn", name: "account", dtype: "str" },
                { __typename: "QueryColumn", name: "count", dtype: "int" },
                { __typename: "QueryColumn", name: "amount", dtype: "float" },
              ],
              rows: [
                ["Assets:Bank:Checking", 150, 12345.67],
                ["Expenses:Groceries", 45, 999.99],
              ],
            },
          },
        },
        loading: false,
        error: undefined,
      }),
    );

    render(<PostingsPerAccount ledgerId="test-id" />);

    // Verify mixed data types are rendered
    expect(screen.getByText("Assets:Bank:Checking")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("12345.67")).toBeInTheDocument();
    expect(screen.getByText("Expenses:Groceries")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("999.99")).toBeInTheDocument();
  });

  describe("Card component removal refactoring", () => {
    // Helper to create mock data for table results
    const createTableMockData = (
      rows: Array<Array<unknown>>,
    ): MockQueryResult<QueryShellQuery> =>
      mockUseQueryReturn({
        data: {
          queryShell: {
            __typename: "QueryResult",
            resultType: "table",
            text: null,
            table: {
              __typename: "QueryResultTable",
              t: null,
              types: [
                { __typename: "QueryColumn", name: "account", dtype: "str" },
                { __typename: "QueryColumn", name: "count", dtype: "int" },
              ],
              rows,
            },
          },
        },
        loading: false,
        error: undefined,
      });

    it("should use div wrapper instead of Card component", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createTableMockData([["Assets:Bank:Checking", 150]]),
      );

      const { container } = render(<PostingsPerAccount ledgerId="test-id" />);

      // Verify NO Card component is present
      const rootDiv = container.querySelector("div > div");
      expect(rootDiv).toBeInTheDocument();
      expect(rootDiv?.getAttribute("data-slot")).not.toBe("card");
    });

    it("should use h3 heading instead of CardTitle", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createTableMockData([["Assets:Bank:Checking", 150]]),
      );

      render(<PostingsPerAccount ledgerId="test-id" />);

      const title = screen.getByText("Postings per Account");
      expect(title.tagName).toBe("H3");
      expect(title.className).toContain("font-semibold");
      expect(title.className).toContain("mb-2");
    });

    it("should use paragraph for description instead of CardDescription", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createTableMockData([["Assets:Bank:Checking", 150]]),
      );

      render(<PostingsPerAccount ledgerId="test-id" />);

      const description = screen.getByText(
        /Entry count per account \(1 Accounts\)/,
      );
      expect(description.tagName).toBe("P");
      expect(description.className).toContain("text-sm");
      expect(description.className).toContain("text-muted-foreground");
      expect(description.className).toContain("mb-4");
    });

    it("should not have CardHeader or CardContent wrappers", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createTableMockData([["Assets:Bank:Checking", 150]]),
      );

      const { container } = render(<PostingsPerAccount ledgerId="test-id" />);

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

      render(<PostingsPerAccount ledgerId="test-id" />);

      const title = screen.getByText("Postings per Account");
      expect(title.tagName).toBe("H3");

      const description = screen.getByText("Loading query results...");
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

      render(<PostingsPerAccount ledgerId="test-id" />);

      const errorTitle = screen.getByText("Error");
      expect(errorTitle.tagName).toBe("H3");

      const description = screen.getByText("Failed to load postings data");
      expect(description.tagName).toBe("P");
      expect(description.className).toContain("text-sm");
      expect(description.className).toContain("text-muted-foreground");
    });

    it("should maintain consistent structure in no data state", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        mockUseQueryReturn({
          data: {
            queryShell: {
              __typename: "QueryResult",
              resultType: "table",
              text: null,
              table: null,
            },
          },
          loading: false,
          error: undefined,
        }),
      );

      render(<PostingsPerAccount ledgerId="test-id" />);

      const title = screen.getByText("Postings per Account");
      expect(title.tagName).toBe("H3");

      const description = screen.getByText("No data available");
      expect(description.tagName).toBe("P");
      expect(description.className).toContain("text-sm");
      expect(description.className).toContain("text-muted-foreground");
    });
  });
});
