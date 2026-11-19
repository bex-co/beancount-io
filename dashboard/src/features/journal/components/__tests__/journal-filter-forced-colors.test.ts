import { beforeAll, describe, expect, it } from "vitest";
import { compileAppCss, parseRules } from "@/test/tailwind";
import { filterButtonState } from "@/common/components/filter-chip";

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

const pressed = () => filterButtonState(true).split(/\s+/).filter(Boolean);
const unpressed = () => filterButtonState(false).split(/\s+/).filter(Boolean);

/** The forced-colors declarations a class list resolves to. */
const forcedColorsCss = (classes: string[]) =>
  classes
    .map((name) => ruleFor(name))
    .filter((css) => css.includes("forced-colors: active"))
    .join("\n");

beforeAll(async () => {
  const rules = parseRules(await compileAppCss([...pressed(), ...unpressed()]));
  ruleFor = (className: string) => rules.get(className) ?? "";
});

describe("a pressed journal filter under forced colors", () => {
  it("claims the highlight colour", () => {
    const css = forcedColorsCss(pressed());

    expect(css).toMatch(/background-color:\s*Highlight/);
    expect(css).toMatch(/color:\s*HighlightText/);
    expect(css).toMatch(/border-color:\s*Highlight/);
  });

  it("keeps a readable label, held against hover and dark colours", () => {
    // Forced colors otherwise paints a Canvas plate behind the label's text,
    // which hid "Transaction" on the Highlight fill (w4/m43). The shared
    // Button's hover and dark variants carry author colours, which important
    // system colours hold off.
    const css = forcedColorsCss(pressed());

    expect(css).toMatch(/forced-color-adjust:\s*none/);
    expect(css).toMatch(/background-color:\s*Highlight !important/);
    expect(forcedColorsCss(unpressed())).not.toMatch(/forced-color-adjust/);
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
