import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import {
  AddTransactionCallback,
  runAddTransactionCallback,
} from "../common/globalFnFactory";
import {
  NO_SCOPED_FILTERS,
  type ScopedTransactionFilters,
} from "../screens/transactions-screen/filters/types";
import { DirectiveType } from "../screens/transactions-screen/types";
import * as typography from "../common/theme/typography";
import * as spacing from "../common/theme/spacing";
import * as dynamicType from "../common/theme/dynamic-type";
import { themes } from "../common/theme/palette";

type Node = { type: string; props: Record<string, any>; children: any[] };
type QueryState = {
  data?: { getLedgerJournal: { data: any[]; total: number } };
  loading: boolean;
  error?: Error;
};

// Execute the real screens, empty states, Button, access hook, selectors and
// callback store. Native hosts, query results and unrelated Home cards are the
// boundaries. Hook slots let a search edit or save refresh drive a new render.
let slots = new Map<any, any[]>();
let activeSlots: any[] = [];
let cursor = 0;
const react = {
  Fragment: "Fragment",
  createElement(type: any, props: any, ...children: any[]): any {
    const supplied = { ...props, children: children.flat().filter(Boolean) };
    if (typeof type !== "function") {
      return { type, props: supplied, children: supplied.children };
    }
    const previous = activeSlots;
    const previousCursor = cursor;
    activeSlots = slots.get(type) ?? [];
    slots.set(type, activeSlots);
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
    if (!(index in owned)) owned[index] = initial;
    return [
      owned[index],
      (value: any) => {
        owned[index] =
          typeof value === "function" ? value(owned[index]) : value;
      },
    ];
  },
  useRef(initial: any) {
    const index = cursor++;
    return (activeSlots[index] ??= { current: initial });
  },
  useMemo: (factory: () => any) => factory(),
  useCallback: (callback: any) => callback,
  useEffect(effect: () => void, dependencies: any[]) {
    const index = cursor++;
    const previous = activeSlots[index];
    if (!previous || dependencies.some((value, i) => value !== previous[i])) {
      activeSlots[index] = dependencies;
      effect();
    }
  },
};

let journal: QueryState;
let ledgerId: string;
let permissionLedgerId: string;
let permissions: { push: boolean; admin: boolean };
let permissionError: Error | undefined;
let guest: any;
let filters: ScopedTransactionFilters;
let routes: any[];
let journalRefetches: number;
let homeRefetches: string[];
let journalVariables: any;
const refetchJournal = async () => {
  journalRefetches += 1;
};
const homeRead = (name: string) => ({
  data: undefined,
  loading: false,
  currencies: ["USD"],
  refetch: async () => {
    homeRefetches.push(name);
  },
});
const router = {
  navigate: (route: any) => routes.push(route),
  push: (route: any) => routes.push(route),
};
const ledgerVar = () => ledgerId;
const transactionFiltersVar = () => filters;
const useTheme = () => ({ colorTheme: themes.light });
const useThemeStyle = (factory: any) => factory(themes.light);
const asElement = (component: any) =>
  typeof component === "function"
    ? react.createElement(component, {})
    : component;

function SectionList(props: any) {
  const rows = props.sections.flatMap((section: any) =>
    section.data.map((item: any) => props.renderItem({ item })),
  );
  return react.createElement(
    "SectionList",
    props,
    props.ListHeaderComponent,
    rows.length ? rows : asElement(props.ListEmptyComponent),
    props.ListFooterComponent,
  );
}

