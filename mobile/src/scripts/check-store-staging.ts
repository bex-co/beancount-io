import * as fs from "fs";
import * as path from "path";
import {
  StoreStagingReceipt,
  validateStoreStagingReceipt,
} from "./store-metadata";

const root = process.cwd();
const packageMetadata = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
) as { version: string };
const receiptPath = path.join(
  root,
  "metadata/releases",
  `${packageMetadata.version}.json`,
);
const receipt = fs.existsSync(receiptPath)
  ? (JSON.parse(fs.readFileSync(receiptPath, "utf8")) as StoreStagingReceipt)
  : undefined;
const errors = validateStoreStagingReceipt(
  root,
  packageMetadata.version,
  receipt,
);

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`App Store assets are staged for ${packageMetadata.version}.`);
