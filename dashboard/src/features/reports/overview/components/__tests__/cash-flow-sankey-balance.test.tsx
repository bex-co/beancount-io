import { type ReactNode } from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sumDecimalNumbers } from "@/common/lib/beancount/decimal-number";
import { getSankeyColorScheme } from "../../lib/sankey-colors";
import {
  type SankeyLink,
  transformToSankeyData,
} from "../../lib/sankey-data-transformer";
import CashFlowSankey from "../cash-flow-sankey";
import { node, renderInLedger, rows, table } from "./overview-chart-test-utils";

/**
 * Everything entering the Overview Cash Flow hub also leaves it (w4/m54). A
 * refunded expense flows in under its own account, a period that spent more
 * than came in is funded by a Shortfall source, and the ordinary surplus
 * still ends in Savings. The real transformer, formatter and translations
 * run; only the canvas is replaced, keeping the option it was given.
 */
let captured: Record<string, unknown> | undefined;
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: Record<string, unknown> }) => {
    captured = option;
    return <div data-testid="chart" />;
  },
}));
afterEach(() => {
  cleanup();
  captured = undefined;
});

/** The reproduced ledger: July income, then one expense against the bank. */
/** Optional reversed sides: income given back, a sale, new borrowing. */
type Reversals = { clawback?: string; sold?: string; borrowed?: string };

function ledger(expense: string, extra: Reversals = {}) {
  return {
    incomeHierarchyData: node("Income", {}, [
      node("Income:QaSalary", { USD: "-100" }),
      ...(extra.clawback
        ? [node("Income:QaBonus", { USD: extra.clawback })]
        : []),
    ]),
    expensesHierarchyData: node("Expenses", {}, [
      node("Expenses:QaFees", { USD: expense }),
    ]),
    assetsHierarchyData: node("Assets", {}, [
      node("Assets:Bank", {}, [node("Assets:Bank:Checking", { USD: "75" })]),
      ...(extra.sold
        ? [
            node("Assets:Brokerage", {}, [
              node("Assets:Brokerage:Fund", { USD: extra.sold }),
            ]),
          ]
        : []),
    ]),
    liabilitiesHierarchyData: node("Liabilities", {}, [
      ...(extra.borrowed
        ? [node("Liabilities:Card", { USD: extra.borrowed })]
        : []),
    ]),
  };
}

const flows = (links: SankeyLink[]) =>
  links.map((link) => `${link.source} → ${link.target} ${link.exact}`);

/** Exact totals into and out of the hub; every width is positive. */
function hub(links: SankeyLink[]) {
  expect(links.every((link) => link.value > 0)).toBe(true);
  const total = (side: "source" | "target") =>
    sumDecimalNumbers(
      links.filter((link) => link[side] === "Cash Flow").map((l) => l.exact),
    );
  return { into: total("target"), out: total("source") };
}

describe("Cash Flow hub balance", () => {
  it("keeps the ordinary surplus as Savings, with no shortfall", () => {
    const { links } = transformToSankeyData(ledger("25"));
    expect(flows(links)).toEqual([
      "Income:QaSalary → Cash Flow 100",
      "Cash Flow → Expenses:QaFees 25",
      "Cash Flow → Savings 75",
    ]);
    expect(hub(links)).toEqual({ into: "100", out: "100" });
  });

  it("funds a deficit with a Shortfall source of the exact gap", () => {
    const { links } = transformToSankeyData(ledger("125"));
    expect(flows(links)).toEqual([
      "Income:QaSalary → Cash Flow 100",
      "Cash Flow → Expenses:QaFees 125",
      "Shortfall → Cash Flow 25",
    ]);
    expect(hub(links)).toEqual({ into: "125", out: "125" });
  });

  it("brings a refunded expense in under its own account", () => {
    const { links } = transformToSankeyData(ledger("-25"));
    expect(flows(links)).toEqual([
      "Income:QaSalary → Cash Flow 100",
      "Expenses:QaFees → Cash Flow 25",
      "Cash Flow → Savings 125",
    ]);
    expect(hub(links)).toEqual({ into: "125", out: "125" });
  });

  it("draws neither Savings nor Shortfall when the period breaks even", () => {
    const { links } = transformToSankeyData(ledger("100"));
    expect(flows(links)).toEqual([
      "Income:QaSalary → Cash Flow 100",
      "Cash Flow → Expenses:QaFees 100",
    ]);
  });

  it("turns every reversed side around: clawed-back income, a sale, new borrowing", () => {
    // Bonus +10 is income given back; the fund's -40 is a sale; the card's
    // -30 is money borrowed. Each crosses the hub the other way.
    const { links } = transformToSankeyData(
      ledger("25", { clawback: "10", sold: "-40", borrowed: "-30" }),
    );
    expect(flows(links)).toEqual([
      "Income:QaSalary → Cash Flow 100",
      "Cash Flow → Income:QaBonus 10",
      "Cash Flow → Expenses:QaFees 25",
      "Assets:Brokerage → Cash Flow 40",
      "Liabilities:Card → Cash Flow 30",
      "Cash Flow → Savings 135",
    ]);
    expect(hub(links)).toEqual({ into: "170", out: "170" });
  });

  it("stays balanced to the last digit, beyond what a double holds", () => {
    const { links } = transformToSankeyData({
      ...ledger("9007199254740994.00001"),
      incomeHierarchyData: node("Income", {}, [
        node("Income:QaSalary", { USD: "-9007199254740993" }),
      ]),
    });
    expect(flows(links).at(-1)).toBe("Shortfall → Cash Flow 1.00001");
    expect(hub(links)).toEqual({
      into: "9007199254740994.00001",
      out: "9007199254740994.00001",
    });
  });
});

