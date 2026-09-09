import { describe, expect, it } from "vitest";
import { getDiffFileId, parseDiffFileId } from "../diff-file-id";

describe("diff-file-id", () => {
  it("round-trips filenames that need encoding", () => {
    const filename = "FY2027/FY2027Q2.bean";
    expect(getDiffFileId(filename)).toBe("diff-file-FY2027%2FFY2027Q2.bean");
    expect(parseDiffFileId(getDiffFileId(filename))).toBe(filename);
    expect(parseDiffFileId(`#${getDiffFileId(filename)}`)).toBe(filename);
  });

  it("rejects malformed ids", () => {
    expect(parseDiffFileId("")).toBeNull();
    expect(parseDiffFileId("#section")).toBeNull();
    expect(parseDiffFileId("diff-file-%E0%A4%A")).toBeNull();
  });
});
