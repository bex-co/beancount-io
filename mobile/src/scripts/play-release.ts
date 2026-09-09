import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import {
  createPlayClient,
  pullPlayBaseline,
  readPlayBaseline,
} from "./play-api";
import type { PlayBaseline, PlayListing } from "./play-api";
import { derivePlayListings, validatePlayMetadata } from "./play-metadata";
import {
  loadScreenshotManifest,
  validateGeneratedScreenshots,
} from "./store-metadata";

const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

export function playBaselineDigest(baseline: PlayBaseline): string {
  return hash(
    JSON.stringify(
      baseline.listings
        .map((listing) => ({
          language: listing.language,
          title: listing.title,
          shortDescription: listing.shortDescription,
          fullDescription: listing.fullDescription,
          video: listing.video ?? "",
          images: Object.fromEntries(
            ["phoneScreenshots", "featureGraphic"].map((type) => [
              type,
              (listing.images[type] ?? []).map((image) => ({
                id: image.id,
                sha256: image.sha256,
                sha1: image.sha1,
              })),
            ]),
          ),
        }))
        .sort((a, b) => a.language.localeCompare(b.language)),
    ),
  );
}

interface PlayPlan {
  version: string;
  baselineDigest: string;
  locales: Array<{
    before: PlayListing | null;
    after: PlayListing;
    images: Record<string, Array<{ file: string; sha256: string }>>;
  }>;
}

export function buildPlayPlan(root: string, baseline: PlayBaseline): PlayPlan {
  const errors = [
    ...validatePlayMetadata(root),
    ...validateGeneratedScreenshots(root),
  ];
  if (errors.length) throw new Error(errors.join("\n"));
  const version = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  ).version;
  const stories = loadScreenshotManifest(root).stories;
  return {
    version,
    baselineDigest: playBaselineDigest(baseline),
    locales: derivePlayListings(root, version).map((after) => {
      const current = baseline.listings.find(
        (listing) => listing.language === after.language,
      );
      const before = current
        ? {
            language: current.language,
            title: current.title,
            shortDescription: current.shortDescription,
            fullDescription: current.fullDescription,
            ...(current.video ? { video: current.video } : {}),
          }
        : null;
      const images = Object.fromEntries(
        Object.entries({
          phoneScreenshots: stories.map(
            (story) =>
              `${String(story.order).padStart(2, "0")}-${story.id}.png`,
          ),
          featureGraphic: ["feature.png"],
        }).map(([type, files]) => [
          type,
          files.map((name) => {
            const file = `metadata/screenshots/${after.language}/${type}/${name}`;
            return {
              file,
              sha256: hash(fs.readFileSync(path.join(root, file))),
            };
          }),
        ]),
      );
      return {
        before,
        after: { ...after, ...(before?.video ? { video: before.video } : {}) },
        images,
      };
    }),
  };
}

