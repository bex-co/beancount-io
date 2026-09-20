import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { compile } from "tailwindcss";
import { filterButtonState } from "../journal-filter-button-state";

/**
 * Forced colors drops the box-shadow and maps both states' text and border
 * onto the same system colours, so the pressed filters looked exactly like
 * their unpressed neighbours — a reader could not see which filters had
 * emptied the journal. `aria-pressed` was always correct; only the visible
 * state was lost.
 *
 * A class-name assertion would not show that, so these cases compile the
 * classes the component actually applies and assert on the CSS Tailwind
 * emits. The rendered styling itself was measured in a real browser under
 * forced-colors emulation.
 */

let ruleFor: (className: string) => string;

function parseRules(css: string): Map<string, string> {
  const rules = new Map<string, string>();
  const selector = /\.((?:[^\s{},\\]|\\.)+)\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = selector.exec(css)) !== null) {
    let depth = 1;
    let i = selector.lastIndex;
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
    }
    rules.set(
      match[1].replace(/\\/g, ""),
      css.slice(selector.lastIndex, i - 1),
    );
  }
  return rules;
}

const pressed = () => filterButtonState(true).split(/\s+/).filter(Boolean);
const unpressed = () => filterButtonState(false).split(/\s+/).filter(Boolean);

/** The forced-colors declarations a class list resolves to. */
const forcedColorsCss = (classes: string[]) =>
  classes
    .map((name) => ruleFor(name))
    .filter((css) => css.includes("forced-colors: active"))
    .join("\n");

beforeAll(async () => {
  const require = createRequire(`${process.cwd()}/`);
  const compiler = await compile(`@import "tailwindcss";`, {
    base: process.cwd(),
    loadStylesheet: async (id: string, base: string) => {
      const path = require.resolve(
        id === "tailwindcss" ? "tailwindcss/index.css" : id,
      );
      return { path, base, content: readFileSync(path, "utf8") };
    },
  });
  const rules = parseRules(
    compiler.build([...new Set([...pressed(), ...unpressed()])]),
  );
  ruleFor = (className: string) => rules.get(className) ?? "";
});

describe("a pressed journal filter under forced colors", () => {
  it("claims the highlight colour", () => {
    const css = forcedColorsCss(pressed());

    expect(css).toMatch(/background-color:\s*Highlight/);
    expect(css).toMatch(/color:\s*HighlightText/);
    expect(css).toMatch(/border-color:\s*Highlight/);
  });

  it("keeps those colours while the pointer is over it", () => {
    // The shared Button lightens its background on hover, which would put
    // HighlightText on a near-Canvas fill.
    const hover = pressed().filter((name) => name.includes(":hover:"));

    expect(hover.length).toBeGreaterThan(0);
    expect(forcedColorsCss(hover)).toMatch(/background-color:\s*Highlight/);
  });
});

describe("an unpressed journal filter under forced colors", () => {
  it("does not claim the highlight colour", () => {
    const css = forcedColorsCss(unpressed());

    expect(css).not.toMatch(/background-color:\s*Highlight/);
    expect(css).not.toMatch(/color:\s*HighlightText/);
  });

  it("hides the otherwise-transparent border that forced colors reveals", () => {
    expect(forcedColorsCss(unpressed())).toMatch(/border-color:\s*Canvas\b/);
  });
});

describe("the two states cannot collide", () => {
  it("never emits both colour sets at once", () => {
    // Same-specificity utilities would resolve in an order this file does not
    // control, so the branches are mutually exclusive rather than layered.
    const overlap = pressed().filter(
      (name) =>
        name.startsWith("forced-colors:") &&
        !name.includes("focus-visible") &&
        unpressed().includes(name),
    );

    expect(overlap).toEqual([]);
  });
});

describe("keyboard focus stays separately visible", () => {
  it("draws a real outline in both states", () => {
    for (const classes of [pressed(), unpressed()]) {
      const css = forcedColorsCss(classes);
      expect(css).toMatch(/outline-style:\s*solid/);
      expect(css).toMatch(/outline-color:\s*CanvasText/);
    }
  });
});

describe("ordinary colours are untouched", () => {
  it("keeps the pressed fill and shadow outside the media query", () => {
    const shadow = ruleFor("shadow-xs");

    expect(pressed()).toContain("shadow-xs");
    expect(shadow).not.toContain("forced-colors: active");
    expect(unpressed()).toContain("text-muted-foreground");
  });
});
