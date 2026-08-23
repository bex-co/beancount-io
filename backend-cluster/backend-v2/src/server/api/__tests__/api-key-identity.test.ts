import type { AppConfig } from "@/config/config";
import type { DatabaseLayer } from "@/foundation/composition";
import type { ApiKey } from "@/features/apikeys/data/api-key-model";
import { apiKeyDigest } from "@/features/apikeys/service/api-key-service";
import { resolveIdentity } from "../identity";

/**
 * The API-key half of the one authentication gate (ADR 0006 D2 + D6).
 *
 * The matrix that matters is not "does a good key work" but what happens to
 * the bad ones: every failure mode has to be indistinguishable from every
 * other, or the endpoint becomes an oracle for which keys exist and when they
 * were revoked.
 */

const PLAINTEXT = "bcio_7wXzK9mNpQrSt2VxYaBcDeF3gH4jK5mN";

const config = {
  jwt: { secret: "s" },
  oauth: { issuer: "https://beancount.io" },
} as unknown as AppConfig;

const liveKey: ApiKey = {
  id: "akey_1",
  userId: "usr_1",
  name: "CI",
  keyDigest: apiKeyDigest(PLAINTEXT),
  keyPrefix: PLAINTEXT.slice(0, 13),
  scopes: ["ledger.read", "ledger.write"],
  ledgerScope: "alice/main",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function databaseWith(key: ApiKey | null) {
  const touchLastUsedAt = jest.fn(async () => undefined);
  return {
    touchLastUsedAt,
    database: {
      db: {} as DatabaseLayer["db"],
      models: {
        jwt: { verify: jest.fn(async () => null) },
        apiKey: {
          findByDigest: jest.fn(async (_db: unknown, digestValue: string) =>
            key && key.keyDigest === digestValue ? key : null,
          ),
          touchLastUsedAt,
        },
      } as unknown as DatabaseLayer["models"],
    } satisfies DatabaseLayer,
  };
}

const bearer = (token: string) => ({
  headers: { authorization: `Bearer ${token}` },
});

describe("resolving an API key", () => {
  it("projects the key's scopes and confinement onto the Identity", async () => {
    const { database } = databaseWith(liveKey);
    const identity = await resolveIdentity(bearer(PLAINTEXT), database, config);

    expect(identity).toMatchObject({
      userId: "usr_1",
      method: "apikey",
      ledgerScope: "alice/main",
      // The key's id, so an audit trail and a revocation both have something to
      // name — never the key.
      tokenId: "akey_1",
      capabilityExempt: false,
    });
    expect([...(identity?.scopes ?? [])].sort()).toEqual([
      "ledger.read",
      "ledger.write",
    ]);
  });

  it("refuses a revoked key", async () => {
    const { database } = databaseWith({
      ...liveKey,
      revokedAt: new Date("2026-02-01"),
    });
    await expect(
      resolveIdentity(bearer(PLAINTEXT), database, config),
    ).resolves.toBeUndefined();
  });

  it("refuses an expired key", async () => {
    const { database } = databaseWith({
      ...liveKey,
      expiresAt: new Date("2000-01-01"),
    });
    await expect(
      resolveIdentity(bearer(PLAINTEXT), database, config),
    ).resolves.toBeUndefined();
  });

  it("refuses a key that was never minted", async () => {
    const { database } = databaseWith(null);
    await expect(
      resolveIdentity(bearer(PLAINTEXT), database, config),
    ).resolves.toBeUndefined();
  });

  it("does not look up anything that is not key-shaped", async () => {
    const { database } = databaseWith(liveKey);
    await resolveIdentity(bearer("not-a-bcio-key"), database, config);
    // The prefix check is what keeps every session JWT from costing a key
    // lookup, which is the reason the key path sits where it does in the order.
    expect(database.models.apiKey.findByDigest).not.toHaveBeenCalled();
  });
});

describe("usage stamping", () => {
  it("records that the key was used, off the request path", async () => {
    const { database, touchLastUsedAt } = databaseWith({
      ...liveKey,
      id: `akey_${Math.random()}`,
    });
    await resolveIdentity(bearer(PLAINTEXT), database, config);
    await new Promise((resolve) => setImmediate(resolve));
    expect(touchLastUsedAt).toHaveBeenCalledTimes(1);
  });

  it("stamps at most once per key per window", async () => {
    const { database, touchLastUsedAt } = databaseWith({
      ...liveKey,
      id: `akey_${Math.random()}`,
    });
    for (let i = 0; i < 5; i += 1) {
      await resolveIdentity(bearer(PLAINTEXT), database, config);
    }
    await new Promise((resolve) => setImmediate(resolve));
    // Five authenticated requests, one write: precision nobody reads is not
    // worth a database round trip in front of every API call.
    expect(touchLastUsedAt).toHaveBeenCalledTimes(1);
  });
});
