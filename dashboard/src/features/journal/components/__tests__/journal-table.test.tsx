import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JournalTable } from "@/features/journal/components/journal-table";
import type { JournalTableItem } from "@/features/journal/components/journal-table";
import type { JournalTransaction } from "@/common/types/journal";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    className,
  }: {
    children: React.ReactNode;
    params: {
      ledgerOwner: string;
      ledgerName: string;
      accountName: string;
    };
    className?: string;
  }) => (
    <a
      href={`/ledger/${params.ledgerOwner}/${params.ledgerName}/account/${params.accountName}`}
      className={className}
    >
      {children}
    </a>
  ),
}));

describe("JournalTable", () => {
  const mockOnEntryClick = vi.fn();
  let transactionSequence = 0;

  const createMockTransaction = (
    postingsCount: number = 2,
    flags: string[] = [],
  ): JournalTransaction => ({
    entry_hash: `entry-${transactionSequence++}`,
    directive_type: "Transaction",
    date: "2024-01-01",
    flag: "*",
    payee: "Test Payee",
    narration: "Test transaction",
    postings: Array.from({ length: postingsCount }, (_, i) => ({
      account: `Assets:Test${i + 1}`,
      units: { number: "100.00", currency: "USD" },
      cost: null,
      price: null,
      flag: flags[i] || null,
      meta: {},
    })),
    tags: [],
    links: [],
    meta: {},
  });

  const createTableData = (
    transactions: JournalTransaction[],
  ): JournalTableItem[] => {
    return transactions.map((directive) => ({ directive }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    transactionSequence = 0;
  });

  const getPostingToggles = () =>
    screen
      .getAllByRole("button", { name: "Toggle postings" })
      .filter((_, index) => index % 2 === 0);

  describe("PostingIndicators", () => {
    it("should render the posting count for a transaction", () => {
      const transaction = createMockTransaction(3);
      const data = createTableData([transaction]);

      render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      const toggles = getPostingToggles();
      expect(toggles).toHaveLength(1);
      expect(toggles[0]).toHaveTextContent("3");
    });

    it("should render the correct count for each transaction", () => {
      const transactions = [
        createMockTransaction(2),
        createMockTransaction(4),
        createMockTransaction(1),
      ];
      const data = createTableData(transactions);

      render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      expect(getPostingToggles().map((toggle) => toggle.textContent)).toEqual([
        "2",
        "4",
        "1",
      ]);
    });

    it("should expose the collapsed state", () => {
      const transaction = createMockTransaction(3, ["*", "!", null]);
      const data = createTableData([transaction]);

      render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      expect(getPostingToggles()[0]).toHaveAttribute("aria-expanded", "false");
    });

    it("should render the count for pending postings", () => {
      const transaction = createMockTransaction(2, ["P", "P"]);
      const data = createTableData([transaction]);

      render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      expect(getPostingToggles()[0]).toHaveTextContent("2");
    });

    it("should use a semantic button for disclosure", () => {
      const transaction = createMockTransaction(2);
      const data = createTableData([transaction]);

      render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      expect(getPostingToggles()[0]).toBeEnabled();
    });

    it("should toggle postings on click", async () => {
      const transaction = createMockTransaction(2);
      const data = createTableData([transaction]);

      const { container } = render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      // Initially no postings should be visible
      let postingsContainer = container.querySelector(".postings");
      expect(postingsContainer).not.toBeInTheDocument();

      const indicatorContainer = getPostingToggles()[0];
      expect(indicatorContainer).toBeInTheDocument();
      fireEvent.click(indicatorContainer);

      // Now postings should be visible
      await waitFor(() => {
        postingsContainer = container.querySelector(".postings");
        expect(postingsContainer).toBeInTheDocument();
      });

      // Click again to hide
      fireEvent.click(indicatorContainer);

      // Postings should be hidden again
      await waitFor(() => {
        postingsContainer = container.querySelector(".postings");
        expect(postingsContainer).not.toBeInTheDocument();
      });
    });

    it("should support keyboard navigation", async () => {
      const user = userEvent.setup();
      const transaction = createMockTransaction(2);
      const data = createTableData([transaction]);

      const { container } = render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      const indicatorContainer = getPostingToggles()[0];
      expect(indicatorContainer).toBeInTheDocument();

      indicatorContainer.focus();
      await user.keyboard("{Enter}");

      await waitFor(() => {
        const postingsContainer = container.querySelector(".postings");
        expect(postingsContainer).toBeInTheDocument();
      });

      await user.keyboard(" ");

      await waitFor(() => {
        const postingsContainer = container.querySelector(".postings");
        expect(postingsContainer).not.toBeInTheDocument();
      });
    });
  });

  describe("shouldShowPostings XOR logic", () => {
    it("should hide all postings when showPostings=false and no individual toggles", () => {
      const transactions = [createMockTransaction(2), createMockTransaction(2)];
      const data = createTableData(transactions);

      const { container } = render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      const postingsContainers = container.querySelectorAll(".postings");
      expect(postingsContainers).toHaveLength(0);
    });

    it("should show all postings when showPostings=true and no individual toggles", () => {
      const transactions = [createMockTransaction(2), createMockTransaction(2)];
      const data = createTableData(transactions);

      const { container } = render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={true}
          onEntryClick={mockOnEntryClick}
        />,
      );

      const postingsContainers = container.querySelectorAll(".postings");
      expect(postingsContainers).toHaveLength(2);
    });

    it("should show individually toggled postings when showPostings=false", async () => {
      const transactions = [createMockTransaction(2), createMockTransaction(2)];
      const data = createTableData(transactions);

      const { container } = render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      const indicatorContainers = getPostingToggles();
      fireEvent.click(indicatorContainers[0] as HTMLElement);

      await waitFor(() => {
        const postingsContainers = container.querySelectorAll(".postings");
        expect(postingsContainers).toHaveLength(1);
      });
    });

    it("should not toggle postings when showPostings=true (toggle only works when showPostings=false)", async () => {
      const transactions = [createMockTransaction(2), createMockTransaction(2)];
      const data = createTableData(transactions);

      const { container } = render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={true}
          onEntryClick={mockOnEntryClick}
        />,
      );

      // Initially both should be visible
      let postingsContainers = container.querySelectorAll(".postings");
      expect(postingsContainers).toHaveLength(2);

      // Forced-open rows show a static indicator, not an enabled toggle.
      expect(
        screen.queryAllByRole("button", { name: "Toggle postings" }),
      ).toHaveLength(0);
      const indicators = screen.getAllByLabelText("Postings always visible");
      expect(indicators.length).toBeGreaterThan(0);
      fireEvent.click(indicators[0]);

      await waitFor(() => {
        postingsContainers = container.querySelectorAll(".postings");
        // Both should still be visible since toggle doesn't work when showPostings=true
        expect(postingsContainers).toHaveLength(2);
      });
    });

    it("should show all postings when showPostings changes from false to true", async () => {
      const transactions = [
        createMockTransaction(2),
        createMockTransaction(2),
        createMockTransaction(2),
      ];
      const data = createTableData(transactions);

      const { container, rerender } = render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      // Toggle first and third transactions on
      const indicatorContainers = getPostingToggles();
      fireEvent.click(indicatorContainers[0] as HTMLElement);
      fireEvent.click(indicatorContainers[2] as HTMLElement);

      await waitFor(() => {
        const postingsContainers = container.querySelectorAll(".postings");
        expect(postingsContainers).toHaveLength(2); // 1st and 3rd visible
      });

      // Change global showPostings to true
      rerender(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={true}
          onEntryClick={mockOnEntryClick}
        />,
      );

      await waitFor(() => {
        const postingsContainers = container.querySelectorAll(".postings");
        // All should be visible when showPostings=true
        expect(postingsContainers).toHaveLength(3);
      });
    });

    it("should hide globally shown postings when showPostings changes to false", async () => {
      const data = createTableData([createMockTransaction(2)]);
      const { container, rerender } = render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={true}
          onEntryClick={mockOnEntryClick}
        />,
      );

      expect(container.querySelectorAll(".postings")).toHaveLength(1);

      rerender(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      await waitFor(() => {
        expect(container.querySelectorAll(".postings")).toHaveLength(0);
      });
    });
  });

  describe("Integration with table rendering", () => {
    it("should activate an entry via row click and a keyboard-focusable date control", async () => {
      const user = userEvent.setup();
      const transaction = createMockTransaction(2);
      const data = createTableData([transaction]);

      render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      const entryRow = screen.getByText("Test Payee").closest("tr");
      expect(entryRow).toBeTruthy();
      await user.click(entryRow as HTMLElement);

      const dateControl = screen.getByRole("button", { name: "2024-01-01" });
      dateControl.focus();
      expect(dateControl).toHaveFocus();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");

      expect(mockOnEntryClick).toHaveBeenCalledTimes(3);
      expect(mockOnEntryClick).toHaveBeenLastCalledWith(transaction);

      await user.click(getPostingToggles()[0]);
      expect(mockOnEntryClick).toHaveBeenCalledTimes(3);
    });

    it("links each posting account to its account report", () => {
      const transaction = createMockTransaction(2);
      const data = createTableData([transaction]);

      render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings
          ledgerOwner="un_e9p1pg5e6wmh"
          ledgerName="my-book"
        />,
      );

      expect(
        screen.getByRole("link", { name: "Assets:Test1" }),
      ).toHaveAttribute(
        "href",
        "/ledger/un_e9p1pg5e6wmh/my-book/account/Assets:Test1",
      );
      expect(
        screen.getByRole("link", { name: "Assets:Test2" }),
      ).toHaveAttribute(
        "href",
        "/ledger/un_e9p1pg5e6wmh/my-book/account/Assets:Test2",
      );
    });

    it("should render a transaction with responsive posting controls", () => {
      const transaction = createMockTransaction(2);
      const data = createTableData([transaction]);

      render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      expect(
        screen.getByRole("table", { name: "Journal" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "Date" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "Flag" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "Payee/Narration" }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("columnheader", { name: "Postings" }),
      ).toHaveLength(2);

      expect(screen.getByText("Test Payee")).toBeInTheDocument();
      expect(screen.getByText("Test transaction")).toBeInTheDocument();
    });

    it("should handle multiple transactions with different posting counts", () => {
      const transactions = [
        createMockTransaction(2),
        createMockTransaction(3),
        createMockTransaction(4),
      ];
      const data = createTableData(transactions);

      render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      expect(getPostingToggles().map((toggle) => toggle.textContent)).toEqual([
        "2",
        "3",
        "4",
      ]);
    });

    it("should not render indicators for non-transaction directives", () => {
      const data: JournalTableItem[] = [
        {
          directive: {
            directive_type: "Balance",
            date: "2024-01-01",
            account: "Assets:Test",
            amount: { number: "100.00", currency: "USD" },
            diff_amount: null,
            meta: {},
          },
        },
      ];

      render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      expect(
        screen.queryByRole("button", { name: "Toggle postings" }),
      ).not.toBeInTheDocument();
    });

    it("should maintain independent state for each transaction toggle", async () => {
      const transactions = [
        createMockTransaction(2),
        createMockTransaction(2),
        createMockTransaction(2),
      ];
      const data = createTableData(transactions);

      const { container } = render(
        <JournalTable
          data={data}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      const indicatorContainers = getPostingToggles();

      // Toggle first
      fireEvent.click(indicatorContainers[0] as HTMLElement);
      await waitFor(() => {
        const postingsContainers = container.querySelectorAll(".postings");
        expect(postingsContainers).toHaveLength(1);
      });

      // Toggle third
      fireEvent.click(indicatorContainers[2] as HTMLElement);
      await waitFor(() => {
        const postingsContainers = container.querySelectorAll(".postings");
        expect(postingsContainers).toHaveLength(2);
      });

      // Toggle first off
      fireEvent.click(indicatorContainers[0] as HTMLElement);
      await waitFor(() => {
        const postingsContainers = container.querySelectorAll(".postings");
        expect(postingsContainers).toHaveLength(1); // Only third should remain
      });
    });
  });

  describe("Default showPostings value", () => {
    it("should default to true when not specified", () => {
      const transaction = createMockTransaction(2);
      const data = createTableData([transaction]);

      const { container } = render(
        <JournalTable
          data={data}
          showMetadata={false}
          // showPostings not specified, should default to true
          onEntryClick={mockOnEntryClick}
        />,
      );

      const postingsContainers = container.querySelectorAll(".postings");
      expect(postingsContainers).toHaveLength(1);
    });
  });

  describe("column-to-header alignment", () => {
    function cellForHeader(row: HTMLElement, headerName: string): HTMLElement {
      const headers = screen.getAllByRole("columnheader");
      const headerIndex = headers.findIndex(
        (header) =>
          header.textContent?.replace(/\s+/g, " ").trim() === headerName ||
          header.getAttribute("aria-label") === headerName,
      );
      expect(headerIndex).toBeGreaterThanOrEqual(0);
      const cells = within(row).getAllByRole("cell");
      // Detail rows are separate; the primary data row has one cell per header.
      expect(cells.length).toBeGreaterThan(headerIndex);
      return cells[headerIndex] as HTMLElement;
    }

    it("binds each account-journal value to its column header", () => {
      const transaction: JournalTransaction = {
        entry_hash: "gld-buy",
        directive_type: "Transaction",
        date: "2017-08-27",
        flag: "*",
        payee: null,
        narration: "Buy shares of GLD",
        postings: [
          {
            account: "Assets:US:ETrade:GLD",
            units: { number: "10", currency: "GLD" },
            cost: null,
            price: null,
            flag: null,
            meta: {},
          },
          {
            account: "Assets:US:ETrade:Cash",
            units: { number: "-2433.36", currency: "USD" },
            cost: null,
            price: null,
            flag: null,
            meta: {},
          },
          {
            account: "Income:US:ETrade:PnL",
            units: { number: "0", currency: "USD" },
            cost: null,
            price: null,
            flag: null,
            meta: {},
          },
        ],
        tags: [],
        links: [],
        meta: {},
      };

      render(
        <JournalTable
          data={[
            {
              directive: transaction,
              change: { USD: "2433.36" },
              balance: { USD: "4559.80" },
            },
          ]}
          showMetadata={false}
          showPostings={false}
          isAccountJournal
          accountName="Assets:US:ETrade:GLD"
          onEntryClick={mockOnEntryClick}
        />,
      );

      const table = screen.getByRole("table", { name: "Account journal" });
      expect(
        within(table).getByRole("columnheader", { name: "Units" }),
      ).toBeInTheDocument();
      expect(
        within(table).getByRole("columnheader", { name: "Change" }),
      ).toBeInTheDocument();
      expect(
        within(table).getByRole("columnheader", { name: "Balance" }),
      ).toBeInTheDocument();
      expect(
        within(table).getByRole("columnheader", { name: "Flag" }),
      ).toBeInTheDocument();

      const row = screen.getByText("Buy shares of GLD").closest("tr");
      expect(row).toBeTruthy();

      expect(cellForHeader(row as HTMLElement, "Date")).toHaveTextContent(
        "2017-08-27",
      );
      expect(cellForHeader(row as HTMLElement, "Flag")).toHaveTextContent("*");
      expect(
        cellForHeader(row as HTMLElement, "Payee/Narration"),
      ).toHaveTextContent("Buy shares of GLD");
      // Units must be the GLD quantity, not the posting-count toggle (3).
      expect(cellForHeader(row as HTMLElement, "Units")).toHaveTextContent(
        "10 GLD",
      );
      expect(
        within(cellForHeader(row as HTMLElement, "Units")).queryByRole(
          "button",
          { name: "Toggle postings" },
        ),
      ).not.toBeInTheDocument();
      expect(cellForHeader(row as HTMLElement, "Change")).toHaveTextContent(
        "2433.36 USD",
      );
      expect(cellForHeader(row as HTMLElement, "Balance")).toHaveTextContent(
        "4559.80 USD",
      );

      const postingsHeaders = within(table).getAllByRole("columnheader", {
        name: "Postings",
      });
      expect(postingsHeaders).toHaveLength(2);
      const desktopPostingsCell = cellForHeader(row as HTMLElement, "Postings");
      expect(
        within(desktopPostingsCell).getAllByRole("button", {
          name: "Toggle postings",
        }).length,
      ).toBeGreaterThan(0);
    });

    it("leaves account-journal value columns empty for non-transaction rows", () => {
      render(
        <JournalTable
          data={[
            {
              directive: {
                directive_type: "Balance",
                date: "2017-01-01",
                account: "Assets:US:ETrade:GLD",
                amount: { number: "10", currency: "GLD" },
                diff_amount: null,
                meta: {},
              },
              change: {},
              balance: { GLD: "10" },
            },
          ]}
          showMetadata={false}
          showPostings={false}
          isAccountJournal
          accountName="Assets:US:ETrade:GLD"
          onEntryClick={mockOnEntryClick}
        />,
      );

      const row = within(screen.getByRole("table", { name: "Account journal" }))
        .getAllByRole("row")
        .find((candidate) => candidate.textContent?.includes("2017-01-01"));
      expect(row).toBeTruthy();
      expect(cellForHeader(row as HTMLElement, "Units")).toHaveTextContent("");
      expect(cellForHeader(row as HTMLElement, "Change")).toHaveTextContent("");
      expect(cellForHeader(row as HTMLElement, "Balance")).toHaveTextContent(
        "",
      );
      expect(
        screen.queryByRole("button", { name: "Toggle postings" }),
      ).not.toBeInTheDocument();
    });

    it("binds each plain-journal value to its four column headers", () => {
      const transaction = createMockTransaction(4);
      transaction.narration = "Plain journal row";

      render(
        <JournalTable
          data={[{ directive: transaction }]}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      const table = screen.getByRole("table", { name: "Journal" });
      expect(
        within(table).queryByRole("columnheader", { name: "Units" }),
      ).not.toBeInTheDocument();
      expect(
        within(table).getAllByRole("columnheader", { name: "Postings" }),
      ).toHaveLength(2);

      const row = screen.getByText("Plain journal row").closest("tr");
      expect(row).toBeTruthy();
      expect(cellForHeader(row as HTMLElement, "Date")).toHaveTextContent(
        "2024-01-01",
      );
      expect(cellForHeader(row as HTMLElement, "Flag")).toHaveTextContent("*");
      expect(
        cellForHeader(row as HTMLElement, "Payee/Narration"),
      ).toHaveTextContent("Test Payee");
      expect(
        within(cellForHeader(row as HTMLElement, "Postings")).getAllByRole(
          "button",
          { name: "Toggle postings" },
        )[0],
      ).toHaveTextContent("4");
    });

    it("exposes desktop and mobile postings columns with matching cells", () => {
      const transaction = createMockTransaction(2);

      render(
        <JournalTable
          data={[{ directive: transaction }]}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      const headers = screen.getAllByRole("columnheader", { name: "Postings" });
      expect(headers[0]?.className).toMatch(/hidden/);
      expect(headers[0]?.className).toMatch(/sm:table-cell/);
      expect(headers[1]?.className).toMatch(/sm:hidden/);

      const row = screen.getByText("Test Payee").closest("tr");
      const cells = within(row as HTMLElement).getAllByRole("cell");
      // Date, Flag, Description, desktop Postings, mobile Postings
      expect(cells).toHaveLength(5);
      expect(cells[3]?.className).toMatch(/sm:table-cell/);
      expect(cells[4]?.className).toMatch(/sm:hidden/);
    });
  });
});
