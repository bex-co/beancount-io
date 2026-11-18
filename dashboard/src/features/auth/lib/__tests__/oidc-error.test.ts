import { describe, expect, it } from "vitest";
import { oidcErrorKey, oidcErrorSearch } from "../oidc-error";

describe("oidcErrorSearch", () => {
  it("shows a not-allowed email from the backend", () => {
    const code = oidcErrorSearch().parse("not_allowed");
    expect(code && oidcErrorKey(code)).toBe("auth.oidcErrorNotAllowed");
  });
});
