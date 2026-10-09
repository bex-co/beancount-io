import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as filterTypes from "../../transactions-screen/filters/types";
import * as filterQuery from "../../transactions-screen/filters/select-filter-query";
import type { ScopedTransactionFilters } from "../../transactions-screen/filters/types";

// `.pm` w2/052: an unapplied filter draft must stay bound to its ledger. An
// app link can select another ledger while the Filters sheet sits in history;
// native Back revives the sheet, and Apply must not then write the previous
// ledger's draft (its account) as the new ledger's saved filter.
//
// This mounts the real sheet. Native hosts, the router and the account picker
// are the boundaries. The fake React below keeps component state per
// (component, key) — as React does — so a keyed remount starts from fresh
// state and a setter captured by the old instance no longer reaches the view.

type Node = { type: string; props: Record<string, any>; children: any[] };

const EXAMPLE = "open_ledger/example";
const STOCK = "open_ledger/stock-example";
const CHECKING = "Assets:US:BofA:Checking";

let slots = new Map<unknown, any[]>();
let activeSlots: any[] = [];
let cursor = 0;
const react = {
  Fragment: "Fragment",
  createElement(type: any, props: any, ...children: any[]): any {
    const supplied = { ...props, children: children.flat().filter(Boolean) };
    if (typeof type !== "function") {
      return { type, props: supplied, children: supplied.children };
    }
    const identity =
      props && props.key !== undefined ? `${type.name}#${props.key}` : type;
    const previous = activeSlots;
    const previousCursor = cursor;
    activeSlots = slots.get(identity) ?? [];
    slots.set(identity, activeSlots);
    cursor = 0;
    try {
      return type(supplied);
    } finally {
      activeSlots = previous;
      cursor = previousCursor;
    }
  },
  useState(initial: any) {
    const owned = activeSlots;
    const index = cursor++;
    if (!(index in owned)) {
      owned[index] = typeof initial === "function" ? initial() : initial;
    }
    return [
      owned[index],
      (value: any) => {
        owned[index] =
          typeof value === "function" ? value(owned[index]) : value;
      },
    ];
  },
};

let ledgerId: string;
let saved: ScopedTransactionFilters;
let pickerCallbacks: ((account: string) => void)[];
let backs: number;

const anything: any = new Proxy({}, { get: () => 1 });
const transactionFiltersVar = (next?: ScopedTransactionFilters) => {
  if (next !== undefined) saved = next;
  return saved;
};

