import { ZodError, z } from "zod";
import { toErrorResponse } from "@/server/error-middleware";
import {
  BadUserInputError,
  DomainError,
  ErrorCategory,
  NotFoundError,
} from "@/shared/errors";

describe("toErrorResponse", () => {
  it("maps DomainError categories to Python-compatible status + envelope", () => {
    const notFound = toErrorResponse(new NotFoundError("Repo"));
    expect(notFound.status).toBe(404);
    expect(notFound.body).toEqual({
      success: false,
      error: "Repo not found",
      code: null,
      details: null,
    });

    const badInput = toErrorResponse(new BadUserInputError("bad name"));
    expect(badInput.status).toBe(400);
  });

  it("surfaces structured code/details from error metadata (directive limit)", () => {
    class StructuredError extends DomainError {}
    const err = new StructuredError(
      ErrorCategory.RESOURCE_LIMIT_REACHED,
      "Directive limit exceeded",
      {
        code: "directive_limit_exceeded",
        details: { limit: 1000, current: 1005 },
      },
    );
    const res = toErrorResponse(err);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      success: false,
      error: "Directive limit exceeded",
      code: "directive_limit_exceeded",
      details: { limit: 1000, current: 1005 },
    });
  });

  it("maps zod validation failures to the Python 422 message format", () => {
    let zodError: ZodError | undefined;
    try {
      z.object({ query: z.string() }).parse({});
    } catch (e) {
      zodError = e as ZodError;
    }
    const res = toErrorResponse(zodError);
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/^Validation error: query: /);
  });

  it("forwards Gitea HTTP errors with the Gitea body message", () => {
    const res = toErrorResponse({
      status: 404,
      error: { message: "user does not exist" },
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("user does not exist");
  });

  it("preserves empty-string Gitea messages (explicit None check parity)", () => {
    const res = toErrorResponse({ status: 409, error: { message: "" } });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("");
  });

  it("falls back to 500 Internal server error for unknown throwables", () => {
    const res = toErrorResponse(new Error("boom"));
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: "Internal server error",
      code: null,
      details: null,
    });
  });
});