export function formatPlayPlan(plan: PlayPlan, baseline: PlayBaseline): string {
  const lines = [
    `Google Play ${plan.version}`,
    `Baseline: ${baseline.capturedAt}`,
    "",
  ];
  for (const { before, after, images } of plan.locales) {
    lines.push(`=== ${after.language} (${before ? "update" : "create"}) ===`);
    for (const field of [
      "title",
      "shortDescription",
      "fullDescription",
    ] as const) {
      lines.push(`${field}:`);
      if (before?.[field] === after[field]) lines.push("  unchanged");
      else {
        lines.push(
          ...(before?.[field] ?? "(absent)")
            .split("\n")
            .map((line) => `- ${line}`),
        );
        lines.push(...after[field].split("\n").map((line) => `+ ${line}`));
      }
    }
    const current = baseline.listings.find(
      (listing) => listing.language === after.language,
    );
    for (const [type, assets] of Object.entries(images)) {
      lines.push(
        `${type}: replace ${current?.images[type]?.length ?? 0} images with ${assets.length}, in this order:`,
      );
      lines.push(
        ...assets.map((asset) => `+ ${asset.file} sha256=${asset.sha256}`),
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

export async function applyPlayPlan(
  client: Awaited<ReturnType<typeof createPlayClient>>,
  root: string,
  plan: PlayPlan,
): Promise<void> {
  const edit = await client.json<{ id: string }>("", "POST", {});
  if (!edit.id || !/^[a-zA-Z0-9_-]+$/.test(edit.id))
    throw new Error("Google Play returned an invalid edit ID.");
  const editPath = `/${edit.id}`;
  let committed = false;
  try {
    const current = await readPlayBaseline(client, editPath);
    if (playBaselineDigest(current) !== plan.baselineDigest) {
      throw new Error(
        "The remote Play listing changed. Pull a new baseline and review a new plan.",
      );
    }
    for (const { after, images } of plan.locales) {
      const listingPath = `${editPath}/listings/${encodeURIComponent(after.language)}`;
      await client.json(listingPath, "PUT", after);
      for (const [type, assets] of Object.entries(images)) {
        await client.json(`${listingPath}/${type}`, "DELETE");
        for (const asset of assets) {
          const png = fs.readFileSync(path.join(root, asset.file));
          if (hash(png) !== asset.sha256)
            throw new Error("Play artwork changed after plan review.");
          await client.upload(`${listingPath}/${type}`, png);
        }
      }
    }
    await client.json(`${editPath}:validate`, "POST");
    try {
      await client.json(
        `${editPath}:commit?changesInReviewBehavior=ERROR_IF_IN_REVIEW`,
        "POST",
      );
    } catch (error) {
      throw new Error(
        `Play commit did not return success: ${(error as Error).message} Inspect Play Console and run verify-play before retrying.`,
      );
    }
    committed = true;
  } finally {
    if (!committed) {
      try {
        await client.json(editPath, "DELETE");
      } catch {
        throw new Error(
          "Cannot confirm Play edit cleanup. Inspect Play Console and run verify-play before retrying.",
        );
      }
    }
  }
}

export function playParityErrors(
  plan: PlayPlan,
  baseline: PlayBaseline,
): string[] {
  const errors: string[] = [];
  for (const { after, images } of plan.locales) {
    const actual = baseline.listings.find(
      (listing) => listing.language === after.language,
    );
    if (!actual) {
      errors.push(`${after.language}: missing listing`);
      continue;
    }
    for (const field of [
      "title",
      "shortDescription",
      "fullDescription",
    ] as const) {
      if (actual[field] !== after[field])
        errors.push(`${after.language}: ${field} differs`);
    }
    for (const [type, assets] of Object.entries(images)) {
      const observed = actual.images[type] ?? [];
      if (
        observed.length !== assets.length ||
        assets.some(
          (asset, index) =>
            observed[index]?.sha256?.toLowerCase() !== asset.sha256,
        )
      ) {
        errors.push(
          `${after.language}: ${type} count, order, or checksum differs`,
        );
      }
    }
  }
  return errors;
}

async function main() {
  const [command = "plan-play", confirmation] = process.argv.slice(2);
  if (!["plan-play", "apply-play", "verify-play"].includes(command))
    throw new Error(
      "Usage: play-release.sh [plan-play|apply-play <plan-sha256>|verify-play]",
    );
  const root = process.cwd();
  const baselinePath = "tmp/play-baseline/baseline.json";
  if (!fs.existsSync(baselinePath))
    throw new Error("Run yarn play:baseline and review the baseline first.");
  const baseline = JSON.parse(
    fs.readFileSync(baselinePath, "utf8"),
  ) as PlayBaseline;
  const plan = buildPlayPlan(root, baseline);
  const digest = hash(JSON.stringify(plan));
  const planPath = "tmp/play-release/plan.json";
  if (command === "plan-play") {
    const report = formatPlayPlan(plan, baseline);
    fs.mkdirSync(path.dirname(planPath), { recursive: true });
    fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
    fs.writeFileSync(
      "tmp/play-release/plan.txt",
      `${report}\nPlan SHA-256: ${digest}\n`,
    );
    console.log(`${report}\nPlan SHA-256: ${digest}`);
    return;
  }
  if (
    !fs.existsSync(planPath) ||
    hash(JSON.stringify(JSON.parse(fs.readFileSync(planPath, "utf8")))) !==
      digest
  )
    throw new Error(
      "Missing or stale Play plan; run plan-play and review it first.",
    );
  if (command === "apply-play" && confirmation !== digest)
    throw new Error(
      "After reviewing the listing and artwork, confirm apply-play with the exact plan SHA-256.",
    );
  const credential = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
  if (!credential)
    throw new Error(
      "Set GOOGLE_PLAY_SERVICE_ACCOUNT to the local service-account JSON path.",
    );
  const client = await createPlayClient(credential);
  if (command === "apply-play") await applyPlayPlan(client, root, plan);
  const remote = await pullPlayBaseline(client);
  fs.writeFileSync(
    "tmp/play-release/verification.json",
    `${JSON.stringify(remote, null, 2)}\n`,
  );
  const errors = playParityErrors(plan, remote);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "All 16 Play locales match the reviewed text and image checksums. Check Play Console review status and the public listings before declaring them live.",
  );
}

if (require.main === module)
  main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
