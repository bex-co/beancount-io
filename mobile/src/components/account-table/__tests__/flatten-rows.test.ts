import { flattenRows } from "../flatten-rows";
import type {
  AccountCategory,
  AccountNode,
} from "@/components/account-list/select-account-list";

const node = (
  account: string,
  value: number,
  children: AccountNode[] = [],
): AccountNode => ({
  account,
  name: account.split(":").slice(1).join(":"),
  value,
  children,
});

/** The screenshot's ledger: Assets and Liabilities, plus a collapsed Expenses. */
const categories: AccountCategory[] = [
  {
    key: "assets",
    account: "Assets",
    value: 2677.28,
    children: [
      node("Assets:US:BofA", 3313.42, [
        node("Assets:US:BofA:Checking", 3000),
        node("Assets:US:BofA:Savings", 313.42),
      ]),
      node("Assets:US:Vanguard:Cash", -1320.17),
      node("Assets:US:ETrade:Cash", 684.03),
    ],
  },
  {
    key: "liabilities",
    account: "Liabilities",
    value: 902.36,
    children: [node("Liabilities:US:Chase:Slate", 902.36)],
  },
  {
    key: "expenses",
    account: "Expenses",
    value: 9726.72,
    children: [node("Expenses:Food", 9726.72)],
  },
];

describe("flattenRows", () => {
  it("expands the balance sheet and collapses income-statement categories", () => {
    const rows = flattenRows(categories, {});
    expect(rows.map((r) => r.key)).toEqual([
      "assets",
      "Assets:US:BofA",
      "Assets:US:Vanguard:Cash",
      "Assets:US:ETrade:Cash",
      "liabilities",
      "Liabilities:US:Chase:Slate",
      // Expenses stays shut — long, and the Reports tab already covers it.
      "expenses",
    ]);
    expect(rows.filter((r) => r.depth === 0).map((r) => r.expanded)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it("labels category rows with their i18n key and accounts with their name", () => {
    const [category, account] = flattenRows(categories, {});
    expect(category.label).toBe("assets");
    expect(account.label).toBe("US:BofA");
    expect(account.account).toBe("Assets:US:BofA");
  });

  it("gives category rows their root account so they drill in like any other", () => {
    const rows = flattenRows(categories, {});
    expect(rows.filter((r) => r.depth === 0).map((r) => r.account)).toEqual([
      "Assets",
      "Liabilities",
      "Expenses",
    ]);
  });

  it("leaves a category fold-only when the ledger names no account for it", () => {
    const rows = flattenRows(
      [{ key: "equity", account: "", value: 10, children: [] }],
      {},
    );
    expect(rows[0].account).toBe("");
  });

  it("starts accounts collapsed below the top level", () => {
    const rows = flattenRows(categories, {});
    const bofa = rows.find((r) => r.key === "Assets:US:BofA");
    expect(bofa?.hasChildren).toBe(true);
    expect(bofa?.expanded).toBe(false);
    expect(rows.some((r) => r.key === "Assets:US:BofA:Checking")).toBe(false);
  });

  it("expands an account when the user overrides it", () => {
    const rows = flattenRows(categories, { "Assets:US:BofA": true });
    expect(rows.map((r) => r.key)).toEqual([
      "assets",
      "Assets:US:BofA",
      "Assets:US:BofA:Checking",
      "Assets:US:BofA:Savings",
      "Assets:US:Vanguard:Cash",
      "Assets:US:ETrade:Cash",
      "liabilities",
      "Liabilities:US:Chase:Slate",
      "expenses",
    ]);
    const checking = rows.find((r) => r.key === "Assets:US:BofA:Checking");
    expect(checking?.depth).toBe(2);
  });

  it("collapses a category when the user overrides it", () => {
    const rows = flattenRows(categories, { assets: false });
    expect(rows.map((r) => r.key)).toEqual([
      "assets",
      "liabilities",
      "Liabilities:US:Chase:Slate",
      "expenses",
    ]);
  });

  it("never marks a childless row expandable", () => {
    const rows = flattenRows(categories, { "Assets:US:ETrade:Cash": true });
    const leaf = rows.find((r) => r.key === "Assets:US:ETrade:Cash");
    expect(leaf?.hasChildren).toBe(false);
    expect(leaf?.expanded).toBe(false);
  });

  it("sizes share bars against the widest sibling, by magnitude", () => {
    const rows = flattenRows(categories, {});
    const share = (key: string) => rows.find((r) => r.key === key)?.share;
    // BofA is the widest of its level, so it fills its track.
    expect(share("Assets:US:BofA")).toBe(1);
    // The negative one is sized by magnitude — never a negative width.
    expect(share("Assets:US:Vanguard:Cash")).toBeCloseTo(1320.17 / 3313.42, 6);
    expect(share("Assets:US:ETrade:Cash")).toBeCloseTo(684.03 / 3313.42, 6);
    // Normalizing against the category total instead would overflow here: BofA
    // is 124% of Assets' $2,677.28.
    expect(rows.every((r) => r.share >= 0 && r.share <= 1)).toBe(true);
  });

  it("leaves an only child without a share bar", () => {
    // Liabilities has one row; a bar would always be full-width and say nothing.
    const rows = flattenRows(categories, {});
    expect(
      rows.find((r) => r.key === "Liabilities:US:Chase:Slate")?.share,
    ).toBe(0);
  });

  it("leaves category rows without a share bar", () => {
    // Assets and Expenses aren't comparable magnitudes — one is a balance, the
    // other a flow — so no category row gets a bar.
    const rows = flattenRows(categories, {});
    expect(rows.filter((r) => r.depth === 0).every((r) => r.share === 0)).toBe(
      true,
    );
  });

  it("handles an all-zero sibling set without dividing by zero", () => {
    const rows = flattenRows(
      [
        {
          key: "equity",
          account: "Equity",
          value: 0,
          children: [node("Equity:Opening", 0)],
        },
      ],
      { equity: true },
    );
    expect(rows.map((r) => r.share)).toEqual([0, 0]);
  });

  it("returns nothing for an empty ledger", () => {
    expect(flattenRows([], {})).toEqual([]);
  });
});
