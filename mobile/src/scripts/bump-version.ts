import { bumpVersion } from "./store-metadata";

const result = bumpVersion(process.cwd(), new Date());

console.log(`Version bumped to ${result.version}`);
console.log(`iOS build number: ${result.buildNumber}`);
console.log(`Android version code: ${result.buildNumber}`);
console.log(`Scaffolded App Store metadata: ${result.metadataDirectory}`);
console.log(`Created Android changelog: ${result.androidChangelog}`);
console.log(
  "Release is intentionally blocked until every localized whatsNew field and the Android changelog are updated.",
);
