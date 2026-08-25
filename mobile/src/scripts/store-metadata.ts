import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { createHash } from "crypto";

export const STORE_LOCALE_MANIFEST = "metadata/store-locales.json";
export const SCREENSHOT_MANIFEST = "metadata/screenshots.json";
export const VERSION_TEMPLATE_DIR = "metadata/version-template";

const EXPECTED_RUNTIME_LOCALES = [
  "en",
  "zh",
  "bg",
  "ca",
  "de",
  "es",
  "fa",
  "fr",
  "nl",
  "pt",
  "ru",
  "sk",
  "uk",
] as const;

const EXPECTED_STORE_LOCALES = [
  "en-US",
  "zh-Hans",
  "ca",
  "de-DE",
  "es-ES",
  "es-MX",
  "fr-FR",
  "fr-CA",
  "nl-NL",
  "pt-BR",
  "pt-PT",
  "ru",
  "sk",
  "uk",
] as const;

const EXPECTED_DISPLAY_TYPES = [
  "APP_IPHONE_65",
  "APP_IPAD_PRO_3GEN_129",
] as const;

export interface StoreLocaleManifest {
  schemaVersion: number;
  primaryStoreLocale: string;
  runtimeLocales: string[];
  storeLocales: string[];
  runtimeToStore: Record<string, string[]>;
  fallbacks: Record<string, { storeLocale: string; reason: string }>;
}

export interface ScreenshotManifest {
  schemaVersion: number;
  sourcePolicy: string;
  displayTypes: Array<{
    name: string;
    width: number;
    height: number;
    layout: "phone" | "tablet";
  }>;
  stories: Array<{ order: number; id: string; source: string }>;
  captions: Record<string, string[]>;
}

export interface ScreenshotReviewEntry {
  key: string;
  device: string;
  display_types: string[];
}

interface AppInfoMetadata {
  name: string;
  subtitle: string;
  privacyPolicyUrl: string;
}

interface VersionMetadata {
  description: string;
  keywords: string;
  promotionalText?: string;
  marketingUrl: string;
  supportUrl: string;
  whatsNew: string;
}

interface ExpoConfig {
  expo: {
    version: string;
    ios?: { buildNumber?: string };
    android?: { versionCode?: number };
  };
}

interface PackageMetadata {
  version: string;
  [key: string]: unknown;
}

export interface BumpOptions {
  scaffoldMetadata?: boolean;
  writeAndroidChangelog?: boolean;
}

export interface BumpResult {
  version: string;
  buildNumber: number;
  metadataDirectory?: string;
  androidChangelog?: string;
}

export interface ReleaseGateInput {
  phase: "metadata" | "screenshots";
  version: string;
  state: string;
  confirmedVersion: string;
  reviewDirectory: string;
}

export interface StoreStagingReceipt {
  schemaVersion: number;
  appId: string;
  version: string;
  verifiedState: string;
  storeLocales: string[];
  displayTypes: string[];
  screenshotsPerSet: number;
  inputDigest: string;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sameSet(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return JSON.stringify(sorted(actual)) === JSON.stringify(sorted(expected));
}

function jsonLocales(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name.slice(0, -5));
}

function codePoints(value: string): number {
  return [...value].length;
}

function normalized(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\s\p{P}\p{S}]+/gu, " ")
    .trim();
}

function requireExactSet(
  errors: string[],
  label: string,
  actual: readonly string[],
  expected: readonly string[],
): void {
  if (sameSet(actual, expected)) {
    return;
  }
  errors.push(
    `${label} mismatch: expected [${expected.join(", ")}], found [${actual.join(", ")}]`,
  );
}

function validateUrl(errors: string[], label: string, value: string): void {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      errors.push(`${label} must use https`);
    }
  } catch {
    errors.push(`${label} is not a valid URL`);
  }
}

