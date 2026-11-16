#!/usr/bin/env node
// Replay the documented write-preview and argument contracts against a hosted
// Beancount.io deployment on MCP, REST and GraphQL, and print one table.
//
// The credential stays in this process: it is read like qa-mcp.mjs reads it
// (./.env first, then the environment), sent only as a header, and scrubbed
// from everything printed. Probes never write: previews are dry runs, and the
// optional commit probes send an entry the server must refuse.
import { isDeepStrictEqual, parseArgs, parseEnv } from "node:util";
import { existsSync, readFileSync } from "node:fs";

const USAGE = `usage: qa-contract-replay.mjs [options]

Replays the contracts in backend-cluster/backend-v2/docs/mcp.md (the preview
rule, the argument limits, and the result envelope's text block) on MCP, REST
and GraphQL.

options
  --base URL          deployment origin (default https://beancount.io; http only on loopback)
  --ledger OWNER/NAME ledger for the preview probes (default: the reachable ledger named mcp-agent-eval)
  --commit-probes     also send an unbalanced commit that must be refused UNBALANCED
  --bucket-probe      send 70 previews, then one unbalanced commit: spends about a
                      minute of the QA credential's preview budget, so run it last
  --timeout-ms N      per-request limit (default 30000)

exit codes: 0 every probe matched, 1 a probe disagreed with the contract,
2 usage or credential problem, 3 network failure`;

const TOKEN_VARIABLES = ["QA_MCP_TOKEN", "BEANCOUNT_MCP_TOKEN"];

function fail(message, code = 2) {
  console.error(message);
  process.exit(code);
}

export function loadToken(cwd = ".", environment = process.env) {
  const pick = (source) => {
    for (const name of TOKEN_VARIABLES) if (source[name]) return source[name];
    return "";
  };
  const file = `${cwd}/.env`;
  if (existsSync(file)) {
    const preferred = pick(parseEnv(readFileSync(file, "utf8")));
    if (preferred) return preferred;
  }
  return pick(environment);
}

/** A depth-`levels` object chain, the nesting shape the ceiling refuses. */
export const nested = (levels) => {
  let node = "x";
  for (let i = 0; i < levels; i += 1) node = { k: node };
  return node;
};

/**
 * The contract rows. `expect` is a predicate over a normalized outcome
 * `{ code, message, valid }`; `rule` is the sentence in the guide it checks.
 */
export const RULES = {
  nul: {
    rule: "a NUL in a string argument is BAD_USER_INPUT",
    expect: (o) => o.code === "BAD_USER_INPUT" && /NUL/.test(o.message),
  },
  surrogate: {
    rule: "an unpaired surrogate is BAD_USER_INPUT",
    expect: (o) =>
      o.code === "BAD_USER_INPUT" && /surrogate|well-formed/.test(o.message),
  },
  string: {
    rule: "a string past 1048576 characters is BAD_USER_INPUT",
    expect: (o) =>
      o.code === "BAD_USER_INPUT" && /at most 1048576 characters/.test(o.message),
  },
  array: {
    rule: "an array past 10000 members is BAD_USER_INPUT",
    expect: (o) => o.code === "BAD_USER_INPUT" && /at most 10000/.test(o.message),
  },
  depth: {
    rule: "nesting past 32 levels is BAD_USER_INPUT",
    expect: (o) =>
      o.code === "BAD_USER_INPUT" && /nested more than 32/.test(o.message),
  },
  preview: {
    rule: "a preview that adds bean-check errors succeeds with valid:false",
    expect: (o) => o.code === "OK" && o.valid === false,
  },
  commit: {
    rule: "the unbalanced commit is refused UNBALANCED",
    expect: (o) => o.code === "UNBALANCED",
  },
  bucket: {
    rule: "previews past the write budget (60/min) leave the write bucket alone, so the commit is still refused UNBALANCED, not RATE_LIMITED",
    expect: (o) => o.code === "UNBALANCED",
  },
  channel: {
    rule: "every tool result's text block carries its structuredContent: the last line parses to it (runBqlQuery's text is its table), so a host that reads only text misses nothing",
    expect: (o) => o.code === "OK",
  },
};

