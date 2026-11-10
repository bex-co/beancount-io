import { BadUserInputError } from "@/shared/errors";
import { resolveCommitMessage } from "../commit-message-alias";

// w23/m3/t002: the one commit-message spelling rule.
describe("resolveCommitMessage", () => {
  it("accepts either spelling", () => {
    expect(resolveCommitMessage({ description: "a" }, { required: true })).toBe(
      "a",
    );
    expect(resolveCommitMessage({ message: "b" }, { required: true })).toBe(
      "b",
    );
  });

  it("accepts both spellings when they agree", () => {
    expect(
      resolveCommitMessage(
        { description: "a", message: "a" },
        { required: true },
      ),
    ).toBe("a");
  });

  it("treats null like undefined", () => {
    expect(
      resolveCommitMessage(
        { description: null, message: "b" },
        { required: false },
      ),
    ).toBe("b");
  });

  it("refuses two different texts instead of guessing", () => {
    expect(() =>
      resolveCommitMessage(
        { description: "a", message: "b" },
        { required: true },
      ),
    ).toThrow(BadUserInputError);
  });

  // w1/212: a blank message wrote a blank commit, and "" defaulted
  // differently on MCP and REST.
  it.each(["", "   ", "\n\t"])("treats %j as omitted", (blank) => {
    expect(
      resolveCommitMessage({ description: blank }, { required: false }),
    ).toBeUndefined();
    expect(() =>
      resolveCommitMessage({ message: blank }, { required: true }),
    ).toThrow(BadUserInputError);
    // A blank twin is no second text to conflict with.
    expect(
      resolveCommitMessage(
        { description: blank, message: "b" },
        { required: true },
      ),
    ).toBe("b");
  });

  it("keeps a message's own whitespace when it has text", () => {
    expect(
      resolveCommitMessage({ message: "  Move files  " }, { required: true }),
    ).toBe("  Move files  ");
  });

  it("requires one spelling on MCP, leaves REST/GraphQL optional", () => {
    expect(() => resolveCommitMessage({}, { required: true })).toThrow(
      BadUserInputError,
    );
    expect(resolveCommitMessage({}, { required: false })).toBeUndefined();
  });

  // w23/220: git cannot store U+0000 in a commit message, so the commit
  // answered 503 while dry_run accepted it.
  it.each([
    ["description", { description: "qa a\u0000b" }],
    ["message", { message: "qa a\u0000b" }],
  ])("refuses a NUL in %s, naming it", (field, input) => {
    expect(() => resolveCommitMessage(input, { required: false })).toThrow(
      expect.objectContaining({
        constructor: BadUserInputError,
        message: expect.stringContaining(field),
      }),
    );
  });

  it("keeps other control characters and unicode in a message", () => {
    expect(
      resolveCommitMessage({ message: "tab\té 账本" }, { required: true }),
    ).toBe("tab\té 账本");
  });
});
