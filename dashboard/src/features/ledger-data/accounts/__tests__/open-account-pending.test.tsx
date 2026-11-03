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
import { OpenAccountDialog } from "../open-account-dialog";

/** Accounts' Open Account keeps a pending write's draft in front (w4/284). */
const { mutate, deferred } = vi.hoisted(() => {
  const deferred: Array<{
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }> = [];
  const mutate = vi.fn(
    () => new Promise((resolve, reject) => deferred.push({ resolve, reject })),
  );
  return { mutate, deferred };
});

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: () => [mutate, { loading: false }],
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
  useErrorMessage: () => () => "Network error",
}));
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: async () => false }),
}));
vi.mock("@/common/hooks/use-date-locale", async () => {
  const { enUS } = await import("react-day-picker/locale/en-US");
  return { useDateLocale: () => enUS };
});

const onSuccess = vi.fn();

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        reopen
      </button>
      {/* A route change can close the dialog without asking it. */}
      <button type="button" onClick={() => setOpen(false)}>
        navigate away
      </button>
      <OpenAccountDialog
        open={open}
        onOpenChange={setOpen}
        ledgerId="o/l"
        onSuccess={onSuccess}
      />
    </>
  );
}

const account = () => screen.getByLabelText("Account Name");
const openButton = () => screen.getByRole("button", { name: "Open Account" });
const settle = async (outcome: "success" | "failure") => {
  const pending = deferred.shift()!;
  await act(async () => {
    if (outcome === "success") {
      pending.resolve({ data: { bulkEntries: { success: true } } });
    } else pending.reject(new Error("offline"));
  });
};

async function submitA() {
  fireEvent.change(account(), {
    target: { value: "Assets:Qa-20261020:Open-Pending-A" },
  });
  await waitFor(() => expect(openButton()).toBeEnabled());
  fireEvent.submit(account().closest("form")!);
  fireEvent.click(openButton());
  fireEvent.submit(account().closest("form")!);
  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
}

/** Enter on a focused Open Account, the way a keyboard reader submits. */
async function submitByKeyboard(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(account(), {
    target: { value: "Assets:Qa-20261021:Focus" },
  });
  await waitFor(() => expect(openButton()).toBeEnabled());
  openButton().focus();
  await user.keyboard("{Enter}");
  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
}

describe("Accounts Open Account while its write is pending", () => {
  beforeEach(() => {
    mutate.mockClear();
    deferred.length = 0;
    onSuccess.mockClear();
  });

  it("submits once, locks the draft and its dismissal, then closes on success", async () => {
    render(<Harness />);
    await submitA();

    expect(account()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.keyDown(account(), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(account()).toHaveValue("Assets:Qa-20261020:Open-Pending-A");

    await settle("success");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]).toEqual([
      expect.objectContaining({
        variables: expect.objectContaining({
          entries: [
            expect.objectContaining({
              open: expect.objectContaining({
                account: "Assets:Qa-20261020:Open-Pending-A",
              }),
            }),
          ],
        }),
      }),
    ]);
  });

  it("returns focus to Open Account after a failed keyboard submission (w4/m42)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await submitByKeyboard(user);
    // The locked button cannot hold focus; the dialog keeps it meanwhile.
    expect(openButton()).toBeDisabled();
    expect(screen.getByRole("dialog")).toHaveFocus();

    await settle("failure");
    expect(await screen.findByText("Network error")).toBeInTheDocument();
    expect(openButton()).toHaveFocus();
  });

  it("does not hand focus to Open Account after a success, even before the dialog closes", async () => {
    const user = userEvent.setup();
    // Accounts closes the dialog through a route change, which lands after
    // the write settles; until then the dialog and its valid draft remain.
    render(<OpenAccountDialog open onOpenChange={() => {}} ledgerId="o/l" />);
    await submitByKeyboard(user);
    await settle("success");
    await waitFor(() => expect(openButton()).toBeEnabled());
    expect(openButton()).not.toHaveFocus();
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("keeps the draft editable for a retry after a failure", async () => {
    render(<Harness />);
    await submitA();

    await settle("failure");
    expect(await screen.findByText("Network error")).toBeInTheDocument();
    expect(account()).toBeEnabled();
    expect(account()).toHaveValue("Assets:Qa-20261020:Open-Pending-A");

    fireEvent.click(openButton());
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
  });

  it("does not let an old success close or clear a later opening", async () => {
    render(<Harness />);
    await submitA();

    fireEvent.click(
      screen.getByRole("button", { name: "navigate away", hidden: true }),
    );
    fireEvent.click(screen.getByRole("button", { name: "reopen" }));
    expect(account()).toHaveValue("");
    expect(account()).toBeDisabled();

    await settle("success");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(account()).toBeEnabled();
    fireEvent.change(account(), {
      target: { value: "Assets:Qa-20261020:Open-Pending-B" },
    });
    expect(account()).toHaveValue("Assets:Qa-20261020:Open-Pending-B");
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog and its draft through a composing Escape (w4/292)", () => {
    render(<Harness />);
    fireEvent.change(account(), {
      target: { value: "Assets:Qa-20261020:東京" },
    });

    fireEvent.keyDown(account(), { key: "Escape", isComposing: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(account()).toHaveValue("Assets:Qa-20261020:東京");

    fireEvent.keyDown(account(), { key: "Escape", keyCode: 27 });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "reopen" }));
    expect(account()).toHaveValue("");
  });
});
