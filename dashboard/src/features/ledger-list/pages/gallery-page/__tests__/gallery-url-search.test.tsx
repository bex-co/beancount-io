import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
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
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  SearchLedgersQuery,
  SearchLedgersQueryVariables,
} from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { Route as GalleryRoute } from "@/routes/ledger-gallery";
import { Route as LegacyGalleryRoute } from "@/routes/gallery";
import { validateGallerySearch } from "../search";
import GalleryPage from "../index";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.unmock("@/i18n");

interface SearchRequest {
  variables: SearchLedgersQueryVariables;
  resolve: (data: SearchLedgersQuery) => void;
}

function results(...names: string[]): SearchLedgersQuery {
  return {
    searchLedgers: names.map((name) => ({
      __typename: "Ledger",
      id: `synthetic/${name}`,
      name,
      fullName: `synthetic/${name}`,
      description: null,
      updatedAt: "2026-01-01T00:00:00Z",
      createdAt: "2025-01-01T00:00:00Z",
      sshUrl: "ssh://example.invalid/synthetic",
      httpUrl: "https://example.invalid/synthetic",
      size: 1,
      private: false,
      empty: false,
      permissions: null,
    })),
  };
}

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

async function setup(
  entry = "/ledger-gallery",
  language: "en" | "de" = "en",
  initialEntries = ["/before", entry],
) {
  const requests: SearchRequest[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          expect(operation.operationName).toBe("SearchLedgers");
          requests.push({
            variables: { ...operation.variables },
            resolve(data) {
              observer.next({ data });
              observer.complete();
            },
          });
        }),
    ),
  });
  clients.push(client);
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const root = createRootRoute({ component: Outlet });
  const gallery = createRoute({
    getParentRoute: () => root,
    path: "/ledger-gallery",
    component: GalleryPage,
    validateSearch: GalleryRoute.options.validateSearch,
  });
  const destination = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    component: () => <h1>Ledger destination</h1>,
  });
  const dashboard = createRoute({
    getParentRoute: () => root,
    path: "/ledger",
    component: () => <h1>Dashboard</h1>,
  });
  const before = createRoute({
    getParentRoute: () => root,
    path: "/before",
    component: () => <h1>Previous page</h1>,
  });
  const legacy = createRoute({
    getParentRoute: () => root,
    path: "/gallery",
    beforeLoad: LegacyGalleryRoute.options.beforeLoad,
  });
  const history = createMemoryHistory({ initialEntries });
  const router = createRouter({
    routeTree: root.addChildren([
      gallery,
      destination,
      dashboard,
      before,
      legacy,
    ]),
    history,
    isServer: false,
  });
  await router.load();
  const view = render(
    <ApolloProvider client={client}>
      <LocalizationProvider localization={localization}>
        <RouterProvider router={router} />
      </LocalizationProvider>
    </ApolloProvider>,
  );
  const input = await screen.findByRole("combobox");
  await waitFor(() => expect(input).toBeEnabled());
  return {
    requests,
    router,
    history,
    input,
    localization,
    dispose: () => {
      view.unmount();
      client.stop();
    },
  };
}

const messages = {
  en: {
    minimum: "Type at least 2 characters to search.",
    one: "1 ledger found",
    two: "2 ledgers found",
    empty: "No ledgers match stock",
  },
  de: {
    minimum: "Geben Sie mindestens 2 Zeichen ein, um zu suchen.",
    one: "1 Hauptbuch gefunden",
    two: "2 Hauptbücher gefunden",
    empty: "Keine Hauptbücher entsprechen stock",
  },
};

