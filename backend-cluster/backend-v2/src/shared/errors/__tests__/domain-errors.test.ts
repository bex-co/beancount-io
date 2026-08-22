import {
  CATEGORY_HTTP_STATUS,
  DomainError,
  ErrorCategory,
  UnauthenticatedError,
  ForbiddenError,
  NotFoundError,
  BadUserInputError,
  ValidationError,
  ConflictError,
  RateLimitedError,
  InternalServerError,
  ServiceUnavailableError,
  ResourceLimitReachedError,
  OperationNotAllowedError,
  PremiumRequiredError,
} from "@/shared/errors";

describe("domain errors", () => {
  it("all concrete errors are DomainError + Error instances with name set", () => {
    const err = new NotFoundError("Ledger", "abc");
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("NotFoundError");
  });

  it("category is the canonical code and metadata is preserved", () => {
    const err = new ResourceLimitReachedError("Ledger", 5, 5);
    expect(err.category).toBe(ErrorCategory.RESOURCE_LIMIT_REACHED);
    expect(err.metadata).toEqual({ resource: "Ledger", limit: 5, current: 5 });
  });

  it.each([
    [new UnauthenticatedError(), ErrorCategory.UNAUTHENTICATED],
    [new ForbiddenError(), ErrorCategory.FORBIDDEN],
    [new NotFoundError("X"), ErrorCategory.NOT_FOUND],
    [new BadUserInputError("bad"), ErrorCategory.BAD_USER_INPUT],
    [new ValidationError("email", "invalid"), ErrorCategory.VALIDATION_FAILED],
    [new ConflictError("User", "dup"), ErrorCategory.CONFLICT],
    [new RateLimitedError(60), ErrorCategory.RATE_LIMITED],
    [new InternalServerError(), ErrorCategory.INTERNAL_SERVER_ERROR],
    [new ServiceUnavailableError("Db"), ErrorCategory.SERVICE_UNAVAILABLE],
    [
      new ResourceLimitReachedError("Ledger", 1, 1),
      ErrorCategory.RESOURCE_LIMIT_REACHED,
    ],
    [
      new OperationNotAllowedError("delete", "nope"),
      ErrorCategory.OPERATION_NOT_ALLOWED,
    ],
    [new PremiumRequiredError(), ErrorCategory.PREMIUM_REQUIRED],
  ])("%s maps to its category", (err, category) => {
    expect((err as DomainError).category).toBe(category);
  });

  it("every category has an HTTP status mapping", () => {
    for (const category of Object.values(ErrorCategory)) {
      expect(typeof CATEGORY_HTTP_STATUS[category]).toBe("number");
    }
  });

  it("NotFoundError builds a message with and without an id", () => {
    expect(new NotFoundError("Ledger").message).toBe("Ledger not found");
    expect(new NotFoundError("Ledger", "abc").message).toBe(
      "Ledger with ID 'abc' not found",
    );
  });

  it("RateLimitedError omits retryAfter when not provided", () => {
    expect(new RateLimitedError().metadata).toEqual({});
    expect(new RateLimitedError(30).metadata).toEqual({ retryAfter: 30 });
    expect(
      new RateLimitedError(undefined, "Quota reached", { tier: "free" })
        .metadata,
    ).toEqual({ tier: "free" });
  });

  it("InternalServerError can carry an httpStatusHint for passthrough", () => {
    const err = new InternalServerError("upstream", undefined, 502);
    expect(err.httpStatusHint).toBe(502);
    expect(err.category).toBe(ErrorCategory.INTERNAL_SERVER_ERROR);
  });
});
