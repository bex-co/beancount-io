import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "@apollo/client/react";
import { NewDirectiveDialog } from "../index";
import { BalanceForm } from "../balance-form";
import { OpenAccountForm } from "../open-account-form";
import type { JournalDirectiveAction } from "@/common/lib/ledger-action-search";

/**
 * A New Entry write in flight owns its draft (w4/m33): no edit is accepted
 * that the success reset would discard, no second submission is sent, and a
 * late success cannot close a draft opened after it.
 */
vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
  useQuery: (document: { definitions: { name?: { value: string } }[] }) => {
    const name = document.definitions[0]?.name?.value;
    if (name === "GetLedgerAccountDirectives") {
      return {
        data: {
          getLedgerAccountDirectives: [
            { account: "Assets:Cash", openedAt: "2000-01-01", closedAt: null },
            {
              account: "Expenses:Food",
              openedAt: "2000-01-01",
              closedAt: null,
            },
          ],
        },
        loading: false,
      };
    }
    if (name === "GetLedgerErrors") {
      return {
        data: { getLedgerErrors: [] },
        refetch: async () => ({ data: { getLedgerErrors: [] } }),
      };
    }
    return {
      data: {
        getLedger: {
          options: {
            nameAssets: "Assets",
            nameLiabilities: "Liabilities",
            nameEquity: "Equity",
            nameIncome: "Income",
            nameExpenses: "Expenses",
          },
        },
      },
      loading: false,
    };
  },
}));

vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => () => {},
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));
vi.mock("@/common/lib/errors/error-message", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useErrorMessage: () => () => "Connection problem",
}));
vi.mock("sonner", () => ({ toast: { warning: vi.fn(), success: vi.fn() } }));

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

/** A BulkEntries call the test settles by hand. */
type Held = {
  resolve: () => void;
  reject: () => void;
  variables: { entries: Record<string, unknown>[] };
};
let held: Held[];

beforeEach(() => {
  held = [];
  const mutate = vi.fn(
    ({ variables }: { variables: Held["variables"] }) =>
      new Promise((resolve, reject) => {
        held.push({
          resolve: () => resolve({ data: { bulkEntries: { success: true } } }),
          reject: () => reject(new Error("aborted")),
          variables,
        });
      }),
  );
  vi.mocked(useMutation).mockReturnValue([
    mutate,
    { loading: false },
  ] as unknown as ReturnType<typeof useMutation>);
});

function Harness({ tab }: { tab: JournalDirectiveAction }) {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(tab);
  return (
    <>
      <button type="button" onClick={() => setOpen(false)}>
        route close
      </button>
      <button type="button" onClick={() => setOpen(true)}>
        route open
      </button>
      <NewDirectiveDialog
        open={open}
        onOpenChange={setOpen}
        ledgerId="owner/ledger"
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
      />
    </>
  );
}

const noteContent = () => screen.getByRole("textbox", { name: "Note content" });
const createNote = () =>
  screen.getByRole("button", { name: "Create Note Entry" });
const setAccount = (value: string, index = 0) =>
  fireEvent.change(
    screen.getAllByRole("textbox", { name: "Account" })[index]!,
    {
      target: { value },
    },
  );

async function fillNote(text: string) {
  setAccount("Assets:Cash");
  fireEvent.change(noteContent(), { target: { value: text } });
  await waitFor(() => expect(createNote()).toBeEnabled());
}

async function submitNote() {
  fireEvent.click(createNote());
  await waitFor(() => expect(held).toHaveLength(1));
}

/** A balanced two-posting Transaction, ready to submit. */
async function fillTransaction() {
  setAccount("Expenses:Food", 0);
  fireEvent.change(screen.getAllByRole("spinbutton")[0]!, {
    target: { value: "1.23" },
  });
  setAccount("Assets:Cash", 1);
  fireEvent.change(screen.getAllByRole("spinbutton")[1]!, {
    target: { value: "-1.23" },
  });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Create Transaction Entry" }),
    ).toBeEnabled(),
  );
}

async function failWrite(index = 0) {
  await act(async () => held[index]!.reject());
  expect(await screen.findByText("Connection problem")).toBeInTheDocument();
}

const noteText = (call: Held) =>
  (call.variables.entries.at(-1) as { note: { content: string } }).note.content;

