import { buildAuthorizationUrl } from "../authorization-url";
import type { PendingOAuthAuthorization } from "../authorization-result";

const issuer = "https://books.example.test";

function pending(
  flow: PendingOAuthAuthorization["flow"],
): PendingOAuthAuthorization {
  return {
    serverUrl: `${issuer}/`,
    resource: `${issuer}/v1`,
    issuer,
    authorizationEndpoint: `${issuer}/api-gateway/oauth/auth`,
    tokenEndpoint: `${issuer}/api-gateway/oauth/token`,
    revocationEndpoint: `${issuer}/api-gateway/oauth/revoke`,
    flow,
    clientId: "beancount-mobile",
    scopes: ["openid", "offline_access", "ledger.read"],
    redirectUri: "io.beancount.ios:/oauth/callback",
    state: "state-value",
    codeVerifier: "verifier-value",
    createdAt: Date.now(),
  };
}

describe("buildAuthorizationUrl", () => {
  it("tells the server the user tapped Sign Up, exactly once", () => {
    const url = new URL(buildAuthorizationUrl(pending("sign_up"), "challenge"));
    expect(url.searchParams.getAll("screen_hint")).toEqual(["signup"]);
  });

  it("sends no hint for Sign In", () => {
    const url = new URL(buildAuthorizationUrl(pending("sign_in"), "challenge"));
    expect(url.searchParams.has("screen_hint")).toBe(false);
  });

  it("changes nothing else between the two flows", () => {
    const signIn = new URL(buildAuthorizationUrl(pending("sign_in"), "c"));
    const signUp = new URL(buildAuthorizationUrl(pending("sign_up"), "c"));
    signUp.searchParams.delete("screen_hint");
    expect(signUp.toString()).toBe(signIn.toString());
    expect(signIn.searchParams.get("prompt")).toBe("consent");
    expect(signIn.searchParams.get("code_challenge_method")).toBe("S256");
  });
});
