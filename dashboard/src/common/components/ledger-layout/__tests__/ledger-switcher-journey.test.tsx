import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  useParams,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ListLedgersQuery } from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { ReactNativeContext } from "@/common/providers/react-native-bridge-provider/react-native-bridge-context";
import { SidebarProvider } from "@/common/components/ui/sidebar";
import { Route as LedgerRoute } from "@/routes/ledger.$ledgerOwner.$ledgerName";
import { LedgerSwitcher } from "../ledger-switcher";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.unmock("@/i18n");

const ledgers: ListLedgersQuery = {
  listLedgers: ["books", "business"].map((name) => ({
    __typename: "Ledger",
    id: `alice/${name}`,
    name,
    fullName: `alice/${name}`,
    httpUrl: `https://example.invalid/alice/${name}`,
    sshUrl: `ssh://example.invalid/alice/${name}`,
    private: false,
    empty: false,
    size: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-10-15T00:00:00Z",
    description: null,
    permissions: null,
  })),
};

const messages = {
  en: {
    suffix: "switch ledger",
    dialog: "Select a ledger",
    owner: "Go to alice's account",
  },
  de: {
    suffix: "Hauptbuch wechseln",
    dialog: "Hauptbuch auswählen",
    owner: "Gehe zum Konto von alice",
  },
};

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
  vi.unstubAllGlobals();
});

async function setup(language: "en" | "de", fullName?: string) {
  vi.stubGlobal("innerWidth", 1440);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const requests: { name: string; variables: Record<string, unknown> }[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName,
            variables: operation.variables,
          });
          if (operation.operationName === "ListLedgers") {
            observer.next({ data: ledgers });
          } else {
            expect(operation.operationName).toBe("GetCurrentUser");
            observer.next({ data: { userProfile: null } });
          }
          observer.complete();
        }),
    ),
  });
  clients.push(client);
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const root = createRootRouteWithContext<{
    userProfile: { username: string };
  }>()({
    component: () => (
      <ApolloProvider client={client}>
        <LocalizationProvider localization={localization}>
          <ReactNativeContext.Provider value={{ isReactNative: false }}>
            <SidebarProvider>
              <Outlet />
            </SidebarProvider>
          </ReactNativeContext.Provider>
        </LocalizationProvider>
      </ApolloProvider>
    ),
  });
  const ledger = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: LedgerRoute.options.validateSearch,
    search: LedgerRoute.options.search,
    component: function LedgerPage() {
      const { ledgerOwner, ledgerName } = useParams({
        from: "/ledger/$ledgerOwner/$ledgerName",
      });
      return (
        <>
          <LedgerSwitcher
            currentLedgerId={`${ledgerOwner}/${ledgerName}`}
            currentLedgerName={ledgerName}
            currentLedgerFullName={fullName ?? `${ledgerOwner}/${ledgerName}`}
          />
          <Outlet />
        </>
      );
    },
  });
  const journal = createRoute({
    getParentRoute: () => ledger,
    path: "/journal",
    component: () => <h1>Journal destination</h1>,
  });
  const profile = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$username",
    component: () => <h1>Profile destination</h1>,
  });
  const dashboard = createRoute({
    getParentRoute: () => root,
    path: "/ledger",
    component: () => <h1>Dashboard destination</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([
      ledger.addChildren([journal]),
      profile,
      dashboard,
    ]),
    history: createMemoryHistory({
      initialEntries: [
        "/ledger/alice/books/journal?account=Expenses&filter=payee%3Acoffee&time=2026-10",
      ],
    }),
    context: { userProfile: { username: "alice" } },
    isServer: false,
  });
  await router.load();
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { name: "Journal destination" });
  return { router, requests, localization };
}

