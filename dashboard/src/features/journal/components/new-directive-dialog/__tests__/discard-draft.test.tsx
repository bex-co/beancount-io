import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  journalActionSearchSchema,
  NEW_TRANSACTION_ACTION_SEARCH,
} from "@/common/lib/ledger-action-search";
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

const journalPath = "/ledger/owner/ledger/journal";
const pageUrl = journalPath + "?offset=60";
let browserHistory: ReturnType<typeof createBrowserHistory> | undefined;
const originalUrl = window.location.href;
const originalState: unknown = window.history.state;

afterEach(() => {
  cleanup();
  browserHistory?.destroy();
  browserHistory = undefined;
  window.history.replaceState(originalState, "", originalUrl);
});

async function renderJournal() {
  window.history.replaceState(null, "", pageUrl);
  browserHistory = createBrowserHistory();
  const rootRoute = createRootRoute({ component: Outlet });
  const route = createRoute({
    getParentRoute: () => rootRoute,
    path: journalPath,
    validateSearch: (search) => journalActionSearchSchema.parse(search),
    component: function Journal() {
      const search = route.useSearch();
      const navigate = route.useNavigate();
      return (
        <>
          <route.Link search={{ ...search, ...NEW_TRANSACTION_ACTION_SEARCH }}>
            New Entry
          </route.Link>
          <NewDirectiveDialog
            open={search.action === "new-entry"}
            ledgerId="owner/ledger"
            activeTab={search.directive ?? "transaction"}
            onActiveTabChange={(directive) =>
              void navigate({
                search: { ...search, directive },
                replace: true,
                ignoreBlocker: true,
              })
            }
            onOpenChange={(open, options) => {
              if (!open) {
                void navigate({
                  search: {
                    ...search,
                    action: undefined,
                    directive: undefined,
                    ...(options?.saved && { offset: undefined }),
                  },
                  replace: true,
                  ignoreBlocker: true,
                });
              }
            }}
          />
        </>
      );
    },
  });
  const router = createRouter({
    history: browserHistory,
    routeTree: rootRoute.addChildren([route]),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("link", { name: "New Entry" }));
  await screen.findByRole("dialog", { name: "New Entry" });
  return user;
}

function unloadWasPrevented() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

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

  it("asks on browser Back, restores the draft and URL on Keep editing, and leaves on Discard", async () => {
    const user = await renderJournal();
    const narration = screen.getByLabelText("Narration text");
    await user.type(narration, "long draft");
    const draftUrl = window.location.href;

    act(() => window.history.back());
    expect(
      await screen.findByRole("dialog", { name: "Discard what you typed?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    await waitFor(() => expect(window.location.href).toBe(draftUrl));
    expect(narration).toHaveValue("long draft");
    await waitFor(() => expect(narration).toHaveFocus());

    act(() => window.history.back());
    await user.click(await screen.findByRole("button", { name: "Discard" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.location.pathname + window.location.search).toBe(pageUrl);
  });

  it("warns before a dirty reload and stops warning after save", async () => {
    const user = await renderJournal();
    expect(unloadWasPrevented()).toBe(false);
    await user.type(screen.getByLabelText("Narration text"), "booked");
    expect(unloadWasPrevented()).toBe(true);

    await user.click(screen.getByRole("tab", { name: "Note" }));
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Note" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    await user.click(screen.getByRole("tab", { name: "Transaction" }));
    expect(screen.getByLabelText("Narration text")).toHaveValue("booked");

    await user.click(
      screen.getByRole("button", { name: "Save Narration text" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.location.pathname + window.location.search).toBe(journalPath);
    expect(unloadWasPrevented()).toBe(false);
  });

  it("lets Back leave a clean New Entry", async () => {
    await renderJournal();
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.location.pathname + window.location.search).toBe(pageUrl);
  });
});
