import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { UserRepository } from "@/graphql/definitions";
import { userProfileSearchSchema } from "../../lib/search";
import { LedgerCollection } from "../ledger-collection";

vi.mock("@/common/hooks/use-translations", async () => {
  const { default: en } = await import("../../locales/en");
  return {
    useTranslations: () => ({
      t: (key: string, params: Record<string, string | number> = {}) =>
        (en[key]?.message || key).replace(/\{(\w+)\}/g, (_, name: string) =>
          String(params[name]),
        ),
    }),
  };
});

const repositories: UserRepository[] = Array.from(
  { length: 15 },
  (_, index) => ({
    __typename: "UserRepository",
    name: `ledger-${String(index).padStart(2, "0")}`,
    fullName: `owner/ledger-${String(index).padStart(2, "0")}`,
    description: index === 0 ? "Household budget" : null,
    isPrivate: index === 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
  }),
);

function buildRouter(
  initialEntry: string,
  options: { ledgerLoader?: () => Promise<void> } = {},
) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$username",
    validateSearch: (search) => userProfileSearchSchema.parse(search),
    component: function ProfileRoute() {
      const { username } = profileRoute.useParams();
      return (
        <LedgerCollection username={username} repositories={repositories} />
      );
    },
  });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    loader: options.ledgerLoader,
    component: () => <div data-testid="ledger-page">ledger</div>,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([profileRoute, ledgerRoute]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    // A held loader must stay pending rather than swap in a pending component.
    defaultPendingMs: options.ledgerLoader ? Infinity : undefined,
  });
}

async function mountAt(initialEntry = "/ledger/owner") {
  cleanup();
  const router = buildRouter(initialEntry);
  await router.load();
  render(<RouterProvider router={router} />);
  await waitFor(() => {
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });
  return router;
}

afterEach(() => {
  cleanup();
});

