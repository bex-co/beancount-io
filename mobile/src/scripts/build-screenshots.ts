import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import {
  loadScreenshotManifest,
  loadStoreLocaleManifest,
  runtimeLocaleForStore,
} from "./store-metadata";
import { en } from "../translations/en";
import { zh } from "../translations/zh";
import { ca } from "../translations/ca";
import { de } from "../translations/de";
import { es } from "../translations/es";
import { fr } from "../translations/fr";
import { nl } from "../translations/nl";
import { pt } from "../translations/pt";
import { ru } from "../translations/ru";
import { sk } from "../translations/sk";
import { uk } from "../translations/uk";

const root = process.cwd();
const localeManifest = loadStoreLocaleManifest(root);
const screenshotManifest = loadScreenshotManifest(root);
const localeFilter = process.env.LOCALE;
const displayFilter = process.env.DISPLAY_TYPE;
const outputRoot = path.join(root, "metadata/screenshots");
const rawRoot = path.join(root, "tmp/screenshots-raw");
const localizedSourceRoot = path.join(
  root,
  "tmp/screenshots-localized-sources",
);
const font = "Arial-Unicode-MS";

type DemoTranslations = Record<string, unknown> & {
  home: string;
  accounts: string;
  transactions: string;
  reports: string;
  files: string;
  netWorth: string;
  assets: string;
  liabilities: string;
  recentTransactions: string;
  seeAll: string;
  save: string;
  income: string;
  expenses: string;
  netProfit: string;
  range1M: string;
  range3M: string;
  range6M: string;
  rangeYTD: string;
  range1Y: string;
  rangeAll: string;
  ledgerEditorErrorCount: { one: string };
};

const translationsByRuntimeLocale: Record<string, DemoTranslations> = {
  en,
  zh,
  ca,
  de,
  es,
  fr,
  nl,
  pt,
  ru,
  sk,
  uk,
};

execFileSync("magick", ["-version"], { stdio: "ignore" });
const fontList = execFileSync("magick", ["-list", "font"], {
  encoding: "utf8",
});
if (!fontList.includes(`Font: ${font}`)) {
  throw new Error(
    `${font} is required for Latin, Cyrillic, and CJK caption coverage`,
  );
}

