import { SignJWT, exportJWK, generateKeyPair } from "jose";
import type { AppConfig } from "@/config/config";
import type { DatabaseLayer } from "@/foundation/composition";
import type { ApiKey } from "@/features/apikeys/data/api-key-model";
import { apiKeyDigest } from "@/features/apikeys/service/api-key-service";
import {
  TokenIntrospectionService,
  type IntrospectionResult,
} from "../service/token-introspection-service";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  type IAuthorizationService,
} from "@/server/api/authorization";
import { ForbiddenError } from "@/shared/errors";

/**
 * Introspection over all three credential kinds (ADR 0017).
 *
 * The valuable tests here are the negative ones. This endpoint reports on
 * credentials, so every way it can be wrong is a way it leaks: an answer that
 * distinguishes "revoked" from "never existed" is an oracle, an answer about
 * someone else's token is a cross-tenant oracle, and an unauthenticated caller
 * receiving `{active: false}` means the endpoint answers to anyone at all.
 */

const ISSUER = "https://beancount.io";
const AUDIENCE = `${ISSUER}/v1`;
const KEY_PLAINTEXT = "bcio_7wXzK9mNpQrSt2VxYaBcDeF3gH4jK5mN";
const SESSION_TOKEN = "session-token-for-usr_1";

const CALLER: Identity = {
  userId: "usr_1",
  principal: { type: "user", id: "usr_1" },
  method: "session",
  scopes: new Set(),
  capabilities: new Set(["read", "write", "admin"]),
  assurance: { type: "interactive" },
};

let privateKey: CryptoKey;
let jwks: { keys: object[] };

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  privateKey = pair.privateKey;
  const pub = await exportJWK(pair.publicKey);
  pub.kid = "test-key";
  pub.alg = "ES256";
  jwks = { keys: [pub] };
});

function configWith(oauth: boolean): AppConfig {
  return {
    jwt: { secret: "s" },
    oauth: oauth ? { issuer: ISSUER, jwks } : {},
  } as unknown as AppConfig;
}

const liveKey: ApiKey = {
  id: "akey_1",
  userId: "usr_1",
  name: "CI",
  keyDigest: apiKeyDigest(KEY_PLAINTEXT),
  keyPrefix: KEY_PLAINTEXT.slice(0, 13),
  scopes: ["ledger.read"],
  ledgerScope: "alice/main",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  expiresAt: new Date("2027-01-01T00:00:00Z"),
};

interface Fixture {
  service: TokenIntrospectionService;
  touchLastUsedAt: jest.Mock;
  authorize: jest.Mock;
  /** The id this fixture's key was given, for assertions that name it. */
  keyId: string;
}

let keySequence = 0;

function fixture(
  options: {
    key?: ApiKey | null;
    session?: { userId: string } | null;
    oauth?: boolean;
    authorizeThrows?: Error;
  } = {},
): Fixture {
  const {
    key: requestedKey = liveKey,
    session = { userId: "usr_1" },
    oauth = true,
  } = options;
  // Every fixture gets a fresh key id. `stampLastUsed` throttles per key id in
  // a module-level map that outlives a single test, so a shared id would let an
  // earlier test's stamp suppress a later one — and the "does not record" test
  // would pass against an implementation that records. It did, until this.
  const key = requestedKey
    ? { ...requestedKey, id: `akey_${++keySequence}` }
    : null;
  const touchLastUsedAt = jest.fn(async () => undefined);
  const database = {
    db: {} as DatabaseLayer["db"],
    models: {
      jwt: {
        verify: jest.fn(async (_db: unknown, token: string) =>
          session && token === SESSION_TOKEN
            ? {
                userId: session.userId,
                issuedAt: 1_700_000_000,
                expiresAt: 1_800_000_000,
              }
            : null,
        ),
      },
      apiKey: {
        findByDigest: jest.fn(async (_db: unknown, digest: string) =>
          key && key.keyDigest === digest ? key : null,
        ),
        touchLastUsedAt,
      },
    } as unknown as DatabaseLayer["models"],
  } satisfies DatabaseLayer;

  const authorize = jest.fn(async () => {
    if (options.authorizeThrows) throw options.authorizeThrows;
  });

  return {
    touchLastUsedAt,
    authorize,
    keyId: key?.id ?? "",
    service: new TokenIntrospectionService({
      database,
      config: configWith(oauth),
      authorization: {
        authorizeOrThrow: authorize,
      } as unknown as IAuthorizationService,
    }),
  };
}

async function mintOAuthToken(
  claims: Record<string, unknown> = {},
): Promise<string> {
  return new SignJWT({ scope: "ledger.read ledger.write", ...claims })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject("usr_1")
    .setJti("tok_1")
    .setIssuedAt(1_700_000_000)
    .setExpirationTime(1_800_000_000)
    .sign(privateKey);
}

