/**
 * Accessible names for the ledger-data tables.
 *
 * These pages stack tables with identical column headers — seven budget
 * histories, one per commodity pair, three Statistics tables, two Settings
 * option tables — so an unnamed table is indistinguishable to anyone
 * navigating by table. Every query here goes through `getByRole("table",
 * { name })`, which resolves the real accessible name (caption, `aria-label`,
 * `aria-labelledby`) rather than looking for text on the page, so it fails
 * against the bare `<table>` markup these components used to render.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as apolloClient from "@apollo/client/react";
import { BudgetChartCard } from "../budget/budget-chart-card";
import { groupBudgetEntries } from "../budget/budget-utils";
import { CommodityPriceHistory } from "../commodities/commodity-price-history";
import { BeancountOptionsSection } from "../settings/beancount-options-section";
import { FavaOptionsSection } from "../settings/fava-options-section";
import type { BudgetEntry } from "../budget/types";
import type { CommodityPairWithPrices } from "@/graphql/definitions";

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => <div data-testid="chart" />,
  default: () => <div data-testid="chart" />,
}));
vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (value: number) => String(value),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: false }),
}));
// A public reader: the write-gated controls render nothing, which is also the
// state the Delete column is hidden in.
vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: () => null,
}));

beforeEach(() => {
  vi.mocked(apolloClient.useQuery).mockReturnValue({
    data: undefined,
    loading: false,
    error: undefined,
  } as never);
});
afterEach(cleanup);

/** One budget directive for an account in a currency. */
function budgetEntry(
  account: string,
  currency: string,
  date: string,
  amount: string,
  interval = "monthly",
): BudgetEntry {
  return {
    date,
    entry_hash: `${account}-${currency}-${date}`,
    directive_type: "custom",
    type: "budget",
    values: [account, interval, { number: amount, currency }],
  };
}

function budgetCard(group: ReturnType<typeof groupBudgetEntries>[number]) {
  return (
    <BudgetChartCard
      key={`${group.account}-${group.currency}`}
      group={group}
      ledgerId="l1"
      conversion="AT_COST"
      primaryCurrency="USD"
      onDelete={vi.fn()}
    />
  );
}

const TWO_CURRENCIES = [
  budgetEntry("Expenses:Travel", "USD", "2025-01-01", "500"),
  budgetEntry("Expenses:Travel", "EUR", "2025-01-01", "400"),
];

describe("budget history tables", () => {
  it("names one account's two currency groups apart", () => {
    const groups = groupBudgetEntries(TWO_CURRENCIES, "2025-06-01");
    expect(groups).toHaveLength(2);
    render(<>{groups.map(budgetCard)}</>);
    // The account alone would name both of these identically.
    expect(
      screen.getByRole("table", { name: "Expenses:Travel USD" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Expenses:Travel EUR" }),
    ).toBeInTheDocument();
  });

  it("keeps every id unique when two cards are on the page", () => {
    const groups = groupBudgetEntries(TWO_CURRENCIES, "2025-06-01");
    const { container } = render(<>{groups.map(budgetCard)}</>);
    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    // And every idref a table names resolves to exactly one element.
    for (const table of container.querySelectorAll("table")) {
      for (const id of (table.getAttribute("aria-labelledby") ?? "")
        .split(/\s+/)
        .filter(Boolean)) {
        expect(container.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
      }
    }
  });

  it("keeps interval changes inside one named history", () => {
    const groups = groupBudgetEntries(
      [
        budgetEntry("Expenses:Rent", "USD", "2025-01-01", "1000", "monthly"),
        budgetEntry("Expenses:Rent", "USD", "2025-04-01", "1200", "quarterly"),
      ],
      "2025-06-01",
    );
    // An interval change is a row within the history, not a second history.
    expect(groups).toHaveLength(1);
    render(<>{groups.map(budgetCard)}</>);
    const table = screen.getByRole("table", { name: "Expenses:Rent USD" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });
});

const acmeUsd: CommodityPairWithPrices = {
  __typename: "CommodityPairWithPrices",
  base: "ACME",
  quote: "USD",
  prices: [{ __typename: "PricePoint", date: "2024-01-01", value: "61.40" }],
};
const bmktUsd: CommodityPairWithPrices = {
  __typename: "CommodityPairWithPrices",
  base: "BMKT",
  quote: "USD",
  prices: [{ __typename: "PricePoint", date: "2024-01-01", value: "0.0225" }],
};

describe("commodity price history tables", () => {
  it("names two same-quote histories by their own base", async () => {
    const user = userEvent.setup();
    render(
      <>
        <CommodityPriceHistory commodity={acmeUsd} />
        <CommodityPriceHistory commodity={bmktUsd} />
      </>,
    );
    for (const button of screen.getAllByRole("button")) {
      await user.click(button);
    }
    expect(screen.getByRole("table", { name: "ACME/USD" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "BMKT/USD" })).toBeInTheDocument();
  });

  it("restores the name and the exact prices after close and reopen", async () => {
    const user = userEvent.setup();
    render(<CommodityPriceHistory commodity={bmktUsd} />);
    const toggle = screen.getByRole("button");

    await user.click(toggle);
    expect(
      within(screen.getByRole("table", { name: "BMKT/USD" })).getByText(
        "0.0225",
      ),
    ).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(toggle);
    const reopened = screen.getByRole("table", { name: "BMKT/USD" });
    // Small values keep every decimal — the existing precision control.
    expect(within(reopened).getByText("0.0225")).toBeInTheDocument();
  });

  it("opens by keyboard and is named just the same", async () => {
    const user = userEvent.setup();
    render(<CommodityPriceHistory commodity={acmeUsd} />);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("table", { name: "ACME/USD" })).toBeInTheDocument();
  });
});

const ledger = {
  options: { title: "Example", operating_currency: ["USD"] },
  favaOptions: { language: "en", fiscalYearEnd: "12-31" },
} as never;

describe("settings option tables", () => {
  it("names the two option families apart", () => {
    render(
      <>
        <BeancountOptionsSection ledger={ledger} />
        <FavaOptionsSection ledger={ledger} />
      </>,
    );
    expect(
      screen.getByRole("table", { name: "Beancount Options" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Fava Options" }),
    ).toBeInTheDocument();
  });

  it("stays read-only: neither section renders an input", () => {
    const { container } = render(
      <>
        <BeancountOptionsSection ledger={ledger} />
        <FavaOptionsSection ledger={ledger} />
      </>,
    );
    expect(container.querySelectorAll("input, textarea, select")).toHaveLength(
      0,
    );
  });
});
