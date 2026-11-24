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

  it("lets the title and actions wrap, with the file picker full-width on phones", () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    const header = screen
      .getByRole("heading", { name: "Bank Transactions" })
      .closest('[data-slot="card-header"]');
    const filePicker = screen.getByTestId("source-file-combobox").parentElement;
    const actions = filePicker?.parentElement;
    expect(header?.firstElementChild).toHaveClass("flex-wrap");
    expect(actions).toHaveClass("w-full", "flex-wrap", "sm:w-auto");
    expect(filePicker).toHaveClass("w-full", "sm:w-70");
    expect(actions).toContainElement(
      screen.getByRole("button", { name: /submit/i }),
    );
    expect(actions).toContainElement(
      screen.getByRole("button", { name: /delete/i }),
    );
  });

  it("fits the table to its card instead of to its longest description", () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    // min-w-max sized the table to every row's full text, so a long bank
    // description pushed the account pickers past the card's edge.
    expect(screen.getByRole("table")).not.toHaveClass("min-w-max");
    for (const name of [/^source account$/i, /^target account/i]) {
      expect(screen.getByRole("columnheader", { name })).toHaveClass(
        "min-w-[220px]",
      );
    }

    // The body's overflow-wrap: anywhere let the label shrink to one letter
    // per line beside the bulk actions; now it stays whole and they wrap.
    const label = screen.getByText("Target Account");
    expect(label).toHaveClass("whitespace-nowrap");
    expect(label.parentElement).toHaveClass("flex-wrap");

    // On a phone the bank filters wrap below the search box instead of
    // squeezing it to its first word.
    const search = screen.getByPlaceholderText(/search by merchant/i);
    expect(search.parentElement).toHaveClass("min-w-56", "flex-1");
    expect(search.parentElement?.parentElement).toHaveClass("flex-wrap");
  });

  it("shows the merchant over the bank's description in one clamped column", () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    const merchant = screen.getByText("Coffee Shop");
    const description = screen.getByText("COFFEE SHOP #42");
    expect(merchant.closest("td")).toBe(description.closest("td"));
    expect(merchant.closest("td")).toHaveClass("min-w-40", "max-w-80");
    for (const line of [merchant, description]) {
      expect(line).toHaveClass("line-clamp-2");
      expect(line).toHaveAttribute("dir", "auto");
      expect(line).toHaveAttribute("title", line.textContent);
    }
  });

  it("shows a description once when the bank names no merchant", () => {
    mockUseUnsyncedTransactions.mockReturnValue({
      transactions: [{ ...transaction, merchantName: null }],
      loading: false,
      refetch,
    } as unknown as ReturnType<typeof useUnsyncedTransactions>);
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    expect(screen.getAllByText("COFFEE SHOP #42")).toHaveLength(1);
  });

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
