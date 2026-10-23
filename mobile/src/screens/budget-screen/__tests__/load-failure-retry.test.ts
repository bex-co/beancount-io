import fs from "fs";
import path from "path";

// w21/862: a failed first load was a bare "Failed to load budgets" with no Retry,
// and a failed pull left an unhandled rejection.
describe("the Budget screen's first-load failure", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "budget-screen.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("offers Try again, refetching the directives and the interval totals", () => {
    expect(
      source.includes(
        '<Textstyle={styles.stateText}>{t("budgetLoadFailed")}</Text><CardLoadFailureonRetry={()=>voidonRefresh()}/>',
      ),
    ).toBe(true);
    expect(
      source.includes(
        "awaitPromise.all([refetch(),client.refetchQueries({include:[GetLedgerIntervalTotalsDocument],}),]);",
      ),
    ).toBe(true);
  });

  it("catches a failed pull instead of rejecting", () => {
    const refresh = source.slice(source.indexOf("constonRefresh=async()=>{"));
    const caught = refresh.indexOf("}catch{");
    expect(caught > refresh.indexOf("awaitPromise.all(")).toBe(true);
    expect(caught < refresh.indexOf("}finally{")).toBe(true);
  });
});
