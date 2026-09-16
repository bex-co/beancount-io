#!/usr/bin/env node
// One stateless MCP request per invocation. The credential stays in this
// process: it is read from the environment or an env file, sent only as a
// bearer header, and scrubbed from everything this helper prints.
import { parseArgs, parseEnv } from "node:util";
import { readFileSync } from "node:fs";

const DEFAULT_URL = "https://beancount.io/api-gateway/mcp";
const DEFAULT_PROTOCOL_VERSION = "2025-11-25";
const TOKEN_VARIABLES = ["QA_MCP_TOKEN", "BEANCOUNT_MCP_TOKEN"];
const PRINTED_HEADERS = [
  "content-type",
  "www-authenticate",
  "allow",
  "mcp-protocol-version",
  "mcp-session-id",
  "retry-after",
  "cf-ray",
];
const USAGE = `usage: qa-mcp.mjs [options] <command> [arguments]

commands
  initialize                      negotiate a protocol version, print serverInfo
  tools-list | resources-list | prompts-list
  call <tool> [json-arguments]    tools/call
  read <uri>                      resources/read
  prompt <name> [json-arguments]  prompts/get
  rpc <method> [json-params]      any JSON-RPC method (omit "id" for a notification with --notify)
  raw                             one HTTP request without JSON-RPC framing (see --method, --body)

options
  --url URL                 endpoint (default ${DEFAULT_URL}; http only on loopback)
  --credentials-file FILE   read QA_MCP_TOKEN (or BEANCOUNT_MCP_TOKEN) from FILE instead of the environment
                            (not --env-file, which Node consumes itself)
  --anonymous               send no credential
  --protocol-version V      MCP-Protocol-Version header (default ${DEFAULT_PROTOCOL_VERSION})
  --method GET|POST|DELETE  raw only (default POST)
  --body TEXT               raw only: request body
  --accept TEXT             raw only: Accept header to send (default both MCP values)
  --content-type TYPE       raw only: override the content type
  --notify                  rpc only: send a notification (no id)
  --timeout-ms N            per-request limit (default 30000)

exit codes: 0 response received (any status), 2 usage or credential problem, 3 network failure or timeout`;

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

let values;
let positionals;
try {
  ({ values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      url: { type: "string", default: DEFAULT_URL },
      "credentials-file": { type: "string" },
      anonymous: { type: "boolean", default: false },
      "protocol-version": { type: "string", default: DEFAULT_PROTOCOL_VERSION },
      method: { type: "string", default: "POST" },
      body: { type: "string" },
      accept: { type: "string" },
      "content-type": { type: "string" },
      notify: { type: "boolean", default: false },
      "timeout-ms": { type: "string", default: "30000" },
      help: { type: "boolean", default: false },
    },
  }));
} catch (error) {
  fail(`${error.message}\n${USAGE}`, 2);
}
if (values.help || positionals.length === 0) fail(USAGE, 2);

const [command, ...rest] = positionals;
const timeoutMs = Number(values["timeout-ms"]);
if (!Number.isInteger(timeoutMs) || timeoutMs <= 0)
  fail("--timeout-ms must be a positive integer.", 2);

let url;
try {
  url = new URL(values.url);
} catch {
  fail("--url must be an absolute URL.", 2);
}
const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
if (
  url.username ||
  url.password ||
  (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
) {
  fail("Use an HTTPS endpoint, or HTTP loopback for local QA.", 2);
}

// Credential resolution: an explicit file wins over the ambient environment
// and must itself be complete; a missing file is an error, not a fallback.
let token = "";
if (!values.anonymous) {
  let source = process.env;
  if (values["credentials-file"]) {
    try {
      source = parseEnv(readFileSync(values["credentials-file"], "utf8"));
    } catch {
      fail("Cannot load the MCP environment file; check its path and permissions.", 2);
    }
  }
  for (const name of TOKEN_VARIABLES) {
    if (source[name]) {
      token = source[name];
      break;
    }
  }
  if (!token) {
    fail(
      `Set ${TOKEN_VARIABLES.join(" or ")} in the environment or --credentials-file, or pass --anonymous.`,
      2,
    );
  }
}

// Everything printed passes through here. The token itself and any bcio_
// prefixed value are scrubbed, so a server that echoes a credential back in an
// error message cannot leak it through this helper.
const redact = (text) => {
  const scrubbed = token ? text.split(token).join("[redacted-token]") : text;
  return scrubbed.replace(/bcio_[A-Za-z0-9_-]+/g, "bcio_[redacted]");
};

const parseJsonArgument = (text, label) => {
  if (text === undefined) return {};
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("not an object");
    return parsed;
  } catch {
    fail(`${label} must be a JSON object.`, 2);
  }
};

