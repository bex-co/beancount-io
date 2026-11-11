import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as dynamicType from "../common/theme/dynamic-type";
import * as bidi from "../common/bidi";

// iOS keeps a Text's native measurement when the text size changes while the
// app is open, unless that Text remounts. These tests execute the real owners
// (date headers, picker rows, range pills, the read-only file notice) and
// assert the font-scale keys that drive the remount, plus the state that must
// survive it. Native geometry is verified separately on the simulator.
type Node = {
  type: unknown;
  props: Record<string, any>;
  children: (Node | string)[];
};

let fontScale = 1;

// Minimal hook runtime: state, refs and shared values persist across renders
// of one mounted instance, so a re-render at a new scale is a real update.
let slots: unknown[] = [];
let cursor = 0;
let effects: (() => void)[] = [];
function slot<T>(init: () => T): { value: T } {
  const index = cursor++;
  if (!(index in slots)) slots[index] = { value: init() };
  return slots[index] as { value: T };
}
const hooks = {
  useRef: (initial: unknown) => {
    const cell = slot(() => ({ current: initial }));
    return cell.value;
  },
  useState: (initial: unknown) => {
    const cell = slot(() => initial);
    return [cell.value, (next: unknown) => (cell.value = next)];
  },
  useCallback: (fn: unknown) => fn,
  useMemo: (fn: () => unknown) => fn(),
  useEffect: (fn: () => void) => {
    effects.push(fn);
  },
};
function render<P>(component: (props: P) => Node, props: P): Node {
  cursor = 0;
  effects = [];
  const tree = component(props);
  effects.forEach((effect) => effect());
  return tree;
}
function unmount() {
  slots = [];
}

const react = {
  ...hooks,
  memo: (component: unknown) => component,
  createElement: (type: unknown, props: any, ...children: any[]): Node => ({
    type,
    props: props ?? {},
    children: children
      .flat()
      .filter(
        (child) => child !== null && child !== false && child !== undefined,
      ),
  }),
};

function transpile(file: string): string {
  return ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
      },
    },
  ).outputText;
}

// Any module not listed resolves to inert stubs, so a test only spells out
// the dependencies whose behavior it relies on.
const stubModule: any = new Proxy(function () {}, {
  get: (_target, key) =>
    key === "__esModule" ? true : key === "default" ? stubModule : stubModule,
  apply: () => stubModule,
});

// A module whose listed exports are real and the rest are inert stubs.
const partial = (exports: Record<string, unknown>) =>
  new Proxy(exports, {
    get: (target, key) => (key in target ? target[key as string] : stubModule),
  });

function load(
  file: string,
  modules: Record<string, unknown>,
  expose = "",
): any {
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(`${transpile(file)}\n${expose}`, {
    exports,
    React: react,
    require(id: string) {
      if (id === "react") return { __esModule: true, default: react, ...react };
      return id in modules ? modules[id] : stubModule;
    },
  });
  return exports;
}

function findAll(node: Node | string, match: (node: Node) => boolean): Node[] {
  if (typeof node === "string") return [];
  return (match(node) ? [node] : []).concat(
    ...node.children.map((child) => findAll(child, match)),
  );
}
const ofType = (type: string) => (node: Node) => node.type === type;
const textOf = (node: Node): string =>
  node.children
    .map((child) => (typeof child === "string" ? child : textOf(child)))
    .join("");

const reactNative = {
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Text: "Text",
  View: "View",
  ScrollView: "ScrollView",
  SectionList: "SectionList",
  TouchableOpacity: "TouchableOpacity",
  I18nManager: { isRTL: false },
  useWindowDimensions: () => ({ fontScale }),
};
const themeHooks = { useThemeStyle: (fn: any) => fn({}) };

afterEach(() => {
  fontScale = 1;
  unmount();
});

