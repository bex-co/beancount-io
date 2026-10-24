import {
  selectTrialBalanceAccount,
  selectTrialBalanceCategories,
  selectTrialBalanceDisplays,
} from "../select-trial-balance";
import { selectAccountTreeFromRoot } from "../select-account-list";
import { TrialBalanceQuery } from "@/generated-graphql/graphql";

type Child = {
  account: string;
  balanceChildren: Record<string, number | string>;
  children?: Child[];
};

type Root = {
  account: string;
  total: Record<string, number | string>;
  children?: Child[];
};

function createTrialBalance(roots: {
  assets?: Root;
  liabilities?: Root;
  equity?: Root;
  income?: Root;
  expenses?: Root;
}): TrialBalanceQuery {
  const empty = (account: string) => ({
    account,
    balance: {},
    balanceChildren: {},
    children: [],
    hasTxns: false,
  });
  const toNode = (child: Child): unknown => ({
    account: child.account,
    balance: {},
    balanceChildren: child.balanceChildren,
    children: (child.children ?? []).map(toNode),
    hasTxns: true,
  });
  const toRoot = (root: Root | undefined, fallback: string) =>
    root
      ? {
          account: root.account,
          balance: {},
          balanceChildren: root.total,
          children: (root.children ?? []).map(toNode),
          hasTxns: true,
        }
      : empty(fallback);
  return {
    getLedgerTrialBalance: {
      assetsHierarchyData: toRoot(roots.assets, "Assets"),
      liabilitiesHierarchyData: toRoot(roots.liabilities, "Liabilities"),
      equityHierarchyData: toRoot(roots.equity, "Equity"),
      incomeHierarchyData: toRoot(roots.income, "Income"),
      expensesHierarchyData: toRoot(roots.expenses, "Expenses"),
    },
  } as unknown as TrialBalanceQuery;
}

