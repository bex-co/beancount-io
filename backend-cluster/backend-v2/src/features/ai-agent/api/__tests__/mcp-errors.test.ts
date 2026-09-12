import {
  envelopeFromThrown,
  splitToolFailure,
  JSON_RPC_FORBIDDEN,
  JSON_RPC_INVALID_PARAMS,
  JSON_RPC_NOT_FOUND,
  JSON_RPC_SERVER_ERROR,
  jsonRpcCodeFor,
  McpResourceFailure,
  renderErrorText,
} from "../mcp-errors";
import {
  BadUserInputError,
  ConfigurationError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
  UnbalancedTransactionError,
} from "@/shared/errors";

/**
 * w2/m28:t003. The audit found four failure dialects in one session; these pin
 * the one that replaced them. Every case asserts both halves an agent uses —
 * the machine code it branches on and the hint it acts on — because a code
 * with a generic hint is only half the fix.
 */
describe("envelopeFromThrown", () => {
  it("carries a DomainError's category as the machine code", () => {
    expect(envelopeFromThrown(new ForbiddenError("nope")).code).toBe(
      "FORBIDDEN",
    );
    expect(
      envelopeFromThrown(new NotFoundError("Ledger", "alice/ghost")).code,
    ).toBe("NOT_FOUND");
    expect(envelopeFromThrown(new ConflictError("Entry", "changed")).code).toBe(
      "CONFLICT",
    );
  });

  it("prefers the error's own hint over the category's", () => {
    const envelope = envelopeFromThrown(
      new ConfigurationError(
        "Object storage is not configured",
        "Set TEMP_ASSETS_AWS_S3_BUCKET (see .env.tmpl)",
      ),
    );
    expect(envelope.code).toBe("CONFIGURATION_ERROR");
    expect(envelope.hint).toBe("Set TEMP_ASSETS_AWS_S3_BUCKET (see .env.tmpl)");
  });

  it("names the next call for the refusals the audit actually hit", () => {
    expect(
      envelopeFromThrown(
        new BadUserInputError("Select a ledger using ledger: owner/name"),
      ).hint,
    ).toMatch(/listLedgers/);
    expect(
      envelopeFromThrown(
        new ForbiddenError(
          "The selected ledger is outside this credential's ledger restriction",
        ),
      ).hint,
    ).toMatch(/pinned to one ledger/);
    expect(
      envelopeFromThrown(
        new ConflictError("Entry", "it has changed since it was loaded"),
      ).hint,
    ).toMatch(/getEntryContext/);
  });

  it("carries retryAfter for a rate-limit refusal", () => {
    const envelope = envelopeFromThrown(new RateLimitedError(42));
    expect(envelope.code).toBe("RATE_LIMITED");
    expect(envelope.retryAfter).toBe(42);
  });

  it("gives an unbalanced transaction the residual in its hint", () => {
    const envelope = envelopeFromThrown(
      new UnbalancedTransactionError("does not balance", "5 USD"),
    );
    expect(envelope.code).toBe("UNBALANCED");
    expect(envelope.hint).toMatch(/5 USD/);
    expect(envelope.hint).toMatch(/allowInvalid/);
  });

  it("reads a plain tool guard's not-found as NOT_FOUND", () => {
    const envelope = envelopeFromThrown(
      new Error("No such file in alice/main: nope.bean"),
    );
    expect(envelope.code).toBe("NOT_FOUND");
    expect(envelope.hint).toMatch(/listLedgerFiles/);
  });

  it("reduces a Zod issue dump to the field that is wrong", () => {
    const issues = JSON.stringify([
      { path: ["entries", 0, "date"], message: "Required" },
    ]);
    const envelope = envelopeFromThrown(new Error(issues));
    expect(envelope.code).toBe("BAD_USER_INPUT");
    expect(envelope.message).toBe("entries.0.date: Required");
  });

  it("falls back to an internal-error envelope rather than throwing", () => {
    const envelope = envelopeFromThrown("a string nobody expected");
    expect(envelope.code).toBe("INTERNAL_SERVER_ERROR");
    expect(envelope.hint).not.toBe("");
  });
});

