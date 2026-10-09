import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import { rowDisclosure } from "../flatten-rows";

// Executes the real AccountTableRow. A navigating parent had no name of its
// own, so iOS concatenated its children and the nested chevron's command came
// first: "Collapse Assets, Assets, $69,347.79" on a row whose activation opens
// Assets. The row is now named for the account it opens; disclosure stays a
// custom action.
type Node = { type: unknown; props: Record<string, any>; children: unknown[] };

const react = {
  memo: (component: unknown) => component,
  useCallback: (fn: unknown) => fn,
  useMemo: (fn: () => unknown) => fn(),
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value, () => undefined],
  createElement: (type: unknown, props: any, ...children: unknown[]): Node => ({
    type,
    props: props ?? {},
    children: children
      .flat()
      .filter((child) => child != null && child !== false),
  }),
};
const stub: any = new Proxy(function () {}, {
  get: (_target, key) => (key === "__esModule" ? true : stub),
  apply: () => stub,
});
const t = (key: string, params?: { account?: string }) =>
  params?.account ? `${key} ${params.account}` : key;

function loadRow(): (props: Record<string, unknown>) => Node {
  const exports: Record<string, any> = {};
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", "account-table.tsx"), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
      },
    },
  ).outputText;
  const modules: Record<string, unknown> = {
    react,
    "react-native": {
      StyleSheet: { create: (styles: unknown) => styles },
      Text: "Text",
      View: "View",
      TouchableOpacity: "TouchableOpacity",
      FlatList: "FlatList",
      useWindowDimensions: () => ({ fontScale: 1 }),
    },
    "@/common/hooks/use-theme-style": { useThemeStyle: (fn: any) => fn(stub) },
    "@/common/theme": new Proxy(
      {
        useTheme: () => ({ colorTheme: stub }),
        prefersStackedLayout: () => false,
      },
      { get: (target: any, key) => (key in target ? target[key] : stub) },
    ),
    "@/common/hooks/use-translations": {
      useTranslations: () => ({ t, locale: "en" }),
    },
    "@/common/number-utils": {
      formatSignedMoneyWithCurrency: (value: number) => `$${value}`,
    },
    "@/common/balance-display": {
      formatHolding: (units: { number: number; currency: string }) =>
        `${units.number} ${units.currency}`,
    },
    "@/common/valuation": {
      balanceNotes: (display: { notes: string[] }) => display.notes,
    },
    "./flatten-rows": { rowDisclosure, flattenRows: () => [] },
    "@/common/rtl": {
      LEADING_TEXT_ALIGN: "left",
      directionalIcon: (n: string) => n,
    },
  };
  vm.runInNewContext(`${source}\nexports.AccountTableRow = AccountTableRow;`, {
    exports,
    React: react,
    require: (id: string) => (id in modules ? modules[id] : stub),
  });
  return exports.AccountTableRow;
}

const AccountTableRow = loadRow();
const row = (overrides: Record<string, unknown>) => ({
  key: "Assets",
  account: "Assets",
  category: "Assets",
  depth: 0,
  value: 69347.79,
  share: 0,
  hasChildren: true,
  expanded: true,
  ...overrides,
});
const render = (rowOverrides: Record<string, unknown>, extra = {}) =>
  AccountTableRow({
    row: row(rowOverrides),
    label: "Assets",
    currency: "USD",
    stacked: false,
    onToggle: () => toggles.push("toggle"),
    onPressAccount: (account: string) => opened.push(account),
    ...extra,
  });
let toggles: string[] = [];
let opened: string[] = [];

describe("AccountTable navigating row names", () => {
  beforeEach(() => {
    toggles = [];
    opened = [];
  });

  it("names an expanded or collapsed parent for the account it opens", () => {
    for (const expanded of [true, false]) {
      const parent = render({ expanded });
      expect(parent.props.accessibilityLabel).toBe("Assets, $69347.79");
      expect(/^(expand|collapse)/i.test(parent.props.accessibilityLabel)).toBe(
        false,
      );
      expect(parent.props.accessibilityActions[0].name).toBe(
        expanded ? "collapse" : "expand",
      );
      parent.props.onPress();
      parent.props.onAccessibilityAction({
        nativeEvent: { actionName: expanded ? "collapse" : "expand" },
      });
    }
    expect(opened).toEqual(["Assets", "Assets"]);
    expect(toggles).toEqual(["toggle", "toggle"]);
  });

  it("uses the full path, commodity units and every balance note below the category", () => {
    const child = AccountTableRow({
      row: row({
        key: "Assets:Brokerage:NWRB",
        account: "Assets:Brokerage:NWRB",
        depth: 2,
        hasChildren: false,
        expanded: false,
      }),
      label: "NWRB",
      currency: "USD",
      display: {
        kind: "units",
        units: { number: 380, currency: "NWRB" },
        notes: ["$4,199.00 at market", "Price not updated"],
      },
      stacked: false,
      onToggle() {},
      onPressAccount() {},
    });
    expect(child.props.accessibilityLabel).toBe(
      "Assets:Brokerage:NWRB, 380 NWRB, $4,199.00 at market, Price not updated",
    );
    expect(child.props.accessibilityActions).toBe(undefined);
  });

  it("leaves the non-navigating toggle row to its own expanded state", () => {
    const toggleOnly = render({}, { onPressAccount: undefined });
    expect(toggleOnly.props.accessibilityLabel).toBe(undefined);
    expect(toggleOnly.props.accessibilityState.expanded).toBe(true);
  });
});
