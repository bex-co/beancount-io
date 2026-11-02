import "reflect-metadata";
import { graphql } from "graphql";
import { buildSchema } from "type-graphql";
import { AuthorizationService } from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";
import { StoreBillingService } from "../../service/store-billing-service";
import { StoreBillingResolver } from "../store-billing-resolver";

const resolver = new StoreBillingResolver(
  new StoreBillingService(
    {
      billingIdentity: {
        findOrCreate: async (_db, userId) => ({
          userId,
          appleAppAccountToken: "apple-token",
          googleObfuscatedAccountId: "google-id",
          createdAt: new Date(),
        }),
      },
    },
    {} as never,
    new AuthorizationService({
      check: async ({ user, object }) => user === object,
    }),
  ),
);
const schema = buildSchema({
  resolvers: [StoreBillingResolver],
  container: { get: () => resolver },
});

const read = async (identity?: Identity) =>
  graphql({
    schema: await schema,
    source: `query {
      storeBillingIdentity { appleAppAccountToken googleObfuscatedAccountId }
    }`,
    contextValue: { identity, getCurrentIdentity: () => identity },
  });

const oauthFrom = (oauthClientId: string): Identity => ({
  userId: "usr_alice",
  method: "oauth",
  oauthClientId,
  scopes: new Set(),
});

describe("Query.storeBillingIdentity (ADR 001 D13)", () => {
  it("answers the app's OAuth credential", async () => {
    const result = await read(oauthFrom("beancount-mobile"));

    expect(result.errors).toBeUndefined();
    expect(result.data?.storeBillingIdentity).toEqual({
      appleAppAccountToken: "apple-token",
      googleObfuscatedAccountId: "google-id",
    });
  });

  it("answers a browser session", async () => {
    const result = await read({
      userId: "usr_alice",
      method: "session",
      scopes: new Set(),
    });

    expect(result.errors).toBeUndefined();
  });

  it("refuses another OAuth client", async () => {
    const result = await read(oauthFrom("discourse-forum"));

    expect(result.errors?.[0]?.message).toBe(
      "Managing billing requires a full signed-in session",
    );
  });

  it("refuses an anonymous caller", async () => {
    const result = await read();

    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
  });
});
