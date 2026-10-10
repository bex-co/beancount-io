import { MockedProvider } from "@apollo/client/testing/react";
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
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import Cookies from "js-cookie";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { compile } from "tailwindcss";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params/schema";
import { LedgerSearchParamsProvider } from "@/common/providers/ledger-search-params-provider";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from "@/common/components/ui/sidebar";
import {
  SIDEBAR_STATE_COOKIE,
  SIDEBAR_WIDTH_COOKIE,
} from "@/common/components/ui/sidebar-state";
import {
  GetCurrentUserDocument,
  GetLedgerAttributesDocument,
  type GetCurrentUserQuery,
  type GetLedgerAttributesQuery,
} from "@/graphql/definitions";
import type { SupportedLanguage } from "@/i18n/config";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { LayoutHeader } from "../layout-header";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
const authentication = vi.hoisted(() => ({ signedIn: true }));
vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => authentication.signedIn,
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerData: { permissions: { admin: false, pull: true, push: false } },
  }),
}));
// Out-of-date metadata is unrelated to header sizing or filter interaction.
vi.mock("../ledger-out-of-date-indicator", () => ({
  LedgerOutOfDateIndicator: () => null,
}));
// Adapt the isomorphic cookie boundary to the real browser serializer. Keep
// the Sidebar provider, cookie-backed state and width contracts unchanged.
vi.mock("@/common/hooks/use-cookie-storage-state/cookie", () => ({
  getCookie: (key: string) => Cookies.get(key),
  setCookie: (key: string, value: string, options?: Cookies.CookieAttributes) =>
    Cookies.set(key, value, options),
  removeCookie: (key: string, options?: Cookies.CookieAttributes) =>
    Cookies.remove(key, options),
}));

let compiler: Awaited<ReturnType<typeof compile>>;
beforeAll(async () => {
  const require = createRequire(`${process.cwd()}/`);
  const path = resolve("src/style.css");
  compiler = await compile(readFileSync(path, "utf8"), {
    base: dirname(path),
    loadStylesheet: async (id, base) => {
      // tw-animate-css exposes a CSS-only `style` export, not a Node main.
      const imported =
        id === "tw-animate-css"
          ? resolve("node_modules/tw-animate-css/dist/tw-animate.css")
          : id.startsWith(".")
            ? resolve(base, id)
            : require.resolve(
                id === "tailwindcss" ? "tailwindcss/index.css" : id,
                {
                  paths: [base],
                },
              );
      return {
        path: imported,
        base: dirname(imported),
        content: readFileSync(imported, "utf8"),
      };
    },
  });
});

const initialWidth = window.innerWidth;
beforeEach(() => {
  authentication.signedIn = true;
  Cookies.remove(SIDEBAR_STATE_COOKIE, { path: "/" });
  Cookies.remove(SIDEBAR_WIDTH_COOKIE, { path: "/" });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1024,
  });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width") && window.innerWidth < 768,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  Cookies.remove(SIDEBAR_STATE_COOKIE, { path: "/" });
  Cookies.remove(SIDEBAR_WIDTH_COOKIE, { path: "/" });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: initialWidth,
  });
  vi.unstubAllGlobals();
});

const attributes: GetLedgerAttributesQuery = {
  getLedgerAttributes: {
    __typename: "LedgerAttributes",
    accounts: ["Assets:Cash"],
    years: ["2025", "2026"],
    tags: ["salary"],
    links: ["payroll"],
    payees: ["Acme"],
    currencies: ["USD"],
  },
};
const profile: GetCurrentUserQuery = {
  userProfile: {
    __typename: "UserProfileResponse",
    id: "reader",
    username: "reader",
    locale: "en",
    firstName: null,
    lastName: null,
    email: "reader@example.invalid",
    emailReportStatus: null,
    tier: "free",
    hasEverSubscribed: false,
    limits: {
      __typename: "UserLimits",
      ledgersUsed: 1,
      ledgersMax: 2,
      collaboratorsPerLedgerMax: 0,
      maxDirectives: 1000,
    },
  },
};

