import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { NewDirectiveDialog } from "../index";

const state = vi.hoisted(() => ({
  after: [] as { message: string }[],
  deferRefetch: false,
  resolveRefetch: null as null | ((value: unknown) => void),
}));

// The forms are not under test: each just reports a successful write.
vi.mock("../transaction-form", () => ({
  TransactionForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={onSuccess}>
      write
    </button>
  ),
}));
vi.mock("../balance-form", () => ({ BalanceForm: () => null }));
vi.mock("../note-form", () => ({ NoteForm: () => null }));
vi.mock("../open-account-form", () => ({ OpenAccountForm: () => null }));
vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => () => {},
}));
vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: { getLedgerErrors: [] },
    refetch: () =>
      state.deferRefetch
        ? new Promise((resolve) => {
            state.resolveRefetch = resolve;
          })
        : Promise.resolve({ data: { getLedgerErrors: state.after } }),
  }),
}));
vi.mock("sonner", () => ({ toast: { warning: vi.fn(), success: vi.fn() } }));

function renderDialog(
  onSuccess: (outcome: { leftErrors: Promise<boolean> }) => void,
) {
  return render(
    <NewDirectiveDialog
      open
      onOpenChange={() => {}}
      ledgerId="alice/books"
      activeTab="transaction"
      onActiveTabChange={() => {}}
      onSuccess={onSuccess}
    />,
  );
}

describe("New Entry reports a write that broke the ledger (w3/640)", () => {
  beforeEach(() => {
    vi.mocked(toast.warning).mockClear();
    state.deferRefetch = false;
    state.resolveRefetch = null;
  });

  it("names the new error instead of plain success", async () => {
    state.after = [
      { message: "Account Assets:Cash is already open (opened on 2026-01-01)" },
    ];
    const onSuccess = vi.fn();
    renderDialog(onSuccess);

    await userEvent.click(screen.getByRole("button", { name: "write" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    await expect(onSuccess.mock.calls[0]![0].leftErrors).resolves.toBe(true);
    expect(vi.mocked(toast.warning).mock.calls[0]![0]).toContain(
      "Account Assets:Cash is already open",
    );
  });

  it("hands over as the write lands, before the ledger is revalidated (w1/184)", async () => {
    state.deferRefetch = true;
    const onSuccess = vi.fn();
    renderDialog(onSuccess);
    await userEvent.click(screen.getByRole("button", { name: "write" }));
    await waitFor(() => expect(state.resolveRefetch).not.toBeNull());

    // The journal can refresh now; only the outcome waits for the check.
    expect(onSuccess).toHaveBeenCalledTimes(1);
    const { leftErrors } = onSuccess.mock.calls[0]![0];
    let settled = false;
    void leftErrors.then(() => (settled = true));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled).toBe(false);

    state.resolveRefetch?.({ data: { getLedgerErrors: [] } });
    await expect(leftErrors).resolves.toBe(false);
  });

  it("reports a clean write as plain success", async () => {
    state.after = [];
    const onSuccess = vi.fn();
    renderDialog(onSuccess);

    await userEvent.click(screen.getByRole("button", { name: "write" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    await expect(onSuccess.mock.calls[0]![0].leftErrors).resolves.toBe(false);
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
