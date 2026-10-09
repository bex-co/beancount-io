import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";

// Asserts the font-scale keys that make iOS remeasure text after a live
// text-size change (see DateSectionHeader); not a native geometry check.
type Node = {
  type: unknown;
  props: Record<string, any>;
  children: (Node | string)[];
};

let fontScale = 1;

const react = {
  createElement: (type: unknown, props: any, ...children: any[]): Node => ({
    type,
    props: props ?? {},
    children: children.flat().filter(Boolean),
  }),
};

function load(file: string, modules: Record<string, unknown>): any {
  const exports = {};
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    require(id: string) {
      if (id === "react") return { __esModule: true, default: react, ...react };
      if (id in modules) return modules[id];
      throw new Error(`Unexpected require ${id} from ${file}`);
    },
  });
  return exports;
}

const reactNative = {
  StyleSheet: { create: (styles: unknown) => styles },
  Text: "Text",
  View: "View",
  useWindowDimensions: () => ({ fontScale }),
};

describe("DateSectionHeader live font-scale remeasurement", () => {
  const { DateSectionHeader } = load(
    "screens/transactions-screen/date-section-header.tsx",
    {
      "react-native": reactNative,
      "@/common/hooks": { useThemeStyle: (fn: any) => fn({}) },
      "@/common/theme": {
        fontSizes: { sm: 13 },
        fontWeights: { medium: "500" },
        gutter: 16,
        sectionHeaderPaddingVertical: 8,
      },
      "@/components/amount-text": { AmountText: "AmountText" },
    },
  );
  const render = (total?: string): Node =>
    DateSectionHeader({ displayDate: "September 8, 2017", total });

  afterEach(() => {
    fontScale = 1;
  });

  it("remounts the date and daily total when the scale changes either way", () => {
    const before = render("-$33.71");
    fontScale = 3.12;
    const enlarged = render("-$33.71");
    fontScale = 1;
    const restored = render("-$33.71");

    expect(enlarged.props.key).not.toEqual(before.props.key);
    expect(restored.props.key).toEqual(before.props.key);
    expect(enlarged.children.map((child) => (child as Node).type)).toEqual([
      "Text",
      "AmountText",
    ]);
    expect((enlarged.children[0] as Node).children).toEqual([
      "September 8, 2017",
    ]);
  });

  it("keeps the header mounted when only its data changes", () => {
    expect(render("-$1").props.key).toEqual(render().props.key);
  });
});
