import {
  apiResourceForServer,
  discoverOAuthServer,
  OAuthDiscoveryError,
} from "../discovery";

const serverUrl = "https://books.example.test/beancount/";
const issuer = "https://books.example.test/beancount";
const resource = `${issuer}/v1`;

function response(body: object): Response {
  return { ok: true, json: async () => body } as Response;
}

function successfulFetch(calls: string[]): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("oauth-protected-resource")) {
      return response({
        resource,
        authorization_servers: [issuer],
        scopes_supported: ["ledger.read", "ledger.write", "ledger.admin"],
      });
    }
    return response({
      issuer,
      authorization_endpoint: `${issuer}/api-gateway/oauth/auth`,
      token_endpoint: `${issuer}/api-gateway/oauth/token`,
      revocation_endpoint: `${issuer}/api-gateway/oauth/revoke`,
      userinfo_endpoint: `${issuer}/api-gateway/oauth/me`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      scopes_supported: [
        "openid",
        "offline_access",
        "ledger.read",
        "ledger.write",
        "ledger.admin",
      ],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      authorization_response_iss_parameter_supported: true,
    });
  }) as typeof fetch;
}

async function expectFailure(promise: Promise<unknown>): Promise<void> {
  let failed = false;
  try {
    await promise;
  } catch {
    failed = true;
  }
  expect(failed).toBe(true);
}

describe("OAuth discovery", () => {
  it("derives path-aware RFC 9728 and RFC 8414 URLs", async () => {
    const calls: string[] = [];
    const result = await discoverOAuthServer(serverUrl, successfulFetch(calls));

    expect(apiResourceForServer(serverUrl)).toBe(resource);
    expect(calls).toEqual([
      "https://books.example.test/.well-known/oauth-protected-resource/beancount/v1",
      "https://books.example.test/.well-known/oauth-authorization-server/beancount",
    ]);
    expect(result).toEqual({
      serverUrl,
      resource,
      issuer,
      authorizationEndpoint: `${issuer}/api-gateway/oauth/auth`,
      tokenEndpoint: `${issuer}/api-gateway/oauth/token`,
      revocationEndpoint: `${issuer}/api-gateway/oauth/revoke`,
    });
  });

  it("rejects a protected-resource mismatch", async () => {
    const fetcher = (async () =>
      response({
        resource: "https://attacker.example/api",
        authorization_servers: [issuer],
        scopes_supported: ["ledger.read", "ledger.write", "ledger.admin"],
      })) as typeof fetch;
    await expectFailure(discoverOAuthServer(serverUrl, fetcher));
  });

  it("rejects an issuer mismatch before following metadata", async () => {
    const fetcher = (async () =>
      response({
        resource,
        authorization_servers: ["https://beancount.io"],
        scopes_supported: ["ledger.read", "ledger.write", "ledger.admin"],
      })) as typeof fetch;
    await expectFailure(discoverOAuthServer(serverUrl, fetcher));
  });

  it("rejects wrong-origin endpoints, implicit flow, and missing S256", async () => {
    for (const mutate of [
      (metadata: Record<string, unknown>) => {
        metadata.token_endpoint = "https://attacker.example/token";
      },
      (metadata: Record<string, unknown>) => {
        metadata.response_types_supported = ["code", "token"];
      },
      (metadata: Record<string, unknown>) => {
        metadata.code_challenge_methods_supported = ["plain"];
      },
    ]) {
      const base = successfulFetch([]);
      let call = 0;
      const fetcher = (async (input: RequestInfo | URL) => {
        const original = await base(input);
        call += 1;
        if (call === 1) return original;
        const metadata = (await original.json()) as Record<string, unknown>;
        mutate(metadata);
        return response(metadata);
      }) as typeof fetch;
      await expectFailure(discoverOAuthServer(serverUrl, fetcher));
    }
  });

  it("tells a dead host apart from a live server that is not Beancount.io", async () => {
    const kindOf = async (fetcher: typeof fetch): Promise<string> => {
      try {
        await discoverOAuthServer(serverUrl, fetcher);
        return "resolved";
      } catch (error: unknown) {
        return error instanceof OAuthDiscoveryError ? error.kind : "other";
      }
    };

    expect(
      await kindOf((async () => {
        throw new TypeError("Network request failed");
      }) as typeof fetch),
    ).toBe("unreachable");
    expect(
      await kindOf(
        (async () =>
          ({ ok: false, json: async () => ({}) }) as Response) as typeof fetch,
      ),
    ).toBe("incompatible");
  });
});
