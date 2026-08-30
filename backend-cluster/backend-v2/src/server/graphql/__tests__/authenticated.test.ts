import "reflect-metadata";
import { graphql, type GraphQLSchema } from "graphql";
import { Ctx, Query, Resolver, buildSchema } from "type-graphql";
import type { Identity } from "@/server/api/identity";
import { UnauthenticatedError } from "@/shared/errors";
import { Authenticated } from "../authenticated";
import type { IContext } from "../context";

@Authenticated()
@Resolver()
class AuthenticationOnlyResolver {
  public calls = 0;

  @Query(() => String)
  authenticationOnly(@Ctx() context: IContext): string {
    this.calls += 1;
    return context.identity?.method ?? "missing";
  }
}

const identity = (method: Identity["method"]): Identity => ({
  userId: "user-123",
  method,
  scopes: new Set(),
  capabilityExempt: method === "session",
});

describe("@Authenticated", () => {
  let resolver: AuthenticationOnlyResolver;
  let schema: GraphQLSchema;

  beforeAll(async () => {
    resolver = new AuthenticationOnlyResolver();
    schema = await buildSchema({
      resolvers: [AuthenticationOnlyResolver],
      container: { get: () => resolver },
    });
  });

  beforeEach(() => {
    resolver.calls = 0;
  });

  it("rejects an anonymous request before the resolver runs", async () => {
    const result = await graphql({
      schema,
      source: "query { authenticationOnly }",
      contextValue: { identity: undefined },
    });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.message).toBe(
      "Access denied! Please login to continue!",
    );
    expect(result.errors?.[0]?.originalError).toBeInstanceOf(
      UnauthenticatedError,
    );
    expect(resolver.calls).toBe(0);
  });

  it.each(["session", "oauth", "apikey"] as const)(
    "admits an authenticated %s identity without applying capability policy",
    async (method) => {
      const result = await graphql({
        schema,
        source: "query { authenticationOnly }",
        contextValue: { identity: identity(method) },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ authenticationOnly: method });
      expect(resolver.calls).toBe(1);
    },
  );
});
