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
  retainSearchParams,
  RouterProvider,
} from "@tanstack/react-router";
import type { EChartsOption } from "echarts";
import { describe, expect, it, vi } from "vitest";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params/schema";
import { createLocalization } from "@/i18n/init";
import en from "@/i18n/locales/en";
import { LocalizationProvider } from "@/i18n/provider";
import type { DataSeries } from "../../lib/overview-utils";
import { overviewSearchSchema } from "../../search";
import { NetWorthCard } from "../net-worth-card";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

// The card, hydration hook, URL view hook, router and localized amounts are
// real. Canvas rendering and fetching this synthetic inventory are outside
// the readiness boundary.
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: EChartsOption }) => (
    <div
      data-testid="net-worth-chart"
      data-series={JSON.stringify(option.series)}
    />
  ),
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
}));

const data: DataSeries = Array.from({ length: 12 }, (_, index) => ({
  date: `2025-${String(index + 1).padStart(2, "0")}-28`,
  balance: { USD: 1000.25 + index * 100, BTC: (index + 1) / 4 },
}));
const periods = [
  "Dec 2025",
  "Nov 2025",
  "Oct 2025",
  "Sep 2025",
  "Aug 2025",
  "Jul 2025",
  "Jun 2025",
  "May 2025",
  "Apr 2025",
  "Mar 2025",
  "Feb 2025",
  "Jan 2025",
];
const scope = {
  account: "Assets:Brokerage",
  filter: "currency:USD",
  time: 2025,
};

function makeRouter(url: string, isServer: boolean) {
  const root = createRootRoute({ component: Outlet });
  const ledger = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    search: {
      middlewares: [retainSearchParams(["account", "filter", "time"])],
    },
    component: Outlet,
  });
  const overview = createRoute({
    getParentRoute: () => ledger,
    path: "/",
    validateSearch: (search) => overviewSearchSchema.parse(search),
    component: () => (
      <NetWorthCard
        data={data}
        valuation={null}
        primaryCurrency="USD"
        ledgerOwner="open_ledger"
        ledgerName="synthetic"
      />
    ),
  });
  const router = createRouter({
    routeTree: root.addChildren([ledger.addChildren([overview])]),
    history: createMemoryHistory({ initialEntries: [url] }),
    isServer,
  });
  router.ssr = { manifest: undefined };
  return router;
}

function expectTable(container: HTMLElement) {
  const queries = within(container);
  expect(queries.queryByTestId("net-worth-chart")).not.toBeInTheDocument();
  expect(
    queries.getAllByText(/^[A-Z][a-z]{2} 2025$/).map((row) => row.textContent),
  ).toEqual(periods);
  const latest = queries.getByText("Dec 2025").parentElement!;
  const earliest = queries.getByText("Jan 2025").parentElement!;
  expect(within(latest).getByText("2,100.25 USD")).toBeVisible();
  expect(within(latest).getByText("3 BTC")).toBeVisible();
  expect(within(earliest).getByText("1,000.25 USD")).toBeVisible();
  expect(within(earliest).getByText("0.25 BTC")).toBeVisible();
}

describe("Net Worth view hydration", () => {
  it.each([undefined, "chart", "table"] as const)(
    "keeps the SSR %s bookmark readable with disabled controls, then enables real view navigation",
    async (bookmark) => {
      const url =
        "/ledger/open_ledger/synthetic?account=Assets%3ABrokerage&filter=currency%3AUSD&time=2025" +
        (bookmark ? `&view=${bookmark}` : "");
      const server = makeRouter(url, true);
      await server.load();
      expect(server.state.matches.map((match) => match.status)).toEqual([
        "success",
        "success",
        "success",
      ]);
      const localization = createLocalization();
      const view = (router: ReturnType<typeof makeRouter>) => (
        <LocalizationProvider localization={localization}>
          <RouterProvider router={router} />
        </LocalizationProvider>
      );
      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: ReturnType<typeof hydrateRoot> | undefined;
      try {
        container.innerHTML = renderToString(view(server));
        const queries = within(container);
        const chart = queries.getByRole("button", {
          name: en["page.overview.chartView"],
        });
        const table = queries.getByRole("button", {
          name: en["page.overview.tableView"],
        });
        const card = container.querySelector('[data-slot="card"]');
        const initialView = bookmark === "table" ? "table" : "chart";
        const expectView = (selected: "chart" | "table") => {
          expect(chart).toHaveAttribute(
            "aria-pressed",
            String(selected === "chart"),
          );
          expect(table).toHaveAttribute(
            "aria-pressed",
            String(selected === "table"),
          );
          if (selected === "table") {
            expectTable(container);
          } else {
            expect(queries.getByTestId("net-worth-chart")).toBeVisible();
            expect(queries.queryByText("Dec 2025")).not.toBeInTheDocument();
          }
        };

        expect(chart).toBeDisabled();
        expect(table).toBeDisabled();
        expectView(initialView);
        expect(queries.getByText(en["common.netWorth"])).toBeVisible();
        expect(queries.getAllByText("2,100.25 USD").length).toBeGreaterThan(0);

        const client = makeRouter(url, false);
        await client.load();
        const recoverable = vi.fn();
        await act(async () => {
          root = hydrateRoot(container, view(client), {
            onRecoverableError: recoverable,
          });
        });
        await waitFor(() => {
          expect(chart).toBeEnabled();
          expect(table).toBeEnabled();
        });
        expect(container.querySelector('[data-slot="card"]')).toBe(card);
        expect(
          queries.getByRole("button", { name: en["page.overview.chartView"] }),
        ).toBe(chart);
        expect(
          queries.getByRole("button", { name: en["page.overview.tableView"] }),
        ).toBe(table);
        expectView(initialView);
        expect(client.state.location.search).toEqual({
          ...scope,
          ...(bookmark ? { view: bookmark } : {}),
        });
        expect(recoverable).not.toHaveBeenCalled();

        const user = userEvent.setup();
        const first = initialView === "chart" ? "table" : "chart";
        (first === "table" ? table : chart).focus();
        await user.keyboard("{Enter}");
        await waitFor(() => expectView(first));
        expect(client.state.location.search).toEqual({
          ...scope,
          ...(first === "table" ? { view: "table" } : {}),
        });

        (first === "table" ? chart : table).focus();
        await user.keyboard(" ");
        await waitFor(() => expectView(initialView));
        expect(client.state.location.search).toEqual({
          ...scope,
          ...(initialView === "table" ? { view: "table" } : {}),
        });

        await user.click(first === "table" ? table : chart);
        await waitFor(() => expectView(first));
        expect(client.state.location.search).toEqual({
          ...scope,
          ...(first === "table" ? { view: "table" } : {}),
        });
        expect(client.history.length).toBe(1);
        expect(recoverable).not.toHaveBeenCalled();
      } finally {
        await act(async () => root?.unmount());
        container.remove();
      }
    },
  );
});