const sourceFile = path.join(__dirname, "..", "transaction-filters-screen.tsx");
function loadScreen(): () => any {
  const exports: Record<string, any> = {};
  const source = ts.transpileModule(fs.readFileSync(sourceFile, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    React: react,
    Date,
    require(id: string): any {
      if (id === "react") return react;
      if (id === "react-native")
        return {
          Pressable: "Pressable",
          ScrollView: "ScrollView",
          Text: "Text",
          TouchableOpacity: "TouchableOpacity",
          View: "View",
          StyleSheet: { create: (styles: any) => styles },
        };
      if (id === "react-native-safe-area-context")
        return { SafeAreaView: "SafeAreaView" };
      if (id === "expo-router")
        return {
          Stack: { Screen: "StackScreen" },
          useRouter: () => ({
            back: () => {
              backs += 1;
            },
          }),
        };
      if (id === "@expo/vector-icons") return { Ionicons: "Icon" };
      if (id === "@/common/guest/guest-context")
        return { useGuest: () => null };
      if (id === "@/common/format-util")
        return {
          getFormatDate: (date: Date) => date.toISOString().slice(0, 10),
          parseFormatDate: (value: string) => new Date(value),
        };
      if (id === "@/screens/account-picker-screen/push-account-picker")
        return {
          pushAccountPicker: (
            _router: unknown,
            options: { onSelect: (account: string) => void },
          ) => pickerCallbacks.push(options.onSelect),
        };
      if (id === "@/common/hooks")
        return { useThemeStyle: (factory: any) => factory(anything) };
      if (id === "@/common/hooks/use-translations")
        return { useTranslations: () => ({ t: (key: string) => key }) };
      if (id === "@/common/theme")
        return {
          fontSizes: anything,
          fontWeights: anything,
          headerActionMaxFontSizeMultiplier: 1,
          useTheme: () => ({ colorTheme: anything }),
        };
      if (id === "@/components")
        return { Button: "Button", DatePickerModal: "DatePickerModal" };
      if (id === "@/screens/multi-postings-transaction/list-item")
        return { ListItem: "ListItem" };
      if (id === "@/screens/transactions-screen/filters/types")
        return filterTypes;
      if (id === "@/screens/transactions-screen/filters/select-filter-query")
        return filterQuery;
      if (id === "@/screens/transactions-screen/filters/var")
        return { transactionFiltersVar };
      if (id === "@/components/ledger-guard")
        return { useLedgerGuard: () => ledgerId };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return exports.TransactionFiltersScreen;
}

const TransactionFiltersScreen = loadScreen();
const nodes = (node: any): Node[] =>
  node && typeof node === "object"
    ? [node, ...node.children.flatMap(nodes)]
    : [];
const render = (): Node => react.createElement(TransactionFiltersScreen, {});
/** The account row's text: the draft's account, or "All accounts". */
const accountRow = (tree: Node): Node =>
  nodes(tree).filter(
    (node) => node.type === "ListItem" && node.props.title === undefined,
  )[0];
/** The sheet runs in its own VM realm; compare its writes as plain data. */
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
const applyButton = (tree: Node): Node =>
  nodes(tree).filter((node) => node.type === "Button")[0];

describe("transaction filter draft is bound to its ledger (w2/052)", () => {
  beforeEach(() => {
    slots = new Map();
    ledgerId = EXAMPLE;
    saved = filterTypes.NO_SCOPED_FILTERS;
    pickerCallbacks = [];
    backs = 0;
  });

  it("applies a same-ledger account pick to that ledger", () => {
    accountRow(render()).props.onPress();
    pickerCallbacks[0](CHECKING);
    const tree = render();
    expect(accountRow(tree).props.content).toBe(CHECKING);
    applyButton(tree).props.onPress();
    expect(plain(saved)).toEqual({
      ledgerId: EXAMPLE,
      filters: { statuses: [], range: "all", account: CHECKING },
    });
    expect(backs).toBe(1);
  });

  it("does not carry an unapplied draft into another ledger", () => {
    // Example: pick Checking, do not Apply.
    accountRow(render()).props.onPress();
    pickerCallbacks[0](CHECKING);
    expect(accountRow(render()).props.content).toBe(CHECKING);

    // A Stock link selects Stock; Back revives the retained sheet.
    ledgerId = STOCK;
    const revived = render();
    expect(accountRow(revived).props.content).toBe("allAccounts");

    applyButton(revived).props.onPress();
    expect(plain(saved)).toEqual({
      ledgerId: STOCK,
      filters: { statuses: [], range: "all" },
    });
    expect(filterQuery.selectFiltersForLedger(saved, STOCK).account).toBe(
      undefined,
    );
  });

  it("ignores a picker callback still outstanding from the previous ledger", () => {
    // The picker was opened in Example; its pick lands after the switch.
    accountRow(render()).props.onPress();
    ledgerId = STOCK;
    render();
    pickerCallbacks[0](CHECKING);

    const tree = render();
    expect(accountRow(tree).props.content).toBe("allAccounts");
    applyButton(tree).props.onPress();
    expect(saved.ledgerId).toBe(STOCK);
    expect(saved.filters.account).toBe(undefined);
  });

  it("seeds the revived sheet from the new ledger's own saved filters", () => {
    saved = {
      ledgerId: STOCK,
      filters: {
        statuses: ["pending"],
        range: "all",
        account: "Assets:Broker",
      },
    };
    accountRow(render()).props.onPress();
    pickerCallbacks[0](CHECKING);

    ledgerId = STOCK;
    expect(accountRow(render()).props.content).toBe("Assets:Broker");
  });
});

describe("transaction filter header actions (w2/067)", () => {
  beforeEach(() => {
    slots = new Map();
    ledgerId = EXAMPLE;
    saved = filterTypes.NO_SCOPED_FILTERS;
    pickerCallbacks = [];
    backs = 0;
  });

  const header = (tree: Node, side: "headerLeft" | "headerRight"): Node =>
    nodes(tree)
      .filter((node) => node.type === "StackScreen")[0]
      .props.options[side]();

  it("exposes Cancel as a native button that dismisses without applying", () => {
    const tree = render();
    const cancel = header(tree, "headerLeft");
    expect(cancel.props.accessibilityRole).toBe("button");
    expect(nodes(cancel).some((node) => node.children.includes("cancel"))).toBe(
      true,
    );
    cancel.props.onPress();
    expect(backs).toBe(1);
    expect(plain(saved)).toEqual(plain(filterTypes.NO_SCOPED_FILTERS));
  });

  it("exposes Reset as a native button that clears only the draft", () => {
    saved = {
      ledgerId: EXAMPLE,
      filters: { ...filterTypes.NO_FILTERS, account: CHECKING },
    };
    const tree = render();
    expect(accountRow(tree).props.content).toBe(CHECKING);
    const reset = header(tree, "headerRight");
    expect(reset.props.accessibilityRole).toBe("button");
    reset.props.onPress();
    expect(accountRow(render()).props.content).toBe("allAccounts");
    expect(saved.filters.account).toBe(CHECKING);
  });
});
