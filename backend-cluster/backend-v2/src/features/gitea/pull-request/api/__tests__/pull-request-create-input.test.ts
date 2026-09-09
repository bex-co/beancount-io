import { pullRequestCreateInput } from "../pull-request-routes";

/**
 * The create contract REST and MCP share: `pullRequestToolInput` re-parses
 * its payload through this schema, so the default below is the reason
 * `managePullRequests` create works without `baseBranch` on both surfaces
 * (GraphQL applies its own `defaultValue: "main"`).
 */
describe("pullRequestCreateInput", () => {
  const base = {
    title: "Test PR",
    description: "Test description",
    clearCommitMessage: "Add test file",
    changes: [{ path: "test.txt", content: "Hello World" }],
  };

  it("defaults an omitted baseBranch to main", () => {
    expect(pullRequestCreateInput.parse(base).baseBranch).toBe("main");
  });

  it("keeps an explicit baseBranch", () => {
    expect(
      pullRequestCreateInput.parse({ ...base, baseBranch: "feature/x" })
        .baseBranch,
    ).toBe("feature/x");
  });

  it("refuses empty title, description, and commit message", () => {
    expect(() =>
      pullRequestCreateInput.parse({ ...base, title: "" }),
    ).toThrow("title must not be empty");
    expect(() =>
      pullRequestCreateInput.parse({ ...base, description: "" }),
    ).toThrow("description must not be empty");
    expect(() =>
      pullRequestCreateInput.parse({ ...base, clearCommitMessage: "" }),
    ).toThrow("clearCommitMessage must not be empty");
  });
});