/**
 * Why a tool result's text block carries less than its `structuredContent`,
 * or null when it carries all of it.
 *
 * Hosts differ in which channel they hand the model: claude.ai's connector
 * reads only `content`, while Claude Code shows `structuredContent`. A text
 * block cut down to a summary line ("42 items") therefore looks fine from one
 * client and empty from the other, which is how it shipped once unnoticed.
 */
export function textCarries(tool, result) {
  const structured = result?.structuredContent;
  if (structured === undefined) return null;
  const text = (result.content ?? [])
    .filter((block) => block?.type === "text")
    .map((block) => block.text)
    .join("\n");
  if (!text) return "no text block";
  const lines = text.split("\n");
  if (tool === "runBqlQuery" && typeof structured.result === "string") {
    // The lead line is the row count; the table follows, minus its final newline.
    const table = structured.result.replace(/\n$/, "");
    if (table.trim() === "" || lines.slice(1).join("\n") === table) return null;
    return "the text is not the table";
  }
  const last = lines.at(-1);
  let parsed;
  try {
    parsed = JSON.parse(last);
  } catch {
    return `the last line is not JSON: "${last.slice(0, 40)}"`;
  }
  return isDeepStrictEqual(parsed, structured)
    ? null
    : "the last line differs from structuredContent";
}

/** One more than the write budget a preview must not spend; below the preview bucket (180/min). */
export const BUCKET_PREVIEWS = 70;
/** One more than the longest string any non-file argument may carry. */
export const LONG_STRING = "x".repeat(1048577);

export function format(results) {
  const surfaces = ["MCP", "REST", "GraphQL"];
  const rows = Object.keys(RULES).map((key) => {
    const cells = surfaces.map((surface) => {
      const found = results.find((r) => r.rule === key && r.surface === surface);
      if (!found) return "—";
      return found.ok ? "ok" : `MISMATCH (${found.observed})`;
    });
    return `| ${key} | ${cells.join(" | ")} |`;
  });
  return [
    "| rule | MCP | REST | GraphQL |",
    "| ---- | --- | ---- | ------- |",
    ...rows,
  ].join("\n");
}

