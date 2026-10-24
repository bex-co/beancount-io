import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";

// Executes the real TextInputScreen. Narration is multiline (w3/211), and that
// branch rendered only the input, so the ledger's narrations were fetched and
// never offered (w21/082).
type Node = { type: unknown; props: Record<string, any>; children: unknown[] };

let typed = "";
const react = {
  createElement: (type: unknown, props: any, ...children: unknown[]): Node => ({
    type,
    props: props ?? {},
    children: children
      .flat()
      .filter((child) => child != null && child !== false && child !== ""),
  }),
};

function load() {
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
    react: {
      __esModule: true,
      default: react,
      useMemo: (fn: () => unknown) => fn(),
      useState: () => [typed, () => {}],
    },
    "react-native": {
      View: "View",
      StyleSheet: {
        create: (styles: unknown) => styles,
        flatten: (styles: unknown) => styles,
        hairlineWidth: 1,
      },
      TextInput: "TextInput",
      Pressable: "Pressable",
      ScrollView: "ScrollView",
      Text: "Text",
      KeyboardAvoidingView: "KeyboardAvoidingView",
      Platform: { OS: "ios" },
    },
    "@/common/theme": {
      fontSizes: {},
      fontWeights: {},
      headerActionMaxFontSizeMultiplier: 1,
      headerActionStyle: () => ({}),
      useTheme: () => ({ colorTheme: {} }),
    },
    "@/translations": { i18n: { t: (key: string) => key } },
    "expo-router": { router: { back() {} }, Stack: { Screen: "StackScreen" } },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "@expo/vector-icons": { Ionicons: "Icon" },
    "@/components/loading-tile": { LoadingTile: "LoadingTile" },
    "@/components/crossfade": { FadeInView: "FadeInView" },
    "@/common/rtl": {
      LEADING_TEXT_ALIGN: "left",
      leadingInputTextAlign: () => "left",
      letterSpacing: (n: number) => n,
    },
    "@/common/hooks/use-stack-keyboard-offset": {
      useStackKeyboardOffset: () => 0,
    },
    "./match-suggestions": require("../match-suggestions"),
    "@/common/clean-free-text": require("../../../common/clean-free-text"),
  };
  vm.runInNewContext(source, {
    exports,
    React: react,
    require: (id: string) => {
      if (!(id in modules)) throw new Error(`Unexpected dependency ${id}`);
      return modules[id];
    },
  });
  return exports;
}

function findAll(node: unknown, match: (node: Node) => boolean): Node[] {
  if (!node || typeof node !== "object") return [];
  const element = node as Node;
  return (match(element) ? [element] : []).concat(
    ...element.children.map((child) => findAll(child, match)),
  );
}

const { TextInputScreen } = load();
const offered = (tree: Node) =>
  findAll(
    tree,
    (node) => node.type === "Pressable" && !!node.props.accessibilityLabel,
  )
    .map((node) => node.props.accessibilityLabel)
    .filter((label) => label !== "save");

describe("TextInputScreen suggestions", () => {
  const narrations = ["Produce", "Rent", "Bus fare"];

  it("lists them under a multiline input", () => {
    typed = "";
    const tree = TextInputScreen({
      headerTitle: "Narration",
      multiline: true,
      suggestions: narrations,
    });
    const avoiding = findAll(
      tree,
      (node) => node.type === "KeyboardAvoidingView",
    );
    expect(avoiding.length).toBe(1);
    // Inside the keyboard-avoiding body, under the input.
    expect(
      findAll(avoiding[0], (node) => node.type === "ScrollView").length,
    ).toBe(1);
    expect(offered(tree)).toEqual(narrations);
  });

  it("narrows them to what is typed", () => {
    typed = "pr";
    const tree = TextInputScreen({
      headerTitle: "Narration",
      multiline: true,
      suggestions: narrations,
    });
    expect(offered(tree)).toEqual(["Produce"]);
  });

  it("keeps the single-line list", () => {
    typed = "";
    const tree = TextInputScreen({
      headerTitle: "Payee",
      suggestions: ["Trader Joes"],
    });
    expect(offered(tree)).toEqual(["Trader Joes"]);
  });

  // w21/257: the screen compared with a plain lower-case substring.
  it("finds Turkish İ and decomposed text, once", () => {
    typed = "iş";
    expect(
      offered(
        TextInputScreen({
          headerTitle: "Payee",
          suggestions: ["\u0130\u015fBank ATM", "Trader Joes"],
        }),
      ),
    ).toEqual(["\u0130\u015fBank ATM"]);
    typed = "caf\u00e9";
    expect(
      offered(
        TextInputScreen({
          headerTitle: "Payee",
          suggestions: ["Cafe\u0301 Central", "Caf\u00e9 Central"],
        }),
      ),
    ).toEqual(["Cafe\u0301 Central"]);
  });
});