describe("ledger switcher names and real navigation", () => {
  it.each(["en", "de"] as const)(
    "%s names the ledger and dialog while preserving keyboard switching and owner navigation",
    async (language) => {
      const { router, requests } = await setup(language);
      const copy = messages[language];
      const user = userEvent.setup();
      const trigger = screen.getByRole("combobox", {
        name: `books — ${copy.suffix}`,
      });
      expect(trigger).toHaveTextContent("books");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(requests).toEqual([]);

      await user.tab();
      await user.tab();
      expect(
        screen.getByRole("link", { name: "alice", exact: true }),
      ).toHaveFocus();
      await user.tab();
      expect(trigger).toHaveFocus();
      await user.keyboard("{Enter}");
      let dialog = await screen.findByRole("dialog", { name: copy.dialog });
      const current = await within(dialog).findByRole("option", {
        name: /^books/,
      });
      expect(current).toHaveAttribute("aria-current", "true");
      expect(
        within(dialog)
          .getAllByRole("option")
          .filter((option) => option.hasAttribute("aria-current")),
      ).toEqual([current]);
      expect(
        within(dialog).getByRole("option", { name: /^business/ }),
      ).not.toHaveAttribute("aria-current");
      expect(requests).toEqual([{ name: "ListLedgers", variables: {} }]);

      await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(trigger).toHaveFocus();
      expect(trigger).toHaveAttribute("aria-expanded", "false");

      await user.keyboard("{Enter}");
      dialog = await screen.findByRole("dialog", { name: copy.dialog });
      const search = within(dialog).getByRole("combobox");
      await waitFor(() => expect(search).toHaveFocus());
      await user.type(search, "business");
      const destination = await within(dialog).findByRole("option", {
        name: /^business/,
      });
      await user.keyboard("{ArrowDown}");
      expect(destination).toHaveAttribute("aria-selected", "true");
      await user.keyboard("{Enter}");
      await waitFor(() =>
        expect(router.state.location.pathname).toBe(
          "/ledger/alice/business/journal",
        ),
      );
      for (const key of ["account", "filter", "time"]) {
        expect(router.state.location.search).not.toHaveProperty(key);
      }
      const switchedTrigger = screen.getByRole("combobox", {
        name: `business — ${copy.suffix}`,
      });
      expect(
        screen.getByRole("heading", { name: "Journal destination" }),
      ).toBeInTheDocument();

      await user.click(switchedTrigger);
      dialog = await screen.findByRole("dialog", { name: copy.dialog });
      expect(
        within(dialog).getByRole("option", { name: /^business/ }),
      ).toHaveAttribute("aria-current", "true");
      const owner = within(dialog).getByRole("option", { name: copy.owner });
      await waitFor(() =>
        expect(owner).toHaveAttribute("aria-selected", "true"),
      );
      await user.keyboard("{Enter}");
      await screen.findByRole("heading", { name: "Profile destination" });
      expect(router.state.location.pathname).toBe("/ledger/alice");
    },
  );

  it.each([
    {
      action: "Create Ledger",
      tabs: 1,
      selectedLedger: false,
      role: "dialog",
      destination: "Create New Ledger",
      url: undefined,
    },
    {
      action: "Manage your Beancount ledgers",
      tabs: 2,
      selectedLedger: true,
      role: "heading",
      destination: "Dashboard destination",
      url: "/ledger",
    },
  ] as const)(
    "Enter activates $action while a picker option is highlighted",
    async ({ action, tabs, selectedLedger, role, destination, url }) => {
      const { router } = await setup("en");
      const originalUrl = router.state.location.href;
      const user = userEvent.setup();
      screen.getByRole("combobox", { name: "books — switch ledger" }).focus();
      await user.keyboard("{Enter}");

      const picker = within(
        await screen.findByRole("dialog", { name: "Select a ledger" }),
      );
      expect(picker.getByRole("combobox")).toHaveFocus();
      const owner = await picker.findByRole("option", {
        name: messages.en.owner,
      });
      await waitFor(() =>
        expect(owner).toHaveAttribute("aria-selected", "true"),
      );
      if (selectedLedger) {
        await user.keyboard("{ArrowDown}{ArrowDown}");
        expect(
          picker.getByRole("option", { name: /^business/ }),
        ).toHaveAttribute("aria-selected", "true");
      }

      for (let tab = 0; tab < tabs; tab++) await user.tab();
      expect(picker.getByRole("button", { name: action })).toHaveFocus();
      await user.keyboard("{Enter}");

      expect(
        await screen.findByRole(role, { name: destination }),
      ).toBeVisible();
      expect(router.state.location.href).toBe(url ?? originalUrl);
    },
  );

  it("uses the visible fullName fallback and updates its name in the mounted component when language changes", async () => {
    const { localization, requests } = await setup("en", "alice/");
    const trigger = screen.getByRole("combobox", {
      name: "alice/ — switch ledger",
    });
    expect(trigger).toHaveTextContent("alice/");
    await act(async () => {
      await localization.changeLanguage("de");
    });
    expect(
      screen.getByRole("combobox", { name: "alice/ — Hauptbuch wechseln" }),
    ).toBe(trigger);
    expect(requests).toEqual([]);
  });
});
