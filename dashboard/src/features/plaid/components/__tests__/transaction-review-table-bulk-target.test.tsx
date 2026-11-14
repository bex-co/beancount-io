import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
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
  }: {
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <input
      data-testid="source-file-combobox"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    />
  ),
}));

const mockUseUnsyncedTransactions = vi.mocked(useUnsyncedTransactions);
const mockUsePlaidAccountsForLedger = vi.mocked(usePlaidAccountsForLedger);
const mockUseSuggestPlaidCategories = vi.mocked(useSuggestPlaidCategories);
const mockUseSubmitPlaidTransactions = vi.mocked(useSubmitPlaidTransactions);
const mockUseDeletePlaidTransactions = vi.mocked(useDeletePlaidTransactions);

const LEDGER_ID = "owner/ledger";
const UNCATEGORIZED = "Expenses:Uncategorized";

const row = (n: number, name: string) => ({
  id: `ptxn_${n}`,
  plaidAccountId: "pacc_1",
  transactionId: `tx_${n}`,
  date: "2026-01-15",
  amount: "12.50",
  merchantName: name,
  name: name.toUpperCase(),
  isPending: false,
  accountName: "Checking",
  institutionName: "Chase",
  ledgerAccount: "Assets:Checking",
});

const ROWS = [
  row(1, "Coffee Shop"),
  row(2, "Bookstore"),
  row(3, "Hotel"),
  row(4, "Airline"),
];