describe("DateSectionHeader live font-scale remeasurement", () => {
  const { DateSectionHeader } = load(
    "screens/transactions-screen/date-section-header.tsx",
    {
      "react-native": reactNative,
      "@/common/hooks": themeHooks,
      "@/common/theme/dynamic-type": dynamicType,
      "@/components/amount-text": { AmountText: "AmountText" },
    },
  );
  const header = (total?: string): Node =>
    render(DateSectionHeader, { displayDate: "September 8, 2017", total });

  it("remounts the date and daily total when the scale changes either way", () => {
    const before = header("-$33.71");
    fontScale = 3.12;
    const enlarged = header("-$33.71");
    fontScale = 1;
    const restored = header("-$33.71");

    expect(enlarged.props.key).not.toEqual(before.props.key);
    expect(restored.props.key).toEqual(before.props.key);
    expect(enlarged.children.map((child) => (child as Node).type)).toEqual([
      "Text",
      "AmountText",
    ]);
    expect(textOf(enlarged)).toBe("September 8, 2017-$33.71");
  });

  it("keeps the header mounted when only its data changes", () => {
    expect(header("-$1").props.key).toEqual(header().props.key);
  });

  // An enlarged date fills the row on its own; a total beside it overflowed
  // the screen edge (account journals are the only caller with a total).
  const flat = (style: unknown): Record<string, unknown> =>
    Array.isArray(style)
      ? Object.assign({}, ...style.map(flat))
      : style && typeof style === "object"
        ? (style as Record<string, unknown>)
        : {};

  it("moves the daily total under the date at accessibility sizes", () => {
    for (const total of ["0 NWRB", "-$4,500.00", "+12,345,678.90 MRMB"]) {
      fontScale = 3.12;
      const enlarged = header(total);
      const amount = findAll(enlarged, ofType("AmountText"))[0];
      expect(flat(enlarged.props.style).flexDirection).toBe("column");
      expect(flat(amount.props.style).alignSelf).toBe("flex-end");
      expect(textOf(amount)).toBe(total);
    }
  });

  it("keeps date and total side by side at ordinary sizes", () => {
    for (const scale of [1, 1.235]) {
      fontScale = scale;
      expect(flat(header("-$33.71").props.style).flexDirection).toBe("row");
    }
  });

  it("never stacks a header without a total", () => {
    fontScale = 3.12;
    expect(flat(header().props.style).flexDirection).toBe("row");
  });
});

describe("AccountRow live font-scale remeasurement", () => {
  const { AccountRow } = load(
    "screens/account-picker-screen/account-picker-screen.tsx",
    {
      "react-native": reactNative,
      "@/common/hooks/use-theme-style": themeHooks,
      "@/common/theme": partial({ useTheme: () => ({ colorTheme: {} }) }),
      "@/common/bidi": bidi,
      "@/common/account-util": {
        splitAccountLeaf: (account: string) => ({
          parent: account.slice(0, account.lastIndexOf(":") + 1),
          leaf: account.slice(account.lastIndexOf(":") + 1),
        }),
      },
    },
    "exports.AccountRow = AccountRow;",
  );
  const picked: string[] = [];
  const row = (selected: boolean): Node =>
    render(AccountRow, {
      account: "Assets:US:BofA:Checking",
      selected,
      onPress: (account: string) => picked.push(account),
      fontScale,
    });
  const name = (tree: Node) =>
    findAll(tree, (node) => node.type === "View" && "key" in node.props)[0];

  it("remounts the parent path and leaf together at a new scale", () => {
    const before = name(row(true));
    fontScale = 3.12;
    const enlarged = row(true);

    expect(name(enlarged).props.key).not.toEqual(before.props.key);
    expect(findAll(name(enlarged), ofType("Text")).map(textOf)).toEqual([
      "Assets:US:BofA:",
      "Checking",
    ]);
    expect(enlarged.props.accessibilityState.selected).toBe(true);
    enlarged.props.onPress();
    expect(picked).toEqual(["Assets:US:BofA:Checking"]);
  });

  it("names the row by its full path and hides the decorative icon", () => {
    for (const selected of [false, true]) {
      const tree = row(selected);
      expect(tree.props.accessibilityLabel).toBe("Assets:US:BofA:Checking");
      expect(tree.props.accessibilityState.selected).toBe(selected);
      const icon = findAll(
        tree,
        (node) => node.type !== "Text" && node.type !== "View" && node !== tree,
      )[0];
      expect(icon.props.accessible).toBe(false);
      expect(icon.props.accessibilityElementsHidden).toBe(true);
      expect(icon.props.importantForAccessibility).toBe("no");
    }
  });

  it("keeps the name mounted when only the selection changes", () => {
    expect(name(row(false)).props.key).toEqual(name(row(true)).props.key);
  });
});

