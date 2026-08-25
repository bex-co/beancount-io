import { validateReleaseGate } from "./store-metadata";

const [phase, version, state, confirmedVersion, reviewDirectory] =
  process.argv.slice(2);

if (phase !== "metadata" && phase !== "screenshots") {
  console.error("phase must be metadata or screenshots");
  process.exit(2);
}

const errors = validateReleaseGate({
  phase,
  version: version || "",
  state: state || "",
  confirmedVersion: confirmedVersion || "",
  reviewDirectory: reviewDirectory || "",
});

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`${phase} release gate passed for ${version}.`);
