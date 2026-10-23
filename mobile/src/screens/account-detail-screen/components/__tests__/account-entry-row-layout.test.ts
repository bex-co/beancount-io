import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as dynamicType from "../../../../common/theme/dynamic-type";

// Executes the real AccountEntryRow and inspects its resolved layout. At
// accessibility text sizes a one-line title beside the trailing values cut
// account-journal names to "Hoo…"; the row now stacks like the Transactions
// EntryRow.
type Node = { type: unknown; props: Record<string, any>; children: unknown[] };

let fontScale = 1;
const react = {
  createElement: (type: unknown, props: any, ...children: unknown[]): Node => ({
    type,
    props: props ?? {},
    children: children
      .flat()
      .filter((child) => child != null && child !== false && child !== ""),
  }),
};

function load(): (props: Record<string, unknown>) => Node {
  const exports: Record<string, any> = {};
  const source = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "..", "account-entry-row.tsx"),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
      },
    },
  ).outputText;
  const modules: Record<string, unknown> = {
    "react-native": {
      StyleSheet: { create: (styles: unknown) => styles },
      Text: "Text",
      View: "View",
      TouchableOpacity: "TouchableOpacity",
      useWindowDimensions: () => ({ fontScale }),
    },
    "@/common/theme": {
      fontSizes: {},
      fontWeights: {},
      useTheme: () => ({
        colorTheme: { success: "success", error: "error", black80: "neutral" },
      }),
    },
    "@/components/amount-text": { AmountText: "AmountText" },
    "@/components/account-type-icon": { AccountTypeIcon: "AccountTypeIcon" },
    "@/common/hooks/use-theme-style": { useThemeStyle: (fn: any) => fn({}) },
    "@/common/hooks/use-translations": {
      useTranslations: () => ({
        t: (key: string, values?: { amount?: string }) =>
          values?.amount ? `${values.amount} at cost` : key,
      }),
    },
    "@/common/number-utils": {
      formatSignedMoneyWithCurrency: (value: number) => `$${value}`,
      formatUnits: (value: number, currency: string) => `${value} ${currency}`,
    },
    "@/screens/account-detail-screen/utils/format-account-journal-balance": {
      formatAccountJournalBalance: (value: number) => `$${value}`,
      formatAccountJournalChange: (value: number) => `$${value}`,
    },
    "@/screens/account-detail-screen/selectors/select-account-journal": {
      directiveTypeLabelKey: (type: string) =>
        type === "Transaction" ? null : "directiveBalance",
    },
    "@/common/rtl": { LEADING_TEXT_ALIGN: "left" },
    "@/common/bidi": { isolateLtr: (text: string) => text },
    "@/common/theme/dynamic-type": dynamicType,
    // Import-free: the real one.
    "@/screens/account-detail-screen/selectors/select-change-tone": require("../../selectors/select-change-tone"),
    "@/screens/transactions-screen/entry-row/entry-row-flag": require("../../../transactions-screen/entry-row/entry-row-flag"),
    "@/screens/transactions-screen/entry-row/entry-row-date": require("../../../transactions-screen/entry-row/entry-row-date"),
  };
  vm.runInNewContext(source, {
    exports,
    React: react,
    require: (id: string) => modules[id],
  });
  return exports.AccountEntryRow;
}

const flat = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? Object.assign({}, ...style.map(flat))
    : style && typeof style === "object"
      ? (style as Record<string, unknown>)
      : {};
function findAll(node: unknown, match: (node: Node) => boolean): Node[] {
  if (!node || typeof node !== "object") return [];
  const element = node as Node;
  return (match(element) ? [element] : []).concat(
    ...element.children.map((child) => findAll(child, match)),
  );
}
const textOf = (node: Node): string =>
  node.children
    .map((child) => (typeof child === "string" ? child : textOf(child as Node)))
    .join("");