function validateAppInfo(
  errors: string[],
  locale: string,
  metadata: AppInfoMetadata,
): void {
  const prefix = `app-info/${locale}`;
  if (!metadata.name?.trim()) errors.push(`${prefix}.name is required`);
  if (!metadata.subtitle?.trim()) errors.push(`${prefix}.subtitle is required`);
  if (codePoints(metadata.name || "") > 30) {
    errors.push(`${prefix}.name exceeds 30 code points`);
  }
  if (codePoints(metadata.subtitle || "") > 30) {
    errors.push(`${prefix}.subtitle exceeds 30 code points`);
  }
  validateUrl(errors, `${prefix}.privacyPolicyUrl`, metadata.privacyPolicyUrl);
}

function validateKeywords(
  errors: string[],
  locale: string,
  keywordsValue: string,
  appInfo: AppInfoMetadata,
): void {
  const prefix = `version/${locale}.keywords`;
  if (codePoints(keywordsValue) > 100) {
    errors.push(`${prefix} exceeds 100 code points`);
  }
  if (
    keywordsValue.includes(", ") ||
    keywordsValue.startsWith(",") ||
    keywordsValue.endsWith(",")
  ) {
    errors.push(`${prefix} has malformed comma separators`);
  }

  const keywords = keywordsValue.split(",");
  if (keywords.some((keyword) => !keyword.trim())) {
    errors.push(`${prefix} contains an empty segment`);
  }
  const normalizedKeywords = keywords.map(normalized);
  if (new Set(normalizedKeywords).size !== normalizedKeywords.length) {
    errors.push(`${prefix} contains a duplicate phrase`);
  }

  const indexedText = normalized(`${appInfo.name} ${appInfo.subtitle}`);
  for (const keyword of normalizedKeywords) {
    if (keyword && indexedText.includes(keyword)) {
      errors.push(
        `${prefix} repeats indexed name/subtitle phrase "${keyword}"`,
      );
    }
  }
}

export function keywordValidationErrors(
  locale: string,
  keywordsValue: string,
  name: string,
  subtitle: string,
): string[] {
  const errors: string[] = [];
  validateKeywords(errors, locale, keywordsValue, {
    name,
    subtitle,
    privacyPolicyUrl: "https://example.com",
  });
  return errors;
}

export function releaseNoteErrors(
  value: string,
  requireWhatsNew = true,
): string[] {
  const errors: string[] = [];
  if (requireWhatsNew && !value.trim()) {
    errors.push("whatsNew needs fresh localized release notes");
  }
  if (/\[add your changes here\]|what's new in version|\bTODO\b/i.test(value)) {
    errors.push("whatsNew still contains a scaffold placeholder");
  }
  return errors;
}

function validateVersionMetadata(
  errors: string[],
  locale: string,
  metadata: VersionMetadata,
  appInfo: AppInfoMetadata,
  requireWhatsNew: boolean,
): void {
  const prefix = `version/${locale}`;
  const limits: Array<[keyof VersionMetadata, number]> = [
    ["description", 4000],
    ["keywords", 100],
    ["promotionalText", 170],
    ["whatsNew", 4000],
  ];

  for (const field of [
    "description",
    "keywords",
    "marketingUrl",
    "supportUrl",
  ] as const) {
    if (!metadata[field]?.trim()) errors.push(`${prefix}.${field} is required`);
  }
  for (const error of releaseNoteErrors(
    metadata.whatsNew || "",
    requireWhatsNew,
  )) {
    errors.push(`${prefix}.${error}`);
  }
  for (const [field, limit] of limits) {
    const value = metadata[field];
    if (typeof value === "string" && codePoints(value) > limit) {
      errors.push(`${prefix}.${field} exceeds ${limit} code points`);
    }
  }
  validateUrl(errors, `${prefix}.marketingUrl`, metadata.marketingUrl);
  validateUrl(errors, `${prefix}.supportUrl`, metadata.supportUrl);
  validateKeywords(errors, locale, metadata.keywords || "", appInfo);
}