async function setup(language: SupportedLanguage, signedIn = true) {
  authentication.signedIn = signedIn;
  const localization = createLocalization();
  await localization.changeLanguage(language);
  function Shell() {
    return (
      <LedgerSearchParamsProvider>
        <SidebarProvider>
          <Sidebar collapsible="icon">
            <span>Ledger navigation</span>
          </Sidebar>
          <SidebarInset>
            <LayoutHeader ledgerId="open_ledger/crypto-example" />
            <Outlet />
          </SidebarInset>
        </SidebarProvider>
      </LedgerSearchParamsProvider>
    );
  }
  const root = createRootRoute({ component: Outlet });
  const ledger = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    component: Shell,
  });
  const statistics = createRoute({
    getParentRoute: () => ledger,
    path: "/statistics",
    component: () => <p>Statistics content</p>,
  });
  const router = createRouter({
    routeTree: root.addChildren([ledger.addChildren([statistics])]),
    history: createMemoryHistory({
      initialEntries: [
        "/ledger/open_ledger/crypto-example/statistics?time=2026&account=Assets%3ACash&filter=%23salary",
      ],
    }),
  });
  await router.load();
  const readAttributes = vi.fn(() => ({ data: attributes }));
  const view = render(
    <LocalizationProvider localization={localization}>
      <MockedProvider
        mocks={[
          {
            request: {
              query: GetLedgerAttributesDocument,
              variables: { ledgerId: "open_ledger/crypto-example" },
            },
            result: readAttributes,
            delay: 0,
            maxUsageCount: 10,
          },
          {
            request: { query: GetCurrentUserDocument },
            result: { data: profile },
            delay: 0,
            maxUsageCount: 10,
          },
        ]}
      >
        <RouterProvider router={router} />
      </MockedProvider>
    </LocalizationProvider>,
  );
  await screen.findByDisplayValue("2026");
  if (signedIn)
    await screen.findByRole("button", {
      name: localization.i18n.t("common.userMenu"),
    });
  return {
    ...view,
    localization,
    router,
    readAttributes,
    user: userEvent.setup(),
  };
}

// These are actual Tailwind output declarations, not a CSS-class presence
// check. jsdom does not lay out container queries: native browser coverage
// separately measures settled action rectangles and document overflow.
function rulesFor(container: HTMLElement) {
  const classes = [...container.querySelectorAll("[class]")].flatMap(
    (element) => [...element.classList],
  );
  const css = compiler.build([...new Set(classes)]);
  const rules = new Map<string, string>();
  const selector = /\.((?:[^\s{},\\]|\\.)+)\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = selector.exec(css)) !== null) {
    let depth = 1;
    let end = selector.lastIndex;
    for (; end < css.length && depth > 0; end++) {
      if (css[end] === "{") depth++;
      else if (css[end] === "}") depth--;
    }
    rules.set(
      match[1].replace(/\\/g, ""),
      css.slice(selector.lastIndex, end - 1),
    );
  }
  return (element: Element) =>
    [...element.classList].map((name) => rules.get(name) ?? "").join("\n");
}

