import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountDirective } from "../types";
import LedgerAccountsPage from "../index";

/**
 * After a successful Close or Delete the directory reloads and its rows
 * remount; focus must land on the settled control, not the body (w4/238).
 */
const { state, succeed } = vi.hoisted(() => ({
  state: {
    rows: [] as AccountDirective[],
    loading: false,
    settle: undefined as undefined | (() => void),
  },
  succeed: ({
    account,
    onOpenChange,
    onSuccess,
  }: {
    account: AccountDirective | null;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
  }) =>
    account ? (
      <button
        type="button"
        onClick={() => {
          onSuccess();
          onOpenChange(false);
        }}
      >
        confirm
      </button>
    ) : null,
}));

vi.mock("@tanstack/react-router", () => ({
  useHydrated: () => true,
  useParams: () => ({ ledgerOwner: "alice", ledgerName: "books" }),
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#new">{children}</a>
  ),
}));
vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    refetchQueries: () =>
      new Promise<void>((resolve) => {
        state.settle = resolve;
      }),
  }),
  useQuery: () => ({
    data: state.loading
      ? undefined
      : { getLedgerAccountDirectives: state.rows },
    loading: state.loading,
    error: undefined,
  }),
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "books", ledgerData: { options: {} } }),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));
vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => vi.fn(),
}));
vi.mock("../open-account-dialog", () => ({ OpenAccountDialog: () => null }));
vi.mock("../close-account-dialog", () => ({ CloseAccountDialog: succeed }));
vi.mock("../delete-account-dialog", () => ({ DeleteAccountDialog: succeed }));

const row = (account: string, closedAt: string | null): AccountDirective => ({
  account,
  openedAt: "2026-01-01",
  closedAt,
  balance: {},
  entryCount: 0,
  entryHash: `${account}-open`,
  closeEntryHash: closedAt ? `${account}-close` : null,
});

async function writeAndReload(
  action: "Close" | "Delete",
  after: AccountDirective[],
) {
  const user = userEvent.setup();
  const { rerender } = render(<LedgerAccountsPage />);
  await user.click(
    screen.getByRole("button", { name: /Actions for Assets:Qa/ }),
  );
  await user.click(await screen.findByRole("menuitem", { name: action }));
  await user.click(screen.getByRole("button", { name: "confirm" }));
  expect(document.activeElement).toBe(document.body);

  // The reload: rows unmount into the loading view, then come back.
  state.loading = true;
  rerender(<LedgerAccountsPage />);
  state.loading = false;
  state.rows = after;
  rerender(<LedgerAccountsPage />);
  await act(async () => state.settle?.());
}

beforeEach(() => {
  state.rows = [row("Assets:Cash", null), row("Assets:Qa", null)];
  state.loading = false;
  state.settle = undefined;
});

describe("Accounts focus after a successful write", () => {
  it("returns to the surviving row's actions after Close", async () => {
    await writeAndReload("Close", [
      row("Assets:Cash", null),
      row("Assets:Qa", "2026-10-20"),
    ]);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: /Actions for Assets:Qa/ }),
      ),
    );
  });

  it("moves to Search accounts after Delete removes the row", async () => {
    await writeAndReload("Delete", [row("Assets:Cash", null)]);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("textbox")),
    );
  });
});
