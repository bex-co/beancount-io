import { resolveMcpLedger } from "../mcp-context";
import {
  envelopeFromThrown,
  maskingFor,
  splitToolFailure,
  JSON_RPC_FORBIDDEN,
  JSON_RPC_INVALID_PARAMS,
  JSON_RPC_NOT_FOUND,
  JSON_RPC_SERVER_ERROR,
  jsonRpcCodeFor,
  McpRequestFailure,
  renderErrorText,
} from "../mcp-errors";
import { favaApiErrorToDomainError } from "@/foundation/fava/error-to-domain";
import { FavaApiError } from "@/foundation/fava/api-client";
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
        "Set TEMP_ASSETS_AWS_S3_BUCKET (see .env.example)",
      ),
    );
    expect(envelope.code).toBe("CONFIGURATION_ERROR");
    expect(envelope.hint).toBe(
      "Set TEMP_ASSETS_AWS_S3_BUCKET (see .env.example)",
    );
  });

  it("names the next call for the refusals the audit actually hit", () => {
    // Thrown for real rather than reconstructed: the hint is the throw site's
    // to declare (w2/013), so a test that built its own error would prove
    // nothing about what `resolveMcpLedger` actually refuses with.
    const unpinned = { identity: { userId: "u" } } as never;
    expect(() => resolveMcpLedger(unpinned)).toThrow();
    try {
      resolveMcpLedger(unpinned);
    } catch (error) {
      expect(envelopeFromThrown(error).hint).toMatch(/listLedgers/);
    }

    const pinned = {
      identity: { userId: "u", ledgerScope: "alice/main" },
    } as never;
    try {
      resolveMcpLedger(pinned, "mallory/secret");
    } catch (error) {
      expect(envelopeFromThrown(error).hint).toMatch(/pinned to one ledger/);
    }
  });

  it("falls back to the category hint when the throw site named none", () => {
    // No prose matching left: a refusal that says nothing specific gets its
    // category's advice, and a reworded message cannot change which.
    expect(
      envelopeFromThrown(
        new ConflictError("Entry", "it has changed since it was loaded"),
      ).hint,
    ).toMatch(/getEntryContext/);
    expect(
      envelopeFromThrown(
        new ConflictError("Entry", "totally different wording"),
      ).hint,
    ).toMatch(/getEntryContext/);
  });

  it("does not let the word 'scope' in a message hijack the hint", () => {
    // The deleted /scope/i pattern matched any message containing
    // "ledgerScope", handing a not-found or conflict the credential-scope
    // advice. Category now decides.
    expect(
      envelopeFromThrown(
        new BadUserInputError("ledgerScope must be owner/name"),
      ).hint,
    ).toMatch(/tools\/list publishes each tool's input schema|`tools\/list`/);
  });

  /**
   * w5/042. The CONFLICT fallback is about re-reading an entry's hash, which
   * sent an agent that had picked a taken ledger name off to edit entries.
   */
  it("tells a ledger-name conflict to pick another name, not to re-read an entry", () => {
    const envelope = envelopeFromThrown(
      favaApiErrorToDomainError(
        new FavaApiError("duplicate", 400, {
          success: false,
          error: "Ledger name conflict",
          code: "ledger_name_already_exists",
        }),
        "create ledger",
      ),
    );
    expect(envelope.code).toBe("CONFLICT");
    expect(envelope.hint).toMatch(/different ledger name/);
    expect(envelope.hint).toContain("listLedgers");
    expect(envelope.hint).not.toContain("getEntryContext");
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

/**
 * ADR 0007 D7 (w5/028). An unexpected error's message was written for whoever
 * reads logs, so production replaces it; anything shaped for the caller — a
 * DomainError, a Zod refusal, a tool guard's own not-found — keeps its words.
 */
describe("production masking of unexpected errors", () => {
  const production = maskingFor({ env: "production" });

  it("masks only in production", () => {
    expect(maskingFor({ env: "production" }).maskUnexpected).toBe(true);
    expect(maskingFor({ env: "development" }).maskUnexpected).toBe(false);
    expect(maskingFor({}).maskUnexpected).toBe(false);
    expect(
      envelopeFromThrown(new RangeError("Invalid time value")).message,
    ).toBe("Invalid time value");
  });

  it("replaces an unexpected throw's message and keeps its category and hint", () => {
    const envelope = envelopeFromThrown(
      new RangeError("Invalid time value"),
      production,
    );
    expect(envelope).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      hint: expect.stringMatching(/Retry once/),
    });
  });

  it("replaces an uncoded tool failure's message the same way", () => {
    const { envelope, rest } = splitToolFailure(
      { ok: false, error: 'select * from "api_keys" where digest = $1', n: 1 },
      production,
    );
    expect(envelope.code).toBe("INTERNAL_SERVER_ERROR");
    expect(envelope.message).toBe("Internal server error");
    expect(rest).toEqual({ n: 1 });
  });

  it("leaves everything written for the caller alone", () => {
    expect(
      envelopeFromThrown(
        new BadUserInputError("date is not a date"),
        production,
      ).message,
    ).toBe("date is not a date");
    expect(
      envelopeFromThrown(
        new ConfigurationError("Object storage is not configured"),
        production,
      ).message,
    ).toBe("Object storage is not configured");
    expect(
      envelopeFromThrown(new Error("No such file in alice/main"), production),
    ).toMatchObject({
      code: "NOT_FOUND",
      message: "No such file in alice/main",
    });
    expect(
      splitToolFailure(
        {
          ok: false,
          error: "upstream refused the write",
          errorCode: "INTERNAL_SERVER_ERROR",
        },
        production,
      ).envelope.message,
    ).toBe("upstream refused the write");
    expect(
      splitToolFailure(
        { ok: false, error: "main.bean: file not found" },
        production,
      ).envelope,
    ).toMatchObject({
      code: "NOT_FOUND",
      message: "main.bean: file not found",
    });
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
    const failure = new McpRequestFailure({
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
    ).toBe(
      "RATE_LIMITED: Rate limit exceeded\nHint: back off\nRetry after: 12s",
    );
  });

  it("omits the retry line when there is nothing to retry after", () => {
    expect(
      renderErrorText({ code: "FORBIDDEN", message: "nope", hint: "ask" }),
    ).toBe("FORBIDDEN: nope\nHint: ask");
  });
});
