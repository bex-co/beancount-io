import { describe, expect, it } from "vitest";
import { mobileConsentSearchSchema } from "../mobile-consent-search";

const base = { uid: "abc_DEF-123", scope: "openid ledger.read" };

describe("mobile consent search params", () => {
  it("carries the sign-up hint the authorization server forwarded", () => {
    expect(
      mobileConsentSearchSchema.parse({ ...base, screen_hint: "signup" }),
    ).toEqual({ ...base, screen_hint: "signup" });
  });

  it("opens normally when there is no hint", () => {
    expect(mobileConsentSearchSchema.parse(base)).toEqual(base);
  });

  it("ignores a hand-typed hint instead of failing the interaction", () => {
    expect(
      mobileConsentSearchSchema.parse({ ...base, screen_hint: "login" }),
    ).toEqual(base);
  });
});
