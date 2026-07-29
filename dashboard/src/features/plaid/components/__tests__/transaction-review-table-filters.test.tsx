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

/** Radix popovers can't be driven in jsdom, so both filter controls are swapped
 * for native elements with the same contract: a <select> for the single-value
 * bank filter, a checkbox list for the multi-select account filter. */
vi.mock("../transaction-filter-select", () => ({
  ALL_FILTER: "all",
  TransactionFilterSelect: ({
    value,
    onValueChange,
    options,
    allLabel,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
    allLabel: string;
    ariaLabel: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      <option value="all">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  TransactionMultiFilterSelect: ({
    values,
    onValuesChange,
    options,
    allLabel,
    triggerLabel,
    ariaLabel,
  }: {
    values: string[];
    onValuesChange: (values: string[]) => void;
    options: Array<{ value: string; label: string }>;
    allLabel: string;
    triggerLabel: string;
    ariaLabel: string;
  }) => (
    <div data-testid="account-filter" aria-label={ariaLabel}>
      <span data-testid="account-filter-label">{triggerLabel}</span>
      <button type="button" onClick={() => onValuesChange([])}>
        {allLabel}
      </button>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="checkbox"
            checked={values.includes(option.value)}
            onChange={(event) =>
              onValuesChange(
                event.target.checked
                  ? [...values, option.value]
                  : values.filter((value) => value !== option.value),
              )
            }
          />
          {option.label}
        </label>
      ))}
    </div>
  ),
}));

const mockUseUnsyncedTransactions = vi.mocked(useUnsyncedTransactions);
const mockUsePlaidAccountsForLedger = vi.mocked(usePlaidAccountsForLedger);
const mockUseSuggestPlaidCategories = vi.mocked(useSuggestPlaidCategories);
const mockUseSubmitPlaidTransactions = vi.mocked(useSubmitPlaidTransactions);
const mockUseDeletePlaidTransactions = vi.mocked(useDeletePlaidTransactions);

const LEDGER_ID = "owner/ledger";
const CHASE_ITEM = "pitm_chase";
const AMEX_ITEM = "pitm_amex";
const BANK_FILTER = "Filter by bank";

const transaction = (overrides: Record<string, unknown>) => ({
  date: "2026-01-15",
  amount: "12.50",
  isPending: false,
  ...overrides,
});

/** Two banks, and deliberately the same account label ("Checking") on both, so
 * a filter keyed on the label instead of the id would be caught. */
const CHASE_CHECKING = transaction({
  id: "ptxn_1",
  plaidAccountId: "pacc_1",
  transactionId: "tx_1",
  merchantName: "Coffee Shop",
  name: "COFFEE SHOP #42",
  accountName: "Checking",
  institutionName: "Chase",
  ledgerAccount: "Assets:Chase:Checking",
});
const CHASE_SAVINGS = transaction({
  id: "ptxn_2",
  plaidAccountId: "pacc_2",
  transactionId: "tx_2",
  merchantName: "Bookstore",
  name: "BOOKSTORE",
  accountName: "Savings",
  institutionName: "Chase",
  ledgerAccount: "Assets:Chase:Savings",
});
const AMEX_HOTEL = transaction({
  id: "ptxn_3",
  plaidAccountId: "pacc_3",
  transactionId: "tx_3",
  merchantName: "Hotel",
  name: "HOTEL STAY",
  accountName: "Checking",
  institutionName: "Amex",
  ledgerAccount: "Liabilities:Amex",
});
const AMEX_PLATINUM = transaction({
  id: "ptxn_4",
  plaidAccountId: "pacc_4",
  transactionId: "tx_4",
  merchantName: "Airline",
  name: "AIRLINE TICKET",
  accountName: "Platinum Card",
  institutionName: "Amex",
  ledgerAccount: "Liabilities:Amex:Platinum",
});

const ALL_ROWS = [CHASE_CHECKING, CHASE_SAVINGS, AMEX_HOTEL, AMEX_PLATINUM];

/** The persisted accounts the filter dropdowns are built from. Kept separate
 * from the rows above so a test can hand back an account that has nothing left
 * to review. */
