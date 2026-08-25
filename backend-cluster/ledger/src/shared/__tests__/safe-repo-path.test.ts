import { BadUserInputError } from "@/shared/errors";
import { assertSafeRepoPath, toSafeRepoUrlPath } from "@/shared/safe-repo-path";
import { assertSafeArchiveName } from "@/shared/safe-archive-name";

describe("safe repository URL paths", () => {
  it("encodes each legitimate path segment", () => {
    expect(toSafeRepoUrlPath("reports/Q1 #draft.bean")).toBe(
      "reports/Q1%20%23draft.bean",
    );
  });

  it.each([
    "",
    "/main.bean",
    "dir//main.bean",
    "./main.bean",
    "../private/main.bean",
    "dir/../../private/main.bean",
    "dir\\main.bean",
    "dir/\0main.bean",
  ])("rejects unsafe path %p", (path) => {
    expect(() => assertSafeRepoPath(path)).toThrow(BadUserInputError);
  });

  it("double-encodes a percent-encoded traversal so it remains a filename", () => {
    expect(toSafeRepoUrlPath("%2e%2e/private.bean")).toBe(
      "%252e%252e/private.bean",
    );
  });
});

describe("safe archive names", () => {
  it.each(["zip", "tar.gz", "gitea-main.zip"])("accepts %p", (archive) => {
    expect(() => assertSafeArchiveName(archive)).not.toThrow();
  });

  it.each(["", ".", "..", "../private", "a/b", "a%2fb", "a?ref=main"])(
    "rejects %p",
    (archive) => {
      expect(() => assertSafeArchiveName(archive)).toThrow(BadUserInputError);
    },
  );
});
