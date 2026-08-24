import { createPendingAuthorization } from "../authorization-result";
import { createOAuthSessionFromCode } from "../code-exchange";
import type { OAuthDiscovery } from "../discovery";

const issuer = "https://books.example.test";
const discovery: OAuthDiscovery = {
  serverUrl: `${issuer}/`,
  resource: `${issuer}/v1`,
  issuer,
  authorizationEndpoint: `${issuer}/api-gateway/oauth/auth`,
  tokenEndpoint: `${issuer}/api-gateway/oauth/token`,
  revocationEndpoint: `${issuer}/api-gateway/oauth/revoke`,
};

const pending = createPendingAuthorization(discovery, {
  flow: "sign_in",
  redirectUri: "io.beancount.android:/oauth/callback",
  state: "state",
  codeVerifier: "secret-verifier",
  createdAt: 1_000,
});

describe("OAuth code exchange", () => {
  it("uses PKCE/resource and resolves the user through an authenticated API query", async () => {
    const requests: Array<{ url: string; options?: RequestInit }> = [];
    const fetcher = (async (
      input: RequestInfo | URL,
      options?: RequestInit,
    ) => {
      requests.push({ url: String(input), options });
      if (String(input) === pending.tokenEndpoint) {
        return {
          ok: true,
          json: async () => ({
            access_token: "opaque-access-without-claims",
            refresh_token: "opaque-refresh",
            token_type: "Bearer",
            expires_in: 3600,
            scope:
              "openid offline_access ledger.read ledger.write ledger.admin",
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ data: { userProfile: { id: "user-1" } } }),
      } as Response;
    }) as typeof fetch;

    const session = await createOAuthSessionFromCode(
      pending,
      "authorization-code",
      fetcher,
      10_000,
    );

    const exchangeBody = new URLSearchParams(
      requests[0].options?.body as string,
    );
    expect(exchangeBody.get("code_verifier")).toBe("secret-verifier");
    expect(exchangeBody.get("resource")).toBe(pending.resource);
    expect(exchangeBody.get("redirect_uri")).toBe(pending.redirectUri);
    expect(requests[1].options?.headers).toEqual({
      "content-type": "application/json",
      "x-app-id": "beancount-mobile",
      authorization: "Bearer opaque-access-without-claims",
    });
    expect(session.kind).toBe("oauth");
    expect(session.userId).toBe("user-1");
    expect(session.accessToken).toBe("opaque-access-without-claims");
    expect(session.refreshToken).toBe("opaque-refresh");
    expect(session.accessTokenExpiresAt).toBe(3_610_000);
  });

  it("rejects a response missing any requested scope", async () => {
    const fetcher = (async () =>
      ({
        ok: true,
        json: async () => ({
          access_token: "opaque-access",
          refresh_token: "opaque-refresh",
          token_type: "Bearer",
          expires_in: 3600,
          scope: "openid ledger.read",
        }),
      }) as Response) as typeof fetch;

    let failed = false;
    try {
      await createOAuthSessionFromCode(pending, "code", fetcher);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  it("rejects unsolicited scopes and non-finite expiries", async () => {
    for (const responseBody of [
      {
        access_token: "opaque-access",
        refresh_token: "opaque-refresh",
        token_type: "Bearer",
        expires_in: 3600,
        scope:
          "openid offline_access ledger.read ledger.write ledger.admin unexpected.scope",
      },
      {
        access_token: "opaque-access",
        refresh_token: "opaque-refresh",
        token_type: "Bearer",
        expires_in: Number.POSITIVE_INFINITY,
      },
    ]) {
      const fetcher = (async () =>
        ({
          ok: true,
          json: async () => responseBody,
        }) as Response) as typeof fetch;

      let failed = false;
      try {
        await createOAuthSessionFromCode(pending, "code", fetcher);
      } catch {
        failed = true;
      }
      expect(failed).toBe(true);
    }
  });
});
