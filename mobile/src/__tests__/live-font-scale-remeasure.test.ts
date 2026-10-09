import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";

// iOS Fabric keeps a Text's cached paragraph measurement when the system text
// size changes while the app is open: glyphs grow or shrink, but the frame
// stays at the old size (clipped dates, or tall blank bands after shrinking).
// The owners below key their native Text on the live font scale so a size
// change mounts fresh text that measures at the new scale. These tests execute
// the real component bodies with native hosts substituted and assert the keys
// that drive that remount; they do not replace native geometry checks.
type Node = {
  type: unknown;
  props: Record<string, any>;
  children: (Node | string)[];
};

let fontScale = 1;

const react = {
  createElement(type: any, props: any, ...children: any[]) {
    return typeof type === "function"
      ? type({ ...props, children })
      : { type, props: props ?? {}, children: children.flat().filter(Boolean) };
  },
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
    React: react,
    require(id: string) {
      if (id === "react") return { __esModule: true, default: react, ...react };
      if (id in modules) return modules[id];
      throw new Error(`Unexpected require ${id} from ${file}`);
    },
  });
  return exports;
}

function findAll(node: Node | string, type: string): Node[] {
  if (typeof node === "string") return [];
  const own = node.type === type ? [node] : [];
  return own.concat(...node.children.map((child) => findAll(child, type)));
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

  it("mounts a new date text when the font scale changes", () => {
    const [before] = findAll(render(), "Text");
    fontScale = 3.12;
    const [after] = findAll(render(), "Text");

    expect(after.children).toEqual(["September 8, 2017"]);
    expect(after.props.key).not.toEqual(before.props.key);
    fontScale = 1;
    expect(findAll(render(), "Text")[0].props.key).toEqual(before.props.key);
  });

  it("remeasures the optional daily total with its date", () => {
    const [before] = findAll(render("-$33.71"), "AmountText");
    fontScale = 3.12;
    const [after] = findAll(render("-$33.71"), "AmountText");

    expect(after.children).toEqual(["-$33.71"]);
    expect(after.props.key).not.toEqual(before.props.key);
    expect(findAll(render(), "AmountText").length).toBe(0);
  });

  it("keeps the same text mounted while the scale is unchanged", () => {
    expect(findAll(render("-$1"), "Text")[0].props.key).toEqual(
      findAll(render("-$2"), "Text")[0].props.key,
    );
  });
});
