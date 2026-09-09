import * as fs from "fs";
import * as path from "path";
import { loadStoreLocaleManifest } from "./store-metadata";
import type { PlayListing } from "./play-api";

export function trimPlayShortDescription(text: string, locale: string): string {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if ([...normalized].length <= 80) return normalized;
  let result = "";
  for (const { segment } of new Intl.Segmenter(locale, {
    granularity: "word",
  }).segment(normalized)) {
    if ([...result, ...segment].length > 80) break;
    result += segment;
  }
  const boundary = [...result.matchAll(/[,;،؛，。.!?؟]/gu)].at(-1)?.index;
  if (boundary !== undefined && boundary > 0)
    result = result.slice(0, boundary);
  return result.trim().replace(/[\s,;:.،؛，。]+$/u, "");
}

export function playListingErrors(listing: PlayListing): string[] {
  const errors: string[] = [];
  for (const [field, limit] of [
    ["title", 30],
    ["shortDescription", 80],
    ["fullDescription", 4000],
  ] as const) {
    const value = listing[field];
    if (
      typeof value !== "string" ||
      !value.trim() ||
      [...value].length > limit
    ) {
      errors.push(
        `${listing.language}: ${field} must contain 1–${limit} characters`,
      );
    }
  }
  return errors;
}

export function derivePlayListings(
  root: string,
  version: string,
): PlayListing[] {
  if (!/^\d+\.\d+\.\d+$/.test(version))
    throw new Error("Invalid mobile version.");
  const manifest = loadStoreLocaleManifest(root);
  const read = (file: string) =>
    JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
  return Object.values(manifest.runtimeToPlay)
    .flat()
    .map((language) => {
      const store = manifest.playToStore[language];
      const supplemental = store
        ? undefined
        : read(`metadata/play-source/${language}.json`);
      const info = store
        ? read(`metadata/app-info/${store}.json`)
        : supplemental;
      const copy = store
        ? read(`metadata/version/${version}/${store}.json`)
        : supplemental;
      const listing: PlayListing = {
        language,
        title: info.name,
        shortDescription: trimPlayShortDescription(
          `${info.subtitle}${language === "zh-CN" ? "。" : "."} ${copy.promotionalText ?? ""}`,
          language,
        ),
        fullDescription: copy.description,
      };
      const errors = playListingErrors(listing);
      if (errors.length) throw new Error(errors.join("\n"));
      return listing;
    });
}

export function validatePlayMetadata(root: string): string[] {
  const version = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  ).version;
  let expected: PlayListing[];
  try {
    expected = derivePlayListings(root, version);
  } catch (error) {
    return [`Cannot derive Play metadata: ${(error as Error).message}`];
  }
  const errors: string[] = [];
  const directory = path.join(root, "metadata/play");
  const files = fs.existsSync(directory)
    ? fs
        .readdirSync(directory)
        .filter((file) => file.endsWith(".json"))
        .sort()
    : [];
  if (
    JSON.stringify(files) !==
    JSON.stringify(expected.map((listing) => `${listing.language}.json`).sort())
  ) {
    errors.push(
      "Generated Play locale files do not match the 16-locale manifest.",
    );
  }
  for (const listing of expected) {
    const file = path.join(directory, `${listing.language}.json`);
    if (!fs.existsSync(file)) continue;
    try {
      const actual = JSON.parse(fs.readFileSync(file, "utf8"));
      errors.push(...playListingErrors(actual));
      if (
        Object.keys(actual).sort().join() !==
          Object.keys(listing).sort().join() ||
        Object.entries(listing).some(([key, value]) => actual[key] !== value)
      ) {
        errors.push(
          `${listing.language}: generated Play copy is stale; run yarn play:generate`,
        );
      }
    } catch {
      errors.push(`${listing.language}: invalid Play listing JSON`);
    }
  }
  return errors;
}
