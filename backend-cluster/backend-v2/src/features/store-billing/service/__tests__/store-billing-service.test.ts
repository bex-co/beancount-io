import { AuthorizationService } from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";
import { ErrorCategory } from "@/shared/errors";
import type { IBillingIdentityModel } from "../../data/billing-identity-model";
import { StoreBillingService } from "../store-billing-service";

const identity = (userId: string): Identity => ({
  userId,
  method: "session",
  scopes: new Set(),
});

/** One identity per account, as the table's primary key holds it. */
function inMemoryIdentities(): IBillingIdentityModel {
  const rows = new Map<
    string,
    Awaited<ReturnType<IBillingIdentityModel["findOrCreate"]>>
  >();
  return {
    findOrCreate: async (_db, userId) => {
      const row = rows.get(userId) ?? {
        userId,
        appleAppAccountToken: `apple-${userId}`,
        googleObfuscatedAccountId: `google-${userId}`,
        createdAt: new Date(),
      };
      rows.set(userId, row);
      return row;
    },
  };
}

const service = (billingIdentity = inMemoryIdentities()) =>
  new StoreBillingService(
    { billingIdentity },
    {} as never,
    new AuthorizationService({
      check: async ({ user, object }) => user === object,
    }),
  );

describe("storeBillingIdentity (ADR 001 D4, D13)", () => {
  it("returns the same identifiers on every read", async () => {
    const billing = service();
    const first = await billing.storeBillingIdentity(identity("usr_alice"));

    await expect(
      billing.storeBillingIdentity(identity("usr_alice")),
    ).resolves.toEqual(first);
  });

  it("gives each account its own identifiers", async () => {
    const billing = service();

    await expect(
      billing.storeBillingIdentity(identity("usr_bob")),
    ).resolves.not.toEqual(
      await billing.storeBillingIdentity(identity("usr_alice")),
    );
  });

  it("exposes the two identifiers and nothing else of the row", async () => {
    await expect(
      service().storeBillingIdentity(identity("usr_alice")),
    ).resolves.toEqual({
      appleAppAccountToken: "apple-usr_alice",
      googleObfuscatedAccountId: "google-usr_alice",
    });
  });

  it("creates nothing for a credential that may not read billing", async () => {
    const findOrCreate = jest.fn();

    await expect(
      service({ findOrCreate }).storeBillingIdentity({
        ...identity("usr_alice"),
        method: "apikey",
      }),
    ).rejects.toMatchObject({ category: ErrorCategory.FORBIDDEN });
    expect(findOrCreate).not.toHaveBeenCalled();
  });
});
