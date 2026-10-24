import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EChartsOption, LineSeriesOption } from "echarts";
import { NetWorthCard } from "../net-worth-card";
import type { DataSeries } from "../../lib/overview-utils";
import type { NetWorthValuation } from "../../lib/net-worth-valuation";

// ECharts renders to canvas, which jsdom cannot assert on: capture the option
// object instead.
const capturedOptions: EChartsOption[] = [];

const routerSearch = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
  listeners: new Set<() => void>(),
}));

// Chart-or-table lives in the URL, so the router mock holds it the way the URL
// does: the card no longer owns this as component state.
vi.mock("@tanstack/react-router", async () => {
  const { useSyncExternalStore } = await import("react");
  const { useHydrated } = await vi.importActual<
    typeof import("@tanstack/react-router")
  >("@tanstack/react-router");
  return {
    useHydrated,
    Link: ({
      to,
      params,
      children,
      ...props
    }: {
      to: string;
      params: Record<string, string>;
      children: React.ReactNode;
    }) => (
      <a
        href={Object.entries(params).reduce(
          (href, [key, value]) => href.replace(`$${key}`, value),
          to,
        )}
        {...props}
      >
        {children}
      </a>
    ),
    // The selected view lives in the URL now, so the router mock has to hold
    // it the way the URL does — and notify readers, so a selection re-renders
    // the page exactly as a real navigation would.
    useSearch: () =>
      useSyncExternalStore(
        (onChange: () => void) => {
          routerSearch.listeners.add(onChange);
          return () => routerSearch.listeners.delete(onChange);
        },
        () => routerSearch.current,
      ),
    useNavigate: () => (options: { search?: (previous: object) => object }) => {
      routerSearch.current = {
        ...routerSearch.current,
        ...(options.search?.(routerSearch.current) ?? {}),
      };
      routerSearch.listeners.forEach((listener) => listener());
    },
  };
});

vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: EChartsOption }) => {
    capturedOptions.push(option);
    return <div data-testid="echarts-mock" />;
  },
}));

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

let language = "en";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    // Parameters are appended so assertions can see what was interpolated.
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
    i18n: { language },
  }),
}));

function lastOption(): EChartsOption {
  const option = capturedOptions.at(-1);
  if (!option) throw new Error("chart was never rendered");
  return option;
}

function lineSeries(option: EChartsOption): LineSeriesOption[] {
  return (
    Array.isArray(option.series) ? option.series : [option.series]
  ) as LineSeriesOption[];
}

function axisLabelFormatter(option: EChartsOption): (value: string) => string {
  const xAxis = option.xAxis as {
    axisLabel: { formatter: (value: string) => string };
  };
  return xAxis.axisLabel.formatter;
}

beforeEach(() => {
  routerSearch.current = {};
  routerSearch.listeners.clear();
  capturedOptions.length = 0;
  language = "en";
});

const multiMonth: DataSeries = [
  { date: "2026-01-31", balance: { USD: 100 } },
  { date: "2026-02-28", balance: { USD: 150 } },
  { date: "2026-03-31", balance: { USD: 120 } },
];

const singleMonth: DataSeries = [{ date: "2026-01-31", balance: { USD: 100 } }];

/**
 * The pressed view's secondary fill disappears in forced colors, so Chart and
 * Table painted alike (w4/m43). Both carry `forced-selected` behind
 * their pressed state; the paint was measured in a real browser.
 */
describe("NetWorthCard view controls under forced colors", () => {
  it("gates the highlight on the pressed view", () => {
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={multiMonth}
        primaryCurrency="USD"
      />,
    );
    const chart = screen.getByRole("button", {
      name: "page.overview.chartView",
    });
    const table = screen.getByRole("button", {
      name: "page.overview.tableView",
    });

    expect(chart).toHaveClass("aria-pressed:forced-selected");
    expect(table).toHaveClass("aria-pressed:forced-selected");
    expect(chart).toHaveAttribute("aria-pressed", "true");
    expect(table).toHaveAttribute("aria-pressed", "false");
  });
});