describe("selectTrialBalanceCategories", () => {
  it("returns nothing without data or a currency", () => {
    expect(selectTrialBalanceCategories("USD", undefined)).toEqual([]);
    expect(selectTrialBalanceCategories("", createTrialBalance({}))).toEqual(
      [],
    );
  });

  it("orders the five categories conventionally, keeping the ledger's signs", () => {
    // The real figures from the web dashboard's all-accounts table.
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: "96156.71150", VACHR: "96" },
        children: [
          { account: "Assets:US", balanceChildren: { USD: "96156.71150" } },
        ],
      },
      liabilities: {
        account: "Liabilities",
        total: { USD: -902.36 },
        children: [
          { account: "Liabilities:US", balanceChildren: { USD: -902.36 } },
        ],
      },
      equity: {
        account: "Equity",
        total: { USD: -3919.69 },
        children: [
          { account: "Equity:Opening", balanceChildren: { USD: -3919.69 } },
        ],
      },
      income: {
        account: "Income",
        total: { USD: -323098.97 },
        children: [
          { account: "Income:Salary", balanceChildren: { USD: -323098.97 } },
        ],
      },
      expenses: {
        account: "Expenses",
        total: { USD: 231764.23 },
        children: [
          { account: "Expenses:Food", balanceChildren: { USD: 231764.23 } },
        ],
      },
    });
    const result = selectTrialBalanceCategories("USD", data);
    expect(result.map((c) => c.key)).toEqual([
      "assets",
      "liabilities",
      "equity",
      "income",
      "expenses",
    ]);
    // Credit-normal categories stay negative, as the ledger and the dashboard
    // hold them — which is what makes the five reconcile.
    expect(result.map((c) => c.value)).toEqual([
      96156.7115, -902.36, -3919.69, -323098.97, 231764.23,
    ]);
    const sum = result.reduce((total, c) => total + c.value, 0);
    expect(Math.abs(sum) < 0.1).toBe(true);
  });

  it("ignores commodities that have no value in the active currency", () => {
    // VACHR (vacation hours) can't convert, so it stays under its own key and is
    // left out of the total — exactly what the dashboard shows.
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: 100, VACHR: "96", IRAUSD: "4100.00" },
      },
    });
    expect(selectTrialBalanceCategories("USD", data)[0].value).toBe(100);
  });

  it("carries the ledger's own root account for drilling in", () => {
    const data = createTrialBalance({
      // A ledger that renamed its roots via `option "name_assets"`.
      assets: { account: "Activa", total: { USD: 100 } },
    });
    expect(selectTrialBalanceCategories("USD", data)[0].account).toBe("Activa");
  });

  it("drops categories the ledger doesn't use", () => {
    const data = createTrialBalance({
      assets: { account: "Assets", total: { USD: 100 } },
    });
    expect(selectTrialBalanceCategories("USD", data).map((c) => c.key)).toEqual(
      ["assets"],
    );
  });

  it("keeps metadata-only accounts visible before their first posting", () => {
    const data = createTrialBalance({});
    const result = selectTrialBalanceCategories("USD", data, [
      "Assets:Bank:Checking",
    ]);

    expect(result.map((category) => category.key)).toEqual(["assets"]);
    expect(result[0].children).toEqual([
      {
        account: "Assets:Bank:Checking",
        name: "Bank:Checking",
        value: 0,
        children: [],
      },
    ]);
  });

  it("does not duplicate compressed ancestors from metadata", () => {
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: 10 },
        children: [
          {
            account: "Assets:Bank",
            balanceChildren: { USD: 10 },
            children: [
              {
                account: "Assets:Bank:Checking",
                balanceChildren: { USD: 10 },
              },
            ],
          },
        ],
      },
    });
    const [assets] = selectTrialBalanceCategories("USD", data, [
      "Assets:Bank",
      "Assets:Bank:Checking",
    ]);

    expect(assets.children.map((account) => account.account)).toEqual([
      "Assets:Bank:Checking",
    ]);
  });

  it("keeps a zero-balance account the API returns inside its real parent", () => {
    // The regression: a zero leaf was filtered out of the tree and then pushed
    // back on flat at category level, so it escaped the branch that owns it.
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: 15 },
        children: [
          {
            account: "Assets:Bank",
            balanceChildren: { USD: 10 },
            children: [
              { account: "Assets:Bank:Checking", balanceChildren: { USD: 10 } },
              { account: "Assets:Bank:Savings", balanceChildren: { USD: 0 } },
            ],
          },
          // A second top-level branch, so the category's own pass-through skip
          // doesn't flatten Bank's row before we can look at its children.
          { account: "Assets:Cash", balanceChildren: { USD: 5 } },
        ],
      },
    });
    const [assets] = selectTrialBalanceCategories("USD", data, [
      "Assets:Bank:Checking",
      "Assets:Bank:Savings",
    ]);
    expect(assets.children.map((node) => node.account)).toEqual([
      "Assets:Bank",
      "Assets:Cash",
    ]);
    expect(assets.children[0].children.map((node) => node.account)).toEqual([
      "Assets:Bank:Checking",
      "Assets:Bank:Savings",
    ]);
    // Balances are untouched by the inclusion.
    expect(assets.children[0].value).toBe(10);
    expect(assets.children[0].children[1].value).toBe(0);
  });

  it("creates the missing intermediate parent of a metadata-only account", () => {
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: 120 },
        children: [
          {
            account: "Assets:NonCurrent",
            balanceChildren: { USD: 100 },
            children: [
              {
                account: "Assets:NonCurrent:Property",
                balanceChildren: { USD: 100 },
              },
            ],
          },
          { account: "Assets:Current", balanceChildren: { USD: 20 } },
        ],
      },
    });
    const [assets] = selectTrialBalanceCategories("USD", data, [
      "Assets:NonCurrent:Goodwill",
    ]);
    // Goodwill joins the NonCurrent branch rather than becoming a sibling of it.
    expect(assets.children.map((node) => node.account)).toEqual([
      "Assets:NonCurrent",
      "Assets:Current",
    ]);
    expect(assets.children[0].children.map((node) => node.name)).toEqual([
      "Property",
      "Goodwill",
    ]);
  });

  it("does not duplicate an intermediate shared by two metadata accounts", () => {
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: 20 },
        children: [{ account: "Assets:Current", balanceChildren: { USD: 20 } }],
      },
    });
    const [assets] = selectTrialBalanceCategories("USD", data, [
      "Assets:NonCurrent:Goodwill",
      "Assets:NonCurrent:Goodwill",
      "Assets:NonCurrent:Patents",
    ]);
    // One NonCurrent row holding both leaves, each listed once.
    expect(assets.children.map((node) => node.name)).toEqual([
      "Current",
      "NonCurrent",
    ]);
    expect(assets.children[1].children.map((node) => node.name)).toEqual([
      "Goodwill",
      "Patents",
    ]);
  });

  it("compresses a chain that is zero all the way down, like any other chain", () => {
    const data = createTrialBalance({});
    const [assets] = selectTrialBalanceCategories("USD", data, [
      "Assets:NonCurrent:Intangible:Goodwill",
    ]);
    // Single-child chains carrying one balance fold into a row whose label
    // keeps every segment — the same rule `Liabilities:US:Chase:Slate` follows.
    expect(assets.children).toEqual([
      {
        account: "Assets:NonCurrent:Intangible:Goodwill",
        name: "NonCurrent:Intangible:Goodwill",
        value: 0,
        children: [],
      },
    ]);
  });

  it("ignores metadata accounts belonging to another category", () => {
    const data = createTrialBalance({
      assets: { account: "Assets", total: { USD: 100 } },
    });
    const result = selectTrialBalanceCategories("USD", data, [
      "Expenses:Food:Coffee",
    ]);
    const assets = result.find((category) => category.key === "assets");
    const expenses = result.find((category) => category.key === "expenses");
    expect(assets?.children).toEqual([]);
    expect(expenses?.children.map((node) => node.account)).toEqual([
      "Expenses:Food:Coffee",
    ]);
  });

  it("compresses each category's account tree", () => {
    const data = createTrialBalance({
      liabilities: {
        account: "Liabilities",
        total: { USD: -902.36 },
        children: [
          {
            account: "Liabilities:US",
            balanceChildren: { USD: -902.36 },
            children: [
              {
                account: "Liabilities:US:Chase",
                balanceChildren: { USD: -902.36 },
                children: [
                  {
                    account: "Liabilities:US:Chase:Slate",
                    balanceChildren: { USD: -902.36 },
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    const [liabilities] = selectTrialBalanceCategories("USD", data);
    expect(liabilities.value).toBe(-902.36);
    expect(liabilities.children.map((n) => n.name)).toEqual(["US:Chase:Slate"]);
    expect(liabilities.children[0].account).toBe("Liabilities:US:Chase:Slate");
  });
});

// Two Assets accounts of the Beancount example ledger: a fund held at cost and
// vacation hours, which have no cost.
function exampleAssets(
  rgagx: Record<string, string>,
  vacation: Record<string, string>,
  total: Record<string, string>,
): TrialBalanceQuery {
  return createTrialBalance({
    assets: {
      account: "Assets",
      total,
      children: [
        { account: "Assets:Vanguard:RGAGX", balanceChildren: rgagx },
        { account: "Assets:Hoogle:Vacation", balanceChildren: vacation },
      ],
    },
  });
}
const exampleAtCost = exampleAssets(
  { USD: "49049.66613" },
  { VACHR: "-13" },
  { USD: "49049.66613", VACHR: "-13" },
);
// The same accounts at market: RGAGX at its 2017-09-08 close of 81.09.
const exampleMarket = exampleAssets(
  { USD: "48471.38532" },
  { VACHR: "-13" },
  { USD: "48471.38532", VACHR: "-13" },
);
const exampleUnits = exampleAssets(
  { RGAGX: "597.748" },
  { VACHR: "-13" },
  { RGAGX: "597.748", VACHR: "-13" },
);
const EXAMPLE_PRICES = [
  { base: "RGAGX", quote: "USD", prices: [{ date: "2017-09-08" }] },
];
const TODAY = "2026-09-26";

describe("selectTrialBalanceDisplays", () => {
  it("keys the category by its row key and accounts by their full name", () => {
    const displays = selectTrialBalanceDisplays(
      "USD",
      exampleMarket,
      exampleUnits,
      EXAMPLE_PRICES,
      TODAY,
    );
    const assets = displays.get("assets");
    expect(assets?.kind === "money" && assets.value).toBe(48471.38532);
    expect(assets?.kind === "money" && assets.notInTotal).toEqual([
      { currency: "VACHR", number: -13, scale: 0 },
    ]);
    expect(displays.get("Assets:Vanguard:RGAGX")).toEqual({
      kind: "units",
      units: { currency: "RGAGX", number: 597.748, scale: 3 },
      value: { amount: 48471.38532, basis: "market" },
      notInTotal: [],
    });
    expect(displays.get("Assets:Hoogle:Vacation")).toEqual({
      kind: "units",
      units: { currency: "VACHR", number: -13, scale: 0 },
      value: null,
      notInTotal: [],
    });
  });

  it("gives a root what Home's matching page discloses", () => {
    const assets = selectTrialBalanceDisplays(
      "USD",
      exampleMarket,
      exampleUnits,
      EXAMPLE_PRICES,
      TODAY,
    ).get("assets");
    const valuation = assets?.kind === "money" ? assets.valuation : undefined;
    expect(valuation?.priced.map((holding) => holding.currency)).toEqual([
      "RGAGX",
    ]);
    expect(valuation?.priced[0]?.priceDate).toBe("2017-09-08");
    // The tree values at the latest price, so staleness is measured to today.
    expect(valuation?.priced[0]?.stale).toBe(true);
    expect(valuation?.cost).toBe(null);
  });

  it("gives a single-commodity root the valuation Home shows (w21/279)", () => {
    const hool = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: "1500" },
        children: [
          { account: "Assets:Broker", balanceChildren: { USD: "1500" } },
        ],
      },
    });
    const holdings = createTrialBalance({
      assets: {
        account: "Assets",
        total: { HOOL: "10" },
        children: [
          { account: "Assets:Broker", balanceChildren: { HOOL: "10" } },
        ],
      },
    });
    const assets = selectTrialBalanceDisplays(
      "USD",
      hool,
      holdings,
      [{ base: "HOOL", quote: "USD", prices: [{ date: "2026-08-01" }] }],
      "2026-10-21",
    ).get("assets");
    expect(assets?.kind).toBe("units");
    const valuation = assets?.kind === "units" ? assets.valuation : undefined;
    expect(valuation?.priced[0]?.stale).toBe(true);
    expect(valuation?.priced[0]?.priceDate).toBe("2026-08-01");
  });

  it("reads a commodity the ledger has no price for at cost", () => {
    const displays = selectTrialBalanceDisplays(
      "USD",
      exampleAtCost,
      exampleUnits,
      [],
      TODAY,
    );
    expect(displays.get("Assets:Vanguard:RGAGX")).toEqual({
      kind: "units",
      units: { currency: "RGAGX", number: 597.748, scale: 3 },
      value: { amount: 49049.66613, basis: "cost" },
      notInTotal: [],
    });
    const assets = displays.get("assets");
    expect(assets?.kind === "money" && assets.valuation?.atCostNoPrice).toEqual(
      [{ currency: "RGAGX", number: 597.748, scale: 3 }],
    );
  });

  it("leaves the basis unknown while the prices are", () => {
    const displays = selectTrialBalanceDisplays(
      "USD",
      exampleMarket,
      exampleUnits,
      undefined,
      TODAY,
    );
    const rgagx = displays.get("Assets:Vanguard:RGAGX");
    expect(rgagx?.kind === "units" && rgagx.value?.basis).toBe(null);
  });

  it("gives only the roots a valuation, not the parents beneath them", () => {
    const tree = (fund: Record<string, string>, cash: Record<string, string>) =>
      createTrialBalance({
        assets: {
          account: "Assets",
          total: { ...fund, ...cash },
          children: [
            {
              account: "Assets:Vanguard",
              balanceChildren: { ...fund, ...cash },
              children: [
                { account: "Assets:Vanguard:RGAGX", balanceChildren: fund },
                { account: "Assets:Vanguard:Cash", balanceChildren: cash },
              ],
            },
          ],
        },
      });
    const displays = selectTrialBalanceDisplays(
      "USD",
      tree({ USD: "48471.38532" }, {}),
      tree({ RGAGX: "597.748" }, { USD: "5" }),
      EXAMPLE_PRICES,
      TODAY,
    );
    const parent = displays.get("Assets:Vanguard");
    expect(parent?.kind).toBe("money");
    expect(parent?.kind === "money" && parent.valuation).toBe(undefined);
    const root = displays.get("assets");
    expect(root?.kind === "money" && root.valuation?.valuesHoldings).toBe(true);
  });

  it("still reads an unconverted commodity in units before the units read lands", () => {
    const displays = selectTrialBalanceDisplays(
      "USD",
      exampleMarket,
      undefined,
      EXAMPLE_PRICES,
      TODAY,
    );
    expect(displays.get("Assets:Hoogle:Vacation")?.kind).toBe("units");
    expect(displays.get("Assets:Vanguard:RGAGX")?.kind).toBe("money");
  });

  it("is empty without the valued read", () => {
    expect(
      selectTrialBalanceDisplays(
        "USD",
        undefined,
        exampleUnits,
        EXAMPLE_PRICES,
        TODAY,
      ).size,
    ).toBe(0);
  });
});

describe("selectTrialBalanceAccount", () => {
  it("finds an account's balance anywhere in the five trees", () => {
    expect(
      selectTrialBalanceAccount(exampleMarket, "Assets:Vanguard:RGAGX"),
    ).toEqual({ USD: "48471.38532" });
    expect(selectTrialBalanceAccount(exampleMarket, "Assets")).toEqual({
      USD: "48471.38532",
      VACHR: "-13",
    });
  });

  it("finds nothing for an unknown account or a read that has not landed", () => {
    expect(selectTrialBalanceAccount(exampleMarket, "Assets:Nope")).toBe(
      undefined,
    );
    expect(selectTrialBalanceAccount(undefined, "Assets:Vanguard:RGAGX")).toBe(
      undefined,
    );
  });
});

describe("selectTrialBalanceCategories with unconverted holdings", () => {
  it("keeps a balance of only unconverted commodities without ledger metadata", () => {
    // Zero in USD, but not empty: the zero-value filter must not drop it.
    const [assets] = selectTrialBalanceCategories("USD", exampleAtCost);
    expect(assets.children.map((node) => node.account)).toEqual([
      "Assets:Vanguard:RGAGX",
      "Assets:Hoogle:Vacation",
    ]);
    expect(assets.value).toBe(49049.66613);
  });

  it("does not fold a parent holding its own unconverted commodities into its child", () => {
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: "505", VACHR: "-13" },
        children: [
          {
            account: "Assets:Hoogle",
            balanceChildren: { USD: "500", VACHR: "-13" },
            children: [
              {
                account: "Assets:Hoogle:Checking",
                balanceChildren: { USD: "500" },
              },
            ],
          },
          { account: "Assets:Cash", balanceChildren: { USD: "5" } },
        ],
      },
    });
    // The Accounts view keeps Hoogle's row, since the VACHR lives there alone.
    const [assets] = selectTrialBalanceCategories("USD", data);
    expect(assets.children.map((node) => node.name)).toEqual([
      "Hoogle",
      "Cash",
    ]);
    expect(assets.children[0].children.map((node) => node.name)).toEqual([
      "Checking",
    ]);
    // A report view compares values only, and folds the chain as before.
    const root = data.getLedgerTrialBalance.assetsHierarchyData;
    expect(
      selectAccountTreeFromRoot("USD", root).map((node) => node.name),
    ).toEqual(["Hoogle:Checking", "Cash"]);
  });
});