function buildRequest() {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  headers["mcp-protocol-version"] = values["protocol-version"];

  if (command === "raw") {
    const method = values.method.toUpperCase();
    if (!["GET", "POST", "DELETE"].includes(method))
      fail("--method must be GET, POST or DELETE.", 2);
    headers.accept = values.accept ?? "application/json, text/event-stream";
    if (values.body !== undefined)
      headers["content-type"] = values["content-type"] ?? "application/json";
    else if (values["content-type"]) headers["content-type"] = values["content-type"];
    return { method, headers, body: values.body };
  }

  let message;
  switch (command) {
    case "initialize":
      message = {
        method: "initialize",
        params: {
          protocolVersion: values["protocol-version"],
          capabilities: {},
          clientInfo: { name: "beancount-io-qa", version: "1.0.0" },
        },
      };
      break;
    case "tools-list":
      message = { method: "tools/list", params: {} };
      break;
    case "resources-list":
      message = { method: "resources/templates/list", params: {} };
      break;
    case "prompts-list":
      message = { method: "prompts/list", params: {} };
      break;
    case "call":
      if (!rest[0]) fail("call needs a tool name.", 2);
      message = {
        method: "tools/call",
        params: { name: rest[0], arguments: parseJsonArgument(rest[1], "tool arguments") },
      };
      break;
    case "read":
      if (!rest[0]) fail("read needs a resource URI.", 2);
      message = { method: "resources/read", params: { uri: rest[0] } };
      break;
    case "prompt":
      if (!rest[0]) fail("prompt needs a prompt name.", 2);
      message = {
        method: "prompts/get",
        params: { name: rest[0], arguments: parseJsonArgument(rest[1], "prompt arguments") },
      };
      break;
    case "rpc": {
      if (!rest[0]) fail("rpc needs a method name.", 2);
      message = { method: rest[0] };
      if (rest[1] !== undefined) {
        try {
          message.params = JSON.parse(rest[1]);
        } catch {
          fail("rpc params must be JSON.", 2);
        }
      }
      break;
    }
    default:
      fail(`Unknown command: ${command}\n${USAGE}`, 2);
  }
  const envelope = { jsonrpc: "2.0", ...message };
  if (!(command === "rpc" && values.notify)) envelope.id = 1;
  headers.accept = "application/json, text/event-stream";
  headers["content-type"] = "application/json";
  return { method: "POST", headers, body: JSON.stringify(envelope), sent: envelope };
}

// The SDK may frame a POST response as SSE. Collect every `data:` payload; a
// plain JSON body is one message. Anything unparseable is kept as text so a
// proxy page or an HTML error is still visible, just truncated.
function parseBody(contentType, text) {
  if (!text) return { messages: [] };
  if (contentType.includes("text/event-stream")) {
    const messages = [];
    const leftovers = [];
    for (const block of text.split(/\r?\n\r?\n/)) {
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      try {
        messages.push(JSON.parse(data));
      } catch {
        leftovers.push(data);
      }
    }
    return leftovers.length ? { messages, text: leftovers.join("\n") } : { messages };
  }
  try {
    const parsed = JSON.parse(text);
    return { messages: Array.isArray(parsed) ? parsed : [parsed] };
  } catch {
    return { messages: [], text: text.slice(0, 4000) };
  }
}

const request = buildRequest();
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
const started = Date.now();
let response;
let bodyText;
try {
  response = await fetch(url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "manual",
    signal: controller.signal,
  });
  bodyText = await response.text();
} catch (error) {
  clearTimeout(timer);
  const timedOut = controller.signal.aborted;
  fail(
    redact(
      timedOut
        ? `No complete response within ${timeoutMs}ms; the request never settled.`
        : `Request failed: ${error instanceof Error ? error.message : String(error)}`,
    ),
    3,
  );
}
clearTimeout(timer);

const headers = {};
for (const name of PRINTED_HEADERS) {
  const value = response.headers.get(name);
  if (value !== null) headers[name] = value;
}
const report = {
  url: url.toString(),
  method: request.method,
  sent: request.sent ?? (request.body !== undefined ? { body: request.body } : undefined),
  status: response.status,
  durationMs: Date.now() - started,
  headers,
  ...parseBody(response.headers.get("content-type") ?? "", bodyText),
};
process.stdout.write(`${redact(JSON.stringify(report, null, 2))}\n`);
