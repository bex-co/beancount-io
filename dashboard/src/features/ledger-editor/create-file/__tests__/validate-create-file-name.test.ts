import {
  createFileNameIssue,
  isSafeCreateFilePath,
} from "../validate-create-file-name";

describe("isSafeCreateFilePath", () => {
  it("accepts ordinary and nested filenames", () => {
    expect(isSafeCreateFilePath("notes.bean")).toBe(true);
    expect(isSafeCreateFilePath("a/b/c.bean")).toBe(true);
  });

  it.each([
    ".git",
    ".git/config",
    "folder/.git/hooks/pre-commit",
    "folder/.GiT/config",
  ])("rejects reserved repository metadata segment in %s", (path) => {
    expect(isSafeCreateFilePath(path)).toBe(false);
  });

  it("preserves ordinary dotfiles and legitimate spaces in path segments", () => {
    for (const path of [
      ".gitignore",
      ".gitmodules",
      ".github/workflows/check.yml",
      "bank exports/monthly report.bean",
      "帳簿/給与 明細.bean",
    ]) {
      expect(isSafeCreateFilePath(path)).toBe(true);
    }
  });

  it("rejects empty, traversal, and backslash paths", () => {
    expect(isSafeCreateFilePath("")).toBe(false);
    expect(isSafeCreateFilePath("../evil.bean")).toBe(false);
    expect(isSafeCreateFilePath("/etc/passwd")).toBe(false);
    expect(isSafeCreateFilePath("a\\b.bean")).toBe(false);
    expect(isSafeCreateFilePath("a/./b.bean")).toBe(false);
    expect(isSafeCreateFilePath("a/../b.bean")).toBe(false);
  });
});

describe("createFileNameIssue", () => {
  it.each(["a//b.bean", "dir/", "/notes.bean"])(
    "identifies the empty folder segment in %s separately from traversal",
    (filename) => {
      expect(createFileNameIssue(filename, [])).toBe("emptySegment");
    },
  );

  it.each(["./notes.bean", "a/./b.bean", "a/../b.bean"])(
    "keeps the unsafe-path issue for dot segment in %s",
    (filename) => {
      expect(createFileNameIssue(filename, [])).toBe("unsafe");
    },
  );

  it("identifies complete .git segments after trimming without blocking similarly named files", () => {
    for (const filename of [
      " .git/config ",
      "nested/.GiT/hooks/config",
      ".git",
    ]) {
      expect(createFileNameIssue(filename, [])).toBe("git");
    }
    for (const filename of [
      " .gitignore ",
      ".gitmodules",
      ".github/workflows/check.yml",
      "folder/git.bean",
    ]) {
      expect(createFileNameIssue(filename, [])).toBeNull();
    }
  });

  it.each([".git", "nested/.git", ".git/hooks", "nested/.GIT/hooks"])(
    "checks the full joined target when the current directory is %s",
    (dirPath) => {
      expect(createFileNameIssue("safe.bean", [], dirPath)).toBe("git");
    },
  );

  it("checks non-reserved invalid segments in the current directory too", () => {
    expect(createFileNameIssue("notes.bean", [], "reports/")).toBe(
      "emptySegment",
    );
    expect(createFileNameIssue("notes.bean", [], "reports/../private")).toBe(
      "unsafe",
    );
    expect(createFileNameIssue("notes.bean", [], "reports\\nested")).toBe(
      "unsafe",
    );
    expect(createFileNameIssue("notes.bean", [], "reports\0nested")).toBe(
      "unsafe",
    );
  });

  it("checks collisions against the trimmed name while preserving internal spaces and nested targets", () => {
    expect(createFileNameIssue(" \tmain.bean\r\n", ["main.bean"])).toBe(
      "exists",
    );
    expect(
      createFileNameIssue(
        " monthly report.bean ",
        ["monthly report.bean"],
        "bank exports",
      ),
    ).toBe("exists");
    expect(
      createFileNameIssue(
        " new report.bean ",
        ["main.bean"],
        "bank exports/2026",
      ),
    ).toBeNull();
    expect(createFileNameIssue(" nested/main.bean ", ["main.bean"])).toBeNull();
    expect(createFileNameIssue("   ", ["main.bean"], "bank exports")).toBe(
      "empty",
    );
  });

  it("waits on an unknown listing only where a clash is possible (w4/1036)", () => {
    expect(createFileNameIssue("main.bean", null)).toBe("unchecked");
    expect(createFileNameIssue("reports/main.bean", null)).toBeNull();
    expect(createFileNameIssue("../evil.bean", null)).toBe("unsafe");
    expect(createFileNameIssue("   ", null)).toBe("empty");
  });

  it("reports empty, unsafe, and colliding names", () => {
    expect(createFileNameIssue("   ", ["main.bean"])).toBe("empty");
    expect(createFileNameIssue("../evil.bean", ["main.bean"])).toBe("unsafe");
    expect(createFileNameIssue("main.bean", ["main.bean"])).toBe("exists");
    expect(createFileNameIssue("notes.bean", ["main.bean"])).toBe(null);
    expect(createFileNameIssue("a/b/c.bean", ["main.bean"])).toBe(null);
  });
});
