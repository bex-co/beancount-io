/**
 * The document declares its reading direction, from the server render on.
 *
 * `<html lang="fa">` with no `dir` leaves a Persian page laid out
 * left-to-right. The direction has to be in the server markup rather than
 * applied after hydration, which would reflow the page under the reader.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import i18next from "i18next";
import { ShellComponent } from "../shell-component";

let language = "en";

vi.mock("react-i18next", () => ({
  // The real i18next direction table decides rtl/ltr; only the resolved
  // language is stubbed.
  useTranslation: () => ({
    i18n: {
      get language() {
        return language;
      },
      dir: () => i18next.dir(language),
    },
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  HeadContent: () => null,
  Scripts: () => null,
}));
vi.mock("@/common/components/document/theme-script", () => ({
  ThemeScript: () => null,
}));
vi.mock("@/common/analytics", () => ({ GoogleAnalytics: () => null }));

function shellFor(lang: string): string {
  language = lang;
  return renderToString(
    <ShellComponent>
      <div>content</div>
    </ShellComponent>,
  );
}

describe("document direction", () => {
  it.each([
    ["fa", "rtl"],
    ["ar", "rtl"],
    ["he", "rtl"],
  ])("declares %s as %s", (lang, dir) => {
    const html = shellFor(lang);
    expect(html).toContain(`lang="${lang}"`);
    expect(html).toContain(`dir="${dir}"`);
  });

  it.each([
    ["en", "ltr"],
    ["de", "ltr"],
    ["ja", "ltr"],
  ])("declares %s as %s", (lang, dir) => {
    const html = shellFor(lang);
    expect(html).toContain(`lang="${lang}"`);
    expect(html).toContain(`dir="${dir}"`);
  });

  it("follows a language change rather than keeping a stale direction", () => {
    expect(shellFor("fa")).toContain('dir="rtl"');
    expect(shellFor("en")).toContain('dir="ltr"');
    expect(shellFor("fa")).toContain('dir="rtl"');
  });

  it("puts the direction on the document element, not somewhere inside", () => {
    const html = shellFor("fa");
    expect(html).toMatch(/^<html[^>]*dir="rtl"/);
  });
});
