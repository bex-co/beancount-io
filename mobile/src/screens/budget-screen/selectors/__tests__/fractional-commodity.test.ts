import {
  budgetDisplayScale,
  budgetScale,
  calculateBudgetForInterval,
  statusScale,
  varianceStatus,
  type BudgetGroup,
} from "../budget-selectors";
import { selectBudgetCardStats } from "../select-budget-card-stats";
import { formatMoneyWithCurrency } from "../../../../common/number-utils";
import { selectBudgetPanelRows } from "../../../home-screen/selectors/select-budget-panel";

// w21/290: a 0.003 BTC budget was rounded to cents and judged with a half-cent
// tolerance, so a 33% overspend read "On target" and the October budget read 0.
const btc = (
  amount = "0.003 BTC",
  interval = "monthly",
  date = "2025-01-01",
) => [{ date, interval, amount, entry_hash: "h" }];

function group(amount = "0.003 BTC"): BudgetGroup {
  return {
    account: "Expenses:Crypto",
    interval: "monthly",
    currency: "BTC",
    amount,
    value: Number.parseFloat(amount),
    entry_hash: "h",
    budgetHistory: btc(amount),
  };
}

describe("a budget in a fractional commodity", () => {
  it("reads its recorded scale, and never less than cents", () => {
    expect(budgetScale(btc("0.003 BTC"))).toBe(3);
    expect(budgetScale(btc("0.00300000 BTC"))).toBe(8);
    expect(budgetScale(btc("300 USD"))).toBe(2);
    expect(budgetScale([])).toBe(2);
    expect(budgetScale(undefined)).toBe(2);
  });

  it("prorates to today without rounding it to nothing", () => {
    const budget = calculateBudgetForInterval(
      "2026-10-31",
      "monthly",
      btc("0.003 BTC", "monthly", "2026-01-01"),
      "2026-10-21",
    );
    expect(Math.abs(budget - (0.003 * 21) / 31) < 1e-6).toBe(true);
    expect(budget > 0).toBe(true);
  });

  it("judges a 33% overspend as above and a half-spent month as below", () => {
    expect(varianceStatus(0.004 - 0.003, 3)).toBe("above");
    expect(varianceStatus(0.0015 - 0.003, 3)).toBe("below");
    expect(varianceStatus(0, 3)).toBe("on");
    // The budget's own float noise is still on target.
    expect(varianceStatus(1e-12, 3)).toBe("on");
  });

  it("reads Above target for the whole September month", () => {
    const stats = selectBudgetCardStats(group(), [
      { date: "2026-09-30", actual: 0.004, budget: 0.003 },
    ]);
    expect(stats.status).toBe("above");
    expect(Math.round(stats.progressPercent ?? 0)).toBe(133);
  });

  it("leaves USD and the cent tolerance as they were", () => {
    expect(varianceStatus(0.004)).toBe("on");
    expect(varianceStatus(0.006)).toBe("above");
    expect(varianceStatus(-0.006)).toBe("below");
    expect(
      calculateBudgetForInterval("2025-01-31", "monthly", btc("5000 USD")),
    ).toBe(5000);
  });

  it("gives Home a budget for the month in progress, not a zero", () => {
    const [row] = selectBudgetPanelRows(
      [{ group: group(), actual: 0.0015, periodEnd: "2026-10-31" }],
      3,
      "2026-10-21",
    );
    expect(row!.noBudget).toBe(false);
    expect(row!.status).toBe("below");
    expect(row!.scale).toBe(3);
  });
});

// w21/425: the cents floor, passed on to the formatter, overrode JPY's none.
describe("a budget in a zero-decimal currency", () => {
  const yen = (): BudgetGroup => ({
    ...group("1500 JPY"),
    account: "Expenses:Ramen",
    currency: "JPY",
  });

  it("displays at the recorded scale, but still judges at cents", () => {
    expect(budgetDisplayScale(btc("1500 JPY"))).toBe(0);
    expect(budgetDisplayScale(btc("0.003 BTC"))).toBe(3);
    expect(budgetDisplayScale(undefined)).toBe(0);
    expect(budgetScale(btc("1500 JPY"))).toBe(2);
  });

  it("gives Home whole yen", () => {
    const [row] = selectBudgetPanelRows(
      [{ group: yen(), actual: 1200, periodEnd: "2026-10-31" }],
      3,
      "2026-10-21",
    );
    expect(formatMoneyWithCurrency(1200, "JPY", row!.scale)).toBe("¥1,200");
    expect(formatMoneyWithCurrency(1016.13, "JPY", row!.scale)).toBe("¥1,016");
  });

  it("keeps cents for a dollar budget recorded without them", () => {
    expect(
      formatMoneyWithCurrency(
        1016.13,
        "USD",
        budgetDisplayScale(btc("1500 USD")),
      ),
    ).toBe("$1,016.13");
  });
});

