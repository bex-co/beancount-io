import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  reject: (error: Error) => void;
}

function results(...names: string[]): SearchLedgersQuery {
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

async function renderGallery() {
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

describe("Gallery Clear after a search failure", () => {
  it("closes the failed query on native Tab and Enter, keeps input focus, and permits a healthy new search", async () => {
    const gallery = await renderGallery();
    try {
      const failed = await gallery.search("microsoft");
      await act(async () => failed.reject(new TypeError("Failed to fetch")));
      const alert = await gallery.findByRole("alert");
      expect(alert).toHaveTextContent(en["page.gallery.failedToSearchLedgers"]);
      expect(alert).toHaveTextContent(en["common.errors.network"]);
      expect(gallery.input).toHaveAttribute("aria-expanded", "true");

      await gallery.clearWithKeyboard();
      // Clearing remains closed after the abandoned query's debounce settles.
      await act(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 350));
      });
      gallery.expectCleared();
      expect(gallery.requests).toHaveLength(1);
      await gallery.user.tab();
      await gallery.user.tab({ shift: true });
      gallery.expectCleared();

      const healthy = await gallery.search("micro");
      await act(async () =>
        healthy.resolve(results("microsoft", "micro-example")),
      );
      const option = await gallery.findByRole("option", { name: /microsoft/ });
      expect(gallery.getAllByRole("option")).toHaveLength(2);
      expect(gallery.queryByRole("alert")).not.toBeInTheDocument();
      await gallery.user.keyboard("{ArrowDown}");
      expect(gallery.input).toHaveAttribute("aria-activedescendant", option.id);
      expect(option).toHaveAttribute("aria-selected", "true");
      await gallery.user.keyboard("{Enter}");
      await gallery.findByRole("heading", { name: "Ledger destination" });
      expect(gallery.router.state.location.pathname).toBe(
        "/ledger/synthetic/microsoft",
      );
      expect(gallery.requests).toHaveLength(2);
    } finally {
      gallery.dispose();
    }
  });

  it("preserves pointer Clear and keeps a subsequently cleared pending response closed and nonselectable", async () => {
    const gallery = await renderGallery();
    try {
      const failed = await gallery.search("microsoft");
      await act(async () => failed.reject(new TypeError("Failed to fetch")));
      await gallery.findByRole("alert");
      await gallery.user.click(
        gallery.getByRole("button", { name: en["common.clearInput"] }),
      );
      gallery.expectCleared();

      const pending = await gallery.search("micro");
      expect(gallery.input).toHaveAttribute("aria-expanded", "true");
      await gallery.clearWithKeyboard();
      await act(async () =>
        pending.resolve(results("microsoft", "micro-example")),
      );
      gallery.expectCleared();
      await gallery.user.keyboard("{ArrowDown}{Enter}");
      gallery.expectCleared();
      expect(gallery.router.state.location.pathname).toBe("/ledger-gallery");
      expect(gallery.requests).toHaveLength(2);
    } finally {
      gallery.dispose();
    }
  });
});