type FlowOption = {
  tooltip: { formatter: (params: unknown) => string };
  series: [
    {
      data: Array<{ id: string; name: string; itemStyle: { color: string } }>;
      links: SankeyLink[];
    },
  ];
};

async function mount(children: ReactNode, language?: string) {
  await renderInLedger(children, language);
  if (!captured) throw new Error("chart was not rendered");
  return captured as FlowOption;
}

describe("CashFlowSankey shows the balancing flows", () => {
  it("lists a shortfall in Flows and its hover, apart from real accounts", async () => {
    const option = await mount(
      <CashFlowSankey {...ledger("125")} primaryCurrency="USD" />,
    );
    expect(rows(await table("Cash Flow", "Flows"))).toEqual([
      ["Income:QaSalary", "Cash Flow", "100.00 USD"],
      ["Cash Flow", "Expenses:QaFees", "125.00 USD"],
      ["Shortfall", "Cash Flow", "25.00 USD"],
    ]);
    const shortfall = option.series[0].links[2];
    expect(
      option.tooltip
        .formatter({ dataType: "edge", data: shortfall })
        .replace(/\s+/g, " ")
        .trim(),
    ).toBe("<strong>Shortfall → Cash Flow</strong><br/> 25 USD");
    // Drawn apart from real accounts, in the surplus color.
    const scheme = getSankeyColorScheme(false);
    expect(
      option.series[0].data.find((datum) => datum.id === "Shortfall"),
    ).toMatchObject({
      name: "Shortfall",
      itemStyle: { color: scheme.savings },
    });
  });

  it("lists a refund under its own account in Flows", async () => {
    await mount(<CashFlowSankey {...ledger("-25")} primaryCurrency="USD" />);
    expect(rows(await table("Cash Flow", "Flows"))).toEqual([
      ["Income:QaSalary", "Cash Flow", "100.00 USD"],
      ["Expenses:QaFees", "Cash Flow", "25.00 USD"],
      ["Cash Flow", "Savings", "125.00 USD"],
    ]);
  });

  it("names the diagram's own nodes in the reader's language, keyed by identity", async () => {
    const option = await mount(
      <CashFlowSankey {...ledger("125")} primaryCurrency="USD" />,
      "de",
    );
    const nodes = option.series[0].data.map(({ id, name }) => [id, name]);
    expect(nodes).toEqual([
      ["Cash Flow", "Cashflow"],
      ["Income:QaSalary", "Income:QaSalary"],
      ["Expenses:QaFees", "Expenses:QaFees"],
      ["Shortfall", "Fehlbetrag"],
    ]);
    // Links still name identities, which ECharts resolves through `id`.
    expect(option.series[0].links.at(-1)).toMatchObject({
      source: "Shortfall",
      target: "Cash Flow",
    });
    expect(rows(await table("Cashflow", "Zahlungsströme"))).toContainEqual([
      "Fehlbetrag",
      "Cashflow",
      "25,00 USD",
    ]);
  });
});
