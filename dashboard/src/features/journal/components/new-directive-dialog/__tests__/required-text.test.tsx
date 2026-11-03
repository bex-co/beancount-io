import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "@apollo/client/react";
import { BalanceForm } from "../balance-form";
import { NoteForm } from "../note-form";

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
                openedAt: "2026-01-01",
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

// A plain input in place of each combobox. It keeps what FormControl hands
// the real one (id, aria-invalid, aria-describedby), so the required error's
// association is observable.
const { field } = vi.hoisted(() => ({
  field:
    (label: string) =>
    ({
      value,
      onValueChange,
      ledgerId: _ledgerId,
      ...control
    }: {
      value: string;
      onValueChange: (v: string) => void;
      ledgerId: string;
    }) => (
      <input
        {...control}
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
    ),
}));
vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: field("Account"),
  CurrencyCombobox: field("Currency"),
}));
vi.mock("@/common/components/ui/date-picker", () => ({
  DatePicker: () => <input aria-label="Date" readOnly />,
}));

let mutate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Only Date is faked, so the entry date is fixed and user-event still runs.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 8, 12));
  mutate = vi
    .fn()
    .mockResolvedValue({ data: { bulkEntries: { success: true } } });
  vi.mocked(useMutation).mockReturnValue([
    mutate,
    { loading: false },
  ] as unknown as ReturnType<typeof useMutation>);
});

afterEach(() => {
  vi.useRealTimers();
});

const textbox = (name: string) => screen.getByRole("textbox", { name });

/** Types `value` over the field's content; "" clears what was typed first. */
function enter(name: string, value: string) {
  if (value === "") fireEvent.change(textbox(name), { target: { value: "x" } });
  fireEvent.change(textbox(name), { target: { value } });
}

/** The field shows `message` as its own error, and nothing is sent. */
async function expectRequired(name: string, message: string, submit: string) {
  const error = await screen.findByText(message);
  const input = textbox(name);
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input.getAttribute("aria-describedby")).toContain(error.id);
  const button = screen.getByRole("button", { name: submit });
  expect(button).toBeDisabled();
  // Enter in a single-line field is the native submission a reader would
  // try; a textarea takes Enter as a newline, so submit its form directly.
  if (input.tagName === "INPUT") {
    input.focus();
    await userEvent.keyboard("{Enter}");
  }
  fireEvent.submit(button.closest("form")!);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(mutate).not.toHaveBeenCalled();
}

/** New Entry required text is checked after normalizing it (w4/334). */
describe("New Entry required text after trimming", () => {
  it.each([
    ["empty", ""],
    ["whitespace-only", "   "],
  ])(
    "refuses an %s Balance account or currency, then sends the trimmed values",
    async (_, blank) => {
      render(<BalanceForm ledgerId="owner/ledger" />);
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "49.70" },
      });

      enter("Account", blank);
      await expectRequired(
        "Account",
        "Account is required",
        "Create Balance Entry",
      );

      enter("Account", " Assets:Cash ");
      enter("Currency", blank);
      await expectRequired(
        "Currency",
        "Currency is required",
        "Create Balance Entry",
      );

      enter("Currency", " USD ");
      const submit = screen.getByRole("button", {
        name: "Create Balance Entry",
      });
      await waitFor(() => expect(submit).toBeEnabled());
      expect(screen.queryByText(/is required/)).toBeNull();
      await userEvent.click(submit);

      await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
      expect(mutate.mock.calls[0]![0].variables.entries).toEqual([
        {
          type: "BALANCE",
          balance: {
            date: "2026-09-08",
            account: "Assets:Cash",
            amount: { number: "49.70", currency: "USD" },
          },
        },
      ]);
    },
  );

  it.each([
    ["empty", "", ""],
    ["whitespace-only", "   ", " \n\t\n "],
  ])(
    "refuses an %s Note account or content, then keeps the content's inner lines",
    async (_, blank, blankContent) => {
      render(<NoteForm ledgerId="owner/ledger" />);

      enter("Account", blank);
      enter("Note content", "Called the bank");
      await expectRequired(
        "Account",
        "Account is required",
        "Create Note Entry",
      );

      enter("Account", " Assets:Cash ");
      enter("Note content", blankContent);
      await expectRequired(
        "Note content",
        "Note content is required",
        "Create Note Entry",
      );

      enter("Note content", "  Called the bank\n  about the fee  ");
      const submit = screen.getByRole("button", { name: "Create Note Entry" });
      await waitFor(() => expect(submit).toBeEnabled());
      await userEvent.click(submit);

      await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
      expect(mutate.mock.calls[0]![0].variables.entries).toEqual([
        {
          type: "NOTE",
          note: {
            date: "2026-09-08",
            account: "Assets:Cash",
            content: "Called the bank\n  about the fee",
          },
        },
      ]);
    },
  );
});
