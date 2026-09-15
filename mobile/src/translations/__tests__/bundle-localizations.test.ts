import fs from "fs";
import path from "path";
import { translationLocales } from "./locale-parity";

/**
 * iOS resolves an app's language from the localizations its bundle declares,
 * falling back to the development region. With none declared, a device set to
 * Chinese reported only `en` to expo-localization, and every fresh install
 * came up in English whatever the device language. The declared list must
 * track the translation files, or a new language silently cannot be detected.
 */
describe("iOS bundle localizations", () => {
  it("declare exactly the languages the app ships", () => {
    const appConfig = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "..", "..", "..", "app.json"),
        "utf8",
      ),
    );
    const declared: string[] =
      appConfig.expo.ios.infoPlist.CFBundleLocalizations ?? [];
    expect([...declared].sort()).toEqual(
      ["en", ...translationLocales()].sort(),
    );
  });
});
