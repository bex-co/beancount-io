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
import {
  AUTHORIZATION_ACTIONS,
  type IAuthorizationService,
} from "@/server/api/authorization";

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
};

const oauthGrant: Identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  tokenId: "tok_1",
};

const adminOAuthGrant: Identity = {
  ...oauthGrant,
  scopes: new Set(["ledger.admin"]),
};

const pinnedAdminOAuthGrant: Identity = {
  ...adminOAuthGrant,
  ledgerScope: "alice/main",
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
    revoke: jest.fn(
      async (
        _db: unknown,
        id: string,
        ownerUserId: string,
        revokedAt: Date,
      ) => {
        const existing = opts.stored === undefined ? storedKey() : opts.stored;
        if (
          !existing ||
          existing.id !== id ||
          existing.userId !== ownerUserId
        ) {
          return null;
        }
        return { ...existing, revokedAt: existing.revokedAt ?? revokedAt };
      },
    ),
    touchLastUsedAt: jest.fn(async () => undefined),
    deleteByUserId: jest.fn(async () => undefined),
  };
  const authorization = {
    authorize: jest.fn(),
    authorizeOrThrow: jest.fn(async (input) => ({
      allowed: true as const,
      action: input.action,
      resource: input.resource,
    })),
  } as jest.Mocked<IAuthorizationService>;
  const service = new ApiKeyService({
    db: {} as never,
    models: { apiKey: model } as never,
    authorization,
    isPremium: async () => opts.premium ?? true,
  });
  return { service, model, authorization, created };
}

describe("centralized authorization boundary", () => {
  it("maps every public use case to its canonical action", async () => {
    const { service, authorization } = makeService();
    await service.list(session);
    await service.mint(session, {
      name: "CI",
      scopes: ["ledger.read"],
    });
    await service.revoke(session, "akey_1");

    expect(
      authorization.authorizeOrThrow.mock.calls.map(([input]) => ({
        action: input.action,
        resource: input.resource,
      })),
    ).toEqual([
      {
        action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST,
        resource: "user:usr_1",
      },
      {
        action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE,
        resource: "user:usr_1",
      },
      {
        action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
        resource: "api_key:akey_1",
      },
    ]);
  });

  it.each(["list", "mint", "revoke"] as const)(
    "performs no domain work when %s authorization denies",
    async (operation) => {
      const { service, model, authorization } = makeService();
      authorization.authorizeOrThrow.mockRejectedValueOnce(new Error("denied"));
      const result =
        operation === "list"
          ? service.list(session)
          : operation === "mint"
            ? service.mint(session, {
                name: "CI",
                scopes: ["ledger.read"],
              })
            : service.revoke(session, "akey_1");
      await expect(result).rejects.toThrow("denied");
      expect(model.listByUserId).not.toHaveBeenCalled();
      expect(model.create).not.toHaveBeenCalled();
      expect(model.revoke).not.toHaveBeenCalled();
    },
  );
});

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

  it("refuses a free-plan user", async () => {
    const { service } = makeService({ premium: false });
    await expect(
      service.mint(session, { name: "CI", scopes: ["ledger.read"] }),
    ).rejects.toBeInstanceOf(PremiumRequiredError);
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

  it("refuses a ledger-pinned minter asking for a different ledger", async () => {
    // The pin is a ceiling, like the scopes: a grant the user consented to for
    // one ledger must not yield a durable key for another.
    const { service, model } = makeService();
    await expect(
      service.mint(pinnedAdminOAuthGrant, {
        name: "CI",
        scopes: ["ledger.read"],
        ledgerScope: "alice/other",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(model.create).not.toHaveBeenCalled();
  });

  it("lets a ledger-pinned minter restate its own ledger", async () => {
    const { service, created } = makeService();
    await service.mint(pinnedAdminOAuthGrant, {
      name: "CI",
      scopes: ["ledger.read"],
      ledgerScope: "alice/main",
    });
    expect(created[0].ledgerScope).toBe("alice/main");
  });

  it.each(["", "   "])(
    "reads a blank ledger scope (%j) as not asked for, so a pinned minter still inherits",
    async (blank) => {
      // `""` is falsy, and `assertLedgerScope` treats a falsy pin as
      // unconfined — storing it would let a pinned grant mint an unpinned key.
      const { service, created } = makeService();
      await service.mint(pinnedAdminOAuthGrant, {
        name: "CI",
        scopes: ["ledger.read"],
        ledgerScope: blank,
      });
      expect(created[0].ledgerScope).toBe("alice/main");
    },
  );

  it("never stores a blank ledger scope, even from an unconfined session", async () => {
    const { service, created } = makeService();
    await service.mint(session, {
      name: "CI",
      scopes: ["ledger.read"],
      ledgerScope: "",
    });
    expect(created[0].ledgerScope).toBeUndefined();
  });

  it("lets an unconfined session pin a key to any ledger", async () => {
    const { service, created } = makeService();
    await service.mint(session, {
      name: "CI",
      scopes: ["ledger.read"],
      ledgerScope: "bob/side-ledger",
    });
    expect(created[0].ledgerScope).toBe("bob/side-ledger");
  });

  it.each(["alice", "/main", "alice/"])(
    "rejects a ledger scope that is not owner/name (%j)",
    async (malformed) => {
      const { service, model } = makeService();
      await expect(
        service.mint(session, {
          name: "CI",
          scopes: ["ledger.read"],
          ledgerScope: malformed,
        }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(model.create).not.toHaveBeenCalled();
    },
  );
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

  it("rejects a key whose stored ledger pin is malformed", async () => {
    // `mint` never writes an empty pin, so a row carrying one is refused rather
    // than read as unconfined — the reading a falsy pin would otherwise get.
    const { service } = makeService({
      stored: storedKey({ ledgerScope: "" }),
    });
    await expect(service.verify("bcio_plaintext")).resolves.toBeNull();
  });

  it("rejects anything without the key prefix without touching the database", async () => {
    const { service, model } = makeService({ stored: storedKey() });
    await expect(service.verify("eyJhbGciOi.some.jwt")).resolves.toBeNull();
    expect(model.findByDigest).not.toHaveBeenCalled();
  });
});

describe("revocation", () => {
  it("reads a missing key id as not found", async () => {
    const { service } = makeService({ stored: null });
    await expect(
      service.revoke(session, "akey_missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("binds revocation to the trusted owner id", async () => {
    const { service, model } = makeService({
      stored: storedKey({ userId: "usr_other" }),
    });
    await expect(service.revoke(session, "akey_1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(model.revoke).toHaveBeenCalledWith(
      expect.anything(),
      "akey_1",
      "usr_1",
      expect.any(Date),
    );
  });

  it("is idempotent", async () => {
    const revokedAt = new Date("2026-01-02");
    const { service, model } = makeService({
      stored: storedKey({ revokedAt }),
    });
    const result = await service.revoke(session, "akey_1");
    expect(result.revokedAt).toEqual(revokedAt);
    expect(model.revoke).toHaveBeenCalledTimes(1);
    expect(model.findById).not.toHaveBeenCalled();
  });
});

describe("listing", () => {
  it("lists only the trusted user id supplied by the workflow", async () => {
    const { service, model } = makeService();
    await expect(service.list(session)).resolves.toHaveLength(1);
    expect(model.listByUserId).toHaveBeenCalledWith(expect.anything(), "usr_1");
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
