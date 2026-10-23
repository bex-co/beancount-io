import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "@apollo/client/react";
import { TransactionForm } from "../transaction-form";

/**
 * Remove posting unmounts the button that had focus, so focus fell to the
 * dialog and Tab restarted at the Transaction tab (w4/1010). It now moves to
 * the posting that takes the removed row's place, or the previous one.
 */
vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
  // No account directory: the account-availability check stays out of the way.
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

beforeEach(() => {
  vi.mocked(useMutation).mockReturnValue([
    vi.fn(),
    { loading: false },
  ] as unknown as ReturnType<typeof useMutation>);
});

const accounts = () => screen.getAllByRole("textbox", { name: "Account" });
const accountValues = () =>
  accounts().map((input) => (input as HTMLInputElement).value);
const amounts = () =>
  screen
    .getAllByRole("spinbutton")
    .map((input) => (input as HTMLInputElement).value);

/**
 * Rows as [account, amount]; currencies stay USD. The form adds a blank row
 * whenever every row has an account, so a third row comes from Add and a
 * fourth from filling all three accounts.
 */
async function draft(rows: [string, string][]) {
  const user = userEvent.setup();
  render(<TransactionForm ledgerId="owner/ledger" />);
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Payee" })).toHaveFocus(),
  );
  await user.click(screen.getByRole("button", { name: "Add posting" }));
  await waitFor(() => expect(accounts()).toHaveLength(3));
  rows.forEach(([account, amount], index) => {
    fireEvent.change(accounts()[index]!, { target: { value: account } });
    fireEvent.change(screen.getAllByRole("spinbutton")[index]!, {
      target: { value: amount },
    });
  });
  return user;
}

describe("New Entry Remove posting focus", () => {
  it.each([
    // [removed, focused after, remaining accounts, remaining amounts]
    [2, 2, ["", ""], ["-12.50", "12.50"]],
    [1, 1, ["Expenses:Food", ""], ["0", "12.50"]],
    [3, 2, ["", "Expenses:Food"], ["-12.50", "0"]],
  ])(
    "removing posting %i of three with Enter focuses posting %i",
    async (removed, focused, remainingAccounts, remainingAmounts) => {
      const user = await draft([
        ["", "-12.50"],
        ["Expenses:Food", "0"],
        ["", "12.50"],
      ]);

      screen.getByRole("button", { name: `Remove posting ${removed}` }).focus();
      await user.keyboard("{Enter}");

      await waitFor(() => expect(accounts()).toHaveLength(2));
      await waitFor(() => expect(accounts()[focused - 1]).toHaveFocus());
      expect(accountValues()).toEqual(remainingAccounts);
      expect(amounts()).toEqual(remainingAmounts);

      // Typing edits that posting, and Tab moves on to its amount.
      await user.keyboard("X");
      expect(accounts()[focused - 1]).toHaveValue(
        `${remainingAccounts[focused - 1]}X`,
      );
      await user.tab();
      expect(screen.getAllByRole("spinbutton")[focused - 1]).toHaveFocus();
    },
  );

  it("keeps position in a longer list, and after a click", async () => {
    const user = await draft([
      ["Assets:Cash", "-30"],
      ["Expenses:A", "10"],
      ["Expenses:B", "20"],
    ]);
    // Every account filled: the form added a blank fourth posting.
    await waitFor(() => expect(accounts()).toHaveLength(4));

    await user.click(screen.getByRole("button", { name: "Remove posting 2" }));
    await waitFor(() => expect(accounts()).toHaveLength(3));
    await waitFor(() => expect(accounts()[1]).toHaveFocus());
    expect(accountValues()).toEqual(["Assets:Cash", "Expenses:B", ""]);
    expect(amounts()).toEqual(["-30", "20", ""]);

    // The last row goes; focus moves back to the one before it.
    screen.getByRole("button", { name: "Remove posting 3" }).focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(accounts()[1]).toHaveFocus());
    expect(accountValues().slice(0, 2)).toEqual(["Assets:Cash", "Expenses:B"]);
    expect(amounts().slice(0, 2)).toEqual(["-30", "20"]);
  });
});