export function loadStoreLocaleManifest(root: string): StoreLocaleManifest {
  return readJson<StoreLocaleManifest>(path.join(root, STORE_LOCALE_MANIFEST));
}

export function loadScreenshotManifest(root: string): ScreenshotManifest {
  return readJson<ScreenshotManifest>(path.join(root, SCREENSHOT_MANIFEST));
}

export function pinScreenshotReviewDisplayTypes(
  entries: ScreenshotReviewEntry[],
  declaredDisplayTypes: readonly string[],
): string[] {
  const errors: string[] = [];
  const declared = new Set(declaredDisplayTypes);
  for (const entry of entries) {
    if (!declared.has(entry.device)) {
      errors.push(`${entry.key} uses undeclared device ${entry.device}`);
      continue;
    }
    if (!entry.display_types.includes(entry.device)) {
      errors.push(
        `${entry.key} is not compatible with declared device ${entry.device}`,
      );
      continue;
    }
    entry.display_types = [entry.device];
  }
  return errors;
}

export function runtimeLocaleForStore(
  manifest: StoreLocaleManifest,
  storeLocale: string,
): string {
  const matches = Object.entries(manifest.runtimeToStore)
    .filter(([, storeLocales]) => storeLocales.includes(storeLocale))
    .map(([runtimeLocale]) => runtimeLocale);
  if (matches.length !== 1) {
    throw new Error(
      `Store locale ${storeLocale} must map to exactly one runtime locale; found ${matches.length}`,
    );
  }
  return matches[0];
}

export function validateLocaleManifest(
  manifest: StoreLocaleManifest,
): string[] {
  const errors: string[] = [];
  if (manifest.schemaVersion !== 1)
    errors.push("store locale schemaVersion must be 1");
  if (manifest.primaryStoreLocale !== "en-US") {
    errors.push("primary store locale must be en-US");
  }
  requireExactSet(
    errors,
    "runtime locale manifest",
    manifest.runtimeLocales,
    EXPECTED_RUNTIME_LOCALES,
  );
  requireExactSet(
    errors,
    "store locale manifest",
    manifest.storeLocales,
    EXPECTED_STORE_LOCALES,
  );
  requireExactSet(
    errors,
    "runtime-to-store keys",
    Object.keys(manifest.runtimeToStore),
    EXPECTED_RUNTIME_LOCALES,
  );
  requireExactSet(errors, "fallback locales", Object.keys(manifest.fallbacks), [
    "bg",
    "fa",
  ]);

  for (const locale of ["bg", "fa"]) {
    if ((manifest.runtimeToStore[locale] || []).length !== 0) {
      errors.push(
        `${locale} must not be falsely mapped to an App Store locale`,
      );
    }
    if (
      manifest.fallbacks[locale]?.storeLocale !== manifest.primaryStoreLocale
    ) {
      errors.push(
        `${locale} must explicitly fall back to ${manifest.primaryStoreLocale}`,
      );
    }
  }

  const mapped = Object.values(manifest.runtimeToStore).flat();
  requireExactSet(
    errors,
    "mapped store locales",
    mapped,
    manifest.storeLocales,
  );
  return errors;
}

export function validateScreenshotManifest(
  root: string,
  localeManifest: StoreLocaleManifest,
  screenshotManifest: ScreenshotManifest,
): string[] {
  const errors: string[] = [];
  requireExactSet(
    errors,
    "screenshot caption locales",
    Object.keys(screenshotManifest.captions),
    localeManifest.storeLocales,
  );
  requireExactSet(
    errors,
    "screenshot display types",
    screenshotManifest.displayTypes.map((display) => display.name),
    EXPECTED_DISPLAY_TYPES,
  );
  if (
    screenshotManifest.stories.length !== 3 ||
    screenshotManifest.stories.some((story, index) => story.order !== index + 1)
  ) {
    errors.push(
      "screenshot stories must be exactly three entries ordered 1, 2, 3",
    );
  }
  for (const story of screenshotManifest.stories) {
    if (!fs.existsSync(path.join(root, story.source))) {
      errors.push(`screenshot source is missing: ${story.source}`);
    }
  }
  for (const [locale, captions] of Object.entries(
    screenshotManifest.captions,
  )) {
    if (captions.length !== screenshotManifest.stories.length) {
      errors.push(`${locale} must have one caption per screenshot story`);
    }
    if (captions.some((caption) => !caption.trim())) {
      errors.push(`${locale} has an empty screenshot caption`);
    }
  }
  return errors;
}

