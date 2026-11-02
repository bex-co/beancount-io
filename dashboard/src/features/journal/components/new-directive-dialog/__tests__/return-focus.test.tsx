import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { NewDirectiveDialog } from "../index";

// The post-write error check (w3/640) has its own suite.
vi.mock("@/common/hooks/use-write-outcome", () => ({
  useWriteOutcome: () => ({ snapshot: () => null, report: async () => false }),
}));

// The forms are irrelevant to focus handling; the dialog itself is real.
vi.mock("../transaction-form", () => ({ TransactionForm: () => <div /> }));
vi.mock("../balance-form", () => ({ BalanceForm: () => <div /> }));
vi.mock("../note-form", () => ({ NoteForm: () => <div /> }));
vi.mock("../open-account-form", () => ({ OpenAccountForm: () => <div /> }));
vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => () => {},
  useLedgerWriteRefresh: () => () => {},
}));

/**
 * The journal opens this dialog from a route link (or from the sidebar and
 * Overview), so there is no Radix trigger to restore focus to (w0/008).
 */
function Harness({ withReturnTarget }: { withReturnTarget: boolean }) {
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const [open, setOpen] = useState(true);
  return (
    <>
      <a href="#new" ref={linkRef}>
        New Entry
      </a>
      <NewDirectiveDialog
        open={open}
        onOpenChange={setOpen}
        ledgerId="owner/ledger"
        activeTab="transaction"
        onActiveTabChange={() => {}}
        returnFocusRef={withReturnTarget ? linkRef : undefined}
      />
    </>
  );
}

describe("NewDirectiveDialog focus return", () => {
  it("returns focus to the New Entry link after Escape", async () => {
    const user = userEvent.setup();
    render(<Harness withReturnTarget />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "New Entry" })).toHaveFocus();
  });

  it("returns focus to the New Entry link after Close", async () => {
    const user = userEvent.setup();
    render(<Harness withReturnTarget />);
    await user.click(await screen.findByRole("button", { name: /close/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "New Entry" })).toHaveFocus();
  });
});
