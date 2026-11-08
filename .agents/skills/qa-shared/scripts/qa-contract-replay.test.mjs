import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { format, nested, RULES } from "./qa-contract-replay.mjs";

const script = fileURLToPath(new URL("./qa-contract-replay.mjs", import.meta.url));
const token = "bcio_synthetic_replay_test_value_0123456789";
const hermeticCwd = await mkdtemp(join(tmpdir(), "qa-replay-cwd-"));
test.after(() => rm(hermeticCwd, { recursive: true, force: true }));

function depthOf(value) {
  if (value === null || typeof value !== "object") return 0;
  return 1 + Math.max(0, ...Object.values(value).map(depthOf));
}

/** A server that keeps the contract (`strict`) or accepts everything (`lax`). */
function fakeDeployment(mode) {
  const strict = mode === "strict";
  const seen = [];
  const server = http.createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    seen.push({ url: request.url, auth: request.headers.authorization, key: request.headers["x-api-key"] });
    const json = (status, body) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    };
    const bad = (message) => ({ ok: false, error: { code: "BAD_USER_INPUT", message } });
    const refusal = (value) => {
      const text = JSON.stringify(value);
      if (text.includes("\\u0000")) return "arguments must not contain a NUL (U+0000) character";
      if (/\\ud800/i.test(text)) return "must be well-formed Unicode text (it contains an unpaired surrogate)";
      if (depthOf(value) > 32) return "is nested more than 32 levels deep";
      return null;
    };
    const url = new URL(request.url, "http://x");
    if (url.pathname === "/api-gateway/mcp") {
      const message = JSON.parse(raw);
      const sse = (result) => {
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.end(`data: ${JSON.stringify({ jsonrpc: "2.0", id: message.id, result })}\n\n`);
      };
      if (message.method === "initialize") return sse({ serverInfo: { name: "fake", version: "9.9.9" } });
      if (message.method === "tools/list")
        return sse({ tools: [{ name: "addLedgerEntries", outputSchema: { valid: true } }] });
      const { name, arguments: args } = message.params;
      if (name === "listLedgers")
        return sse({ structuredContent: { ok: true, result: { ledgers: [{ ledger: "qa/mcp-agent-eval" }] } } });
      const why = strict ? refusal(args) : null;
      if (why) return sse({ isError: true, structuredContent: { ok: false, error: { code: "BAD_USER_INPUT", message: why } } });
      if (strict && Object.values(args).some((v) => Array.isArray(v) && v.length > 10000))
        return sse({ isError: true, structuredContent: { ok: false, error: { code: "BAD_USER_INPUT", message: "at most 10000 members" } } });
      if (name === "appendLedgerText" && !args.dry_run && strict)
        return sse({ isError: true, structuredContent: { ok: false, error: { code: "UNBALANCED", message: "x" } } });
      return sse({ structuredContent: { ok: true, result: { validation: { valid: !strict } } } });
    }
    if (request.method === "GET" && url.pathname.endsWith("/journal")) {
      if (strict && request.url.includes("%00")) return json(400, bad("NUL"));
      return json(200, { ok: true });
    }
    if (request.method === "GET") return json(200, { sha: "abc" });
    if (request.method === "PUT") {
      const body = JSON.parse(raw);
      const why = strict ? refusal(body) : null;
      if (why) return json(400, bad(why));
      return json(200, { valid: !strict });
    }
    if (url.pathname === "/api-gateway/") {
      const body = JSON.parse(raw);
      const why = strict ? refusal(body.variables) : null;
      if (why) return json(200, { errors: [{ message: why, extensions: { code: "BAD_USER_INPUT" } }] });
      return json(200, { data: {} });
    }
    return json(404, {});
  });
  return { server, seen };
}

async function replay(mode, { env = { QA_MCP_TOKEN: token }, extra = [] } = {}) {
  const { server, seen } = fakeDeployment(mode);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  const child = spawn(
    process.execPath,
    [script, "--base", `http://127.0.0.1:${port}`, "--ledger", "qa/mcp-agent-eval", ...extra],
    {
      cwd: hermeticCwd,
      env: Object.fromEntries(
        Object.entries({ ...process.env, QA_MCP_TOKEN: "", BEANCOUNT_MCP_TOKEN: "", ...env }).filter(([, v]) => v !== ""),
      ),
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (c) => (stdout += c));
  child.stderr.on("data", (c) => (stderr += c));
  const [code] = await once(child, "close");
  server.close();
  return { code, stdout, stderr, seen };
}

test("a deployment that keeps the contract passes every probe on all three surfaces", async () => {
  const { code, stdout, stderr, seen } = await replay("strict", { extra: ["--commit-probes"] });
  assert.equal(code, 0, stdout + stderr);
  assert.match(stdout, /server: fake 9\.9\.9/);
  assert.match(stdout, /\| nul \| ok \| ok \| ok \|/);
  assert.match(stdout, /\| surrogate \| ok \| ok \| ok \|/);
  assert.match(stdout, /\| commit \| ok \|/);
  assert.match(stdout, /0 mismatch/);
  assert.ok(seen.every((s) => s.auth === `Bearer ${token}`));
});

test("a deployment that accepts a hostile value fails and names the rule and surface", async () => {
  const { code, stdout } = await replay("lax");
  assert.equal(code, 1);
  assert.match(stdout, /\| nul \| MISMATCH/);
  assert.match(stdout, /deploy lag/);
});

test("without a credential it sends nothing and says so", async () => {
  const { code, stderr, seen } = await replay("strict", { env: {} });
  assert.equal(code, 2);
  assert.match(stderr, /QA_MCP_TOKEN/);
  assert.equal(seen.length, 0);
});

test("the credential never appears in the output", async () => {
  const { stdout, stderr } = await replay("lax");
  assert.ok(!stdout.includes(token) && !stderr.includes(token));
});

test("a non-loopback http base is refused", async () => {
  const child = spawn(process.execPath, [script, "--base", "http://example.com"], {
    cwd: hermeticCwd,
    env: { ...process.env, QA_MCP_TOKEN: token },
  });
  const [code] = await once(child, "close");
  assert.equal(code, 2);
});

test("helpers: nesting depth and the table", () => {
  assert.equal(depthOf(nested(40)), 40);
  const table = format([{ surface: "MCP", rule: "nul", ok: false, observed: "OK" }]);
  assert.match(table, /\| nul \| MISMATCH \(OK\) \| — \| — \|/);
  assert.ok(Object.keys(RULES).includes("commit"));
});
