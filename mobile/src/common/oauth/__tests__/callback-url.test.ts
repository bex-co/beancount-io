import { callbackUrlFromParams } from "../callback-url";

const redirect = "io.beancount.ios:/oauth/callback";

describe("callbackUrlFromParams", () => {
  it("puts the parsed params back on the registered redirect URI", () => {
    const url = callbackUrlFromParams(redirect, {
      code: "abc",
      state: "xyz",
      iss: "http://localhost:42601",
    });
    const parsed = new URL(url!);
    expect(parsed.protocol).toBe("io.beancount.ios:");
    expect(parsed.pathname).toBe("/oauth/callback");
    expect(parsed.searchParams.get("code")).toBe("abc");
    expect(parsed.searchParams.get("state")).toBe("xyz");
    expect(parsed.searchParams.get("iss")).toBe("http://localhost:42601");
  });

  it("keeps a repeated param repeated so the single-value checks still fail closed", () => {
    const url = callbackUrlFromParams(redirect, {
      state: ["a", "b"],
      code: "c",
    });
    expect(new URL(url!).searchParams.getAll("state")).toEqual(["a", "b"]);
  });

  it("yields nothing for a route mounted without any params", () => {
    expect(callbackUrlFromParams(redirect, {})).toBe(null);
    expect(callbackUrlFromParams(redirect, { code: undefined })).toBe(null);
  });
});
