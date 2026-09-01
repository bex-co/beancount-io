import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execFileSync } from "child_process";
import {
  bumpVersion,
  keywordValidationErrors,
  loadScreenshotManifest,
  loadStoreLocaleManifest,
  pinScreenshotReviewDisplayTypes,
  releaseNoteErrors,
  REQUIRED_DISPLAY_TYPES,
  REQUIRED_RUNTIME_LOCALES,
  REQUIRED_STORE_LOCALES,
  runtimeLocaleForStore,
  screenshotIdentityErrors,
  storeInputDigest,
  validateLocaleManifest,
  validateReleaseGate,
  validateScreenshotManifest,
  validateStoreStagingReceipt,
  writeStoreStagingReceipt,
} from "../store-metadata";

const root = process.cwd();

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

describe("App Store locale manifests", () => {
  it("covers exactly the runtime and App Store locale matrices", () => {
    const manifest = loadStoreLocaleManifest(root);
    expect([...manifest.runtimeLocales].sort()).toEqual(
      [...REQUIRED_RUNTIME_LOCALES].sort(),
    );
    expect([...manifest.storeLocales].sort()).toEqual(
      [...REQUIRED_STORE_LOCALES].sort(),
    );
    expect(validateLocaleManifest(manifest)).toEqual([]);
  });

  it("keeps Bulgarian and Persian in-app with explicit primary fallback", () => {
    const manifest = loadStoreLocaleManifest(root);
    expect(manifest.runtimeToStore.bg).toEqual([]);
    expect(manifest.runtimeToStore.fa).toEqual([]);
    expect(manifest.fallbacks.bg.storeLocale).toBe("en-US");
    expect(manifest.fallbacks.fa.storeLocale).toBe("en-US");
  });

  it("maps every real store locale to one shipped runtime translation", () => {
    const manifest = loadStoreLocaleManifest(root);
    expect(
      manifest.storeLocales.map((locale) =>
        runtimeLocaleForStore(manifest, locale),
      ),
    ).toEqual([
      "en",
      "zh",
      "ca",
      "de",
      "es",
      "es",
      "fr",
      "fr",
      "nl",
      "pt",
      "pt",
      "ru",
      "sk",
      "uk",
    ]);
  });

  it("rejects missing, extra, and false locale mappings", () => {
    const manifest = JSON.parse(JSON.stringify(loadStoreLocaleManifest(root)));
    manifest.storeLocales.pop();
    manifest.storeLocales.push("en-GB");
    manifest.runtimeToStore.bg = ["en-GB"];
    expect(validateLocaleManifest(manifest).length > 0).toBeTruthy();
  });
});

describe("App Store keyword and release-note quality", () => {
  it("rejects malformed, duplicate, over-limit, and indexed phrases", () => {
    expect(
      keywordValidationErrors(
        "en-US",
        `ledger, expense,expense,${"x".repeat(101)},`,
        "Beancount: Plain Text Ledger",
        "Double-entry books you own",
      ).length >= 4,
    ).toBeTruthy();
    expect(
      keywordValidationErrors(
        "en-US",
        "expense, budget",
        "Beancount",
        "Your books",
      ).length > 0,
    ).toBeTruthy();
  });

  it("rejects blank, stale, and placeholder release notes", () => {
    expect(releaseNoteErrors("").length > 0).toBeTruthy();
    expect(
      releaseNoteErrors("What's New in Version 1.2.3: [Add your changes here]")
        .length > 0,
    ).toBeTruthy();
    expect(releaseNoteErrors("• Fresh localized release note")).toEqual([]);
  });
});

