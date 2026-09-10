import { redirect } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn((input: unknown) => {
    const error = new Error("REDIRECT") as Error & { data: unknown };
    error.data = input;
    return error;
  }),
}));

import { getSafeRedirectPath, requireAuth } from "../auth";

describe("getSafeRedirectPath", () => {
  it("accepts same-origin relative paths including query and hash", () => {
    expect(getSafeRedirectPath("/settings/api-keys?lang=en")).toBe(
      "/settings/api-keys?lang=en",
    );
    expect(getSafeRedirectPath("/settings/ssh-keys#keys")).toBe(
      "/settings/ssh-keys#keys",
    );
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(getSafeRedirectPath("https://evil.example/x")).toBeUndefined();
    expect(getSafeRedirectPath("//evil.example")).toBeUndefined();
    expect(getSafeRedirectPath("/\\evil.example")).toBeUndefined();
  });
});

describe("requireAuth", () => {
  it("sends guests to login with the requested settings subpage as next", () => {
    const guard = requireAuth("/settings");
    expect(() =>
      guard({
        context: { userProfile: null },
        location: {
          pathname: "/settings/api-keys",
          searchStr: "?lang=en",
          hash: "",
        },
      }),
    ).toThrow("REDIRECT");
    expect(redirect).toHaveBeenCalledWith({
      to: "/auth/login",
      search: { next: "/settings/api-keys?lang=en" },
    });
  });

  it("falls back to the configured path when location is empty", () => {
    const guard = requireAuth("/ledger");
    expect(() =>
      guard({
        context: { userProfile: null },
        location: { pathname: "", searchStr: "", hash: "" },
      }),
    ).toThrow("REDIRECT");
    expect(redirect).toHaveBeenCalledWith({
      to: "/auth/login",
      search: { next: "/ledger" },
    });
  });

  it("allows authenticated visitors through", () => {
    const guard = requireAuth("/settings");
    expect(() =>
      guard({
        context: { userProfile: { id: "u1" } },
        location: {
          pathname: "/settings/api-keys",
          searchStr: "",
          hash: "",
        },
      }),
    ).not.toThrow();
  });
});