describe("NetWorthCard chart series", () => {
  it("shows a visible marker for a single-point series", () => {
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={singleMonth}
        primaryCurrency="USD"
      />,
    );

    const series = lineSeries(lastOption());
    expect(series).toHaveLength(1);
    expect(series[0].data).toEqual([100]);
    expect(series[0].symbol).toBe("circle");
    expect(series[0].symbolSize).toBe(7);
    expect(series[0].showSymbol).toBe(true);
  });

  it("keeps symbols off for a multi-point series", () => {
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={multiMonth}
        primaryCurrency="USD"
      />,
    );

    const series = lineSeries(lastOption());
    expect(series[0].data).toEqual([100, 150, 120]);
    expect(series[0].symbol).toBe("none");
    expect(series[0].symbolSize).toBeUndefined();
    expect(series[0].showSymbol).toBe(false);
  });

  it("treats a series with one finite value among null gaps as single-point", () => {
    const data: DataSeries = [
      { date: "2026-01-31", balance: { USD: 100 } },
      { date: "2026-02-28", balance: { USD: 150, EUR: 10 } },
      { date: "2026-03-31", balance: { USD: 120 } },
    ];

    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={data}
        primaryCurrency="EUR"
      />,
    );

    const series = lineSeries(lastOption());
    const eur = series.find((item) => item.name === "EUR");
    expect(eur?.data).toEqual([null, 10, null]);
    expect(eur?.symbol).toBe("circle");
  });

  it("renders the empty state without a chart", () => {
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={[]}
        primaryCurrency="USD"
      />,
    );

    expect(screen.queryByTestId("echarts-mock")).not.toBeInTheDocument();
    expect(screen.getByText("common.noDataFound")).toBeInTheDocument();
  });

  it("keeps the currency tooltip formatter", () => {
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={multiMonth}
        primaryCurrency="USD"
      />,
    );

    const tooltip = lastOption().tooltip as { trigger: string };
    expect(tooltip.trigger).toBe("axis");
    // Each series formats its own point's decimal (w4/1015).
    const [usd] = lineSeries(lastOption()) as Array<{
      tooltip: { valueFormatter: (value: number, index: number) => string };
    }>;
    expect(usd!.tooltip.valueFormatter(150, 1)).toBe("150");
  });
});

describe("NetWorthCard localization", () => {
  it("formats the x-axis in the active language", () => {
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={multiMonth}
        primaryCurrency="USD"
      />,
    );
    expect(axisLabelFormatter(lastOption())("2026-02-28")).toBe("Feb");
  });

  it("re-renders the axis formatter when the language changes", () => {
    const { rerender } = render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={multiMonth}
        primaryCurrency="USD"
      />,
    );
    const englishOption = lastOption();

    language = "fr";
    rerender(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={multiMonth}
        primaryCurrency="USD"
      />,
    );
    const frenchOption = lastOption();

    expect(frenchOption).not.toBe(englishOption);
    expect(axisLabelFormatter(frenchOption)("2026-02-28")).toBe("févr.");
  });

  it("formats table-view month labels in the active language", async () => {
    language = "fr";
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={multiMonth}
        primaryCurrency="USD"
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "page.overview.tableView" }),
    );

    expect(screen.getByText("févr. 2026")).toBeInTheDocument();
    expect(screen.getByText("mars 2026")).toBeInTheDocument();
  });

  it("falls back to the raw date in the table for an unparseable date", async () => {
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={[{ date: "not-a-date", balance: { USD: 1 } }]}
        primaryCurrency="USD"
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "page.overview.tableView" }),
    );

    expect(screen.getByText("not-a-date")).toBeInTheDocument();
  });
});

describe("NetWorthCard view toggle semantics", () => {
  function toggles() {
    return {
      chart: screen.getByRole("button", { name: "page.overview.chartView" }),
      table: screen.getByRole("button", { name: "page.overview.tableView" }),
    };
  }

  it("exposes the chart as the pressed view before any interaction", () => {
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={multiMonth}
        primaryCurrency="USD"
      />,
    );

    const { chart, table } = toggles();
    expect(chart).toHaveAttribute("aria-pressed", "true");
    expect(table).toHaveAttribute("aria-pressed", "false");
  });

  it("moves the pressed state onto the table and back on click", async () => {
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={multiMonth}
        primaryCurrency="USD"
      />,
    );

    await userEvent.click(toggles().table);
    expect(toggles().table).toHaveAttribute("aria-pressed", "true");
    expect(toggles().chart).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(toggles().chart);
    expect(toggles().chart).toHaveAttribute("aria-pressed", "true");
    expect(toggles().table).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps keyboard activation, focus and the rendered amounts intact", async () => {
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={multiMonth}
        primaryCurrency="USD"
      />,
    );

    toggles().table.focus();
    await userEvent.keyboard("{Enter}");

    expect(toggles().table).toHaveFocus();
    expect(toggles().table).toHaveAttribute("aria-pressed", "true");
    // The table view really rendered: the last month's balance is on screen.
    expect(screen.getByText("Mar 2026")).toBeInTheDocument();
    expect(screen.getAllByText(/120/).length).toBeGreaterThan(0);
  });
});

