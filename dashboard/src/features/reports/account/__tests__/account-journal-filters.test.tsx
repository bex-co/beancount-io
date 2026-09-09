import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import { AccountJournalTable } from "../index";
import { DirectiveType } from "@/common/types/journal";

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerData: { fava_options: {} },
    ledgerName: "example",
  }),
}));

vi.mock("@/common/lib/fava-options", () => ({
  getAccountJournalWithChildren: () => true,
}));

vi.mock("@/features/journal/components/journal-table", () => ({
  JournalTable: () => <div data-testid="journal-table" />,
}));

vi.mock("@/features/journal/components/journal-pagination", () => ({
  JournalPagination: () => null,
}));

vi.mock("@/features/journal/components/entry-context-dialog", () => ({
  EntryContextDialog: () => null,
}));

vi.mock("@/features/journal/components/journal-states", () => ({
  LoadingSpinner: () => <div>loading</div>,
}));

vi.mock("@/common/components/state-components", () => ({
  ReportErrorState: () => <div>error</div>,
}));

describe("AccountJournalTable filter wiring", () => {
  const mockUseQuery = vi.mocked(useQuery);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: {
        getLedgerAccountJournal: {
          items: [
            {
              entry: {
                directive_type: "Transaction",
                flag: "*",
                date: "2017-09-07",
                narration: "Hoogle Payroll",
              },
              change: { USD: "100" },
              balance: { USD: "100" },
            },
          ],
          total: 72,
          account: "Income:US:Hoogle:Salary",
          with_children: true,
        },
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as never);
  });

  it("sends type and subtype selectors in the account journal query", () => {
    render(
      <AccountJournalTable
        ledgerId="open_ledger/example"
        ledgerOwner="open_ledger"
        ledgerName="example"
        accountName="Income:US:Hoogle:Salary"
        ledgerFilters={{}}
        conversion="at_cost"
      />,
    );

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: {
          ledgerId: "open_ledger/example",
          query: expect.objectContaining({
            account: "Income:US:Hoogle:Salary",
            directiveTypes: [DirectiveType.TRANSACTION],
            transactionSubtypes: undefined,
            documentSubtypes: undefined,
            customSubtypes: undefined,
            limit: 20,
            offset: 0,
          }),
        },
      }),
    );

    fireEvent.click(screen.getByTitle("journal.pendingTransactions"));

    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: {
          ledgerId: "open_ledger/example",
          query: expect.objectContaining({
            directiveTypes: [DirectiveType.TRANSACTION],
            transactionSubtypes: ["pending"],
          }),
        },
      }),
    );
  });

  it("sends Open-only selections without Transaction", () => {
    render(
      <AccountJournalTable
        ledgerId="open_ledger/example"
        ledgerOwner="open_ledger"
        ledgerName="example"
        accountName="Income:US:Hoogle:Salary"
        ledgerFilters={{}}
        conversion="at_cost"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "journal.open" }));
    fireEvent.click(
      screen.getByRole("button", { name: "journal.transaction" }),
    );

    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: {
          ledgerId: "open_ledger/example",
          query: expect.objectContaining({
            directiveTypes: [DirectiveType.OPEN],
            transactionSubtypes: undefined,
          }),
        },
      }),
    );
  });
});
