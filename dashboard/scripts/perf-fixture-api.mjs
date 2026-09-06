#!/usr/bin/env node
/**
 * GraphQL record/replay fixture for dashboard route-loading traces
 * (see docs/performance-route-loading.md). Node built-ins only.
 *
 * Keys every POST by operationName + canonical variables. In --record mode a
 * miss is fetched once from the public upstream (anonymous, read-only public
 * ledgers only — never sign in through this) and stored; afterwards every
 * request is answered from the store, optionally with an injected delay for
 * selected operations, and appended to a request log so SSR and browser
 * requests can be counted per operation.
 *
 *   yarn perf:fixture-api --port 4499 --store tmp/perf/fixtures.json --record
 *   yarn perf:fixture-api --port 4499 --store tmp/perf/fixtures.json \
 *     --base-delay-ms 400 \
 *     --delay-ops GetLedgerEntriesCountPerType,GetLedgerFile,GetLedgerAccountMeta \
 *     --delay-ms 2000 [--synthetic-owner]
 *
 * --synthetic-owner answers GetCurrentUser with a made-up free-tier profile
 * that owns the recorded ledger, so owner-only panels (the directive usage
 * indicator) render without any real credentials.
 *
 * Control endpoints: GET /__log (JSON entries), GET /__log/clear.
 */
import http from "node:http";
import fs from "node:fs";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((arg, index, all) =>
      arg.startsWith("--")
        ? [
            arg.slice(2),
            all[index + 1] && !all[index + 1].startsWith("--")
              ? all[index + 1]
              : "true",
          ]
        : null,
    )
    .filter(Boolean),
);

const port = Number(args.port ?? 4499);
const storePath = args.store ?? "fixtures.json";
const upstream = args.upstream ?? "https://beancount.io/api-gateway/";
const record = args.record === "true";
const delayOps = new Set(
  String(args["delay-ops"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
const delayMs = Number(args["delay-ms"] ?? 0);
// Simulated backend latency applied to every operation (production answers
// the public example ledger in roughly 350-500 ms per operation).
const baseDelayMs = Number(args["base-delay-ms"] ?? 0);
const syntheticOwner = args["synthetic-owner"] === "true";

const store = fs.existsSync(storePath)
  ? JSON.parse(fs.readFileSync(storePath, "utf8"))
  : {};
let log = [];
const startedAt = Date.now();

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .filter((k) => value[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",")}}`;
}

const SYNTHETIC_PROFILE = {
  data: {
    userProfile: {
      __typename: "UserProfileResponse",
      locale: "en",
      lastName: null,
      id: "synthetic-owner",
      firstName: "Synthetic",
      emailReportStatus: null,
      email: "owner@example.test",
      username: "open_ledger",
      tier: "FREE",
      hasEverSubscribed: false,
      limits: {
        __typename: "UserLimits",
        ledgersUsed: 1,
        ledgersMax: 3,
        collaboratorsPerLedgerMax: 1,
        maxDirectives: 5000,
      },
    },
  },
};

function applySyntheticOwner(operationName, payload) {
  if (!syntheticOwner) return payload;
  if (operationName === "GetCurrentUser" || operationName === "IsAuthenticated")
    return operationName === "GetCurrentUser"
      ? SYNTHETIC_PROFILE
      : { data: { isAuthenticated: true } };
  if (operationName === "ListLedgers") return { data: { listLedgers: [] } };
  if (operationName === "GetLatestLedgerCommit")
    return {
      data: {
        getLatestLedgerCommit: {
          __typename: "Commit",
          sha: "synthetic-sha",
          message: "synthetic",
          created: "2026-01-01T00:00:00Z",
        },
      },
    };
  // Anonymous recordings of owner-only operations carry UNAUTHENTICATED, which
  // the dashboard treats as an expired session and redirects. Report them as
  // fixture misses instead so the synthetic session stays on the page.
  if (payload?.errors?.some((e) => e.extensions?.code === "UNAUTHENTICATED")) {
    return {
      data: null,
      errors: [
        {
          message: `fixture miss (owner): ${operationName}`,
          extensions: { code: "FIXTURE_MISS" },
        },
      ],
    };
  }
  if (operationName === "GetLedger" && payload?.data?.getLedger) {
    return {
      ...payload,
      data: {
        ...payload.data,
        getLedger: {
          ...payload.data.getLedger,
          permissions: {
            __typename: "Permission",
            admin: true,
            pull: true,
            push: true,
          },
        },
      },
    };
  }
  return payload;
}

async function resolve(operationName, query, variables) {
  const key = `${operationName}:${stableStringify(variables ?? {})}`;
  if (store[key]) return { payload: store[key], hit: true };
  if (!record) {
    return {
      payload: {
        data: null,
        errors: [
          {
            message: `fixture miss: ${operationName}`,
            extensions: { code: "FIXTURE_MISS" },
          },
        ],
      },
      hit: false,
    };
  }
  const response = await fetch(upstream, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operationName, query, variables }),
  });
  const payload = await response.json();
  store[key] = payload;
  fs.writeFileSync(storePath, JSON.stringify(store, null, 1));
  return { payload, hit: false, recorded: true };
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ??
        "content-type, authorization",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Vary", "Origin");
  }
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url, `http://localhost:${port}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (url.pathname === "/__log") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(log));
    return;
  }
  if (url.pathname === "/__log/clear") {
    log = [];
    res.writeHead(200, { "content-type": "application/json" });
    res.end("[]");
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(404);
    res.end("fixture: not found");
    return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  const receivedAt = Date.now();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    res.writeHead(400);
    res.end("bad json");
    return;
  }
  const { operationName, query, variables } = parsed;
  const ua = req.headers["user-agent"] ?? "";
  const client = /Mozilla|Chrome|Safari/.test(ua) ? "browser" : "ssr";
  const delay = baseDelayMs + (delayOps.has(operationName) ? delayMs : 0);
  const { payload, hit, recorded } = await resolve(
    operationName,
    query,
    variables,
  );
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  const out = applySyntheticOwner(operationName, payload);
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(out));
  log.push({
    t: receivedAt - startedAt,
    at: new Date(receivedAt).toISOString(),
    op: operationName,
    vars: stableStringify(variables ?? {}),
    client,
    delayMs: delay,
    durationMs: Date.now() - receivedAt,
    hit,
    recorded: Boolean(recorded),
    hasErrors: Boolean(out?.errors?.length),
  });
});

server.listen(port, () => {
  console.log(
    `[fixture] listening on http://localhost:${port}/api-gateway/ store=${storePath} record=${record} delay=${[...delayOps].join(",") || "none"}@${delayMs}ms syntheticOwner=${syntheticOwner}`,
  );
});
