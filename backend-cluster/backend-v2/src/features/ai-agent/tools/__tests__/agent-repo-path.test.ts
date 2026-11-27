import {
  normalizeAgentDirPath,
  normalizeAgentRepoPath,
} from "../agent-repo-path";

describe("normalizeAgentRepoPath", () => {
  it("strips leading './' prefixes from repo-relative paths", () => {
    expect(normalizeAgentRepoPath("./main.bean")).toBe("main.bean");
    expect(normalizeAgentRepoPath("././imports/2026.bean")).toBe(
      "imports/2026.bean",
    );
  });

  it("leaves canonical paths unchanged", () => {
    expect(normalizeAgentRepoPath("main.bean")).toBe("main.bean");
    expect(normalizeAgentRepoPath("imports/2026.bean")).toBe(
      "imports/2026.bean",
    );
    expect(normalizeAgentRepoPath(".hidden")).toBe(".hidden");
  });

  it("leaves unsafe or empty paths for the service boundary to refuse", () => {
    expect(normalizeAgentRepoPath("")).toBe("");
    expect(normalizeAgentRepoPath(".")).toBe(".");
    expect(normalizeAgentRepoPath("./")).toBe("");
    expect(normalizeAgentRepoPath("/main.bean")).toBe("/main.bean");
    expect(normalizeAgentRepoPath("..")).toBe("..");
    expect(normalizeAgentRepoPath("../main.bean")).toBe("../main.bean");
    expect(normalizeAgentRepoPath("./../main.bean")).toBe("../main.bean");
    expect(normalizeAgentRepoPath(".\\main.bean")).toBe(".\\main.bean");
  });
});

describe("normalizeAgentDirPath", () => {
  it.each([undefined, ".", "./", "./.", "././", "././."])(
    "normalizes current-directory spelling %p to undefined (repository root)",
    (input) => {
      expect(normalizeAgentDirPath(input)).toBeUndefined();
    },
  );

  it("strips leading './' prefixes from subdirectory paths", () => {
    expect(normalizeAgentDirPath("./imports")).toBe("imports");
    expect(normalizeAgentDirPath("././imports/2026")).toBe("imports/2026");
    expect(normalizeAgentDirPath("imports")).toBe("imports");
  });

  // w31/137: `ls -F` and shell completion print a folder as `Reports/`.
  it.each([
    ["Reports/", "Reports"],
    ["./Reports/", "Reports"],
    ["imports/2026/", "imports/2026"],
    [".hidden/", ".hidden"],
    ["..x/", "..x"],
  ])("drops the one trailing '/' of %p", (input, expected) => {
    expect(normalizeAgentDirPath(input)).toBe(expected);
  });

  it.each(["Reports//", "a/./", "a/../", "/"])(
    "leaves %p, which is not a folder name and a '/', for refusal",
    (input) => {
      expect(normalizeAgentDirPath(input)).toBe(input);
    },
  );

  it("keeps a trailing '/' on file paths, which name no folder", () => {
    expect(normalizeAgentRepoPath("main.bean/")).toBe("main.bean/");
  });

  it("preserves explicit empty and unsafe directory paths for refusal", () => {
    expect(normalizeAgentDirPath("")).toBe("");
    expect(normalizeAgentDirPath("/")).toBe("/");
    expect(normalizeAgentDirPath(".//")).toBe("/");
    expect(normalizeAgentDirPath("..")).toBe("..");
    expect(normalizeAgentDirPath("../")).toBe("../");
    expect(normalizeAgentDirPath("./..")).toBe("..");
    expect(normalizeAgentDirPath("./../imports")).toBe("../imports");
    expect(normalizeAgentDirPath(".\\")).toBe(".\\");
  });
});
