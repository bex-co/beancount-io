import "reflect-metadata";
import { FavaApiError } from "@/foundation/fava";
import {
  ForbiddenError,
  OperationNotAllowedError,
  ResourceLimitReachedError,
  UnauthenticatedError,
} from "@/shared/errors";
import { operationNotAllowedFromCause } from "../operation-not-allowed-from-cause";

describe("operationNotAllowedFromCause", () => {
  it("preserves an Error cause's message", () => {
    const error = operationNotAllowedFromCause(
      "update ledger file",
      new Error("pre-receive hook rejected the push"),
    );

    expect(error).toBeInstanceOf(OperationNotAllowedError);
    expect(error.message).toBe(
      "Operation 'update ledger file' not allowed: pre-receive hook rejected the push",
    );
  });

  it("stringifies a non-Error cause", () => {
    const error = operationNotAllowedFromCause(
      "add entries",
      "plain string cause",
    );

    expect(error.message).toBe(
      "Operation 'add entries' not allowed: plain string cause",
    );
  });

  it("falls back to a generic reason for an undefined cause", () => {
    const error = operationNotAllowedFromCause("add entries");

    expect(error.message).toBe(
      "Operation 'add entries' not allowed: request failed",
    );
  });

  it("translates a directive_limit_exceeded FavaApiError into a ResourceLimitReachedError", () => {
    const cause = new FavaApiError(
      "This ledger has reached its free-tier limit of 1000 directives",
      403,
      {
        success: false,
        error: "This ledger has reached its free-tier limit of 1000 directives",
        code: "directive_limit_exceeded",
        details: { limit: 1000, current: 1005 },
      },
    );

    const error = operationNotAllowedFromCause("update ledger file", cause);

    expect(error).toBeInstanceOf(ResourceLimitReachedError);
    // ledger-v2's own wording, not a sentence rebuilt from the numbers. It is
    // what names deleting entries as the way back under the limit, which is
    // exactly what the git proxy's refusal sends the user here to do — a
    // generic "upgrade to continue" would drop the only instruction that works
    // for someone who does not want to pay (w1/m17 t007).
    expect(error.message).toBe(
      "This ledger has reached its free-tier limit of 1000 directives",
    );
  });

  it("falls back to the generic sentence when ledger-v2 sends no message", () => {
    const cause = new FavaApiError("", 403, {
      success: false,
      error: "",
      code: "directive_limit_exceeded",
      details: { limit: 1000, current: 1005 },
    });

    const error = operationNotAllowedFromCause("update ledger file", cause);

    expect(error).toBeInstanceOf(ResourceLimitReachedError);
    expect(error.message).toBe(
      "directives limit reached. Maximum: 1000, Current: 1005. Upgrade to Premium or a higher plan to continue.",
    );
  });

  it("preserves an upstream authentication failure", () => {
    const cause = new FavaApiError("Missing authorization header", 401, {
      success: false,
      error: "Missing authorization header",
    });

    const error = operationNotAllowedFromCause("update ledger file", cause);

    expect(error).toBeInstanceOf(UnauthenticatedError);
  });

  it("falls back to OperationNotAllowedError when details are malformed", () => {
    const cause = new FavaApiError("bad details", 403, {
      success: false,
      error: "bad details",
      code: "directive_limit_exceeded",
      details: { limit: "not-a-number", current: 1005 } as unknown as Record<
        string,
        number
      >,
    });

    const error = operationNotAllowedFromCause("update ledger file", cause);

    expect(error).toBeInstanceOf(ForbiddenError);
  });
});