describe("LayoutHeader available-width filters", () => {
  it("emits complementary header-container rules using the actual expanded and icon-rail sidebar widths", async () => {
    const { container, localization, router, user } = await setup("de");
    const header = container.querySelector("header")!;
    const time = screen.getByPlaceholderText(
      localization.i18n.t("component.searchControls.time"),
    );
    const inline = [...header.querySelectorAll("div")].find(
      (element) =>
        element.contains(time) && element.classList.contains("hidden"),
    )!;
    const trigger = screen.getByRole("button", {
      name: localization.i18n.t("component.searchControls.filters"),
    });
    const emitted = rulesFor(container);
    expect(emitted(header)).toMatch(/container-type:\s*inline-size/);
    expect(emitted(header)).toMatch(/container-name:\s*ledger-header/);
    const inlineCss = emitted(inline);
    const sheetCss = emitted(trigger);
    expect(inlineCss).toMatch(/display:\s*none/);
    expect(inlineCss).toMatch(
      /@container ledger-header \(width >= 52rem\)\s*\{\s*display:\s*block/,
    );
    expect(sheetCss).toMatch(
      /@container ledger-header \(width >= 52rem\)\s*\{\s*display:\s*none/,
    );
    expect(inlineCss + sheetCss).not.toMatch(/@media\s*\(width\s*>=\s*64rem\)/);

    const wrapper = container.querySelector<HTMLElement>(
      '[data-slot="sidebar-wrapper"]',
    )!;
    const sidebar = container.querySelector('[data-slot="sidebar"]')!;
    const gap = container.querySelector('[data-slot="sidebar-gap"]')!;
    const expandedWidth = parseFloat(
      wrapper.style.getPropertyValue("--sidebar-width"),
    );
    const iconWidth = parseFloat(
      wrapper.style.getPropertyValue("--sidebar-width-icon"),
    );
    expect(expandedWidth).toBe(256);
    expect(iconWidth).toBe(48);
    expect(emitted(gap)).toMatch(/width:\s*var\(--sidebar-width\)/);
    expect(emitted(gap)).toMatch(
      /data-collapsible="icon"[\s\S]*width:\s*var\(--sidebar-width-icon\)/,
    );
    // Evaluate the emitted threshold against this real Sidebar's widths.
    // This establishes which mode its CSS selects, not whether glyphs fit.
    const threshold = Number(inlineCss.match(/width >= ([\d.]+)rem/)![1]) * 16;
    expect(
      [
        1024 - expandedWidth,
        1024 - iconWidth,
        1100 - expandedWidth,
        1440 - expandedWidth,
      ].map((availableWidth) => availableWidth >= threshold),
    ).toEqual([false, true, true, true]);
    expect(sidebar).toHaveAttribute("data-state", "expanded");
    await user.keyboard("{Control>}b{/Control}");
    expect(sidebar).toHaveAttribute("data-state", "collapsed");
    await user.keyboard("{Control>}b{/Control}");
    expect(sidebar).toHaveAttribute("data-state", "expanded");
    expect(router.state.location.search).toEqual({
      time: 2026,
      account: "Assets:Cash",
      filter: "#salary",
    });
  });

  it.each(["en", "de"] as const)(
    "keeps real %s Sheet fields, URL edits, Clear all and keyboard return focus",
    async (language) => {
      const { localization, router, readAttributes, user } =
        await setup(language);
      const t = localization.i18n.t.bind(localization.i18n);
      const trigger = screen.getByRole("button", {
        name: t("component.searchControls.filters"),
      });
      expect(trigger).toHaveTextContent("3");
      act(() => trigger.focus());
      await user.keyboard("{Enter}");
      const dialog = await screen.findByRole("dialog", {
        name: t("component.searchControls.filtersTitle"),
      });
      expect(dialog).toHaveAccessibleDescription(
        t("component.searchControls.filtersDescription"),
      );
      expect(within(dialog).getAllByRole("combobox")).toHaveLength(3);
      const time = within(dialog).getByPlaceholderText(
        t("component.searchControls.time"),
      );
      expect(time).toHaveValue("2026");
      expect(
        within(dialog).getByPlaceholderText(
          t("component.searchControls.account"),
        ),
      ).toHaveValue("Assets:Cash");
      expect(
        within(dialog).getByPlaceholderText(
          t("component.searchControls.filterByTagPayee"),
        ),
      ).toHaveValue("#salary");
      await user.click(time);
      await user.clear(time);
      await user.type(time, "2025");
      await user.keyboard("{Enter}");
      await waitFor(() =>
        expect(router.state.location.search).toEqual({
          time: 2025,
          account: "Assets:Cash",
          filter: "#salary",
        }),
      );
      await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(trigger).toHaveFocus();
      expect(
        screen.getByPlaceholderText(t("component.searchControls.time")),
      ).toHaveValue("2025");
      expect(
        screen.getByRole("button", { name: t("common.helpAndSupport") }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: t("common.userMenu") }),
      ).toBeInTheDocument();
      await user.keyboard("{Enter}");
      const reopened = await screen.findByRole("dialog", {
        name: t("component.searchControls.filtersTitle"),
      });
      await user.click(
        within(reopened).getByRole("button", {
          name: t("component.searchControls.clearAll"),
        }),
      );
      await waitFor(() => expect(router.state.location.search).toEqual({}));
      within(reopened)
        .getAllByRole("combobox")
        .forEach((field) => expect(field).toHaveValue(""));
      await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(trigger).toHaveFocus();
      expect(trigger).not.toHaveTextContent("3");
      expect(readAttributes).toHaveBeenCalledTimes(1);
    },
  );

  it("retains anonymous narrow icon actions and their translated accessible names", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
    });
    const { container, localization } = await setup("de", false);
    const header = container.querySelector("header")!;
    const emitted = rulesFor(container);
    for (const action of [
      screen.getByRole("button", {
        name: localization.i18n.t("component.searchControls.filters"),
      }),
      screen.getByRole("link", { name: localization.i18n.t("auth.login") }),
    ]) {
      const label = [...action.querySelectorAll("span")].find((span) =>
        span.classList.contains("xs:inline"),
      )!;
      expect(emitted(label)).toMatch(/display:\s*none/);
      expect(emitted(label)).toMatch(
        /@media \(width >= 22rem\)\s*\{\s*display:\s*inline/,
      );
      expect(action.querySelector("svg")).toBeInTheDocument();
    }
    expect(
      within(header).getByRole("button", {
        name: localization.i18n.t("common.toggleSidebar"),
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: localization.i18n.t("common.userMenu"),
      }),
    ).not.toBeInTheDocument();
  });
});
