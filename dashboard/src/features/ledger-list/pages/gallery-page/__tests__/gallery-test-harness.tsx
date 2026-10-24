import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { expect } from "vitest";
import type {
  SearchLedgersQuery,
  SearchLedgersQueryVariables,
} from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import en from "@/i18n/locales/en";
import { LocalizationProvider } from "@/i18n/provider";
import GalleryPage from "../index";

/**
 * The real Gallery under a real router and Apollo client whose SearchLedgers
 * requests each test answers by hand. Callers unmock the translation hooks.
 */
interface SearchRequest {
  name: string;
  variables: SearchLedgersQueryVariables;
  resolve: (data: SearchLedgersQuery) => void;
  reject: (error: Error) => void;
}

export function results(...names: string[]): SearchLedgersQuery {
  return {
    searchLedgers: names.map((name) => ({
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
    })),
  };
}

export async function renderGallery() {
  const requests: SearchRequest[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName ?? "",
            variables: { ...operation.variables },
            resolve: (data) => {
              observer.next({ data });
              observer.complete();
            },
            reject: (error) => observer.error(error),
          });
        }),
    ),
  });
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
    isServer: false,
  });
  await router.load();
  const view = render(
    <ApolloProvider client={client}>
      <LocalizationProvider localization={createLocalization()}>
        <RouterProvider router={router} />
      </LocalizationProvider>
    </ApolloProvider>,
  );
  const input = await view.findByRole("combobox");
  const user = userEvent.setup();
  const search = async (query: string) => {
    const requestCount = requests.length;
    await user.type(input, query);
    await waitFor(() => expect(requests).toHaveLength(requestCount + 1));
    const request = requests[requestCount];
    expect(request).toMatchObject({
      name: "SearchLedgers",
      variables: { q: query, limit: 50 },
    });
    return request;
  };
  const expectCleared = () => {
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).not.toHaveAttribute("aria-activedescendant");
    expect(view.queryByRole("listbox")).not.toBeInTheDocument();
    expect(view.queryByRole("alert")).not.toBeInTheDocument();
    expect(view.queryByRole("option")).not.toBeInTheDocument();
    expect(
      view.queryByRole("button", { name: en["common.clearInput"] }),
    ).not.toBeInTheDocument();
  };
  const clearWithKeyboard = async () => {
    expect(input).toHaveFocus();
    await user.tab();
    expect(
      view.getByRole("button", { name: en["common.clearInput"] }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    expectCleared();
  };
  return {
    ...view,
    input,
    user,
    router,
    requests,
    search,
    expectCleared,
    clearWithKeyboard,
    dispose: () => {
      view.unmount();
      client.stop();
    },
  };
}
