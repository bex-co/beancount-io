import fs from "fs";
import path from "path";
import ts from "typescript";
import { contrastRatio } from "../common/theme/color-utils";
import { themes, type ThemeName } from "../common/theme/palette";

/**
 * An icon that is the only visual cue for a control is a graphical object, and
 * WCAG 1.4.11 asks 3:1 of it against the surface it sits on. `black60` is the
 * placeholder/disabled step (1.6–1.8:1 on light surfaces), so a chevron or a
 * clear button painted with it is present but barely visible (w22/027; w2/066
 * fixed Reports' chevrons the same way).
 *
 * Each case reads the icon's real `color` token from its owner's source and
 * measures it against the page and the card fill, the two surfaces these icons
 * sit on, in both themes. A listed icon, not a scan of every `Ionicons`: icons
 * beside a text label or purely decorative are the owner's call.
 */
const NON_TEXT_BAR = 3;
const SURFACES = ["white", "controlFill"] as const;

type Case = {
  name: string;
  file: string;
  /** The attribute that picks the icon out of its file, and what it contains. */
  find: { attribute: "name" | "style"; includes: string };
};

const CASES: Case[] = [
  {
    name: "Accounts' expand chevron",
    file: "components/account-table/account-table.tsx",
    find: { attribute: "style", includes: "styles.chevron" },
  },
  {
    name: "Budget's entries toggle chevron",
    file: "screens/budget-screen/components/budget-history-rows.tsx",
    find: { attribute: "name", includes: "chevron-up" },
  },
  {
    name: "Open Account's prefix dropdown chevron",
    file: "screens/open-account-screen/open-account-screen.tsx",
    find: { attribute: "style", includes: "styles.prefixChevron" },
  },
  {
    name: "the filter sheet's clear-account button",
    file: "screens/transaction-filters-screen/transaction-filters-screen.tsx",
    find: { attribute: "name", includes: "close-circle" },
  },
];

const attributeText = (
  element: ts.JsxOpeningLikeElement,
  name: string,
): string | undefined =>
  element.attributes.properties
    .filter(ts.isJsxAttribute)
    .find((attr) => attr.name.getText() === name)
    ?.initializer?.getText();

/** The theme token an icon's `color={theme.<token>}` names. */
function iconColorToken(testCase: Case): string | undefined {
  const source = ts.createSourceFile(
    testCase.file,
    fs.readFileSync(path.join(__dirname, "..", testCase.file), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const tokens: (string | undefined)[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText() === "Ionicons" &&
      (attributeText(node, testCase.find.attribute) ?? "").includes(
        testCase.find.includes,
      )
    ) {
      tokens.push(
        /^\{theme\.(\w+)\}$/.exec(attributeText(node, "color") ?? "")?.[1],
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  // Exactly one icon: a second match means the selector no longer pins it.
  expect(tokens.length).toBe(1);
  return tokens[0];
}

describe("the only cue of a control reaches 3:1", () => {
  for (const testCase of CASES) {
    for (const themeName of ["light", "dark"] as ThemeName[]) {
      for (const surface of SURFACES) {
        it(`keeps ${testCase.name} visible on ${surface} in ${themeName}`, () => {
          const token = iconColorToken(testCase);
          expect(token === undefined).toBe(false);
          const theme = themes[themeName].colorTheme as unknown as Record<
            string,
            string
          >;
          expect(
            contrastRatio(theme[token as string], theme[surface]) >=
              NON_TEXT_BAR,
          ).toBe(true);
        });
      }
    }
  }
});
