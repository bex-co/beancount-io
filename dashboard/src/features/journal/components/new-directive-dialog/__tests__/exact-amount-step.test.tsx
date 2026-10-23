import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "@apollo/client/react";
import { BalanceForm } from "../balance-form";
import { TransactionForm } from "../transaction-form";

/**
 * The browser steps a number input through a double: one ArrowUp turned
 * 9007199254740993.01 into 9.00719925474099e+15, a reduction of 3.01, and
 * auto-balance carried it into the other posting (w4/1017). The amount
 * fields now step by one in exact decimal arithmetic. jsdom does no native
 * stepping, so these assert the fields' own step; a draft is set with a
 * change event, since user-event retypes long numbers through a double.
 */
vi.mock("@apollo/client/react", () => ({
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

const mutate = vi.fn();
beforeEach(() => {
  mutate.mockReset();
  mutate.mockResolvedValue({ data: { bulkEntries: { success: true } } });
  vi.mocked(useMutation).mockReturnValue([
    mutate,
    { loading: false },
  ] as unknown as ReturnType<typeof useMutation>);
});

async function transaction() {
  render(<TransactionForm ledgerId="owner/ledger" />);
  // The form focuses Payee once it opens; let that land first.
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Payee" })).toHaveFocus(),
  );
  const accounts = screen.getAllByRole("textbox", { name: "Account" });
  fireEvent.change(accounts[0]!, { target: { value: "Assets:Cash" } });
  fireEvent.change(accounts[1]!, {
    target: { value: "Equity:Opening-Balances" },
  });
  return screen.getAllByRole("spinbutton")[0] as HTMLInputElement;
}

const postedNumbers = () =>
  (
    mutate.mock.calls[0]![0].variables.entries[0].transaction.postings as {
      units: { number: string };
    }[]
  ).map((posting) => posting.units.number);

describe("exact amount stepping", () => {
  it("steps a large Transaction amount up by exactly one and posts it", async () => {
    const user = userEvent.setup();
    const amount = await transaction();
    fireEvent.change(amount, { target: { value: "9007199254740993.01" } });
    amount.focus();
    await user.keyboard("{ArrowUp}");
    expect(amount.value).toBe("9007199254740994.01");

    await user.click(
      screen.getByRole("button", { name: "Create Transaction Entry" }),
    );
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(postedNumbers()).toEqual([
      "9007199254740994.01",
      "-9007199254740994.01",
    ]);
  });

  it("steps down exactly, keeps small and negative amounts, and starts a blank at one", async () => {
    const user = userEvent.setup();
    const amount = await transaction();
    const draft = async (value: string, keys: string) => {
      fireEvent.change(amount, { target: { value } });
      amount.focus();
      await user.keyboard(keys);
      return amount.value;
    };
    expect(await draft("9007199254740993.01", "{ArrowDown}{ArrowDown}")).toBe(
      "9007199254740991.01",
    );
    expect(await draft("12.50", "{ArrowUp}")).toBe("13.50");
    expect(await draft("-0.25", "{ArrowUp}")).toBe("0.75");
    expect(await draft("", "{ArrowDown}")).toBe("-1");
  });

  it("steps the Balance amount exactly too", async () => {
    const user = userEvent.setup();
    render(<BalanceForm ledgerId="owner/ledger" />);
    const amount = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(amount, { target: { value: "12345678901234567890.12" } });
    amount.focus();
    await user.keyboard("{ArrowUp}");
    expect(amount.value).toBe("12345678901234567891.12");
  });

  it("keeps the wheel from stepping a focused amount", async () => {
    const amount = await transaction();
    const unfocused = new WheelEvent("wheel", { cancelable: true });
    amount.dispatchEvent(unfocused);
    expect(unfocused.defaultPrevented).toBe(false);

    amount.focus();
    const focused = new WheelEvent("wheel", { cancelable: true });
    amount.dispatchEvent(focused);
    expect(focused.defaultPrevented).toBe(true);
  });
});
