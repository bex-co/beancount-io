import fs from "fs";
import path from "path";
import { en } from "../en";

/**
 * Every English key is reachable from the app, so a translator never keeps a
 * string nothing can render in sync across 13 files. A key counts as used when
 * it appears as a string literal anywhere in src/ or app/ outside the
 * translation files. That is generous on purpose: missing a dead key is better
 * than deleting a live one. Keys built from a template at their call site
 * cannot be seen that way, so their families are declared here.
 */
const DYNAMIC_KEY_FAMILIES: Array<{ pattern: RegExp; builtBy: string }> = [
  { pattern: /^discoveryTab_/u, builtBy: "t(`discoveryTab_${value}`)" },
  { pattern: /^discoveryEmpty_/u, builtBy: "t(`discoveryEmpty_${tab}`)" },
  { pattern: /^\d{2}$/u, builtBy: "t(month.slice(5, 7)) for month labels" },
];

/** Unused on purpose, each with the reason it stays. */
const DELIBERATELY_UNUSED: Record<string, string> = {
  ledgerEditorSaveSuccess:
    "The file editor confirms a save with a haptic alone; whether it should also say so is an open product question, not cleanup.",
};

const PKG_ROOT = path.join(__dirname, "..", "..", "..");
const TRANSLATIONS_DIR = path.join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === TRANSLATIONS_DIR || entry.name === "node_modules") return [];
      return sourceFiles(full);
    }
    return /\.(ts|tsx)$/u.test(entry.name) ? [full] : [];
  });
}

describe("translation keys", () => {
  const corpus = ["src", "app"]
    .map((dir) => path.join(PKG_ROOT, dir))
    .filter((dir) => fs.existsSync(dir))
    .flatMap(sourceFiles)
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  it("are all reachable from the app, or declared as deliberately unused", () => {
    const unused = Object.keys(en).filter(
      (key) =>
        !(key in DELIBERATELY_UNUSED) &&
        !DYNAMIC_KEY_FAMILIES.some(({ pattern }) => pattern.test(key)) &&
        !['"', "\'", "`"].some((quote) => corpus.includes(quote + key + quote)),
    );
    expect(unused).toEqual([]);
  });

  it("declares no deliberately unused key the base no longer has", () => {
    expect(
      Object.keys(DELIBERATELY_UNUSED).filter((key) => !(key in en)),
    ).toEqual([]);
  });
});
