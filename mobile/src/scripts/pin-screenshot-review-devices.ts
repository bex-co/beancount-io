import * as fs from "fs";
import * as path from "path";
import {
  loadScreenshotManifest,
  pinScreenshotReviewDisplayTypes,
  ScreenshotReviewEntry,
} from "./store-metadata";

const [reviewDirectory] = process.argv.slice(2);
if (!reviewDirectory) {
  throw new Error("usage: pin-screenshot-review-devices <review-directory>");
}

const root = process.cwd();
const manifestPath = path.join(reviewDirectory, "manifest.json");
const review = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
  entries: ScreenshotReviewEntry[];
};
const declaredDisplayTypes = loadScreenshotManifest(root).displayTypes.map(
  (display) => display.name,
);
const errors = pinScreenshotReviewDisplayTypes(
  review.entries,
  declaredDisplayTypes,
);

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

fs.writeFileSync(manifestPath, `${JSON.stringify(review, null, 2)}\n`);
console.log(
  `Pinned ${review.entries.length} screenshot entries to manifest-declared display types.`,
);