// w21/099: a closed, emptied account stayed in the tree as a live "$0.00" row,
// because every opened account was kept at zero.
describe("closed accounts in the Accounts tree", () => {
  const { listedAccountsAsOf } = require("../../../common/account-close-dates");
  type Node = { account: string; children: Node[] };
  const flatten = (nodes: Node[]): string[] =>
    nodes.flatMap((node) => [node.account, ...flatten(node.children)]);

  const data = createTrialBalance({
    assets: {
      account: "Assets",
      total: { USD: 15 },
      children: [
        {
          account: "Assets:Bank",
          balanceChildren: { USD: 15 },
          children: [
            { account: "Assets:Bank:Checking", balanceChildren: { USD: 10 } },
            { account: "Assets:Bank:Old", balanceChildren: { USD: 0 } },
            { account: "Assets:Bank:Leftover", balanceChildren: { USD: 5 } },
          ],
        },
      ],
    },
  });
  const opened = [
    "Assets:Bank:Checking",
    "Assets:Bank:Old",
    "Assets:Bank:Leftover",
    "Assets:Bank:New",
  ];
  const closeDates = new Map([
    ["Assets:Bank:Old", "2026-08-04"],
    ["Assets:Bank:Leftover", "2026-08-04"],
  ]);
  const tree = flatten(
    selectTrialBalanceCategories(
      "USD",
      data,
      listedAccountsAsOf(opened, "2026-10-21", closeDates),
    )[0].children as Node[],
  );

  it("leaves out a closed account the ledger emptied", () => {
    expect(tree.includes("Assets:Bank:Old")).toBe(false);
  });

  it("keeps a closed account with a balance left, and a new empty one", () => {
    expect(tree.includes("Assets:Bank:Leftover")).toBe(true);
    expect(tree.includes("Assets:Bank:New")).toBe(true);
    expect(tree.includes("Assets:Bank:Checking")).toBe(true);
  });

  it("lists an account closing in the future", () => {
    expect(
      listedAccountsAsOf(
        ["Assets:Bank:Old"],
        "2026-08-03",
        new Map([["Assets:Bank:Old", "2026-08-04"]]),
      ),
    ).toEqual(["Assets:Bank:Old"]);
  });

  // w21/614: an account opening in December was a live "$0.00" row in October.
  it("leaves out an account that opens after today", () => {
    const { closeDatesOf } = require("../../../common/account-close-dates");
    const dates = closeDatesOf([
      { account: "Liabilities:NewCard", openedAt: "2026-12-01" },
      { account: "Liabilities:Card", openedAt: "2025-01-01" },
    ]);
    expect(
      listedAccountsAsOf(
        ["Liabilities:NewCard", "Liabilities:Card"],
        "2026-10-22",
        dates,
      ),
    ).toEqual(["Liabilities:Card"]);
    expect(
      listedAccountsAsOf(["Liabilities:NewCard"], "2026-12-01", dates),
    ).toEqual(["Liabilities:NewCard"]);
  });

  it("is what the Accounts tab grafts", () => {
    const source = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "..",
        "..",
        "screens",
        "accounts-screen",
        "accounts-screen.tsx",
      ),
      "utf8",
    ) as string;
    expect(
      source.includes(
        "selectTrialBalanceCategories(currency, accountData, listed)",
      ),
    ).toBe(true);
  });
});

