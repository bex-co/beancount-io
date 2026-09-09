import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { mcpToolErrorText } from "../composition-root";
import {
  BadUserInputError,
  ConfigurationError,
  InternalServerError,
} from "@/shared/errors";

describe("mcpToolErrorText", () => {
  it("appends a DomainError metadata hint for the agent to act on", () => {
    expect(
      mcpToolErrorText(
        new ConfigurationError(
          "Object storage is not configured on this deployment",
          "Set TEMP_ASSETS_AWS_S3_BUCKET (see .env.tmpl)",
        ),
      ),
    ).toBe(
      "Object storage is not configured on this deployment\nHint: Set TEMP_ASSETS_AWS_S3_BUCKET (see .env.tmpl)",
    );
  });

  it("leaves errors without a hint untouched", () => {
    expect(mcpToolErrorText(new BadUserInputError("No such user: ghost"))).toBe(
      "No such user: ghost",
    );
    expect(mcpToolErrorText(new InternalServerError("boom"))).toBe("boom");
    expect(mcpToolErrorText(new Error("plain"))).toBe("plain");
    expect(mcpToolErrorText("string failure")).toBe("Tool execution failed");
  });
});
