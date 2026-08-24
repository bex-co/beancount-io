import { deserializeSession, type OAuthSession } from "../session-record";

const oauth: OAuthSession = {
  kind: "oauth",
  serverUrl: "https://books.example.test/",
  issuer: "https://books.example.test",
  resource: "https://books.example.test/v1",
  tokenEndpoint: "https://books.example.test/api-gateway/oauth/token",
  revocationEndpoint: "https://books.example.test/api-gateway/oauth/revoke",
  clientId: "beancount-mobile",
  userId: "user-1",
  scopes: ["ledger.read"],
  tokenType: "Bearer",
  accessToken: "opaque-access",
  accessTokenExpiresAt: 123_456,
  refreshToken: "opaque-refresh",
};

describe("session hydration", () => {
  it("hydrates a complete OAuth session without decoding either token", () => {
    expect(deserializeSession(JSON.stringify(oauth))).toEqual(oauth);
  });

  it("migrates an installed pre-discriminator session to legacy", () => {
    expect(
      deserializeSession(
        JSON.stringify({
          userId: "user-old",
          authToken: "legacy-token",
          serverUrl: "https://beancount.io/",
        }),
      ),
    ).toEqual({
      kind: "legacy",
      userId: "user-old",
      authToken: "legacy-token",
      serverUrl: "https://beancount.io/",
    });
  });

  it("rejects partial OAuth credentials rather than guessing defaults", () => {
    let failed = false;
    try {
      deserializeSession(JSON.stringify({ ...oauth, refreshToken: undefined }));
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  it("rejects a non-finite stored token expiry", () => {
    expect(() =>
      deserializeSession(
        JSON.stringify({ ...oauth, accessTokenExpiresAt: "Infinity" }),
      ),
    ).toThrow("Stored OAuth session is invalid");
  });
});
