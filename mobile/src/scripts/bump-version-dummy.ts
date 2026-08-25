import { bumpVersion } from "./store-metadata";

const result = bumpVersion(process.cwd(), new Date(), {
  scaffoldMetadata: false,
  writeAndroidChangelog: false,
});

console.log(`Version bumped to ${result.version} without release scaffolding`);
console.log(`iOS build number: ${result.buildNumber}`);
console.log(`Android version code: ${result.buildNumber}`);
