import { validateStoreMetadata } from "./store-metadata";
import { validatePlayMetadata } from "./play-metadata";

const errors = [
  ...validateStoreMetadata(process.cwd()),
  ...validatePlayMetadata(process.cwd()),
];

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(
  "Store metadata, locale coverage, keywords, and version parity are valid.",
);
