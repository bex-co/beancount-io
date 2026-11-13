import fs from "fs";
import path from "path";

/**
 * w22/050: the New ledger screen's selected Template row was filled with
 * `black10` — the 1.10:1 step `palette.ts` says the drawer and menu rows had to
 * stop using, replaced there by `controlSelected`. A style named for a selected
 * state must not take the neutral inset fill (`black10`, or `controlFill`, the
 * same value) as its background; it takes `controlSelected` and, where colour
 * alone would be the whole signal, a mark beside it.
 */
const SRC = path.join(__dirname, "..", "..", "..");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" || entry.name === "generated-graphql"
        ? []
        : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

// `selectedRow: { ... backgroundColor: theme.black10 ... }`, a flat style block.
const SELECTED_BLOCK = /\b(\w*[sS]elected\w*)\s*:\s*\{([^{}]*)\}/g;
const NEUTRAL_FILL = /backgroundColor:\s*theme\.(black10|controlFill)\b/;

describe("selected-state fills", () => {
  const files = sourceFiles(SRC);

  it("scans the app's source", () => {
    expect(files.length > 100).toBe(true);
    expect(
      files.some((file) => file.endsWith("create-ledger-screen.tsx")),
    ).toBe(true);
  });

  it("never mark a selected style with the neutral inset fill", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      for (const [, name, body] of source.matchAll(SELECTED_BLOCK)) {
        if (NEUTRAL_FILL.test(body)) {
          offenders.push(`${path.relative(SRC, file)} ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("finds the styles it guards: the shipped selected tints are recognised", () => {
    const picker = fs.readFileSync(
      path.join(SRC, "screens/account-picker-screen/account-picker-screen.tsx"),
      "utf8",
    );
    const blocks = Array.from(picker.matchAll(SELECTED_BLOCK));
    expect(blocks.some(([, name]) => name === "listItemSelected")).toBe(true);
    expect(
      blocks.every(([, , body]) => body.includes("theme.controlSelected")),
    ).toBe(true);
  });
});
