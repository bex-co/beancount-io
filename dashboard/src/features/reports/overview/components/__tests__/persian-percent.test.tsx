import { type ReactNode } from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { node, renderInLedger, rows, table } from "./overview-chart-test-utils";
import { DistributionChart } from "../distribution-chart";
import { HierarchyTreeMap } from "../../../balance-sheet/hierarchy-tree-map";

/**
 * In Persian the Overview's share column wrote Persian digits with a Latin
 * `%`, and the pie and Balance Sheet tree map tooltips wrote Latin digits and
 * `%` (w2/133). A share is now written the way Statistics already writes it.
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

const shares = async (language: string) => {
  const option = await mount(
    <DistributionChart
      title="Assets Distribution"
      data={distribution}
      primaryCurrency="USD"
    />,
    language,
  );
  // The disclosure's summary is in the page language.
  const summary = document.querySelector("summary")!.textContent!;
  const shareColumn = rows(await table("Assets Distribution", summary)).map(
    (row) => row[2],
  );
  return { option, shareColumn };
};

describe("percentages in the language's digits and sign", () => {
  it("writes ۳۴٫۲۲٪ in the Persian distribution table and pie tooltip", async () => {
    const { option, shareColumn } = await shares("fa");
    expect(shareColumn).toEqual(["۳۴٫۲۲٪", "۶۵٫۷۸٪"]);
    expect(
      option.tooltip.formatter({
        name: "VBMPX",
        value: 3422,
        percent: 34.22,
        data: { account: "Assets:Vanguard:VBMPX", exact: "3422" },
      }),
    ).toMatch(/\(۳۴٫۲۲٪\)$/);
  });

  it("keeps 34.22% in English", async () => {
    const { option, shareColumn } = await shares("en");
    expect(shareColumn).toEqual(["34.22%", "65.78%"]);
    expect(
      option.tooltip.formatter({
        name: "VBMPX",
        value: 3422,
        percent: 34.22,
        data: { account: "Assets:Vanguard:VBMPX", exact: "3422" },
      }),
    ).toBe("Assets:Vanguard:VBMPX: 3,422 (34.22%)");
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
