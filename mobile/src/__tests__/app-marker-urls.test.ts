import fs from "fs";
import path from "path";
import { withAppMarker } from "../common/site-url";

const SRC = path.join(__dirname, "..");
const OPENS_A_URL = /(?:openBrowserAsync|Linking\.openURL)\(([\s\S]{0,120})/g;

/** What may open without the marker, and why it needs none. */
const NOT_OUR_PAGES: readonly [file: string, argument: RegExp][] = [
  ["screens/profile/profile-screen.tsx", /^"https:\/\/gravatar\.com\/"/],
  // The store's own review page, passed in by `openReviewPage`.
  ["screens/setting/main-content.tsx", /^url\)/],
];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return /^(__tests__|generated-graphql|translations)$/.test(entry.name)
        ? []
        : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const unmarked = () =>
  sourceFiles(SRC).flatMap((file) => {
    const relative = path.relative(SRC, file);
    const text = fs.readFileSync(file, "utf8");
    return [...text.matchAll(OPENS_A_URL)]
      .map((match) => match[1].trimStart())
      .filter(
        (argument) =>
          !argument.startsWith("withAppMarker(") &&
          // A value marked just above the call.
          !/^browserUrl\)/.test(argument) &&
          !NOT_OUR_PAGES.some(
            ([allowed, pattern]) =>
              allowed === relative && pattern.test(argument),
          ),
      )
      .map((argument) => `${relative}: ${argument.slice(0, 40)}`);
  });

describe("every page the app opens (ADR 001 D14)", () => {
  it("carries the marker that keeps billing off it", () => {
    expect(unmarked()).toEqual([]);
  });

  it("finds the calls it is guarding", () => {
    const calls = sourceFiles(SRC).flatMap((file) => [
      ...fs.readFileSync(file, "utf8").matchAll(OPENS_A_URL),
    ]);

    expect(calls.length >= 8).toBe(true);
  });
});

describe("withAppMarker", () => {
  const cases: readonly [string, string][] = [
    [
      "https://beancount.io/ledger/a/b",
      "https://beancount.io/ledger/a/b?beancount_app=1",
    ],
    [
      "https://beancount.io/a?x=1",
      "https://beancount.io/a?x=1&beancount_app=1",
    ],
    [
      "https://beancount.io/a#top",
      "https://beancount.io/a?beancount_app=1#top",
    ],
    ["https://beancount.io", "https://beancount.io?beancount_app=1"],
    [
      "https://www.beancount.io/b",
      "https://www.beancount.io/b?beancount_app=1",
    ],
    [
      "https://beancount.io/a?beancount_app=1",
      "https://beancount.io/a?beancount_app=1",
    ],
  ];
  for (const [url, marked] of cases) {
    it(`marks ${url}`, () => {
      expect(withAppMarker(url)).toBe(marked);
    });
  }

  for (const url of [
    "https://gravatar.com/",
    "https://notbeancount.io/a",
    "https://beancount.io.example.com/a",
    "https://ledger.example.com/ledger/a/b",
    "mailto:support@beancount.io",
  ]) {
    it(`leaves ${url} alone`, () => {
      expect(withAppMarker(url)).toBe(url);
    });
  }
});
