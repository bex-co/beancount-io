import "reflect-metadata";
import { GraphQLError } from "graphql";
import { ArgumentValidationError } from "type-graphql";
import { NotFoundError, InternalServerError } from "@/shared/errors";

// config.env drives production masking; mock it so we can toggle.
jest.mock("@/config/config", () => ({
  config: { env: "development" },
}));

import { config } from "@/config/config";
import { formatError } from "../format-error";

/** Build the (formattedError, error) pair Apollo passes to formatError. */
function wrap(domainError: Error) {
  const gqlError = new GraphQLError(domainError.message, {
    originalError: domainError,
    path: ["someField"],
  });
  const formatted = {
    message: domainError.message,
    path: ["someField"] as readonly string[],
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  };
  return { formatted, gqlError };
}

describe("formatError (GraphQL transport adapter)", () => {
  beforeEach(() => {
    (config as { env: string }).env = "development";
  });

  it("maps a DomainError category to extensions.code and merges metadata", () => {
    const { formatted, gqlError } = wrap(new NotFoundError("Ledger", "abc"));

    const result = formatError(formatted, gqlError);

    expect(result.extensions?.code).toBe("NOT_FOUND");
    expect(result.extensions).toMatchObject({ resource: "Ledger", id: "abc" });
    expect(result.message).toBe("Ledger with ID 'abc' not found");
    expect(result.path).toEqual(["someField"]);
  });

  it("preserves the message for internal errors in non-production", () => {
    const { formatted, gqlError } = wrap(
      new InternalServerError("db exploded"),
    );

    const result = formatError(formatted, gqlError);

    expect(result.extensions?.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.message).toBe("db exploded");
  });

  it("masks internal error messages in production", () => {
    (config as { env: string }).env = "production";
    const { formatted, gqlError } = wrap(
      new InternalServerError("db exploded"),
    );

    const result = formatError(formatted, gqlError);

    expect(result.extensions?.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.message).toBe("Internal server error");
  });

  it("leaves a plain (non-validation) GraphQLError's message untouched", () => {
    const formatted = {
      message: "Name must be at most 20 characters long",
      extensions: { code: "BAD_USER_INPUT" },
    };
    const gqlError = new GraphQLError("Argument Validation Error");

    const result = formatError(formatted, gqlError);

    expect(result.message).toBe("Name must be at most 20 characters long");
    expect(result.extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("surfaces the class-validator constraint message from an ArgumentValidationError", () => {
    const argError = new ArgumentValidationError([
      {
        property: "password",
        constraints: {
          maxLength: "Password must be at most 128 characters long",
        },
      },
    ]);
    const formatted = {
      message: "Argument Validation Error",
      extensions: { code: "BAD_USER_INPUT" },
    };

    const result = formatError(formatted, argError);

    expect(result.message).toBe("Password must be at most 128 characters long");
    expect(result.extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("unwraps an ArgumentValidationError nested in a resolver GraphQLError", () => {
    const argError = new ArgumentValidationError([
      {
        property: "email",
        constraints: { isEmail: "Email must be a valid email address" },
      },
    ]);
    // unwrapResolverError only unwraps a GraphQLError that has a `path` (as real
    // resolver/validation errors do) alongside its originalError.
    const gqlError = new GraphQLError("Argument Validation Error", {
      originalError: argError,
      path: ["someField"],
    });
    const formatted = {
      message: "Argument Validation Error",
      extensions: { code: "BAD_USER_INPUT" },
    };

    const result = formatError(formatted, gqlError);

    expect(result.message).toBe("Email must be a valid email address");
  });

  it("falls back to the property name when a validation error has no constraints", () => {
    const argError = new ArgumentValidationError([{ property: "username" }]);
    const formatted = {
      message: "Argument Validation Error",
      extensions: { code: "BAD_USER_INPUT" },
    };

    const result = formatError(formatted, argError);

    expect(result.message).toBe("Validation failed for username");
  });
});
