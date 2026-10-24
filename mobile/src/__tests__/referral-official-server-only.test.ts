import fs from "fs";
import path from "path";
import { isOfficialServerUrl } from "../common/server-url-validation";

// w21/916: on a self-hosted server Settings still offered Invite Friends, which
// shares the hosted service's sign-up link carrying the local user's id.
describe("Invite Friends", () => {
  const read = (...parts: string[]) =>
    fs
      .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
      .replace(/\s+/g, "");

  it("tells the hosted service from a self-hosted one", () => {
    expect(isOfficialServerUrl("https://beancount.io")).toBe(true);
    expect(isOfficialServerUrl("https://ledger.example.com")).toBe(false);
  });

  it("is left out of Settings, and the route redirects, unless the server is the hosted one", () => {
    expect(
      read(
        "src",
        "screens",
        "referral-screen",
        "components",
        "invite-section.tsx",
      ).includes("if(!isOfficialServerUrl(getServerUrl()))returnnull;"),
    ).toBe(true);
    const route = read("app", "(app)", "referral.tsx");
    expect(
      route.includes(
        'if(!isOfficialServerUrl(getServerUrl())){return<Redirecthref="/(app)/(tabs)"/>;}',
      ),
    ).toBe(true);
  });
});
