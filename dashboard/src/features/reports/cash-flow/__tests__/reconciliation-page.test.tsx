import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  retainSearchParams,
  RouterProvider,
} from "@tanstack/react-router";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useQuery } from "@apollo/client/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversionOption } from "@/common/types/chart";
import {
  LedgerSearchParamsProvider,
  useLedgerSearchParams,
} from "@/common/providers/ledger-search-params-provider";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params/schema";
import {
  setCookie,
  removeCookie,
} from "@/common/hooks/use-cookie-storage-state/cookie";
import { createLocalization } from "@/i18n/init";
import en from "@/i18n/locales/en";
import de from "@/i18n/locales/de";
import { LocalizationProvider } from "@/i18n/provider";
import { reportConversionCookieKey } from "../../components/use-report-conversion";
import {
  cashTransferPayload,
  convertedSalePayload,
} from "../lib/__tests__/fixtures/converted-sale";
import { viewSearchSchema } from "../search";
import LedgerCashFlowPage from "../index";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));
const cookies = vi.hoisted(() => new Map<string, string>());
// TanStack's isomorphic cookie adapter is compiled for the browser in Vite;
// use memory storage here while retaining the real report-conversion hook.
vi.mock("@/common/hooks/use-cookie-storage-state/cookie", () => ({
  getCookie: (key: string) => cookies.get(key),
  setCookie: (key: string, value: string) => cookies.set(key, value),
  removeCookie: (key: string) => cookies.delete(key),
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerOwner: "open_ledger",
    ledgerName: "stock-example",
    primaryCurrency: "USD",
    ledgerData: {
      options: { title: "Stock example", renderCommas: true },
      favaOptions: { fiscalYearEnd: { month: 12, day: 31 } },
    },
  }),
}));
// Keep the page, statement tables, export menu/print portal, and selectors real.
vi.mock("../cash-flow-charts", () => ({
  NetCashFlowChart: () => <div role="img" aria-label="Cash flow chart" />,
  ActivityBreakdownChart: () => <div role="img" aria-label="Activity chart" />,
}));

const cookieKey = reportConversionCookieKey("open_ledger/stock-example");
let pending = false;
let queryError: CombinedGraphQLErrors | undefined;
let noData = false;
const queryListeners = new Set<() => void>();
let queryRevision = 0;

beforeEach(() => {
  cookies.clear();
  removeCookie(cookieKey, { path: "/" });
  pending = false;
  queryError = undefined;
  noData = false;
  vi.mocked(useQuery).mockImplementation(
    function useFixtureQuery(_document, options) {
      useSyncExternalStore(
        (onChange) => {
          queryListeners.add(onChange);
          return () => queryListeners.delete(onChange);
        },
        () => queryRevision,
      );
      const variables = options?.variables as {
        conversion: ConversionOption;
        time: string;
      };
      const payload =
        variables.time === "2024-01-08"
          ? cashTransferPayload()
          : convertedSalePayload(variables.conversion);
      return {
        data: queryError
          ? undefined
          : noData
            ? {
                ...payload,
                incomeIntervals: [],
                expenseIntervals: [],
                assetIntervals: [],
                liabilityIntervals: [],
                equityIntervals: [],
                getLedgerBalanceSheet: {
                  assetsHierarchyData: {
                    ...payload.getLedgerBalanceSheet.assetsHierarchyData,
                    balance: {},
                    balanceChildren: {},
                    children: [],
                  },
                },
              }
            : payload,
        previousData: convertedSalePayload("at_cost"),
        loading: pending,
        error: queryError,
      } as never;
    },
  );
});

function FilterControl() {
  const { searchParams, setSearchParams } = useLedgerSearchParams();
  return (
    <button
      onClick={() => setSearchParams({ ...searchParams, time: "2024-01-08" })}
    >
      January cash transfer
    </button>
  );
}

async function mount(
  conversion: ConversionOption = "at_cost",
  time = "2026-05-12",
) {
  setCookie(cookieKey, conversion, { path: "/" });
  const localization = createLocalization();
  const rootRoute = createRootRoute({ component: Outlet });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    search: {
      middlewares: [retainSearchParams(["account", "filter", "time"])],
    },
    component: () => (
      <LedgerSearchParamsProvider>
        <FilterControl />
        <Outlet />
      </LedgerSearchParamsProvider>
    ),
  });
  const pageRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/cash-flow",
    validateSearch: (search) => viewSearchSchema.parse(search),
    component: LedgerCashFlowPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([ledgerRoute.addChildren([pageRoute])]),
    history: createMemoryHistory({
      initialEntries: [
        `/ledger/open_ledger/stock-example/cash-flow?time=${time}`,
      ],
    }),
  });
  await router.load();
  const view = render(
    <LocalizationProvider localization={localization}>
      <RouterProvider router={router} />
    </LocalizationProvider>,
  );
  return { ...view, localization, router };
}

function expectWithheld(locale: Record<string, string> = en) {
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.queryByRole("img", { name: /chart/i })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: locale["reports.export.action"] }),
  ).not.toBeInTheDocument();
  expect(screen.queryByTestId("printable-statement")).not.toBeInTheDocument();
}

