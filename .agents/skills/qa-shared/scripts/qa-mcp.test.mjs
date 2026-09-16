import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const helper = fileURLToPath(new URL("./qa-mcp.mjs", import.meta.url));
const token = "bcio_synthetic_helper_test_value_0123456789";
const otherToken = "bcio_from_file_only_9876543210";

function run(args, env = { QA_MCP_TOKEN: token }) {
  const child = spawn(process.execPath, [helper, ...args], {
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          ([name]) => !["QA_MCP_TOKEN", "BEANCOUNT_MCP_TOKEN"].includes(name),
        ),
      ),
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = { stdout: "", stderr: "" };
  child.stdout.on("data", (chunk) => {
    output.stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output.stderr += chunk;
  });
  return once(child, "close").then(([code]) => ({ code, ...output }));
}

// A loopback stand-in for the endpoint: records what arrived and answers per path.
async function startServer() {
  const seen = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      seen.push({ method: req.method, url: req.url, headers: req.headers, body });
      if (req.url === "/json") {
        res.writeHead(200, {
          "content-type": "application/json",
          "mcp-protocol-version": "2025-11-25",
        });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: { echo: req.headers.authorization ?? null },
          }),
        );
      } else if (req.url === "/sse") {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.end(
          'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"runBqlQuery"}]}}\n\n' +
            "event: message\ndata: not json\n\n",
        );
      } else if (req.url === "/methods") {
        if (req.method === "GET") {
          res.writeHead(405, { allow: "POST" });
          res.end();
        } else {
          res.writeHead(202);
          res.end();
        }
      } else if (req.url === "/unauthorized") {
        res.writeHead(401, {
          "www-authenticate":
            'Bearer resource_metadata="http://127.0.0.1/.well-known/oauth-protected-resource"',
        });
        res.end("<html>nope</html>");
      } else if (req.url === "/hang") {
        // Headers only, then silence: the hang ADR 0007 D2 describes.
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write("event: message\n");
      } else {
        res.writeHead(404);
        res.end();
      }
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    seen,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("usage and credential problems exit 2 without printing values", async () => {
  const noToken = await run(["tools-list"], {});
  assert.equal(noToken.code, 2);
  assert.equal(noToken.stdout, "");
  assert.match(noToken.stderr, /QA_MCP_TOKEN or BEANCOUNT_MCP_TOKEN/);

  const badUrl = await run(["--url", "http://example.test/mcp", "tools-list"]);
  assert.equal(badUrl.code, 2);
  assert.match(badUrl.stderr, /HTTPS endpoint/);

  const noCommand = await run([]);
  assert.equal(noCommand.code, 2);
  assert.match(noCommand.stderr, /usage:/);

  const badArgs = await run(["--url", "http://127.0.0.1:1/x", "call", "runBqlQuery", "[1]"]);
  assert.equal(badArgs.code, 2);
  assert.match(badArgs.stderr, /JSON object/);

  for (const result of [noToken, badUrl, noCommand, badArgs]) {
    assert.doesNotMatch(result.stderr, new RegExp(token));
  }
});

test("call sends the bearer header from the environment and redacts it from output", async () => {
  const server = await startServer();
  try {
    const result = await run([
      "--url",
      `${server.base}/json`,
      "call",
      "runBqlQuery",
      '{"query":"BALANCES"}',
    ]);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(server.seen.length, 1);
    const [request] = server.seen;
    assert.equal(request.method, "POST");
    assert.equal(request.headers.authorization, `Bearer ${token}`);
    assert.equal(request.headers.accept, "application/json, text/event-stream");
    assert.equal(request.headers["content-type"], "application/json");
    assert.equal(request.headers["mcp-protocol-version"], "2025-11-25");
    assert.deepEqual(JSON.parse(request.body), {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "runBqlQuery", arguments: { query: "BALANCES" } },
    });

    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 200);
    assert.equal(report.headers["mcp-protocol-version"], "2025-11-25");
    assert.equal(report.messages.length, 1);
    // The server echoed the credential back; the helper must not.
    assert.equal(report.messages[0].result.echo, "Bearer [redacted-token]");
    assert.doesNotMatch(result.stdout, new RegExp(token));
    assert.doesNotMatch(result.stdout, /bcio_[A-Za-z0-9]/);
  } finally {
    await server.close();
  }
});