const modules = new Map<string, any>();
const sourceRoot = path.join(__dirname, "..");
function load(relative: string): any {
  const file = [
    relative,
    `${relative}.ts`,
    `${relative}.tsx`,
    path.join(relative, "index.tsx"),
    path.join(relative, "index.ts"),
  ].find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );
  if (!file) throw new Error(`Missing component: ${relative}`);
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  modules.set(file, exports);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    React: react,
    console,
    Date,
    require(id: string): any {
      if (id === "react") return react;
      if (id === "react-native")
        return {
          View: "View",
          Text: "Text",
          Pressable: "Pressable",
          ActivityIndicator: "ActivityIndicator",
          SectionList,
          StyleSheet: {
            create: (styles: any) => styles,
            flatten: (styles: any) => Object.assign({}, ...[styles].flat()),
          },
          useWindowDimensions: () => ({ fontScale: 1 }),
        };
      if (id === "@expo/vector-icons")
        return { Ionicons: "Icon", MaterialCommunityIcons: "Icon" };
      if (id === "expo-router")
        return { useRouter: () => router, useScrollToTop() {} };
      if (id === "react-native-safe-area-context")
        return { useSafeAreaInsets: () => ({ bottom: 0 }) };
      if (id === "@apollo/client")
        return {
          useReactiveVar: (read: any) => read(),
          NetworkStatus: { fetchMore: 3 },
        };
      if (id === "@/generated-graphql/graphql")
        return {
          useGetLedgerJournalQuery: (options: any) => {
            journalVariables = options.variables;
            return {
              ...journal,
              refetch: refetchJournal,
              fetchMore: async () => {},
              networkStatus: 7,
            };
          },
          useGetLedgerQuery: () => ({
            data: { getLedger: { id: permissionLedgerId, permissions } },
            error: permissionError,
          }),
        };
      if (id === "@/common/theme")
        return { ...typography, ...spacing, ...dynamicType, useTheme };
      if (id === "@/common/hooks")
        return {
          useTheme,
          useThemeStyle,
          useDebouncedValue: (value: any) => value,
        };
      if (id.endsWith("/use-theme-style")) return { useThemeStyle };
      if (id.endsWith("/use-translations"))
        return {
          useTranslations: () => ({ t: (key: string) => key, locale: "en" }),
        };
      if (id === "@/common/vars") return { ledgerVar };
      if (id === "./filters/var") return { transactionFiltersVar };
      if (id === "@/common/guest/guest-context")
        return { useGuest: () => guest };
      if (id === "@/common/globalFnFactory") return { AddTransactionCallback };
      if (id === "@/components/ledger-guard")
        return { LedgerGuard: "LedgerGuard", useLedgerGuard: () => ledgerId };
      if (id === "@/components")
        return {
          DashboardCard: "DashboardCard",
          DashboardScrollView: "DashboardScrollView",
          LedgerDrawerHeader: "LedgerDrawerHeader",
          StaleDataBanner: "StaleDataBanner",
        };
      if (id === "@/components/pressable-scale")
        return { PressableScale: "Pressable" };
      if (id === "@/components/loading-tile")
        return { LoadingTile: "LoadingTile" };
      if (id === "@/components/crossfade")
        return { FadeInView: "FadeInView", FadeOutView: "FadeOutView" };
      if (id === "@/components/dashboard-scroll-view")
        return { ThemedRefreshControl: "RefreshControl" };
      if (id === "@/components/valuation-sheet")
        return { ValuationSheet: "ValuationSheet" };
      if (id.endsWith("/use-keyboard-height"))
        return { useKeyboardHeight: () => 0 };
      if (id === "./transactions-header")
        return { TransactionsHeader: "TransactionsHeader" };
      if (id === "./date-section-header")
        return { DateSectionHeader: "DateSectionHeader" };
      if (id === "./entry-row" || id.endsWith("/transactions-screen/entry-row"))
        return { EntryRow: "EntryRow" };
      if (id.endsWith("/open-transaction-detail"))
        return {
          openTransactionDetail() {
            throw new Error("Unexpected transaction detail action");
          },
        };
      if (id.endsWith("/use-ledger-read-context"))
        return { useLedgerReadContext: () => homeRead("metadata") };
      if (id.endsWith("/use-balance-sheet"))
        return { useBalanceSheet: () => homeRead("balances") };
      if (id.endsWith("/use-balance-sheet-basis"))
        return { useBalanceSheetBasis: () => homeRead("basis") };
      if (id.endsWith("/use-ledger-prices"))
        return { useLedgerPrices: () => homeRead("prices") };
      const otherCards: Record<string, string> = {
        "account-charts-card": "AccountChartsCard",
        "spending-card": "SpendingCard",
        "budget-card": "BudgetCard",
        "feed-card": "FeedCard",
        "ask-ai-card": "AskAiCard",
      };
      const card = otherCards[path.basename(id)];
      if (card) return { [card]: card };
      if (id === "@/config")
        return { config: { features: { agentChat: false } } };
      if (id === "@/common/rtl") return { LEADING_TEXT_ALIGN: "left" };
      if (id === "currency-icons") return {};
      if (id.startsWith("@/")) return load(path.join(sourceRoot, id.slice(2)));
      if (id.startsWith(".")) return load(path.resolve(path.dirname(file), id));
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return exports;
}

const { HomeScreen } = load(
  path.join(sourceRoot, "screens/home-screen/home-screen"),
);
const { TransactionsScreen } = load(
  path.join(sourceRoot, "screens/transactions-screen/transactions-screen"),
);
const nodes = (node: any): Node[] =>
  node && typeof node === "object"
    ? [node, ...node.children.flatMap(nodes)]
    : [];
const text = (node: any): string =>
  typeof node === "string" ? node : (node?.children?.map(text).join(" ") ?? "");
const find = (tree: Node, type: string) =>
  nodes(tree).filter((node) => node.type === type);
const actions = (tree: Node) =>
  nodes(tree).filter((node) =>
    node.props.testID?.endsWith("empty-add-transaction"),
  );
const render = (screen: any): Node => react.createElement(screen, {});
const transaction = {
  directive_type: DirectiveType.TRANSACTION,
  entry_hash: "entry-1",
  date: "2026-09-28",
  payee: "Grocer",
  narration: "Food",
  flag: "*",
  postings: [],
  tags: [],
  links: [],
};

beforeEach(() => {
  slots = new Map();
  ledgerId = "user/starter";
  permissionLedgerId = ledgerId;
  permissions = { push: true, admin: false };
  permissionError = undefined;
  guest = null;
  filters = NO_SCOPED_FILTERS;
  routes = [];
  journalRefetches = 0;
  homeRefetches = [];
  journal = {
    data: { getLedgerJournal: { data: [], total: 0 } },
    loading: false,
  };
  AddTransactionCallback.deleteFn();
});

