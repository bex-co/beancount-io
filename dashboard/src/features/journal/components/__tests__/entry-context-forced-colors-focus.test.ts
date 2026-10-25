import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compileAppCss, parseRules } from "@/test/tailwind";

/**
 * w4/1061: forced colors removes box-shadow, so Entry Context's source and
 * disclosure buttons and Documents' filename buttons — all `outline-none`
 * with shadow rings — showed no keyboard focus cue. Each now carries the
 * app's established CanvasText outline utilities; compile the classes the
 * components apply and assert on the CSS Tailwind emits.
 */
const OUTLINE = [
  "forced-colors:focus-visible:[outline-style:solid]",
  "forced-colors:focus-visible:outline-2",
  "forced-colors:focus-visible:outline-[CanvasText]",
];
const OFFSETS = [
  "forced-colors:focus-visible:outline-offset-2",
  "forced-colors:focus-visible:-outline-offset-2",
];

let ruleFor: (className: string) => string;

beforeAll(async () => {
  const rules = parseRules(await compileAppCss([...OUTLINE, ...OFFSETS]));
  ruleFor = (className: string) => rules.get(className) ?? "";
});

const forcedCss = (classes: string[]) =>
  classes
    .map((name) => ruleFor(name))
    .filter((css) => css.includes("forced-colors: active"))
    .join("\n");

function sourceClasses(path: string, marker: string): string[] {
  const source = readFileSync(join(process.cwd(), path), "utf8");
  const line = source.split("\n").find((l) => l.includes(marker)) ?? "";
  return line
    .replace(/className="|"$/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

describe("forced-colors focus outlines (w4/1061)", () => {
  it("compiles to a solid CanvasText outline", () => {
    const css = forcedCss(OUTLINE);
    expect(css).toMatch(/outline-style:\s*solid/);
    expect(css).toMatch(/outline-color:\s*CanvasText/);
    expect(forcedCss([OFFSETS[0]])).toMatch(/outline-offset:\s*2px/);
    expect(forcedCss([OFFSETS[1]])).toMatch(
      /outline-offset:\s*calc\(2px \* -1\)/,
    );
  });

  it.each([
    [
      "src/features/journal/components/entry-context-panel.tsx",
      "font-mono text-sm rounded underline",
      OFFSETS[0],
    ],
    [
      "src/features/journal/components/entry-context-panel.tsx",
      "focus-visible:ring-inset",
      OFFSETS[1],
    ],
    [
      "src/features/ledger-data/documents/index.tsx",
      "text-left font-medium text-primary",
      OFFSETS[0],
    ],
  ])("%s (%s) carries the outline", (path, marker, offset) => {
    const classes = sourceClasses(path, marker);
    for (const name of [...OUTLINE, offset]) expect(classes).toContain(name);
  });
});
