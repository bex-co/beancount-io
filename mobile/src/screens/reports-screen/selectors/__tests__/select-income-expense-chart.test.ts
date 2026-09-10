import { selectIncomeExpenseChartSeries } from "../select-income-expense-chart";

describe("selectIncomeExpenseChartSeries", () => {
  it("plots a profitable month as positive net aligned with income and expense", () => {
    const chart = selectIncomeExpenseChartSeries(
      "USD",
      [{ date: "2025-09-30", balance: { USD: -4639.7 } }],
      [{ date: "2025-09-30", balance: { USD: 2284.81 } }],
      [{ date: "2025-09-30", balance: { USD: -2354.89 } }],
      "1M",
    );

    expect(chart.months).toEqual(["2025-09"]);
    expect(chart.income).toEqual([4639.7]);
    expect(chart.expense).toEqual([2284.81]);
    expect(chart.net).toEqual([2354.89]);
  });

  it("keeps a loss month below zero without using absolute value", () => {
    const chart = selectIncomeExpenseChartSeries(
      "USD",
      [{ date: "2025-08-31", balance: { USD: -1000 } }],
      [{ date: "2025-08-31", balance: { USD: 1500 } }],
      [{ date: "2025-08-31", balance: { USD: 500 } }],
      "1M",
    );

    expect(chart.income).toEqual([1000]);
    expect(chart.expense).toEqual([1500]);
    expect(chart.net).toEqual([-500]);
  });

  it("keeps zero profit at zero", () => {
    const chart = selectIncomeExpenseChartSeries(
      "USD",
      [{ date: "2025-07-31", balance: { USD: -200 } }],
      [{ date: "2025-07-31", balance: { USD: 200 } }],
      [{ date: "2025-07-31", balance: { USD: 0 } }],
      "1M",
    );

    expect(chart.net).toEqual([0]);
  });

  it("filters to the selected single-month window", () => {
    const chart = selectIncomeExpenseChartSeries(
      "USD",
      [
        { date: "2025-08-31", balance: { USD: -100 } },
        { date: "2025-09-30", balance: { USD: -4639.7 } },
      ],
      [
        { date: "2025-08-31", balance: { USD: 50 } },
        { date: "2025-09-30", balance: { USD: 2284.81 } },
      ],
      [
        { date: "2025-08-31", balance: { USD: -50 } },
        { date: "2025-09-30", balance: { USD: -2354.89 } },
      ],
      "1M",
    );

    expect(chart.months).toEqual(["2025-09"]);
    expect(chart.net).toEqual([2354.89]);
  });
});
