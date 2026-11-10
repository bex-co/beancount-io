import fs from "fs";
import path from "path";
import ts from "typescript";

// w22/011: in Persian a file row's icon touched the file name and the 8 pt the
// 28 pt icon box leaves around the 20 pt glyph moved to the screen edge. The
// glyph came from an icon font, which has no right-to-left letters, so the
// stretched Text aligned it to the box's physical left in both directions.
// Native layout is verified on the simulator; this pins the style that makes
// the box follow the layout direction, from the source (the screen needs the
// native runtime).
const file = ts.createSourceFile(
  "index.tsx",
  fs.readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

const properties: ts.PropertyAssignment[] = [];
const visit = (node: ts.Node) => {
  if (ts.isPropertyAssignment(node)) properties.push(node);
  ts.forEachChild(node, visit);
};
visit(file);

const named = (name: string) =>
  properties.filter((property) => property.name.getText() === name);

/** The literal properties of a named style, as written. */
function styleOf(name: string): Record<string, string> {
  const [style] = named(name);
  expect(Boolean(style)).toBe(true);
  const literal = style.initializer as ts.ObjectLiteralExpression;
  return Object.fromEntries(
    literal.properties
      .filter(ts.isPropertyAssignment)
      .map((property) => [
        property.name.getText(),
        property.initializer.getText(),
      ]),
  );
}

describe("a Files row's icon box", () => {
  it("keeps its glyph at the start edge, which flips with the layout", () => {
    expect(styleOf("rowIcon")).toEqual({
      width: "28",
      alignItems: '"flex-start"',
    });
  });

  it("keeps the 28 pt column the divider's indent is measured from", () => {
    // Folders and files line up, and the divider starts under the text.
    expect(styleOf("divider").marginStart).toBe("gutter + 28");
  });
});

describe("the Files screen's styles", () => {
  it("name no physical side, so every row mirrors as a whole", () => {
    const physical = properties
      .map((property) => property.name.getText())
      .filter((name) =>
        /^(margin|padding|border)(Left|Right)|^(left|right)$/.test(name),
      );
    expect(physical).toEqual([]);
  });
});
