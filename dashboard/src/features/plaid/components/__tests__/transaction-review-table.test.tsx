import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TransactionReviewTable } from "../transaction-review-table";
import {
  useUnsyncedTransactions,
  usePlaidAccountsForLedger,
  useSuggestPlaidCategories,
  useSubmitPlaidTransactions,
  useDeletePlaidTransactions,
} from "../../hooks/use-plaid-accounts";

vi.mock("../../hooks/use-plaid-accounts", () => ({
  useUnsyncedTransactions: vi.fn(),
  usePlaidAccountsForLedger: vi.fn(),
  useSuggestPlaidCategories: vi.fn(),
  useSubmitPlaidTransactions: vi.fn(),
  useDeletePlaidTransactions: vi.fn(),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: ({
    value,
    onValueChange,
    disabled,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    disabled?: boolean;
  }) => (
    <input
      data-testid="account-combobox"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
    />
  ),
  SourceFileCombobox: ({
    value,
    onValueChange,
    disabled,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    disabled?: boolean;
  }) => (
    <input
      data-testid="source-file-combobox"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
    />
  ),
}));

const mockUseUnsyncedTransactions = vi.mocked(useUnsyncedTransactions);
const mockUsePlaidAccountsForLedger = vi.mocked(usePlaidAccountsForLedger);
const mockUseSuggestPlaidCategories = vi.mocked(useSuggestPlaidCategories);
const mockUseSubmitPlaidTransactions = vi.mocked(useSubmitPlaidTransactions);
const mockUseDeletePlaidTransactions = vi.mocked(useDeletePlaidTransactions);

const transaction = {
  id: "ptxn_1",
  plaidAccountId: "pacc_1",
  transactionId: "tx_1",
  date: "2026-01-15",
  amount: "12.50",
  merchantName: "Coffee Shop",
  name: "COFFEE SHOP #42",
  isPending: false,
  accountName: "Checking",
  institutionName: "Chase",
  ledgerAccount: "Assets:Checking",
};

const LEDGER_ID = "owner/ledger";

describe("TransactionReviewTable target file", () => {
  const submitTransactions = vi
    .fn()
    .mockResolvedValue({ success: true, addedCount: 1 });
  const refetch = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    submitTransactions
      .mockClear()
      .mockResolvedValue({ success: true, addedCount: 1 });

    mockUseUnsyncedTransactions.mockReturnValue({
      transactions: [transaction],
      loading: false,
      refetch,
    } as unknown as ReturnType<typeof useUnsyncedTransactions>);

    // This suite is about the target file, not filters — one account is enough
    // to keep both filter dropdowns hidden.
    mockUsePlaidAccountsForLedger.mockReturnValue({
      accounts: [],
      loading: false,
      refetch,
    } as unknown as ReturnType<typeof usePlaidAccountsForLedger>);

    mockUseSuggestPlaidCategories.mockReturnValue({
      suggestCategories: vi.fn().mockResolvedValue([]),
      loading: false,
    } as unknown as ReturnType<typeof useSuggestPlaidCategories>);

    mockUseSubmitPlaidTransactions.mockReturnValue({
      submitTransactions,
      loading: false,
    } as unknown as ReturnType<typeof useSubmitPlaidTransactions>);

    mockUseDeletePlaidTransactions.mockReturnValue({
      deleteTransactions: vi.fn().mockResolvedValue(undefined),
      loading: false,
    } as unknown as ReturnType<typeof useDeletePlaidTransactions>);
  });

  /** Select the row and give it a target account so submission passes validation. */
  const prepareRow = () => {
    fireEvent.click(
      screen.getByRole("checkbox", { name: /select transaction/i }),
    );
    const [, targetAccount] = screen.getAllByTestId("account-combobox");
    fireEvent.change(targetAccount, { target: { value: "Expenses:Food" } });
  };

  it("sends the chosen file as the submission's filename", async () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    prepareRow();
    fireEvent.change(screen.getByTestId("source-file-combobox"), {
      target: { value: "books/2026.bean" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(submitTransactions).toHaveBeenCalled());
    expect(submitTransactions).toHaveBeenCalledWith(
      LEDGER_ID,
      [
        {
          transactionId: "tx_1",
          targetAccount: "Expenses:Food",
          sourceAccount: "Assets:Checking",
        },
      ],
      "books/2026.bean",
    );
  });

  it("omits the filename when no file is chosen, leaving the backend default", async () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    prepareRow();
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(submitTransactions).toHaveBeenCalled());
    expect(submitTransactions).toHaveBeenCalledWith(
      LEDGER_ID,
      expect.any(Array),
      undefined,
    );
  });

  it("clears the chosen file after a successful submission", async () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    prepareRow();
    const filePicker = screen.getByTestId("source-file-combobox");
    fireEvent.change(filePicker, { target: { value: "books/2026.bean" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(filePicker).toHaveValue(""));
  });
});
