import { validateGeneratedScreenshots } from "./store-metadata";

const errors = validateGeneratedScreenshots(process.cwd());

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(
  "All 84 localized screenshots have the required order, size, and opacity.",
);
