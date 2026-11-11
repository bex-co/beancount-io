import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "@apollo/client/react";
import { BalanceForm } from "../balance-form";
import { TransactionForm } from "../transaction-form";

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: vi.fn(),
  useQuery: () => ({ data: undefined, loading: false }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));

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

const CAPITALS = "Write the currency in capital letters, such as USD.";

/**
 * A lowercase or malformed currency went to the ledger and came back as
 * "information provided is invalid" (w2/114). New Entry now says what to
 * write before sending anything.
 */
describe("New Entry currency format", () => {
  let mutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mutate = vi.fn().mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    vi.mocked(useMutation).mockReturnValue([
      mutate,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);
  });

  const fillTransaction = (currency: string) => {
    const accounts = screen.getAllByRole("textbox", { name: "Account" });
    const amounts = screen.getAllByRole("spinbutton");
    const currencies = screen.getAllByRole("textbox", { name: "Currency" });
    [
      ["Expenses:Food:Coffee", "4.50"],
      ["Assets:Cash", "-4.50"],
    ].forEach(([account, amount], index) => {
      fireEvent.change(accounts[index]!, { target: { value: account } });
      fireEvent.change(amounts[index]!, { target: { value: amount } });
      fireEvent.change(currencies[index]!, { target: { value: currency } });
    });
  };

  it.each(["usd", "U$D"])(
    "keeps a Transaction with %s in the form and says to use capitals",
    async (currency) => {
      render(<TransactionForm ledgerId="owner/ledger" />);
      fillTransaction(currency);
      await userEvent.click(
        screen.getByRole("button", { name: "Create Transaction Entry" }),
      );

      expect(await screen.findAllByText(CAPITALS)).toHaveLength(2);
      expect(mutate).not.toHaveBeenCalled();
    },
  );

  it("sends a Transaction in USD", async () => {
    render(<TransactionForm ledgerId="owner/ledger" />);
    fillTransaction("USD");
    await userEvent.click(
      screen.getByRole("button", { name: "Create Transaction Entry" }),
    );

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(CAPITALS)).toBeNull();
  });

  const fillBalance = (currency: string) => {
    fireEvent.change(screen.getByRole("textbox", { name: "Account" }), {
      target: { value: "Assets:Cash" },
    });
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Currency" }), {
      target: { value: currency },
    });
  };

  it.each(["usd", "U$D"])(
    "keeps a Balance with %s in the form and says to use capitals",
    async (currency) => {
      render(<BalanceForm ledgerId="owner/ledger" />);
      fillBalance(currency);
      await userEvent.click(
        screen.getByRole("button", { name: "Create Balance Entry" }),
      );

      expect(await screen.findByText(CAPITALS)).toBeInTheDocument();
      expect(mutate).not.toHaveBeenCalled();
    },
  );

  it("sends a Balance in USD", async () => {
    render(<BalanceForm ledgerId="owner/ledger" />);
    fillBalance("USD");
    await userEvent.click(
      screen.getByRole("button", { name: "Create Balance Entry" }),
    );

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
  });
});

/**
 * A native number field in an English browser turned a typed `4,50` into 450
 * and New Entry booked it (w2/120).
 */
describe("New Entry typed decimal comma", () => {
  it("books 4,50 as 4.50, never 450", async () => {
    const mutate = vi.fn().mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });
    vi.mocked(useMutation).mockReturnValue([
      mutate,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);
    render(<TransactionForm ledgerId="owner/ledger" />);
    const accounts = screen.getAllByRole("textbox", { name: "Account" });
    fireEvent.change(accounts[0]!, {
      target: { value: "Expenses:Food:Coffee" },
    });
    fireEvent.change(accounts[1]!, { target: { value: "Assets:Cash" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0]!, {
      target: { value: "4,50" },
    });
    expect(screen.getByText("Recorded as 4.50")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Create Transaction Entry" }),
    );

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    const postings =
      mutate.mock.calls[0]![0].variables.entries[0].transaction.postings;
    expect(postings[0].units).toMatchObject({ number: "4.50" });
  });
});
