import { mkdirSync, writeFileSync } from "fs";
import { createPlayClient, pullPlayBaseline } from "./play-api";

async function main() {
  const credentialPath = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
  if (!credentialPath) {
    throw new Error(
      "Set GOOGLE_PLAY_SERVICE_ACCOUNT to the local service-account JSON path.",
    );
  }
  const baseline = await pullPlayBaseline(
    await createPlayClient(credentialPath),
  );
  const directory = "tmp/play-baseline";
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    `${directory}/baseline.json`,
    `${JSON.stringify(baseline, null, 2)}\n`,
    { mode: 0o600 },
  );
  for (const listing of baseline.listings) {
    console.log(
      `${listing.language}: title=${!!listing.title}, short=${!!listing.shortDescription}, full=${!!listing.fullDescription}, ${Object.entries(
        listing.images,
      )
        .map(([type, images]) => `${type}=${images.length}`)
        .join(", ")}`,
    );
  }
  console.log(
    `Saved ${baseline.listings.length} locales to ${directory}/baseline.json.`,
  );
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
