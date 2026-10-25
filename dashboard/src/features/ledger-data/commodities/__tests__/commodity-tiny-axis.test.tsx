import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { cleanup, render, screen } from "@testing-library/react";
import type { ECharts } from "echarts/core";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/common/providers/theme-provider";
import CommoditiesPage from "../index";

/**
 * A nano-priced commodity's y-axis read 0.000000 on every tick, and the
 * `2.5e-10` tooltip read 2.5e-1 (w4/1003). The real page, chart option and
 * ECharts tick generation run; jsdom cannot paint, so the chart renders SVG.
 */
const charts = vi.hoisted(() => [] as ECharts[]);
vi.mock("@/common/components/react-echarts/runtime", async () => {
  const runtime = await vi.importActual<
    typeof import("@/common/components/react-echarts/runtime")
  >("@/common/components/react-echarts/runtime");
  const { use, setPlatformAPI } = await import("echarts/core");
  const { SVGRenderer } = await import("echarts/renderers");
  use(SVGRenderer);
  setPlatformAPI({ measureText: (text) => ({ width: text.length * 7 }) });
  return {
    ...runtime,
    init: (element: HTMLElement, theme?: string) => {
      const chart = runtime.init(element, theme, {
        renderer: "svg",
        ssr: true,
        width: 600,
        height: 300,
      });
      charts.push(chart);
      return chart;
    },
  };
});
vi.mock("@/common/components/react-echarts", async () => {
  const { ReactEChartsClient } =
    await import("@/common/components/react-echarts/client");
  return { ReactECharts: ReactEChartsClient };
});
vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "demo", ledgerName: "books" }),
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "Demo Books" }),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: false }),
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

function renderPage(values: string[]) {
  const prices = values.map((value, index) => ({
    __typename: "PricePoint",
    date: `2016-0${index + 1}-01`,
    value,
  }));
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          observer.next({
            data:
              operation.operationName === "GetLedgerCommodities"
                ? {
                    getLedgerCommodities: [
                      {
                        __typename: "CommodityPairWithPrices",
                        base: "QAMICRO",
                        quote: "USD",
                        prices,
                      },
                    ],
                  }
                : { getLedgerManagedPrices: [] },
          });
          observer.complete();
        }),
    ),
  });
  render(
    <ThemeProvider defaultTheme="light">
      <ApolloProvider client={client}>
        <CommoditiesPage />
      </ApolloProvider>
    </ThemeProvider>,
  );
}

/** The y-axis labels ECharts actually laid out, bottom to top. */
function yAxisLabels(chart: ECharts): string[] {
  const svg = chart.renderToSVGString();
  const labels = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(
    ([, text]) => text,
  );
  // The x-axis labels are months (2016-01); the rest are y ticks.
  return labels.filter((text) => !/^\d{4}-\d{2}$/.test(text));
}

function tooltip(chart: ECharts, date: string): string {
  const option = chart.getOption() as {
    tooltip: Array<{ formatter: (params: unknown) => string }>;
  };
  return option.tooltip[0].formatter([{ name: date }]);
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  charts.length = 0;
  vi.unstubAllGlobals();
});

async function chart(): Promise<ECharts> {
  await screen.findByText("QAMICRO/USD");
  await vi.waitFor(() => {
    if (!charts.some((each) => !each.isDisposed())) throw new Error("none");
  });
  return charts.findLast((each) => !each.isDisposed())!;
}

describe("Commodity chart with tiny prices", () => {
  it("labels a nano-price axis with distinct nonzero ticks", async () => {
    renderPage(["0.000000001", "0.000000002", "0.000000003"]);
    const labels = yAxisLabels(await chart());

    // Before: seven labels, every one "0.000000".
    expect(labels).toEqual(expect.arrayContaining(["1e-9", "2e-9", "3e-9"]));
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).not.toContain("0.000000");
    for (const label of labels) {
      expect(Number(label)).toBeGreaterThan(0);
      expect(Number(label)).toBeLessThan(1e-8);
    }
  });

  it("keeps 1e-24 ticks inside the plotted range (w4/1067)", async () => {
    renderPage([
      "0.000000000000000000000001",
      "0.000000000000000000000002",
      "0.000000000000000000000003",
    ]);
    const instance = await chart();
    const labels = yAxisLabels(instance);

    expect(labels.length).toBeGreaterThan(3);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).not.toContain("0");
    for (const label of labels) {
      expect(Number(label)).toBeGreaterThan(0);
      expect(Number(label)).toBeLessThan(4e-24);
    }
    expect(tooltip(instance, "2016-01-01")).toContain(
      "QAMICRO/USD: 0.000000000000000000000001",
    );
  });

  it("keeps exponent quotes' values in the tooltip", async () => {
    renderPage(["1.25e-10", "2.5e-10", "5e-10"]);
    const instance = await chart();

    expect(tooltip(instance, "2016-01-01")).toContain("QAMICRO/USD: 1.25e-10");
    expect(tooltip(instance, "2016-02-01")).toContain("QAMICRO/USD: 2.5e-10");
    expect(tooltip(instance, "2016-03-01")).toContain("QAMICRO/USD: 5e-10");
    expect(new Set(yAxisLabels(instance)).size).toBeGreaterThan(3);
  });

  it("keeps ordinary quotes on the fixed-point axis", async () => {
    renderPage(["0.0225", "0.0227", "0.0230"]);
    const instance = await chart();

    const labels = yAxisLabels(instance);
    expect(labels.length).toBeGreaterThan(3);
    for (const label of labels) expect(label).toMatch(/^0\.0\d{4}$/);
    expect(tooltip(instance, "2016-03-01")).toContain("QAMICRO/USD: 0.023");
  });
});
