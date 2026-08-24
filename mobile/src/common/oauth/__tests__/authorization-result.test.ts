import {
  createPendingAuthorization,
  deserializePendingAuthorization,
  OAuthAuthorizationError,
  validateAuthorizationRedirect,
} from "../authorization-result";
import type { OAuthDiscovery } from "../discovery";

const discovery: OAuthDiscovery = {
  serverUrl: "https://books.example.test/",
  resource: "https://books.example.test/v1",
  issuer: "https://books.example.test",
  authorizationEndpoint: "https://books.example.test/oauth/auth",
  tokenEndpoint: "https://books.example.test/oauth/token",
  revocationEndpoint: "https://books.example.test/oauth/revoke",
};

const pending = createPendingAuthorization(discovery, {
  flow: "sign_in",
  redirectUri: "io.beancount.ios:/oauth/callback",
  state: "expected-state",
  codeVerifier: "verifier",
  createdAt: 1_000,
});

function failure(url: string): OAuthAuthorizationError | undefined {
  try {
    validateAuthorizationRedirect(url, pending, 2_000);
    return undefined;
  } catch (error) {
    return error as OAuthAuthorizationError;
  }
}

describe("authorization redirect validation", () => {
  it("accepts only a code with matching state, issuer, and callback", () => {
    expect(
      validateAuthorizationRedirect(
        "io.beancount.ios:/oauth/callback?code=opaque-code&state=expected-state&iss=https%3A%2F%2Fbooks.example.test",
        pending,
        2_000,
      ),
    ).toBe("opaque-code");
  });

  it("rejects state, issuer, redirect, and implicit-token mismatches", () => {
    for (const url of [
      "io.beancount.ios:/oauth/callback?code=c&state=wrong&iss=https%3A%2F%2Fbooks.example.test",
      "io.beancount.ios:/oauth/callback?code=c&state=expected-state&iss=https%3A%2F%2Fattacker.example",
      "io.beancount.android:/oauth/callback?code=c&state=expected-state&iss=https%3A%2F%2Fbooks.example.test",
      "io.beancount.ios:/oauth/callback?access_token=secret&code=c&state=expected-state&iss=https%3A%2F%2Fbooks.example.test",
    ]) {
      expect(failure(url)?.code).toBe("invalid_response");
    }
  });

  it("reports cancellation without creating a session", () => {
    const error = failure(
      "io.beancount.ios:/oauth/callback?error=access_denied&state=expected-state&iss=https%3A%2F%2Fbooks.example.test",
    );
    expect(error?.cancelled).toBe(true);
  });

  it("rejects an expired or replayed pending interaction", () => {
    const url =
      "io.beancount.ios:/oauth/callback?code=c&state=expected-state&iss=https%3A%2F%2Fbooks.example.test";
    expect(() =>
      validateAuthorizationRedirect(url, pending, 700_001),
    ).toThrow();
  });

  it("hydrates only an exact selected-server pending request", () => {
    expect(deserializePendingAuthorization(JSON.stringify(pending))).toEqual(
      pending,
    );
    expect(() =>
      deserializePendingAuthorization(
        JSON.stringify({
          ...pending,
          tokenEndpoint: "https://attacker.example/token",
        }),
      ),
    ).toThrow();
  });
});
