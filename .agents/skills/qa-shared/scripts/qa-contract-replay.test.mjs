import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { format, nested, RULES, textCarries } from "./qa-contract-replay.mjs";

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
  // "shared" keeps every other contract but charges previews to the write bucket (60/min).
  // "summary" keeps every other contract but cuts each text block to its lead line.
  const strict = mode === "strict" || mode === "shared" || mode === "summary";
  const seen = [];
  let writeBucket = 0;
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
      if (/x{1048577}/.test(text)) return "must be at most 1048576 characters (received 1048577)";
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
      // A tool result as the server writes it: a lead line, then the
      // structured envelope serialized on the last line (unless "summary").
      const tool = (structured) => {
        const failed = structured.ok === false;
        const lead = failed ? `${structured.error.code}: ${structured.error.message}\nHint: x` : `${name}: ok`;
        const text = mode === "summary" ? lead : `${lead}\n${JSON.stringify(structured)}`;
        return sse({ ...(failed && { isError: true }), content: [{ type: "text", text }], structuredContent: structured });
      };
      if (name === "listLedgers") return tool({ ok: true, result: { ledgers: [{ ledger: "qa/mcp-agent-eval" }] } });
      if (name === "runBqlQuery") {
        const table = "account\n-----------\nAssets:Cash\n";
        return sse({ content: [{ type: "text", text: `1 row\n${table.trimEnd()}` }], structuredContent: { ok: true, result: table } });
      }
      const why = strict ? refusal(args) : null;
      if (why) return tool({ ok: false, error: { code: "BAD_USER_INPUT", message: why } });
      if (strict && Object.values(args).some((v) => Array.isArray(v) && v.length > 10000))
        return tool({ ok: false, error: { code: "BAD_USER_INPUT", message: "at most 10000 members" } });
      if (name === "appendLedgerText" && (mode === "shared" || !args.dry_run)) {
        writeBucket += 1;
        if (mode === "shared" && writeBucket > 60)
          return tool({ ok: false, error: { code: "RATE_LIMITED", message: "slow down" } });
      }
      if (name === "appendLedgerText" && !args.dry_run && strict)
        return tool({ ok: false, error: { code: "UNBALANCED", message: "x" } });
      if (name === "getLedgerContext")
        return tool({ ok: true, result: { accounts: Array.from({ length: 40 }, (_, i) => `Expenses:Category${i}`) } });
      return tool({ ok: true, result: { validation: { valid: !strict } } });
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
      if (strict && Object.values(body).some((v) => Array.isArray(v) && v.length > 10000))
        return json(400, bad("at most 10000 members"));
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
  assert.match(stdout, /\| string \| ok \| ok \| ok \|/);
  assert.match(stdout, /\| array \| ok \| ok \| — \|/);
  assert.match(stdout, /0 mismatch/);
  assert.ok(seen.every((s) => s.auth === `Bearer ${token}`));
});

test("every tool result's text block is checked against its structuredContent", async () => {
  const { stdout } = await replay("strict");
  assert.match(stdout, /\| channel \| ok \| — \| — \|/);
  assert.match(stdout, /channel: 8 tool result\(s\) checked/);
});

test("a deployment whose text blocks stop at a summary line fails the channel row and names the tools", async () => {
  const { code, stdout } = await replay("summary");
  assert.equal(code, 1);
  assert.match(stdout, /\| channel \| MISMATCH \(MISMATCH/);
  assert.match(stdout, /- getLedgerContext: the last line is not JSON: "getLedgerContext: ok"/);
  // The table-shaped runBqlQuery text is not mistaken for a summary.
  assert.doesNotMatch(stdout, /- runBqlQuery:/);
  // Every other contract row still passes: only the channel failed.
  assert.match(stdout, /\| nul \| ok \| ok \| ok \|/);
});

test("textCarries: the last line must be the structured envelope", () => {
  const structured = { ok: true, result: [{ transactionId: "txn_1" }] };
  const full = { content: [{ type: "text", text: `1 item\n${JSON.stringify(structured)}` }], structuredContent: structured };
  assert.equal(textCarries("listStagedBankTransactions", full), null);
  const summary = { content: [{ type: "text", text: "42 items" }], structuredContent: structured };
  assert.match(textCarries("listStagedBankTransactions", summary), /not JSON/);
  const stale = { content: [{ type: "text", text: `1 item\n${JSON.stringify({ ok: true, result: [] })}` }], structuredContent: structured };
  assert.match(textCarries("listStagedBankTransactions", stale), /differs/);
  assert.match(textCarries("x", { content: [], structuredContent: structured }), /no text block/);
  // A refusal leads with readable lines and still ends with its envelope.
  const refusal = { ok: false, error: { code: "NOT_FOUND", message: "m", hint: "h", newLedgerErrors: "e (main.bean:3)" } };
  const refused = { isError: true, content: [{ type: "text", text: `NOT_FOUND: m\nHint: h\n${JSON.stringify(refusal)}` }], structuredContent: refusal };
  assert.equal(textCarries("addLedgerEntries", refused), null);
  // A JSON-RPC error has no structured content to carry.
  assert.equal(textCarries("x", {}), null);
});

test("textCarries: runBqlQuery's text is its table after the row count", () => {
  const table = "account\n-------\nAssets:Cash\n";
  const bql = (text) => ({ content: [{ type: "text", text }], structuredContent: { ok: true, result: table } });
  assert.equal(textCarries("runBqlQuery", bql(`1 row\n${table.trimEnd()}`)), null);
  assert.match(textCarries("runBqlQuery", bql("1 row")), /not the table/);
  const empty = { content: [{ type: "text", text: "0 rows" }], structuredContent: { ok: true, result: "" } };
  assert.equal(textCarries("runBqlQuery", empty), null);
});

test("a deployment that accepts a hostile value fails and names the rule and surface", async () => {
  const { code, stdout } = await replay("lax");
  assert.equal(code, 1);
  assert.match(stdout, /\| nul \| MISMATCH/);
  assert.match(stdout, /deploy lag/);
});

test("the bucket probe passes when previews stay off the write bucket", async () => {
  const { code, stdout, stderr } = await replay("strict", { extra: ["--bucket-probe"] });
  assert.equal(code, 0, stdout + stderr);
  assert.match(stdout, /\| bucket \| ok \|/);
});

test("the bucket probe fails and names the preview that was limited when previews spend the write bucket", async () => {
  const { code, stdout } = await replay("shared", { extra: ["--bucket-probe"] });
  assert.equal(code, 1);
  assert.match(stdout, /\| bucket \| MISMATCH \(RATE_LIMITED/);
});

test("the bucket probe sends nothing extra unless asked", async () => {
  const { seen } = await replay("strict");
  assert.ok(seen.filter((s) => s.url === "/api-gateway/mcp").length < 20);
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
