import type { AppConfig } from "@/config/config";
import type { DatabaseLayer } from "@/foundation/composition";
import type { ApiKey } from "@/features/apikeys/data/api-key-model";
import { apiKeyDigest } from "@/features/apikeys/service/api-key-service";
import { configureLedgerPinResolver, resolveIdentity } from "../identity";

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

function databaseWith(key: ApiKey | null, ownerExists = true) {
  const touchLastUsedAt = jest.fn(async () => undefined);
  const bindLedgerScopeRepoId = jest.fn(async () => undefined);
  return {
    touchLastUsedAt,
    bindLedgerScopeRepoId,
    database: {
      db: {} as DatabaseLayer["db"],
      models: {
        jwt: { verify: jest.fn(async () => null) },
        user: {
          getById: jest.fn(async (_db: unknown, id: string) =>
            ownerExists && key?.userId === id ? { id } : null,
          ),
        },
        apiKey: {
          findByDigest: jest.fn(async (_db: unknown, digestValue: string) =>
            key && key.keyDigest === digestValue ? key : null,
          ),
          touchLastUsedAt,
          bindLedgerScopeRepoId,
        },
      } as unknown as DatabaseLayer["models"],
    } satisfies DatabaseLayer,
  };
}

const bearer = (token: string) => ({
  headers: { authorization: `Bearer ${token}` },
});

const apiKeyHeader = (token: string) => ({
  headers: { "x-api-key": token },
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
    });
    expect([...(identity?.scopes ?? [])].sort()).toEqual([
      "ledger.read",
      "ledger.write",
    ]);
  });

  // w21/156: account deletion left keys behind, and they still resolved.
  it("refuses a key whose account was deleted", async () => {
    const { database } = databaseWith(liveKey, false);
    await expect(
      resolveIdentity(bearer(PLAINTEXT), database, config),
    ).resolves.toBeUndefined();
  });

  it("accepts the x-api-key form published by the OpenAPI contract", async () => {
    const { database } = databaseWith(liveKey);

    await expect(
      resolveIdentity(apiKeyHeader(PLAINTEXT), database, config),
    ).resolves.toMatchObject({ method: "apikey", tokenId: "akey_1" });
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

  it("refuses a key whose stored ledger pin is malformed", async () => {
    // An empty pin is falsy, which the PDP would read as "not confined". The
    // row is not one `mint` writes, so the key is not live.
    const { database } = databaseWith({ ...liveKey, ledgerScope: "" });
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

// A pin identifies a repository, not the name it was granted with (w23/065).
describe("a pinned key follows its ledger's repository", () => {
  // Repository 42 was alice/p1 and is now alice/p2; alice/p1 now belongs to 99.
  const repos = new Map<number, string | undefined>([
    [42, "alice/p2"],
    [99, "alice/p1"],
  ]);
  const ids = new Map<string, number | undefined>([
    ["alice/p2", 42],
    ["alice/p1", 99],
  ]);

  beforeEach(() => {
    configureLedgerPinResolver({
      repoIdOf: async (name) => ids.get(name),
      nameOf: async (id) => repos.get(id),
    });
  });
  afterEach(() => {
    configureLedgerPinResolver(undefined);
    repos.set(42, "alice/p2");
  });

  const bound = { ...liveKey, ledgerScope: "alice/p1", ledgerScopeRepoId: 42 };

  it("addresses the renamed ledger by its current name", async () => {
    const { database } = databaseWith(bound);
    const identity = await resolveIdentity(bearer(PLAINTEXT), database, config);
    expect(identity).toMatchObject({
      ledgerScope: "alice/p2",
      ledgerScopeRepoId: 42,
    });
  });

  it("never follows a recreated name: the old name belongs to another repository", async () => {
    const { database } = databaseWith(bound);
    const identity = await resolveIdentity(bearer(PLAINTEXT), database, config);
    // The pin is repository 42, not whatever alice/p1 is now.
    expect(identity?.ledgerScope).not.toBe("alice/p1");
  });

  it("is refused once its repository is deleted", async () => {
    repos.set(42, undefined);
    const { database } = databaseWith(bound);
    await expect(
      resolveIdentity(bearer(PLAINTEXT), database, config),
    ).resolves.toBeUndefined();
  });

  it("lets a failed lookup surface instead of reading as a match", async () => {
    configureLedgerPinResolver({
      repoIdOf: async () => {
        throw new Error("lookup down");
      },
      nameOf: async () => {
        throw new Error("lookup down");
      },
    });
    const { database } = databaseWith(bound);
    await expect(
      resolveIdentity(bearer(PLAINTEXT), database, config),
    ).rejects.toThrow(/lookup down/);
  });

  it("binds a legacy name-only pin to its repository on first use, once", async () => {
    const legacy = { ...liveKey, ledgerScope: "alice/p2" };
    const { database, bindLedgerScopeRepoId } = databaseWith(legacy);
    const identity = await resolveIdentity(bearer(PLAINTEXT), database, config);
    expect(identity).toMatchObject({
      ledgerScope: "alice/p2",
      ledgerScopeRepoId: 42,
    });
    expect(bindLedgerScopeRepoId).toHaveBeenCalledWith(
      expect.anything(),
      "akey_1",
      42,
    );

    const { database: again, bindLedgerScopeRepoId: second } =
      databaseWith(bound);
    await resolveIdentity(bearer(PLAINTEXT), again, config);
    expect(second).not.toHaveBeenCalled();
  });

  it("keeps a pin to a name nothing owns as that name, matching nothing", async () => {
    const legacy = { ...liveKey, ledgerScope: "alice/ghost" };
    const { database, bindLedgerScopeRepoId } = databaseWith(legacy);
    const identity = await resolveIdentity(bearer(PLAINTEXT), database, config);
    expect(identity?.ledgerScope).toBe("alice/ghost");
    expect(bindLedgerScopeRepoId).not.toHaveBeenCalled();
  });
});
