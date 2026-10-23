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
  // w21/128: the hairline token (black40) as text, about 1.34:1 in light.
  {
    name: "empty posting account placeholder",
    file: "screens/multi-postings-transaction/multi-postings-transaction-screen.tsx",
    text: "postingAccountPlaceholder",
    surface: { theme: "white" },
  },
  {
    name: "inactive Auto tag",
    file: "screens/multi-postings-transaction/multi-postings-transaction-screen.tsx",
    text: "postingAutoTag",
    surface: { theme: "white" },
  },
  // w21/127: white on amber was 1.9:1 dark, 2.7:1 light.
  {
    name: "pending badge on a transaction row",
    file: "screens/transactions-screen/entry-row/index.tsx",
    text: "badgeText",
    surface: { style: "badge" },
  },
  {
    name: "pending badge on an account journal row",
    file: "screens/account-detail-screen/components/account-entry-row.tsx",
    text: "badgeText",
    surface: { style: "badge" },
  },
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
  {
    name: "merchant directory section headers",
    file: "screens/merchants-screen/merchants-screen.tsx",
    text: "sectionHeaderText",
    surface: { style: "sectionHeader" },
  },
  {
    name: "merchant directory search feedback",
    file: "screens/merchants-screen/merchants-screen.tsx",
    text: "emptyMessage",
    surface: { style: "container" },
  },
  {
    name: "merchant directory error",
    file: "screens/merchants-screen/merchants-screen.tsx",
    text: "errorText",
    surface: { style: "container" },
  },
  {
    name: "merchant row badge",
    file: "screens/merchants-screen/merchant-row.tsx",
    text: "badgeText",
    surface: { style: "badge" },
  },
  {
    name: "merchant row subtitle",
    file: "screens/merchants-screen/merchant-row.tsx",
    text: "subtitle",
    surface: { theme: "white" },
  },
  {
    name: "merchant row metadata",
    file: "screens/merchants-screen/merchant-row.tsx",
    text: "meta",
    surface: { theme: "white" },
  },
  {
    name: "merchant row date",
    file: "screens/merchants-screen/merchant-row.tsx",
    text: "date",
    surface: { theme: "white" },
  },
  {
    name: "merchant detail count",
    file: "screens/merchant-detail-screen/merchant-detail-screen.tsx",
    text: "count",
    surface: { style: "container" },
  },
  {
    name: "merchant detail date range",
    file: "screens/merchant-detail-screen/merchant-detail-screen.tsx",
    text: "dateRange",
    surface: { style: "container" },
  },
  {
    name: "merchant detail recurrence helper",
    file: "screens/merchant-detail-screen/merchant-detail-screen.tsx",
    text: "toggleHelper",
    surface: { style: "container" },
  },
  {
    name: "merchant detail empty journal",
    file: "screens/merchant-detail-screen/merchant-detail-screen.tsx",
    text: "emptyMessage",
    surface: { style: "container" },
  },
  {
    name: "merchant detail error",
    file: "screens/merchant-detail-screen/merchant-detail-screen.tsx",
    text: "errorText",
    surface: { style: "container" },
  },
  {
    name: "merchant detail loading footer",
    file: "screens/merchant-detail-screen/merchant-detail-screen.tsx",
    text: "loadingFooterText",
    surface: { style: "container" },
  },
  {
    name: "transaction narration on list rows",
    file: "screens/transactions-screen/entry-row/index.tsx",
    text: "secondary",
    surface: { theme: "white" },
  },
  {
    name: "transaction narration on Home cards",
    file: "screens/transactions-screen/entry-row/index.tsx",
    text: "secondary",
    surface: { theme: "controlFill" },
  },
  {
    name: "report category shares on their card",
    file: "screens/reports-screen/components/category-breakdown.tsx",
    text: "pctLabel",
    surface: { theme: "controlFill" },
  },
  {
    name: "transaction filter group captions",
    file: "screens/transaction-filters-screen/transaction-filters-screen.tsx",
    text: "sectionTitle",
    surface: { style: "container" },
  },
  // w21/482: "Above target" was 2.22:1 in dark, "Below target" 3.0, "Starts" 2.95.
  {
    name: "budget card status badges",
    file: "screens/budget-screen/components/budget-group-card.tsx",
    text: "statusText",
    surface: { style: "statusBadge" },
  },
  {
    name: "New Ledger hints on the page",
    file: "screens/create-ledger-screen/create-ledger-screen.tsx",
    text: "hint",
    surface: { style: "container" },
  },
  {
    name: "New Ledger hints on the selected template",
    file: "screens/create-ledger-screen/create-ledger-screen.tsx",
    text: "hint",
    surface: { style: "templateSelected" },
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
  // The chart chrome names its factory differently.
  vm.runInNewContext(
    `${source}\nexports.__getStyles = typeof getStyles !== "undefined" ? getStyles : getChromeStyles;`,
    {
      exports,
      require: (id: string) =>
        id === "react-native"
          ? { StyleSheet: { create: (styles: unknown) => styles } }
          : stub,
    },
  );
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

// w21/481: load errors, empty states and row captions still took the placeholder
// grey (black60, 1.78:1 on white). Each runs against the page and the card fill,
// the two surfaces informative text sits on, in both themes.
const SECONDARY_TEXT: Array<[file: string, texts: string[]]> = [
  ["components/card-load-failure/index.tsx", ["message"]],
  ["components/load-more-failed/index.tsx", ["message"]],
  ["components/ledger-guard/ledger-guard.tsx", ["message"]],
  ["common/d3/chart-chrome.tsx", ["placeholderText"]],
  ["common/d3/interactive-line-chart.tsx", ["placeholderText"]],
  ["components/account-table/account-table.tsx", ["amountNote"]],
  ["screens/account-detail-screen/account-detail-screen.tsx", ["footerText"]],
  [
    "screens/account-detail-screen/components/account-entry-row.tsx",
    ["detail"],
  ],
  [
    "screens/account-detail-screen/components/account-journal-empty.tsx",
    ["stateText"],
  ],
  ["screens/budget-screen/budget-screen.tsx", ["stateText"]],
  [
    "screens/edit-transaction-screen/edit-transaction-screen.tsx",
    ["hint", "cancelButton"],
  ],
  ["screens/home-screen/components/feed-card.tsx", ["metaText"]],
  [
    "screens/ledger-file-editor-screen/index.tsx",
    ["errorLocation", "savingText", "pathLine"],
  ],
  [
    "screens/multi-postings-transaction/multi-postings-transaction-screen.tsx",
    ["balanceLabel"],
  ],
  ["screens/open-account-screen/open-account-screen.tsx", ["preview"]],
  ["screens/transactions-screen/entry-context/index.tsx", ["emptyStateText"]],
  ["screens/transactions-screen/entry-row/index.tsx", ["typeLabel"]],
  [
    "screens/transactions-screen/transactions-empty-state.tsx",
    ["message", "finalMessage"],
  ],
  [
    "screens/transactions-screen/transactions-screen.tsx",
    ["errorText", "loadingFooterText"],
  ],
  ["screens/welcome/server-settings-screen.tsx", ["helper"]],
];

describe("secondary text is no longer the placeholder grey", () => {
  for (const [file, texts] of SECONDARY_TEXT) {
    const getStyles = loadGetStyles(file);
    for (const themeName of ["light", "dark"] as ThemeName[]) {
      for (const text of texts) {
        for (const surface of ["white", "controlFill"]) {
          it(`keeps ${file} ${text} readable on ${surface} in ${themeName}`, () => {
            const theme = themes[themeName].colorTheme as unknown as Record<
              string,
              string
            >;
            const color = getStyles(theme)[text].color;
            expect(color === theme.black60).toBe(false);
            expect(contrastRatio(color, theme[surface]) >= TEXT_BAR).toBe(true);
          });
        }
      }
    }
  }
});

// The Files browser's styles read layout constants getStyles cannot evaluate
// here, so its two captions are checked on the source.
describe("the Files browser's empty and hint text", () => {
  it("take the secondary text colour, not the placeholder grey", () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "../screens/ledger-file-browser-screen/index.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes("emptyText:{fontSize:15,color:theme.black80,}"),
    ).toBe(true);
    expect(
      source.includes('lineHeight:18,textAlign:"center",color:theme.black80,}'),
    ).toBe(true);
  });
});

