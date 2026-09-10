import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostingsPerAccount } from "../postings-per-account";
import * as apolloClient from "@apollo/client/react";
import {
  GetLedgerPostingsPerAccountDocument,
  type GetLedgerPostingsPerAccountQuery,
} from "@/graphql/definitions";
import type { MockQueryResult } from "@/test/mocks/apollo";

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

const searchParams = {
  account: "",
  filter: "",
  time: "",
};

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    ledgerOwner: "open_ledger",
    ledgerName: "crypto-example",
  }),
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    className?: string;
  }) => (
    <a
      href="#"
      data-to={to}
      data-params={JSON.stringify(params)}
      className={className}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams,
    setSearchParams: vi.fn(),
  }),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

function mockUseQueryReturn(
  result: MockQueryResult<GetLedgerPostingsPerAccountQuery>,
): MockQueryResult<GetLedgerPostingsPerAccountQuery> {
  return result;
}

function createRowsMockData(
  rows: Array<{ account: string; count: number }>,
): MockQueryResult<GetLedgerPostingsPerAccountQuery> {
  return mockUseQueryReturn({
    data: {
      getLedgerPostingsPerAccount: rows.map((row) => ({
        __typename: "PostingsPerAccount" as const,
        account: row.account,
        count: row.count,
      })),
    },
    loading: false,
    error: undefined,
  });
}

describe("PostingsPerAccount", () => {
  beforeEach(() => {
    searchParams.account = "";
    searchParams.filter = "";
    searchParams.time = "";
    vi.mocked(apolloClient.useQuery).mockClear();
  });

  it("requests the filtered postings read with ledger search params", () => {
    searchParams.account = "Liabilities:Crypto:Binance:Margin";
    searchParams.time = "2025";
    searchParams.filter = "#crypto";
    vi.mocked(apolloClient.useQuery).mockReturnValue(createRowsMockData([]));

    render(<PostingsPerAccount ledgerId="open_ledger/crypto-example" />);

    expect(apolloClient.useQuery).toHaveBeenCalledWith(
      GetLedgerPostingsPerAccountDocument,
      expect.objectContaining({
        variables: {
          ledgerId: "open_ledger/crypto-example",
          account: "Liabilities:Crypto:Binance:Margin",
          time: "2025",
          filter: "#crypto",
        },
        skip: false,
      }),
    );
  });

  it("renders the Margin counterpart posting counts", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      createRowsMockData([
        { account: "Assets:Crypto:Binance:BTC", count: 1 },
        { account: "Assets:Crypto:Binance:USD", count: 1 },
        { account: "Liabilities:Crypto:Binance:Margin", count: 2 },
      ]),
    );

    const { container } = render(
      <PostingsPerAccount ledgerId="open_ledger/crypto-example" />,
    );

    expect(
      container.querySelector(".overflow-hidden .overflow-x-auto"),
    ).toBeInTheDocument();
    expect(screen.getByText("Assets:Crypto:Binance:BTC")).toBeInTheDocument();
    expect(screen.getByText("Assets:Crypto:Binance:USD")).toBeInTheDocument();
    expect(
      screen.getByText("Liabilities:Crypto:Binance:Margin"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("1")).toHaveLength(2);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByText(/Entry count per account \(3 Accounts\)/),
    ).toBeInTheDocument();
  });

  it("renders loading state with responsive skeleton", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: undefined,
        loading: true,
        error: undefined,
      }),
    );

    render(<PostingsPerAccount ledgerId="test-id" />);

    expect(screen.getByText("Loading query results...")).toBeInTheDocument();
    expect(screen.getByText("Postings per Account")).toBeInTheDocument();
  });

  it("renders localized error state when query fails", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      mockUseQueryReturn({
        data: undefined,
        loading: false,
        error: new Error("Query failed"),
      }),
    );

    render(<PostingsPerAccount ledgerId="test-id" />);

    expect(
      screen.getByText("Failed to load postings data"),
    ).toBeInTheDocument();
    expect(screen.getByText("Failed to Load Data")).toBeInTheDocument();
    expect(
      screen.getByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });

  it("renders an honest zero-result state", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(createRowsMockData([]));

    render(<PostingsPerAccount ledgerId="test-id" />);

    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(
      screen.getByText("No results returned from query"),
    ).toBeInTheDocument();
  });

  it("exposes each account destination as a keyboard-reachable link", () => {
    vi.mocked(apolloClient.useQuery).mockReturnValue(
      createRowsMockData([{ account: "Assets:Bank:Checking", count: 150 }]),
    );

    render(<PostingsPerAccount ledgerId="open_ledger/crypto-example" />);

    const link = screen.getByRole("link", { name: "Assets:Bank:Checking" });
    expect(link).toHaveAttribute(
      "data-to",
      "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
    );
    expect(JSON.parse(link.getAttribute("data-params") ?? "{}")).toEqual({
      ledgerOwner: "open_ledger",
      ledgerName: "crypto-example",
      accountName: "Assets:Bank:Checking",
    });
  });

  describe("Card component removal refactoring", () => {
    it("should use div wrapper instead of Card component", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createRowsMockData([{ account: "Assets:Bank:Checking", count: 150 }]),
      );

      const { container } = render(<PostingsPerAccount ledgerId="test-id" />);
      const rootDiv = container.querySelector("div > div");
      expect(rootDiv).toBeInTheDocument();
      expect(rootDiv?.getAttribute("data-slot")).not.toBe("card");
    });

    it("should use h3 heading instead of CardTitle", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createRowsMockData([{ account: "Assets:Bank:Checking", count: 150 }]),
      );

      render(<PostingsPerAccount ledgerId="test-id" />);

      const title = screen.getByText("Postings per Account");
      expect(title.tagName).toBe("H3");
      expect(title.className).toContain("font-semibold");
      expect(title.className).toContain("mb-2");
    });

    it("should use paragraph for description instead of CardDescription", () => {
      vi.mocked(apolloClient.useQuery).mockReturnValue(
        createRowsMockData([{ account: "Assets:Bank:Checking", count: 150 }]),
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
  });
});
