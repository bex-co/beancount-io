import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as spacing from "../../../common/theme/spacing";
import * as typography from "../../../common/theme/typography";
import * as layout from "../header-layout";

// Execute the real component bodies. Only native hosts and external state are
// substituted; assertions inspect their rendered props, not source strings.
type Node = {
  type: string;
  props: Record<string, any>;
  children: Node[];
};
let fontScale = 1;
const react = {
  createElement(type: any, props: any, ...children: any[]) {
    return typeof type === "function"
      ? type({ ...props, children })
      : { type, props: props ?? {}, children: children.flat().filter(Boolean) };
  },
  useMemo: (fn: () => unknown) => fn(),
  useRef: () => ({ current: null }),
  useState: (initial: unknown) => [initial, () => {}],
};
const theme = {
  ...spacing,
  ...typography,
  useTheme: () => ({ colorTheme: {} }),
};
function loadComponent(file: string): any {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    React: react,
    require(id: string) {
      if (id === "react") return react;
      if (id === "react-native")
        return {
          View: "View",
          Text: "Text",
          TouchableOpacity: "TouchableOpacity",
          Pressable: "Pressable",
          Modal: "Modal",
          ScrollView: "ScrollView",
          StyleSheet: { create: (styles: unknown) => styles },
          useWindowDimensions: () => ({ fontScale }),
          Platform: { OS: "ios" },
        };
      if (id === "@expo/vector-icons") return { Ionicons: "Icon" };
      if (id === "expo-router") return { router: { push() {} } };
      if (id === "@/common/theme") return theme;
      if (id === "@/common/theme/spacing") return spacing;
      if (id === "./header-layout") return layout;
      if (id.startsWith("@/common/hooks/use-translations"))
        return { useTranslations: () => ({ t: (key: string) => key }) };
      if (id.endsWith("use-ledger-errors"))
        return { useLedgerErrors: () => ({ count: 0 }) };
      if (id.startsWith("@/common/hooks"))
        return { useThemeStyle: (fn: any) => fn({}) };
      if (id === "./ledger-drawer-context")
        return { useLedgerDrawer: () => ({ openDrawer() {} }) };
      if (id === "../menu-button")
        return loadComponent(
          path.join(__dirname, "../../menu-button/index.tsx"),
        );
      if (id === "./pending-action")
        return { createPendingMenuAction: () => ({ flush() {} }) };
      if (id === "@/common/rtl") return { LEADING_TEXT_ALIGN: "left" };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return exports;
}
const { LedgerDrawerHeader } = loadComponent(
  path.join(__dirname, "../ledger-drawer-header.tsx"),
);
const flattenStyle = (style: any): any => Object.assign({}, ...[style].flat());
const buttons = (node: Node): Node[] => [
  ...(node.props.accessibilityRole === "button" ? [node] : []),
  ...node.children.flatMap((child) =>
    typeof child === "object" ? buttons(child) : [],
  ),
];

describe("tab header layout contract", () => {
  for (const [scale, expectedHeight] of [
    [1, 50],
    [1.4, 58],
    [2, 72],
    [3, 96],
  ]) {
    it(`keeps all tab/action states equal at font scale ${scale}`, () => {
      fontScale = scale;
      const action = { icon: "plus", accessibilityLabel: "Add", onPress() {} };
      const cases = [
        {
          title: "Home",
          action: { icon: "plus", accessibilityLabel: "Add", items: [] },
        },
        { title: "Transactions", action },
        { title: "Accounts", action },
        { title: "Files", action: { ...action, disabled: true } },
        { title: "Reports" },
        { title: "只读账本", action: false },
      ];
      const trees: Node[] = cases.map((props) => LedgerDrawerHeader(props));
      const heights = trees.map(
        (tree) => flattenStyle(tree.props.style).height,
      );
      expect(new Set(heights).size).toBe(1);
      // Equal heights alone would allow accidentally enlarging every tab.
      expect(heights[0]).toBe(expectedHeight);
      expect(heights[0] - 24 >= 24 * scale).toBe(true);
      for (const tree of trees) {
        const barStyle = flattenStyle(tree.props.style);
        const availableHeight =
          barStyle.height - 2 * (barStyle.paddingVertical ?? 0);
        const [left, , right] = tree.children;
        expect(flattenStyle(left.props.style).width).toBe(
          flattenStyle(right.props.style).width,
        );
        for (const button of buttons(tree)) {
          const style = flattenStyle(
            typeof button.props.style === "function"
              ? button.props.style({ pressed: false })
              : button.props.style,
          );
          expect(style.width).toBe(44);
          expect(style.height).toBe(44);
          expect(style.height <= availableHeight).toBe(true);
        }
      }
      expect(buttons(trees[4]).length).toBe(2);
      expect(buttons(trees[5]).length).toBe(2);
      expect(buttons(trees[3])[2].props.disabled).toBe(true);
    });
  }
});