describe("Gallery URL search and announcements", () => {
  it.each([
    { previous: null, heading: "Dashboard", path: "/ledger" },
    {
      previous: "/before?source=search",
      heading: "Previous page",
      path: "/before?source=search",
    },
  ])(
    "returns to $path through the keyboard-accessible Back link",
    async ({ previous, heading, path }) => {
      const entry = "/ledger-gallery";
      const { router } = await setup(
        entry,
        "en",
        previous ? [previous, entry] : [entry],
      );
      const user = userEvent.setup();
      const back = screen.getByRole("link", { name: "Back" });
      await user.tab();
      expect(back).toHaveFocus();
      expect(back).toHaveAttribute("href", "/ledger");
      await user.keyboard("{Enter}");
      expect(
        await screen.findByRole("heading", { name: heading }),
      ).toBeVisible();
      expect(router.state.location.href).toBe(path);
    },
  );

  it("accepts trimmed text and rejects empty or non-text q values", () => {
    expect(validateGallerySearch({ q: "  stock  " })).toEqual({ q: "stock" });
    for (const q of [
      undefined,
      null,
      "",
      "   ",
      42,
      true,
      ["stock"],
      { value: "stock" },
    ]) {
      expect(validateGallerySearch({ q })).toEqual({});
    }
  });

  it("restores the search through the actual legacy /gallery redirect", async () => {
    const { input, router, requests } = await setup("/gallery?q=%20stock%20");
    expect(router.state.location.pathname).toBe("/ledger-gallery");
    expect(input).toHaveValue("stock");
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].variables).toEqual({ q: "stock", limit: 50 });
    await act(async () => requests[0].resolve(results("stock-example")));
    expect(
      await screen.findByRole("option", { name: /stock-example/ }),
    ).toBeInTheDocument();
  });
  it.each(["en", "de"] as const)(
    "%s restores stock after keyboard selection, Back, and a fresh-router reload",
    async (language) => {
      const gallery = await setup(
        language === "en" ? "/ledger-gallery" : "/ledger-gallery?q=stock",
        language,
      );
      const copy = messages[language];
      const user = userEvent.setup();
      if (language === "en") {
        expect(gallery.input).toHaveValue("");
        await user.type(gallery.input, "stock");
      }
      expect(gallery.input).toHaveValue("stock");
      await waitFor(() => expect(gallery.requests).toHaveLength(1));
      expect(gallery.requests[0].variables).toEqual({ q: "stock", limit: 50 });
      await act(async () =>
        gallery.requests[0].resolve(results("stock-example")),
      );
      expect(await screen.findByRole("status")).toHaveTextContent(copy.one);
      await user.click(gallery.input);
      const option = await screen.findByRole("option", {
        name: /stock-example/,
      });
      await user.keyboard("{ArrowDown}");
      expect(gallery.input).toHaveAttribute("aria-activedescendant", option.id);
      expect(option).toHaveAttribute("aria-selected", "true");
      await user.keyboard("{Enter}");
      await screen.findByRole("heading", { name: "Ledger destination" });
      expect(gallery.router.state.location.pathname).toBe(
        "/ledger/synthetic/stock-example",
      );
      expect(gallery.history.length).toBe(3);

      await act(async () => {
        gallery.history.back();
        await gallery.router.load();
      });
      const returnedInput = await screen.findByRole("combobox");
      expect(returnedInput).toHaveValue("stock");
      expect(returnedInput).not.toHaveAttribute("aria-activedescendant");
      expect(
        await screen.findByRole("option", { name: /stock-example/ }),
      ).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(copy.one);
      expect(gallery.requests).toHaveLength(1);
      const savedUrl = gallery.router.state.location.href;
      expect(gallery.router.state.location.search).toMatchObject({
        q: "stock",
      });
      gallery.dispose();

      const reloaded = await setup(savedUrl, language, [savedUrl]);
      expect(reloaded.input).toHaveValue("stock");
      await waitFor(() => expect(reloaded.requests).toHaveLength(1));
      expect(reloaded.requests[0].variables).toEqual({ q: "stock", limit: 50 });
      await act(async () =>
        reloaded.requests[0].resolve(results("stock-example", "stock-other")),
      );
      expect(await screen.findAllByRole("option")).toHaveLength(2);
      expect(screen.getByRole("status")).toHaveTextContent(copy.two);
    },
  );

  it.each(["en", "de"] as const)(
    "%s announces only settled current searches and debounces URL replacements without adding history",
    async (language) => {
      const { input, requests, router, history, localization } = await setup(
        "/ledger-gallery",
        language,
      );
      const copy = messages[language];
      const user = userEvent.setup();
      expect(screen.getByRole("status")).toHaveTextContent(copy.minimum);
      await user.type(input, "s");
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 350));
      });
      expect(requests).toHaveLength(0);
      expect(screen.getByRole("combobox")).toBe(input);
      expect(input).toHaveValue("s");
      expect(screen.getByRole("status")).toHaveTextContent(copy.minimum);
      await user.type(input, "to");
      await waitFor(() => expect(requests).toHaveLength(1));
      expect(requests[0].variables).toEqual({ q: "sto", limit: 50 });
      await waitFor(() =>
        expect(router.state.location.search).toMatchObject({ q: "sto" }),
      );
      expect(history.length).toBe(2);
      await act(async () =>
        requests[0].resolve(results("stock-example", "stock-other")),
      );
      expect(screen.getByRole("status")).toHaveTextContent(copy.two);

      await user.type(input, "ck");
      expect(input).toHaveValue("stock");
      expect(screen.getByRole("status")).not.toHaveTextContent(copy.two);
      expect(screen.queryByRole("option")).not.toBeInTheDocument();
      await waitFor(() => expect(requests).toHaveLength(2));
      expect(requests[1].variables).toEqual({ q: "stock", limit: 50 });
      expect(screen.getByRole("status")).not.toHaveTextContent(copy.two);
      await act(async () => requests[1].resolve(results()));
      expect(screen.getByRole("status")).toHaveTextContent(copy.empty);
      await waitFor(() =>
        expect(router.state.location.search).toMatchObject({ q: "stock" }),
      );
      expect(history.length).toBe(2);

      await user.tab();
      expect(
        screen.getByRole("button", {
          name: localization.i18n.t("common.clearInput"),
          exact: true,
        }),
      ).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(input).toHaveValue("");
      expect(input).toHaveFocus();
      expect(input).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByRole("status")).toHaveTextContent(copy.minimum);
      await waitFor(() =>
        expect(router.state.location.search).not.toHaveProperty("q"),
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 350));
      });
      expect(requests).toHaveLength(2);
      expect(history.length).toBe(2);
      await user.keyboard("{ArrowDown}{Enter}");
      expect(router.state.location.pathname).toBe("/ledger-gallery");
    },
  );

  it("lets Back replace a pending draft without a stale debounce overwriting the restored URL or input", async () => {
    const { input, requests, router, history } = await setup(
      "/ledger-gallery?q=example",
      "en",
      ["/ledger-gallery?q=stock", "/ledger-gallery?q=example"],
    );
    expect(input).toHaveValue("example");
    await waitFor(() => expect(requests).toHaveLength(1));
    await act(async () => requests[0].resolve(results("example")));
    const user = userEvent.setup();
    await user.clear(input);
    await user.type(input, "pending-draft");
    expect(input).toHaveValue("pending-draft");
    await act(async () => {
      history.back();
      await router.load();
    });
    await waitFor(() => expect(input).toHaveValue("stock"));
    await waitFor(() => expect(requests).toHaveLength(2));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(router.state.location.search).toMatchObject({ q: "stock" });
    expect(input).toHaveValue("stock");
    expect(requests.map(({ variables }) => variables.q)).toEqual([
      "example",
      "stock",
    ]);
    expect(history.length).toBe(2);
    await act(async () => requests[1].resolve(results("stock-example")));
    expect(screen.getByRole("status")).toHaveTextContent(messages.en.one);
    expect(
      await screen.findByRole("option", { name: /stock-example/ }),
    ).toBeInTheDocument();
  });
});
