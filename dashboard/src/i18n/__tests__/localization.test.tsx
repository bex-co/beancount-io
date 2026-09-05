import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { useTranslation } from "react-i18next";
import { createLocalization } from "../init";
import { LocalizationProvider } from "../provider";
import { SUPPORTED_LANGUAGES } from "../config";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

vi.unmock("react-i18next");

function Greeting() {
  const { t, i18n } = useTranslation();
  return <p lang={i18n.language}>{t("common.tryAgain")}</p>;
}

describe("request-scoped localization", () => {
  it("starts with English only and loads every supported language on demand", async () => {
    const locale = createLocalization();
    expect(Object.keys(locale.i18n.services.resourceStore.data)).toEqual([
      "en",
    ]);
    for (const language of SUPPORTED_LANGUAGES) {
      expect(await locale.changeLanguage(language)).toBe(true);
      expect(locale.i18n.language).toBe(language);
      expect(locale.i18n.t("common.tryAgain")).not.toBe("common.tryAgain");
    }
  });

  it("isolates concurrent SSR body text, metadata, and resource stores", async () => {
    const french = createLocalization();
    const german = createLocalization();
    await Promise.all([
      french.changeLanguage("fr"),
      german.changeLanguage("de"),
    ]);
    const render = (locale: typeof french) =>
      renderToString(
        <LocalizationProvider localization={locale}>
          <Greeting />
        </LocalizationProvider>,
      );
    expect(render(french)).toContain('lang="fr"');
    expect(render(german)).toContain('lang="de"');
    expect(render(french)).not.toEqual(render(german));
    expect(french.i18n.hasResourceBundle("de", "translation")).toBe(false);
    expect(german.i18n.hasResourceBundle("fr", "translation")).toBe(false);
    const metadata = getSEOMetadata(
      french.i18n,
      "seo.login.title",
      "seo.login.description",
    );
    expect(metadata.title).toBe(french.i18n.t("seo.login.title"));
    expect(createHeadMeta(french.i18n, metadata).meta).toContainEqual({
      property: "og:locale",
      content: "fr_FR",
    });
  });

  it("rejects unsupported paths without changing the displayed language", async () => {
    const locale = createLocalization();
    await expect(locale.changeLanguage("../../invalid")).rejects.toThrow(
      "Unsupported language",
    );
    expect(locale.i18n.language).toBe("en");
  });

  it("lets an immediate English choice supersede an in-flight locale", async () => {
    const locale = createLocalization();
    const first = locale.changeLanguage("zh");
    const last = locale.changeLanguage("en");
    expect(await first).toBe(false);
    expect(await last).toBe(true);
    expect(locale.i18n.language).toBe("en");
  });
});
