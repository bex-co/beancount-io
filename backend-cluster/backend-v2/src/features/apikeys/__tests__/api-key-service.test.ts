import {
  ApiKeyService,
  normalizeScopes,
  toPublicApiKey,
  apiKeyDigest,
} from "../service/api-key-service";
import type { ApiKey } from "../data/api-key-model";
import type { Identity } from "@/server/api/identity";
import {
  ForbiddenError,
  NotFoundError,
  PremiumRequiredError,
  ValidationError,
} from "@/shared/errors";

/**
 * The rules that make an API key safe to hand out (ADR 0006 D6).
 *
 * Each of these is a rule somebody could quietly relax later, which is why each
 * has a test naming what it protects rather than just what it does.
 */

const session: Identity = {
  userId: "usr_1",
  method: "session",
  scopes: new Set(),
  capabilityExempt: true,
};

const oauthGrant: Identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  tokenId: "tok_1",
  capabilityExempt: false,
};

const fromKey: Identity = {
  ...oauthGrant,
  method: "apikey",
  scopes: new Set(["ledger.admin"]),
  tokenId: "akey_1",
};

const adminOAuthGrant: Identity = {
  ...oauthGrant,
  scopes: new Set(["ledger.admin"]),
};

const storedKey = (over: Partial<ApiKey> = {}): ApiKey => ({
  id: "akey_1",
  userId: "usr_1",
  name: "CI",
  keyDigest: apiKeyDigest("bcio_plaintext"),
  keyPrefix: "bcio_plainte",
  scopes: ["ledger.read"],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...over,
});

function makeService(opts: { premium?: boolean; stored?: ApiKey | null } = {}) {
  const created: Record<string, unknown>[] = [];
  const model = {
    create: jest.fn(async (_db: unknown, input: Record<string, unknown>) => {
      created.push(input);
      return storedKey(input as Partial<ApiKey>);
    }),
    findByDigest: jest.fn(async () => opts.stored ?? null),
    findById: jest.fn(async () => opts.stored ?? null),
    listByUserId: jest.fn(async () => [storedKey()]),
    countLiveByUserId: jest.fn(async () => 0),
    revoke: jest.fn(async (_db: unknown, id: string, revokedAt: Date) =>
      storedKey({ id, revokedAt }),
    ),
    touchLastUsedAt: jest.fn(async () => undefined),
    deleteByUserId: jest.fn(async () => undefined),
  };
  const service = new ApiKeyService({
    db: {} as never,
    models: { apiKey: model } as never,
    isPremium: async () => opts.premium ?? true,
  });
  return { service, model, created };
}