describe("TimeRangePills live font-scale remeasurement", () => {
  const sharedValue = (initial: number) => ({ value: initial });
  const { TimeRangePills } = load("components/time-range-pills/index.tsx", {
    "react-native": reactNative,
    "react-native-reanimated": {
      __esModule: true,
      default: { View: "Animated.View" },
      useSharedValue: (initial: number) =>
        hooks.useRef(sharedValue(initial)).current,
      useAnimatedStyle: (fn: () => unknown) => fn,
      withTiming: (target: number) => target,
    },
    "@/common/hooks/use-theme-style": themeHooks,
    "@/common/haptics": { haptics: { selection() {} } },
    "./reveal-offset": {
      selectedPillRevealOffset: (layout: { x: number }) => layout.x,
      pillScrollTarget: () => null,
    },
  });
  const options = [
    { key: null, label: "All" },
    { key: "Assets", label: "Assets" },
  ];
  const pills = (value: string | null): Node =>
    render(TimeRangePills, {
      value,
      options,
      onChange() {},
      scrollable: true,
    });
  const buttons = (tree: Node) => findAll(tree, ofType("TouchableOpacity"));
  const layout = (pill: Node, height: number, width: number, x: number) =>
    pill.props.onLayout({
      nativeEvent: { layout: { x, y: 0, width, height } },
    });
  const indicator = (tree: Node) => {
    const { width, height } = findAll(
      tree,
      ofType("Animated.View"),
    )[0].props.style[1]();
    return { width, height };
  };

  it("remounts every label at a new scale while pill identity holds", () => {
    const before = pills(null);
    fontScale = 3.12;
    const enlarged = pills(null);

    expect(buttons(enlarged).map((pill) => pill.props.key)).toEqual(
      buttons(before).map((pill) => pill.props.key),
    );
    buttons(enlarged).forEach((pill, index) => {
      const label = findAll(pill, ofType("Text"))[0];
      expect(label.props.key).not.toEqual(
        findAll(buttons(before)[index], ofType("Text"))[0].props.key,
      );
      expect(textOf(label)).toBe(options[index].label);
    });
  });

  it("re-places the selected fill on the remeasured pill in both directions", () => {
    const tree = pills(null);
    tree.props.onLayout({ nativeEvent: { layout: { width: 390 } } });
    layout(buttons(tree)[0], 27.667, 36, 19);
    expect(indicator(pills(null))).toEqual({ width: 36, height: 27.667 });

    fontScale = 3.12;
    layout(buttons(pills(null))[0], 67.667, 72, 19);
    expect(indicator(pills(null))).toEqual({ width: 72, height: 67.667 });

    fontScale = 1;
    layout(buttons(pills(null))[0], 27.667, 36, 19);
    expect(indicator(pills(null))).toEqual({ width: 36, height: 27.667 });
  });

  it("ignores a remeasured pill that is not selected", () => {
    const tree = pills("Assets");
    layout(buttons(tree)[1], 27.667, 62, 61);
    fontScale = 3.12;
    layout(buttons(pills("Assets"))[0], 67.667, 72, 19);
    expect(indicator(pills("Assets"))).toEqual({ width: 62, height: 27.667 });
  });
});

