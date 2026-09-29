import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import { makeVar } from "@apollo/client";
import * as guestState from "../../../common/guest/guest-state";
import { createGuestClient } from "../../../common/guest/guest-client";
import { NO_SCOPED_FILTERS } from "../../transactions-screen/filters/types";

type Node = { type: any; props: any; children: any[] };
let guest: unknown = { ledgerId: "open_ledger/example" };
let failure: string | undefined;
let retries = 0;
const replacements: string[] = [];
const cleanups: (() => void)[] = [];
const react = {
  createElement: (type: any, props: any, ...children: any[]): Node => ({
    type,
    props: { ...props, children },
    children,
  }),
  createContext: () => ({ Provider: "ReadProvider" }),
  useContext: () => ({
    failure,
    retry: () => {
      retries++;
    },
  }),
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useState: (value: unknown) => [value, () => {}],
  useEffect: (fn: () => (() => void) | void) => {
    const cleanup = fn();
    if (cleanup) cleanups.push(cleanup);
  },
};
const loaded: any = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../example-ledger-provider.tsx"),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
      },
    },
  ).outputText,
  {
    exports: loaded,
    React: react,
    require(id: string) {
      if (id === "react") return react;
      if (id === "react-native")
        return {
          StyleSheet: { create: (value: unknown) => value },
          View: "View",
          Text: "Text",
          AppState: { addEventListener: () => ({ remove() {} }) },
        };
      if (id === "@apollo/client")
        return { ApolloProvider: "ApolloProvider", makeVar };
      if (id === "expo-router")
        return {
          Redirect: "Redirect",
          router: {
            replace: (route: string) => replacements.push(route),
            navigate() {},
          },
        };
      if (id === "@/common/guest/guest-state") return guestState;
      if (id === "@/common/guest/guest-client") return { createGuestClient };
      if (id === "@/common/guest/guest-context")
        return {
          GuestContext: { Provider: "GuestProvider" },
          useGuest: () => guest,
        };
      if (id === "@/common/hooks/use-translations")
        return { useTranslations: () => ({ t: (key: string) => key }) };
      if (id === "@/common/theme")
        return {
          useTheme: () => ({ colorTheme: { white: "paper", text01: "ink" } }),
        };
      if (id === "@/components/button") return { Button: "Button" };
      if (id === "@/components/dashboard-scroll-view")
        return { DashboardScrollView: "ScrollView" };
      if (id === "@/screens/transactions-screen/filters/types")
        return { NO_SCOPED_FILTERS };
      if (id === "./example-routes") return { exampleRoutes: {} };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  },
);
const { ExampleLedgerProvider, ExampleReadScreen } = loaded;
const find = (node: Node, type: string): Node[] => [
  ...(node.type === type ? [node] : []),
  ...node.children
    .flat()
    .flatMap((child) =>
      child && typeof child === "object" ? find(child, type) : [],
    ),
];

describe("preview detail access boundary", () => {
  beforeEach(() => {
    guest = { ledgerId: "open_ledger/example" };
    failure = undefined;
    retries = 0;
    replacements.length = 0;
  });
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    guestState.clearGuestVisit();
  });

  it("puts pushed screens under the same anonymous client and isolated filter state", () => {
    const visit = {
      serverUrl: "https://books.example/",
      ledgerId: "open_ledger/example",
      view: "files",
    };
    const render = () => {
      const node = ExampleLedgerProvider({
        visit,
        requestSignIn() {},
        children: "whole navigation stack",
      });
      return node.type(node.props) as Node;
    };
    const first = render();
    const second = render();
    expect(first.type).toBe("ApolloProvider");
    expect(first.props.client === second.props.client).toBe(false);
    const firstGuest = find(first, "GuestProvider")[0].props.value;
    const secondGuest = find(second, "GuestProvider")[0].props.value;
    firstGuest.transactionFilters({
      ledgerId: visit.ledgerId,
      filters: { ...NO_SCOPED_FILTERS.filters, account: "Assets:Cash" },
    });
    expect(secondGuest.transactionFilters()).toEqual(NO_SCOPED_FILTERS);
    expect(find(first, "ReadProvider")[0].children).toEqual([
      ["whole navigation stack"],
    ]);
  });

  it("redirects a detail deep link without a selected example before rendering its screen", () => {
    guest = null;
    const tree = ExampleReadScreen({ children: "private cached content" });
    expect(tree.type).toBe("Redirect");
    expect(tree.props.href).toBe("/examples");
  });

  it("removes stale detail content on access loss and allows choosing another example", () => {
    guestState.startGuestVisit("https://books.example/");
    guestState.updateGuestVisit({
      ledgerId: "open_ledger/example",
      view: "files",
    });
    expect(ExampleReadScreen({ children: "file content" })).toBe(
      "file content",
    );
    failure = "unavailable";
    const tree = ExampleReadScreen({ children: "file content" });
    expect(JSON.stringify(tree).includes("file content")).toBe(false);
    const buttons = find(tree, "Button");
    buttons[0].props.onPress();
    expect(retries).toBe(1);
    buttons[1].props.onPress();
    expect(guestState.guestVisitVar()?.ledgerId).toBe(null);
    expect(replacements).toEqual(["/examples"]);
  });
});
