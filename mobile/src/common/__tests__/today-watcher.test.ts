import fs from "fs";
import path from "path";
import { createTodayWatcher, msUntilNextLocalMidnight } from "../today-watcher";
import { getFormatDate } from "../format-util";
import { currentPeriodRange } from "../../screens/budget-screen/selectors/budget-selectors";
import { detectRecurrence } from "../../screens/merchants-screen/selectors/detect-recurrence";
import { toFilterQuery } from "../../screens/transactions-screen/filters/select-filter-query";
import { NO_FILTERS } from "../../screens/transactions-screen/filters/types";

/**
 * w21/078: 1M/3M/YTD captured "today" when applied, so after midnight the
 * journal kept asking for the old window; Accounts, Home and account detail
 * judged price staleness against the day they first rendered.
 */
describe("the today watcher", () => {
  const harness = (start: Date) => {
    let clock = start;
    const days: string[] = [];
    const watcher = createTodayWatcher({
      now: () => clock,
      onDay: (day) => days.push(day),
    });
    return {
      watcher,
      days,
      set: (date: Date) => {
        clock = date;
      },
    };
  };

  it("moves the 1M window's end to the new day on a return after midnight", () => {
    const { watcher, days, set } = harness(new Date(2026, 9, 21, 23, 50));
    const oneMonth = (day: string) =>
      toFilterQuery({ ...NO_FILTERS, range: "1M" }, new Date(`${day}T00:00:00`))
        .time;
    expect(oneMonth(watcher.today())).toBe("2026-10-01 - 2026-10-21");
    set(new Date(2026, 9, 22, 8, 0));
    watcher.onAppStateChange("background");
    expect(days).toEqual([]);
    watcher.onAppStateChange("active");
    expect(days).toEqual(["2026-10-22"]);
    expect(oneMonth(watcher.today())).toBe("2026-10-01 - 2026-10-22");
  });

  it("advances when the midnight timer fires, and only on a new day", () => {
    const { watcher, days, set } = harness(new Date(2026, 9, 21, 12, 0));
    watcher.onMidnight();
    watcher.onAppStateChange("active");
    expect(days).toEqual([]);
    set(new Date(2026, 9, 22, 0, 0, 1));
    watcher.onMidnight();
    expect(days).toEqual(["2026-10-22"]);
  });

  it("times the next local midnight", () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 21, 23, 59, 0))).toBe(
      60_000,
    );
    const midnight = new Date(2026, 9, 22);
    expect(
      getFormatDate(
        new Date(
          new Date(2026, 9, 21, 6).getTime() +
            msUntilNextLocalMidnight(new Date(2026, 9, 21, 6)),
        ),
      ),
    ).toBe(getFormatDate(midnight));
  });

  it("is what the screens that hold today use", () => {
    const read = (...parts: string[]) =>
      fs.readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8");
    const transactions = read(
      "screens",
      "transactions-screen",
      "transactions-screen.tsx",
    );
    expect(transactions.includes("const today = useToday();")).toBe(true);
    expect(transactions.includes("[filters, today],")).toBe(true);
    for (const screen of [
      ["screens", "accounts-screen", "accounts-screen.tsx"],
      ["screens", "home-screen", "home-screen.tsx"],
      ["screens", "account-detail-screen", "account-detail-screen.tsx"],
    ]) {
      const source = read(...screen);
      expect(source.includes("const today = useToday();")).toBe(true);
      expect(
        source.includes("useMemo(() => getFormatDate(new Date()), [])"),
      ).toBe(false);
    }
  });

  it("decides which budget directive is in effect", () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "..",
        "screens",
        "budget-screen",
        "hooks",
        "use-budget-groups.ts",
      ),
      "utf8",
    );
    expect(source.includes("restForPage, today]")).toBe(true);
  });

  // w21/233: two readers still froze today at mount.
  describe("Home's budget panel and Merchants' Overdue", () => {
    it("moves the panel's period end to the new month at midnight", () => {
      const { watcher, set } = harness(new Date(2026, 9, 31, 23, 50));
      expect(currentPeriodRange("monthly", watcher.today()).end).toBe(
        "2026-10-31",
      );
      set(new Date(2026, 10, 1, 8, 0));
      watcher.onAppStateChange("background");
      watcher.onAppStateChange("active");
      expect(currentPeriodRange("monthly", watcher.today()).end).toBe(
        "2026-11-30",
      );
    });

    it("turns a bill Overdue on the day it passes its grace, without a remount", () => {
      const bill = [
        "2026-06-01",
        "2026-07-01",
        "2026-08-01",
        "2026-09-01",
        "2026-10-01",
      ].map((date) => ({ date, currency: "USD", amount: -15 }));
      const { watcher, set } = harness(new Date(2026, 10, 9, 20, 0));
      expect(detectRecurrence(bill, watcher.today())!.isOverdue).toBe(false);
      set(new Date(2026, 10, 10, 8, 0));
      watcher.onMidnight();
      expect(detectRecurrence(bill, watcher.today())!.isOverdue).toBe(true);
    });

    it("read the watched day, not one captured at mount", () => {
      const read = (...parts: string[]) =>
        fs
          .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
          .replace(/\s+/g, " ");
      const panel = read(
        "screens",
        "home-screen",
        "hooks",
        "use-budget-panel.ts",
      );
      expect(panel.includes("const today = useToday();")).toBe(true);
      expect(panel.includes("getFormatDate(new Date())")).toBe(false);
      expect(panel.includes("currentPeriodRange(group.interval, today)")).toBe(
        true,
      );
      expect(panel.includes("budgetPanelWindow(today)")).toBe(true);
      expect(panel.includes("attempt, today, ]")).toBe(true);
      // A change of interval re-runs the panel too.
      expect(panel.includes("::${group.interval}")).toBe(true);

      const merchants = read(
        "screens",
        "merchants-screen",
        "use-payee-recurrence.ts",
      );
      expect(merchants.includes("const today = useToday();")).toBe(true);
      expect(merchants.includes("getFormatDate(new Date())")).toBe(false);
    });
  });
});
