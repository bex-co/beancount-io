import http from "node:http";
import { brotliCompressSync, gzipSync } from "node:zlib";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import { brotliBodyRefusal } from "@/server/brotli-body-refusal";

// CVE-2026-111497: koa-bodyparser decoded a Brotli body with zlib's decoder.
describe("brotliBodyRefusal", () => {
  let server: http.Server;
  let base: string;
  const reached = jest.fn();

  beforeAll(async () => {
    const app = new Koa();
    app.use(brotliBodyRefusal());
    app.use(bodyParser());
    app.use((ctx) => {
      reached();
      ctx.body = { received: ctx.request.body ?? null };
    });
    server = http.createServer(app.callback());
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  beforeEach(() => reached.mockClear());

  const post = (body: Buffer, encoding: string) =>
    fetch(`${base}/ledgers`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-encoding": encoding,
      },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(5000),
    });

  it.each(["br", "BR", "gzip, br"])(
    "refuses Content-Encoding %p with 415 in the error envelope",
    async (encoding) => {
      const response = await post(
        brotliCompressSync(Buffer.from('{"a":1}')),
        encoding,
      );
      expect(response.status).toBe(415);
      expect(await response.json()).toEqual({
        success: false,
        error: "Brotli-encoded request bodies are not accepted",
        code: null,
        details: null,
      });
      expect(reached).not.toHaveBeenCalled();
    },
  );

  it("still parses a gzip body", async () => {
    const response = await post(gzipSync(Buffer.from('{"a":1}')), "gzip");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: { a: 1 } });
  });
});
