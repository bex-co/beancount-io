import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChartPeriodTable } from "../chart-period-table";

/**
 * The account charts draw their periods on a canvas, and at 390px the
 * journal's Units, Change and Balance columns are hidden, so this table is the
 * only text a keyboard reader has. It must repeat what the chart plots without
 * summing commodities or inventing values.
 */

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) =>
      ({
        "page.accountReport.period": "Period",
        "page.accountReport.periodAmount": "Amount",
        "page.accountReport.periodData": "Period data",
      })[key] ?? key,
  }),
}));

function renderTable(
  data: Array<{ date: string; balance: Record<string, unknown> }>,
) {
  return render(
    <>
      <h2 id="card-title">Account Balance</h2>
      <ChartPeriodTable data={data} labelledBy="card-title" />
    </>,
  );
}

/**
 * jsdom does not implement `<summary>` activation, so opening the disclosure
 * cannot be driven here; it is verified in a real browser. These cases assert
 * the content the disclosure holds, which is what the values themselves depend
 * on.
 */
function rows() {
  return within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent?.trim()),
    );
}

describe("ChartPeriodTable", () => {
  it("offers a named disclosure holding the plotted periods", () => {
    renderTable([{ date: "2026-02-28", balance: { USD: "14598" } }]);

    // Closed by default in a browser; here we check what it holds.
    const disclosure = screen.getByText("Period data").closest("details");
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute("open");

    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((h) => h.textContent?.trim()),
    ).toEqual(["Period", "Amount"]);
    expect(rows()).toEqual([["2026-02-28", "14598 USD"]]);
  });

  it("reads a negative period change as it is plotted", () => {
    renderTable([{ date: "2026-02-28", balance: { USD: "-4092" } }]);
    expect(rows()).toEqual([["2026-02-28", "-4092 USD"]]);
  });

  it("lists every unit of a multi-commodity period without summing them", () => {
    renderTable([
      { date: "2026-02-28", balance: { USD: "14598", ACME: "150" } },
    ]);

    const amounts = within(screen.getByRole("table")).getAllByRole("row")[1];
    const cell = within(amounts).getAllByRole("cell")[1];
    // Each unit on its own line, and no combined total anywhere.
    expect(cell.textContent).toContain("14598 USD");
    expect(cell.textContent).toContain("150 ACME");
    expect(cell.textContent).not.toContain("14748");
  });

  it("tells a period with no balances apart from an explicit zero", () => {
    renderTable([
      { date: "2026-01-31", balance: {} },
      { date: "2026-02-28", balance: { USD: "0" } },
      { date: "2026-03-31", balance: { USD: null } },
    ]);

    expect(rows()).toEqual([
      ["2026-01-31", "—"],
      ["2026-02-28", "0 USD"],
      // A null unit is not a zero either.
      ["2026-03-31", "—"],
    ]);
  });

  it("renders nothing at all when the series is empty", () => {
    renderTable([]);
    expect(screen.queryByText("Period data")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("names the table by the card it belongs to", () => {
    renderTable([{ date: "2026-02-28", balance: { USD: "14598" } }]);

    // Two of these tables share a page, so each is named by its own card.
    expect(
      screen.getByRole("table", { name: /Account Balance Period data/ }),
    ).toBeInTheDocument();
  });

  it("follows the series it is given when the interval changes", () => {
    const monthly = [
      { date: "2016-01-31", balance: { USD: "100" } },
      { date: "2016-02-29", balance: { USD: "200" } },
    ];
    const { rerender } = renderTable(monthly);
    expect(rows()).toHaveLength(2);

    rerender(
      <>
        <h2 id="card-title">Account Balance</h2>
        <ChartPeriodTable
          data={[{ date: "2016-12-31", balance: { USD: "6377.23" } }]}
          labelledBy="card-title"
        />
      </>,
    );
    expect(rows()).toEqual([["2016-12-31", "6377.23 USD"]]);
  });
});
