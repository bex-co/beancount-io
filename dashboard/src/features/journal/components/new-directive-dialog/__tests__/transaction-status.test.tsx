import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "@apollo/client/react";
import { enUS } from "react-day-picker/locale/en-US";
import { TransactionForm } from "../transaction-form";

/** New Entry offers only the transaction statuses Beancount keeps (w4/270). */
vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: vi.fn(),
  useQuery: (document: { definitions: { name?: { value: string } }[] }) =>
    document.definitions[0]?.name?.value === "GetLedgerAccountDirectives"
      ? {
          data: {
            getLedgerAccountDirectives: [
              {
                account: "Assets:Cash",
                openedAt: "2000-01-01",
                closedAt: null,
              },
              {
                account: "Expenses:Food",
                openedAt: "2000-01-01",
                closedAt: null,
              },
            ],
          },
          loading: false,
        }
      : { data: undefined, loading: false },
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));

vi.mock("@/common/hooks/use-date-locale", () => ({
  useDateLocale: () => enUS,
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

const mockUseMutation = vi.mocked(useMutation);
let mutate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Radix Select reads pointer capture, which jsdom does not implement.
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  mutate = vi
    .fn()
    .mockResolvedValue({ data: { bulkEntries: { success: true } } });
  mockUseMutation.mockReturnValue([
    mutate,
    { loading: false },
  ] as unknown as ReturnType<typeof useMutation>);
});

const setAccount = (value: string, index: number) =>
  fireEvent.change(
    screen.getAllByRole("textbox", { name: "Account" })[index]!,
    {
      target: { value },
    },
  );

describe("Transaction status", () => {
  it("offers Cleared and Pending only, and books the chosen flag", async () => {
    const user = userEvent.setup();
    render(<TransactionForm ledgerId="owner/ledger" />);
    setAccount("Expenses:Food", 0);
    fireEvent.change(screen.getAllByRole("spinbutton")[0]!, {
      target: { value: "1" },
    });
    setAccount("Assets:Cash", 1);
    fireEvent.change(screen.getAllByRole("spinbutton")[1]!, {
      target: { value: "-1" },
    });

    await user.click(screen.getByRole("combobox", { name: /status/i }));
    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      "* Cleared",
      "! Pending",
    ]);
    await user.click(screen.getByRole("option", { name: "! Pending" }));

    await user.click(
      screen.getByRole("button", { name: "Create Transaction Entry" }),
    );
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(
      mutate.mock.calls[0]![0].variables.entries.at(-1).transaction.flag,
    ).toBe("!");
  });
});
