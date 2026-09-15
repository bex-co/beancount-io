/**
 * Tests the real `useTranslations`. This file used to re-declare the logic inline and
 * assert against its own copy, so it could not fail; the module's native and
 * `@/` dependencies are now replaced with stand-ins the runner can load.
 */
import {
  freshRequire,
  interceptModules,
} from "../../__tests__/fixtures/intercept-modules";

type VarsMock = typeof import("../../__tests__/fixtures/mock-vars");
type TranslationsMock =
  typeof import("../../__tests__/fixtures/mock-translations");
type Subject = typeof import("../use-translations");

const VARS = require.resolve("../../__tests__/fixtures/mock-vars");
const TRANSLATIONS =
  require.resolve("../../__tests__/fixtures/mock-translations");
const SUBJECT = require.resolve("../use-translations");
let restore: () => void;
let vars: VarsMock;
let translations: TranslationsMock;
let useTranslations: Subject["useTranslations"];

beforeAll(() => {
  restore = interceptModules({
    "@apollo/client":
      require.resolve("../../__tests__/fixtures/mock-apollo-client"),
    "@/common/vars": VARS,
    "@/translations": TRANSLATIONS,
  });
  vars = require(VARS) as VarsMock;
  translations = require(TRANSLATIONS) as TranslationsMock;
  ({ useTranslations } = freshRequire<Subject>(SUBJECT));
});

afterAll(() => {
  restore();
  delete require.cache[SUBJECT];
});

describe("useTranslations", () => {
  it("translates through i18n, passing interpolation params along", () => {
    vars.localeVar("en");
    translations.i18n.locale = "en";
    const { t, locale } = useTranslations();
    expect(locale).toBe("en");
    expect(t("save", { count: 2 })).toBe('save|en|{"count":2}');
  });

  it("brings i18n to the reactive locale before translating", () => {
    vars.localeVar("de");
    translations.i18n.locale = "en";
    const { t, locale } = useTranslations();
    expect(locale).toBe("de");
    expect(translations.i18n.locale).toBe("de");
    expect(t("save")).toBe("save|de|null");
  });
});
