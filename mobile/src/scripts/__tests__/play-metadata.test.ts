import {
  derivePlayListings,
  playListingErrors,
  trimPlayShortDescription,
} from "../play-metadata";
import {
  formatPlayPlan,
  playParityErrors,
  playBaselineDigest,
} from "../play-release";
import type { PlayBaseline } from "../play-api";
import * as fs from "fs";

describe("Play listing copy", () => {
  it("derives all 16 locales from canonical copy and native Bulgarian/Persian sources", () => {
    const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
    const listings = derivePlayListings(process.cwd(), version);
    expect(listings.length).toBe(16);
    expect(listings.flatMap(playListingErrors)).toEqual([]);
    expect(
      listings.find((listing) => listing.language === "zh-CN")!.fullDescription,
    ).toBe(
      JSON.parse(
        fs.readFileSync(`metadata/version/${version}/zh-Hans.json`, "utf8"),
      ).description,
    );
    expect(
      listings
        .find((listing) => listing.language === "bg")!
        .fullDescription.includes("Вашият"),
    ).toBe(true);
    expect(
      listings
        .find((listing) => listing.language === "fa")!
        .fullDescription.includes("دفتر"),
    ).toBe(true);
  });

  it("enforces all three limits by Unicode code point and rejects blank copy", () => {
    const listing = {
      language: "en-US",
      title: "😀".repeat(30),
      shortDescription: "a".repeat(80),
      fullDescription: "a".repeat(4000),
    };
    expect(playListingErrors(listing)).toEqual([]);
    for (const field of [
      "title",
      "shortDescription",
      "fullDescription",
    ] as const) {
      expect(
        playListingErrors({ ...listing, [field]: `${listing[field]}x` }).length,
      ).toBe(1);
      expect(playListingErrors({ ...listing, [field]: " " }).length).toBe(1);
    }
  });

  it("trims short descriptions at complete word boundaries, including Chinese", () => {
    expect(
      trimPlayShortDescription(
        "Double-entry books you own. See your whole financial life, keep the plain-text ledger and its history.",
        "en-US",
      ),
    ).toBe("Double-entry books you own. See your whole financial life");
    expect(trimPlayShortDescription("  Your  ledger  ", "en-US")).toBe(
      "Your ledger",
    );
    expect(
      trimPlayShortDescription(`${"ledger ".repeat(11)}financial`, "en-US"),
    ).toBe("ledger ".repeat(11).trim());
    const chinese = trimPlayShortDescription(
      "你的财务记录和账本".repeat(12),
      "zh-CN",
    );
    expect([...chinese].length <= 80).toBe(true);
    expect(chinese.length > 70).toBe(true);
    expect(
      trimPlayShortDescription(`${"😀 ".repeat(39)}financial`, "en-US"),
    ).toBe("😀 ".repeat(39).trim());
  });
});

describe("Play release review", () => {
  const after = {
    language: "fa",
    title: "دفتر",
    shortDescription: "متن",
    fullDescription: "توضیح",
  };
  const plan = {
    version: "1.20260906.47",
    baselineDigest: "digest",
    locales: [
      {
        before: null,
        after,
        images: {
          phoneScreenshots: [{ file: "public.png", sha256: "checksum" }],
          featureGraphic: [{ file: "feature.png", sha256: "feature-checksum" }],
        },
      },
    ],
  };
  const baseline: PlayBaseline = {
    packageName: "io.beancount.android",
    capturedAt: "2026-09-08T00:00:00Z",
    listings: [],
  };

  it("prints every locale and image diff without reading credentials or copying private fields", () => {
    const injected = {
      ...baseline,
      access_token: "secret-token",
      private_key: "secret-key",
    };
    const report = formatPlayPlan(plan, injected);
    expect(report.includes("=== fa (create) ===")).toBe(true);
    expect(report.includes("+ دفتر")).toBe(true);
    expect(report.includes("feature.png sha256=feature-checksum")).toBe(true);
    expect(report.includes("secret-")).toBe(false);
    expect(report.includes("private_key")).toBe(false);
  });

  it("detects absent locales, changed copy, and mismatched image checksums", () => {
    expect(playParityErrors(plan, baseline)).toEqual(["fa: missing listing"]);
    const remote = {
      ...baseline,
      listings: [
        {
          ...after,
          images: {
            phoneScreenshots: [{ id: "1", url: "public", sha256: "checksum" }],
            featureGraphic: [
              { id: "2", url: "public", sha256: "feature-checksum" },
            ],
          },
        },
      ],
    };
    expect(playParityErrors(plan, remote)).toEqual([]);
    remote.listings[0].title = "changed";
    remote.listings[0].images.phoneScreenshots[0].sha256 = "different";
    expect(playParityErrors(plan, remote)).toEqual([
      "fa: title differs",
      "fa: phoneScreenshots count, order, or checksum differs",
    ]);
    expect(playBaselineDigest(remote) === playBaselineDigest(baseline)).toBe(
      false,
    );
    expect(playBaselineDigest(remote)).toBe(
      playBaselineDigest({ ...remote, capturedAt: "later" }),
    );
  });
});
