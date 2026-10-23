import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "@apollo/client/react";
import { TransactionForm } from "../transaction-form";

/**
 * A number input holding an unfinished "1e" or "-" reports an empty value
 * and a native validity error. Create was refused by the browser, but
 * Ctrl/Cmd+Enter submitted straight through react-hook-form, and the "empty"
 * amount was auto-balanced to 12.50 (w4/1014).
 *
 * jsdom cannot hold a number input's bad input, so the field's native
 * invalid state is set with setCustomValidity, which jsdom's form
 * validation honors exactly as a browser does.
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

/** Posting 1 left for the reader; Posting 2 is -12.50 USD. */
function draft() {
  render(<TransactionForm ledgerId="owner/ledger" />);
  const accounts = screen.getAllByRole("textbox", { name: "Account" });
  fireEvent.change(accounts[0]!, { target: { value: "Assets:Cash" } });
  fireEvent.change(accounts[1]!, {
    target: { value: "Equity:Opening-Balances" },
  });
  const [first, second] = screen.getAllByRole("spinbutton");
  fireEvent.change(second!, { target: { value: "-12.50" } });
  return first as HTMLInputElement;
}

const postedNumbers = () =>
  (
    mutate.mock.calls[0]![0].variables.entries[0].transaction.postings as {
      units: { number: string };
    }[]
  ).map((posting) => posting.units.number);

describe("Ctrl/Cmd+Enter honors the amount's native validity", () => {
  it.each([
    ["Cmd", { metaKey: true }],
    ["Ctrl", { ctrlKey: true }],
  ])(
    "%s+Enter refuses an unfinished number, then submits once it is fixed",
    async (_name, modifier) => {
      const amount = draft();
      const invalid = vi.fn();
      amount.addEventListener("invalid", invalid);
      // The browser's state for "1e": no value, and not valid.
      amount.setCustomValidity("Please enter a number.");

      fireEvent.keyDown(amount, { key: "Enter", ...modifier });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mutate).not.toHaveBeenCalled();
      // The browser reports the field, as it does for Create.
      expect(invalid).toHaveBeenCalled();

      // Repaired, the same shortcut submits exactly what was typed.
      amount.setCustomValidity("");
      fireEvent.change(amount, { target: { value: "12.5" } });
      fireEvent.keyDown(amount, { key: "Enter", ...modifier });
      await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
      expect(postedNumbers()).toEqual(["12.5", "-12.50"]);
    },
  );

  it("still infers a genuinely blank amount", async () => {
    const amount = draft();
    fireEvent.keyDown(amount, { key: "Enter", metaKey: true });
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(postedNumbers()).toEqual(["12.50", "-12.50"]);
  });

  it("refuses the same unfinished number from Create", async () => {
    const amount = draft();
    amount.setCustomValidity("Please enter a number.");
    fireEvent.click(
      screen.getByRole("button", { name: "Create Transaction Entry" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mutate).not.toHaveBeenCalled();
  });
});
