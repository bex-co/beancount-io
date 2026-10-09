import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";

// Screen options are shallow-merged per route, so the unavailable state
// replacing a detail body inherits whatever header actions that body set.
// Executes the real component and merges its options over a body's, the way
// React Navigation does.
type Node = { type: unknown; props: Record<string, any>; children: unknown[] };

const react = {
  createElement: (type: unknown, props: any, ...children: unknown[]): Node => ({
    type,
    props: props ?? {},
    children,
  }),
};

function loadComponent(): (props: { title: string; message: string }) => Node {
  const exports: Record<string, any> = {};
  const source = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "..", "route-ledger-unavailable.tsx"),
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
    },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "expo-router": {
      Stack: { Screen: "Stack.Screen" },
      useRouter: () => ({ back() {} }),
    },
    "@/common/hooks": { useThemeStyle: (fn: any) => fn({}) },
    "@/common/hooks/use-translations": {
      useTranslations: () => ({ t: (key: string) => key }),
    },
    "@/common/theme": { fontSizes: {}, fontWeights: {} },
  };
  vm.runInNewContext(source, {
    exports,
    React: react,
    require: (id: string) => modules[id],
  });
  return exports.RouteLedgerUnavailable;
}

function find(node: Node, type: string): Node | undefined {
  if (node.type === type) return node;
  for (const child of node.children) {
    if (child && typeof child === "object") {
      const found = find(child as Node, type);
      if (found) return found;
    }
  }
  return undefined;
}

describe("RouteLedgerUnavailable header options", () => {
  const RouteLedgerUnavailable = loadComponent();
  const options = find(
    RouteLedgerUnavailable({ title: "Transaction", message: "Unavailable" }),
    "Stack.Screen",
  )!.props.options;

  it("removes the replaced body's header actions", () => {
    let shared = 0;
    const bodyOptions = {
      title: "Transaction",
      headerRight: () => {
        shared += 1;
        return "MenuButton";
      },
    };
    const merged = { ...bodyOptions, ...options };

    expect(merged.title).toBe("Transaction");
    expect(merged.headerRight()).toBe(null);
    expect(shared).toBe(0);
  });

  it("leaves the native Back control to the navigator", () => {
    expect("headerLeft" in options).toBe(false);
    expect("headerBackVisible" in options).toBe(false);
  });
});