describe("NetWorthCard table view semantics (w0/030)", () => {
  it("renders a named table with month and net-worth columns, newest first, in a focusable region", async () => {
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={multiMonth}
        primaryCurrency="USD"
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "page.overview.tableView" }),
    );

    const table = screen.getByRole("table", {
      name: "page.overview.netWorthByMonth",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["page.overview.netWorthMonth", "common.netWorth"]);
    expect(
      within(table)
        .getAllByRole("rowheader")
        .map((header) => header.textContent),
    ).toEqual(["Mar 2026", "Feb 2026", "Jan 2026"]);
    const [, newest] = within(table).getAllByRole("row");
    expect(within(newest).getByRole("cell")).toHaveTextContent("120");

    const region = screen.getByRole("region", {
      name: "page.overview.netWorthByMonth",
    });
    expect(region).toContainElement(table);
    expect(region).toHaveAttribute("tabindex", "0");
    // Tab from the pressed toggle reaches the region without a pointer.
    for (let step = 0; step < 10 && document.activeElement !== region; step++) {
      await userEvent.tab();
    }
    expect(region).toHaveFocus();
  });
});

describe("NetWorthCard valuation status (w4/m27)", () => {
  const holding = (
    currency: string,
    overrides: Partial<NetWorthValuation["holdings"][number]> = {},
  ): NetWorthValuation["holdings"][number] => ({
    currency,
    units: 1,
    basis: "market",
    priceDate: "2026-09-26",
    stale: false,
    managed: false,
    ...overrides,
  });

  function renderWith(valuation: NetWorthValuation | null) {
    return render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={valuation}
        data={multiMonth}
        primaryCurrency="USD"
      />,
    );
  }

  function statusButton() {
    return screen.getByRole("button", {
      name: /page\.overview\.valuedAtMarket/,
    });
  }

  it("says only that the figure is at market when every price is current", () => {
    renderWith({
      holdings: [holding("BTC", { managed: true }), holding("STETH")],
      staleSince: null,
      costBasis: 100,
      unrealized: 0,
    });

    expect(statusButton()).toHaveTextContent(
      /^page\.overview\.valuedAtMarket$/,
    );
    expect(screen.queryByText(/costBasis/)).not.toBeInTheDocument();
  });

  it("counts stale prices by their oldest date, plus holdings at cost and left out", () => {
    renderWith({
      holdings: [
        holding("GLD", { stale: true, priceDate: "2017-09-08" }),
        holding("RGAGX", { stale: true, priceDate: "2017-09-08" }),
        holding("STARTUP", { basis: "cost", priceDate: null }),
        holding("VACHR", { basis: "notInTotal", priceDate: null, units: -13 }),
      ],
      staleSince: "2017-09-08",
      costBasis: 106826.05,
      unrealized: 10823.44,
    });

    const text = statusButton().textContent ?? "";
    expect(text).toContain(
      'page.overview.pricesNotUpdated {"date":"Sep 8, 2017","count":2}',
    );
    expect(text).toContain('page.overview.atCostCount {"count":1}');
    expect(text).toContain('page.overview.notInTotalCount {"count":1}');
    expect(screen.getByText(/page\.overview\.costBasis/).textContent).toContain(
      "+10823.44 USD",
    );
  });

  it("opens the per-holding detail with dates, tags and the Commodities link", async () => {
    renderWith({
      holdings: [
        holding("BTC", { managed: true, units: 0.332 }),
        holding("GLD", { stale: true, priceDate: "2017-09-08" }),
        holding("VACHR", { basis: "notInTotal", priceDate: null, units: -13 }),
      ],
      staleSince: "2017-09-08",
      costBasis: 1,
      unrealized: 1,
    });

    await userEvent.click(statusButton());

    expect(
      await screen.findByText("page.overview.valuationDetails"),
    ).toBeInTheDocument();
    expect(screen.getByText("0.332 BTC")).toBeInTheDocument();
    expect(
      screen.getByText('page.overview.holdingPrice {"date":"Sep 26, 2026"}'),
    ).toBeInTheDocument();
    expect(screen.getByText("page.overview.livePrice")).toBeInTheDocument();
    expect(
      screen.getByText('page.overview.holdingPrice {"date":"Sep 8, 2017"}'),
    ).toBeInTheDocument();
    expect(
      screen.getByText("page.overview.priceNotUpdated"),
    ).toBeInTheDocument();
    expect(screen.getByText("page.overview.noPrice")).toBeInTheDocument();
    expect(screen.getByText("page.overview.notInTotalTag")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "page.overview.updatePrices" }),
    ).toHaveAttribute("href", "/ledger/owner/book/commodities");
  });

  it("opens the detail from the keyboard", async () => {
    renderWith({
      holdings: [holding("BTC")],
      staleSince: null,
      costBasis: null,
      unrealized: null,
    });

    statusButton().focus();
    await userEvent.keyboard("{Enter}");
    expect(
      await screen.findByText("page.overview.valuationDetails"),
    ).toBeInTheDocument();
  });

  it("shows no status line without a valuation", () => {
    renderWith(null);
    expect(
      screen.queryByRole("button", { name: /valuedAtMarket/ }),
    ).not.toBeInTheDocument();
  });
});

