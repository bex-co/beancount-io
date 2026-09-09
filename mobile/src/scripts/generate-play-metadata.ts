import * as fs from "fs";
import { execFileSync } from "child_process";
import { derivePlayListings } from "./play-metadata";

const root = process.cwd();
// The first generation must follow an authenticated observation, never an
// invented English-only baseline. Subsequent regenerations use that same record.
const baseline = "tmp/play-baseline/baseline.json";
if (!fs.existsSync(baseline)) {
  throw new Error(
    "Pull and inspect the Play baseline with yarn play:baseline before generating copy.",
  );
}
const recorded = JSON.parse(fs.readFileSync(baseline, "utf8"));
if (
  recorded.packageName !== "io.beancount.android" ||
  !Array.isArray(recorded.listings) ||
  !Number.isFinite(Date.parse(recorded.capturedAt))
) {
  throw new Error("The Play baseline is invalid; pull it again.");
}
const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const listings = derivePlayListings(root, version);
fs.mkdirSync("metadata/play", { recursive: true });
for (const listing of listings) {
  fs.writeFileSync(
    `metadata/play/${listing.language}.json`,
    `${JSON.stringify(listing, null, 2)}\n`,
  );
}
execFileSync(
  process.execPath,
  [require.resolve("prettier/bin/prettier.cjs"), "metadata/play", "--write"],
  { stdio: "pipe" },
);
console.log(
  `Generated ${listings.length} Play listings from canonical ${version} metadata.`,
);