describe("New Entry while a write is in flight", () => {
  it("locks the Note draft, tabs and dismissal until the write settles", async () => {
    render(<Harness tab="note" />);
    await fillNote("qa A");
    await submitNote();

    expect(noteContent()).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Transaction" })).toBeDisabled();
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await act(async () => held[0]!.resolve());
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(held).toHaveLength(1);
    expect(noteText(held[0]!)).toBe("qa A");
  });

  it("keeps the accepted Note text and allows one retry after a failure", async () => {
    render(<Harness tab="note" />);
    await fillNote("qa A");
    await submitNote();

    await act(async () => held[0]!.reject());
    expect(await screen.findByText("Connection problem")).toBeInTheDocument();
    expect(noteContent()).toBeEnabled();
    expect(noteContent()).toHaveValue("qa A");

    fireEvent.change(noteContent(), { target: { value: "qa B" } });
    fireEvent.click(createNote());
    await waitFor(() => expect(held).toHaveLength(2));
    expect(noteText(held[1]!)).toBe("qa B");
  });

  it("does not let a late success close a draft opened after it", async () => {
    render(<Harness tab="note" />);
    await fillNote("qa A");
    await submitNote();

    // The route closes and reopens the dialog while A is still pending.
    fireEvent.click(
      screen.getByRole("button", { name: "route close", hidden: true }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "route open", hidden: true }),
    );
    await fillNote("qa C");

    await act(async () => held[0]!.resolve());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(noteContent()).toHaveValue("qa C");
    expect(noteContent()).toBeEnabled();
  });

  it("sends a Transaction once despite repeated Cmd+Enter and clicks", async () => {
    render(<Harness tab="transaction" />);
    await fillTransaction();
    const amount = screen.getAllByRole("spinbutton")[0]!;
    const submit = screen.getByRole("button", {
      name: "Create Transaction Entry",
    });

    fireEvent.keyDown(amount, { key: "Enter", metaKey: true });
    fireEvent.keyDown(amount, { key: "Enter", metaKey: true });
    fireEvent.keyDown(amount, { key: "Enter", ctrlKey: true });
    fireEvent.click(submit);
    await waitFor(() => expect(held).toHaveLength(1));
    await act(async () => {});
    expect(held).toHaveLength(1);

    await act(async () => held[0]!.reject());
    expect(await screen.findByText("Connection problem")).toBeInTheDocument();
    fireEvent.keyDown(amount, { key: "Enter", metaKey: true });
    fireEvent.keyDown(amount, { key: "Enter", metaKey: true });
    await waitFor(() => expect(held).toHaveLength(2));
    await act(async () => {});
    expect(held).toHaveLength(2);
    expect(amount).toHaveValue(1.23);
  });
});

/**
 * Keyboard focus while New Entry's write is in flight (w4/m42). jsdom keeps
 * focus on a control its fieldset just disabled; a browser drops it, Radix
 * falls back to the dialog itself, and Shift+Tab from there reached the page
 * behind the modal. So these tests assert where focus is parked, and model
 * the browser's fallback explicitly where the handback depends on it.
 */
describe("New Entry focus while a write is in flight", () => {
  const notePanel = () => screen.getByRole("tabpanel", { name: "Note" });
  const focusIsInDialog = () =>
    expect(screen.getByRole("dialog")).toContainElement(
      document.activeElement as HTMLElement,
    );

  async function submitNoteByKeyboard(
    user: ReturnType<typeof userEvent.setup>,
  ) {
    await fillNote("qa A");
    // The hidden Transaction form focuses its Payee on a mount timer, which
    // jsdom honours for a hidden field; let it land before choosing focus.
    await waitFor(() => expect(screen.getByLabelText("Payee")).toHaveFocus());
    createNote().focus();
    await user.keyboard("{Enter}");
    // Validation runs before the write; allow a loaded run.
    await waitFor(() => expect(held).toHaveLength(1), { timeout: 3000 });
    expect(createNote()).toBeDisabled();
  }

  it("parks focus on the Note panel and keeps Tab and Shift+Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(<Harness tab="note" />);
    await submitNoteByKeyboard(user);

    expect(notePanel()).toHaveFocus();
    // The close button is unavailable while the write is pending (w4/977).
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
    await user.tab({ shift: true });
    focusIsInDialog();
    await user.tab({ shift: true });
    focusIsInDialog();
    await user.tab();
    focusIsInDialog();
    await user.tab();
    focusIsInDialog();
    expect(held).toHaveLength(1);
  });

  it("returns focus to Create Note Entry after a failure, with the draft kept", async () => {
    const user = userEvent.setup();
    render(<Harness tab="note" />);
    await submitNoteByKeyboard(user);

    // Where a browser leaves focus once the button is disabled.
    act(() => screen.getByRole("dialog").focus());
    await failWrite();
    expect(createNote()).toHaveFocus();
    expect(noteContent()).toHaveValue("qa A");

    await user.keyboard("{Enter}");
    await waitFor(() => expect(held).toHaveLength(2));
    expect(noteText(held[1]!)).toBe("qa A");
  });

  it("holds the close button until the write settles (w4/977)", async () => {
    const user = userEvent.setup();
    render(<Harness tab="note" />);
    await submitNoteByKeyboard(user);

    const close = screen.getByRole("button", { name: "Close" });
    expect(close).toBeDisabled();
    await user.click(close);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(held).toHaveLength(1);

    await failWrite();
    expect(close).toBeEnabled();
    expect(noteContent()).toHaveValue("qa A");
  });

  it("does not hand focus back after a success, even before the dialog closes", async () => {
    const user = userEvent.setup();
    // The journal closes New Entry through a route change, which lands after
    // the write settles; until then the dialog is still on screen.
    render(
      <NewDirectiveDialog
        open
        onOpenChange={() => {}}
        ledgerId="owner/ledger"
        activeTab="note"
        onActiveTabChange={() => {}}
      />,
    );
    await submitNoteByKeyboard(user);

    await act(async () => held[0]!.resolve());
    await waitFor(() => expect(noteContent()).toBeEnabled());
    expect(noteContent()).toHaveValue("");
    expect(createNote()).not.toHaveFocus();
    expect(notePanel()).toHaveFocus();
  });

  it("returns focus to the Transaction amount that sent Cmd+Enter after a failure", async () => {
    const user = userEvent.setup();
    render(<Harness tab="transaction" />);
    // The form moves focus to Payee on a mount timer; let it land first.
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Payee" })).toHaveFocus(),
    );
    await fillTransaction();
    const amount = screen.getAllByRole("spinbutton")[1]!;
    amount.focus();
    await user.keyboard("{Meta>}{Enter}{/Meta}");
    await waitFor(() => expect(held).toHaveLength(1));
    expect(amount).toBeDisabled();
    expect(screen.getByRole("tabpanel", { name: "Transaction" })).toHaveFocus();

    await failWrite();
    expect(amount).toHaveFocus();
    expect(amount).toHaveValue(-1.23);
  });
});

