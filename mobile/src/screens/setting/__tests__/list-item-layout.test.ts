import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";

// w22/048: a Settings row with only a title (Plan, Help Center, Log out) put its
// one line at the top of the 64pt minimum height while its icon and chevron are
// pinned to the middle of it. This executes the real row and reads the styles
// it hands to the native views; the pixels are checked on the simulator.
type Node = {
  type: unknown;
  props: Record<string, any>;
  children: (Node | string)[];
};

const react = {
  createElement: (type: unknown, props: any, ...children: any[]): Node => ({
    type,
    props: props ?? {},
    children: children
      .flat()
      .filter(
        (child) => child !== null && child !== false && child !== undefined,
      ),
  }),
  Fragment: "Fragment",
};

function loadRow(): (props: Record<string, unknown>) => Node {
  const exports: Record<string, any> = {};
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", "list-item.tsx"), "utf8"),
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
    require(id: string): any {
      switch (id) {
        case "react":
          return { __esModule: true, default: react, ...react };
        case "react-native":
          return {
            StyleSheet: { create: (styles: unknown) => styles },
            Text: "Text",
            TouchableOpacity: "TouchableOpacity",
            View: "View",
            useWindowDimensions: () => ({ fontScale: 1 }),
          };
        case "@expo/vector-icons":
          return { Ionicons: "Ionicons" };
        case "@/common/hooks/use-theme-style":
          return { useThemeStyle: (factory: any) => factory({}) };
        case "@/common/theme":
          return { useTheme: () => ({ colorTheme: {} }) };
        case "@/common/rtl":
          return {
            directionalIcon: (name: string) => name,
            LEADING_TEXT_ALIGN: "left",
          };
        case "./list-item-label":
          return { listItemLabel: () => undefined };
        default:
          throw new Error(`Unexpected dependency: ${id}`);
      }
    },
  });
  return exports.ListItemHorizontal;
}

const ListItemHorizontal = loadRow();

function findAll(node: Node | string, match: (node: Node) => boolean): Node[] {
  if (typeof node === "string") return [];
  return (match(node) ? [node] : []).concat(
    ...node.children.map((child) => findAll(child, match)),
  );
}

describe("a Settings row's vertical placement (w22/048)", () => {
  const title = { title: "Help Center", onPress: () => undefined };

  it("centres the text block in the minimum height the icon and chevron are pinned to", () => {
    const row = ListItemHorizontal({ ...title, icon: "icon" });
    const container = row.props.style;
    expect(container.minHeight).toBe(64);
    expect(container.justifyContent).toBe("center");
  });

  it("keeps the icon and the chevron at the middle of that same minimum height", () => {
    const row = ListItemHorizontal({ ...title, icon: "icon" });
    const pinned = findAll(
      row,
      (node) =>
        node.type === "View" && node.props.style?.position === "absolute",
    );
    // The icon box (28pt) and the chevron box (20pt) each centre on the row.
    const icon = pinned.find((node) => node.props.style.height === 28);
    const arrow = pinned.find((node) => node.props.style.height === undefined);
    expect(icon?.props.style.top).toBe((64 - 28) / 2);
    expect(arrow?.props.style.top).toBe((64 - 20) / 2);
  });

  it("does the same for a row without an action, which is a plain view", () => {
    const row = ListItemHorizontal({ title: "Version", content: "1.2.3" });
    expect(row.type).toBe("View");
    expect(row.props.style.justifyContent).toBe("center");
  });
});
