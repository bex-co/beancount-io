import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import {
  loadScreenshotManifest,
  loadStoreLocaleManifest,
  storeInputDigest,
  StoreStagingReceipt,
  writeStoreStagingReceipt,
} from "./store-metadata";

interface RemoteLocalization {
  id: string;
  attributes: { locale: string };
}

interface RemoteScreenshot {
  attributes: {
    fileName: string;
    sourceFileChecksum?: string;
    assetDeliveryState?: { state?: string };
    imageAsset?: { width?: number; height?: number };
  };
}

interface RemoteScreenshotSet {
  set: { attributes: { screenshotDisplayType: string } };
  screenshots: RemoteScreenshot[];
}

const [version, versionId, pullDirectory] = process.argv.slice(2);
if (!version || !versionId || !pullDirectory) {
  throw new Error(
    "usage: verify-store-parity <version> <version-id> <pull-directory>",
  );
}

const root = process.cwd();
const asc = process.env.ASC_BIN || "asc";
const localeManifest = loadStoreLocaleManifest(root);
const screenshotManifest = loadScreenshotManifest(root);
const errors: string[] = [];

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function compareJson(
  label: string,
  localPath: string,
  remotePath: string,
): void {
  if (!fs.existsSync(remotePath)) {
    errors.push(`${label} is missing remotely`);
    return;
  }
  if (
    canonicalJson(readJson(localPath)) !== canonicalJson(readJson(remotePath))
  ) {
    errors.push(`${label} differs from canonical metadata`);
  }
}

for (const locale of localeManifest.storeLocales) {
  compareJson(
    `app-info/${locale}`,
    path.join(root, "metadata/app-info", `${locale}.json`),
    path.join(pullDirectory, "app-info", `${locale}.json`),
  );
  compareJson(
    `version/${locale}`,
    path.join(root, "metadata/version", version, `${locale}.json`),
    path.join(pullDirectory, "version", version, `${locale}.json`),
  );
}

const localizationResponse = JSON.parse(
  execFileSync(
    asc,
    [
      "localizations",
      "list",
      "--version",
      versionId,
      "--paginate",
      "--output",
      "json",
    ],
    { encoding: "utf8" },
  ),
) as { data: RemoteLocalization[] };
const remoteLocales = localizationResponse.data.map(
  (localization) => localization.attributes.locale,
);
if (
  JSON.stringify([...remoteLocales].sort()) !==
  JSON.stringify([...localeManifest.storeLocales].sort())
) {
  errors.push(
    `remote version locale set is wrong: ${remoteLocales.join(", ")}`,
  );
}

const expectedNames = screenshotManifest.stories.map(
  (story) => `${String(story.order).padStart(2, "0")}-${story.id}.png`,
);
for (const localization of localizationResponse.data) {
  if (!localeManifest.storeLocales.includes(localization.attributes.locale))
    continue;
  const response = JSON.parse(
    execFileSync(
      asc,
      [
        "screenshots",
        "list",
        "--version-localization",
        localization.id,
        "--output",
        "json",
      ],
      { encoding: "utf8" },
    ),
  ) as { sets: RemoteScreenshotSet[] };

  for (const display of screenshotManifest.displayTypes) {
    const set = response.sets.find(
      (candidate) =>
        candidate.set.attributes.screenshotDisplayType === display.name,
    );
    if (!set) {
      errors.push(
        `${localization.attributes.locale}/${display.name} is missing remotely`,
      );
      continue;
    }
    const names = set.screenshots.map(
      (screenshot) => screenshot.attributes.fileName,
    );
    if (JSON.stringify(names) !== JSON.stringify(expectedNames)) {
      errors.push(
        `${localization.attributes.locale}/${display.name} has wrong screenshot order: ${names.join(", ")}`,
      );
    }
    for (const screenshot of set.screenshots) {
      const attributes = screenshot.attributes;
      const localScreenshot = path.join(
        root,
        "metadata/screenshots",
        localization.attributes.locale,
        display.name,
        attributes.fileName,
      );
      if (!fs.existsSync(localScreenshot)) {
        errors.push(
          `${localization.attributes.locale}/${display.name}/${attributes.fileName} is missing locally`,
        );
      } else {
        const localChecksum = createHash("md5")
          .update(fs.readFileSync(localScreenshot))
          .digest("hex");
        if (attributes.sourceFileChecksum?.toLowerCase() !== localChecksum) {
          errors.push(
            `${localization.attributes.locale}/${display.name}/${attributes.fileName} differs from the approved local asset`,
          );
        }
      }
      if (attributes.assetDeliveryState?.state !== "COMPLETE") {
        errors.push(
          `${localization.attributes.locale}/${display.name}/${attributes.fileName} is not processed`,
        );
      }
      if (
        attributes.imageAsset?.width !== display.width ||
        attributes.imageAsset?.height !== display.height
      ) {
        errors.push(
          `${localization.attributes.locale}/${display.name}/${attributes.fileName} has wrong dimensions`,
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

const receipt: StoreStagingReceipt = {
  schemaVersion: 1,
  appId: "1527950512",
  version,
  verifiedState: "PREPARE_FOR_SUBMISSION",
  storeLocales: localeManifest.storeLocales,
  displayTypes: screenshotManifest.displayTypes.map((display) => display.name),
  screenshotsPerSet: screenshotManifest.stories.length,
  inputDigest: storeInputDigest(root, version),
};
writeStoreStagingReceipt(root, receipt);
console.log(
  `Remote metadata and screenshots match; wrote staging receipt for ${version}.`,
);
