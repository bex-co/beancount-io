import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { ErrorBoundary } from "../error-boundary";

/**
 * Try Again on a failed ledger section runs one recovery at a time and keeps
 * the keyboard on it when the loader fails again (w4/1046). The action stayed
 * enabled while the loader re-ran, a second Enter queued another read, and
 * the re-thrown failure mounted a new fallback with focus on the page. The
 * real router reruns the real loader; only its answers are held by hand.
 */
function LedgerShell() {
  const router = useRouter();
  const location = useLocation();
  return (
    <ErrorBoundary
      resetKey={location.pathname}
      onRetry={() => router.invalidate()}
    >
      <Outlet />
    </ErrorBoundary>
  );
}

type Load = { resolve: () => void; reject: () => void };

async function mount() {
  const loads: Load[] = [];
  const root = createRootRoute({ component: LedgerShell });
  const commit = createRoute({
    getParentRoute: () => root,
    path: "/ledger/qa/books/commit/$sha",
    loader: () =>
      new Promise<void>((resolve, reject) => {
        loads.push({
          resolve,
          reject: () => reject(new TypeError("Failed to fetch")),
        });
      }),
    component: () => <h1>Commit detail</h1>,
  });
  const files = createRoute({
    getParentRoute: () => root,
    path: "/ledger/qa/books/files",
    component: () => <h1>Files</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([commit, files]),
    history: createMemoryHistory({
      initialEntries: ["/ledger/qa/books/files"],
    }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { name: "Files" });
  // The section's first read fails.
  const opened = router.navigate({
    to: "/ledger/qa/books/commit/$sha",
    params: { sha: "abc" },
  });
  await waitFor(() => expect(loads).toHaveLength(1));
  await act(async () => {
    loads[0].reject();
    await opened;
  });
  const tryAgain = () => screen.getByRole("button", { name: "Try Again" });
  await waitFor(() => expect(tryAgain()).toBeInTheDocument());
  return { router, loads, tryAgain, user: userEvent.setup() };
}

describe("ledger section retry lifecycle", () => {
  it("runs one recovery for repeated Enter and keeps focus after another failure", async () => {
    const { loads, tryAgain, user } = await mount();
    tryAgain().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(loads).toHaveLength(2));
    // Held: the same action stays, busy; another Enter queues nothing.
    expect(tryAgain()).toHaveAttribute("aria-busy", "true");
    await user.keyboard("{Enter}");

    await act(async () => loads[1].reject());
    await waitFor(() => expect(tryAgain()).toBeEnabled());
    expect(tryAgain()).toHaveFocus();
    expect(loads).toHaveLength(2);

    // Then the read comes back.
    await user.keyboard("{Enter}");
    await waitFor(() => expect(loads).toHaveLength(3));
    await act(async () => loads[2].resolve());
    expect(
      await screen.findByRole("heading", { name: "Commit detail" }),
    ).toBeInTheDocument();
    expect(loads).toHaveLength(3);
  });

  it("keeps focus on Try Again after a single retry fails", async () => {
    const { loads, tryAgain, user } = await mount();
    tryAgain().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(loads).toHaveLength(2));
    await act(async () => loads[1].reject());

    await waitFor(() => expect(tryAgain()).toBeEnabled());
    expect(tryAgain()).toHaveFocus();
    expect(loads).toHaveLength(2);
  });

  it("leaves a route abandoned during its recovery alone", async () => {
    const { router, loads, tryAgain, user } = await mount();
    tryAgain().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(loads).toHaveLength(2));

    await act(async () => {
      await router.navigate({ to: "/ledger/qa/books/files" });
    });
    await screen.findByRole("heading", { name: "Files" });
    await act(async () => loads[1].reject());

    expect(screen.getByRole("heading", { name: "Files" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try Again" })).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });
});