async function expectValidSale() {
  const table = await screen.findByRole("table", {
    name: en["page.cashFlow.netChangeInCash"],
  });
  expect(within(table).getByRole("row", { name: /27,390\.3/ })).toBeVisible();
  expect(within(table).getByRole("row", { name: /905\.05/ })).toBeVisible();
  expect(within(table).getByRole("row", { name: /28,295\.35/ })).toBeVisible();
  expect(
    screen.getByRole("button", { name: en["reports.export.action"] }),
  ).toBeEnabled();
  expect(screen.getByTestId("printable-statement")).toBeInTheDocument();
}

async function selectConversion(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  act(() =>
    screen
      .getByRole("combobox", {
        name: en["component.conversionSelect.placeholder"],
      })
      .focus(),
  );
  await user.keyboard("{Enter}");
  act(() => screen.getByRole("option", { name: label }).focus());
  await user.keyboard("{Enter}");
}

describe("Cash Flow rejects unsupported reconciliation before rendering or export", () => {
  it.each(["at_value", "units"] as const)(
    "withholds the actual %s sale's misleading statement and keeps conversion available",
    async (conversion) => {
      await mount(conversion);
      expect(
        await screen.findByRole("heading", {
          name: en["page.cashFlow.reconciliationTitle"],
        }),
      ).toBeVisible();
      expect(screen.getByRole("alert")).toHaveTextContent(
        en["page.cashFlow.reconciliationDescription"].replace(
          "{atCost}",
          en["component.conversionSelect.atCost"],
        ),
      );
      expect(
        screen.getByRole("combobox", {
          name: en["component.conversionSelect.placeholder"],
        }),
      ).toBeEnabled();
      expect(
        screen.getByRole("combobox", {
          name: en["component.intervalSelect.placeholder"],
        }),
      ).toBeEnabled();
      expectWithheld();
    },
  );

  it("recovers the independently reconciled sale and export when the reader selects At Cost", async () => {
    const { router } = await mount("at_value");
    const user = userEvent.setup();
    await screen.findByRole("alert");
    await selectConversion(user, en["component.conversionSelect.atCost"]);
    await expectValidSale();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(router.state.location.search.time).toBe("2026-05-12");
    expect(vi.mocked(useQuery).mock.calls.at(-1)?.[1]?.variables).toMatchObject(
      { conversion: "at_cost", time: "2026-05-12" },
    );
  });

  it("keeps settled amounts and export withheld while the replacement conversion read is pending", async () => {
    await mount();
    await expectValidSale();
    const user = userEvent.setup();
    pending = true;
    await selectConversion(
      user,
      en["component.conversionSelect.atMarketValue"],
    );
    expect(await screen.findByRole("status")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expectWithheld();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    act(() => {
      pending = false;
      queryRevision += 1;
      queryListeners.forEach((listener) => listener());
    });
    await screen.findByRole("alert");
    expectWithheld();
  });

  it.each(["at_cost", "at_value", "units"] as const)(
    "renders the actual cash-only transfer and enables export under %s",
    async (conversion) => {
      await mount(conversion, "2024-01-08");
      const table = await screen.findByRole("table", {
        name: en["page.cashFlow.netChangeInCash"],
      });
      expect(
        within(table).getAllByRole("row", { name: /60,000/ }),
      ).toHaveLength(2);
      expect(
        screen.getByRole("button", { name: en["reports.export.action"] }),
      ).toBeEnabled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it("recovers under the same basis when the shared time filter changes to a reconciling period", async () => {
    const { router } = await mount("units");
    await screen.findByRole("alert");
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "January cash transfer" }),
    );
    await screen.findByRole("table", {
      name: en["page.cashFlow.netChangeInCash"],
    });
    expect(
      screen.getByRole("button", { name: en["reports.export.action"] }),
    ).toBeEnabled();
    expect(router.state.location.search.time).toBe("2024-01-08");
    expect(vi.mocked(useQuery).mock.calls.at(-1)?.[1]?.variables).toMatchObject(
      { conversion: "units", time: "2024-01-08" },
    );
  });

  it("localizes the unsupported state and the suggested conversion name during a live language change", async () => {
    const { localization } = await mount("units");
    await screen.findByRole("alert");
    await act(async () => {
      await localization.changeLanguage("de");
    });
    expect(
      screen.getByRole("heading", {
        name: de["page.cashFlow.reconciliationTitle"],
      }),
    ).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      de["page.cashFlow.reconciliationDescription"].replace(
        "{atCost}",
        de["component.conversionSelect.atCost"],
      ),
    );
    expect(
      screen.getByRole("combobox", {
        name: de["component.conversionSelect.placeholder"],
      }),
    ).toBeEnabled();
    expectWithheld(de);
  });

  it.each(["empty", "query error"] as const)(
    "retains the normal %s state and withholds export",
    async (state) => {
      noData = state === "empty";
      if (state === "query error")
        queryError = new CombinedGraphQLErrors({
          errors: [
            { message: "bad filter", extensions: { code: "BAD_USER_INPUT" } },
          ],
        });
      await mount();
      await screen.findByText(
        state === "empty"
          ? en["page.cashFlow.noData"]
          : en["common.errors.badUserInput"],
      );
      expectWithheld();
      expect(
        screen.queryByText(en["page.cashFlow.reconciliationTitle"]),
      ).not.toBeInTheDocument();
    },
  );
});
