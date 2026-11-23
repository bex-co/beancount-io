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