/** A month's change subtracts amounts in one currency only (w4/993). */
describe("NetWorthCard monthly change", () => {
  const renderCard = (data: DataSeries) =>
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={data}
        primaryCurrency="USD"
      />,
    );
  const change = () =>
    screen.queryByText("page.overview.fromPreviousMonth")?.parentElement
      ?.textContent ?? null;

  it("shows no change when last month held only another currency", async () => {
    renderCard([
      { date: "2016-01-31", balance: { USD: "1000" } },
      { date: "2016-02-29", balance: { JPY: "100000" } },
    ]);
    expect(change()).toBeNull();
    expect(screen.queryByText(/99000/)).toBeNull();
    // The balances themselves still show, each in its own currency.
    expect(screen.getByText("100000 JPY")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "page.overview.tableView" }),
    );
    const [, february, january] = within(
      screen.getByRole("table", { name: "page.overview.netWorthByMonth" }),
    ).getAllByRole("row");
    expect(february).toHaveTextContent("100000");
    expect(february).toHaveTextContent("JPY");
    expect(january).toHaveTextContent("1000");
    expect(january).toHaveTextContent("USD");
  });

  it.each<[string, DataSeries, string]>([
    [
      "the same non-primary currency",
      [
        { date: "2016-01-31", balance: { JPY: "90000" } },
        { date: "2016-02-29", balance: { JPY: "100000" } },
      ],
      "+10000 JPY",
    ],
    [
      "the primary currency",
      [
        { date: "2016-01-31", balance: { USD: "1000" } },
        { date: "2016-02-29", balance: { USD: "1200" } },
      ],
      "+200 USD",
    ],
    [
      "the latest currency within a mixed previous month",
      [
        { date: "2016-01-31", balance: { USD: "1000", JPY: "90000" } },
        { date: "2016-02-29", balance: { JPY: "100000" } },
      ],
      "+10000 JPY",
    ],
  ])("compares %s", (_name, data, expected) => {
    renderCard(data);
    expect(change()).toContain(expected);
  });

  it("shows no change without a previous month", () => {
    renderCard([{ date: "2016-02-29", balance: { JPY: "100000" } }]);
    expect(change()).toBeNull();
  });
});

/**
 * A recorded balance and its monthly change keep their decimal: as doubles,
 * 9007199254740992 and 9007199254740993 are one number (w4/m52). The formatter
 * here prints what it is given, so the text shows exactly what reached it.
 */
describe("NetWorthCard exact amounts", () => {
  const renderCard = (data: DataSeries) =>
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={data}
        primaryCurrency="USD"
      />,
    );
  const change = () =>
    screen.getByText("page.overview.fromPreviousMonth").parentElement!
      .textContent;

  it.each([
    ["an increase", "9007199254740992", "9007199254740993", "+1 USD"],
    ["a decrease", "9007199254740993", "9007199254740992", "-1 USD"],
    ["the safe control", "9007199254740990", "9007199254740991", "+1 USD"],
  ])("shows %s and both months exactly", async (_name, jan, feb, expected) => {
    renderCard([
      { date: "2016-01-31", balance: { USD: jan } },
      { date: "2016-02-29", balance: { USD: feb } },
    ]);
    expect(screen.getByText(`${feb} USD`)).toBeInTheDocument();
    expect(change()).toContain(expected);

    await userEvent.click(
      screen.getByRole("button", { name: "page.overview.tableView" }),
    );
    const [, february, january] = within(
      screen.getByRole("table", { name: "page.overview.netWorthByMonth" }),
    ).getAllByRole("row");
    expect(february).toHaveTextContent(`${feb} USD`);
    expect(january).toHaveTextContent(`${jan} USD`);
  });
});

// w21/995: a future-dated entry put next month at the end of the series, and the
// headline read it with a falling arrow.
describe("NetWorthCard headline", () => {
  const withFuture: DataSeries = [
    { date: "2026-09-30", balance: { USD: 1000 } },
    { date: "2026-10-31", balance: { USD: 1200 } },
    { date: "2026-11-30", balance: { USD: 700 } },
  ];

  it("stops at the current month", () => {
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={null}
        data={withFuture}
        primaryCurrency="USD"
        today="2026-10-24"
      />,
    );

    expect(screen.getAllByText(/1200/).length).toBeGreaterThan(0);
    expect(screen.getByText(/\+200/)).toBeInTheDocument();
    expect(screen.queryByText(/-500/)).toBeNull();
  });
});
