import {
  createFileNameIssue,
  isSafeCreateFilePath,
} from "../validate-create-file-name";

describe("isSafeCreateFilePath", () => {
  it("accepts ordinary and nested filenames", () => {
    expect(isSafeCreateFilePath("notes.bean")).toBe(true);
    expect(isSafeCreateFilePath("a/b/c.bean")).toBe(true);
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
  it("reports empty, unsafe, and colliding names", () => {
    expect(createFileNameIssue("   ", ["main.bean"])).toBe("empty");
    expect(createFileNameIssue("../evil.bean", ["main.bean"])).toBe("unsafe");
    expect(createFileNameIssue("main.bean", ["main.bean"])).toBe("exists");
    expect(createFileNameIssue("notes.bean", ["main.bean"])).toBe(null);
    expect(createFileNameIssue("a/b/c.bean", ["main.bean"])).toBe(null);
  });
});
