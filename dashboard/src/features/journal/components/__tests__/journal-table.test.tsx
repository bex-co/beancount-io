import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render as renderUI,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JournalTable as RealJournalTable } from "@/features/journal/components/journal-table";
import type { JournalTableItem } from "@/features/journal/components/journal-table";
import type { JournalTransaction } from "@/common/types/journal";

import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import {
  LedgerProviderContext,
  type LedgerProviderContextType,
} from "@/common/providers/ledger-provider/context";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.unmock("@/i18n");

const ledger = {
  ledgerData: { options: { renderCommas: true } },
} as unknown as LedgerProviderContextType;

function render(ui: React.ReactElement) {
  const localization = createLocalization();
  return renderUI(ui, {
    wrapper: ({ children }) => (
      <LocalizationProvider localization={localization}>
        <LedgerProviderContext.Provider value={ledger}>
          {children}
        </LedgerProviderContext.Provider>
      </LocalizationProvider>
    ),
  });
}

const money = {
  primaryCurrency: "USD",
  incomeRoot: "Income",
  expensesRoot: "Expenses",
  accountFilter: "",
};

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

/**
 * Both of the Journal's layouts — the compact lines and the days — behave the
 * same wherever a list of entries appears: the Journal, an account's journal
 * and the Overview's recent activity.
 */
describe.each(["lines", "days"] as const)("JournalTable (%s)", (layout) => {
  const JournalTable = (
    props: Omit<Parameters<typeof RealJournalTable>[0], "layout" | "money">,
  ) => <RealJournalTable layout={layout} money={money} {...props} />;
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
    screen.getAllByRole("button", { name: /^(Show|Hide) \d+ postings? for / });

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
        screen.queryAllByRole("button", {
          name: /^(Show|Hide) \d+ postings? for /,
        }),
      ).toHaveLength(0);
      const indicators = screen.getAllByText(/^\d+ postings? shown for /);
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
    it("should activate an entry via row click and its keyboard-focusable name", async () => {
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

      const openControl = screen.getByRole("button", {
        name: "Open entry 2024-01-01 Test Payee Test transaction (row 1)",
      });
      openControl.focus();
      expect(openControl).toHaveFocus();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");

      expect(mockOnEntryClick).toHaveBeenCalledTimes(3);
      expect(mockOnEntryClick).toHaveBeenLastCalledWith(
        transaction,
        expect.any(HTMLElement),
      );

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
        screen.getByRole("columnheader", { name: "Entry" }),
      ).toBeInTheDocument();
      // One disclosure, wherever the width puts it.
      expect(getPostingToggles()).toHaveLength(1);

      expect(screen.getByText("Test Payee")).toBeInTheDocument();
      // Narrow, the narration shares a line with the accounts; wide, it has
      // its own place. CSS shows one; both are this entry's.
      expect(screen.getAllByText(/Test transaction/).length).toBeGreaterThan(0);
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
        screen.queryByRole("button", {
          name: /^(Show|Hide) \d+ postings? for /,
        }),
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

  describe("columns", () => {
    it("gives every entry row one cell per column heading", () => {
      const transactions = [createMockTransaction(4), createMockTransaction(1)];
      render(
        <JournalTable
          data={createTableData(transactions)}
          showMetadata={false}
          showPostings={false}
          onEntryClick={mockOnEntryClick}
        />,
      );

      const headers = screen.getAllByRole("columnheader");
      const rows = screen
        .getAllByRole("button", { name: /^Open entry / })
        .map((control) => control.closest("tr")!);
      expect(rows).toHaveLength(2);
      // A hidden cell would give up its column and slide the ones after it
      // under the wrong heading; every cell stays, empty where it has
      // nothing to say at a width.
      for (const row of rows)
        expect(within(row).getAllByRole("cell")).toHaveLength(headers.length);
      expect(
        screen.queryByRole("columnheader", { name: "Balance" }),
      ).not.toBeInTheDocument();
    });
  });
});