describe("localized screenshot contract", () => {
  it("declares 84 ordered locale/device/story outputs", () => {
    const locales = loadStoreLocaleManifest(root);
    const screenshots = loadScreenshotManifest(root);
    expect(screenshots.displayTypes.map((display) => display.name)).toEqual([
      ...REQUIRED_DISPLAY_TYPES,
    ]);
    expect(
      locales.storeLocales.length *
        screenshots.displayTypes.length *
        screenshots.stories.length,
    ).toBe(84);
    expect(validateScreenshotManifest(root, locales, screenshots)).toEqual([]);
  });

  it("rejects wrong order, dimensions, and alpha", () => {
    const locales = loadStoreLocaleManifest(root);
    const screenshots = JSON.parse(
      JSON.stringify(loadScreenshotManifest(root)),
    );
    screenshots.stories[0].order = 2;
    expect(
      validateScreenshotManifest(root, locales, screenshots).length > 0,
    ).toBeTruthy();
    expect(screenshotIdentityErrors(100, 200, "srgba", 1284, 2778).length).toBe(
      2,
    );
    expect(screenshotIdentityErrors(1284, 2778, "srgb", 1284, 2778)).toEqual(
      [],
    );
  });

  it("pins upstream-compatible aliases to the declared display type", () => {
    const entries = [
      {
        key: "en-US|APP_IPAD_PRO_3GEN_129|01-overview",
        device: "APP_IPAD_PRO_3GEN_129",
        display_types: ["APP_IPAD_PRO_129", "APP_IPAD_PRO_3GEN_129"],
      },
    ];
    expect(
      pinScreenshotReviewDisplayTypes(entries, [
        "APP_IPHONE_65",
        "APP_IPAD_PRO_3GEN_129",
      ]),
    ).toEqual([]);
    expect(entries[0].display_types).toEqual(["APP_IPAD_PRO_3GEN_129"]);

    expect(
      pinScreenshotReviewDisplayTypes(
        [
          {
            key: "bad",
            device: "APP_IPHONE_67",
            display_types: ["APP_IPHONE_67"],
          },
        ],
        ["APP_IPHONE_65"],
      ).length > 0,
    ).toBeTruthy();
  });
});

