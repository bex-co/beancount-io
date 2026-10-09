import fs from "fs";
import path from "path";
import ts from "typescript";

// Under a Persian (RTL) layout, the commit diff's horizontal scroller opened
// at its right end, 95 points past every `diff --git` and `+` prefix. The
// scroller and its content are pinned left-to-right. The initial viewport is a
// native behavior verified on the simulator; this guards the wiring that
// produces it.
const file = path.join(
  __dirname,
  "..",
  "screens/commit-detail-screen/commit-detail-screen.tsx",
);
const source = ts.createSourceFile(
  file,
  fs.readFileSync(file, "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const scrollers: ts.JsxOpeningElement[] = [];
(function visit(node: ts.Node) {
  if (
    ts.isJsxOpeningElement(node) &&
    node.tagName.getText() === "ScrollView" &&
    node.attributes.properties.some(
      (attr) => ts.isJsxAttribute(attr) && attr.name.getText() === "horizontal",
    )
  ) {
    scrollers.push(node);
  }
  ts.forEachChild(node, visit);
})(source);
const attribute = (element: ts.JsxOpeningElement, name: string) =>
  element.attributes.properties
    .filter(ts.isJsxAttribute)
    .find((attr) => attr.name.getText() === name)
    ?.initializer?.getText();
const contains = (element: ts.JsxOpeningElement, text: string) =>
  (element.parent as ts.JsxElement).getText().includes(text);

describe("commit diff source direction", () => {
  it("pins the diff scroller and its content left-to-right", () => {
    const diff = scrollers.filter((scroller) =>
      contains(scroller, "DiffLineView"),
    );
    expect(diff.length).toBe(1);
    expect(attribute(diff[0], "style")).toBe("{LTR_SOURCE}");
    expect(attribute(diff[0], "contentContainerStyle")).toBe("{LTR_SOURCE}");
  });

  it("keeps the interface around the source in the app's direction", () => {
    // rtl.ts imports react-native, so read the constant from its source.
    const rtl = fs.readFileSync(
      path.join(__dirname, "..", "common/rtl.ts"),
      "utf8",
    );
    expect(
      rtl.includes('export const LTR_SOURCE = { direction: "ltr" } as const;'),
    ).toBe(true);
    const pinned = source.getText().split("LTR_SOURCE").length - 1;
    // The import plus the two scroller props: nothing else is pinned.
    expect(pinned).toBe(3);
  });
});
