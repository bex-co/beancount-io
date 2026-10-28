import "reflect-metadata";
import {
  BadUserInputError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  RateLimitedError,
  ServiceUnavailableError,
  UnauthenticatedError,
} from "@/shared/errors";
import { FavaApiError } from "../api-client";
import { unwrapFavaResponse } from "../unwrap-response";
import type { ErrorResponse, HttpResponse } from "../Api";

type Envelope<T> = { success?: boolean; data: T };

function makeResponse<T>(
  envelope: Envelope<T>,
): HttpResponse<Envelope<T>, ErrorResponse> {
  return { data: envelope } as HttpResponse<Envelope<T>, ErrorResponse>;
}

describe("unwrapFavaResponse", () => {
  it("returns response.data.data when success is true", async () => {
    const response = makeResponse({ success: true, data: { id: "lg_1" } });

    const data = await unwrapFavaResponse(response, "get ledger");

    expect(data).toEqual({ id: "lg_1" });
  });

  it("awaits a pending request promise", async () => {
    const response = Promise.resolve(
      makeResponse({ success: true, data: { id: "lg_2" } }),
    );

    const data = await unwrapFavaResponse(response, "get ledger");

    expect(data).toEqual({ id: "lg_2" });
  });

  it("throws InternalServerError when success is falsy", async () => {
    const response = makeResponse({ success: false, data: null });

    await expect(unwrapFavaResponse(response, "get ledger")).rejects.toThrow(
      InternalServerError,
    );
  });

  it("uses the makeError factory to override the thrown error", async () => {
    const response = makeResponse({ success: false, data: null });

    await expect(
      unwrapFavaResponse(
        response,
        "list ledgers",
        () => new ServiceUnavailableError("Ledger API"),
      ),
    ).rejects.toThrow(ServiceUnavailableError);
  });

  it("throws InternalServerError by default when the request itself rejects", async () => {
    const response = Promise.reject(
      new Error("pre-receive hook rejected the push"),
    );

    await expect(
      unwrapFavaResponse(response, "update ledger file"),
    ).rejects.toThrow(InternalServerError);
  });

  it.each([
    [400, BadUserInputError, "BAD_USER_INPUT"],
    [401, UnauthenticatedError, "UNAUTHENTICATED"],
    [403, ForbiddenError, "FORBIDDEN"],
    [404, NotFoundError, "NOT_FOUND"],
    [409, ConflictError, "CONFLICT"],
    [422, BadUserInputError, "BAD_USER_INPUT"],
    [429, RateLimitedError, "RATE_LIMITED"],
    [500, ServiceUnavailableError, "SERVICE_UNAVAILABLE"],
    [503, ServiceUnavailableError, "SERVICE_UNAVAILABLE"],
    [undefined, ServiceUnavailableError, "SERVICE_UNAVAILABLE"],
  ])(
    "maps a Ledger API %s response to %s",
    async (status, ErrorClass, category) => {
      const response = Promise.reject(
        new FavaApiError("upstream failure", status, {
          success: false,
          error: "upstream failure",
        }),
      );

      let caught: unknown;
      try {
        await unwrapFavaResponse(response, "read ledger");
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(ErrorClass);
      expect(caught).toMatchObject({ category });
    },
  );

  // w23/047: every 404 read "Ledger resource not found", so a stale entry
  // hash told an agent its ledger was gone.
  it.each([
    [
      "Entry with ID 'abc:1' not found",
      "Entry with ID 'abc:1' not found",
      {
        resource: "Entry",
        id: "abc:1",
        hint: expect.stringContaining("listLedgerEntries"),
      },
    ],
    // w23/143: branch and PR misses name their own next step instead of
    // the ledgers/files/entries fallback.
    [
      "Branch with ID 'master' not found",
      "Branch with ID 'master' not found",
      {
        resource: "Branch",
        id: "master",
        hint: expect.stringContaining("`main` is the default"),
      },
    ],
    [
      "Pull request with ID '999' not found",
      "Pull request with ID '999' not found",
      {
        resource: "Pull request",
        id: "999",
        hint: expect.stringContaining("per-ledger"),
      },
    ],
    [
      "Ledger entry point with ID 'alice/main:main.bean' not found",
      "Ledger entry point with ID 'alice/main:main.bean' not found",
      { resource: "Ledger entry point" },
    ],
    ["File 2026.bean not found", "File 2026.bean not found", {}],
    ["The target couldn't be found.", "Ledger resource not found", {}],
    ["", "Ledger resource not found", {}],
  ])("keeps what a 404 %p names", async (upstream, message, metadata) => {
    const caught = await unwrapFavaResponse(
      Promise.reject(
        new FavaApiError(upstream || "Not Found", 404, {
          success: false,
          error: upstream,
        }),
      ),
      "read entry",
    ).catch((error: unknown) => error);
    expect(caught).toBeInstanceOf(NotFoundError);
    expect(caught).toMatchObject({ category: "NOT_FOUND", message, metadata });
  });

  it("maps the legacy resource-limit message to ResourceLimitReachedError", async () => {
    const response = Promise.reject(
      new FavaApiError(
        "Ledger source file count limit reached. Maximum: 100, Current: 101.",
        403,
        {
          success: false,
          error:
            "Ledger source file count limit reached. Maximum: 100, Current: 101.",
        },
      ),
    );

    await expect(
      unwrapFavaResponse(response, "read ledger"),
    ).rejects.toMatchObject({
      category: "RESOURCE_LIMIT_REACHED",
      metadata: {
        resource: "Ledger source file count",
        limit: 100,
        current: 101,
      },
    });
  });

  it("maps duplicate names to a structured conflict", async () => {
    const response = Promise.reject(
      new FavaApiError("duplicate", 400, {
        success: false,
        error:
          "A ledger with the name 'existing' already exists. Please choose a different name.",
      }),
    );

    await expect(
      unwrapFavaResponse(response, "update ledger"),
    ).rejects.toMatchObject({
      category: "CONFLICT",
      metadata: {
        reasonCode: "LEDGER_NAME_ALREADY_EXISTS",
        field: "name",
      },
    });
  });

  it("maps a renamed ledger's former name to its own conflict (w23/061)", async () => {
    const error =
      "'books' is the former name of alice/books-2025: links to it redirect there, so the name stays reserved. Choose a different name.";
    const response = Promise.reject(
      new FavaApiError("reserved", 400, {
        success: false,
        error,
        code: "LEDGER_NAME_RESERVED",
        details: { name: "books", redirects_to: "alice/books-2025" },
      }),
    );

    await expect(
      unwrapFavaResponse(response, "create ledger"),
    ).rejects.toMatchObject({
      category: "CONFLICT",
      message: `Ledger conflict: ${error}`,
      metadata: {
        reasonCode: "LEDGER_NAME_RESERVED",
        field: "name",
        hint: expect.not.stringContaining("existing ledgers"),
      },
    });
  });

  it("calls makeError with the underlying cause when the request itself rejects", async () => {
    const cause = new Error("pre-receive hook rejected the push");
    const response = Promise.reject(cause);
    const makeError = jest.fn(
      (c?: unknown) => new BadUserInputError(String(c)),
    );

    await expect(
      unwrapFavaResponse(response, "update ledger file", makeError),
    ).rejects.toThrow(BadUserInputError);
    expect(makeError).toHaveBeenCalledWith(cause);
  });

  it("calls makeError with an Error wrapping resolved.data.error when success is falsy and an error string is present", async () => {
    const response = {
      data: { success: false, data: null, error: "directive limit exceeded" },
    } as unknown as HttpResponse<Envelope<null>, ErrorResponse>;
    const makeError = jest.fn(
      (c?: unknown) =>
        new BadUserInputError(c instanceof Error ? c.message : String(c)),
    );

    await expect(
      unwrapFavaResponse(response, "update ledger file", makeError),
    ).rejects.toThrow(BadUserInputError);
    expect(makeError).toHaveBeenCalledWith(
      new Error("directive limit exceeded"),
    );
  });

  it("calls makeError with undefined when success is falsy and there is no error string", async () => {
    const response = makeResponse({ success: false, data: null });
    const makeError = jest.fn(() => new BadUserInputError("no cause"));

    await expect(
      unwrapFavaResponse(response, "update ledger file", makeError),
    ).rejects.toThrow(BadUserInputError);
    expect(makeError).toHaveBeenCalledWith(undefined);
  });

  it("passes through a thrown DomainError unchanged, even with makeError provided", async () => {
    const domainError = new ServiceUnavailableError("Ledger API");
    const response = Promise.reject(domainError);
    const makeError = jest.fn(
      () => new BadUserInputError("should not be used"),
    );

    await expect(
      unwrapFavaResponse(response, "update ledger file", makeError),
    ).rejects.toBe(domainError);
    expect(makeError).not.toHaveBeenCalled();
  });
});
