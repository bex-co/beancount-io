import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import { chartPageHeight } from "../chart-page-height";

// Executes the real AccountChartsCard with one persistent instance of state,
// reporting caption and page-header layouts the way the native views do, and
// reads back the heights it reserves. The card keeps the tallest measurement
// so tab switches never move the pager. These tests pin that the maximum
// belongs to one ledger and one text layout.
type Node = { type: unknown; props: Record<string, any>; children: unknown[] };

let fontScale = 1;
let slots: { value: unknown }[] = [];
let cursor = 0;

const react = {
  createElement: (type: unknown, props: any, ...children: unknown[]): Node => ({
    type,
    props: props ?? {},
    children: children.flat(),
  }),
};
const hooks = {
  useState(initial: unknown) {
    const index = cursor++;
    if (!slots[index]) {
      slots[index] = {
        value:
          typeof initial === "function"
            ? (initial as () => unknown)()
            : initial,
      };
    }
    const slot = slots[index];
    return [
      slot.value,
      (next: unknown) =>
        (slot.value =
          typeof next === "function"
            ? (next as (previous: unknown) => unknown)(slot.value)
            : next),
    ];
  },
  useCallback: (fn: unknown) => fn,
};

const stub: any = new Proxy(function () {}, {
  get: (_target, key) => (key === "__esModule" ? true : stub),
  apply: () => stub,
});

function loadCard(): (props: Record<string, unknown>) => Node {
  const exports: Record<string, any> = {};
  const file = path.join(__dirname, "..", "account-charts-card.tsx");
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  const modules: Record<string, unknown> = {
    react: hooks,
    "react-native": {
      StyleSheet: { create: (styles: unknown) => styles },
      Text: "Text",
      View: "View",
      useWindowDimensions: () => ({ width: 390, fontScale }),
    },
    "@/components": {
      DashboardCard: "DashboardCard",
      SegmentedPages: "SegmentedPages",
      TimeRangePills: "TimeRangePills",
    },
    "@/components/crossfade": { FadeInView: "FadeInView" },
    "@/components/pressable-scale": { PressableScale: "PressableScale" },
    "@/common/d3/interactive-line-chart": {
      InteractiveLineChartD3: "InteractiveLineChartD3",
    },
    "@/common/hooks/use-translations": {
      useTranslations: () => ({ t: (key: string) => key, locale: "en" }),
    },
    "@/common/theme": {
      fontSizes: {},
      fontWeights: {},
      space: {},
      useTheme: () => ({ colorTheme: {} }),
    },
    "@/common/series-util": {
      RANGE_LABEL_KEYS: {},
      TIME_RANGES: [],
      balanceSeriesBaseline: () => 0,
      filterBalanceSeriesByRange: () => [],
      seriesToChartArray: () => ({ labels: [], numbers: [] }),
    },
    "./chart-page-height": { chartPageHeight },
    "@/common/guest/guest-context": { useGuest: () => null },
  };
  vm.runInNewContext(source, {
    exports,
    React: react,
    require: (id: string) => (id in modules ? modules[id] : stub),
  });
  return exports.AccountChartsCard;
}

function find(node: unknown, type: string): Node | undefined {
  if (!node || typeof node !== "object") return undefined;
  const element = node as Node;
  if (element.type === type) return element;
  for (const child of element.children) {
    const found = find(child, type);
    if (found) return found;
  }
  return undefined;
}

const AccountChartsCard = loadCard();
const CAPTION = "At market value · 6 prices not updated";

function render(ledgerId: string, captions: Record<string, string>) {
  cursor = 0;
  const pager = find(
    AccountChartsCard({
      currency: "USD",
      netWorthSeries: [],
      assetsSeries: [],
      liabilitiesSeries: [],
      captions,
      footnotes: {},
      onCaptionPress() {},
      loading: false,
      error: false,
      ledgerId,
    }),
    "SegmentedPages",
  )!;
  const header = pager.props.header(0) as Node;
  const caption = find(header, "PressableScale");
  return {
    pageHeight: pager.props.height as number,
    captionSlot: header.props.style.minHeight as number,
    pageKeys: (pager.props.pages as Node[]).map((page) => page.props.key),
    reportCaption: (height: number) =>
      caption!.props.onLayout({ nativeEvent: { layout: { height } } }),
    reportHeader: (page: number, height: number) =>
      (pager.props.pages as Node[])[page].props.onHeaderLayout(height),
  };
}

describe("AccountChartsCard measurement scope", () => {
  afterEach(() => {
    fontScale = 1;
    slots = [];
  });

  it("keeps the tallest header across pages within one ledger", () => {
    const card = render("open_ledger/example", { netWorth: CAPTION });
    card.reportHeader(0, 120);
    card.reportHeader(1, 90);
    expect(
      render("open_ledger/example", { netWorth: CAPTION }).pageHeight,
    ).toBe(chartPageHeight(120, 170, 240));
  });

  it("drops a caption slot the next ledger has no caption for", () => {
    render("open_ledger/example", { netWorth: CAPTION }).reportCaption(36);
    expect(
      render("open_ledger/example", { netWorth: CAPTION }).captionSlot,
    ).toBe(36);

    expect(render("open_ledger/alibaba", {}).captionSlot).toBe(0);
  });

  it("re-measures headers after a ledger switch instead of keeping the old maximum", () => {
    render("open_ledger/example", {}).reportHeader(0, 160);
    const next = render("open_ledger/alibaba", {});
    expect(next.pageHeight).toBe(240);
    next.reportHeader(0, 80);
    expect(render("open_ledger/alibaba", {}).pageHeight).toBe(
      chartPageHeight(80, 170, 240),
    );
  });

  it("shrinks back after a larger text size returns to default", () => {
    render("open_ledger/example", { netWorth: CAPTION }).reportHeader(0, 80);
    fontScale = 3.12;
    const enlarged = render("open_ledger/example", { netWorth: CAPTION });
    enlarged.reportHeader(0, 400);
    enlarged.reportCaption(220);
    fontScale = 1;
    const restored = render("open_ledger/example", { netWorth: CAPTION });
    expect(restored.captionSlot).toBe(0);
    expect(restored.pageHeight).toBe(240);
    expect(restored.pageKeys).not.toEqual(enlarged.pageKeys);
  });
});