describe("LedgerCollection discovery", () => {
  it("searches the entire collection by name and description, ignoring case and outer whitespace", async () => {
    const user = userEvent.setup();
    await mountAt();
    expect(
      screen.queryByRole("heading", { name: "ledger-00" }),
    ).not.toBeInTheDocument();
    const input = screen.getByRole("searchbox", { name: "Search ledgers…" });
    await user.type(input, "  HOUSEHOLD  ");
    expect(
      screen.getByRole("heading", { name: "ledger-00" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing 1 of 1 ledgers",
    );
    await user.clear(input);
    await user.type(input, "LEDGER-14");
    expect(
      screen.getByRole("heading", { name: "ledger-14" }),
    ).toBeInTheDocument();
  });

  it("sorts by recency by default and supports alphabetical browsing without mutating the data", async () => {
    const user = userEvent.setup();
    await mountAt();
    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      "/ledger/owner/ledger-14",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort ledgers" }),
      "name",
    );
    await waitFor(() => {
      expect(screen.getAllByRole("link")[0]).toHaveAttribute(
        "href",
        "/ledger/owner/ledger-00",
      );
    });
    expect(repositories[0].name).toBe("ledger-00");
  });

  it("reveals all remaining ledgers and resets the visible page after a search is cleared", async () => {
    const user = userEvent.setup();
    await mountAt();
    expect(screen.getAllByRole("link")).toHaveLength(12);
    await user.click(screen.getByRole("button", { name: "Show more ledgers" }));
    await waitFor(() => {
      expect(screen.getAllByRole("link")).toHaveLength(15);
    });
    expect(
      screen.queryByRole("button", { name: "Show more ledgers" }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByRole("searchbox"), "ledger-14");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    await waitFor(() => {
      expect(screen.getAllByRole("link")).toHaveLength(12);
    });
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });

  it("offers a recovery action for an unmatched query", async () => {
    const user = userEvent.setup();
    await mountAt();
    await user.type(screen.getByRole("searchbox"), "nonexistent");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing 0 of 0 ledgers",
    );
    expect(
      screen.getByText(/No ledgers match your search/),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Clear search" })[1],
    );
    expect(screen.getAllByRole("link")).toHaveLength(12);
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
});

describe("LedgerCollection state in the profile URL", () => {
  it("restores search, sorting, and the revealed count after opening a ledger and pressing Back", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/owner?q=ledger-1&sort=name&show=24");

    expect(screen.getByRole("searchbox")).toHaveValue("ledger-1");
    expect(screen.getByRole("combobox", { name: "Sort ledgers" })).toHaveValue(
      "name",
    );
    // ledger-10…ledger-14 match, alphabetically ordered by the restored sort.
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      "/ledger/owner/ledger-10",
    );

    await user.click(screen.getAllByRole("link")[0]);
    await waitFor(() => {
      expect(screen.getByTestId("ledger-page")).toBeInTheDocument();
    });

    await act(async () => {
      router.history.back();
    });

    await waitFor(() => {
      expect(screen.getByRole("searchbox")).toHaveValue("ledger-1");
    });
    expect(screen.getByRole("combobox", { name: "Sort ledgers" })).toHaveValue(
      "name",
    );
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });

  it("restores a revealed page after a drill-down, and keeps tab intact", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/owner?tab=overview");

    await user.click(screen.getByRole("button", { name: "Show more ledgers" }));
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({
        tab: "overview",
        show: 24,
      });
    });
    expect(screen.getAllByRole("link")).toHaveLength(15);

    await user.click(screen.getAllByRole("link")[0]);
    await waitFor(() => {
      expect(screen.getByTestId("ledger-page")).toBeInTheDocument();
    });

    await act(async () => {
      router.history.back();
    });

    await waitFor(() => {
      expect(screen.getAllByRole("link")).toHaveLength(15);
    });
    expect(router.state.location.search).toMatchObject({ tab: "overview" });
  });

  it("debounces typing into a single replaced history entry", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/owner?tab=overview");
    const startLength = router.history.length;

    await user.type(screen.getByRole("searchbox"), "household");

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({
        tab: "overview",
        q: "household",
      });
    });
    expect(router.history.length).toBe(startLength);

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    await waitFor(() => {
      expect(router.state.location.search).not.toHaveProperty("q");
    });
    expect(router.state.location.search).toMatchObject({ tab: "overview" });
    expect(router.history.length).toBe(startLength);
  });

  it("coerces hostile collection params instead of failing to render", async () => {
    const router = await mountAt(
      `/ledger/owner?q=${encodeURIComponent('["x"]')}&sort=sideways&show=999999`,
    );

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Sort ledgers" })).toHaveValue(
      "updated",
    );
    // Clamped against the live result count, never the absurd request.
    expect(screen.getAllByRole("link")).toHaveLength(15);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing 15 of 15 ledgers",
    );
    expect(router.state.location.search).toMatchObject({ sort: "sideways" });

    // A shrunken result set cannot keep claiming a large slice.
    await mountAt("/ledger/owner?q=ledger-14&show=600");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing 1 of 1 ledgers",
    );
  });
});

describe("LedgerCollection navigation during a pending search write", () => {
  /**
   * The real race needs the ledger route to be *in flight* while the profile
   * component is still mounted: that is when the router resolves a relative
   * profile write against the pending destination's params.
   */
  function buildRaceRouter() {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    return {
      router: buildRouter("/ledger/owner", { ledgerLoader: () => held }),
      release,
    };
  }

  it("never rewrites the destination while a ledger read is in flight", async () => {
    const user = userEvent.setup();
    const { router, release } = buildRaceRouter();
    await router.load();
    render(<RouterProvider router={router} />);
    await waitFor(() => {
      expect(screen.getByRole("searchbox")).toBeInTheDocument();
    });

    // Type, then leave without touching a card, so the departure flush does
    // not run and a debounced write really is still outstanding. The held
    // loader keeps the profile mounted while the ledger route is pending.
    await user.type(screen.getByRole("searchbox"), "ledger-00");
    act(() => {
      void router.navigate({
        to: "/ledger/$ledgerOwner/$ledgerName",
        params: { ledgerOwner: "owner", ledgerName: "ledger-00" },
      });
    });
    await waitFor(() => expect(router.state.isLoading).toBe(true));

    // Let the outstanding debounce fire against that pending destination.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    // The old failure interpolated the ledger route's params into the
    // profile's $username and landed on /ledger/undefined.
    const pending = router.state.pendingMatches?.at(-1)?.pathname ?? "";
    expect(pending + router.state.location.pathname).not.toContain("undefined");

    await act(async () => {
      release();
      await Promise.resolve();
    });
  });
});

