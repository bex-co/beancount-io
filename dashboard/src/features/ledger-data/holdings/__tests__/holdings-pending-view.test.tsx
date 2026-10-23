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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { en } from "@/i18n/locales";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params";
import LedgerHoldingsPage from "../index";
import { holdingsSearchSchema } from "../search";

/**
 * Every navigation waits on the ledger route (production: the current-user
 * read). Choosing By Account and then Holdings again before it lands used to
 * end on By Account: Holdings was still the rendered view, so the return was
 * dropped as a no-op (w4/1008).
 */
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));
vi.mock("@apollo/client/react", () => ({ useQuery: mockQuery }));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "My books" }),
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

const LABEL = {
  holdings: "Holdings",
  "by-account": "Holdings by Account",
  "by-currency": "Holdings by Currency",
} as const;

let i18n = createInstance();
let held: Promise<void> | undefined;
let release = () => {};

beforeEach(async () => {
  // Radix Select reads pointer capture and scrolls its item; jsdom has neither.
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
  mockQuery.mockReturnValue({
    loading: false,
    error: undefined,
    data: {
      queryShell: {
        resultType: "table",
        table: {
          types: [{ name: "account" }, { name: "units" }],
          rows: [["Assets:Brokerage", { ACME: "1" }]],
        },
      },
    },
  });
  i18n = createInstance();
  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  });
});
afterEach(() => {
  release();
  held = undefined;
  cleanup();
});

function hold() {
  held = new Promise<void>((resolve) => {
    release = () => {
      held = undefined;
      resolve();
    };
  });
}

async function mount() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    beforeLoad: () => held,
    component: () => <Outlet />,
  });
  const holdingsRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/holdings",
    validateSearch: (search) => holdingsSearchSchema.parse(search),
    component: LedgerHoldingsPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      ledgerRoute.addChildren([holdingsRoute]),
    ]),
    history: createMemoryHistory({
      initialEntries: ["/ledger/alice/books/holdings?view=holdings"],
    }),
  });
  await router.load();
  render(
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
  await screen.findByRole("table", { name: LABEL.holdings });
  return router;
}

const selectedTab = () =>
  screen
    .getAllByRole("tab")
    .find((tab) => tab.getAttribute("aria-selected") === "true")?.textContent;

async function settle(router: Awaited<ReturnType<typeof mount>>) {
  await act(async () => {
    release();
  });
  await waitFor(() => expect(router.state.status).toBe("idle"));
}

describe("a view chosen while another is still loading", () => {
  it("returns to the rendered tab from the keyboard", async () => {
    const user = userEvent.setup();
    const router = await mount();
    hold();

    screen.getByRole("tab", { name: LABEL.holdings }).focus();
    await user.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        view: "by-account",
      }),
    );
    expect(router.state.status).toBe("pending");
    await user.keyboard("{ArrowLeft}");
    await user.keyboard("{Enter}");

    await settle(router);
    expect(router.state.location.search).toMatchObject({ view: "holdings" });
    expect(selectedTab()).toBe(LABEL.holdings);
    expect(
      screen.getByRole("table", { name: LABEL.holdings }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: LABEL.holdings })).toHaveFocus();
  });

  it("returns to the rendered view through the narrow View selector", async () => {
    const user = userEvent.setup();
    const router = await mount();
    hold();

    const view = screen.getByRole("combobox", { name: "View" });
    await user.click(view);
    await user.click(
      await screen.findByRole("option", { name: LABEL["by-account"] }),
    );
    expect(router.state.status).toBe("pending");
    await user.click(view);
    await user.click(
      await screen.findByRole("option", { name: LABEL.holdings }),
    );

    await settle(router);
    expect(router.state.location.search).toMatchObject({ view: "holdings" });
    expect(view).toHaveTextContent(LABEL.holdings);
    expect(
      screen.getByRole("table", { name: LABEL.holdings }),
    ).toBeInTheDocument();
  });

  it("still takes a third view chosen while the second loads", async () => {
    const user = userEvent.setup();
    const router = await mount();
    hold();

    await user.click(screen.getByRole("tab", { name: LABEL["by-account"] }));
    await user.click(screen.getByRole("tab", { name: LABEL["by-currency"] }));

    await settle(router);
    expect(router.state.location.search).toMatchObject({
      view: "by-currency",
    });
    expect(selectedTab()).toBe(LABEL["by-currency"]);
  });
});