// w21/804: judged at half its written digit (±0.0005 for "0.003 BTC"), the
// card read a green "On target" beside "Variance +0.0003742 BTC", 17% over,
// since w21/595 prints every digit a commodity holds.
describe("a commodity budget's status at the precision it is shown", () => {
  it("is not On target beside a 17% overrun", () => {
    const stats = selectBudgetCardStats(group(), [
      { date: "2026-10-31", actual: 0.0026, budget: 0.0022258 },
    ]);
    expect(stats.status).toBe("above");
    expect(stats.favorable).toBe(false);
  });

  it("is On target when the figures agree, float noise and all", () => {
    const stats = selectBudgetCardStats(group(), [
      { date: "2026-09-30", actual: 0.1 + 0.2 - 0.297, budget: 0.003 },
    ]);
    expect(stats.status).toBe("on");
  });

  it("is judged at eight places for a commodity, and at cents for money", () => {
    expect(statusScale(btc("0.003 BTC"), "BTC")).toBe(8);
    expect(statusScale(btc("300 USD"), "USD")).toBe(2);
    expect(statusScale(btc("0.003 BTC"))).toBe(3);
  });
});

// w21/805: 100 KWD prorated to 23 days of October is 74.1935, rounded to
// cents 74.19, so 74.193 spent read a red "Above target".
describe("a three-decimal currency's budget", () => {
  const kwd = btc("100 KWD", "monthly", "2026-01-01");

  it("keeps its third decimal when prorated", () => {
    const budget = calculateBudgetForInterval(
      "2026-10-31",
      "monthly",
      kwd,
      "2026-10-23",
    );
    expect(Math.abs(budget - (100 * 23) / 31) < 1e-6).toBe(true);
    expect(budget).not.toBe(74.19);
  });

  it("is not above target for 74.193 spent", () => {
    const budget = calculateBudgetForInterval(
      "2026-10-31",
      "monthly",
      kwd,
      "2026-10-23",
    );
    const stats = selectBudgetCardStats(
      {
        account: "Expenses:Rent",
        interval: "monthly",
        currency: "KWD",
        amount: "100 KWD",
        value: 100,
        entry_hash: "h",
        budgetHistory: kwd,
      },
      [{ date: "2026-10-31", actual: 74.193, budget }],
    );
    expect(stats.status === "above").toBe(false);
    // Cents and yen prorate as before.
    expect(
      calculateBudgetForInterval(
        "2026-10-31",
        "monthly",
        btc("100 USD", "monthly", "2026-01-01"),
        "2026-10-23",
      ),
    ).toBe(74.19);
  });
});

// w21/854: "1 BTC" prorated over 23 of 31 days is 0.741935…, not the 0.74 that
// cents made it, so 0.7419 spent read "Above target".
describe("a whole-unit commodity budget prorated mid-month", () => {
  it("keeps the digits the status is judged at", () => {
    const budget = calculateBudgetForInterval(
      "2026-10-31",
      "monthly",
      btc("1 BTC", "monthly", "2026-01-01"),
      "2026-10-23",
    );
    expect(Math.abs(budget - 23 / 31) < 1e-8).toBe(true);
    // 0.7419 spent is under 0.741935, so it is not above target.
    expect(0.7419 <= budget).toBe(true);
  });

  it("still rounds a fiat budget to its minor unit", () => {
    const budget = calculateBudgetForInterval(
      "2026-10-31",
      "monthly",
      [
        {
          date: "2026-01-01",
          interval: "monthly",
          amount: "100 USD",
          entry_hash: "h",
        },
      ],
      "2026-10-23",
    );
    expect(budget).toBe(74.19);
  });
});