interface OverlayLabel {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  align?: "left" | "center";
  background: string;
  color: string;
  pointSize: number;
  text: string;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function fittedPointSize(label: OverlayLabel): number {
  const units = [...label.text].reduce((total, character) => {
    if (/\s/u.test(character)) return total + 0.34;
    if (/\p{Script=Han}/u.test(character)) return total + 1;
    if (/[MWЩШЖЮ]/u.test(character)) return total + 0.82;
    return total + 0.58;
  }, 0);
  return Math.max(
    18,
    Math.min(
      label.pointSize,
      Math.floor((label.width - 18) / Math.max(units, 1)),
    ),
  );
}

function overlaySvg(labels: OverlayLabel[]): string {
  const elements = labels.flatMap((label) => {
    const x = label.align === "left" ? label.x + 18 : label.x + label.width / 2;
    const y = label.y + label.height / 2;
    const radius = label.radius
      ? ` rx="${label.radius}" ry="${label.radius}"`
      : "";
    const anchor = label.align === "left" ? "start" : "middle";
    return [
      `<rect x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}"${radius} fill="${label.background}"/>`,
      `<text x="${x}" y="${y}" dy="0.35em" text-anchor="${anchor}" fill="${label.color}" font-family="Arial Unicode MS" font-size="${fittedPointSize(label)}">${escapeXml(label.text)}</text>`,
    ];
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1206" height="2622" viewBox="0 0 1206 2622">${elements.join("")}</svg>`;
}

function navigationLabels(
  translations: DemoTranslations,
  selected: "home" | "reports",
): OverlayLabel[] {
  const labels: Array<[keyof DemoTranslations, number]> = [
    ["home", 5],
    ["accounts", 242],
    ["transactions", 479],
    ["reports", 716],
    ["files", 953],
  ];
  return labels.map(([key, x]) => ({
    x,
    y: 2465,
    width: 230,
    height: 90,
    background: "#171a14",
    color: key === selected ? "#5fc535" : "#aeb0a2",
    pointSize: 27,
    text: translations[key] as string,
  }));
}

function rangeLabels(
  translations: DemoTranslations,
  y: number,
  background: string,
  selectedBackground: string,
): OverlayLabel[] {
  const labels: Array<
    [
      keyof Pick<
        DemoTranslations,
        "range1M" | "range3M" | "range6M" | "rangeYTD" | "range1Y" | "rangeAll"
      >,
      number,
      number,
    ]
  > = [
    ["range1M", 205, 105],
    ["range3M", 340, 100],
    ["range6M", 466, 118],
    ["rangeYTD", 610, 120],
    ["range1Y", 760, 95],
    ["rangeAll", 880, 120],
  ];
  return labels.map(([key, x, width]) => {
    const isSelected = key === "range6M";
    return {
      x,
      y,
      width,
      height: 84,
      radius: isSelected ? 42 : undefined,
      background: isSelected ? selectedBackground : background,
      color: isSelected ? "#10160e" : "#aeb0a2",
      pointSize: 34,
      text: translations[key],
    };
  });
}

function monthLabels(storeLocale: string): OverlayLabel[] {
  const positions: Array<[number, number]> = [
    [210, 135],
    [365, 140],
    [530, 135],
    [690, 130],
    [845, 145],
    [1010, 135],
  ];
  const formatter = new Intl.DateTimeFormat(storeLocale, {
    month: "short",
    timeZone: "UTC",
  });
  return positions.map(([x, width], index) => ({
    x,
    y: 1130,
    width,
    height: 90,
    background: "#292a21",
    color: "#f4f2eb",
    pointSize: 38,
    text: formatter
      .format(new Date(Date.UTC(2025, index + 3, 1)))
      .toLocaleUpperCase(storeLocale),
  }));
}

function sourceLabels(
  storyId: string,
  translations: DemoTranslations,
  storeLocale: string,
): OverlayLabel[] {
  const header = "#171a14";
  const card = "#292a21";
  const primary = "#f4f2eb";
  const secondary = "#aeb0a2";

  if (storyId === "overview") {
    return [
      {
        x: 390,
        y: 220,
        width: 426,
        height: 90,
        background: header,
        color: primary,
        pointSize: 48,
        text: translations.home,
      },
      {
        x: 96,
        y: 370,
        width: 289,
        height: 127,
        radius: 64,
        background: "#575a4b",
        color: primary,
        pointSize: 32,
        text: translations.netWorth,
      },
      {
        x: 410,
        y: 397,
        width: 188,
        height: 78,
        background: card,
        color: secondary,
        pointSize: 32,
        text: translations.assets,
      },
      {
        x: 615,
        y: 397,
        width: 330,
        height: 78,
        background: card,
        color: secondary,
        pointSize: 32,
        text: translations.liabilities,
      },
      ...rangeLabels(translations, 1255, card, "#60c533"),
      {
        x: 95,
        y: 1435,
        width: 655,
        height: 115,
        align: "left",
        background: card,
        color: primary,
        pointSize: 42,
        text: translations.recentTransactions,
      },
      {
        x: 840,
        y: 1435,
        width: 230,
        height: 115,
        background: card,
        color: "#5fc535",
        pointSize: 34,
        text: translations.seeAll,
      },
      ...navigationLabels(translations, "home"),
    ];
  }

  if (storyId === "ownership") {
    return [
      {
        x: 950,
        y: 278,
        width: 180,
        height: 78,
        background: header,
        color: "#8e9081",
        pointSize: 28,
        text: translations.save,
      },
      {
        x: 95,
        y: 452,
        width: 350,
        height: 72,
        align: "left",
        background: header,
        color: "#ee675d",
        pointSize: 36,
        text: translations.ledgerEditorErrorCount.one.replace("{{count}}", "1"),
      },
    ];
  }

  return [
    {
      x: 390,
      y: 220,
      width: 426,
      height: 90,
      background: header,
      color: primary,
      pointSize: 48,
      text: translations.reports,
    },
    ...rangeLabels(translations, 360, header, "#5ac72e"),
    ...monthLabels(storeLocale),
    {
      x: 260,
      y: 1205,
      width: 210,
      height: 90,
      align: "left",
      background: card,
      color: secondary,
      pointSize: 27,
      text: translations.income,
    },
    {
      x: 500,
      y: 1205,
      width: 235,
      height: 90,
      align: "left",
      background: card,
      color: secondary,
      pointSize: 27,
      text: translations.expenses,
    },
    {
      x: 790,
      y: 1205,
      width: 310,
      height: 90,
      align: "left",
      background: card,
      color: secondary,
      pointSize: 24,
      text: translations.netProfit,
    },
    {
      x: 80,
      y: 1410,
      width: 370,
      height: 75,
      align: "left",
      background: card,
      color: secondary,
      pointSize: 38,
      text: translations.expenses,
    },
    ...navigationLabels(translations, "reports"),
  ];
}

function localizeSource(
  source: string,
  output: string,
  storyId: string,
  translations: DemoTranslations,
  storeLocale: string,
): void {
  const overlayPath = output.replace(/\.png$/u, ".svg");
  fs.writeFileSync(
    overlayPath,
    overlaySvg(sourceLabels(storyId, translations, storeLocale)),
  );
  execFileSync("magick", [
    source,
    "(",
    "-background",
    "none",
    overlayPath,
    ")",
    "-compose",
    "over",
    "-composite",
    "-background",
    "#171a14",
    "-alpha",
    "remove",
    "-alpha",
    "off",
    "-colorspace",
    "sRGB",
    "-strip",
    `PNG24:${output}`,
  ]);
}

function render(
  source: string,
  caption: string,
  output: string,
  width: number,
  height: number,
  layout: "phone" | "tablet",
): void {
  const commonTail = [
    "-background",
    "#10160e",
    "-alpha",
    "remove",
    "-alpha",
    "off",
    "-colorspace",
    "sRGB",
    "-strip",
    `PNG24:${output}`,
  ];

  if (layout === "phone") {
    execFileSync("magick", [
      "-size",
      `${width}x${height}`,
      "canvas:#10160e",
      "(",
      source,
      "-resize",
      "1080x2348",
      ")",
      "-gravity",
      "south",
      "-geometry",
      "+0+0",
      "-composite",
      "(",
      "-size",
      "1120x360",
      "-background",
      "none",
      "-fill",
      "white",
      "-font",
      font,
      "-pointsize",
      "72",
      "-gravity",
      "center",
      `caption:${caption}`,
      ")",
      "-gravity",
      "north",
      "-geometry",
      "+0+45",
      "-composite",
      ...commonTail,
    ]);
    return;
  }

  execFileSync("magick", [
    source,
    "-resize",
    `${width}x${height}^`,
    "-gravity",
    "center",
    "-extent",
    `${width}x${height}`,
    "-blur",
    "0x55",
    "-fill",
    "#10160e",
    "-colorize",
    "72%",
    "(",
    source,
    "-resize",
    "1012x2200",
    "-bordercolor",
    "#31402c",
    "-border",
    "6",
    ")",
    "-gravity",
    "south",
    "-geometry",
    "+0+0",
    "-composite",
    "(",
    "-size",
    "1840x390",
    "-background",
    "none",
    "-fill",
    "white",
    "-font",
    font,
    "-pointsize",
    "88",
    "-gravity",
    "center",
    `caption:${caption}`,
    ")",
    "-gravity",
    "north",
    "-geometry",
    "+0+45",
    "-composite",
    ...commonTail,
  ]);
}

function renderRaw(
  source: string,
  output: string,
  width: number,
  height: number,
): void {
  execFileSync("magick", [
    source,
    "-resize",
    `${width}x${height}^`,
    "-gravity",
    "center",
    "-extent",
    `${width}x${height}`,
    "-background",
    "#10160e",
    "-alpha",
    "remove",
    "-alpha",
    "off",
    "-colorspace",
    "sRGB",
    "-strip",
    `PNG24:${output}`,
  ]);
}

let outputCount = 0;
for (const locale of localeManifest.storeLocales) {
  if (localeFilter && locale !== localeFilter) continue;
  const captions = screenshotManifest.captions[locale];
  const runtimeLocale = runtimeLocaleForStore(localeManifest, locale);
  const translations = translationsByRuntimeLocale[runtimeLocale];
  if (!translations) {
    throw new Error(
      `No screenshot UI translations loaded for ${runtimeLocale}`,
    );
  }
  const localizedSources = new Map<string, string>();
  const localizedSourceDirectory = path.join(localizedSourceRoot, locale);
  fs.rmSync(localizedSourceDirectory, { recursive: true, force: true });
  fs.mkdirSync(localizedSourceDirectory, { recursive: true });
  for (const story of screenshotManifest.stories) {
    const localizedSource = path.join(
      localizedSourceDirectory,
      `${story.id}.png`,
    );
    localizeSource(
      path.join(root, story.source),
      localizedSource,
      story.id,
      translations,
      locale,
    );
    localizedSources.set(story.id, localizedSource);
  }
  for (const display of screenshotManifest.displayTypes) {
    if (displayFilter && display.name !== displayFilter) continue;
    const directory = path.join(outputRoot, locale, display.name);
    const rawDirectory = path.join(rawRoot, locale, display.name);
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(rawDirectory, { recursive: true, force: true });
    fs.mkdirSync(directory, { recursive: true });
    fs.mkdirSync(rawDirectory, { recursive: true });

    for (const [index, story] of screenshotManifest.stories.entries()) {
      const filename = `${String(story.order).padStart(2, "0")}-${story.id}.png`;
      const localizedSource = localizedSources.get(story.id);
      if (!localizedSource)
        throw new Error(`Missing localized source for ${story.id}`);
      renderRaw(
        localizedSource,
        path.join(rawDirectory, filename),
        display.width,
        display.height,
      );
      render(
        localizedSource,
        captions[index],
        path.join(directory, filename),
        display.width,
        display.height,
        display.layout,
      );
      outputCount += 1;
    }
  }
}

console.log(
  `Built ${outputCount} localized App Store screenshots in ${outputRoot}.`,
);
