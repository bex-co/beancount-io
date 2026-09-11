import {
  loadScreenshotManifest,
  loadStoreLocaleManifest,
  validatePlayArtworkManifest,
} from "../store-metadata";

describe("Play artwork contract", () => {
  it("maps 16 storefronts to all 13 shipped languages, with native bg and fa", () => {
    const locales = loadStoreLocaleManifest(process.cwd());
    const screenshots = loadScreenshotManifest(process.cwd());
    expect(validatePlayArtworkManifest(locales, screenshots)).toEqual([]);
    expect(Object.keys(locales.runtimeToPlay).length).toBe(13);
    expect(Object.values(locales.runtimeToPlay).flat().length).toBe(16);
    expect(locales.playToStore["zh-CN"]).toBe("zh-Hans");
    expect(locales.playToStore["es-419"]).toBe("es-MX");
    expect(locales.playToStore["ru-RU"]).toBe("ru");
    expect(locales.runtimeToPlay.bg).toEqual(["bg"]);
    expect(locales.runtimeToPlay.fa).toEqual(["fa"]);
    locales.playToStore.fa = "en-US";
    expect(validatePlayArtworkManifest(locales, screenshots).length > 0).toBe(
      true,
    );
  });

  it("rejects missing captions and incorrect Play image dimensions", () => {
    const locales = loadStoreLocaleManifest(process.cwd());
    for (const target of ["phoneScreenshots", "featureGraphic"]) {
      const screenshots = loadScreenshotManifest(process.cwd());
      screenshots.playDisplayTypes.find(
        (display) => display.name === target,
      )!.height = 2778;
      expect(validatePlayArtworkManifest(locales, screenshots)).toEqual([
        `${target} has invalid Play dimensions or layout`,
      ]);
    }
    const screenshots = loadScreenshotManifest(process.cwd());
    screenshots.playOnlyCaptions.bg = ["", "", ""];
    expect(validatePlayArtworkManifest(locales, screenshots)).toEqual([
      "bg must have three nonempty Play captions",
    ]);
  });
});