describe.each([
  {
    name: "Balance",
    render: () => render(<BalanceForm ledgerId="owner/ledger" />),
    fill: () => {
      setAccount("Assets:Cash");
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "10" },
      });
    },
    submit: "Create Balance Entry",
  },
  {
    name: "Open Account",
    render: () => render(<OpenAccountForm ledgerId="owner/ledger" />),
    fill: () =>
      fireEvent.change(screen.getByLabelText("Account"), {
        target: { value: "Assets:Wallet" },
      }),
    submit: "Create Account Entry",
  },
])("$name while its write is in flight", ({ render, fill, submit }) => {
  it("submits once and locks its fields until the write settles", async () => {
    render();
    fill();
    const button = screen.getByRole("button", { name: submit });
    await waitFor(() => expect(button).toBeEnabled());

    const form = button.closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(held).toHaveLength(1));
    await act(async () => {});
    expect(held).toHaveLength(1);
    expect(screen.getByPlaceholderText("MM/DD/YYYY")).toBeDisabled();

    await act(async () => held[0]!.reject());
    await waitFor(() =>
      expect(screen.getByPlaceholderText("MM/DD/YYYY")).toBeEnabled(),
    );
    fireEvent.submit(form);
    await waitFor(() => expect(held).toHaveLength(2));
  });
});

/** Switching entry type keeps each unsaved draft while the dialog is open (w4/256). */
describe("New Entry type switches", () => {
  // Radix tab activation re-renders the whole dialog; allow a loaded run.
  const settle = { timeout: 3000 };

  it("keeps a Note draft through Note → Balance (arrow key) → Note", async () => {
    const user = userEvent.setup();
    render(<Harness tab="note" />);
    setAccount("Assets:Cash");
    fireEvent.change(noteContent(), { target: { value: "qa draft note" } });

    screen.getByRole("tab", { name: "Note" }).focus();
    await user.keyboard("{ArrowLeft}");
    await waitFor(
      () =>
        expect(screen.getByRole("tab", { name: "Balance" })).toHaveAttribute(
          "aria-selected",
          "true",
        ),
      settle,
    );
    expect(
      screen.queryByRole("textbox", { name: "Note content" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Balance Entry" }),
    ).toBeInTheDocument();

    // Back by pointer: the arrow-key leg above is the native-key proof, and
    // a second roving-focus move was not deterministic under a loaded run.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Note" }));
    fireEvent.click(screen.getByRole("tab", { name: "Note" }));
    await waitFor(
      () => expect(noteContent()).toHaveValue("qa draft note"),
      settle,
    );
    expect(screen.getAllByRole("textbox", { name: "Account" })[0]).toHaveValue(
      "Assets:Cash",
    );
    expect(
      screen.queryByRole("button", { name: "Create Balance Entry" }),
    ).not.toBeInTheDocument();
  });

  it("keeps a Balance draft through a pointer switch", async () => {
    render(<Harness tab="balance" />);
    setAccount("Assets:Cash");
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "49.70" },
    });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Note" }));
    fireEvent.click(screen.getByRole("tab", { name: "Note" }));
    await waitFor(() => expect(noteContent()).toBeInTheDocument(), settle);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Balance" }));
    fireEvent.click(screen.getByRole("tab", { name: "Balance" }));
    await waitFor(
      () => expect(screen.getByRole("spinbutton")).toHaveValue(49.7),
      settle,
    );
  });
});