// w21/976: the zero-balance graft was quadratic in the number of accounts.
describe("selectTrialBalanceCategories with a very large chart", () => {
  const count = 5000;
  const parents = count / 40;
  const leafOf = (i: number) => `Assets:Group${i % parents}:Leaf${i}`;
  const names = Array.from({ length: count }, (_, i) => leafOf(i));
  const held: Record<string, number | string> = { USD: 1 };
  const trial = createTrialBalance({
    assets: {
      account: "Assets",
      total: { USD: count },
      children: Array.from({ length: parents }, (_, p) => ({
        account: `Assets:Group${p}`,
        balanceChildren: { USD: 40 } as Record<string, number | string>,
        children: Array.from({ length: 40 }, (_, k) => ({
          account: leafOf(p + k * parents),
          balanceChildren: held,
        })),
      })),
    },
  });

  it("lists every account once, nested under its parent", () => {
    const categories = selectTrialBalanceCategories("USD", trial, names);
    const assets = categories.find((category) => category.key === "assets");
    const flat: string[] = [];
    const walk = (nodes: { account: string; children?: unknown[] }[]) => {
      for (const node of nodes) {
        flat.push(node.account);
        walk((node.children ?? []) as never);
      }
    };
    walk((assets?.children ?? []) as never);
    expect(new Set(flat).size).toBe(flat.length);
    expect(flat.includes("Assets:Group7:Leaf7")).toBe(true);
    expect(flat.length >= count).toBe(true);
  });

  it("builds in well under the quadratic time it took", () => {
    const start = Date.now();
    selectTrialBalanceCategories("USD", trial, names);
    // Several hundred ms on Node before; a generous bound for a loaded machine.
    expect(Date.now() - start < 150).toBe(true);
  });
});