const AccountEntryRow = load();
const transfer = {
  title: "Transfering accumulated savings to other account",
  flag: "!",
  directiveType: "Transaction",
  change: -4500,
  balance: 207.46,
  moneyScale: 2,
  units: null,
  postings: [],
  payee: null,
};
const broker = {
  ...transfer,
  title: "Broker",
  flag: "*",
  change: -100,
  balance: 380,
  units: { currency: "NWRB", scale: 0, cost: -1045 },
};
const balanceDirective = {
  ...transfer,
  title: "Assets:Brokerage:NWRB",
  flag: "*",
  directiveType: "Balance",
  change: 0,
};

describe("AccountEntryRow at enlarged text", () => {
  afterEach(() => {
    fontScale = 1;
  });

  it("keeps the one-line row at ordinary sizes", () => {
    for (const scale of [1, 1.235]) {
      fontScale = scale;
      const row = AccountEntryRow({
        row: transfer,
        currency: "USD",
        onPress() {},
      });
      expect(flat(row.props.style).flexDirection).toBe("row");
      const title = findAll(row, (node) => node.type === "Text")[0];
      expect(title.props.numberOfLines).toBe(1);
    }
  });

  it("stacks values under a whole, wrapping name at accessibility sizes", () => {
    fontScale = 3.12;
    let pressed = 0;
    const row = AccountEntryRow({
      row: transfer,
      currency: "USD",
      onPress: () => (pressed += 1),
    });
    // The row's content is a fragment: [icon+name block, trailing values].
    const [main, trailing] = (row.children[0] as Node).children as Node[];
    const title = findAll(main, (node) => node.type === "Text")[0];

    expect(flat(row.props.style).flexDirection).toBe("column");
    expect(title.props.numberOfLines).toBe(undefined);
    expect(textOf(title)).toBe(transfer.title);
    expect(findAll(main, (node) => textOf(node) === "!").length > 0).toBe(true);
    expect(flat(trailing.props.style).alignItems).toBe("flex-start");
    expect(
      findAll(trailing, (node) => node.type === "AmountText").map(textOf),
    ).toEqual(["$-4500", "balance: $207.46"]);
    row.props.onPress();
    expect(pressed).toBe(1);
  });

  it("keeps commodity cost and directive badges when stacked", () => {
    fontScale = 3.12;
    const commodity = AccountEntryRow({ row: broker, currency: "USD" });
    expect(
      findAll(commodity, (node) => node.type === "AmountText").map(textOf),
    ).toEqual(["-100 NWRB", "$-1045 at cost", "balance: 380 NWRB"]);
    expect(commodity.type).toBe("View");

    const directive = AccountEntryRow({
      row: balanceDirective,
      currency: "USD",
    });
    expect(
      findAll(directive, (node) => textOf(node) === "directiveBalance").length >
        0,
    ).toBe(true);
    expect(flat(directive.props.style).flexDirection).toBe("column");
  });
});

describe("AccountEntryRow accessibility", () => {
  it("names an actionable row as one button from its visible text", () => {
    const row = AccountEntryRow({
      row: transfer,
      currency: "USD",
      onPress() {},
    });
    expect(row.props.accessibilityRole).toBe("button");
    expect(row.props.accessibilityLabel).toBe(
      "Transfering accumulated savings to other account, $-4500, balance: $207.46, pending",
    );
  });

  it("includes a commodity row's cost and omits pending when cleared", () => {
    const row = AccountEntryRow({ row: broker, currency: "USD", onPress() {} });
    expect(row.props.accessibilityLabel).toBe(
      "Broker, -100 NWRB, $-1045 at cost, balance: 380 NWRB",
    );
  });

  // w21/559: Open, Pad and Close rows read alike without their chip.
  it("says the type chip a directive row draws", () => {
    const row = AccountEntryRow({ row: balanceDirective, currency: "USD" });
    const label = String(row.props.accessibilityLabel).split(", ");
    expect(label[0]).toBe(balanceDirective.title);
    expect(label[1]).toBe("directiveBalance");
  });

  it("names no chip for a transaction", () => {
    const row = AccountEntryRow({
      row: transfer,
      currency: "USD",
      onPress() {},
    });
    expect(String(row.props.accessibilityLabel).includes("directive")).toBe(
      false,
    );
  });

  it("leaves non-interactive directive rows without a button role", () => {
    const row = AccountEntryRow({ row: balanceDirective, currency: "USD" });
    expect(row.type).toBe("View");
    expect(row.props.accessibilityRole).toBe(undefined);
  });
});

