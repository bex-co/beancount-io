import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { MANAGED_DEPLOYMENT } from "@/common/lib/deployment-info";
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
import type { FormattedExecutionResult } from "graphql";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReactNativeContext } from "@/common/providers/react-native-bridge-provider/react-native-bridge-context";
import { ThemeProviderContext } from "@/common/providers/theme-provider/context";
import {
  ApiKeysDocument,
  GetCurrentUserDocument,
  ListPublicKeysDocument,
  type GetCurrentUserQuery,
} from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import GeneralSettingsPage from "../general";
import KeysSettingsPage from "../ssh-keys";
import DangerZoneSettingsPage from "../danger-zone";
import ApiKeysSettingsPage from "../api-keys";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.unmock("@/i18n");

// Plan data is unrelated to the page outline. Keep the real SubscriptionSection
// and all of its headings while supplying a settled, non-billable plan.
vi.mock("@/common/hooks/use-user-limits", () => ({
  useUserLimits: () => ({
    tier: "ENTERPRISE",
    limits: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/common/hooks/use-ai-cfo-usage", () => ({
  useAiCfoUsage: () => ({
    aiCfoTokensUsed: 0,
    aiCfoTokensMax: 0,
    isLoading: false,
  }),
}));
vi.mock("@/common/hooks/use-all-tier-quotas", () => ({
  useAllTierQuotas: () => ({ quotas: [], isLoading: false }),
}));
vi.mock("@/features/user-settings/hooks/use-subscription-status", () => ({
  useSubscriptionStatus: () => ({
    loading: false,
    error: undefined,
    refetch: vi.fn(),
    hasActiveStripeSubscription: false,
    renewalDate: null,
    subscriptions: [],
  }),
}));

const pages = {
  general: GeneralSettingsPage,
  "ssh-keys": KeysSettingsPage,
  "danger-zone": DangerZoneSettingsPage,
  "api-keys": ApiKeysSettingsPage,
};
const documents = {
  general: GetCurrentUserDocument,
  "ssh-keys": ListPublicKeysDocument,
  "danger-zone": GetCurrentUserDocument,
  "api-keys": ApiKeysDocument,
};
type Page = keyof typeof pages;
type Request = {
  name: string;
  resolve: (result: FormattedExecutionResult) => void;
  reject: (error: Error) => void;
};
const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

async function setup(page: Page, language: "en" | "de" = "en") {
  const requests: Request[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          // Cancel/resume hooks also read plan status; settle that unrelated
          // read while the page's own request remains under test control.
          if (operation.operationName === "GetSubscriptionStatus") {
            observer.next({
              data: {
                subscriptionStatus: {
                  __typename: "CustomerSubscriptionStatus",
                  hasActiveSubscription: false,
                  subscriptions: [],
                },
              },
            });
            observer.complete();
            return;
          }
          if (operation.operationName === "DeploymentInfo") {
            observer.next({ data: { deploymentInfo: MANAGED_DEPLOYMENT } });
            observer.complete();
            return;
          }
          requests.push({
            name: operation.operationName,
            resolve(result) {
              observer.next(result);
              observer.complete();
            },
            reject(error) {
              observer.error(error);
            },
          });
        }),
    ),
  });
  clients.push(client);
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const root = createRootRoute({ component: Outlet });
  const route = createRoute({
    getParentRoute: () => root,
    path: `/settings/${page}`,
    component: pages[page],
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: [`/settings/${page}`] }),
  });
  await router.load();
  render(
    <LocalizationProvider localization={localization}>
      <ApolloProvider client={client}>
        <ReactNativeContext.Provider value={{ isReactNative: false }}>
          <ThemeProviderContext.Provider
            value={{
              theme: "light",
              resolvedTheme: "light",
              setTheme: vi.fn(),
            }}
          >
            <RouterProvider router={router} />
          </ThemeProviderContext.Provider>
        </ReactNativeContext.Provider>
      </ApolloProvider>
    </LocalizationProvider>,
  );
  await waitFor(() => expect(requests).toHaveLength(1));
  return {
    requests,
    localization,
    refetch: () =>
      client
        .refetchQueries({ include: [documents[page]] })
        .catch(() => undefined),
  };
}

const currentUser: GetCurrentUserQuery = {
  userProfile: {
    __typename: "UserProfileResponse",
    id: "user-alice",
    username: "alice",
    email: "alice@example.invalid",
    firstName: "Alice",
    lastName: "Example",
    locale: "en",
    emailReportStatus: null,
    tier: "ENTERPRISE",
    hasEverSubscribed: false,
    limits: {
      __typename: "UserLimits",
      ledgersUsed: 1,
      ledgersMax: 20,
      collaboratorsPerLedgerMax: 10,
      maxDirectives: -1,
    },
  },
};

function expectPageHeading(name: string) {
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(
    screen.getByRole("heading", { level: 1, name, exact: true }),
  ).toBeVisible();
}