describe("introspecting a live credential", () => {
  it("describes an API key, including its expiry and ledger ceiling", async () => {
    const { service, keyId } = fixture();

    await expect(
      service.introspect(CALLER, { token: KEY_PLAINTEXT }),
    ).resolves.toMatchObject({
      active: true,
      sub: "usr_1",
      jti: keyId,
      bio_credential_kind: "apikey",
      bio_assurance: "delegated",
      bio_ledger_scope: "alice/main",
      // The key's own lifetime, which `Identity` carried nowhere before m44.
      iat: Math.floor(liveKey.createdAt.getTime() / 1000),
      exp: Math.floor(liveKey.expiresAt!.getTime() / 1000),
    });
  });

  it("describes an OAuth access token with its client and jti", async () => {
    const { service } = fixture();
    const token = await mintOAuthToken({ client_id: "cli_1" });

    await expect(service.introspect(CALLER, { token })).resolves.toMatchObject({
      active: true,
      sub: "usr_1",
      client_id: "cli_1",
      jti: "tok_1",
      bio_credential_kind: "oauth",
      bio_assurance: "delegated",
      iat: 1_700_000_000,
      exp: 1_800_000_000,
    });
  });

  it("describes a session token", async () => {
    const { service } = fixture();

    await expect(
      service.introspect(CALLER, { token: SESSION_TOKEN }),
    ).resolves.toMatchObject({
      active: true,
      sub: "usr_1",
      bio_credential_kind: "session",
      bio_assurance: "interactive",
      iat: 1_700_000_000,
      exp: 1_800_000_000,
    });
  });

  it("reports a ledger pin only when the credential actually has one", async () => {
    const { service } = fixture({
      key: { ...liveKey, ledgerScope: undefined },
    });

    const result = await service.introspect(CALLER, { token: KEY_PLAINTEXT });
    expect(result.active).toBe(true);
    expect(result).not.toHaveProperty("bio_ledger_scope");
  });

  it("omits exp for a key minted without an expiry rather than inventing one", async () => {
    const { service } = fixture({ key: { ...liveKey, expiresAt: undefined } });

    const result = await service.introspect(CALLER, { token: KEY_PLAINTEXT });
    expect(result.active).toBe(true);
    expect(result).not.toHaveProperty("exp");
  });
});

describe("the scope field reports capability, not the raw grant", () => {
  // ADR 0017 D3. A session carries an empty `scopes` set and full capability.
  // Reporting the set literally would tell a gateway a signed-in user may do
  // nothing, and it would deny every dashboard request in production.
  it("reports all three scopes for a session, which holds no scopes", async () => {
    const { service } = fixture();

    const result = await service.introspect(CALLER, { token: SESSION_TOKEN });

    expect(result.scope).toBe("ledger.read ledger.write ledger.admin");
  });

  it("reports what an API key was actually granted", async () => {
    const { service } = fixture();

    const result = await service.introspect(CALLER, { token: KEY_PLAINTEXT });

    // `ledger.read` alone: a read grant does not imply write or admin.
    expect(result.scope).toBe("ledger.read");
  });

  it("widens to the operations a stronger grant satisfies", async () => {
    const { service } = fixture({
      key: { ...liveKey, scopes: ["ledger.admin"] },
    });

    const result = await service.introspect(CALLER, { token: KEY_PLAINTEXT });

    // admin satisfies read and write, so all three operations are reachable.
    expect(result.scope).toBe("ledger.read ledger.write ledger.admin");
  });
});

describe("a credential that is not usable", () => {
  const INACTIVE: IntrospectionResult = { active: false };

  it("reports a revoked key inactive, and says nothing else", async () => {
    const { service } = fixture({
      key: { ...liveKey, revokedAt: new Date("2026-02-01") },
    });

    await expect(
      service.introspect(CALLER, { token: KEY_PLAINTEXT }),
    ).resolves.toEqual(INACTIVE);
  });

  it("reports a logged-out session inactive", async () => {
    // `jwt.verify` returns null once the row is gone, which is what logout does.
    const { service } = fixture({ session: null });

    await expect(
      service.introspect(CALLER, { token: SESSION_TOKEN }),
    ).resolves.toEqual(INACTIVE);
  });

  it("cannot be told apart: expired, malformed, and garbage", async () => {
    const expired = fixture({
      key: { ...liveKey, expiresAt: new Date("2000-01-01") },
    });
    const live = fixture();

    // Asserted on the whole body, not just `active`. A leaked
    // `error_description` would pass an `active === false` check and still be
    // the oracle this is guarding against.
    const answers = await Promise.all([
      expired.service.introspect(CALLER, { token: KEY_PLAINTEXT }),
      live.service.introspect(CALLER, { token: "bcio_never-minted-key" }),
      live.service.introspect(CALLER, { token: "not-a-token-at-all" }),
      live.service.introspect(CALLER, { token: "" }),
    ]);

    for (const answer of answers) expect(answer).toEqual(INACTIVE);
  });

  it("refuses an OAuth token signed by someone else", async () => {
    const { service } = fixture();
    const otherPair = await generateKeyPair("ES256", { extractable: true });
    const forged = await new SignJWT({ scope: "ledger.admin" })
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject("usr_1")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(otherPair.privateKey);

    await expect(
      service.introspect(CALLER, { token: forged }),
    ).resolves.toEqual(INACTIVE);
  });
});

