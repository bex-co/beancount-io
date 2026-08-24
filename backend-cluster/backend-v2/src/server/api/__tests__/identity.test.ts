import { SignJWT, exportJWK, generateKeyPair, type CryptoKey } from "jose";
import type { AppConfig } from "@/config/config";
import type { DatabaseLayer } from "@/foundation/composition";
import { API_SCOPES, resolveIdentity } from "../identity";

/**
 * `resolveIdentity` is the single authentication gate for GraphQL, REST, and
 * MCP (ADR 0006 D2), which makes it a single point of failure: if it is wrong,
 * all three surfaces are wrong together. These tests walk the credential ×
 * outcome matrix the ADR names as the P0 risk control.
 *
 * JWKS is fetched remotely in production; here the module is mocked to resolve
 * against a locally generated key pair.
 */

const ISSUER = "https://beancount.io";

// `mock`-prefixed so jest allows the module factory below to close over it; it
// is populated in beforeAll and read lazily, on the first token verification.
let mockLocalJwks: { keys: object[] };
let privateKey: CryptoKey;

/**
 * Counts how many times jose asks the key set to resolve a key. In production
 * `createRemoteJWKSet`'s resolver performs an HTTP request to our public /jwks
 * endpoint, so "was the resolver called?" is exactly "did this credential cost
 * a network round trip?". Asserting on `global.fetch` cannot see it here — the
 * key set is local in tests — which is why the counter lives inside the mock.
 */
let mockJwksLookups = 0;

jest.mock("jose", () => {
  const actual = jest.requireActual("jose");
  return {
    ...actual,
    createRemoteJWKSet: () => {
      const local = actual.createLocalJWKSet(mockLocalJwks);
      return (...args: unknown[]) => {
        mockJwksLookups += 1;
        return local(...args);
      };
    },
  };
});

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  privateKey = pair.privateKey;
  const pub = await exportJWK(pair.publicKey);
  pub.kid = "test-key";
  pub.alg = "ES256";
  mockLocalJwks = { keys: [pub] };
});

const config = {
  oauth: { issuer: ISSUER },
} as unknown as AppConfig;

/** A database layer whose JWT model accepts exactly one session token. */
function databaseAccepting(
  validSessionToken: string | null,
  userId = "user-session",
): DatabaseLayer {
  return {
    db: {} as DatabaseLayer["db"],
    models: {
      jwt: {
        verify: jest.fn(async (_db: unknown, token: string) =>
          validSessionToken && token === validSessionToken ? userId : null,
        ),
      },
    } as unknown as DatabaseLayer["models"],
  };
}

function request(headers: Record<string, string>) {
  return { headers };
}

async function mintOAuth(
  claims: Record<string, unknown>,
  {
    audience = `${ISSUER}/v1`,
    issuer = ISSUER,
    expiresIn = "1h",
    subject = "user-oauth",
  }: {
    audience?: string | null;
    issuer?: string;
    expiresIn?: string;
    subject?: string;
  } = {},
): Promise<string> {
  const signer = new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setIssuer(issuer)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(expiresIn);
  if (audience) signer.setAudience(audience);
  return signer.sign(privateKey);
}

describe("resolveIdentity — no credential", () => {
  it("returns undefined when no token is presented", async () => {
    const identity = await resolveIdentity(
      request({}),
      databaseAccepting(null),
      config,
    );
    expect(identity).toBeUndefined();
  });

  it("returns undefined for a bearer that is neither a valid OAuth token nor a session", async () => {
    const identity = await resolveIdentity(
      request({ authorization: "Bearer garbage.not.ajwt" }),
      databaseAccepting(null),
      config,
    );
    expect(identity).toBeUndefined();
  });
});

describe("resolveIdentity — session credential", () => {
  it("resolves a valid session JWT and marks it capability-exempt", async () => {
    const identity = await resolveIdentity(
      request({ authorization: "Bearer session-token" }),
      databaseAccepting("session-token"),
      config,
    );
    expect(identity).toMatchObject({
      userId: "user-session",
      method: "session",
      capabilityExempt: true,
    });
    // A browser session is full-power by construction, so it carries no scopes
    // rather than an implicit full set.
    expect(identity?.scopes.size).toBe(0);
    expect(identity?.ledgerScope).toBeUndefined();
  });

  it("returns undefined when the session row is gone (logout revokes by row)", async () => {
    const identity = await resolveIdentity(
      request({ authorization: "Bearer session-token" }),
      databaseAccepting(null),
      config,
    );
    expect(identity).toBeUndefined();
  });
});

