import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import * as userDisplay from "../../../common/user-display";

// Execute the real component with a minimal React whose useState survives
// re-renders, so an image load failure can be followed to the next frame.
type Node = { type: string; props: Record<string, any>; children: any[] };
let states: unknown[] = [];
let cursor = 0;
const react = {
  createElement(type: any, props: any, ...children: any[]) {
    return typeof type === "function"
      ? type({ ...props, children })
      : { type, props: props ?? {}, children: children.flat() };
  },
  useState(initial: unknown) {
    const slot = cursor++;
    if (!(slot in states)) states[slot] = initial;
    return [
      states[slot],
      (value: unknown) => {
        states[slot] = value;
      },
    ];
  },
};

function loadAvatar(): (props: Record<string, unknown>) => Node {
  const exports: Record<string, any> = {};
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../index.tsx"), "utf8"),
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
      if (id === "react") return react;
      if (id === "react-native")
        return {
          Image: "Image",
          Text: "Text",
          View: "View",
          PixelRatio: { getPixelSizeForLayoutSize: (size: number) => size * 3 },
          StyleSheet: { create: (styles: unknown) => styles },
        };
      if (id === "@/common/theme")
        return {
          useTheme: () => ({
            colorTheme: { controlSelected: "tint", primary: "green" },
          }),
        };
      if (id === "@/common/user-display") return userDisplay;
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return exports.UserAvatar;
}

const UserAvatar = loadAvatar();
const render = (props: Record<string, unknown>): Node => {
  cursor = 0;
  return UserAvatar(props);
};
const content = (tree: Node): Node => tree.children[0];

describe("UserAvatar", () => {
  beforeEach(() => {
    states = [];
  });

  it("shows initials when there is no picture", () => {
    const tree = render({ uri: null, name: "Ada Lovelace", size: 32 });
    expect(content(tree).type).toBe("Text");
    expect(content(tree).children).toEqual(["AL"]);
  });

  it("requests a sharp, fallible Gravatar image at the drawn size", () => {
    const tree = render({
      uri: "https://www.gravatar.com/avatar/abc?size=48",
      name: "Ada",
      size: 32,
    });
    expect(content(tree).type).toBe("Image");
    expect(content(tree).props.source.uri).toBe(
      "https://www.gravatar.com/avatar/abc?s=96&d=404",
    );
  });

  it("falls back to initials once the image fails, and stays there", () => {
    const props = {
      uri: "https://example.test/ada.png",
      name: "ada",
      size: 24,
    };
    content(render(props)).props.onError();
    const after = content(render(props));
    expect(after.type).toBe("Text");
    expect(after.children).toEqual(["A"]);
  });

  it("tries again when the picture changes after a failure", () => {
    content(
      render({ uri: "https://example.test/old.png", name: "ada", size: 24 }),
    ).props.onError();
    const next = content(
      render({ uri: "https://example.test/new.png", name: "ada", size: 24 }),
    );
    expect(next.type).toBe("Image");
  });

  it("is a circle of the requested size hidden from screen readers", () => {
    const tree = render({ name: "Ada", size: 40 });
    const style = Object.assign({}, ...tree.props.style);
    expect(style.width).toBe(40);
    expect(style.height).toBe(40);
    expect(style.borderRadius).toBe(20);
    expect(tree.props.accessible).toBe(false);
    expect(tree.props.importantForAccessibility).toBe("no-hide-descendants");
  });
});