export function validateStoreMetadata(root: string): string[] {
  const errors: string[] = [];
  const localeManifest = loadStoreLocaleManifest(root);
  const screenshotManifest = loadScreenshotManifest(root);
  errors.push(...validateLocaleManifest(localeManifest));
  errors.push(
    ...validateScreenshotManifest(root, localeManifest, screenshotManifest),
  );

  const packageMetadata = readJson<PackageMetadata>(
    path.join(root, "package.json"),
  );
  const appConfig = readJson<ExpoConfig>(path.join(root, "app.json"));
  const version = packageMetadata.version;
  const buildNumber = Number(version.split(".").at(-1));
  if (appConfig.expo.version !== version) {
    errors.push(
      `package/app version mismatch: ${version} vs ${appConfig.expo.version}`,
    );
  }
  if (appConfig.expo.ios?.buildNumber !== String(buildNumber)) {
    errors.push(
      "iOS buildNumber does not match the package version build component",
    );
  }
  if (appConfig.expo.android?.versionCode !== buildNumber) {
    errors.push(
      "Android versionCode does not match the package version build component",
    );
  }

  const appInfoDirectory = path.join(root, "metadata/app-info");
  const templateDirectory = path.join(root, VERSION_TEMPLATE_DIR);
  const versionDirectory = path.join(root, "metadata/version", version);
  requireExactSet(
    errors,
    "app-info files",
    jsonLocales(appInfoDirectory),
    localeManifest.storeLocales,
  );
  requireExactSet(
    errors,
    "version template files",
    jsonLocales(templateDirectory),
    localeManifest.storeLocales,
  );
  requireExactSet(
    errors,
    `${version} files`,
    jsonLocales(versionDirectory),
    localeManifest.storeLocales,
  );

  for (const locale of localeManifest.storeLocales) {
    const appInfoPath = path.join(appInfoDirectory, `${locale}.json`);
    if (!fs.existsSync(appInfoPath)) continue;
    const appInfo = readJson<AppInfoMetadata>(appInfoPath);
    validateAppInfo(errors, locale, appInfo);

    const templatePath = path.join(templateDirectory, `${locale}.json`);
    if (fs.existsSync(templatePath)) {
      validateVersionMetadata(
        errors,
        `${locale} template`,
        readJson<VersionMetadata>(templatePath),
        appInfo,
        false,
      );
    }

    const versionPath = path.join(versionDirectory, `${locale}.json`);
    if (fs.existsSync(versionPath)) {
      validateVersionMetadata(
        errors,
        locale,
        readJson<VersionMetadata>(versionPath),
        appInfo,
        true,
      );
    }
  }
  return errors;
}

