import { BadUserInputError, ErrorCategory } from "@/shared/errors";
import { assertCommitRef } from "@/shared/commit-ref";

describe("assertCommitRef", () => {
  // Each of these resolved, or was answered NOT_FOUND, on the hosted
  // repository before the check existed; none may change (w31/024).
  it.each([
    "main",
    "b6d69fd",
    "0000000000000000000000000000000000000000",
    "HEAD~1",
    "main^",
    "main^{commit}",
    "refs/heads/main",
    "feature/café",
    "x:y",
    "main:main.bean",
    "main:/restore",
    "..",
    "-n",
    "日本",
    "tab\there",
    "b6d69fd\n",
    "main ",
    // A space inside a `@{…}` / `^{…}` group or after a leading `:/` is git
    // commit-revision syntax (w31/024, w31/061).
    "main@{1 day ago}",
    "main@{2026-11-15 10:00:00}",
    "main^{/restore fixture}",
    ":/restore fixture",
  ])("leaves %p to the repository host", (ref) => {
    expect(() => assertCommitRef(ref, "sha")).not.toThrow();
  });

  it.each([
    "main ",
    " b6d69fd",
    "b6d69fd ",
    "a b",
    " ",
    "main ~1",
    " :/restore fixture",
    "main@{1 day ago} ",
    "main@{1 day",
    // Bare `{…}` groups and colons other than a leading `:/` are not valid
    // commit-revision space contexts (w31/061).
    "main{ }",
    "{ }",
    "foo{a b}",
    ": ",
    "main: ",
    "main:path with space.bean",
    "main:/restore fixture",
    ":@{a}/restore fixture",
  ])("refuses %p before the host is asked", (ref) => {
    let thrown: unknown;
    try {
      assertCommitRef(ref, "branchName");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(BadUserInputError);
    expect(thrown).toMatchObject({
      category: ErrorCategory.BAD_USER_INPUT,
      metadata: { field: "branchName", hint: expect.any(String) },
    });
    expect((thrown as Error).message).toMatch(/^branchName /);
  });
});