// w21/702: main.bean's lock is a button of its own (it opens an alert), drawn
// in the hairline grey at 1.34:1 on the light page. WCAG 1.4.11 asks 3:1.
describe("the Files browser's lock button", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../screens/ledger-file-browser-screen/index.tsx"),
    "utf8",
  );
  const token =
    /name="lock-closed-outline"\s*size=\{\d+\}\s*color=\{theme\.(\w+)\}/.exec(
      source,
    )?.[1];
  for (const themeName of ["light", "dark"] as ThemeName[]) {
    it(`stands out 3:1 from the page in ${themeName}`, () => {
      const theme = themes[themeName].colorTheme as unknown as Record<
        string,
        string
      >;
      expect(typeof token).toBe("string");
      expect(contrastRatio(theme[token!], theme.white) >= 3).toBe(true);
    });
  }
});

// w21/128: placeholders take the input placeholder token, never the hairline.
describe("input placeholders", () => {
  it("never use the hairline border colour", () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory())
          return entry.name === "__tests__" ? [] : walk(full);
        return /\.tsx$/.test(entry.name) ? [full] : [];
      });
    const offenders = walk(path.join(__dirname, ".."))
      .filter((file) =>
        fs
          .readFileSync(file, "utf8")
          .includes("placeholderTextColor={theme.black40}"),
      )
      .map((file) => path.relative(path.join(__dirname, ".."), file));
    expect(offenders.join(", ")).toBe("");
  });
});

// w21/483: the light editor coloured strings (3.13:1) and currencies (3.49:1)
// below the text bar on its own background.
describe("code editor token colours", () => {
  for (const themeName of ["light", "dark"] as ThemeName[]) {
    const editor = themes[themeName].colorTheme.editor as unknown as Record<
      string,
      string
    >;
    for (const token of [
      "foreground",
      "comment",
      "keyword",
      "string",
      "number",
      "account",
      "tag",
      "currency",
    ]) {
      it(`keeps ${token} readable on the ${themeName} editor background`, () => {
        expect(
          contrastRatio(editor[token]!, editor.background!) >= TEXT_BAR,
        ).toBe(true);
      });
    }
    it(`keeps line numbers readable on the ${themeName} gutter`, () => {
      expect(
        contrastRatio(editor.gutterForeground!, editor.gutterBackground!) >=
          TEXT_BAR,
      ).toBe(true);
    });
  }
});
