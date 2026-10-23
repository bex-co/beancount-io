import http from "node:http";
import { config } from "@/config";
import { clearMemoizedGiteaClients } from "@/features/gitea/service/gitea-client-factory";
import { buildApp, JSON_BODY_LIMIT_BYTES } from "@/server/start-server";

const MIB = 1024 * 1024;
const FILE_PATH = "receipts/at-limit.bin";
const TOKEN = "token synthetic-file-test-token";
const PYTHON_PARSER_ERROR = {
  success: false,
  error: "Internal server error",
  code: null,
  details: null,
};
const BODY_TOO_LARGE = {
  success: false,
  error: "request body exceeds the ledger service's limit",
  code: null,
  details: null,
};

type Write = {
  method: string;
  path: string;
  authorization: string | undefined;
  body: Record<string, unknown>;
};

async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

describe("ledger application's file JSON request allowance", () => {
  const writes: Write[] = [];
  let ledgerServer: http.Server;
  let giteaServer: http.Server;
  let ledgerUrl: string;
  const originalGiteaUrl = config.gitea.baseUrl;

  beforeAll(async () => {
    // Keep the installed generated Gitea client and actual file adapter. Only
    // the external Gitea server is replaced by a local HTTP fixture.
    giteaServer = http.createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
        string,
        unknown
      >;
      writes.push({
        method: request.method!,
        path: request.url!,
        authorization: request.headers.authorization,
        body,
      });
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          content: {
            name: "at-limit.bin",
            path: FILE_PATH,
            type: "file",
            sha: "synthetic-written-sha",
            size: Buffer.from(String(body.content ?? ""), "base64").byteLength,
            encoding: "base64",
            content: body.content ?? "",
          },
        }),
      );
    });
    config.gitea.baseUrl = await listen(giteaServer);
    clearMemoizedGiteaClients();
    ledgerServer = http.createServer(buildApp().callback());
    ledgerUrl = await listen(ledgerServer);
  });

  beforeEach(() => {
    writes.length = 0;
  });

  afterAll(async () => {
    await Promise.all(
      [ledgerServer, giteaServer].map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
    );
    config.gitea.baseUrl = originalGiteaUrl;
    clearMemoizedGiteaClients();
  });

  const send = (
    method: string,
    body: string,
    options: {
      authorization?: string | null;
      contentType?: string;
      endpoint?: string;
    } = {},
  ) =>
    fetch(
      `${ledgerUrl}/ledgers/synthetic/upload/${options.endpoint ?? "files"}`,
      {
        method,
        headers: {
          "content-type": options.contentType ?? "application/json",
          ...(options.authorization === null
            ? {}
            : { authorization: options.authorization ?? TOKEN }),
        },
        body,
        signal: AbortSignal.timeout(5000),
      },
    );

  it.each([
    ["POST", 201, "Basic c3ludGhldGljOnRlc3Q="],
    ["PUT", 200, TOKEN],
  ] as const)(
    "forwards an exactly 1 MiB %s file unchanged through the real adapter",
    async (method, status, authorization) => {
      const bytes = Buffer.alloc(MIB, 0xab);
      const content = bytes.toString("base64");
      const input = {
        path: FILE_PATH,
        content,
        message: "Write synthetic boundary file",
        ...(method === "PUT" ? { sha: "synthetic-before-sha" } : {}),
      };
      const body = JSON.stringify(input);
      expect(content.length).toBe(1398104);
      expect(Buffer.byteLength(body)).toBeGreaterThan(MIB);
      expect(Buffer.byteLength(body)).toBeLessThan(2 * MIB);
      const response = await send(method, body, { authorization });
      const result = await response.json();
      expect(response.status).toBe(status);
      expect(result).toEqual({
        success: true,
        data: {
          name: "at-limit.bin",
          path: FILE_PATH,
          type: "file",
          sha: "synthetic-written-sha",
          size: MIB,
          content,
          encoding: "base64",
          last_commit_sha: null,
          last_committer_date: null,
          last_author_date: null,
        },
      });
      expect(writes).toEqual([
        {
          method,
          path: `/api/v1/repos/synthetic/upload/contents/${FILE_PATH}`,
          authorization,
          body: {
            content,
            message: input.message,
            ...(method === "PUT" ? { sha: "synthetic-before-sha" } : {}),
          },
        },
      ]);
      expect(Buffer.from(String(writes[0].body.content), "base64")).toEqual(
        bytes,
      );
    },
  );

  // A fresh connection each, chunked: a pooled keep-alive socket the server
  // closed resets a POST under load, and a refusal that arrives mid-upload
  // stays readable.
  const postRaw = (path: string, body: string) =>
    new Promise<{ status?: number; body: string }>((resolve, reject) => {
      const request = http.request(
        `${ledgerUrl}${path}`,
        {
          method: "POST",
          agent: false,
          headers: {
            "content-type": "application/json",
            "transfer-encoding": "chunked",
            authorization: TOKEN,
          },
          signal: AbortSignal.timeout(10_000),
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("error", reject);
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              body: Buffer.concat(chunks).toString("utf8"),
            }),
          );
        },
      );
      request.on("error", reject);
      request.end(body);
    });

  // w23/074: two 0.9 MB files, inside backend-v2's 2 MiB request cap, are
  // ~2.4 MB as base64 and were refused here as a 500 "Internal server error",
  // which backend-v2 reported as "dependency down, retry".
  it("parses a body past the old 2 MiB limit, as backend-v2 forwards one", async () => {
    const file = Buffer.alloc(900_000, 0x3b).toString("base64");
    const body = JSON.stringify({ files: [file, file] });
    expect(Buffer.byteLength(body)).toBeGreaterThan(2 * MIB);
    // No route, so a parsed body is a 404; a refused one would be a 413.
    expect((await postRaw("/no-such-route", body)).status).toBe(404);
  });

  it("refuses a body past its limit as 413, not a 500, before reaching Gitea", async () => {
    const response = await postRaw(
      "/ledgers/synthetic/upload/files",
      JSON.stringify({
        path: FILE_PATH,
        content: "A".repeat(JSON_BODY_LIMIT_BYTES + 1),
      }),
    );
    expect(response.status).toBe(413);
    expect(JSON.parse(response.body)).toEqual(BODY_TOO_LARGE);
    expect(writes).toEqual([]);
  });

  it.each([null, "Bearer unsupported"])(
    "retains the %s authorization refusal before a small file write",
    async (authorization) => {
      const response = await send(
        "POST",
        JSON.stringify({ path: FILE_PATH, content: "YQ==" }),
        { authorization },
      );
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toBe("Basic");
      expect(await response.json()).toEqual({
        success: false,
        error:
          "No authorization header provided. Use 'Basic <credentials>' or 'token <token>'",
        code: null,
        details: null,
      });
      expect(writes).toEqual([]);
    },
  );

  it("keeps the independent 56 KiB form allowance and refusal", async () => {
    const prefix = `path=${encodeURIComponent(FILE_PATH)}&content=YQ%3D%3D&message=`;
    const body = `${prefix}${"x".repeat(56 * 1024 - prefix.length)}`;
    const accepted = await send("POST", body, {
      contentType: "application/x-www-form-urlencoded",
    });
    expect(accepted.status).toBe(201);
    expect(await accepted.json()).toMatchObject({ success: true });
    expect(writes).toHaveLength(1);
    expect(writes[0].body.content).toBe("YQ==");
    const oversized = await send("POST", `${body}x`, {
      contentType: "application/x-www-form-urlencoded",
    });
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual(BODY_TOO_LARGE);
    expect(writes).toHaveLength(1);
  });

  it("preserves the malformed-JSON error envelope without reaching the file adapter", async () => {
    const response = await send("POST", "{not-json");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(PYTHON_PARSER_ERROR);
    expect(writes).toEqual([]);
  });
});
