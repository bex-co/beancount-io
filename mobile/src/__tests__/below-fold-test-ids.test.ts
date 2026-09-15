import fs from "fs";
import path from "path";

/**
 * Static guardrail: below-fold Home and Reports surfaces stay inspectable by
 * automation. expo-mcp has no scroll tool, and `automation_find_view` matches
 * the accessibility identifier only, so a surface below the fold can be
 * verified only when it carries a `testID`. Accessible names stay unchanged.
 */
const read = (file: string) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const count = (source: string, needle: string) =>
  source.split(needle).length - 1;

describe("below-fold test identifiers", () => {
  it("identifies every Reports category row, expandable or not", () => {
    const source = read(
      "screens/reports-screen/components/category-breakdown.tsx",
    );
    expect(count(source, "testID={`category-row-${node.account}`}")).toBe(4);
    expect(count(source, "accessibilityLabel={node.name}")).toBe(2);
  });

  it("identifies Home budget rows by account and currency", () => {
    const source = read("screens/home-screen/components/budget-card.tsx");
    expect(
      source.includes("testID={`budget-row-${row.account}-${row.currency}`}"),
    ).toBe(true);
    expect(source.includes("accessibilityLabel={row.account}")).toBe(true);
  });

  it("identifies the Home spending card and the Reports account-transactions card", () => {
    expect(
      read("screens/home-screen/components/spending-card.tsx").includes(
        'testID="spending-card"',
      ),
    ).toBe(true);
    expect(
      read(
        "screens/reports-screen/components/account-transactions-card.tsx",
      ).includes('testID="account-transactions-card"'),
    ).toBe(true);
  });

  it("forwards a DashboardCard testID to its root view", () => {
    expect(
      read("components/dashboard-card/index.tsx").includes("testID={testID}"),
    ).toBe(true);
  });
});
