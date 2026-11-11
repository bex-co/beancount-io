import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { NewDirectiveDialog } from "../index";

vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: async () => false }),
}));
vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => () => {},
  useLedgerWriteRefresh: () => () => {},
}));

/** A form that reports unsaved input as the real ones do (useReportDirty). */
const { formFor } = vi.hoisted(() => ({
  formFor:
    (label: string) =>
    ({
      onDirtyChange,
      onSuccess,
    }: {
      onDirtyChange?: (dirty: boolean) => void;
      onSuccess?: () => void;
    }) => (
      <div>
        <input
          aria-label={label}
          onChange={(event) => onDirtyChange?.(event.target.value !== "")}
        />
        <button type="button" onClick={() => onSuccess?.()}>
          {`Save ${label}`}
        </button>
      </div>
    ),
}));
vi.mock("../transaction-form", () => ({
  TransactionForm: formFor("Narration text"),
}));
vi.mock("../balance-form", () => ({ BalanceForm: formFor("Balance text") }));
vi.mock("../note-form", () => ({ NoteForm: formFor("Note text") }));
vi.mock("../open-account-form", () => ({
  OpenAccountForm: formFor("Account text"),
}));

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <p>Page behind</p>
      <NewDirectiveDialog
        open={open}
        onOpenChange={setOpen}
        ledgerId="owner/ledger"
        activeTab="transaction"
        onActiveTabChange={() => {}}
      />
    </>
  );
}

const confirm = () =>
  screen.queryByRole("dialog", { name: "Discard what you typed?" });

/**
 * One stray click beside New Entry threw away a minute of typing; Escape and
 * Close did the same (w2/123). Every dismissal of a typed draft now asks.
 */
describe("New Entry asks before discarding a typed draft", () => {
  it("closes an untouched dialog at once", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  // Focus goes back to where it was when leaving was asked for: the field
  // for Escape and an outside click, the Close button for Close.
  it.each([
    [
      "Escape",
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.keyboard("{Escape}"),
      () => screen.getByLabelText("Narration text"),
    ],
    [
      "Close",
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole("button", { name: /^close$/i })),
      () => screen.getByRole("button", { name: /^close$/i }),
    ],
    [
      "an outside click",
      // Radix dismisses on a pointerdown outside its content; the page
      // behind a modal has pointer-events: none, so dispatch it directly.
      async () => {
        fireEvent.pointerDown(screen.getByText("Page behind"));
      },
      () => screen.getByLabelText("Narration text"),
    ],
  ])(
    "asks on %s, and Keep editing keeps the draft",
    async (_exit, leave, focusTarget) => {
      const user = userEvent.setup();
      render(<Harness />);
      const narration = await screen.findByLabelText("Narration text");
      await user.type(narration, "long draft");

      await leave(user);
      expect(
        await screen.findByRole("dialog", { name: "Discard what you typed?" }),
      ).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Keep editing" }));

      await waitFor(() => expect(confirm()).toBeNull());
      expect(screen.getByLabelText("Narration text")).toHaveValue("long draft");
      await waitFor(() => expect(focusTarget()).toHaveFocus());
    },
  );

  it("closes once the reader chooses Discard", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(await screen.findByLabelText("Narration text"), "draft");
    await user.keyboard("{Escape}");
    await user.click(await screen.findByRole("button", { name: "Discard" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("guards a draft on a tab the reader moved away from", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    // Every tab stays mounted; the Note draft counts though it is hidden.
    await user.type(screen.getByLabelText("Note text"), "remember this");
    await user.keyboard("{Escape}");
    expect(
      await screen.findByRole("dialog", { name: "Discard what you typed?" }),
    ).toBeVisible();
  });

  it("does not ask when a successful write closes the dialog", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(await screen.findByLabelText("Narration text"), "booked");
    await user.click(
      screen.getByRole("button", { name: "Save Narration text" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(confirm()).toBeNull();
  });
});
