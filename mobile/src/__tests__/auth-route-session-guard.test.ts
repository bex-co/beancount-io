import fs from "fs";
import path from "path";

/**
 * Static guardrail: the signed-out auth screens turn a signed-in arrival away.
 * Both render without a back control, so a URL that opened them for a
 * signed-in user (`beancount:///auth/welcome`) left no way back into the app.
 */
const MOBILE_ROOT = path.join(__dirname, "..", "..");
const read = (file: string) =>
  fs.readFileSync(path.join(MOBILE_ROOT, file), "utf8");

describe("auth route session guard", () => {
  const routes = [
    ["welcome", "<WelcomeScreen />"],
    ["server", "<ServerSettingsScreen />"],
  ] as const;

  for (const [name, screen] of routes) {
    it(`sends a signed-in arrival at auth/${name} to the tabs before rendering`, () => {
      const source = read(`app/auth/${name}.tsx`);
      const redirect = source.indexOf('<Redirect href="/(app)/(tabs)" />');
      expect(source.includes("useSignedInOnArrival()")).toBe(true);
      expect(redirect !== -1 && redirect < source.indexOf(screen)).toBe(true);
    });
  }

  it("checks the session on arrival, not whenever it changes", () => {
    // Native sign-in sets the session while Welcome is focused; a reactive
    // redirect would beat finalizeOAuthSignIn's ledger selection and pending
    // app link into the tabs.
    const hook = read("src/common/hooks/use-signed-in-on-arrival.ts");
    const focus = hook.slice(hook.indexOf("useFocusEffect("));
    expect(hook.includes("useReactiveVar")).toBe(false);
    expect(focus.includes("setSignedIn(Boolean(sessionVar()))")).toBe(true);
  });
});
