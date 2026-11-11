import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { compileAppCss, parseRules } from "@/test/tailwind";
import { PageHeader } from "../index";

/**
 * Below `md` the page header was `display: none`, which also removed its h1
 * from the accessibility tree: on a phone, heading navigation on Journal,
 * Accounts, the statements, Query and Settings found no page heading
 * (w2/115). jsdom applies no stylesheet, so this compiles the classes each
 * element carries and checks the CSS they produce.
 */
async function cssOf(element: Element): Promise<string> {
  const classes = element.className.split(/\s+/).filter(Boolean);
  const rules = parseRules(await compileAppCss(classes));
  return classes.map((name) => rules.get(name) ?? "").join("\n");
}

const NARROW = "@media (width < 48rem)";

describe("PageHeader", () => {
  it("keeps its h1 for assistive technology while hiding it below md", async () => {
    render(<PageHeader title="Journal" description="Every entry" />);
    const heading = screen.getByRole("heading", { level: 1, name: "Journal" });
    const wrapper = heading.parentElement!;

    // Nothing on the path to the h1 is display: none, at any width.
    for (const element of [wrapper, heading]) {
      expect(await cssOf(element)).not.toMatch(/display:\s*none/);
    }
    // Visually hidden and out of flow below md, so it adds no gap.
    const wrapperCss = await cssOf(wrapper);
    expect(wrapperCss).toContain(NARROW);
    expect(wrapperCss).toMatch(/position:\s*absolute/);
    expect(wrapperCss).toMatch(/clip-path:\s*inset\(50%\)/);
    // The description stays hidden below md, as w4/228 designed.
    const description = screen.getByText("Every entry");
    expect(await cssOf(description)).toMatch(
      /@media \(width < 48rem\) \{\s*display:\s*none/,
    );
  });

  it("shows title and description on every width when asked", async () => {
    render(
      <PageHeader showOnMobile title="Budget" description="Spending caps" />,
    );
    const heading = screen.getByRole("heading", { level: 1, name: "Budget" });
    for (const element of [
      heading.parentElement!,
      heading,
      screen.getByText("Spending caps"),
    ]) {
      const css = await cssOf(element);
      expect(css).not.toMatch(/display:\s*none/);
      expect(css).not.toMatch(/clip-path/);
    }
  });

  it("renders exactly one level-1 heading", () => {
    render(<PageHeader title="Accounts" description="All accounts" />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
