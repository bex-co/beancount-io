import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { render, screen } from "@testing-library/react";
import { compile } from "tailwindcss";
import { beforeAll, describe, expect, it } from "vitest";
import { Switch } from "../switch";

/**
 * Forced colors maps both track colours onto Canvas and removes the thumb's
 * shadow, so a checked and an unchecked switch looked identical (w4/261).
 * This compiles the classes the rendered Switch actually carries and checks
 * the forced-colors CSS Tailwind emits for each state. Pixels under real
 * forced-colors rendering were not measured in this environment.
 */
let css = "";

function classesOf(checked: boolean) {
  const { unmount } = render(<Switch checked={checked} aria-label="Module" />);
  const root = screen.getByRole("switch", { name: "Module" });
  const thumb = root.querySelector('[data-slot="switch-thumb"]')!;
  const classes = [
    ...root.className.split(/\s+/),
    ...thumb.getAttribute("class")!.split(/\s+/),
  ].filter(Boolean);
  expect(root).toHaveAttribute("aria-checked", String(checked));
  unmount();
  return classes;
}

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
  css = compiler.build([...new Set([...classesOf(true), ...classesOf(false)])]);
});

/** The forced-colors block for a single utility class. */
function forced(className: string): string {
  const escaped = className.replace(/[[\]=:()]/g, (c) => `\\${c}`);
  const start = css.indexOf(`.${escaped}`);
  if (start < 0) return "";
  const block = css.slice(
    start,
    css.indexOf("}", css.indexOf("{", start)) + 200,
  );
  return block.includes("forced-colors: active") ? block : "";
}

describe("Switch under forced colors", () => {
  it("fills a checked track with Highlight", () => {
    expect(forced("forced-colors:data-[state=checked]:bg-[Highlight]")).toMatch(
      /data-state="checked"[\s\S]*background-color:\s*Highlight/,
    );
  });

  it("keeps an unchecked track on Canvas", () => {
    expect(forced("forced-colors:data-[state=unchecked]:bg-[Canvas]")).toMatch(
      /background-color:\s*Canvas/,
    );
  });

  it("draws the thumb in a colour that contrasts with each track", () => {
    expect(forced("forced-colors:bg-[CanvasText]")).toMatch(
      /background-color:\s*CanvasText/,
    );
    expect(
      forced("forced-colors:data-[state=checked]:bg-[HighlightText]"),
    ).toMatch(/background-color:\s*HighlightText/);
  });

  it("keeps a separate keyboard focus outline", () => {
    expect(forced("forced-colors:focus-visible:outline-[CanvasText]")).toMatch(
      /outline-color:\s*CanvasText/,
    );
  });

  it("still moves the thumb between states", () => {
    expect(classesOf(true)).toContain("data-[state=checked]:translate-x-5");
    expect(classesOf(false)).toContain("data-[state=unchecked]:translate-x-0");
  });
});