describe("AccountEntryRow change color", () => {
  // Colored by raw sign, salary read in the error color and spending in the
  // success color on Income and Expenses pages (w0/033). The amount keeps its
  // ledger sign; only the color follows the effect on net worth.
  const colorOf = (change: number, netWorthSign?: 1 | -1) => {
    const tree = AccountEntryRow({
      row: { ...transfer, flag: "*", change },
      currency: "USD",
      netWorthSign,
    });
    const [amount] = findAll(
      tree,
      (node) => node.type === "AmountText" && textOf(node) === `$${change}`,
    );
    return flat(amount.props.style).color;
  };

  it("reads an asset's inflow favorable and outflow unfavorable", () => {
    expect(colorOf(250)).toBe("success");
    expect(colorOf(-250)).toBe("error");
    expect(colorOf(250, 1)).toBe("success");
  });

  it("reads spending unfavorable and a refund favorable on an Expenses page", () => {
    expect(colorOf(33.71, -1)).toBe("error");
    expect(colorOf(-12, -1)).toBe("success");
  });

  it("reads salary favorable on an Income page, keeping its negative sign", () => {
    expect(colorOf(-4639.7, -1)).toBe("success");
  });

  it("leaves a zero change neutral either way", () => {
    expect(colorOf(0)).toBe("neutral");
    expect(colorOf(0, -1)).toBe("neutral");
  });

  // w21/713: a 10-for-1 split's +90 shares read as a green gain.
  it("leaves units that moved at no cost neutral, and a buy favorable", () => {
    const unitsColor = (change: number, cost: number) => {
      const tree = AccountEntryRow({
        row: {
          ...transfer,
          flag: "*",
          change,
          units: { currency: "QANVDA", scale: 0, cost },
        },
        currency: "USD",
      });
      const [amount] = findAll(
        tree,
        (node) =>
          node.type === "AmountText" && textOf(node) === `${change} QANVDA`,
      );
      return flat(amount.props.style).color;
    };
    expect(unitsColor(90, 0)).toBe("neutral");
    expect(unitsColor(10, 1000)).toBe("success");
  });
});

// w21/781: only "!" was marked, so a planned grocery run at the top of the
// journal read as money already spent.
describe("AccountEntryRow for a planned entry", () => {
  const forecast = {
    ...transfer,
    title: "Qa20261020 Groceries",
    flag: "#",
    date: "2026-10-30",
    change: -60,
    balance: 440,
  };
  const texts = (tree: Node) =>
    findAll(tree, (node) => node.type === "Text").map(textOf);

  it("shows Forecast and Upcoming, and says both", () => {
    const row = AccountEntryRow({
      row: forecast,
      currency: "USD",
      onPress() {},
      today: "2026-10-23",
    });
    expect(texts(row).includes("entryForecast")).toBe(true);
    expect(texts(row).includes("entryUpcoming")).toBe(true);
    expect(row.props.accessibilityLabel).toBe(
      "Qa20261020 Groceries, entryUpcoming, $-60, balance: $440, entryForecast",
    );
  });

  it("leaves a booked past row as it was", () => {
    const booked = { ...forecast, flag: "*", date: "2026-10-06" };
    const row = AccountEntryRow({
      row: booked,
      currency: "USD",
      onPress() {},
      today: "2026-10-23",
    });
    expect(texts(row)).toEqual(["Qa20261020 Groceries"]);
    expect(row.props.accessibilityLabel).toBe(
      "Qa20261020 Groceries, $-60, balance: $440",
    );
  });

  it("keeps a balance row's own detail after Upcoming", () => {
    const row = AccountEntryRow({
      row: {
        ...balanceDirective,
        date: "2026-11-01",
        detail: { kind: "note", text: "Statement" },
      },
      currency: "USD",
      today: "2026-10-23",
    });
    expect(texts(row).includes("entryUpcoming · Statement")).toBe(true);
  });
});
