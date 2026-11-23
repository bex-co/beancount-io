import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Outlet,
  RouterProvider,
  Link,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { SettingsLayout } from "../layout";

const mockReactNative = vi.hoisted(() => ({ isReactNative: false }));
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.unmock("@/i18n");

vi.mock("@/common/components/billing/failed-renewal-banner", () => ({
  FailedRenewalBanner: () => null,
}));
vi.mock("@/common/components/billing/billing-status-banner", () => ({
  BillingStatusBanner: () => null,
}));
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({ useReactNativeContext: () => mockReactNative }),
);

const journalUrl = "/ledger/alice/books/journal?time=2016";
const settingsPages = [
  ["general", "General"],
  ["billing", "Billing"],
  ["ssh-keys", "SSH Keys"],
  ["api-keys", "Personal access tokens"],
  ["danger-zone", "Danger Zone"],
];

afterEach(() => {
  mockReactNative.isReactNative = false;
});

async function setup(entry = "/settings/general") {
  const root = createRootRoute({ component: Outlet });
  const settings = createRoute({
    getParentRoute: () => root,
    path: "/settings",
    component: SettingsLayout,
  });
  const pages = settingsPages.map(([path, label]) =>
    createRoute({
      getParentRoute: () => settings,
      path,
      component: () => <h1>{label} settings</h1>,
    }),
  );
  const dashboard = createRoute({
    getParentRoute: () => root,
    path: "/ledger",
    component: () => <h1>Dashboard</h1>,
  });
  const journal = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/journal",
    component: () => (
      <>
        <h1>Ledger Journal</h1>
        <Link to="/settings/general">Settings</Link>
      </>
    ),
  });
  const router = createRouter({
    routeTree: root.addChildren([
      settings.addChildren(pages),
      dashboard,
      journal,
    ]),
    history: createMemoryHistory({ initialEntries: [entry] }),
    isServer: false,
  });
  await router.load();
  const localization = createLocalization();
  await localization.changeLanguage("en");
  const view = render(
    <LocalizationProvider localization={localization}>
      <RouterProvider router={router} />
    </LocalizationProvider>,
  );
  return { ...view, router, user: userEvent.setup() };
}

describe("SettingsLayout", () => {
  it("renders the layout, outlet and all settings tabs", async () => {
    const { container } = await setup();

    expect(container.querySelector("header")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "General settings" }),
    ).toBeVisible();
    for (const [path, label] of settingsPages) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        `/settings/${path}`,
      );
    }
    expect(screen.getByRole("link", { name: "General" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "SSH Keys" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("hides Billing in the native app's web view", async () => {
    mockReactNative.isReactNative = true;
    await setup();
    expect(
      screen.queryByRole("link", { name: "Billing" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "General" })).toBeInTheDocument();
  });

  it.each(["/settings/api-keys", "/settings/billing?checkout=success"])(
    "opens the dashboard when %s was the first app page",
    async (entry) => {
      const { router, user } = await setup(entry);
      expect(router.history.canGoBack()).toBe(false);
      await user.click(screen.getByRole("link", { name: "SSH Keys" }));
      await screen.findByRole("heading", { name: "SSH Keys settings" });
      expect(router.history.canGoBack()).toBe(false);

      const back = screen.getByRole("link", { name: "Back" });
      expect(back).toHaveAttribute("href", "/ledger");
      await user.click(back);
      expect(
        await screen.findByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
      expect(router.state.location.href).toBe("/ledger");
    },
  );

  it("returns to the exact previous ledger URL after replacing tabs", async () => {
    const { router, user } = await setup(journalUrl);
    await user.click(screen.getByRole("link", { name: "Settings" }));
    await screen.findByRole("heading", { name: "General settings" });
    await user.click(screen.getByRole("link", { name: "SSH Keys" }));
    await screen.findByRole("heading", { name: "SSH Keys settings" });
    expect(router.history.canGoBack()).toBe(true);

    const back = screen.getByRole("link", { name: "Back" });
    expect(back).toHaveAttribute("href", "/ledger");
    back.focus();
    await user.keyboard("{Enter}");
    expect(
      await screen.findByRole("heading", { name: "Ledger Journal" }),
    ).toBeVisible();
    expect(router.state.location.href).toBe(journalUrl);
  });
});