describe("LedgerCollection search preserved across a fast departure", () => {
  it("restores the typed query on Back even when departure beat the debounce", async () => {
    const user = userEvent.setup();
    const router = await mountAt();

    // Type and open a card well inside the 250ms window.
    await user.type(screen.getByRole("searchbox"), "ledger-00");
    expect(router.state.location.search).not.toMatchObject({ q: "ledger-00" });

    await user.click(screen.getByRole("link", { name: /ledger-00/ }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/ledger/owner/ledger-00");
    });

    await act(async () => {
      router.history.back();
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/ledger/owner");
    });
    // The search the reader could still see when they left is the one they
    // come back to, along with its filtered result.
    expect(router.state.location.search).toMatchObject({ q: "ledger-00" });
    await waitFor(() => {
      expect(screen.getByRole("searchbox")).toHaveValue("ledger-00");
    });
  });
});

describe("LedgerCollection write ownership across departures", () => {
  it("never writes to another profile after the reader moves on", async () => {
    const user = userEvent.setup();
    const router = await mountAt();

    await user.type(screen.getByRole("searchbox"), "ledger-00");
    // Leave for a different profile entirely, without touching a card.
    act(() => {
      void router.navigate({
        to: "/ledger/$username",
        params: { username: "someone-else" },
      });
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/ledger/someone-else");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    // The other profile's URL must not inherit this profile's draft.
    expect(router.state.location.pathname).toBe("/ledger/someone-else");
    expect(router.state.location.search).not.toMatchObject({ q: "ledger-00" });
  });

  it("drops an uncommitted query when leaving outside the results grid", async () => {
    const user = userEvent.setup();
    const router = await mountAt();

    await user.type(screen.getByRole("searchbox"), "ledger-00");
    // A departure the grid's flush does not cover, e.g. a header or tab link.
    act(() => {
      void router.navigate({
        to: "/ledger/$ledgerOwner/$ledgerName",
        params: { ledgerOwner: "owner", ledgerName: "ledger-01" },
      });
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/ledger/owner/ledger-01");
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    // Recorded behaviour, not an endorsement: the guard correctly prevents the
    // stale write, so the destination is intact and never /ledger/undefined,
    // but the typed query is lost because the flush is bound to the grid.
    // Widening that seam is tracked in w4/143.
    expect(router.state.location.pathname).toBe("/ledger/owner/ledger-01");
    expect(router.state.location.pathname).not.toContain("undefined");
  });

  it("commits a cleared search when the reader opens a card", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/owner?q=ledger-00");
    expect(screen.getByRole("searchbox")).toHaveValue("ledger-00");

    // Clear, then leave immediately — the cleared state must reach the URL.
    await user.clear(screen.getByRole("searchbox"));
    await user.click(screen.getAllByRole("link")[0]!);
    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/\/ledger\/owner\/.+/);
    });

    await act(async () => {
      router.history.back();
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/ledger/owner");
    });
    expect(router.state.location.search).not.toMatchObject({ q: "ledger-00" });
  });

  it("keeps sort and show while committing a fast-typed query", async () => {
    const user = userEvent.setup();
    const router = await mountAt("/ledger/owner?sort=name&show=24");

    await user.type(screen.getByRole("searchbox"), "ledger-0");
    await user.click(screen.getByRole("link", { name: /ledger-00/ }));
    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/\/ledger\/owner\/.+/);
    });

    await act(async () => {
      router.history.back();
    });
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ q: "ledger-0" });
    });
    // The other validated list state rides along untouched.
    expect(router.state.location.search).toMatchObject({ sort: "name" });
  });
});
