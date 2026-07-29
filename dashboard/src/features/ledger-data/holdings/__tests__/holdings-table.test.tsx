import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatasetTable } from "../holdings-table";
import { useQuery } from "@apollo/client/react";
import { QueryShellDocument } from "@/graphql/definitions";

// Mock Apollo's useQuery
vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

// Mock the navigate hook
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock csv-export
vi.mock("@/common/lib/format/csv-export", () => ({
  downloadCSV: vi.fn(),
}));

describe("DatasetTable", () => {
  const mockLedgerId = "dGVzdE93bmVyfHRlc3RMZWRnZXI="; // base64 encoded "testOwner|testLedger"
  const mockQuery = "SELECT * FROM holdings";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("should render skeletons while loading", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        loading: true,
        error: undefined,
      });

      const { container } = render(
        <DatasetTable query={mockQuery} ledgerId={mockLedgerId} />,
      );

      // Check for skeleton elements (they have animate-pulse class)
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("error state", () => {
    it("should render localized error message when query fails", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        loading: false,
        error: new Error("Network error occurred"),
      });

      render(<DatasetTable query={mockQuery} ledgerId={mockLedgerId} />);

      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument();
    });

    it("should render default error message for non-Error exceptions", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        loading: false,
        error: { message: "Some error" } as Error, // Not an actual Error instance
      });

      render(<DatasetTable query={mockQuery} ledgerId={mockLedgerId} />);

      // Should show the error message
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should render no results message when queryShell is null", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: { queryShell: null },
        loading: false,
        error: undefined,
      });

      render(<DatasetTable query={mockQuery} ledgerId={mockLedgerId} />);

      expect(
        screen.getByText(/No query results available/),
      ).toBeInTheDocument();
    });

    it("should render no data message when table has no rows", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: {
          queryShell: {
            resultType: "table",
            table: {
              types: [{ name: "account" }, { name: "balance" }],
              rows: [],
            },
            text: null,
          },
        },
        loading: false,
        error: undefined,
      });

      render(<DatasetTable query={mockQuery} ledgerId={mockLedgerId} />);

      expect(
        screen.getByText(/No data returned from query/),
      ).toBeInTheDocument();
    });
  });

  describe("table rendering", () => {
    it("should render table with headers and data", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: {
          queryShell: {
            resultType: "table",
            table: {
              types: [{ name: "account" }, { name: "balance" }],
              rows: [
                ["Assets:Bank", "1000.00"],
                ["Liabilities:CreditCard", "-500.00"],
              ],
            },
            text: null,
          },
        },
        loading: false,
        error: undefined,
      });

      render(<DatasetTable query={mockQuery} ledgerId={mockLedgerId} />);

      // Check headers
      expect(screen.getByText("account")).toBeInTheDocument();
      expect(screen.getByText("balance")).toBeInTheDocument();

      // Check data
      expect(screen.getByText("Assets:Bank")).toBeInTheDocument();
      expect(screen.getByText("1000.00")).toBeInTheDocument();
      expect(screen.getByText("Liabilities:CreditCard")).toBeInTheDocument();
      expect(screen.getByText("-500.00")).toBeInTheDocument();
    });

    it("should display row count", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: {
          queryShell: {
            resultType: "table",
            table: {
              types: [{ name: "account" }],
              rows: [["Assets:Bank"], ["Liabilities:CreditCard"]],
            },
            text: null,
          },
        },
        loading: false,
        error: undefined,
      });

      render(<DatasetTable query={mockQuery} ledgerId={mockLedgerId} />);

      // Should show "2 Rows" (text split in DOM)
      expect(screen.getByText(/2/)).toBeInTheDocument();
      expect(screen.getByText(/Rows/)).toBeInTheDocument();
    });

    it("should display singular row text for single row", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: {
          queryShell: {
            resultType: "table",
            table: {
              types: [{ name: "account" }],
              rows: [["Assets:Bank"]],
            },
            text: null,
          },
        },
        loading: false,
        error: undefined,
      });

      render(<DatasetTable query={mockQuery} ledgerId={mockLedgerId} />);

      // The row count is displayed
      expect(screen.getByText(/1/)).toBeInTheDocument();
      expect(screen.getByText(/row/)).toBeInTheDocument();
    });
  });

  describe("text result rendering", () => {
    it("should render text result in pre tag", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: {
          queryShell: {
            resultType: "text",
            table: null,
            text: {
              contents: "This is a text result\nWith multiple lines",
            },
          },
        },
        loading: false,
        error: undefined,
      });

      const { container } = render(
        <DatasetTable query={mockQuery} ledgerId={mockLedgerId} />,
      );

      // Find the pre element and check its content
      const preElement = container.querySelector("pre");
      expect(preElement).toBeInTheDocument();
      expect(preElement?.textContent).toContain("This is a text result");
      expect(preElement?.textContent).toContain("With multiple lines");
    });
  });

  describe("unknown result type", () => {
    it("should render unknown result type message", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: {
          queryShell: {
            resultType: "unknown",
            table: null,
            text: null,
          },
        },
        loading: false,
        error: undefined,
      });

      render(<DatasetTable query={mockQuery} ledgerId={mockLedgerId} />);

      // The text is split across elements, so we check for partial matches
      expect(screen.getByText(/Unknown result type/)).toBeInTheDocument();
      expect(screen.getByText(/unknown/)).toBeInTheDocument();
    });
  });

  describe("object cell rendering", () => {
    it("should render object cells with currency formatting", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: {
          queryShell: {
            resultType: "table",
            table: {
              types: [{ name: "account" }, { name: "balance" }],
              rows: [["Assets:Bank", { USD: "1000.50", EUR: "500.25" }]],
            },
            text: null,
          },
        },
        loading: false,
        error: undefined,
      });

      render(<DatasetTable query={mockQuery} ledgerId={mockLedgerId} />);

      // Check that the object values are rendered
      expect(screen.getByText("1000.50")).toBeInTheDocument();
      expect(screen.getByText("USD")).toBeInTheDocument();
      expect(screen.getByText("500.25")).toBeInTheDocument();
      expect(screen.getByText("EUR")).toBeInTheDocument();
    });
  });

  describe("account row activation", () => {
    it("should navigate with click, Enter, and Space from a focusable row", async () => {
      const user = userEvent.setup();
      vi.mocked(useQuery).mockReturnValue({
        data: {
          queryShell: {
            resultType: "table",
            table: {
              types: [{ name: "account" }, { name: "balance" }],
              rows: [["Assets:Bank:Checking", "1000.00"]],
            },
            text: null,
          },
        },
        loading: false,
        error: undefined,
      });

      render(<DatasetTable query={mockQuery} ledgerId={mockLedgerId} />);

      const accountRow = screen.getByText("Assets:Bank:Checking").closest("tr");
      expect(accountRow).toHaveAttribute("role", "link");
      expect(accountRow).toHaveAttribute("tabindex", "0");

      await user.click(screen.getByText("1000.00"));
      accountRow?.focus();
      expect(accountRow).toHaveFocus();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");

      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenLastCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
        params: expect.objectContaining({
          accountName: "Assets:Bank:Checking",
        }),
      });
    });
  });

  describe("query configuration", () => {
    it("should call useQuery with correct document and variables", () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        loading: true,
        error: undefined,
      });

      render(<DatasetTable query={mockQuery} ledgerId={mockLedgerId} />);

      expect(useQuery).toHaveBeenCalledWith(QueryShellDocument, {
        variables: {
          ledgerId: mockLedgerId,
          query: mockQuery,
        },
        fetchPolicy: "cache-first",
      });
    });
  });
});
