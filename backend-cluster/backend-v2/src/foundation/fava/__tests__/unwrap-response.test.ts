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