describe("read-only file notice live font-scale remeasurement", () => {
  // The editor session owns the document, buffer and revision state, so the
  // notice must remount alone. Mounting the whole session needs Apollo and
  // the DOM editor; this checks the rendered tree's keys in the source.
  const source = fs.readFileSync(
    path.join(__dirname, "..", "screens/ledger-file-editor-screen/index.tsx"),
    "utf8",
  );
  const file = ts.createSourceFile(
    "index.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const elements: ts.JsxOpeningLikeElement[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      elements.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  const attribute = (element: ts.JsxOpeningLikeElement, name: string) =>
    element.attributes.properties
      .filter(ts.isJsxAttribute)
      .find((attr) => attr.name.getText() === name)
      ?.initializer?.getText();

  it("keys the notice text on the live scale", () => {
    const banner = elements.find(
      (element) => attribute(element, "testID") === '"ledger-editor-read-only"',
    );
    expect(Boolean(banner)).toBe(true);
    const bannerElement = banner!.parent as ts.JsxElement;
    const text = bannerElement.children
      .filter(ts.isJsxElement)
      .find((child) => child.openingElement.tagName.getText() === "Text");
    expect(attribute(text!.openingElement, "key")).toBe("{fontScale}");
    expect(attribute(text!.openingElement, "style")).toBe(
      "{styles.readOnlyText}",
    );
  });

  it("never keys the editor session or its editor on the scale", () => {
    const scaleKeyed = elements.filter((element) =>
      (attribute(element, "key") ?? "").includes("fontScale"),
    );
    expect(scaleKeyed.map((element) => element.tagName.getText())).toEqual([
      "Text",
    ]);
  });
});

describe("LegendItem live font-scale remeasurement", () => {
  const { LegendItem } = load("common/d3/chart-chrome.tsx", {
    "react-native": reactNative,
    "@/common/hooks/use-theme-style": themeHooks,
  });
  const legend = (label: string): Node =>
    render(LegendItem, { color: "#123456", label });
  const text = (tree: Node) => findAll(tree, ofType("Text"))[0];

  it("remounts the label at a new scale and restores it on the way back", () => {
    const before = text(legend("Net Profit"));
    fontScale = 3.12;
    const enlarged = text(legend("Net Profit"));
    fontScale = 1;
    const restored = text(legend("Net Profit"));

    expect(enlarged.props.key).not.toEqual(before.props.key);
    expect(restored.props.key).toEqual(before.props.key);
    expect(textOf(enlarged)).toBe("Net Profit");
  });

  it("keeps the label mounted when only its text changes", () => {
    expect(text(legend("Income")).props.key).toEqual(
      text(legend("Expenses")).props.key,
    );
  });
});

describe("AmountText live font-scale remeasurement", () => {
  const { AmountText } = load("components/amount-text/amount-text.tsx", {
    "react-native": reactNative,
  });
  const amount = (value: string): Node =>
    render(AmountText, { style: { color: "red" }, children: value });

  it("remounts at a new scale and restores its key on the way back", () => {
    const before = amount("$12.00");
    fontScale = 3.12;
    const enlarged = amount("$12.00");
    fontScale = 1;
    const restored = amount("$12.00");

    expect(enlarged.type).toBe("Text");
    expect(enlarged.props.key).not.toEqual(before.props.key);
    expect(restored.props.key).toEqual(before.props.key);
    // Passed through as a prop, so it is not among the node's children.
    expect(enlarged.props.children).toBe("$12.00");
  });

  it("keeps the amount mounted when only its value changes", () => {
    expect(amount("$1.00").props.key).toEqual(amount("$2.00").props.key);
  });
});

// Home's lower cards (w21/015): Spending's subtitle, Budget's rows and empty
// line, and Latest Updates' rows clipped or left blank bands after a live
// text-size change. The Files rows and the Reports note (w22/008) did the same.
// Checked on the source, like the file editor above: these screens run queries
// this runner cannot execute.
const KEYED_TEXTS: [string, string[]][] = [
  [
    "screens/home-screen/components/spending-card.tsx",
    // The subtitle, the empty text or the totals under the bars (w21/418), and
    // the two "not in total" notes: this month's and last month's (w21/263).
    [
      "{styles.subtitle}",
      "{styles.empty}",
      "{styles.totals}",
      "{styles.note}",
      "{styles.note}",
    ],
  ],
  [
    "screens/home-screen/components/budget-card.tsx",
    ["{styles.account}", "{styles.emptyText}"],
  ],
  [
    "screens/home-screen/components/feed-card.tsx",
    // The commit message under a ledger row is a second metaText (w21/599).
    ["{styles.title}", "{styles.metaText}", "{styles.metaText}"],
  ],
  [
    // A file row's name, and the note a dimmed row adds under it (w22/008).
    "screens/ledger-file-browser-screen/index.tsx",
    ["{styles.rowLabel}", "{styles.rowNote}"],
  ],
  // "Showing through <month>…" under the range pills (w22/008).
  ["screens/reports-screen/reports-screen.tsx", ["{styles.anchorNote}"]],
  // Every chart legend entry shares this one Text (w22/008).
  ["common/d3/chart-chrome.tsx", ["{styles.legendText}"]],
  // A Budget card: the account title (keyed since w21/027), the interval and
  // currency chips, the starts-on and status chips, and the Budget / Actual /
  // Variance labels (w22/018). Their amounts are AmountText, keyed itself.
  [
    "screens/budget-screen/components/budget-group-card.tsx",
    [
      "{[styles.account, stacked && styles.accountStacked]}",
      "{styles.badgeText}",
      "{styles.badgeText}",
      "{styles.statusText}",
      "{styles.statusText}",
      "{styles.statLabel}",
      "{styles.statLabel}",
      "{styles.statLabel}",
    ],
  ],
  // The "N entries" toggle and each entry's date and interval (w22/018).
  [
    "screens/budget-screen/components/budget-history-rows.tsx",
    ["{styles.toggleText}", "{styles.date}", "{styles.interval}"],
  ],
  // The merchant detail header: name, count, cadence chip, date range and the
  // Recurring title and helper (w22/019). Its totals are AmountText.
  [
    "screens/merchant-detail-screen/merchant-detail-screen.tsx",
    [
      "{styles.payeeName}",
      "{styles.count}",
      "{styles.chipText}",
      "{styles.dateRange}",
      "{styles.toggleTitle}",
      "{styles.toggleHelper}",
    ],
  ],
  // Notifications: the two section titles, the ledger-error rows, the healthy
  // and no-changes lines, Show more, every commit row and Show older (w22/020).
  [
    "screens/notifications-screen/notifications-screen.tsx",
    [
      "{styles.errorMessage}",
      "{styles.errorHint}",
      "{styles.errorLocation}",
      "{styles.sectionHeader}",
      "{styles.sectionHeader}",
      "{styles.emptyText}",
      "{styles.emptyText}",
      "{styles.showMoreText}",
      "{styles.changeMessage}",
      "{styles.changeMeta}",
      "{styles.olderText}",
    ],
  ],
  // Commit detail: the summary, the three section labels, the stats, the file
  // rows, Show more and every diff line (w22/020).
  [
    "screens/commit-detail-screen/commit-detail-screen.tsx",
    [
      "{styles.diffText}",
      "{styles.emptyText}",
      "{styles.emptyText}",
      "{styles.messageLine}",
      "{styles.messageBody}",
      "{styles.metaLine}",
      "{styles.sectionLabel}",
      "{styles.sectionLabel}",
      "{styles.sectionLabel}",
      "{styles.additions}",
      "{styles.deletions}",
      "{styles.fileName}",
      "{styles.fileStats}",
      "{styles.fileStatus}",
      "{styles.showMoreText}",
    ],
  ],
  // Settings: a row's title, subtitle and content, the section titles and the
  // secondary button (w22/021).
  [
    "screens/setting/list-item.tsx",
    [
      "{destructive ? styles.titleDestructive : styles.title}",
      "{styles.secondaryText}",
      "{styles.secondaryText}",
      "{styles.title}",
      "{styles.text}",
    ],
  ],
  // The Invite Friends block above Settings (w22/021).
  [
    "screens/referral-screen/components/invite-section.tsx",
    ["{styles.title}", "{styles.summary}"],
  ],
  // Transaction detail: the hero's payee, note, date and badges, the error and
  // plugin-copy notices, both section titles, the Details rows and the source
  // and empty states (w22/022). Its amount is AmountText.
  [
    "screens/transaction-detail-screen/transaction-detail-screen.tsx",
    [
      "{styles.sourceSlice}",
      "{styles.stateText}",
      "{styles.stateText}",
      "{styles.heroTitle}",
      "{styles.heroSubtitle}",
      "{styles.heroDate}",
      "{styles.statusText}",
      "{styles.noteText}",
      "{styles.errorText}",
      "{styles.errorAction}",
      "{styles.errorAction}",
      "{styles.copyNoticeText}",
      "{styles.sectionTitle}",
      "{styles.sectionTitle}",
      "{styles.metadataLabel}",
      "{styles.metadataLabel}",
      "{styles.metadataLabel}",
      "{styles.chipText}",
      "{styles.chipText}",
      "{styles.metadataLine}",
    ],
  ],
  // The Entry Context card on that screen (w22/022).
  [
    "screens/transactions-screen/entry-context/index.tsx",
    [
      "{styles.contextLocation}",
      "{styles.contextLocation}",
      "{styles.emptyStateText}",
      "{styles.contextHeaderText}",
      "{styles.sectionTitle}",
      "{styles.sourceText}",
    ],
  ],
  // Its Balances before / after sections (w22/022).
  [
    "screens/transactions-screen/entry-context/balance-section.tsx",
    ["{styles.balanceSectionHeaderText}", "{styles.balanceAccount}"],
  ],
  // The Accounts tab's "Account" and "Balance" column labels (w22/017).
  [
    "components/account-table/account-table.tsx",
    ["{styles.columnLabel}", "{styles.columnLabelRight}"],
  ],
];
for (const [file, styles] of KEYED_TEXTS)
  describe(`${file} live font-scale remeasurement`, () => {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const elements: ts.JsxOpeningLikeElement[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        elements.push(node);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    const attribute = (element: ts.JsxOpeningLikeElement, name: string) =>
      element.attributes.properties
        .filter(ts.isJsxAttribute)
        .find((attr) => attr.name.getText() === name)
        ?.initializer?.getText();

    it("keys each of its texts on the live scale", () => {
      for (const style of styles) {
        const text = elements.find(
          (element) =>
            element.tagName.getText() === "Text" &&
            attribute(element, "style") === style,
        );
        expect(Boolean(text)).toBe(true);
        expect((attribute(text!, "key") ?? "").includes("fontScale")).toBe(
          true,
        );
      }
    });

    it("keys only Text on the scale, never the card or its list", () => {
      const keyed = elements.filter((element) =>
        (attribute(element, "key") ?? "").includes("fontScale"),
      );
      expect(keyed.map((element) => element.tagName.getText())).toEqual(
        styles.map(() => "Text"),
      );
    });
  });
