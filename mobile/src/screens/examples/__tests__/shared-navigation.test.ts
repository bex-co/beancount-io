import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as icons from "../../../components/tab-bar-icon/tab-icons";
import * as drawerLedgers from "../../../components/ledger-drawer/drawer-ledgers";
import * as guestState from "../../../common/guest/guest-state";

// Execute the real layout, drawer provider, account loader, and guest route
// boundary. Substitute native hosts and transport hooks, not their branching.
type Node = { type: string; props: any; children: Node[] };
let platform = "ios";
let accountReads = 0;
let permissionReads = 0;
let persistedLedger = "previous/private";
let focused = true;
const react = {
  createElement(type: any, props: any, ...children: any[]): Node {
    children = (children.length ? children : (props?.children ?? []))
      .flat()
      .filter(Boolean);
    return typeof type === "function"
      ? type({ ...props, children })
      : { type, props: props ?? {}, children };
  },
  createContext: (value: unknown) => ({ Provider: "Provider", value }),
  useContext: (context: { value: unknown }) => context.value,
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useRef: (current: unknown) => ({ current }),
  useState: (value: unknown) => [value, () => {}],
  useEffect() {},
};
const host =
  (type: string) =>
  (props: any): Node => ({
    type,
    props,
    children: props.children ?? [],
  });
const NativeTabs = Object.assign(host("NativeTabs"), {
  Trigger: Object.assign(host("NativeTrigger"), {
    Label: "Label",
    Icon: "Icon",
  }),
});
const Tabs = Object.assign(host("Tabs"), { Screen: "TabScreen" });
const root = path.join(__dirname, "../../..");
const loaded = new Map<string, any>();
function load(relative: string): any {
  if (loaded.has(relative)) return loaded.get(relative);
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path.join(root, relative), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
      },
    }).outputText,
    {
      exports,
      React: react,
      require(id: string) {
        if (id === "react") return react;
        if (id === "react-native")
          return {
            Platform: {
              get OS() {
                return platform;
              },
            },
            StyleSheet: { create: (styles: unknown) => styles },
            Text: "Text",
            View: "View",
          };
        if (id === "expo-router")
          return {
            Tabs,
            useFocusEffect: (fn: () => void) => {
              if (focused) fn();
            },
          };
        if (id === "expo-router/unstable-native-tabs") return { NativeTabs };
        if (id === "react-native-safe-area-context")
          return {
            SafeAreaView: "SafeAreaView",
            useSafeAreaInsets: () => ({ bottom: 34 }),
          };
        if (id === "@/components/tab-bar-icon")
          return { ...icons, TabBarIcon: "TabBarIcon" };
        if (id === "@/components/haptic-tab") return { HapticTab: "HapticTab" };
        if (id === "@/common/theme")
          return {
            useTheme: () => ({
              colorTheme: { white: "paper", primary: "accent" },
              name: "light",
            }),
            fontSizes: { xs: 12 },
            fontWeights: { medium: "500" },
          };
        if (id === "@/translations")
          return { i18n: { t: (key: string) => key } };
        if (id === "@/common/hooks/use-translations")
          return { useTranslations: () => ({ t: (key: string) => key }) };
        if (id === "@apollo/client")
          return { useReactiveVar: (read: () => unknown) => read() };
        if (id === "@/common/vars")
          return {
            localeVar: () => "en",
            ledgerVar: (id?: string) => {
              if (id) persistedLedger = id;
              return persistedLedger;
            },
          };
        if (id === "@/components/ledger-drawer")
          return {
            ...load("components/ledger-drawer/ledger-drawer-context.tsx"),
            LedgerDrawerHeader: "Header",
            useLedgerDrawer: () => ({ openDrawer() {} }),
          };
        if (id === "./account-ledger-drawer")
          return load("components/ledger-drawer/account-ledger-drawer.tsx");
        if (id === "./ledger-drawer") return { LedgerDrawer: "LedgerDrawer" };
        if (id === "./drawer-ledgers") return drawerLedgers;
        if (id === "@/common/horizontal-swipe-owner")
          return { EdgeSwipeGestureProvider: "EdgeSwipeGestureProvider" };
        if (id === "@/common/ledger-directory/ledger-directory-provider")
          return {
            useLedgerDirectory: () => {
              accountReads += 1;
              return {
                ledgers: [
                  {
                    id: persistedLedger,
                    fullName: persistedLedger,
                    name: "private",
                  },
                ],
                loading: false,
                error: false,
                refresh: async () => {},
              };
            },
          };
        if (id === "@/generated-graphql/graphql")
          return {
            useGetLedgerQuery: ({ skip }: { skip: boolean }) => {
              if (!skip) permissionReads += 1;
              return {};
            },
          };
        if (id === "@/common/guest/guest-state") return guestState;
        if (id === "@/common/guest/guest-context")
          return { GuestContext: { Provider: "GuestProvider" } };
        if (id === "@/common/guest/guest-client") return {};
        if (id === "@/components/ledger-tabs")
          return load("components/ledger-tabs/index.tsx");
        if (id === "@/components/lazy-tab-screen")
          return { LazyTabScreen: "LazyTabScreen" };
        if (id === "@/components/dashboard-scroll-view")
          return { DashboardScrollView: "ScrollView" };
        if (id === "@/components/button") return { Button: "Button" };
        if (id === "./examples-layout") return {};
        if (id === "./example-ledger-provider")
          return { ExampleReadScreen: "ExampleReadScreen" };
        throw new Error(`Unexpected dependency ${id}`);
      },
    },
  );
  loaded.set(relative, exports);
  return exports;
}
const { LedgerTabLayout } = load("components/ledger-tabs/index.tsx");
const { ExampleTabScreen } = load("screens/examples/example-tabs.tsx");
const find = (node: Node, type: string): Node[] => [
  ...(node.type === type ? [node] : []),
  ...node.children.flatMap((child) =>
    typeof child === "object" ? find(child, type) : [],
  ),
];

