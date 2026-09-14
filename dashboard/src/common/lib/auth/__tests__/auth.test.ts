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

  it("rejects control characters that browsers strip before resolving", () => {
    // new URL("/\t/evil.example/p", base).href === "https://evil.example/p"
    expect(getSafeRedirectPath("/\t/evil.example/probe")).toBeUndefined();
    expect(getSafeRedirectPath("/\t\\evil.example/probe")).toBeUndefined();
    expect(getSafeRedirectPath("/\n/evil.example")).toBeUndefined();
    expect(getSafeRedirectPath("/\r/evil.example")).toBeUndefined();
    expect(getSafeRedirectPath("/\u0000/evil.example")).toBeUndefined();
    expect(getSafeRedirectPath("/\u007F/evil.example")).toBeUndefined();
  });

  it.each([
    "/%09/evil.example",
    "/%0d/evil.example",
    "/%0a/evil.example",
    "/%0A/evil.example",
    "/%00/evil.example",
    "/%5cevil.example",
    "/%5Cevil.example",
    "/%2f%2fevil.example",
    "/%2509/evil.example",
    "/%250A/evil.example",
    "/ledger/..%2f%2fevil.example",
  ])("rejects %s, which escapes once a layer decodes it", (next) => {
    expect(getSafeRedirectPath(next)).toBeUndefined();
  });

  it("does not let a malformed escape later in the value end the checks", () => {
    expect(getSafeRedirectPath("/%09/evil.example?q=100%")).toBeUndefined();
    expect(getSafeRedirectPath("/%zz/%09/evil.example")).toBeUndefined();
  });

  it("rejects a path still decoding after the maximum depth", () => {
    expect(getSafeRedirectPath("/ledger%2525252520x")).toBeUndefined();
  });

  it("keeps percent-encoded characters in legitimate destinations", () => {
    for (const next of [
      "/ledger/owner/My%20Ledger#top",
      "/ledger/owner/books/query?q=SELECT%20account%0AFROM%20accounts",
      "/ledger/owner/books/files?path=reports%2F2026.bean",
      "/ledger/owner/books/files?path=100%",
    ]) {
      expect(getSafeRedirectPath(next)).toBe(next);
    }
  });

  it("never returns a path that resolves off-origin", () => {
    const candidates = [
      "/\t/evil.example/probe",
      "/\t\\evil.example",
      "/\n//evil.example",
      "//evil.example",
      "/\\evil.example",
      "/settings/api-keys?lang=en",
      "/ledger#top",
    ];

    for (const candidate of candidates) {
      const safe = getSafeRedirectPath(candidate);
      if (safe === undefined) continue;
      expect(new URL(safe, "https://beancount.io").origin).toBe(
        "https://beancount.io",
      );
    }
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
