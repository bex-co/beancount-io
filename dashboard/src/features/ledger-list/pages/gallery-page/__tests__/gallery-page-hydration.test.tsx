import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import type {
  SearchLedgersQuery,
  SearchLedgersQueryVariables,
} from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import en from "@/i18n/locales/en";
import { LocalizationProvider } from "@/i18n/provider";
import GalleryPage from "../index";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

interface SearchRequest {
  name: string;
  variables: SearchLedgersQueryVariables;
  resolve: (data: SearchLedgersQuery) => void;
}

function results(name = "adyen"): SearchLedgersQuery {
  return {
    searchLedgers: [
      {
        __typename: "Ledger",
        id: `synthetic/${name}`,
        name,
        fullName: `synthetic/${name}`,
        description: "Synthetic public ledger search result",
        updatedAt: "2026-01-01T00:00:00Z",
        createdAt: "2025-01-01T00:00:00Z",
        sshUrl: "ssh://example.invalid/synthetic",
        httpUrl: "https://example.invalid/synthetic",
        size: 1,
        private: false,
        empty: false,
        permissions: null,
      },
    ],
  };
}

function makeRouter(isServer: boolean) {
  const root = createRootRoute({ component: Outlet });
  const gallery = createRoute({
    getParentRoute: () => root,
    path: "/ledger-gallery",
    component: GalleryPage,
  });
  const ledger = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    component: () => <h1>Ledger destination</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([gallery, ledger]),
    history: createMemoryHistory({ initialEntries: ["/ledger-gallery"] }),
    isServer,
  });
  router.ssr = { manifest: undefined };
  return router;
}

async function hydrateGallery() {
  const requests: SearchRequest[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName,
            variables: { ...operation.variables },
            resolve: (data) => {
              observer.next({ data });
              observer.complete();
            },
          });
        }),
    ),
  });
  const serverClient = new ApolloClient({
    ssrMode: true,
    cache: new InMemoryCache(),
    link: ApolloLink.empty(),
  });
  const localization = createLocalization();
  const view = (
    router: ReturnType<typeof makeRouter>,
    apollo: ApolloClient,
  ) => (
    <ApolloProvider client={apollo}>
      <LocalizationProvider localization={localization}>
        <RouterProvider router={router} />
      </LocalizationProvider>
    </ApolloProvider>
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: ReturnType<typeof hydrateRoot> | undefined;
  const dispose = async () => {
    await act(async () => root?.unmount());
    client.stop();
    serverClient.stop();
    container.remove();
  };
  try {
    const server = makeRouter(true);
    await server.load();
    container.innerHTML = renderToString(view(server, serverClient));
    const queries = within(container);
    const input = queries.getByRole("combobox");
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute(
      "placeholder",
      en["page.gallery.searchLedgersPlaceholder"],
    );
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(
      queries.getByRole("heading", { name: en["page.gallery.ledgerGallery"] }),
    ).toBeVisible();

    // Ordinary browser editing cannot focus or enter text into the disabled
    // server field. No handler or readiness boolean is substituted here.
    const earlyUser = userEvent.setup();
    await earlyUser.click(input);
    await earlyUser.keyboard("adyen");
    expect(input).not.toHaveFocus();
    expect(input).toHaveValue("");
    expect(requests).toHaveLength(0);

    const router = makeRouter(false);
    await router.load();
    const recoverable = vi.fn();
    await act(async () => {
      root = hydrateRoot(container, view(router, client), {
        onRecoverableError: recoverable,
      });
    });
    await waitFor(() => expect(input).toBeEnabled());
    expect(queries.getByRole("combobox")).toBe(input);
    expect(input).toHaveValue("");
    expect(queries.queryByRole("listbox")).not.toBeInTheDocument();
    expect(recoverable).not.toHaveBeenCalled();
    return { input, queries, router, requests, recoverable, dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}

describe("Gallery search hydration", () => {
  it("becomes ready for the first ordinary search once, then retains keyboard selection and clean Back navigation", async () => {
    const gallery = await hydrateGallery();
    try {
      const { input, queries, router, requests } = gallery;
      const user = userEvent.setup({ delay: 20 });
      await user.type(input, "a");
      await act(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 350));
      });
      expect(requests).toHaveLength(0);
      expect(queries.queryByRole("listbox")).not.toBeInTheDocument();
      await user.type(input, "dyen");
      expect(input).toHaveValue("adyen");
      expect(requests).toHaveLength(0);
      await waitFor(() => expect(requests).toHaveLength(1));
      expect(requests[0]).toMatchObject({
        name: "SearchLedgers",
        variables: { q: "adyen", limit: 50 },
      });
      await act(async () => requests[0].resolve(results()));
      const option = await queries.findByRole("option", { name: /adyen/ });
      expect(queries.getAllByRole("option")).toHaveLength(1);
      expect(input).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(input).toHaveAttribute("aria-activedescendant", option.id);
      expect(option).toHaveAttribute("aria-selected", "true");
      await user.keyboard("{Enter}");
      await queries.findByRole("heading", { name: "Ledger destination" });
      expect(router.state.location.pathname).toBe("/ledger/synthetic/adyen");
      expect(requests).toHaveLength(1);

      await act(async () => {
        router.history.back();
        await router.load();
      });
      const returnedInput = await queries.findByRole("combobox");
      expect(returnedInput).toBeEnabled();
      expect(returnedInput).toHaveValue("");
      expect(returnedInput).not.toHaveAttribute("aria-activedescendant");
      expect(queries.queryByRole("option")).not.toBeInTheDocument();
      expect(requests).toHaveLength(1);
      expect(gallery.recoverable).not.toHaveBeenCalled();
    } finally {
      await gallery.dispose();
    }
  });
});