describe("version metadata scaffolding", () => {
  it("bumps every version surface, blanks all release notes, and preserves Android", () => {
    const fixtureRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "beancount-store-"),
    );
    try {
      const localeManifest = loadStoreLocaleManifest(root);
      writeJson(
        path.join(fixtureRoot, "metadata/store-locales.json"),
        localeManifest,
      );
      writeJson(path.join(fixtureRoot, "package.json"), {
        version: "1.20260821.44",
      });
      writeJson(path.join(fixtureRoot, "app.json"), {
        expo: {
          version: "1.20260821.44",
          ios: { buildNumber: "44" },
          android: { versionCode: 44 },
        },
      });
      for (const locale of localeManifest.storeLocales) {
        writeJson(
          path.join(fixtureRoot, "metadata/version-template", `${locale}.json`),
          {
            description: "Description",
            keywords: "expense",
            promotionalText: "Promotion",
            marketingUrl: "https://beancount.io",
            supportUrl: "https://beancount.io",
            whatsNew: "Stale release note",
          },
        );
      }

      const result = bumpVersion(fixtureRoot, new Date(2026, 7, 24));
      expect(result.version).toBe("1.20260824.45");
      expect(result.buildNumber).toBe(45);
      expect(
        fs.existsSync(
          path.join(
            fixtureRoot,
            "fastlane/metadata/android/en-US/changelogs/45.txt",
          ),
        ),
      ).toBeTruthy();
      expect(
        fs.existsSync(
          path.join(fixtureRoot, "fastlane/metadata/en-US/release_notes.txt"),
        ),
      ).toBeFalsy();

      const versionDirectory = path.join(
        fixtureRoot,
        "metadata/version/1.20260824.45",
      );
      const files = fs.readdirSync(versionDirectory).sort();
      expect(files).toEqual(
        localeManifest.storeLocales.map((locale) => `${locale}.json`).sort(),
      );
      expect(
        files.every((file) => {
          const metadata = JSON.parse(
            fs.readFileSync(path.join(versionDirectory, file), "utf8"),
          );
          return metadata.whatsNew === "";
        }),
      ).toBeTruthy();
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});

describe("remote release gate", () => {
  it("writes staging receipts in canonical Prettier format", () => {
    const fixtureRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "beancount-store-receipt-"),
    );
    const receipt = {
      schemaVersion: 1,
      appId: "1527950512",
      version: "1.20260829.46",
      verifiedState: "PREPARE_FOR_SUBMISSION",
      storeLocales: ["en-US", "zh-Hans"],
      displayTypes: ["APP_IPHONE_65", "APP_IPAD_PRO_3GEN_129"],
      screenshotsPerSet: 3,
      inputDigest: "sha256:test",
    };

    try {
      const receiptPath = writeStoreStagingReceipt(fixtureRoot, receipt);
      expect(JSON.parse(fs.readFileSync(receiptPath, "utf8"))).toEqual(receipt);
      expect(() =>
        execFileSync(
          process.execPath,
          [
            require.resolve("prettier/bin/prettier.cjs"),
            receiptPath,
            "--check",
          ],
          { cwd: fixtureRoot, stdio: "pipe" },
        ),
      ).not.toThrow();
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("requires editable, confirmed, independently reviewed release phases", () => {
    const fixtureRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "beancount-gate-"),
    );
    try {
      const metadataReviewDirectory = path.join(fixtureRoot, "metadata");
      const screenshotReviewDirectory = path.join(fixtureRoot, "screenshots");
      fs.mkdirSync(metadataReviewDirectory, { recursive: true });
      for (const file of ["plan.json", "approved.json"]) {
        writeJson(path.join(metadataReviewDirectory, file), {});
      }
      for (const file of [
        "manifest.json",
        "approved.json",
        "plan.json",
        "plan.md",
      ]) {
        writeJson(path.join(screenshotReviewDirectory, file), {});
      }

      expect(
        validateReleaseGate({
          phase: "metadata",
          version: "1.20260824.45",
          state: "PREPARE_FOR_SUBMISSION",
          confirmedVersion: "1.20260824.45",
          reviewDirectory: metadataReviewDirectory,
        }),
      ).toEqual([]);
      expect(
        validateReleaseGate({
          phase: "screenshots",
          version: "1.20260824.45",
          state: "PREPARE_FOR_SUBMISSION",
          confirmedVersion: "1.20260824.45",
          reviewDirectory: screenshotReviewDirectory,
        }),
      ).toEqual([]);
      expect(
        validateReleaseGate({
          phase: "screenshots",
          version: "1.20260824.45",
          state: "WAITING_FOR_REVIEW",
          confirmedVersion: "1.20260824.44",
          reviewDirectory: path.join(fixtureRoot, "missing"),
        }).length >= 6,
      ).toBeTruthy();
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("invalidates a missing or stale staging receipt before auto-submit", () => {
    const localeManifest = loadStoreLocaleManifest(root);
    const screenshotManifest = loadScreenshotManifest(root);
    const version = "1.20260824.45";
    expect(validateStoreStagingReceipt(root, version, undefined).length).toBe(
      1,
    );

    const receipt = {
      schemaVersion: 1,
      appId: "1527950512",
      version,
      verifiedState: "PREPARE_FOR_SUBMISSION",
      storeLocales: localeManifest.storeLocales,
      displayTypes: screenshotManifest.displayTypes.map(
        (display) => display.name,
      ),
      screenshotsPerSet: screenshotManifest.stories.length,
      inputDigest: storeInputDigest(root, version),
    };
    expect(validateStoreStagingReceipt(root, version, receipt)).toEqual([]);
    receipt.inputDigest = "sha256:stale";
    expect(
      validateStoreStagingReceipt(root, version, receipt).length > 0,
    ).toBeTruthy();
  });

  it("invalidates the staging digest when screenshot inputs change", () => {
    const fixtureRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "beancount-store-digest-"),
    );
    const version = "1.20260824.45";
    try {
      writeJson(path.join(fixtureRoot, "metadata/store-locales.json"), {
        storeLocales: ["en-US"],
        runtimeToStore: { en: ["en-US"] },
      });
      writeJson(path.join(fixtureRoot, "metadata/screenshots.json"), {
        stories: [{ source: "demo/overview.webp" }],
      });
      writeJson(path.join(fixtureRoot, "metadata/app-info/en-US.json"), {});
      writeJson(
        path.join(fixtureRoot, `metadata/version/${version}/en-US.json`),
        {},
      );
      fs.mkdirSync(path.join(fixtureRoot, "demo"), { recursive: true });
      fs.writeFileSync(
        path.join(fixtureRoot, "demo/overview.webp"),
        "public demo capture",
      );
      fs.mkdirSync(path.join(fixtureRoot, "src/translations"), {
        recursive: true,
      });
      fs.mkdirSync(path.join(fixtureRoot, "src/scripts"), {
        recursive: true,
      });
      fs.mkdirSync(path.join(fixtureRoot, "scripts"), { recursive: true });
      fs.writeFileSync(
        path.join(fixtureRoot, "src/scripts/build-screenshots.ts"),
        "// deterministic renderer",
      );
      fs.writeFileSync(
        path.join(fixtureRoot, "scripts/build-screenshots.sh"),
        "# deterministic wrapper",
      );
      const translationPath = path.join(fixtureRoot, "src/translations/en.ts");
      fs.writeFileSync(translationPath, 'export const en = { home: "Home" };');

      const initialDigest = storeInputDigest(fixtureRoot, version);
      fs.writeFileSync(
        translationPath,
        'export const en = { home: "Overview" };',
      );
      const translatedDigest = storeInputDigest(fixtureRoot, version);
      expect(translatedDigest === initialDigest).toBe(false);
      fs.writeFileSync(
        path.join(fixtureRoot, "src/scripts/build-screenshots.ts"),
        "// changed deterministic renderer",
      );
      expect(storeInputDigest(fixtureRoot, version) === translatedDigest).toBe(
        false,
      );
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
