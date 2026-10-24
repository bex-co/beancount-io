import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { compileAppCss, parseRules } from "@/test/tailwind";
import { OptionsTableSection } from "../options-table-section";

/**
 * Settings option values keep a usable share of a narrow screen (w4/1051).
 * The name column had an unconditional 300px width, so at 390px the value
 * column kept about 9px and "Example Beancount file" stood one character
 * per line. jsdom has no layout, so this runs the header's real classes
 * through the app's Tailwind and checks which widths apply below and above
 * the sm breakpoint; the geometry itself was measured in a real browser.
 */
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

/** Where a width utility's rule body applies: always, or under a query. */
function widthRule(body: string) {
  const media = /@media\s*\(([^)]*)\)/.exec(body)?.[1] ?? null;
  const value = /width:\s*([^;]+);/.exec(body)?.[1]?.trim() ?? null;
  return { media, value };
}

describe("Settings options table columns", () => {
  it("shares a narrow screen between names and values, keeping 300px names from sm up", async () => {
    render(
      <OptionsTableSection
        title="Beancount Options"
        description="Options"
        docUrl="https://beancount.github.io/docs/"
        entries={[
          { name: "title", value: "Example Beancount file" },
          { name: "operating_currency", value: ["USD"] },
        ]}
      />,
    );
    const header = screen.getByRole("columnheader", { name: "common.option" });
    const widthClasses = header.className
      .split(/\s+/)
      .filter((name) => /(^|:)w-/.test(name));
    const rules = parseRules(await compileAppCss(widthClasses));
    const applied = widthClasses.map((name) =>
      widthRule(rules.get(name) ?? ""),
    );

    // Below sm, the only width that applies is a share of the table, so the
    // values keep the rest.
    expect(applied.filter((rule) => rule.media === null)).toEqual([
      { media: null, value: "calc(2/5 * 100%)" },
    ]);
    // From sm, names get their fixed 300px column back.
    expect(applied.filter((rule) => rule.media !== null)).toEqual([
      { media: "width >= 40rem", value: "calc(var(--spacing) * 75)" },
    ]);

    // Every value is still shown whole.
    expect(screen.getByText("Example Beancount file")).toBeInTheDocument();
    expect(screen.getByText('["USD"]')).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Beancount Options" }),
    ).toBeInTheDocument();
  });
});