async function main() {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        base: { type: "string", default: "https://beancount.io" },
        ledger: { type: "string" },
        "commit-probes": { type: "boolean", default: false },
        "bucket-probe": { type: "boolean", default: false },
        "timeout-ms": { type: "string", default: "30000" },
        help: { type: "boolean", default: false },
      },
    }));
  } catch (error) {
    fail(`${error.message}\n${USAGE}`);
  }
  if (values.help) fail(USAGE);

  let base;
  try {
    base = new URL(values.base);
  } catch {
    fail("--base must be an absolute URL.");
  }
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname);
  if (base.username || base.password || (base.protocol !== "https:" && !(base.protocol === "http:" && loopback)))
    fail("Use an HTTPS origin, or HTTP loopback for local QA.");
  const timeoutMs = Number(values["timeout-ms"]);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0)
    fail("--timeout-ms must be a positive integer.");

  const token = loadToken();
  if (!token)
    fail(`Set ${TOKEN_VARIABLES.join(" or ")} in ./.env or the environment. Nothing was sent.`);
  const redact = (text) =>
    String(text).split(token).join("[redacted-token]").replace(/bcio_[A-Za-z0-9_-]+/g, "bcio_[redacted]");

  const send = async (path, { method = "POST", body, headers = {} } = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(new URL(path, base), {
        method,
        body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
        headers: { authorization: `Bearer ${token}`, "x-api-key": token, ...headers },
        signal: controller.signal,
      });
      const text = await response.text();
      return { status: response.status, text };
    } catch (error) {
      fail(`Network failure: ${redact(error.message)}`, 3);
    } finally {
      clearTimeout(timer);
    }
  };

  // MCP: one stateless POST per call; the response may be SSE-framed.
  let rpcId = 0;
  const mcp = async (method, params) => {
    rpcId += 1;
    const response = await send("/api-gateway/mcp", {
      body: { jsonrpc: "2.0", id: rpcId, method, params },
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "mcp-protocol-version": "2025-11-25",
      },
    });
    const frames = response.text
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());
    const payload = frames.length > 0 ? frames[frames.length - 1] : response.text;
    try {
      return JSON.parse(payload);
    } catch {
      return { error: { message: redact(response.text.slice(0, 200)) } };
    }
  };
  // Every tool result is also checked for what its text block carries.
  const channel = { checked: 0, failures: [] };
  const mcpTool = async (name, args) => {
    const reply = await mcp("tools/call", { name, arguments: args });
    const result = reply.result ?? {};
    if (reply.result) {
      channel.checked += 1;
      const why = textCarries(name, result);
      if (why) channel.failures.push(`${name}: ${why}`);
    }
    const structured = result.structuredContent ?? {};
    if (reply.error)
      return { code: reply.error.data?.code ?? "JSONRPC", message: String(reply.error.message ?? "") };
    if (structured.ok === false || result.isError)
      return {
        code: structured.error?.code ?? "ERROR",
        message: String(structured.error?.message ?? ""),
      };
    return {
      code: "OK",
      message: "",
      valid: structured.result?.validation?.valid,
    };
  };

  const init = await mcp("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "beancount-io-qa-replay", version: "1.0.0" },
  });
  const serverInfo = init.result?.serverInfo;
  if (!serverInfo) fail(`The endpoint did not answer initialize: ${redact(JSON.stringify(init).slice(0, 200))}`, 3);
  const list = await mcp("tools/list", {});
  const tools = list.result?.tools ?? [];
  const fingerprint = {
    toolCount: tools.length,
    previewValidFlag: JSON.stringify(tools.find((t) => t.name === "addLedgerEntries")?.outputSchema ?? {}).includes('"valid"'),
    toolsListBytes: Buffer.byteLength(JSON.stringify(tools)),
  };

  let ledger = values.ledger;
  if (!ledger) {
    const reply = await mcp("tools/call", { name: "listLedgers", arguments: {} });
    const found = JSON.stringify(reply.result?.structuredContent ?? {});
    const match = found.match(/"(?:ledger|id|fullName)":"([^"/]+\/mcp-agent-eval)"/);
    ledger = match?.[1];
  }
  if (!ledger) fail("No ledger for the preview probes: pass --ledger OWNER/NAME.");
  const [owner, name] = ledger.split("/");
  if (!owner || !name) fail("--ledger must be OWNER/NAME.");

  const results = [];
  const record = (surface, rule, outcome) =>
    results.push({ surface, rule, ok: RULES[rule].expect(outcome), observed: `${outcome.code}${outcome.valid === undefined ? "" : ` valid:${outcome.valid}`}${outcome.message && !RULES[rule].expect(outcome) ? ` "${redact(outcome.message).slice(0, 60)}"` : ""}` });

  const text = '2020-01-01 open Assets:ReplayProbe\n2020-01-02 * "replay probe"\n  Assets:ReplayProbe  1 USD\n';
  // MCP
  record("MCP", "nul", await mcpTool("getLedgerContext", { ledger: "a/b\u0000c" }));
  record("MCP", "surrogate", await mcpTool("getLedgerContext", { ledger: "a/b\ud800c" }));
  record("MCP", "string", await mcpTool("getLedgerContext", { ledger, extra: LONG_STRING }));
  record("MCP", "array", await mcpTool("listLedgerEntries", { ledger, directiveTypes: new Array(10001).fill("open") }));
  record("MCP", "depth", await mcpTool("getLedgerContext", { ledger, extra: nested(40) }));
  record("MCP", "preview", await mcpTool("appendLedgerText", { ledger, text, dry_run: true }));
  // Two successes for the channel check: a payload well past 400 characters,
  // the size at which the text block once stopped at its summary line, and
  // the one tool whose text is a table rather than JSON.
  await mcpTool("getLedgerContext", { ledger });
  await mcpTool("runBqlQuery", { ledger, query: "BALANCES" });
  if (values["commit-probes"])
    record("MCP", "commit", await mcpTool("appendLedgerText", { ledger, text }));

  // REST
  const restError = (r) => {
    try {
      const j = JSON.parse(r.text);
      return { code: j.error?.code ?? `HTTP ${r.status}`, message: String(j.error?.message ?? "") };
    } catch {
      return { code: `HTTP ${r.status}`, message: "" };
    }
  };
  const journal = `/api-gateway/v1/ledgers/${owner}/${name}/journal`;
  record("REST", "nul", restError(await send(`${journal}?account=a%00b`, { method: "GET" })));
  const filePath = `/api-gateway/v1/ledgers/${owner}/${name}/files/replay-probe.bean`;
  record("REST", "surrogate", restError(await send(filePath, { method: "PUT", body: { content: "a\ud800", dryRun: true }, headers: { "content-type": "application/json" } })));
  record("REST", "string", restError(await send(filePath, { method: "PUT", body: { content: "x", dryRun: true, extra: LONG_STRING }, headers: { "content-type": "application/json" } })));
  record("REST", "array", restError(await send(filePath, { method: "PUT", body: { content: "x", dryRun: true, extra: new Array(10001).fill(0) }, headers: { "content-type": "application/json" } })));
  record("REST", "depth", restError(await send(filePath, { method: "PUT", body: { content: "x", dryRun: true, extra: nested(40) }, headers: { "content-type": "application/json" } })));
  const current = await send(`/api-gateway/v1/ledgers/${owner}/${name}/files/main.bean`, { method: "GET" });
  let sha;
  try {
    sha = JSON.parse(current.text).sha ?? JSON.parse(current.text).result?.sha;
  } catch {
    sha = undefined;
  }
  const preview = await send(`/api-gateway/v1/ledgers/${owner}/${name}/files/main.bean`, {
    method: "PUT",
    body: { content: text, dryRun: true, sha },
    headers: { "content-type": "application/json" },
  });
  try {
    const j = JSON.parse(preview.text);
    const valid = j.result?.valid ?? j.valid;
    record("REST", "preview", preview.status === 200 ? { code: "OK", message: "", valid } : restError(preview));
  } catch {
    record("REST", "preview", { code: `HTTP ${preview.status}`, message: "" });
  }

  // GraphQL
  const graphql = async (ledgerId) => {
    const r = await send("/api-gateway/", {
      body: { query: "query($id: String!) { getLedgerJournal(ledgerId: $id) { __typename } }", variables: { id: ledgerId } },
      headers: { "content-type": "application/json" },
    });
    try {
      const e = JSON.parse(r.text).errors?.[0];
      return { code: e?.extensions?.code ?? (e ? "ERROR" : "OK"), message: String(e?.message ?? "") };
    } catch {
      return { code: `HTTP ${r.status}`, message: "" };
    }
  };
  record("GraphQL", "nul", await graphql("a/b\u0000c"));
  record("GraphQL", "surrogate", await graphql("a/b\ud800c"));
  record("GraphQL", "string", await graphql(LONG_STRING));

  // Last: the probe that spends preview budget. Any RATE_LIMITED among the
  // previews means they are charged to the write bucket.
  if (values["bucket-probe"]) {
    let limited;
    for (let i = 0; i < BUCKET_PREVIEWS && !limited; i += 1) {
      const preview = await mcpTool("appendLedgerText", { ledger, text, dry_run: true });
      if (preview.code === "RATE_LIMITED") limited = { ...preview, message: `preview ${i + 1} of ${BUCKET_PREVIEWS}` };
    }
    record("MCP", "bucket", limited ?? (await mcpTool("appendLedgerText", { ledger, text: "2020-01-03 * \"unbalanced\"\n  Assets:ReplayProbe  1 USD\n" })));
  }

  const { failures } = channel;
  record(
    "MCP",
    "channel",
    failures.length === 0
      ? { code: "OK", message: "" }
      : { code: "MISMATCH", message: failures.join("; ") },
  );

  console.log(`deployment: ${base.origin}`);
  console.log(`server: ${serverInfo.name} ${serverInfo.version}`);
  console.log(`fingerprint: ${JSON.stringify(fingerprint)}`);
  console.log(`ledger: ${ledger}`);
  console.log(`${format(results)}\n`);
  for (const key of Object.keys(RULES)) console.log(`- ${key}: ${RULES[key].rule}`);
  console.log(`\nchannel: ${channel.checked} tool result(s) checked`);
  for (const failure of failures) console.log(`- ${redact(failure)}`);
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length} probes, ${bad.length} mismatch(es)`);
  if (bad.length > 0)
    console.log(
      "A mismatch on a rule newer than the deployment is a deploy lag, not a regression: compare the fingerprint and the server's deployed revision with the commit that introduced the rule.",
    );
  process.exit(bad.length === 0 ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
