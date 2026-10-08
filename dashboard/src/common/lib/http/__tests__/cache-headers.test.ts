import { describe, it, expect } from "vitest";
import { applyCacheHeaders } from "../cache-headers";

const html = { "Content-Type": "text/html; charset=utf-8" };

function apply(path: string, response: Response) {
  return applyCacheHeaders(
    new Request(`https://beancount.io${path}`),
    response,
  );
}

describe("applyCacheHeaders", () => {
  it("never lets a missing build asset be stored", () => {
    const result = apply(
      "/lgassets/main-OLDHASH.js",
      new Response("<html>", { status: 404, headers: html }),
    );
    expect(result.headers.get("Cache-Control")).toBe("no-store");
  });

  it("leaves a build asset that exists alone", () => {
    const result = apply(
      "/lgassets/main-HASH.js",
      new Response("js", {
        status: 200,
        headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      }),
    );
    expect(result.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  it("makes pages revalidate", () => {
    const result = apply(
      "/auth/login",
      new Response("<html>", { headers: html }),
    );
    expect(result.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("revalidates page-level not-found responses too", () => {
    const result = apply(
      "/nope",
      new Response("<html>", { status: 404, headers: html }),
    );
    expect(result.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("keeps a policy the route already chose", () => {
    const result = apply(
      "/feed",
      new Response("<html>", {
        headers: { ...html, "Cache-Control": "public, max-age=60" },
      }),
    );
    expect(result.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("does not touch non-HTML responses", () => {
    const result = apply(
      "/api/thing",
      new Response("{}", { headers: { "Content-Type": "application/json" } }),
    );
    expect(result.headers.has("Cache-Control")).toBe(false);
  });

  it("copies a response whose headers are immutable", () => {
    const frozen = Response.redirect("https://beancount.io/x", 302);
    const result = applyCacheHeaders(
      new Request("https://beancount.io/lgassets/gone.js"),
      new Proxy(frozen, {
        get(target, prop) {
          if (prop === "status") return 404;
          const value = Reflect.get(target, prop);
          return typeof value === "function" ? value.bind(target) : value;
        },
      }),
    );
    expect(result.headers.get("Cache-Control")).toBe("no-store");
  });
});
