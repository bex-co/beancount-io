import { BadUserInputError } from "@/shared/errors";
import { assertSafeRepoPath } from "@/features/ledger/utils/safe-repo-path";
import { assertSafeArchiveName } from "@/features/ledger/api/rest/safe-archive-name";

describe("repository path validation", () => {
  it.each(["main.bean", "accounts/2026.bean", "Q1 #draft.bean"])(
    "accepts %p",
    (path) => expect(() => assertSafeRepoPath(path)).not.toThrow(),
  );

  it.each([
    "",
    "/main.bean",
    "dir//main.bean",
    "./main.bean",
    "../private/main.bean",
    "dir/../../private/main.bean",
    "dir\\main.bean",
    "dir/\0main.bean",
  ])("rejects %p", (path) => {
    expect(() => assertSafeRepoPath(path)).toThrow(BadUserInputError);
  });
});

describe("archive name validation", () => {
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