export function validateGeneratedScreenshots(root: string): string[] {
  const errors: string[] = [];
  const locales = loadStoreLocaleManifest(root).storeLocales;
  const manifest = loadScreenshotManifest(root);
  const outputRoot = path.join(root, "metadata/screenshots");
  const expectedFiles = manifest.stories.map(
    (story) => `${String(story.order).padStart(2, "0")}-${story.id}.png`,
  );

  for (const locale of locales) {
    for (const display of manifest.displayTypes) {
      const directory = path.join(outputRoot, locale, display.name);
      const files = fs.existsSync(directory)
        ? fs
            .readdirSync(directory)
            .filter((file) => file.endsWith(".png"))
            .sort()
        : [];
      if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) {
        errors.push(
          `${locale}/${display.name} has the wrong screenshot names or order`,
        );
        continue;
      }
      for (const file of files) {
        const absolutePath = path.join(directory, file);
        const identity = execFileSync(
          "magick",
          ["identify", "-format", "%w|%h|%[channels]", absolutePath],
          { encoding: "utf8" },
        ).trim();
        const [width, height, channels] = identity.split("|");
        for (const error of screenshotIdentityErrors(
          Number(width),
          Number(height),
          channels,
          display.width,
          display.height,
        )) {
          errors.push(`${locale}/${display.name}/${file} ${error}`);
        }
      }
    }
  }
  return errors;
}

export function screenshotIdentityErrors(
  width: number,
  height: number,
  channels: string,
  expectedWidth: number,
  expectedHeight: number,
): string[] {
  const errors: string[] = [];
  if (width !== expectedWidth || height !== expectedHeight) {
    errors.push(`has dimensions ${width}x${height}`);
  }
  if (/a/i.test(channels)) {
    errors.push(`contains an alpha channel (${channels})`);
  }
  return errors;
}

export function validateReleaseGate(input: ReleaseGateInput): string[] {
  const errors: string[] = [];
  if (input.confirmedVersion !== input.version) {
    errors.push(
      `confirmation must exactly match target version ${input.version}`,
    );
  }
  if (input.state !== "PREPARE_FOR_SUBMISSION") {
    errors.push(
      `target version must be PREPARE_FOR_SUBMISSION, found ${input.state || "missing"}`,
    );
  }
  const requiredFiles =
    input.phase === "metadata"
      ? ["plan.json", "approved.json"]
      : ["manifest.json", "approved.json", "plan.json", "plan.md"];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(input.reviewDirectory, file))) {
      errors.push(`${input.phase} review ${file} is missing`);
    }
  }
  return errors;
}

export function storeInputDigest(root: string, version: string): string {
  const localeManifest = loadStoreLocaleManifest(root);
  const locales = localeManifest.storeLocales;
  const screenshotManifest = loadScreenshotManifest(root);
  const screenshotRuntimeLocales = [
    ...new Set(
      locales.map((locale) => runtimeLocaleForStore(localeManifest, locale)),
    ),
  ];
  const files = [
    STORE_LOCALE_MANIFEST,
    SCREENSHOT_MANIFEST,
    "scripts/build-screenshots.sh",
    "src/scripts/build-screenshots.ts",
    ...locales.map((locale) => `metadata/app-info/${locale}.json`),
    ...locales.map((locale) => `metadata/version/${version}/${locale}.json`),
    ...screenshotManifest.stories.map((story) => story.source),
    ...screenshotRuntimeLocales.map(
      (locale) => `src/translations/${locale}.ts`,
    ),
  ].sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(root, file)));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

export function validateStoreStagingReceipt(
  root: string,
  version: string,
  receipt: StoreStagingReceipt | undefined,
): string[] {
  const errors: string[] = [];
  if (!receipt) return [`store staging receipt is missing for ${version}`];
  const locales = loadStoreLocaleManifest(root).storeLocales;
  const screenshotManifest = loadScreenshotManifest(root);
  if (receipt.schemaVersion !== 1)
    errors.push("store staging receipt schemaVersion must be 1");
  if (receipt.appId !== "1527950512")
    errors.push("store staging receipt appId is wrong");
  if (receipt.version !== version)
    errors.push("store staging receipt version is stale");
  if (receipt.verifiedState !== "PREPARE_FOR_SUBMISSION") {
    errors.push(
      "store staging receipt was not captured while the version was editable",
    );
  }
  requireExactSet(
    errors,
    "staged store locales",
    receipt.storeLocales,
    locales,
  );
  requireExactSet(
    errors,
    "staged screenshot display types",
    receipt.displayTypes,
    screenshotManifest.displayTypes.map((display) => display.name),
  );
  if (receipt.screenshotsPerSet !== screenshotManifest.stories.length) {
    errors.push("store staging receipt has the wrong screenshot count");
  }
  if (receipt.inputDigest !== storeInputDigest(root, version)) {
    errors.push(
      "store staging receipt does not match the current metadata/screenshot inputs",
    );
  }
  return errors;
}