for (const [name, screen] of [
  ["Home", HomeScreen],
  ["Transactions", TransactionsScreen],
] as const) {
  describe(`${name} empty-ledger action`, () => {
    for (const role of ["writer", "admin"] as const) {
      it(`opens the existing add flow for a ${role} and refreshes after save`, async () => {
        permissions = { push: role === "writer", admin: role === "admin" };
        const tree = render(screen);
        const buttons = actions(tree);
        expect(buttons.length).toBe(1);
        expect(buttons[0].props.accessibilityRole).toBe("button");
        expect(buttons[0].props.accessibilityState.disabled).toBe(false);
        expect(text(buttons[0])).toBe("addTransaction");
        expect(AddTransactionCallback.hasFn()).toBe(false);
        buttons[0].props.onPress();
        expect(routes.map((route) => route.pathname)).toEqual([
          "/add-transaction",
        ]);
        expect(AddTransactionCallback.hasFn()).toBe(true);
        expect(journalRefetches).toBe(0);
        await runAddTransactionCallback();
        render(screen);
        expect(journalRefetches).toBe(1);
        expect(homeRefetches.sort()).toEqual(
          name === "Home" ? ["balances", "basis", "metadata", "prices"] : [],
        );
        expect(AddTransactionCallback.hasFn()).toBe(false);
        await runAddTransactionCallback();
        expect(journalRefetches).toBe(1);
      });
    }

    for (const access of [
      "reader",
      "guest",
      "failed permission query",
      "stale other ledger permissions",
    ] as const) {
      it(`does not offer write controls for ${access}`, () => {
        if (access === "reader") permissions = { push: false, admin: false };
        if (access === "guest")
          guest = { transactionFilters: transactionFiltersVar };
        if (access === "failed permission query")
          permissionError = new Error("Offline");
        if (access === "stale other ledger permissions")
          permissionLedgerId = "user/previous";
        const tree = render(screen);
        expect(actions(tree).length).toBe(0);
        expect(Boolean(find(tree, "LedgerDrawerHeader")[0].props.action)).toBe(
          false,
        );
        expect(text(tree).includes("transactionsWelcomeInstruction2")).toBe(
          false,
        );
        expect(AddTransactionCallback.hasFn()).toBe(false);
        expect(routes.length).toBe(0);
      });
    }

    for (const state of [
      "loading",
      "error",
      "cached empty error",
      "populated",
    ] as const) {
      it(`keeps the ${state} UI instead of a first-transaction action`, () => {
        if (state === "loading") journal = { loading: true };
        if (state === "error")
          journal = { loading: false, error: new Error("Offline") };
        if (state === "cached empty error")
          journal.error = new Error("Offline");
        if (state === "populated")
          journal.data!.getLedgerJournal = { data: [transaction], total: 1 };
        const tree = render(screen);
        expect(actions(tree).length).toBe(0);
        if (state === "loading")
          expect(find(tree, "LoadingTile").length > 0).toBe(true);
        if (
          state === "error" ||
          (state === "cached empty error" && name === "Transactions")
        ) {
          expect(
            text(tree).includes(
              name === "Home" ? "ledgerLoadError" : "transactionsLoadError",
            ),
          ).toBe(true);
        }
        if (state === "populated") {
          expect(find(tree, "EntryRow").length).toBe(1);
          expect(find(tree, "EntryRow")[0].props.entry.entry_hash).toBe(
            "entry-1",
          );
        }
      });
    }
  });
}

describe("Transactions narrowed empty results", () => {
  it("keeps search no-results separate from first-transaction onboarding", () => {
    const tree = render(TransactionsScreen);
    find(tree, "TransactionsHeader")[0].props.onSearchChange(
      "missing merchant",
    );
    const searched = render(TransactionsScreen);
    expect(actions(searched).length).toBe(0);
    expect(text(searched).includes("transactionsNoSearchResults")).toBe(true);
    expect(journalVariables.query.filter).toBe('"missing merchant"');
  });

  it("keeps account-filter no-results separate from first-transaction onboarding", () => {
    filters = {
      ledgerId,
      filters: { statuses: [], range: "all", account: "Expenses:Food" },
    };
    const tree = render(TransactionsScreen);
    expect(actions(tree).length).toBe(0);
    expect(text(tree).includes("transactionsNoSearchResults")).toBe(true);
    expect(journalVariables.query.account).toBe("Expenses:Food");
  });

  it("restores the first-transaction action after clearing the search", () => {
    let tree = render(TransactionsScreen);
    find(tree, "TransactionsHeader")[0].props.onSearchChange("missing");
    tree = render(TransactionsScreen);
    expect(actions(tree).length).toBe(0);
    find(tree, "TransactionsHeader")[0].props.onSearchChange("");
    tree = render(TransactionsScreen);
    expect(actions(tree).length).toBe(1);
    expect(text(tree).includes("transactionsNoSearchResults")).toBe(false);
  });
});