describe("resolveIdentity — OAuth credential", () => {
  it("resolves an access token carrying the API audience", async () => {
    const token = await mintOAuth({
      scope: "ledger.read ledger.write",
      jti: "tok-1",
    });
    const identity = await resolveIdentity(
      request({ authorization: `Bearer ${token}` }),
      databaseAccepting(null),
      config,
    );
    expect(identity).toMatchObject({
      userId: "user-oauth",
      method: "oauth",
      capabilityExempt: false,
      tokenId: "tok-1",
    });
    expect([...(identity?.scopes ?? [])].sort()).toEqual([
      "ledger.read",
      "ledger.write",
    ]);
  });

  it("maps the ledger_id claim onto ledgerScope", async () => {
    const token = await mintOAuth({
      ledger_id: "alice/main",
      scope: "ledger.read",
    });
    const identity = await resolveIdentity(
      request({ authorization: `Bearer ${token}` }),
      databaseAccepting(null),
      config,
    );
    expect(identity?.ledgerScope).toBe("alice/main");
  });

  it("leaves ledgerScope unset for an unpinned grant", async () => {
    const token = await mintOAuth({ scope: "ledger.read" });
    const identity = await resolveIdentity(
      request({ authorization: `Bearer ${token}` }),
      databaseAccepting(null),
      config,
    );
    expect(identity?.userId).toBe("user-oauth");
    expect(identity?.ledgerScope).toBeUndefined();
  });

  it("strips the ledger suffix oidc-provider puts in sub", async () => {
    const token = await mintOAuth(
      { ledger_id: "alice/main" },
      { subject: "user-oauth:alice/main" },
    );
    const identity = await resolveIdentity(
      request({ authorization: `Bearer ${token}` }),
      databaseAccepting(null),
      config,
    );
    expect(identity?.userId).toBe("user-oauth");
  });

  it("rejects a token carrying an unexpected audience", async () => {
    const token = await mintOAuth({}, { audience: "https://other.example/x" });
    const identity = await resolveIdentity(
      request({ authorization: `Bearer ${token}` }),
      databaseAccepting(null),
      config,
    );
    expect(identity).toBeUndefined();
  });

  it("rejects a token without an audience", async () => {
    const token = await mintOAuth({}, { audience: null });
    await expect(
      resolveIdentity(
        request({ authorization: `Bearer ${token}` }),
        databaseAccepting(null),
        config,
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects the transitional MCP audience on GraphQL and REST", async () => {
    const token = await mintOAuth(
      {},
      { audience: `${ISSUER}/api-gateway/mcp` },
    );
    await expect(
      resolveIdentity(
        request({ authorization: `Bearer ${token}` }),
        databaseAccepting(null),
        config,
      ),
    ).resolves.toBeUndefined();
  });

  it("accepts only the API resource on the GraphQL and REST gate", async () => {
    const token = await mintOAuth({}, { audience: `${ISSUER}/v1` });
    const identity = await resolveIdentity(
      request({ authorization: `Bearer ${token}` }),
      databaseAccepting(null),
      config,
    );
    expect(identity?.method).toBe("oauth");
  });

  it("accepts the API and transitional legacy resource on the MCP gate", async () => {
    for (const audience of [`${ISSUER}/api-gateway/mcp`, `${ISSUER}/v1`]) {
      const token = await mintOAuth({ ledger_id: "alice/main" }, { audience });
      const identity = await resolveIdentity(
        request({ authorization: `Bearer ${token}` }),
        databaseAccepting(null),
        config,
        { oauthAudience: "mcp" },
      );
      expect(identity?.method).toBe("oauth");
    }
  });

  it("rejects a token from a different issuer", async () => {
    const token = await mintOAuth({}, { issuer: "https://evil.example" });
    const identity = await resolveIdentity(
      request({ authorization: `Bearer ${token}` }),
      databaseAccepting(null),
      config,
    );
    expect(identity).toBeUndefined();
  });

  it("rejects an expired token without throwing", async () => {
    const token = await mintOAuth({}, { expiresIn: "-1s" });
    await expect(
      resolveIdentity(
        request({ authorization: `Bearer ${token}` }),
        databaseAccepting(null),
        config,
      ),
    ).resolves.toBeUndefined();
  });

  it("does not fall through to the session model for a verified OAuth token", async () => {
    const database = databaseAccepting(null);
    const token = await mintOAuth({ scope: "ledger.read" });
    await resolveIdentity(
      request({ authorization: `Bearer ${token}` }),
      database,
      config,
    );
    expect(database.models.jwt.verify).not.toHaveBeenCalled();
  });
});

describe("resolveIdentity — only an OAuth-shaped token may reach the key set", () => {
  // Regression guard for a real defect found reviewing this change. Session
  // JWTs are HS256 and structurally valid, so trying the OAuth verifier on one
  // first made jose consult the remote key set — an HTTP request from this
  // process to our own public /jwks endpoint, out through the edge and back —
  // on the authentication path of EVERY signed-in dashboard and mobile request,
  // only to fail with ERR_JOSE_NOT_SUPPORTED afterwards. `isAsymmetricJwt` now
  // rules such a token out first.
  beforeEach(() => {
    mockJwksLookups = 0;
  });

  async function mintSessionShapedJwt(): Promise<string> {
    // Signed the way our session tokens are: symmetric, and a well-formed JWT.
    return new SignJWT({ sub: "user-session" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("app-secret-at-least-32-bytes-long!!"));
  }

  it("consults the key set for a genuine OAuth token (control)", async () => {
    // Without this the two assertions below would also pass if the counter were
    // simply never incremented — it pins that the counter can observe a lookup.
    const token = await mintOAuth({ scope: "ledger.read" });
    const identity = await resolveIdentity(
      request({ authorization: `Bearer ${token}` }),
      databaseAccepting(null),
      config,
    );
    expect(identity?.method).toBe("oauth");
    expect(mockJwksLookups).toBeGreaterThan(0);
  });

  it("resolves a session JWT without any key-set lookup", async () => {
    const sessionToken = await mintSessionShapedJwt();
    const identity = await resolveIdentity(
      request({ authorization: `Bearer ${sessionToken}` }),
      databaseAccepting(sessionToken),
      config,
    );
    expect(identity?.method).toBe("session");
    expect(mockJwksLookups).toBe(0);
  });

  it("rejects a non-JWT credential (git's Basic auth) without any key-set lookup", async () => {
    // The git proxy authenticates with Basic auth and now passes through the
    // shared identity middleware on every push and fetch.
    const identity = await resolveIdentity(
      request({ authorization: "Basic dXNlcjpwYXNz" }),
      databaseAccepting(null),
      config,
    );
    expect(identity).toBeUndefined();
    expect(mockJwksLookups).toBe(0);
  });
});

describe("resolveIdentity — bearer scheme casing", () => {
  // MCP used to parse its own Authorization header with a case-INSENSITIVE
  // regex. Routing it through the shared gate would have silently narrowed that
  // to case-sensitive, refusing third-party agents that send `bearer` — which
  // RFC 7235 explicitly permits, since auth-scheme is case-insensitive.
  it.each(["Bearer", "bearer", "BEARER"])(
    "accepts a %s-prefixed session token",
    async (scheme) => {
      const identity = await resolveIdentity(
        request({ authorization: `${scheme} session-token` }),
        databaseAccepting("session-token"),
        config,
      );
      expect(identity?.userId).toBe("user-session");
    },
  );

  it.each(["Bearer", "bearer"])(
    "accepts a %s-prefixed OAuth token",
    async (scheme) => {
      const token = await mintOAuth({ scope: "ledger.read" });
      const identity = await resolveIdentity(
        request({ authorization: `${scheme} ${token}` }),
        databaseAccepting(null),
        config,
      );
      expect(identity?.method).toBe("oauth");
    },
  );
});

describe("API scope vocabulary", () => {
  it("stays closed at three scopes", () => {
    // Deliberately pinned: a wider vocabulary is one nobody chooses correctly,
    // so every client ends up requesting all of it (ADR 0006 D3). Widening this
    // is a decision, not a drive-by.
    expect([...API_SCOPES]).toEqual([
      "ledger.read",
      "ledger.write",
      "ledger.admin",
    ]);
  });
});
