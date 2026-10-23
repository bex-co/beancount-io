import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { TransactionForm } from "../transaction-form";

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
  // No account directory: the account-availability check stays out of the way.
  useQuery: () => ({ data: undefined, loading: false }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));

// vi.mock is hoisted above top-level declarations, so the stub lives here.
const { field } = vi.hoisted(() => ({
  field:
    (label: string) =>
    ({
      value,
      onValueChange,
    }: {
      value: string;
      onValueChange: (v: string) => void;
    }) => (
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
    ),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: field("Account"),
  CurrencyCombobox: field("Currency"),
  PayeesCombobox: () => <input aria-label="Payee" />,
  NarrationsCombobox: () => <input aria-label="Narration" />,
}));

const mockUseMutation = vi.mocked(useMutation);

/** Fill posting rows; a blank amount is left for auto-balance. */
function fillPostings(rows: [string, string, string][]) {
  rows.forEach(([account, amount, currency], index) => {
    fireEvent.change(
      screen.getAllByRole("textbox", { name: "Account" })[index]!,
      {
        target: { value: account },
      },
    );
    fireEvent.change(screen.getAllByRole("spinbutton")[index]!, {
      target: { value: amount },
    });
    fireEvent.change(
      screen.getAllByRole("textbox", { name: "Currency" })[index]!,
      { target: { value: currency } },
    );
  });
}

const submit = () =>
  userEvent.click(
    screen.getByRole("button", { name: "Create Transaction Entry" }),
  );

const sentPostings = (mutate: ReturnType<typeof vi.fn>) =>
  mutate.mock.calls[0]?.[0]?.variables?.entries?.[0]?.transaction?.postings;

/**
 * Whether postings balance is the ledger's call: a ledger can configure its
 * tolerance (`option "inferred_tolerance_default" "USD:0.01"`), which New
 * Entry cannot see, so it sends the entry and reports the ledger's UNBALANCED
 * refusal with its residual (w3/499, w4/1026).
 */
describe("New Entry leaves balancing to the ledger", () => {
  let addTransaction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    addTransaction = vi.fn().mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    mockUseMutation.mockReturnValue([
      addTransaction,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);
  });

  it("sends -10.00 / 9.99 USD unchanged for a ledger tolerance to accept", async () => {
    render(<TransactionForm ledgerId="owner/ledger" />);
    fillPostings([
      ["Assets:Bank:Checking", "-10.00", "USD"],
      ["Expenses:Food:Coffee", "9.99", "USD"],
    ]);

    await submit();

    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1));
    expect(
      sentPostings(addTransaction).map(
        (p: { units: { number: string } }) => p.units.number,
      ),
    ).toEqual(["-10.00", "9.99"]);
    expect(screen.queryByText(/^Postings don't balance/)).toBeNull();
  });

  it("submits 10 / -10 USD as typed", async () => {
    render(<TransactionForm ledgerId="owner/ledger" />);
    fillPostings([
      ["Expenses:Food", "10", "USD"],
      ["Assets:Cash", "-10", "USD"],
    ]);

    await submit();

    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1));
    expect(
      sentPostings(addTransaction).map(
        (p: { units: { number: string } }) => p.units.number,
      ),
    ).toEqual(["10", "-10"]);
  });

  it("submits 10 / blank with the inferred -10", async () => {
    render(<TransactionForm ledgerId="owner/ledger" />);
    fillPostings([
      ["Expenses:Food", "10", "USD"],
      ["Assets:Cash", "", "USD"],
    ]);

    await submit();

    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1));
    expect(sentPostings(addTransaction)[1].units.number).toBe("-10");
  });

  it("names the ledger's residual and keeps the draft when it refuses 10 / -9 USD", async () => {
    addTransaction.mockRejectedValue(
      new CombinedGraphQLErrors({
        errors: [
          {
            message: "entry 0: Transaction does not balance: residual 1 USD",
            extensions: { code: "UNBALANCED", residual: "1 USD", entry: 0 },
          },
        ],
      }),
    );
    render(<TransactionForm ledgerId="owner/ledger" />);
    fillPostings([
      ["Expenses:Food", "10", "USD"],
      ["Assets:Cash", "-9", "USD"],
    ]);

    await submit();

    expect(
      await screen.findByText(
        "Postings don't balance: 1 USD left over. Adjust an amount, or clear one to balance it automatically.",
      ),
    ).toBeInTheDocument();
    expect(addTransaction).toHaveBeenCalledTimes(1);
    // The refused draft stays as typed, ready to correct.
    expect(
      screen
        .getAllByRole("spinbutton")
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(expect.arrayContaining(["10", "-9"]));
  });
});