describe("minting", () => {
  it("returns the plaintext once and stores only its digest", async () => {
    const { service, created } = makeService();
    const minted = await service.mint(session, {
      name: "CI",
      scopes: ["ledger.read"],
    });

    expect(minted.plaintext).toMatch(/^bcio_/);
    // The row the model was asked to write must not contain the secret in any
    // field — this is the assertion that would fail if someone added a
    // `plaintext` column "for debugging".
    const row = JSON.stringify(created[0]);
    expect(row).not.toContain(minted.plaintext);
    expect(created[0].keyDigest).toBe(apiKeyDigest(minted.plaintext));
  });

  it("refuses a caller whose own credential is an API key", async () => {
    const { service } = makeService();
    await expect(
      service.mint(fromKey, { name: "CI", scopes: ["ledger.read"] }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses a free-plan user", async () => {
    const { service } = makeService({ premium: false });
    await expect(
      service.mint(session, { name: "CI", scopes: ["ledger.read"] }),
    ).rejects.toBeInstanceOf(PremiumRequiredError);
  });

  it("requires the admin capability from an OAuth minter", async () => {
    const { service } = makeService();
    await expect(
      service.mint(oauthGrant, { name: "CI", scopes: ["ledger.read"] }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("lets an admin OAuth grant mint a narrower key", async () => {
    const { service } = makeService();
    await expect(
      service.mint(adminOAuthGrant, {
        name: "Read-only integration",
        scopes: ["ledger.read"],
      }),
    ).resolves.toBeTruthy();
  });

  it("lets a session grant any scope, having no scopes of its own", async () => {
    const { service } = makeService();
    await expect(
      service.mint(session, { name: "CI", scopes: ["ledger.admin"] }),
    ).resolves.toBeTruthy();
  });

  it("refuses an expiry in the past", async () => {
    const { service } = makeService();
    await expect(
      service.mint(session, {
        name: "CI",
        scopes: ["ledger.read"],
        expiresAt: new Date("2000-01-01"),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("inherits the minter's ledger confinement when none is asked for", async () => {
    const { service, created } = makeService();
    await service.mint(
      { ...adminOAuthGrant, ledgerScope: "alice/main" },
      { name: "CI", scopes: ["ledger.read"] },
    );
    expect(created[0].ledgerScope).toBe("alice/main");
  });
});

describe("scope validation", () => {
  it("rejects a scope outside the closed vocabulary", () => {
    expect(() => normalizeScopes(["ledger.superuser"])).toThrow(
      ValidationError,
    );
  });

  it("rejects an empty scope list", () => {
    expect(() => normalizeScopes([])).toThrow(ValidationError);
  });

  it("de-duplicates", () => {
    expect(normalizeScopes(["ledger.read", "ledger.read"])).toEqual([
      "ledger.read",
    ]);
  });
});

describe("verification", () => {
  it("accepts a live key", async () => {
    const { service } = makeService({ stored: storedKey() });
    await expect(service.verify("bcio_plaintext")).resolves.toMatchObject({
      id: "akey_1",
    });
  });

  it("rejects a revoked key", async () => {
    const { service } = makeService({
      stored: storedKey({ revokedAt: new Date("2026-01-02") }),
    });
    await expect(service.verify("bcio_plaintext")).resolves.toBeNull();
  });

  it("rejects an expired key", async () => {
    const { service } = makeService({
      stored: storedKey({ expiresAt: new Date("2026-01-02") }),
    });
    await expect(
      service.verify("bcio_plaintext", new Date("2026-06-01")),
    ).resolves.toBeNull();
  });

  it("rejects anything without the key prefix without touching the database", async () => {
    const { service, model } = makeService({ stored: storedKey() });
    await expect(service.verify("eyJhbGciOi.some.jwt")).resolves.toBeNull();
    expect(model.findByDigest).not.toHaveBeenCalled();
  });
});

describe("revocation", () => {
  it("refuses a credential without the admin capability", async () => {
    const { service, model } = makeService({ stored: storedKey() });

    await expect(service.revoke(oauthGrant, "akey_1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(model.findById).not.toHaveBeenCalled();
  });

  it("reads another user's key id as not found", async () => {
    const { service } = makeService({
      stored: storedKey({ userId: "usr_someone_else" }),
    });
    // Not "forbidden": that would confirm the id exists, turning revoke into a
    // probe for which key ids are real.
    await expect(service.revoke(session, "akey_1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("is idempotent", async () => {
    const revokedAt = new Date("2026-01-02");
    const { service, model } = makeService({
      stored: storedKey({ revokedAt }),
    });
    const result = await service.revoke(session, "akey_1");
    expect(result.revokedAt).toEqual(revokedAt);
    expect(model.revoke).not.toHaveBeenCalled();
  });
});

describe("listing", () => {
  it("refuses a credential without the admin capability", async () => {
    const { service, model } = makeService();

    await expect(service.list(oauthGrant)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(model.listByUserId).not.toHaveBeenCalled();
  });

  it("allows an admin OAuth grant", async () => {
    const { service } = makeService();
    await expect(service.list(adminOAuthGrant)).resolves.toHaveLength(1);
  });
});

describe("presentation", () => {
  it("never exposes the digest", () => {
    const shown = toPublicApiKey(storedKey()) as unknown as Record<
      string,
      unknown
    >;
    expect(shown).not.toHaveProperty("keyDigest");
    expect(Object.values(shown).join(" ")).not.toContain(storedKey().keyDigest);
  });
});
