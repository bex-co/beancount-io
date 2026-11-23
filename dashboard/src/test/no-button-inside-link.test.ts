import { readFileSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const sourceRoot = join(__dirname, "..");

function nestedButtons(path: string): string[] {
  const source = ts.createSourceFile(
    path,
    readFileSync(join(sourceRoot, path), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations: string[] = [];
  function visit(node: ts.Node, insideLink: boolean): void {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;
    if (!opening) {
      ts.forEachChild(node, (child) => visit(child, insideLink));
      return;
    }

    const tag = opening.tagName.getText(source);
    const hasAsChild = opening.attributes.properties.some(
      (prop) =>
        ts.isJsxAttribute(prop) &&
        prop.name.getText(source) === "asChild" &&
        !(
          prop.initializer &&
          ts.isJsxExpression(prop.initializer) &&
          prop.initializer.expression?.kind === ts.SyntaxKind.FalseKeyword
        ),
    );
    if (insideLink && tag === "Button" && !hasAsChild) {
      const { line } = source.getLineAndCharacterOfPosition(opening.getStart());
      violations.push(`${path}:${line + 1}`);
    }
    if (ts.isJsxElement(node)) {
      const childrenInsideLink = insideLink || tag === "a" || tag === "Link";
      node.children.forEach((child) => visit(child, childrenInsideLink));
    }
  }
  visit(source, false);
  return violations;
}

it("renders button-styled links as single interactive elements", () => {
  const violations = readdirSync(sourceRoot, { recursive: true })
    .filter((path) => {
      const dirs = path.split(sep).slice(0, -1);
      return (
        path.endsWith(".tsx") &&
        !path.endsWith(".test.tsx") &&
        !dirs.includes("__tests__") &&
        dirs[0] !== "test"
      );
    })
    .flatMap(nestedButtons)
    .sort();
  expect(violations).toEqual([]);
});
