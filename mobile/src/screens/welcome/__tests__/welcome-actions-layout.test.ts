import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as serverUrls from "../../../common/server-url-validation";
import * as dynamicType from "../../../common/theme/dynamic-type";

// Executes the real WelcomeScreen body. Only native hosts, the shared Button
// and sign-in state are substituted; assertions inspect the rendered props of
// the actual Sign In / Sign Up parent, which is where the clipping lived.
type Node = {
  type: string;
  props: Record<string, any>;
  children: (Node | string)[];
};
let fontScale = 1;
let guestServer = "";
let serverUrl = "https://beancount.io/";
let destination = "";
let signIn: Record<string, unknown> = {
  pendingFlow: null,
  failure: null,
  start() {},
};
const react = {
  createElement(type: any, props: any, ...children: any[]) {
    return typeof type === "function"
      ? type({ ...props, children })
      : { type, props: props ?? {}, children: children.flat().filter(Boolean) };
  },
};
function loadWelcome(): any {
  const exports = {};
  const file = path.join(__dirname, "..", "index.tsx");
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    React: react,
    require(id: string) {
      if (id === "react-native")
        return {
          Dimensions: { get: () => ({ height: 844, width: 390 }) },
          View: "View",
          ScrollView: "ScrollView",
          Text: "Text",
          Image: "Image",
          StyleSheet: { create: (styles: unknown) => styles },
          useWindowDimensions: () => ({ fontScale }),
        };
      if (id === "@expo/vector-icons") return { Ionicons: "Icon" };
      if (id === "expo-router")
        return {
          router: {
            push(path: string) {
              destination = path;
            },
          },
        };
      if (id === "@/common/guest/guest-state")
        return {
          startGuestVisit(server: string) {
            guestServer = server;
          },
        };
      if (id === "@/common/vars/server-url")
        return {
          getServerUrl: () => serverUrl,
          serverUrlOverrideVar: () => serverUrl,
        };
      if (id === "@apollo/client")
        return { useReactiveVar: (read: () => unknown) => read() };
      if (id === "@/common/server-url-validation") return serverUrls;
      if (id === "react-native-safe-area-context")
        return { SafeAreaView: "SafeAreaView" };
      if (id === "@/common/hooks/use-translations")
        return { useTranslations: () => ({ t: (key: string) => key }) };
      if (id === "@/common/hooks")
        return { useThemeStyle: (fn: any) => fn({}) };
      if (id === "@/common/theme")
        return {
          prefersStackedLayout: dynamicType.prefersStackedLayout,
          useTheme: () => ({ colorTheme: {} }),
        };
      if (id === "@/components") return { Button: "Button" };
      if (id === "@/components/pressable-scale")
        return { PressableScale: "PressableScale" };
      if (id === "@/screens/welcome/use-native-sign-in")
        return { useNativeSignIn: () => signIn };
      if (id === "@/assets/images/icon.png") return 1;
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return exports;
}
const { WelcomeScreen } = loadWelcome();
const flattenStyle = (style: any): any =>
  Object.assign({}, ...[style].flat().filter(Boolean));
const find = (node: Node, match: (n: Node) => boolean): Node[] => [
  ...(match(node) ? [node] : []),
  ...node.children.flatMap((child) =>
    typeof child === "object" ? find(child, match) : [],
  ),
];
function render() {
  const tree: Node = WelcomeScreen();
  const buttons = find(
    tree,
    (n) =>
      n.props.testID === "welcome-sign-in" ||
      n.props.testID === "welcome-sign-up",
  );
  const row = find(tree, (n) =>
    n.children.some(
      (c) => typeof c === "object" && c.props.testID === "welcome-sign-in",
    ),
  )[0];
  return { tree, buttons, row };
}

describe("Welcome actions at every text size", () => {
  it("enters examples on the selected server without starting sign-in", () => {
    let signedIn = false;
    signIn = {
      pendingFlow: null,
      failure: null,
      start() {
        signedIn = true;
      },
    };
    const { tree } = render();
    const example = find(
      tree,
      (n) => n.props.testID === "welcome-try-example",
    )[0];
    expect(example.children).toEqual(["guestTryExample"]);
    example.props.onPress();
    expect(guestServer).toBe("https://beancount.io/");
    expect(destination).toBe("/examples");
    expect(signedIn).toBe(false);
  });
  afterEach(() => {
    serverUrl = "https://beancount.io/";
    guestServer = "";
    destination = "";
    fontScale = 1;
    signIn = { pendingFlow: null, failure: null, start() {} };
  });

  it("updates preview visibility when the effective endpoint changes", () => {
    for (const [url, visible] of [
      ["https://beancount.io", true],
      ["https://BEANCOUNT.io:443/", true],
      ["https://books.example/", false],
      ["http://localhost:8000/", false],
      ["https://beancount.io/custom/", false],
      ["https://beancount.io:8443/", false],
      ["https://beancount.io.attacker.example/", false],
      ["https://beancount.io/", true],
    ] as const) {
      serverUrl = url;
      const { tree, buttons } = render();
      expect(
        find(tree, (n) => n.props.testID === "welcome-try-example").length,
      ).toBe(visible ? 1 : 0);
      expect(buttons.length).toBe(2);
    }
  });

  it("ignores a stale preview press after the server changes", () => {
    const example = find(
      render().tree,
      (n) => n.props.testID === "welcome-try-example",
    )[0];
    serverUrl = "https://books.example/";
    example.props.onPress();
    expect(guestServer).toBe("");
    expect(destination).toBe("");
  });

  for (const scale of [1, 1.235, 1.3, 2, 3.12]) {
    it(`never caps the action row's height at font scale ${scale}`, () => {
      fontScale = scale;
      const { buttons, row } = render();
      expect(buttons.map((b) => b.props.testID)).toEqual([
        "welcome-sign-in",
        "welcome-sign-up",
      ]);
      // A fixed or maximum height on the parent is what clipped both labels:
      // the Buttons' own minHeight cannot grow past it.
      const rowStyle = flattenStyle(row.props.style);
      expect(rowStyle.height).toBe(undefined);
      expect(rowStyle.maxHeight).toBe(undefined);
      for (const button of buttons) {
        const style = flattenStyle(button.props.style);
        expect(style.height).toBe(undefined);
        expect(style.maxHeight).toBe(undefined);
        // Full labels, never a truncated or scaled-down replacement.
        expect(button.children).toEqual([
          button.props.testID === "welcome-sign-in" ? "signIn" : "signUp",
        ]);
      }
    });
  }

  it("keeps the side-by-side row at ordinary text sizes", () => {
    for (const scale of [1, 1.235]) {
      fontScale = scale;
      const { buttons, row } = render();
      expect(flattenStyle(row.props.style).flexDirection).toBe("row");
      for (const button of buttons)
        expect(flattenStyle(button.props.style).flex).toBe(1);
    }
  });

  it("stacks full-width actions at accessibility text sizes", () => {
    for (const scale of [1.3, 3.12]) {
      fontScale = scale;
      const { buttons, row } = render();
      expect(flattenStyle(row.props.style).flexDirection).toBe("column");
      // `flex: 1` in a column would split its height instead of letting each
      // button size to its label.
      for (const button of buttons)
        expect(flattenStyle(button.props.style).flex).toBe(undefined);
    }
  });

  it("keeps the failure message below the actions, not inside the row", () => {
    fontScale = 3.12;
    signIn = {
      pendingFlow: null,
      failure: { reason: "rejected", flow: "sign_in" },
      start() {},
    };
    const { tree, row } = render();
    const footer = find(tree, (n) => n.children.includes(row))[0];
    const error = footer.children[footer.children.indexOf(row) + 1] as Node;
    expect(error.type).toBe("Text");
    expect(error.children).toEqual(["signInFailed"]);
  });

  it("disables both actions while one flow is pending, at any size", () => {
    fontScale = 3.12;
    signIn = { pendingFlow: "sign_up", failure: null, start() {} };
    const { buttons } = render();
    expect(buttons.map((b) => b.props.disabled)).toEqual([true, true]);
    expect(buttons.map((b) => b.props.loading)).toEqual([false, true]);
  });
});
