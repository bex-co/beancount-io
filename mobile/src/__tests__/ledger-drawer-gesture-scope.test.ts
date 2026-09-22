import fs from "fs";
import path from "path";
import ts from "typescript";

// Hit testing is native, but the recognizer must first be an ancestor of both
// layers. This guards the original bug: only the shifted content was wrapped.
test("drawer close gesture covers the menu and shifted content together", () => {
  const source = ts.createSourceFile(
    "ledger-drawer.tsx",
    fs.readFileSync(
      path.join(__dirname, "../components/ledger-drawer/ledger-drawer.tsx"),
      "utf8",
    ),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const covered = new Set<string>();
  function visit(node: ts.Node, insidePan = false): void {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      if (opening.tagName.getText(source) === "GestureDetector") {
        insidePan = opening.attributes.properties.some(
          (attr) =>
            ts.isJsxAttribute(attr) &&
            attr.name.getText(source) === "gesture" &&
            attr.initializer?.getText(source) === "{panGesture}",
        );
      }
    }
    if (
      insidePan &&
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText(source) === "styles"
    ) {
      covered.add(node.name.text);
    }
    ts.forEachChild(node, (child) => visit(child, insidePan));
  }
  visit(source);
  expect(covered.has("drawerLayer")).toBe(true);
  expect(covered.has("content")).toBe(true);
});