describe("shared example navigation", () => {
  afterEach(() => guestState.clearGuestVisit());
  for (const os of ["ios", "android"]) {
    it(`uses the same ${os} navigator and drawer without guest account reads`, () => {
      platform = os;
      accountReads = 0;
      permissionReads = 0;
      const data = { ledgerId: "open_ledger/example", ledgers: [], guest: {} };
      const guest = LedgerTabLayout({ drawerData: data });
      const navigator = os === "ios" ? "NativeTabs" : "Tabs";
      const tab = os === "ios" ? "NativeTrigger" : "TabScreen";
      expect(find(guest, navigator).length).toBe(1);
      expect(find(guest, tab).map((node) => node.props.name)).toEqual([
        "index",
        "accounts",
        "transactions",
        "reports",
        "ledger",
      ]);
      expect(find(guest, "LedgerDrawer")[0].props.data).toBe(data);
      expect(accountReads).toBe(0);
      expect(permissionReads).toBe(0);
      expect(persistedLedger).toBe("previous/private");

      const account = LedgerTabLayout({});
      expect(find(account, navigator).length).toBe(1);
      expect(find(account, tab).map((node) => node.props.name)).toEqual([
        "index",
        "accounts",
        "transactions",
        "reports",
        "ledger",
      ]);
      expect(accountReads).toBe(1);
      for (const prop of ["edges", "style"])
        expect(find(account, "SafeAreaView")[0].props[prop]).toEqual(
          find(guest, "SafeAreaView")[0].props[prop],
        );
      const drawer = find(account, "LedgerDrawer")[0].props.data;
      drawer.onSelect("next/private");
      expect(persistedLedger).toBe("next/private");
      persistedLedger = "previous/private";
    });
  }

  it("records only focused routes and preserves the sign-in continuation on refocus", () => {
    const server = "https://books.example/";
    guestState.startGuestVisit(server);
    guestState.updateGuestVisit({
      ledgerId: "open_ledger/example",
      view: "reports",
    });
    guestState.beginGuestSignIn();
    guestState.bindGuestAuthorization(server, "oauth-state");
    const before = guestState.guestVisitVar();
    focused = false;
    ExampleTabScreen({ view: "home", children: "Home" });
    expect(guestState.guestVisitVar()).toBe(before);
    focused = true;
    const tree = ExampleTabScreen({ view: "reports", children: "Reports" });
    expect(tree.type).toBe("LazyTabScreen");
    expect(guestState.guestContinuation(server, "oauth-state")).toBe(before);
    ExampleTabScreen({ view: "accounts", children: "Accounts" });
    expect(guestState.guestVisitVar()?.view).toBe("accounts");
    expect(guestState.guestContinuation(server, "oauth-state")).toBe(null);
  });
});
