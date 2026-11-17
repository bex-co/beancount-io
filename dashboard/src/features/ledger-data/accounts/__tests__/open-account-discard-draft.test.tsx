import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { OpenAccountDialog } from "../open-account-dialog";

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: () => [
    async () => ({ data: { bulkEntries: { success: true } } }),
    { loading: false },
  ],
  useQuery: () => ({
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
      getLedgerAccountDirectives: [],
    },
    loading: false,
  }),
}));
vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => () => "error",
}));
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: async () => false }),
}));
vi.mock("@/common/hooks/use-date-locale", async () => {
  const { enUS } = await import("react-day-picker/locale/en-US");
  return { useDateLocale: () => enUS };
});

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <p>Page behind</p>
      <OpenAccountDialog
        open={open}
        onOpenChange={setOpen}
        ledgerId="owner/ledger"
      />
    </>
  );
}

const account = () => screen.getByLabelText("Account Name");
const confirm = () =>
  screen.queryByRole("dialog", { name: "Discard what you typed?" });
const openAccount = () =>
  screen.queryByRole("dialog", { name: "Open Account" });

/**
 * A typed account vanished on Escape with no question, while New Entry and
 * Add Budget asked first (w2/134, after w2/123).
 */
describe("Open Account asks before discarding a typed account", () => {
  it("closes an untouched dialog at once", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await screen.findByRole("dialog", { name: "Open Account" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(openAccount()).toBeNull());
    expect(confirm()).toBeNull();
  });

  // Focus goes back to where it was when leaving was asked for.
  it.each([
    [
      "Escape",
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.keyboard("{Escape}"),
      account,
    ],
    [
      "Close",
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole("button", { name: /^close$/i })),
      () => screen.getByRole("button", { name: /^close$/i }),
    ],
    [
      "Cancel",
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole("button", { name: "Cancel" })),
      () => screen.getByRole("button", { name: "Cancel" }),
    ],
    [
      "an outside click",
      // Radix dismisses on a pointerdown outside its content; the page
      // behind a modal has pointer-events: none, so dispatch it directly.
      async () => {
        fireEvent.pointerDown(screen.getByText("Page behind"));
      },
      account,
    ],
  ])(
    "asks on %s, and Keep editing keeps the account",
    async (_exit, leave, focusTarget) => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.type(account(), "Expenses:QaDraftGuard");

      await leave(user);
      expect(
        await screen.findByRole("dialog", { name: "Discard what you typed?" }),
      ).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Keep editing" }));

      await waitFor(() => expect(confirm()).toBeNull());
      expect(account()).toHaveValue("Expenses:QaDraftGuard");
      await waitFor(() => expect(focusTarget()).toHaveFocus());
    },
  );

  it("closes once the reader chooses Discard", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(account(), "Expenses:QaDraftGuard");
    await user.keyboard("{Escape}");
    await user.click(await screen.findByRole("button", { name: "Discard" }));
    await waitFor(() => expect(openAccount()).toBeNull());
  });

  it("does not ask when the account is opened", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(account(), "Expenses:Groceries");
    await user.click(screen.getByRole("button", { name: "Open Account" }));
    await waitFor(() => expect(openAccount()).toBeNull());
    expect(confirm()).toBeNull();
  });
});