describe("TransactionReviewTable Set for selected", () => {
  const submitTransactions = vi
    .fn()
    .mockResolvedValue({ success: true, addedCount: 4 });
  const refetch = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    submitTransactions
      .mockClear()
      .mockResolvedValue({ success: true, addedCount: 4 });

    mockUseUnsyncedTransactions.mockReturnValue({
      transactions: ROWS,
      loading: false,
      refetch,
    } as unknown as ReturnType<typeof useUnsyncedTransactions>);
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

  const setForSelectedButton = () =>
    screen.getByRole("button", { name: /set for selected/i });

  const selectAll = () =>
    fireEvent.click(screen.getByRole("checkbox", { name: /select all/i }));

  const selectRow = (index: number) =>
    fireEvent.click(
      screen.getAllByRole("checkbox", { name: /select transaction/i })[index],
    );

  const search = (text: string) =>
    fireEvent.change(screen.getByPlaceholderText(/search by merchant/i), {
      target: { value: text },
    });

  /** The table's per-row account pickers come source, target, source, target… */
  const rowTargetInputs = () => {
    const pickers = within(screen.getByRole("table")).getAllByTestId(
      "account-combobox",
    ) as HTMLInputElement[];
    return pickers.filter((_, index) => index % 2 === 1);
  };
  const rowTargets = () => rowTargetInputs().map((input) => input.value);

  const openPanel = async () => {
    fireEvent.click(setForSelectedButton());
    return screen.findByRole("dialog");
  };

  const chooseInPanel = (panel: HTMLElement, account: string) =>
    fireEvent.change(within(panel).getByTestId("account-combobox"), {
      target: { value: account },
    });

  const apply = async (panel: HTMLElement) => {
    fireEvent.click(within(panel).getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  };

  it("gives every selected row the account, including rows a filter hides, and submits in one action", async () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);
    selectAll();
    expect(
      screen.getByText(/4 selected transactions need target accounts/i),
    ).toBeInTheDocument();

    // Narrow the table to one row: three selected rows are now off screen.
    search("airline");
    expect(rowTargetInputs()).toHaveLength(1);

    const panel = await openPanel();
    expect(
      within(panel).getByText(
        /set the target account for 4 selected transactions/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(/3 of them are hidden by the current filters/i),
    ).toBeInTheDocument();
    chooseInPanel(panel, UNCATEGORIZED);
    await apply(panel);

    search("");
    expect(rowTargets()).toEqual([
      UNCATEGORIZED,
      UNCATEGORIZED,
      UNCATEGORIZED,
      UNCATEGORIZED,
    ]);
    expect(
      screen.queryByText(/selected transactions need target accounts/i),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(submitTransactions).toHaveBeenCalledTimes(1));
    const [, submitted] = submitTransactions.mock.calls[0];
    expect(submitted).toHaveLength(4);
    expect(
      submitted.every(
        (tx: { targetAccount: string }) => tx.targetAccount === UNCATEGORIZED,
      ),
    ).toBe(true);
  });

  it("keeps a target that is already set by default and replaces it with the option ticked", async () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);
    selectAll();
    fireEvent.change(rowTargetInputs()[0], {
      target: { value: "Expenses:Dining" },
    });

    let panel = await openPanel();
    chooseInPanel(panel, UNCATEGORIZED);
    expect(
      within(panel).getByText(/3 transactions will get this account/i),
    ).toBeInTheDocument();
    await apply(panel);
    expect(rowTargets()).toEqual([
      "Expenses:Dining",
      UNCATEGORIZED,
      UNCATEGORIZED,
      UNCATEGORIZED,
    ]);

    // The panel starts fresh each time: the option is off again, and it now
    // counts the four rows that have a target.
    panel = await openPanel();
    const replace = within(panel).getByRole("checkbox", {
      name: /also replace 4 targets that are already set/i,
    });
    expect(replace).not.toBeChecked();
    chooseInPanel(panel, "Expenses:Groceries");
    fireEvent.click(replace);
    expect(
      within(panel).getByText(/4 transactions will get this account/i),
    ).toBeInTheDocument();
    await apply(panel);
    expect(rowTargets()).toEqual([
      "Expenses:Groceries",
      "Expenses:Groceries",
      "Expenses:Groceries",
      "Expenses:Groceries",
    ]);
  });

  it("leaves rows that are not selected exactly as they were", async () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);
    selectRow(0);
    selectRow(2);

    const panel = await openPanel();
    chooseInPanel(panel, UNCATEGORIZED);
    await apply(panel);

    expect(rowTargets()).toEqual([UNCATEGORIZED, "", UNCATEGORIZED, ""]);
  });

  it("is disabled, with its reason as the description, while nothing is selected", () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    const button = setForSelectedButton();
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      /select transactions first to set their target account/i,
    );

    selectRow(1);
    expect(setForSelectedButton()).toBeEnabled();
  });

  it("will not apply until an account is chosen, and says how many rows it will set", async () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);
    selectAll();

    const panel = await openPanel();
    const applyButton = within(panel).getByRole("button", { name: "Apply" });
    expect(applyButton).toBeDisabled();
    expect(
      within(panel).queryByText(/will get this account/i),
    ).not.toBeInTheDocument();

    chooseInPanel(panel, UNCATEGORIZED);
    expect(applyButton).toBeEnabled();
    expect(
      within(panel).getByText(/4 transactions will get this account/i),
    ).toBeInTheDocument();
  });

  it("changes nothing when the panel is cancelled", async () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);
    selectAll();

    const panel = await openPanel();
    chooseInPanel(panel, UNCATEGORIZED);
    fireEvent.click(within(panel).getByRole("button", { name: /cancel/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    expect(rowTargets()).toEqual(["", "", "", ""]);
  });

  it("returns focus to the control after Apply and leaves each row editable", async () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);
    selectAll();

    const panel = await openPanel();
    chooseInPanel(panel, UNCATEGORIZED);
    await apply(panel);
    await waitFor(() => expect(setForSelectedButton()).toHaveFocus());

    fireEvent.change(rowTargetInputs()[1], {
      target: { value: "Expenses:Books" },
    });
    expect(rowTargets()).toEqual([
      UNCATEGORIZED,
      "Expenses:Books",
      UNCATEGORIZED,
      UNCATEGORIZED,
    ]);
  });

  it("still refuses to submit a selected row that has no target", async () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);
    selectAll();

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() =>
      expect(
        screen.getAllByText(/need target accounts/i).length,
      ).toBeGreaterThan(0),
    );
    expect(submitTransactions).not.toHaveBeenCalled();
  });
});