describe("splitToolFailure", () => {
  it("rebuilds the envelope from what runToolSafely preserved", () => {
    expect(
      splitToolFailure({
        ok: false,
        error: "Rate limit exceeded",
        errorCode: "RATE_LIMITED",
        errorHint: "wait 30s",
        retryAfter: 30,
      }).envelope,
    ).toEqual({
      code: "RATE_LIMITED",
      message: "Rate limit exceeded",
      hint: "wait 30s",
      retryAfter: 30,
    });
  });

  it("still produces a code and hint for a bare string failure", () => {
    const { envelope } = splitToolFailure({
      ok: false,
      error: "No such file in alice/main: nope.bean",
    });
    expect(envelope.code).toBe("NOT_FOUND");
    expect(envelope.hint).toMatch(/listLedgerFiles/);
  });

  /**
   * The carrier fields become the envelope; letting them travel on as loose
   * fields too would put a second, half-shaped error dialect on the wire.
   */
  it("keeps the failure's own payload and drops the carriers", () => {
    const { envelope, rest } = splitToolFailure({
      ok: false,
      error: "PR is no longer open",
      errorCode: "CONFLICT",
      errorHint: "re-read it",
      retryAfter: 5,
      result: { success: false, message: "PR is no longer open" },
    });
    expect(rest).toEqual({
      result: { success: false, message: "PR is no longer open" },
    });
    expect(envelope.code).toBe("CONFLICT");
  });
});

describe("JSON-RPC codes", () => {
  it.each([
    ["BAD_USER_INPUT", JSON_RPC_INVALID_PARAMS],
    ["VALIDATION_FAILED", JSON_RPC_INVALID_PARAMS],
    ["UNBALANCED", JSON_RPC_INVALID_PARAMS],
    ["NOT_FOUND", JSON_RPC_NOT_FOUND],
    ["FORBIDDEN", JSON_RPC_FORBIDDEN],
    ["UNAUTHENTICATED", JSON_RPC_FORBIDDEN],
    ["CONFLICT", JSON_RPC_SERVER_ERROR],
    ["RATE_LIMITED", JSON_RPC_SERVER_ERROR],
  ])("maps %s to %i", (code, expected) => {
    expect(jsonRpcCodeFor(code)).toBe(expected);
  });

  /**
   * The audit reported `MCP error -32602: MCP error -32602: …`. The client's
   * SDK adds one prefix on receipt, so the server must send none — which is
   * why this is a plain Error carrying a numeric `code` and not the SDK's
   * `McpError`, whose constructor stamps the prefix on.
   */
  it("leaves a resource failure's message unprefixed", () => {
    const failure = new McpResourceFailure({
      code: "NOT_FOUND",
      message: "No such file in alice/main: nope.bean",
      hint: "list them first",
    });
    expect(failure.message).toBe("No such file in alice/main: nope.bean");
    expect(failure.message).not.toMatch(/MCP error/);
    expect(failure.code).toBe(JSON_RPC_NOT_FOUND);
    expect(failure.data.hint).toBe("list them first");
  });
});

describe("renderErrorText", () => {
  it("says the same thing as the structured half", () => {
    expect(
      renderErrorText({
        code: "RATE_LIMITED",
        message: "Rate limit exceeded",
        hint: "back off",
        retryAfter: 12,
      }),
    ).toBe("RATE_LIMITED: Rate limit exceeded\nHint: back off\nRetry after: 12s");
  });

  it("omits the retry line when there is nothing to retry after", () => {
    expect(
      renderErrorText({ code: "FORBIDDEN", message: "nope", hint: "ask" }),
    ).toBe("FORBIDDEN: nope\nHint: ask");
  });
});
