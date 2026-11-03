import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "@apollo/client/react";
import { TransactionForm } from "../transaction-form";

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
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

beforeEach(() => {
  mockUseMutation.mockReturnValue([
    vi.fn(),
    { loading: false },
  ] as unknown as ReturnType<typeof useMutation>);
});

const accountInputs = () => screen.getAllByRole("textbox", { name: "Account" });
const amounts = () =>
  screen
    .getAllByRole("spinbutton")
    .map((input) => (input as HTMLInputElement).value);

/** An explicit Add moves on to the row it made, not onto a Remove (w4/967). */
describe("New Entry Add posting focus", () => {
  it.each([
    ["Enter", "keyboard"],
    ["a click", "pointer"],
  ])(
    "puts focus in the new row's account after %s, so a second Enter removes nothing",
    async (_, via) => {
      const user = userEvent.setup();
      render(<TransactionForm ledgerId="owner/ledger" />);
      fillPostings([
        ["", "-1.25", "USD"],
        ["Expenses:Food:Coffee", "1.25", "USD"],
      ]);
      const add = screen.getByRole("button", { name: "Add posting" });
      // The dialog focuses Payee once it opens; let that land first.
      await waitFor(() =>
        expect(screen.getByRole("textbox", { name: "Payee" })).toHaveFocus(),
      );

      if (via === "keyboard") {
        add.focus();
        await user.keyboard("{Enter}");
      } else {
        await user.click(add);
      }

      await waitFor(() => expect(accountInputs()).toHaveLength(3));
      await waitFor(() => expect(accountInputs()[2]).toHaveFocus());
      expect(screen.queryByRole("button", { name: "Add posting" })).toBeNull();

      // The next Enter lands in the new account field, not on Remove posting 2.
      await user.keyboard("{Enter}");
      expect(accountInputs()).toHaveLength(3);
      expect(accountInputs()[1]).toHaveValue("Expenses:Food:Coffee");
      expect(amounts().slice(0, 2)).toEqual(["-1.25", "1.25"]);
    },
  );

  it("still removes only the row whose Remove is chosen", async () => {
    const user = userEvent.setup();
    render(<TransactionForm ledgerId="owner/ledger" />);
    fillPostings([
      ["", "-1.25", "USD"],
      ["Expenses:Food:Coffee", "1.25", "USD"],
    ]);
    await user.click(screen.getByRole("button", { name: "Add posting" }));
    await waitFor(() => expect(accountInputs()).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: "Remove posting 3" }));
    expect(accountInputs()).toHaveLength(2);
    expect(accountInputs()[1]).toHaveValue("Expenses:Food:Coffee");
    expect(amounts()).toEqual(["-1.25", "1.25"]);
  });
});
