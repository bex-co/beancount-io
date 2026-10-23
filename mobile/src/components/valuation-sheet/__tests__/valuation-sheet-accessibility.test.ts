import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as dynamicType from "../../../common/theme/dynamic-type";

// Executes the real ValuationSheet and inspects its accessibility tree. The
// full-screen backdrop was an accessible button named "Done", and an
// accessible parent is one element on iOS: the heading, the holdings and the
// footer action inside it were unreachable.
type Node = { type: unknown; props: Record<string, any>; children: unknown[] };

let fontScale = 1;
let guest: { requestSignIn: () => void } | null = null;

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
      useWindowDimensions: () => ({ fontScale }),
    },
    "@/common/theme/dynamic-type": dynamicType,
    "@/common/rtl": { LEADING_TEXT_ALIGN: "left" },
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
    "@/common/guest/guest-context": { useGuest: () => guest },
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
    canWrite: true,
    onClose: () => (closes += 1),
  })!;
  const [overlay] = modal.children as Node[];
  const [backdrop, sheet] = overlay.children as Node[];

  it("keeps the backdrop a touch target beside the sheet, not around it", () => {
    // Around the sheet it grouped it for VoiceOver and, as a touch responder,
    // kept the holdings from scrolling at large text sizes.
    expect(backdrop.type).toBe("Pressable");
    expect(backdrop.children.length).toBe(0);
    expect(sheet.type).toBe("View");
    expect(backdrop.props.accessible).toBe(false);
    expect(backdrop.props.accessibilityLabel).toBe(undefined);
    expect(backdrop.props.accessibilityRole).toBe(undefined);
    backdrop.props.onPress();
    expect(closes).toBe(1);
  });

  it("scopes assistive tech to the sheet and lets the escape gesture close it", () => {
    expect(sheet.props.accessibilityViewIsModal).toBe(true);
    expect(sheet.props.onPress).toBe(undefined);
    sheet.props.onAccessibilityEscape();
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

describe("ValuationSheet rows at enlarged text", () => {
  const flat = (style: unknown): Record<string, unknown> =>
    Array.isArray(style)
      ? Object.assign({}, ...style.map(flat))
      : style && typeof style === "object"
        ? (style as Record<string, unknown>)
        : {};
  const rows = () =>
    findAll(
      ValuationSheet({
        valuation: {
          priced: [holding("NWRB", true), holding("VERYLONGCOMMODITY", false)],
          atCostNoPrice: [holding("RGAGX", false)],
          notInTotal: [holding("VACHR", false)],
        },
        ledgerId: "open_ledger/stock-example",
        canWrite: true,
        onClose() {},
      }),
      (node) => node.props.accessible === true,
    );

  afterEach(() => {
    fontScale = 1;
  });

  it("keeps holding and detail side by side at ordinary sizes", () => {
    for (const scale of [1, 1.235]) {
      fontScale = scale;
      for (const row of rows()) {
        expect(flat(row.props.style).flexDirection).toBe("row");
        expect(flat((row.children[0] as Node).props.style).flex).toBe(1);
      }
    }
  });

  it("stacks every row so the holding keeps its width at accessibility sizes", () => {
    fontScale = 3.12;
    const stacked = rows();
    expect(stacked.length).toBe(4);
    for (const row of stacked) {
      const [name, detail] = row.children as Node[];
      expect(flat(row.props.style).flexDirection).toBe("column");
      // flex: 1 has a zero basis; beside a 346-point date it measured 0 wide.
      expect(flat(name.props.style).flex).toBe(0);
      expect(flat(detail.props.style).alignItems).toBe("flex-start");
    }
    expect(stacked[0].props.accessibilityLabel.includes("NWRB")).toBe(true);
  });
});

describe("ValuationSheet footer action", () => {
  // A read-only reader was offered "Update prices on the web", which opened a
  // page that cannot update this ledger's prices (w0/031).
  const footer = (canWrite: boolean) => {
    let closes = 0;
    const tree = ValuationSheet({
      valuation: {
        priced: [holding("NWRB", true)],
        atCostNoPrice: [],
        notInTotal: [],
      },
      ledgerId: "open_ledger/example",
      canWrite,
      onClose: () => (closes += 1),
    })!;
    const buttons = findAll(tree, (node) => node.type === "Button");
    return { buttons, closes: () => closes };
  };

  afterEach(() => {
    guest = null;
  });

  it("offers the price update to a reader who can write the ledger", () => {
    const { buttons } = footer(true);
    expect(buttons.length).toBe(1);
    expect(buttons[0].children).toEqual(["updatePricesOnWeb"]);
  });

  it("offers no action to a signed-in reader who cannot write the ledger", () => {
    const { buttons } = footer(false);
    expect(buttons.length).toBe(0);
  });

  it("keeps the holdings visible to a read-only reader", () => {
    const tree = ValuationSheet({
      valuation: {
        priced: [holding("NWRB", true), holding("VBMPX", false)],
        atCostNoPrice: [],
        notInTotal: [holding("VACHR", false)],
      },
      ledgerId: "open_ledger/example",
      canWrite: false,
      onClose() {},
    })!;
    expect(findAll(tree, (node) => node.props.accessible === true).length).toBe(
      3,
    );
  });

  // w21/633: a guest was shown "Sign In" where an owner sees "Update prices on the
  // web", but signing in does not let them update an example's prices.
  it("offers a guest no action, whatever the write access", () => {
    guest = { requestSignIn: () => undefined };
    for (const canWrite of [false, true]) {
      expect(footer(canWrite).buttons.length).toBe(0);
    }
  });
});

// w21/742: account detail's "1 not in total" now opens the sheet. A cash
// balance with an EUR leg values nothing; the sheet still lists the EUR.
describe("ValuationSheet for a balance that only leaves holdings out", () => {
  it("lists each holding left out of the total", () => {
    const tree = ValuationSheet({
      valuation: {
        priced: [],
        atCostNoPrice: [],
        notInTotal: [{ currency: "EUR", number: 500, scale: 2 }],
      },
      ledgerId: "open_ledger/example",
      canWrite: false,
      onClose() {},
    });
    const rows = findAll(tree, (node) => node.props.accessible === true).map(
      (node) => node.props.accessibilityLabel as string,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].includes("500 EUR")).toBe(true);
    expect(rows[0].includes("valuationNotInTotalTag")).toBe(true);
  });
});
