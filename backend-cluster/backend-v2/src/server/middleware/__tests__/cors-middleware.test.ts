import http from "node:http";
import Koa from "koa";
import { PAGE_RESPONSE_HEADERS } from "@/server/rest/page-headers";
import { corsMiddleware } from "../cors-middleware";

/**
 * w23/m32 — what a browser-hosted client is allowed to read cross-origin.
 *
 * The browser hides every response header not named in
 * `Access-Control-Expose-Headers`, so these run against a real socket: the
 * headers that matter are the ones a `fetch` in another origin could see.
 */
describe("corsMiddleware", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    const app = new Koa();
    app.use(corsMiddleware());
    app.use((ctx) => {
      ctx.set("WWW-Authenticate", 'Bearer resource_metadata="https://x/meta"');
      ctx.status = 401;
    });
    server = http.createServer(app.callback());
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    url = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;
  });
  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("lets a browser client on a trusted origin read WWW-Authenticate on a 401", async () => {
    const res = await fetch(url, {
      headers: { Origin: "https://beancount.io" },
    });

    expect(res.status).toBe(401);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://beancount.io",
    );
    const exposed = (res.headers.get("access-control-expose-headers") ?? "")
      .split(",")
      .map((h) => h.trim().toLowerCase());
    expect(exposed).toContain("www-authenticate");
  });

  it("still exposes every pagination header paginated reads rely on", async () => {
    const res = await fetch(url, {
      headers: { Origin: "https://beancount.io" },
    });
    const exposed = (res.headers.get("access-control-expose-headers") ?? "")
      .split(",")
      .map((h) => h.trim().toLowerCase());

    expect(PAGE_RESPONSE_HEADERS.length).toBeGreaterThan(0);
    for (const header of PAGE_RESPONSE_HEADERS) {
      expect(exposed).toContain(header.toLowerCase());
    }
  });

  it("gives an untrusted origin no Access-Control-Allow-Origin, so nothing is readable", async () => {
    const res = await fetch(url, {
      headers: { Origin: "https://evil.example" },
    });

    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers a preflight from a trusted origin without reaching the handler", async () => {
    const res = await fetch(url, {
      method: "OPTIONS",
      headers: {
        Origin: "https://beancount.io",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://beancount.io",
    );
  });
});
