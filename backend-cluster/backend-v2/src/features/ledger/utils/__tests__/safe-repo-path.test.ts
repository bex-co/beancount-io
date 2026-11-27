import { BadUserInputError } from "@/shared/errors";
import {
  assertPortableRepoPath,
  assertSafeRepoPath,
  encodeRepoPath,
} from "@/features/ledger/utils/safe-repo-path";
import {
  archiveRef,
  assertSafeArchiveName,
} from "@/features/ledger/utils/safe-archive-name";

describe("repository path validation", () => {
  it.each([
    "main.bean",
    "accounts/2026.bean",
    "Q1 #draft.bean",
    ".gitignore",
    ".github/workflows/check.yml",
    ".gitx/notes.bean",
    "sub/.git.bean",
  ])("accepts %p", (path) =>
    expect(() => assertSafeRepoPath(path)).not.toThrow(),
  );

  // Gitea refuses a `.git` component anywhere; a listing reported it as an
  // outage and a dry run previewed a commit that could not happen (w23/027).
  it.each([".git", ".Git", ".GIT/config", "sub/.git", ".git/objects/x.bean"])(
    "refuses %p, which is inside .git",
    (path) => {
      expect(() => assertSafeRepoPath(path, "dirPath")).toThrow(
        expect.objectContaining({
          message: `File path ${JSON.stringify(path)} is inside .git, which can't be read or written`,
          metadata: expect.objectContaining({ field: "dirPath" }),
        }),
      );
    },
  );

  it("refuses an empty path without quoting it", () => {
    expect(() => assertSafeRepoPath("", "newPath")).toThrow(
      expect.objectContaining({
        message: "File path must not be empty",
        metadata: expect.objectContaining({ field: "newPath" }),
      }),
    );
  });

  // w31/137: MCP carries the message but not the field, so a bare "Invalid
  // file path" left an agent with two or three paths unable to tell which
  // was wrong. Each rule quotes the value and says what to change.
  it.each([
    ["/main.bean", '"/main.bean" starts with "/"'],
    ["Reports/", '"Reports/" ends with "/": remove the trailing "/"'],
    ["main.bean/", '"main.bean/" ends with "/"'],
    ["x//y.bean", '"x//y.bean" has an empty part: remove the doubled "/"'],
    ["./main.bean", '"./main.bean" has a "." or ".." part'],
    ["qa/./main.bean", '"qa/./main.bean" has a "." or ".." part'],
    ["../private/main.bean", '"../private/main.bean" has a "." or ".." part'],
    ["dir/../../private/main.bean", 'has a "." or ".." part'],
    [
      "dir\\main.bean",
      '"dir\\\\main.bean" uses "\\": separate folders with "/"',
    ],
    ["dir/\0main.bean", '"dir/\\u0000main.bean" contains a NUL (U+0000)'],
  ])("refuses %j, quoting it and naming the rule", (path, rule) => {
    let thrown: unknown;
    try {
      assertSafeRepoPath(path, "oldPath");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(BadUserInputError);
    expect(thrown).toMatchObject({
      category: "BAD_USER_INPUT",
      message: expect.stringMatching(/^File path "/),
      metadata: { field: "oldPath" },
    });
    expect((thrown as Error).message).toContain(rule);
  });
});

describe("archive name validation", () => {
  it.each(["main.zip", "v1.0.tar.gz", "gitea-main.zip"])(
    "accepts %p",
    (archive) => {
      expect(() => assertSafeArchiveName(archive)).not.toThrow();
    },
  );

  // Gitea refuses these upstream; they were reported as an outage (w23/003).
  it.each(["main", "main.rar", "main.tar", "zip", "tar.gz", "main.bundle"])(
    "refuses %p, which names no supported format",
    (archive) => {
      expect(() => assertSafeArchiveName(archive)).toThrow(
        /\.zip or \.tar\.gz/,
      );
    },
  );

  it.each([
    ["main.zip", "main"],
    ["v1.0.tar.gz", "v1.0"],
    ["release.zip.tar.gz", "release.zip"],
  ])("reads the reference of %p as %p", (archive, ref) => {
    expect(archiveRef(archive)).toBe(ref);
  });

  it.each(["", ".", "..", "../private", "a/b", "a%2fb", "a?ref=main"])(
    "rejects %p",
    (archive) => {
      expect(() => assertSafeArchiveName(archive)).toThrow(BadUserInputError);
    },
  );
});

// w23/054: names a new file must not take — they broke Windows clones,
// spoofed file lists, or could not be written in an include.
describe("portable paths for new files", () => {
  it.each([
    ["qa\nx.bean", "control character"],
    ["qa\tx.bean", "control character"],
    ["qa\u001bx.bean", "control character"],
    ["qa\u2028x.bean", "control character"],
    ["qa\u202ex.bean", "bidirectional"],
    ["a:b.bean", "Windows cannot store"],
    ["q?.bean", "Windows cannot store"],
    ['say"hi".bean', "Windows cannot store"],
    ["CON", "device name"],
    ["aux.bean", "device name"],
    ["dir/NUL.bean", "device name"],
    ["Lpt9.txt", "device name"],
    ["qa-x./y.bean", "ending in a dot or a space"],
    ["qa-x /y.bean", "ending in a dot or a space"],
    [`${"x".repeat(252)}.bean`, "longer than 255 bytes"],
  ])("refuses %j: %s", (path, rule) => {
    expect(() => assertPortableRepoPath(path, "path")).toThrow(rule);
  });

  it.each([
    "main.bean",
    "2026/imports.bean",
    ".gitignore",
    "Café.bean",
    "Cafe\u0301.bean",
    "资产.bean",
    "auxiliary.bean",
    "my file.bean",
  ])("accepts %j, NFC and NFD alike", (path) => {
    expect(() => assertPortableRepoPath(path)).not.toThrow();
  });

  it("leaves reads of an existing odd name to the safe-path rule", () => {
    expect(() => assertSafeRepoPath("aux.bean")).not.toThrow();
  });
});

describe("encodeRepoPath", () => {
  it.each([
    ["main.bean", "main.bean"],
    ["100%.bean", "100%25.bean"],
    ["main.bean#probe", "main.bean%23probe"],
    ["main.bean#aux?bad", "main.bean%23aux%3Fbad"],
    ["dir%1/sub#2/my file.bean", "dir%251/sub%232/my%20file.bean"],
    ["café.bean", "caf%C3%A9.bean"],
  ])("encodes %j as %j while keeping / separators", (raw, encoded) => {
    expect(encodeRepoPath(raw)).toBe(encoded);
  });
});