describe("you may introspect your own credentials, and only your own", () => {
  // ADR 0017 D2. Without this, any caller could probe whether a captured token
  // is live and learn the moment it was revoked.
  it("reports another user's live key as inactive", async () => {
    const { service } = fixture({ key: { ...liveKey, userId: "usr_2" } });

    await expect(
      service.introspect(CALLER, { token: KEY_PLAINTEXT }),
    ).resolves.toEqual({ active: false });
  });

  it("reports another user's live session as inactive", async () => {
    const { service } = fixture({ session: { userId: "usr_2" } });

    await expect(
      service.introspect(CALLER, { token: SESSION_TOKEN }),
    ).resolves.toEqual({ active: false });
  });

  it("gives someone else's live token the same answer as a garbage one", async () => {
    const other = fixture({ key: { ...liveKey, userId: "usr_2" } });
    const live = fixture();

    expect(
      await other.service.introspect(CALLER, { token: KEY_PLAINTEXT }),
    ).toEqual(await live.service.introspect(CALLER, { token: "garbage" }));
  });
});

describe("the caller's own authority", () => {
  it("checks the caller before it looks at the submitted token", async () => {
    // ADR 0017 D6: a caller who cannot authorize must get an error, never
    // `{active: false}` — the latter would mean the endpoint answers to anyone
    // and an attacker would read it as "not live" and keep probing.
    const { service, authorize } = fixture({
      authorizeThrows: new ForbiddenError("nope"),
    });

    await expect(
      service.introspect(CALLER, { token: KEY_PLAINTEXT }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(authorize).toHaveBeenCalled();
  });

  it("asks the PDP for the introspection action against the caller", async () => {
    const { service, authorize } = fixture();

    await service.introspect(CALLER, { token: KEY_PLAINTEXT });

    expect(authorize).toHaveBeenCalledWith(
      expect.objectContaining({
        principal: CALLER,
        action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_INTROSPECT,
      }),
    );
  });
});

describe("introspection observes without recording", () => {
  it("does not stamp lastUsedAt when asked about a key", async () => {
    // ADR 0017 D8. Asserted on the model call rather than the timestamp: the
    // stamp is throttled per process, so a timestamp assertion would pass by
    // accident whenever the window happened to be open.
    const { service, touchLastUsedAt } = fixture();

    await service.introspect(CALLER, { token: KEY_PLAINTEXT });

    expect(touchLastUsedAt).not.toHaveBeenCalled();
  });
});

describe("a deployment with no OAuth configured", () => {
  // ADR 0017 D10. API keys and session tokens exist on a deployment that never
  // configured OAuth signing keys, and they are the kinds most needing this.
  it("still introspects an API key", async () => {
    const { service } = fixture({ oauth: false });

    await expect(
      service.introspect(CALLER, { token: KEY_PLAINTEXT }),
    ).resolves.toMatchObject({ active: true, bio_credential_kind: "apikey" });
  });

  it("still introspects a session token", async () => {
    const { service } = fixture({ oauth: false });

    await expect(
      service.introspect(CALLER, { token: SESSION_TOKEN }),
    ).resolves.toMatchObject({ active: true, bio_credential_kind: "session" });
  });

  it("reports an OAuth token inactive, which is true there", async () => {
    const { service } = fixture({ oauth: false });
    const token = await mintOAuthToken();

    await expect(service.introspect(CALLER, { token })).resolves.toEqual({
      active: false,
    });
  });
});

describe("token_type_hint", () => {
  it("is accepted and does not change the answer", async () => {
    const { service } = fixture();

    const withHint = await service.introspect(CALLER, {
      token: KEY_PLAINTEXT,
      token_type_hint: "refresh_token",
    });
    const withoutHint = await service.introspect(CALLER, {
      token: KEY_PLAINTEXT,
    });

    // A wrong hint must not be able to make a live credential read as dead.
    expect(withHint).toEqual(withoutHint);
    expect(withHint.active).toBe(true);
  });
});
