import { cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * A legacy `type=file` link hands off to the canonical file route after the
 * alias has mounted, not from beforeLoad: a beforeLoad redirect on this
 * client-only route changes the initial route while it hydrates, which React
 * reports as error #418 (w4/1094). Through a real router, the alias's first
 * resolved match must be its own route, and the file must still open with its
 * line and mode, replacing the alias in history.
 */

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, createFileRoute: () => (options: unknown) => options };
});

const directoryPage = vi.hoisted(() => vi.fn());
vi.mock("@/features/ledger-editor/files-content", () => ({
  default: () => {
    directoryPage();
    return <div data-testid="directory">directory</div>;
  },
}));

function FileView() {
  const { _splat } = useParams({ strict: false }) as { _splat: string };
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  return (
    <div data-testid="file">
      {_splat}:{String(search.lineNumber)}:{String(search.editMode)}
    </div>
  );
}

async function mountAt(url: string) {
  const { Route } =
    await import("@/routes/ledger.$ledgerOwner.$ledgerName.files.content");
  const { component, validateSearch, beforeLoad } = Route as unknown as {
    component: () => React.ReactNode;
    validateSearch: (search: Record<string, unknown>) => object;
    beforeLoad?: unknown;
  };
  const root = createRootRoute({ component: () => <Outlet /> });
  const alias = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/files/content",
    validateSearch,
    beforeLoad: beforeLoad as never,
    component,
  });
  const blob = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
    validateSearch: (search: Record<string, unknown>) => search,
    component: FileView,
  });
  const history = createMemoryHistory({ initialEntries: ["/start", url] });
  const router = createRouter({
    routeTree: root.addChildren([alias, blob]),
    history,
  });
  // What hydration does first: resolve the initial location's matches.
  await router.load();
  const initialRoute = router.state.matches.at(-1)?.routeId;
  render(<RouterProvider router={router} />);
  return { router, history, initialRoute };
}

afterEach(() => {
  cleanup();
  directoryPage.mockClear();
});

describe("legacy file alias handoff (w4/1094)", () => {
  it("resolves the alias first, then opens the file after mount", async () => {
    const { router, history, initialRoute } = await mountAt(
      "/ledger/open_ledger/example/files/content?type=file&path=%2Fmain.bean&editMode=false&lineNumber=42",
    );
    // The initial route is the one the server answered for.
    expect(initialRoute).toBe("/ledger/$ledgerOwner/$ledgerName/files/content");

    await waitFor(() =>
      expect(screen.getByTestId("file")).toHaveTextContent(
        "main.bean:42:false",
      ),
    );
    expect(router.state.location.pathname).toBe(
      "/ledger/open_ledger/example/files/blob/main/main.bean",
    );
    // No directory read for a file target.
    expect(directoryPage).not.toHaveBeenCalled();
    // Replaced: Back leaves the Files browser instead of bouncing.
    expect(history.length).toBe(2);
  });

  it("keeps a directory target on the directory browser", async () => {
    const { router } = await mountAt(
      "/ledger/open_ledger/example/files/content?type=dir&path=",
    );
    await waitFor(() => expect(screen.getByTestId("directory")).toBeVisible());
    expect(router.state.location.pathname).toBe(
      "/ledger/open_ledger/example/files/content",
    );
  });
});
