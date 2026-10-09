import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";

// Executes the real ValuationSheet and inspects its accessibility tree. The
// full-screen backdrop was an accessible button named "Done", and an
// accessible parent is one element on iOS: the heading, the holdings and the
// footer action inside it were unreachable.
type Node = { type: unknown; props: Record<string, any>; children: unknown[] };

const react = {
  createElement: (type: unknown, props: any, ...children: unknown[]): Node => ({
    type,
    props: props ?? {},
    children: children
      .flat()
      .filter((child) => child != null && child !== false),
  }),
};

function load(): (props: Record<string, unknown>) => Node | null {
  const exports: Record<string, any> = {};
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
      },
    },
  ).outputText;
  const modules: Record<string, unknown> = {
    "react-native": {
      Modal: "Modal",
      Pressable: "Pressable",
      ScrollView: "ScrollView",
      Text: "Text",
      View: "View",
      StyleSheet: { create: (styles: unknown) => styles },
    },
    "expo-web-browser": { openBrowserAsync: () => undefined },
    "@expo/vector-icons": { Ionicons: "Icon" },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ bottom: 34 }),
    },
    "@/common/theme": { useTheme: () => ({ colorTheme: {} }) },
    "@/common/hooks/use-theme-style": { useThemeStyle: (fn: any) => fn({}) },
    "@/common/hooks/use-translations": {
      useTranslations: () => ({ t: (key: string) => key, locale: "en" }),
    },
    "@/common/date-format": { formatLedgerDateShort: (date: string) => date },
    "@/common/balance-display": {
      formatHolding: (holding: { number: number; currency: string }) =>
        `${holding.number} ${holding.currency}`,
    },
    "@/common/valuation": {
      stalePrices: (valuation: { priced: { stale: boolean }[] }) =>
        valuation.priced.filter((holding) => holding.stale),
    },
    "@/common/app-links/build-ledger-url": { buildLedgerUrl: () => "" },
    "@/common/vars/server-url": { getServerUrl: () => "" },
    "@/components/button": { Button: "Button" },
    "@/common/guest/guest-context": { useGuest: () => null },
  };
  vm.runInNewContext(source, {
    exports,
    React: react,
    require: (id: string) => modules[id],
  });
  return exports.ValuationSheet;
}

function findAll(node: unknown, match: (node: Node) => boolean): Node[] {
  if (!node || typeof node !== "object") return [];
  const element = node as Node;
  return (match(element) ? [element] : []).concat(
    ...element.children.map((child) => findAll(child, match)),
  );
}

const ValuationSheet = load();
const holding = (currency: string, stale: boolean) => ({
  number: 10,
  currency,
  stale,
  managed: false,
  priceDate: "2026-09-01",
});

describe("ValuationSheet accessibility", () => {
  let closes = 0;
  const modal = ValuationSheet({
    valuation: {
      priced: [holding("NWRB", true), holding("VBMPX", false)],
      atCostNoPrice: [holding("RGAGX", false)],
      notInTotal: [],
    },
    ledgerId: "open_ledger/stock-example",
    onClose: () => (closes += 1),
  })!;
  const [backdrop] = modal.children as Node[];
  const [sheet] = backdrop.children as Node[];

  it("keeps the backdrop a touch target, not an element grouping the sheet", () => {
    expect(backdrop.props.accessible).toBe(false);
    expect(backdrop.props.accessibilityLabel).toBe(undefined);
    expect(backdrop.props.accessibilityRole).toBe(undefined);
    backdrop.props.onPress();
    expect(closes).toBe(1);
  });

  it("scopes assistive tech to the sheet and lets the escape gesture close it", () => {
    expect(sheet.props.accessibilityViewIsModal).toBe(true);
    expect(sheet.props.accessible).toBe(false);
    sheet.props.onAccessibilityEscape();
    expect(closes).toBe(2);
    sheet.props.onPress();
    expect(closes).toBe(2);
  });

  it("exposes the heading, Done, every holding and the footer action", () => {
    expect(
      findAll(sheet, (node) => node.props.accessibilityRole === "header")
        .length,
    ).toBe(1);
    const done = findAll(
      sheet,
      (node) =>
        node.props.accessibilityRole === "button" &&
        node.props.accessibilityLabel === "done",
    );
    expect(done.length).toBe(1);
    const rows = findAll(sheet, (node) => node.props.accessible === true).map(
      (node) => node.props.accessibilityLabel,
    );
    expect(rows.length).toBe(3);
    expect(rows[0].includes("NWRB")).toBe(true);
    expect(rows[0].includes("valuationNotUpdated")).toBe(true);
    expect(findAll(sheet, (node) => node.type === "Button").length).toBe(1);
  });
});
