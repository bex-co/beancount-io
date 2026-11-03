import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { useMutation } from "@apollo/client/react";
import { enUS } from "react-day-picker/locale/en-US";
import { BalanceForm } from "../balance-form";
import { NoteForm } from "../note-form";
import { TransactionForm } from "../transaction-form";

/**
 * Pacific/Apia skipped 2011-12-30, so a local Date for it is the 31st. The
 * real DatePicker must still accept that ledger day and every Journal form
 * must write it unchanged (w4/m32).
 */
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
const originalTz = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "Pacific/Apia";
});

afterAll(() => {
  process.env.TZ = originalTz;
});

beforeEach(() => {
  mutate = vi
    .fn()
    .mockResolvedValue({ data: { bulkEntries: { success: true } } });
  mockUseMutation.mockReturnValue([
    mutate,
    { loading: false },
  ] as unknown as ReturnType<typeof useMutation>);
});

const setAccount = (value: string, index = 0) =>
  fireEvent.change(
    screen.getAllByRole("textbox", { name: "Account" })[index]!,
    {
      target: { value },
    },
  );

// One change event per value: the Transaction form re-renders heavily, and
// per-keystroke typing races it under a loaded parallel run.
async function typeDate(typed: string) {
  const user = userEvent.setup();
  const input = screen.getByRole("textbox", { name: "Date" });
  fireEvent.change(input, { target: { value: typed } });
  fireEvent.blur(input);
  await waitFor(() => expect(input).toHaveValue("12/30/2011"));
  expect(input).not.toHaveAttribute("aria-invalid");
  return user;
}

const sentEntry = () => mutate.mock.calls[0]?.[0]?.variables?.entries.at(-1);

describe("Journal forms keep a day the browser timezone skipped", () => {
  it("guards a zone that really skipped the day", () => {
    expect(new Date(2011, 11, 30).getDate()).toBe(31);
  });

  it.each(["2011-12-30", "12/30/2011"])(
    "writes a Transaction typed as %s on 2011-12-30",
    async (typed) => {
      render(<TransactionForm ledgerId="owner/ledger" />);
      const user = await typeDate(typed);
      setAccount("Expenses:Food", 0);
      fireEvent.change(screen.getAllByRole("spinbutton")[0]!, {
        target: { value: "1.25" },
      });
      setAccount("Assets:Cash", 1);
      fireEvent.change(screen.getAllByRole("spinbutton")[1]!, {
        target: { value: "-1.25" },
      });

      await user.click(
        screen.getByRole("button", { name: "Create Transaction Entry" }),
      );
      await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
      expect(sentEntry().transaction.date).toBe("2011-12-30");
    },
  );

  it("writes a Balance on 2011-12-30", async () => {
    render(<BalanceForm ledgerId="owner/ledger" />);
    const user = await typeDate("12/30/2011");
    setAccount("Assets:Cash");
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "10" },
    });

    const submit = screen.getByRole("button", { name: "Create Balance Entry" });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(sentEntry().balance.date).toBe("2011-12-30");
  });

  it("writes a Note on 2011-12-30", async () => {
    render(<NoteForm ledgerId="owner/ledger" />);
    const user = await typeDate("2011-12-30");
    setAccount("Assets:Cash");
    fireEvent.change(screen.getByRole("textbox", { name: "Note content" }), {
      target: { value: "statement" },
    });

    const submit = screen.getByRole("button", { name: "Create Note Entry" });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(sentEntry().note.date).toBe("2011-12-30");
  });
});
