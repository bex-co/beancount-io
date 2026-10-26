import { BadUserInputError } from "@/shared/errors";
import { resolveCommitMessage } from "../commit-message-alias";

// w23/m3/t002: the one commit-message spelling rule.
describe("resolveCommitMessage", () => {
  it("accepts either spelling", () => {
    expect(
      resolveCommitMessage({ description: "a" }, { required: true }),
    ).toBe("a");
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

  it("requires one spelling on MCP, leaves REST/GraphQL optional", () => {
    expect(() =>
      resolveCommitMessage({}, { required: true }),
    ).toThrow(BadUserInputError);
    expect(resolveCommitMessage({}, { required: false })).toBeUndefined();
  });
});
