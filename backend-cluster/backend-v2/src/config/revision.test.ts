import {
  parseRevision,
  publishedRevision,
  shortRevision,
  UNKNOWN_REVISION,
} from "./revision";

const SHA = "2144cdbb2e6f0a1b3c4d5e6f708192a3b4c5d6e7";
const OTHER_SHA = "57d7aaa13f0123456789abcdef0123456789abcd";

describe("parseRevision", () => {
  it("reads BEANCOUNT_REVISION", () => {
    expect(parseRevision({ BEANCOUNT_REVISION: SHA })).toBe(SHA);
  });

  it("falls back to RENDER_GIT_COMMIT, which the platform sets at runtime", () => {
    expect(parseRevision({ RENDER_GIT_COMMIT: SHA })).toBe(SHA);
  });

  it("prefers BEANCOUNT_REVISION when both are valid", () => {
    expect(
      parseRevision({
        BEANCOUNT_REVISION: SHA,
        RENDER_GIT_COMMIT: OTHER_SHA,
      }),
    ).toBe(SHA);
  });

  it("is `unknown` when nothing is set", () => {
    expect(parseRevision({})).toBe(UNKNOWN_REVISION);
    expect(parseRevision({})).toBe("unknown");
  });

  it.each([
    ["the literal unknown", "unknown"],
    ["an empty string", ""],
    ["whitespace only", "   "],
    ["free text", "latest"],
    ["a branch name", "main"],
    ["six characters, one short of a short sha", "abcdef"],
    ["forty-one characters, one past a full sha", `${SHA}0`],
    ["non-hex letters", "2144cdbz2e6f0a1"],
    ["text around a sha", `v1-${SHA}`],
    ["an injected newline", `${SHA}\nx-injected: 1`],
  ])("counts %s as unset", (_label, value) => {
    expect(parseRevision({ BEANCOUNT_REVISION: value })).toBe("unknown");
    expect(parseRevision({ RENDER_GIT_COMMIT: value })).toBe("unknown");
  });

  it("does not let an invalid first source shadow a valid second one", () => {
    // A Dockerfile default of `unknown` must not hide the platform's commit.
    expect(
      parseRevision({
        BEANCOUNT_REVISION: "unknown",
        RENDER_GIT_COMMIT: SHA,
      }),
    ).toBe(SHA);
    expect(
      parseRevision({ BEANCOUNT_REVISION: "", RENDER_GIT_COMMIT: SHA }),
    ).toBe(SHA);
  });

  it("lowercases the value and trims surrounding whitespace", () => {
    expect(
      parseRevision({ BEANCOUNT_REVISION: `  ${SHA.toUpperCase()}\n` }),
    ).toBe(SHA);
  });

  it("accepts a short sha of seven characters and a full one of forty", () => {
    expect(parseRevision({ BEANCOUNT_REVISION: "2144cdb" })).toBe("2144cdb");
    expect(parseRevision({ BEANCOUNT_REVISION: SHA })).toHaveLength(40);
  });
});

describe("publishedRevision", () => {
  it("passes a value parseRevision would accept", () => {
    expect(publishedRevision(SHA)).toBe(SHA);
    expect(publishedRevision("2144cdb")).toBe("2144cdb");
  });

  it.each([
    ["no value", undefined],
    ["unknown", "unknown"],
    ["an empty string", ""],
    ["free text", "<script>alert(1)</script>"],
    [
      "upper case, which parseRevision would already have lowercased",
      SHA.toUpperCase(),
    ],
    ["a short value", "abc"],
  ])(
    "answers unknown for %s, so a surface never prints it",
    (_label, value) => {
      expect(publishedRevision(value)).toBe("unknown");
    },
  );
});

describe("shortRevision", () => {
  it("is the first seven characters of a known revision", () => {
    expect(shortRevision(SHA)).toBe("2144cdb");
    expect(shortRevision("2144cdb")).toBe("2144cdb");
  });

  it("is undefined when the revision is not known", () => {
    expect(shortRevision(undefined)).toBeUndefined();
    expect(shortRevision("unknown")).toBeUndefined();
    expect(shortRevision("main")).toBeUndefined();
  });
});