const account = (overrides: Record<string, unknown>) => ({
  mask: null,
  ...overrides,
});
const CHASE_CHECKING_ACCOUNT = account({
  id: "pacc_1",
  plaidItemId: "pitm_chase",
  accountName: "Checking",
  institutionName: "Chase",
});
const CHASE_SAVINGS_ACCOUNT = account({
  id: "pacc_2",
  plaidItemId: "pitm_chase",
  accountName: "Savings",
  institutionName: "Chase",
});
const AMEX_CHECKING_ACCOUNT = account({
  id: "pacc_3",
  plaidItemId: "pitm_amex",
  accountName: "Checking",
  institutionName: "Amex",
});
const AMEX_PLATINUM_ACCOUNT = account({
  id: "pacc_4",
  plaidItemId: "pitm_amex",
  accountName: "Platinum Card",
  institutionName: "Amex",
});

const ALL_ACCOUNTS = [
  CHASE_CHECKING_ACCOUNT,
  CHASE_SAVINGS_ACCOUNT,
  AMEX_CHECKING_ACCOUNT,
  AMEX_PLATINUM_ACCOUNT,
];

describe("TransactionReviewTable bank and account filters", () => {
  const submitTransactions = vi
    .fn()
    .mockResolvedValue({ success: true, addedCount: 1 });
  const deleteTransactions = vi.fn().mockResolvedValue({ deletedCount: 1 });
  const refetch = vi.fn().mockResolvedValue(undefined);

  const mockTransactions = (rows: unknown[]) =>
    mockUseUnsyncedTransactions.mockReturnValue({
      transactions: rows,
      loading: false,
      refetch,
    } as unknown as ReturnType<typeof useUnsyncedTransactions>);

  const mockAccounts = (rows: unknown[]) =>
    mockUsePlaidAccountsForLedger.mockReturnValue({
      accounts: rows,
      loading: false,
      refetch,
    } as unknown as ReturnType<typeof usePlaidAccountsForLedger>);

  beforeEach(() => {
    vi.clearAllMocks();
    submitTransactions.mockResolvedValue({ success: true, addedCount: 1 });
    deleteTransactions.mockResolvedValue({ deletedCount: 1 });

    mockTransactions(ALL_ROWS);
    mockAccounts(ALL_ACCOUNTS);

    mockUseSuggestPlaidCategories.mockReturnValue({
      suggestCategories: vi.fn().mockResolvedValue([]),
      loading: false,
    } as unknown as ReturnType<typeof useSuggestPlaidCategories>);

    mockUseSubmitPlaidTransactions.mockReturnValue({
      submitTransactions,
      loading: false,
    } as unknown as ReturnType<typeof useSubmitPlaidTransactions>);

    mockUseDeletePlaidTransactions.mockReturnValue({
      deleteTransactions,
      loading: false,
    } as unknown as ReturnType<typeof useDeletePlaidTransactions>);
  });

  const selectFilter = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

  /** The bank filter's value is a Plaid item id, not the institution name —
   * two connections can carry the same name. */
  const selectBank = (itemId: string) => selectFilter(BANK_FILTER, itemId);

  /** Tick one bank account in the multi-select; call again to untick it. */
  const toggleAccount = (label: string) =>
    fireEvent.click(
      within(screen.getByTestId("account-filter")).getByRole("checkbox", {
        name: label,
      }),
    );

  const accountFilterLabel = () =>
    screen.getByTestId("account-filter-label").textContent;

  const selectRow = (name: string) =>
    fireEvent.click(
      screen.getByRole("checkbox", { name: `Select transaction ${name}` }),
    );

  const visibleMerchants = () =>
    ["Coffee Shop", "Bookstore", "Hotel", "Airline"].filter((merchant) =>
      screen.queryByText(merchant),
    );

  it("narrows the rows to the selected bank", () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    selectBank(CHASE_ITEM);

    expect(visibleMerchants()).toEqual(["Coffee Shop", "Bookstore"]);
  });

  it("offers only the selected bank's accounts", () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    selectBank(CHASE_ITEM);

    const accountLabels = within(screen.getByTestId("account-filter"))
      .getAllByRole("checkbox")
      .map((checkbox) => checkbox.parentElement?.textContent);
    expect(accountLabels).toEqual(["Checking", "Savings"]);
  });

  it("narrows the rows to several accounts at once", () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    // No bank picked, so accounts are labelled with their institution.
    toggleAccount("Chase · Checking");
    expect(visibleMerchants()).toEqual(["Coffee Shop"]);

    toggleAccount("Amex · Platinum Card");
    expect(visibleMerchants()).toEqual(["Coffee Shop", "Airline"]);
    expect(accountFilterLabel()).toBe("2 accounts selected");

    // Unticking the first leaves the second applied.
    toggleAccount("Chase · Checking");
    expect(visibleMerchants()).toEqual(["Airline"]);
    expect(accountFilterLabel()).toBe("Amex · Platinum Card");
  });

  it("clears every account pick from the dropdown", () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    toggleAccount("Chase · Checking");
    toggleAccount("Chase · Savings");
    expect(visibleMerchants()).toEqual(["Coffee Shop", "Bookstore"]);

    fireEvent.click(
      within(screen.getByTestId("account-filter")).getByRole("button", {
        name: /all bank accounts/i,
      }),
    );

    expect(visibleMerchants()).toEqual([
      "Coffee Shop",
      "Bookstore",
      "Hotel",
      "Airline",
    ]);
  });

  it("does not mix up accounts that share a name across banks", () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    // Both Chase and Amex label an account "Checking"; filtering to the Amex
    // one must not pull in the Chase rows.
    selectBank(AMEX_ITEM);
    toggleAccount("Checking");

    expect(visibleMerchants()).toEqual(["Hotel"]);
  });

  it("resets the account filter when the bank changes", () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    selectBank(CHASE_ITEM);
    toggleAccount("Checking");
    expect(visibleMerchants()).toEqual(["Coffee Shop"]);

    selectBank(AMEX_ITEM);

    expect(accountFilterLabel()).toBe("All bank accounts");
    expect(visibleMerchants()).toEqual(["Hotel", "Airline"]);
  });

  it("shows an empty state that clears every filter", () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    selectBank(CHASE_ITEM);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "hotel" },
    });

    expect(
      screen.getByText(/no transactions match the current filters/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(visibleMerchants()).toEqual([
      "Coffee Shop",
      "Bookstore",
      "Hotel",
      "Airline",
    ]);
    expect(screen.getByLabelText(BANK_FILTER)).toHaveValue("all");
  });

  it("keeps the bank selected after its last row is submitted", () => {
    const { rerender } = render(
      <TransactionReviewTable ledgerId={LEDGER_ID} />,
    );

    selectBank(CHASE_ITEM);
    expect(visibleMerchants()).toEqual(["Coffee Shop", "Bookstore"]);

    // A refetch after submitting every Chase transaction leaves only Amex rows.
    // The bank is still connected, so the filter stays put and the user sees an
    // empty state rather than being silently bounced back to every bank.
    mockTransactions([AMEX_HOTEL, AMEX_PLATINUM]);
    rerender(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    expect(screen.getByLabelText(BANK_FILTER)).toHaveValue(CHASE_ITEM);
    expect(visibleMerchants()).toEqual([]);
    expect(
      screen.getByText(/no transactions match the current filters/i),
    ).toBeInTheDocument();
  });

  it("stops filtering when the selected bank leaves the ledger", () => {
    const { rerender } = render(
      <TransactionReviewTable ledgerId={LEDGER_ID} />,
    );

    selectBank(CHASE_ITEM);
    expect(visibleMerchants()).toEqual(["Coffee Shop", "Bookstore"]);

    // The bank was disconnected (or its accounts removed) while the page was
    // open. A filter value that no longer exists must stop filtering rather
    // than hide everything with no way back.
    mockAccounts([AMEX_CHECKING_ACCOUNT, AMEX_PLATINUM_ACCOUNT]);
    mockTransactions([AMEX_HOTEL, AMEX_PLATINUM]);
    rerender(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    expect(visibleMerchants()).toEqual(["Hotel", "Airline"]);
  });

  it("offers accounts that have nothing left to review", () => {
    // The whole point of sourcing options from persisted accounts: "this
    // account has no pending transactions" becomes a thing you can confirm.
    mockTransactions([CHASE_CHECKING]);
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    selectBank(CHASE_ITEM);

    const accountFilter = within(screen.getByTestId("account-filter"));
    expect(
      accountFilter.getByRole("checkbox", { name: "Savings" }),
    ).toBeInTheDocument();

    fireEvent.click(accountFilter.getByRole("checkbox", { name: "Savings" }));

    expect(visibleMerchants()).toEqual([]);
    expect(
      screen.getByText(/no transactions match the current filters/i),
    ).toBeInTheDocument();
  });

  it("offers banks that have nothing left to review", () => {
    mockTransactions([CHASE_CHECKING]);
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    selectBank(AMEX_ITEM);

    expect(screen.getByLabelText(BANK_FILTER)).toHaveValue(AMEX_ITEM);
    expect(visibleMerchants()).toEqual([]);
  });

  it("keeps two connections to the same bank apart", () => {
    // Same institutionName, different Plaid items — matching on the name would
    // merge them into one option and mix their rows.
    mockAccounts([
      CHASE_CHECKING_ACCOUNT,
      account({
        id: "pacc_9",
        plaidItemId: "pitm_chase_two",
        accountName: "Checking",
        institutionName: "Chase",
      }),
    ]);
    mockTransactions([
      CHASE_CHECKING,
      transaction({
        id: "ptxn_9",
        plaidAccountId: "pacc_9",
        transactionId: "tx_9",
        merchantName: "Hotel",
        name: "HOTEL STAY",
        accountName: "Checking",
        institutionName: "Chase",
        ledgerAccount: "Assets:Chase2:Checking",
      }),
    ]);
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    selectBank(CHASE_ITEM);
    expect(visibleMerchants()).toEqual(["Coffee Shop"]);

    selectBank("pitm_chase_two");
    expect(visibleMerchants()).toEqual(["Hotel"]);
  });

  it("hides both dropdowns when the accounts query has nothing to offer", () => {
    // Loading or failed: degrade to an unfiltered table rather than a broken one.
    mockAccounts([]);
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    expect(screen.queryByLabelText(BANK_FILTER)).not.toBeInTheDocument();
    expect(screen.queryByTestId("account-filter")).not.toBeInTheDocument();
    expect(visibleMerchants()).toEqual([
      "Coffee Shop",
      "Bookstore",
      "Hotel",
      "Airline",
    ]);
  });

  it("keeps select-all to the visible rows without dropping hidden selections", () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    selectBank(CHASE_ITEM);
    fireEvent.click(screen.getByRole("checkbox", { name: /select all/i }));

    selectBank(AMEX_ITEM);
    // Select-all under Amex must add to, not replace, the Chase selection.
    fireEvent.click(screen.getByRole("checkbox", { name: /select all/i }));

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    screen
      .getAllByRole("checkbox", { name: /select transaction/i })
      .forEach((checkbox) => expect(checkbox).toBeChecked());
  });

  it("still submits selected rows that the filters hide", async () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    selectRow("COFFEE SHOP #42");
    const [, coffeeTargetAccount] = screen.getAllByTestId("account-combobox");
    fireEvent.change(coffeeTargetAccount, {
      target: { value: "Expenses:Food" },
    });

    selectBank(AMEX_ITEM);
    expect(visibleMerchants()).toEqual(["Hotel", "Airline"]);
    expect(
      screen.getByText(/hidden by the current filters/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(submitTransactions).toHaveBeenCalled());
    expect(submitTransactions).toHaveBeenCalledWith(
      LEDGER_ID,
      [
        {
          transactionId: "tx_1",
          targetAccount: "Expenses:Food",
          sourceAccount: "Assets:Chase:Checking",
        },
      ],
      undefined,
    );
  });

  it("still deletes selected rows that the filters hide", async () => {
    render(<TransactionReviewTable ledgerId={LEDGER_ID} />);

    selectRow("COFFEE SHOP #42");
    selectBank(AMEX_ITEM);
    selectRow("HOTEL STAY");

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: /^delete$/i,
      }),
    );

    await waitFor(() => expect(deleteTransactions).toHaveBeenCalled());
    expect(deleteTransactions).toHaveBeenCalledWith(LEDGER_ID, [
      "tx_1",
      "tx_3",
    ]);
  });
});
