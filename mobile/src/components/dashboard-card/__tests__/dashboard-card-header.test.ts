import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as dynamicType from "../../../common/theme/dynamic-type";

// Executes the real DashboardCard and inspects its header's resolved layout.
// At accessibility text sizes a one-row header squeezed the title to a column
// one letter wide beside "See all"; the header now stacks there instead.
type Node = { type: unknown; props: Record<string, any>; children: unknown[] };

let fontScale = 1;
const react = {
  createElement: (type: unknown, props: any, ...children: unknown[]): Node => ({
    type,
    props: props ?? {},
    children: children
      .flat()
      .filter((child) => child != null && child !== false),
  }),
};

function load(): (props: Record<string, unknown>) => Node {
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
    "react-native": {
      StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
      Text: "Text",
      View: "View",
      useWindowDimensions: () => ({ fontScale }),
    },
    "@expo/vector-icons": { Ionicons: "Icon" },
    "@/components/pressable-scale": { PressableScale: "PressableScale" },
    "@/common/hooks/use-theme-style": { useThemeStyle: (fn: any) => fn({}) },
    "@/common/theme": {
      fontSizes: {},
      fontWeights: {},
      gutter: 16,
      space: {},
      useTheme: () => ({ colorTheme: {} }),
    },
    "@/common/hooks/use-translations": {
      useTranslations: () => ({ t: (key: string) => key }),
    },
    "@/common/rtl": {
      LEADING_TEXT_ALIGN: "left",
      directionalIcon: (n: string) => n,
    },
    "@/common/theme/dynamic-type": dynamicType,
  };
  vm.runInNewContext(source, {
    exports,
    React: react,
    require: (id: string) => modules[id],
  });
  return exports.DashboardCard;
}

const flat = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? Object.assign({}, ...style.map(flat))
    : style && typeof style === "object"
      ? (style as Record<string, unknown>)
      : {};

const DashboardCard = load();
const header = (props: Record<string, unknown>) => {
  const card = DashboardCard({ children: "body", ...props });
  return card.children[0] as Node;
};

describe("DashboardCard header at enlarged text", () => {
  afterEach(() => {
    fontScale = 1;
  });

  it("keeps title and See all on one row at ordinary sizes", () => {
    for (const scale of [1, 1.235]) {
      fontScale = scale;
      const row = header({ title: "Letzte Transaktionen", onSeeAll() {} });
      expect(flat(row.props.style).flexDirection).toBe("row");
      expect(flat((row.children[0] as Node).props.style).flex).toBe(1);
    }
  });

  it("gives the title its own line at accessibility sizes, actions below at the end", () => {
    fontScale = 3.12;
    const row = header({ title: "Letzte Transaktionen", onSeeAll() {} });
    const [title, actions] = row.children as Node[];

    expect(flat(row.props.style).flexDirection).toBe("column");
    expect(flat(title.props.style).flex).toBe(0);
    expect(title.children).toEqual(["Letzte Transaktionen"]);
    expect(flat(actions.props.style).alignSelf).toBe("flex-end");
    const seeAll = actions.children[0] as Node;
    expect(seeAll.props.accessibilityLabel).toBe("seeAll");
  });

  it("does not stack a header that has no title", () => {
    fontScale = 3.12;
    const row = header({ onSeeAll() {} });
    expect(flat(row.props.style).flexDirection).toBe("row");
  });

  it("remounts the heading when the text size changes", () => {
    const before = header({ title: "Budget", onSeeAll() {} })
      .children[0] as Node;
    fontScale = 3.12;
    const after = header({ title: "Budget", onSeeAll() {} })
      .children[0] as Node;
    expect(after.props.key).not.toEqual(before.props.key);
  });
});
