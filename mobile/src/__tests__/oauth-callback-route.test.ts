import fs from "fs";
import path from "path";

/**
 * Static guardrail: `beancount:///oauth/callback` with no authorization
 * response is not a sign-in in progress. It used to render "Sign In /
 * loading…" forever with no way out, because the failure card was gated on a
 * completion that never started.
 */
describe("OAuth callback route without a callback URL", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "..", "app", "oauth", "callback.tsx"),
    "utf8",
  );

  it("sends a signed-in arrival back into the app", () => {
    const guard = source.indexOf("if (!callbackUrl && signedIn) {");
    expect(guard === -1).toBe(false);
    expect(
      source.indexOf('<Redirect href="/(app)/(tabs)" />', guard) > guard,
    ).toBe(true);
  });

  it("shows the failure card, with its button, to everyone else", () => {
    expect(source.includes("const showFailure = failed || !callbackUrl;")).toBe(
      true,
    );
    expect(source.includes("{showFailure ? (")).toBe(true);
    expect(source.includes("{!failed ?")).toBe(false);
  });
});
