import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";
import { contrastRatio } from "../common/theme/color-utils";
import { themes, type ThemeName } from "../common/theme/palette";

/**
 * Informative text painted with the placeholder/disabled ramp (`black60`)
 * measures about 1.6–1.8:1 on light surfaces: present, but unreadable. Each
 * row runs the owner's real `getStyles` against both real themes and checks
 * the text style's color against the surface it is painted on.
 */
const TEXT_BAR = 4.5; // WCAG 1.4.3, text below 18pt

type Case = {
  name: string;
  file: string;
  text: string;
  /** Style key holding the surface color, or a theme key for the page. */
  surface: { style: string } | { theme: string };
};

const CASES: Case[] = [
  {
    name: "account journal balance and cost captions",
    file: "screens/account-detail-screen/components/account-entry-row.tsx",
    text: "balance",
    surface: { style: "row" },
  },
  {
    name: "unavailable-ledger detail explanation",
    file: "components/route-ledger-unavailable.tsx",
    text: "stateText",
    surface: { style: "container" },
  },
  {
    name: "missing transaction explanation",
    file: "screens/transaction-detail-screen/transaction-detail-screen.tsx",
    text: "stateText",
    surface: { style: "stateContainer" },
  },
];

// Inert stand-in for every import except StyleSheet, so only `getStyles`
// and the module constants it reads are exercised.
const stub: any = new Proxy(function () {}, {
  get: (_target, key) => (key === "__esModule" ? true : stub),
  apply: () => stub,
});

function loadGetStyles(file: string): (theme: unknown) => any {
  const exports: Record<string, unknown> = {};
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
      },
    },
  ).outputText;
  vm.runInNewContext(`${source}\nexports.__getStyles = getStyles;`, {
    exports,
    require: (id: string) =>
      id === "react-native"
        ? { StyleSheet: { create: (styles: unknown) => styles } }
        : stub,
  });
  return exports.__getStyles as (theme: unknown) => any;
}

describe("informative text contrast", () => {
  for (const testCase of CASES) {
    const getStyles = loadGetStyles(testCase.file);
    for (const themeName of ["light", "dark"] as ThemeName[]) {
      it(`keeps ${testCase.name} readable in ${themeName}`, () => {
        const theme = themes[themeName].colorTheme as unknown as Record<
          string,
          string
        >;
        const styles = getStyles(theme);
        const surface =
          "style" in testCase.surface
            ? styles[testCase.surface.style].backgroundColor
            : theme[testCase.surface.theme];
        const ratio = contrastRatio(styles[testCase.text].color, surface);
        expect(ratio >= TEXT_BAR).toBe(true);
      });
    }
  }
});
