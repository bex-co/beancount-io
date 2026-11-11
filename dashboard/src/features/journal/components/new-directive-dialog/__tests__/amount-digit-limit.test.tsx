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

const LIMIT = "Amounts can have at most 28 digits.";

const NINES_28 = "9".repeat(28);
const NINES_29 = "9".repeat(29);

/**
 * A 29-digit amount was sent, refused by the ledger as "not a decimal
 * number", and shown as "information provided is invalid" (w2/129). New Entry
 * now refuses it in the field, before anything is sent.
 */
describe("New Entry amount digit limit", () => {
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

  const fillTransaction = (amount: string) => {
    const accounts = screen.getAllByRole("textbox", { name: "Account" });
    fireEvent.change(accounts[0]!, {
      target: { value: "Expenses:Food:Coffee" },
    });
    fireEvent.change(accounts[1]!, { target: { value: "Assets:Cash" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0]!, {
      target: { value: amount },
    });
  };

  const create = () =>
    userEvent.click(
      screen.getByRole("button", { name: "Create Transaction Entry" }),
    );

  it.each([
    ["29 digits", NINES_29],
    ["27 whole digits and 2 decimals", `${"9".repeat(27)}.99`],
    ["29 decimals", `0.${"0".repeat(28)}1`],
  ])("keeps a Transaction of %s in the form", async (_, amount) => {
    render(<TransactionForm ledgerId="owner/ledger" />);
    fillTransaction(amount);

    // Said while it is typed, not only on submit.
    expect(await screen.findByText(LIMIT)).toBeInTheDocument();
    await create();
    expect(mutate).not.toHaveBeenCalled();
  });

  it.each([
    ["28 digits", NINES_28, NINES_28],
    ["26 whole digits and 2 decimals", `${"9".repeat(26)}.99`, null],
    ["leading zeros", `000${NINES_28}`, NINES_28],
  ])("sends a Transaction of %s", async (_, amount, sent) => {
    render(<TransactionForm ledgerId="owner/ledger" />);
    fillTransaction(amount);
    await create();

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(LIMIT)).toBeNull();
    const [posting] =
      mutate.mock.calls[0]![0].variables.entries[0].transaction.postings;
    expect(posting.units.number).toBe(sent ?? amount);
  });

  const fillBalance = (amount: string) => {
    fireEvent.change(screen.getByRole("textbox", { name: "Account" }), {
      target: { value: "Assets:Cash" },
    });
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: amount },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Currency" }), {
      target: { value: "USD" },
    });
  };

  it("keeps a 29-digit Balance in the form, and sends 28", async () => {
    render(<BalanceForm ledgerId="owner/ledger" />);
    fillBalance(NINES_29);
    expect(await screen.findByText(LIMIT)).toBeInTheDocument();
    const createBalance = screen.getByRole("button", {
      name: "Create Balance Entry",
    });
    await userEvent.click(createBalance);
    expect(mutate).not.toHaveBeenCalled();

    fillBalance(NINES_28);
    await waitFor(() => expect(screen.queryByText(LIMIT)).toBeNull());
    await userEvent.click(createBalance);
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
  });
});
