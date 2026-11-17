import { type ReactNode } from "react";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { node, renderInLedger } from "./overview-chart-test-utils";
import { AccountBalancesCard } from "../account-balances-card";
import { HierarchyTreeMap } from "../../../balance-sheet/hierarchy-tree-map";

/**
 * In Persian the Overview's share column wrote Persian digits with a Latin
 * `%`, and the pie and Balance Sheet tree map tooltips wrote Latin digits and
 * `%` (w2/133). A share is now written the way Statistics already writes it;
 * the Overview's shares are now the Accounts card's column, the pie gone.
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
vi.mock("@/common/hooks/use-ledger", async (original) => ({
  ...(await original<typeof import("@/common/hooks/use-ledger")>()),
  useLedgerNavigateToAccount: () => vi.fn(),
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
afterEach(() => {
  cleanup();
  captured = undefined;
});

type Tooltip = { tooltip: { formatter: (params: unknown) => string } };

async function mount(children: ReactNode, language: string) {
  await renderInLedger(children, language);
  if (!captured) throw new Error("chart was not rendered");
  return captured as Tooltip;
}

const distribution = node("Assets", {}, [
  node("Assets:Vanguard:RGAGX", { USD: "6578" }),
  node("Assets:Vanguard:VBMPX", { USD: "3422" }),
]);

/** The Accounts card's share column: each account's share of its side. */
const shares = async (language: string) => {
  await renderInLedger(
    <AccountBalancesCard
      assets={distribution}
      primaryCurrency="USD"
      invertLiabilities={false}
      ledgerOwner="owner"
      ledgerName="book"
    />,
    language,
  );
  return (account: string) => screen.getByTitle(account).textContent ?? "";
};

describe("percentages in the language's digits and sign", () => {
  it("writes ۳۴٫۲٪ in the Persian Accounts share column", async () => {
    const row = await shares("fa");
    expect(row("Assets:Vanguard:VBMPX")).toContain("۳۴٫۲٪");
    expect(row("Assets:Vanguard:RGAGX")).toContain("۶۵٫۸٪");
    expect(row("Assets:Vanguard:VBMPX")).not.toContain("%");
  });

  it("keeps 34.2% in English", async () => {
    const row = await shares("en");
    expect(row("Assets:Vanguard:VBMPX")).toContain("34.2%");
    expect(row("Assets:Vanguard:RGAGX")).toContain("65.8%");
  });

  const treeMap = (language: string) =>
    mount(
      <HierarchyTreeMap
        title="Assets"
        currency="USD"
        data={
          {
            ...node("Assets", {}, [
              {
                ...node("Assets:Bank", { USD: 342.2 }),
                balanceChildren: { USD: 342.2 },
              },
              {
                ...node("Assets:Cash", { USD: 657.8 }),
                balanceChildren: { USD: 657.8 },
              },
            ]),
            balanceChildren: { USD: 1000 },
          } as SerializableTreeNode
        }
      />,
      language,
    );

  it.each([
    ["fa", "(۳۴٫۲٪)"],
    ["en", "(34.2%)"],
  ])(
    "writes the Balance Sheet tree map share in %s",
    async (language, text) => {
      const option = await treeMap(language);
      expect(
        option.tooltip.formatter({ name: "Assets:Bank", value: 342.2 }),
      ).toContain(text);
    },
  );
});
