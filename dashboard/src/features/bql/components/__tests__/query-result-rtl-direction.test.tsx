import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { QueryShellQuery } from "@/graphql/definitions";
import { QueryResultCard } from "../query-result-card";

/**
 * BQL numbers and amounts keep their sign before the digits on a
 * right-to-left page (w4/1052). In Persian, `-1.25` read `1.25-` and
 * `-2703.29 USD` read `USD 2703.29-`: the cells inherited the page direction,
 * which reorders a weak leading minus. jsdom cannot lay text out, so this
 * asserts the left-to-right run each value now sits in; the glyph order was
 * measured in a real browser.
 */
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

type Result = NonNullable<QueryShellQuery["queryShell"]>;
const result = {
  __typename: "QueryShellResult",
  resultType: "table",
  table: {
    __typename: "QueryResultTable",
    types: [
      { name: "label", dtype: "str" },
      { name: "amount", dtype: "Decimal" },
      { name: "positive", dtype: "Decimal" },
      { name: "balance", dtype: "Inventory" },
      { name: "mixed", dtype: "Inventory" },
      { name: "date", dtype: "date" },
    ],
    rows: [
      [
        "qa-20261024-rtl",
        "-1.25",
        "2.50",
        { USD: "-2703.29" },
        { USD: "-1.00", EUR: "2.00" },
        "2016-04-30",
      ],
      ["qa-20261024-empty", null, "0", null, null, "2016-04-30"],
    ],
  },
  text: null,
  chart: null,
} as unknown as Result;

function renderRtl() {
  render(
    <div dir="rtl">
      <QueryResultCard
        query="SELECT 'qa-20261024-rtl' AS label, -1.25 AS amount"
        result={result}
        onExecute={vi.fn()}
        onDelete={vi.fn()}
        isInitiallyOpen
      />
    </div>,
  );
}

function expectRun(text: string) {
  const run = screen.getByText(text);
  expect(run.tagName).toBe("BDI");
  expect(run).toHaveAttribute("dir", "ltr");
}

describe("BQL result values on a right-to-left page", () => {
  it("runs numbers and amounts left to right, with their exact text", () => {
    renderRtl();
    expectRun("-1.25");
    expectRun("2.50");
    expectRun("0");
    expectRun("-2703.29 USD");
    expectRun("-1.00 USD");
    expectRun("2.00 EUR");
  });

  it("leaves labels, dates and empty cells in the page's direction", () => {
    renderRtl();
    expect(screen.getByText("qa-20261024-rtl").closest("bdi")).toBeNull();
    for (const date of screen.getAllByText("2016-04-30")) {
      expect(date.closest("bdi")).toBeNull();
    }
    const emptyRow = screen
      .getByText("qa-20261024-empty")
      .closest('[role="row"]') as HTMLElement;
    const cells = within(emptyRow).getAllByRole("cell");
    // The null number and null inventory render nothing, not an empty run.
    expect(cells[1].querySelector("bdi")).toBeNull();
    expect(cells[3].querySelector("bdi")).toBeNull();
  });
});
