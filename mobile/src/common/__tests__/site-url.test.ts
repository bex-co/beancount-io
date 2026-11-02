import fs from "fs";
import path from "path";
import { helpCenterUrl } from "../site-url";
import { translationLocales } from "../../translations/__tests__/locale-parity";

// w21/286: Settings → Help Center always opened the English page.
describe("helpCenterUrl", () => {
  it("is the unprefixed page in English", () => {
    expect(helpCenterUrl("en")).toBe("https://beancount.io/docs/help-center");
  });

  it("is prefixed with the language otherwise", () => {
    expect(helpCenterUrl("de")).toBe(
      "https://beancount.io/de/docs/help-center",
    );
    expect(helpCenterUrl("zh")).toBe(
      "https://beancount.io/zh/docs/help-center",
    );
  });

  it("prefixes every shipped language but English", () => {
    for (const locale of translationLocales()) {
      expect(helpCenterUrl(locale)).toBe(
        locale === "en"
          ? "https://beancount.io/docs/help-center"
          : `https://beancount.io/${locale}/docs/help-center`,
      );
    }
  });

  it("falls back to English for something that is not a language code", () => {
    expect(helpCenterUrl("")).toBe("https://beancount.io/docs/help-center");
    expect(helpCenterUrl("zh-Hans")).toBe(
      "https://beancount.io/docs/help-center",
    );
  });

  it("is what Settings opens, with the live locale", () => {
    const settings = fs
      .readFileSync(
        path.join(
          __dirname,
          "..",
          "..",
          "screens",
          "setting",
          "main-content.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(settings.includes("withAppMarker(helpCenterUrl(locale))")).toBe(
      true,
    );
  });
});