/**
 * A blank or whitespace currency is balanced as the primary currency, so it
 * is submitted as that currency too, not as "" (w4/339).
 */
describe("New Entry submits the currency auto-balance used", () => {
  let addTransaction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    addTransaction = vi.fn().mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    mockUseMutation.mockReturnValue([
      addTransaction,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);
  });

  const units = () =>
    sentPostings(addTransaction).map(
      (p: { account: string; units: { number: string; currency: string } }) => [
        p.account,
        p.units.number,
        p.units.currency,
      ],
    );

  it.each([
    ["empty", ""],
    ["whitespace", "   "],
  ])(
    "sends the inferred posting with an %s currency in USD, ignoring the unused row",
    async (_, blank) => {
      render(<TransactionForm ledgerId="owner/ledger" />);
      fillPostings([
        ["Assets:Cash", "0.1", "USD"],
        ["Expenses:Food:Groceries", "", blank],
      ]);
      // The inferred amount is shown before anything is sent.
      expect(screen.getAllByRole("spinbutton")[1]).toHaveAttribute(
        "placeholder",
        "-0.1",
      );

      await submit();

      await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1));
      expect(units()).toEqual([
        ["Assets:Cash", "0.1", "USD"],
        ["Expenses:Food:Groceries", "-0.1", "USD"],
      ]);
    },
  );

  it.each([
    ["empty", ""],
    ["whitespace", "   "],
  ])("sends a filled posting with an %s currency in USD", async (_, blank) => {
    render(<TransactionForm ledgerId="owner/ledger" />);
    fillPostings([
      ["Assets:Cash", "0.1", blank],
      ["Expenses:Food:Groceries", "", "USD"],
    ]);

    await submit();

    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1));
    expect(units()).toEqual([
      ["Assets:Cash", "0.1", "USD"],
      ["Expenses:Food:Groceries", "-0.1", "USD"],
    ]);
  });

  it("keeps explicit currencies, trimmed, in their own groups", async () => {
    render(<TransactionForm ledgerId="owner/ledger" />);
    fillPostings([
      ["Expenses:Travel", "12.50", " EUR "],
      ["Assets:Wallet", "", "EUR"],
      ["Expenses:Food", "3", "USD"],
      ["Assets:Cash", "", ""],
    ]);

    await submit();

    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1));
    expect(units()).toEqual([
      ["Expenses:Travel", "12.50", "EUR"],
      ["Assets:Wallet", "-12.50", "EUR"],
      ["Expenses:Food", "3", "USD"],
      ["Assets:Cash", "-3", "USD"],
    ]);
  });
});

/** The submit shortcut leaves an active composition to the input method (w4/965). */
describe("New Entry Ctrl/Meta+Enter during composition", () => {
  let addTransaction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    addTransaction = vi.fn().mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    mockUseMutation.mockReturnValue([
      addTransaction,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);
  });

  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Meta", { metaKey: true }],
  ])(
    "sends nothing for a composing %s+Enter, then submits once after composition",
    async (_, modifier) => {
      render(<TransactionForm ledgerId="owner/ledger" />);
      fillPostings([
        ["Assets:Bank:Checking", "-1.25", "USD"],
        ["Expenses:Food:Coffee", "", "USD"],
      ]);
      const payee = screen.getByRole("textbox", { name: "Payee" });
      payee.focus();

      // Both ways engines report a key the input method is consuming.
      fireEvent.keyDown(payee, {
        key: "Enter",
        isComposing: true,
        ...modifier,
      });
      fireEvent.keyDown(payee, { key: "Enter", keyCode: 229, ...modifier });
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(addTransaction).not.toHaveBeenCalled();

      fireEvent.keyDown(payee, { key: "Enter", ...modifier });
      await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1));
      expect(
        sentPostings(addTransaction).map(
          (p: { units: { number: string } }) => p.units.number,
        ),
      ).toEqual(["-1.25", "1.25"]);
    },
  );
});