test("--credentials-file wins over the ambient token and must be complete", async () => {
  const server = await startServer();
  const dir = await mkdtemp(join(tmpdir(), "qa-mcp-"));
  try {
    const envFile = join(dir, "mcp.env");
    await writeFile(envFile, `BEANCOUNT_MCP_TOKEN=${otherToken}\n`);
    const result = await run([
      "--credentials-file",
      envFile,
      "--url",
      `${server.base}/json`,
      "tools-list",
    ]);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(server.seen.at(-1).headers.authorization, `Bearer ${otherToken}`);
    assert.doesNotMatch(result.stdout, new RegExp(otherToken));

    const empty = join(dir, "empty.env");
    await writeFile(empty, "UNRELATED=1\n");
    const incomplete = await run(["--credentials-file", empty, "--url", `${server.base}/json`, "tools-list"]);
    assert.equal(incomplete.code, 2);
    assert.equal(incomplete.stdout, "");

    const missing = await run([
      "--credentials-file",
      join(dir, "absent.env"),
      "--url",
      `${server.base}/json`,
      "tools-list",
    ]);
    assert.equal(missing.code, 2);
    assert.match(missing.stderr, /Cannot load/);
  } finally {
    await rm(dir, { recursive: true, force: true });
    await server.close();
  }
});

test("--anonymous omits the credential and reports the discovery header", async () => {
  const server = await startServer();
  try {
    const result = await run(
      ["--anonymous", "--url", `${server.base}/unauthorized`, "initialize"],
      {},
    );
    assert.equal(result.code, 0, result.stderr);
    assert.equal(server.seen[0].headers.authorization, undefined);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 401);
    assert.match(report.headers["www-authenticate"], /resource_metadata=/);
    assert.equal(report.messages.length, 0);
    assert.match(report.text, /nope/);
    assert.equal(report.sent.method, "initialize");
    assert.equal(report.sent.params.protocolVersion, "2025-11-25");
  } finally {
    await server.close();
  }
});

test("SSE-framed responses are parsed into messages with leftovers kept as text", async () => {
  const server = await startServer();
  try {
    const result = await run(["--url", `${server.base}/sse`, "tools-list"]);
    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.messages, [
      { jsonrpc: "2.0", id: 1, result: { tools: [{ name: "runBqlQuery" }] } },
    ]);
    assert.equal(report.text, "not json");
    assert.equal(JSON.parse(server.seen[0].body).method, "tools/list");
  } finally {
    await server.close();
  }
});

test("raw requests carry only what was asked and notifications omit the id", async () => {
  const server = await startServer();
  try {
    const get = await run([
      "--url",
      `${server.base}/methods`,
      "raw",
      "--method",
      "GET",
      "--accept",
      "text/html",
    ]);
    assert.equal(get.code, 0, get.stderr);
    const getReport = JSON.parse(get.stdout);
    assert.equal(getReport.status, 405);
    assert.equal(getReport.headers.allow, "POST");
    assert.equal(server.seen[0].method, "GET");
    assert.equal(server.seen[0].headers.accept, "text/html");
    assert.equal(server.seen[0].headers["content-type"], undefined);
    assert.equal(server.seen[0].headers.authorization, `Bearer ${token}`);

    const notify = await run([
      "--url",
      `${server.base}/methods`,
      "rpc",
      "notifications/initialized",
      "--notify",
    ]);
    assert.equal(notify.code, 0, notify.stderr);
    assert.equal(JSON.parse(notify.stdout).status, 202);
    const sent = JSON.parse(server.seen[1].body);
    assert.equal(sent.method, "notifications/initialized");
    assert.equal("id" in sent, false);

    const bodyPost = await run([
      "--url",
      `${server.base}/methods`,
      "raw",
      "--body",
      "not json at all",
      "--content-type",
      "text/plain",
    ]);
    assert.equal(bodyPost.code, 0, bodyPost.stderr);
    assert.equal(server.seen[2].headers["content-type"], "text/plain");
    assert.equal(server.seen[2].body, "not json at all");
  } finally {
    await server.close();
  }
});

test("a response that never completes is reported as a hang with exit 3", async () => {
  const server = await startServer();
  try {
    const result = await run([
      "--url",
      `${server.base}/hang`,
      "--timeout-ms",
      "300",
      "tools-list",
    ]);
    assert.equal(result.code, 3);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /never settled/);
    assert.doesNotMatch(result.stderr, new RegExp(token));
  } finally {
    await server.close();
  }
});