export function nextVersion(currentVersion: string, now: Date): BumpResult {
  const buildNumber = Number(currentVersion.split(".").at(-1)) + 1;
  if (!Number.isSafeInteger(buildNumber) || buildNumber <= 0) {
    throw new Error(`Invalid current version: ${currentVersion}`);
  }
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  return { version: `1.${date}.${buildNumber}`, buildNumber };
}

export function bumpVersion(
  root: string,
  now: Date,
  options: BumpOptions = {},
): BumpResult {
  const packagePath = path.join(root, "package.json");
  const appPath = path.join(root, "app.json");
  const packageMetadata = readJson<PackageMetadata>(packagePath);
  const appConfig = readJson<ExpoConfig>(appPath);
  if (packageMetadata.version !== appConfig.expo.version) {
    throw new Error(
      "Refusing to bump mismatched package.json and app.json versions",
    );
  }

  const result = nextVersion(packageMetadata.version, now);
  const scaffoldMetadata = options.scaffoldMetadata !== false;
  const writeAndroidChangelog = options.writeAndroidChangelog !== false;
  const localeManifest = loadStoreLocaleManifest(root);
  const templateDirectory = path.join(root, VERSION_TEMPLATE_DIR);
  const targetDirectory = path.join(root, "metadata/version", result.version);

  if (scaffoldMetadata) {
    const templateLocales = jsonLocales(templateDirectory);
    if (!sameSet(templateLocales, localeManifest.storeLocales)) {
      throw new Error(
        "Refusing to bump: version template locale coverage is incomplete",
      );
    }
    if (fs.existsSync(targetDirectory)) {
      throw new Error(
        `Refusing to overwrite existing metadata directory ${targetDirectory}`,
      );
    }
  }

  packageMetadata.version = result.version;
  appConfig.expo.version = result.version;
  if (appConfig.expo.ios)
    appConfig.expo.ios.buildNumber = String(result.buildNumber);
  if (appConfig.expo.android)
    appConfig.expo.android.versionCode = result.buildNumber;
  writeJson(packagePath, packageMetadata);
  writeJson(appPath, appConfig);

  if (scaffoldMetadata) {
    fs.mkdirSync(targetDirectory, { recursive: true });
    for (const locale of localeManifest.storeLocales) {
      const metadata = readJson<VersionMetadata>(
        path.join(templateDirectory, `${locale}.json`),
      );
      writeJson(path.join(targetDirectory, `${locale}.json`), {
        ...metadata,
        whatsNew: "",
      });
    }
    result.metadataDirectory = targetDirectory;
  }

  if (writeAndroidChangelog) {
    const changelogDirectory = path.join(
      root,
      "fastlane/metadata/android/en-US/changelogs",
    );
    fs.mkdirSync(changelogDirectory, { recursive: true });
    const changelogPath = path.join(
      changelogDirectory,
      `${result.buildNumber}.txt`,
    );
    if (!fs.existsSync(changelogPath)) {
      fs.writeFileSync(
        changelogPath,
        `What's New in Version ${result.version}:\n\n• [Add your changes here]\n`,
      );
    }
    result.androidChangelog = changelogPath;
  }

  return result;
}

export const REQUIRED_STORE_LOCALES = EXPECTED_STORE_LOCALES;
export const REQUIRED_RUNTIME_LOCALES = EXPECTED_RUNTIME_LOCALES;
export const REQUIRED_DISPLAY_TYPES = EXPECTED_DISPLAY_TYPES;