describe("Settings page heading outline", () => {
  it.each(["en", "de"] as const)(
    "%s names Danger Zone and Delete Account without performing a destructive operation",
    async (language) => {
      const { requests, localization } = await setup("danger-zone", language);
      const title = language === "en" ? "Danger Zone" : "Gefahrenzone";
      const section = language === "en" ? "Delete Account" : "Konto löschen";
      expectPageHeading(title);
      expect(
        screen.getByRole("heading", { level: 2, name: section, exact: true }),
      ).toBeVisible();
      await act(async () => requests[0].resolve({ data: currentUser }));
      const user = userEvent.setup();
      const trigger = screen.getByRole("button", {
        name: section,
        exact: true,
      });
      await user.tab();
      expect(trigger).toHaveFocus();
      await user.keyboard("{Enter}");
      const dialog = await screen.findByRole("dialog");
      expect(dialog).toBeVisible();
      expect(
        screen.getByRole("button", {
          name: localization.i18n.t("userSettings.yesDeleteMyAccount"),
          exact: true,
        }),
      ).toBeDisabled();
      await user.click(
        screen.getByRole("button", {
          name: localization.i18n.t("common.cancel"),
          exact: true,
        }),
      );
      await waitFor(() => expect(trigger).toHaveFocus());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expectPageHeading(title);
      expect(requests.map(({ name }) => name)).toEqual(["GetCurrentUser"]);
    },
  );

  it.each(["en", "de"] as const)(
    "%s keeps one SSH page heading through loading, empty, populated and failed reads",
    async (language) => {
      const { requests, localization, refetch } = await setup(
        "ssh-keys",
        language,
      );
      const title = language === "en" ? "SSH Keys" : "SSH-Schlüssel";
      expectPageHeading(title);
      await act(async () =>
        requests[0].resolve({ data: { listPublicKeys: [] } }),
      );
      expectPageHeading(title);
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: localization.i18n.t("userSettings.noSshKeys"),
          exact: true,
        }),
      ).toBeVisible();
      let settled: ReturnType<typeof refetch>;
      await act(async () => {
        settled = refetch();
      });
      await waitFor(() => expect(requests).toHaveLength(2));
      expectPageHeading(title);
      await act(async () => {
        requests[1].resolve({
          data: {
            listPublicKeys: [
              {
                __typename: "PublicKey",
                id: 1,
                title: "Work laptop",
                key: "ssh-ed25519 synthetic-public-key",
                fingerprint: "SHA256:synthetic",
                createdAt: "2026-01-01T00:00:00Z",
                lastUsedAt: null,
              },
            ],
          },
        });
        await settled;
      });
      expectPageHeading(title);
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: "Work laptop",
          exact: true,
        }),
      ).toBeVisible();
      await act(async () => {
        settled = refetch();
      });
      await waitFor(() => expect(requests).toHaveLength(3));
      expectPageHeading(title);
      await act(async () => {
        requests[2].reject(new TypeError("Failed to fetch"));
        await settled;
      });
      expectPageHeading(title);
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: localization.i18n.t("userSettings.failedToLoadKeys"),
          exact: true,
        }),
      ).toBeVisible();
      expect(requests.map(({ name }) => name)).toEqual([
        "ListPublicKeys",
        "ListPublicKeys",
        "ListPublicKeys",
      ]);
    },
  );

  it.each(["en", "de"] as const)(
    "%s exposes General and its actual section hierarchy through loading, content and failure",
    async (language) => {
      const { requests, localization, refetch } = await setup(
        "general",
        language,
      );
      const title = language === "en" ? "General" : "Allgemein";
      const expectSections = () => {
        for (const key of [
          "userSettings.userProfile",
          "userSettings.appearance",
          "userSettings.subscription",
          "userSettings.session",
        ]) {
          expect(
            screen.getByRole("heading", {
              level: 2,
              name: localization.i18n.t(key),
              exact: true,
            }),
          ).toBeVisible();
        }
      };
      expectPageHeading(title);
      expectSections();
      await act(async () => requests[0].resolve({ data: currentUser }));
      expectPageHeading(title);
      expectSections();
      expect(screen.getByText("alice@example.invalid")).toBeVisible();
      let settled: ReturnType<typeof refetch>;
      await act(async () => {
        settled = refetch();
      });
      await waitFor(() => expect(requests).toHaveLength(2));
      expectPageHeading(title);
      expectSections();
      await act(async () => {
        requests[1].reject(new TypeError("Failed to fetch"));
        await settled;
      });
      expectPageHeading(title);
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: localization.i18n.t("common.settings"),
          exact: true,
        }),
      ).toBeVisible();
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: localization.i18n.t("userSettings.failedToLoadSettings"),
          exact: true,
        }),
      ).toBeVisible();
      expect(requests.map(({ name }) => name)).toEqual([
        "GetCurrentUser",
        "GetCurrentUser",
      ]);
    },
  );

  it("retains the existing single API-key page heading as a control", async () => {
    const { requests } = await setup("api-keys");
    expectPageHeading("Personal access tokens");
    await act(async () => requests[0].resolve({ data: { apiKeys: [] } }));
    expectPageHeading("Personal access tokens");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "No personal access tokens",
        exact: true,
      }),
    ).toBeVisible();
  });
});
