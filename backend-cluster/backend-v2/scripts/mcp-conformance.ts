/**
 * MCP conformance check — ADR 0007's checklist, run against a live deployment.
 *
 *   yarn mcp:conformance <base-url> [--token <bcio_…>] [--read-only-token <bcio_…>]
 *
 * Answers one question — "is this deployment's MCP endpoint actually
 * connectable?" — and, when it is not, names which of the seven checks failed
 * rather than leaving an operator to infer it from a curl transcript. The
 * checks exist because each has been observed failing in a real deployment
 * while every unit test passed; see `docs/adrs/ADR007-backend-v2-mcp-surface.md`.
 *
 * Audience is any operator, not only beancount.io: a `deploy/docker/`
 * self-hoster runs the same command against their own base URL.
 *
 * Checks needing a credential SKIP rather than FAIL when none is supplied. A
 * skip is honest — it says the check did not run; a failure would claim
 * evidence that was never gathered.
 */

const MCP_PATH = "/api-gateway/mcp";
const VANITY_PATH = "/mcp";

/** Long enough to clear a cold start, short enough that a hang is a result. */
const TIMEOUT_MS = 15_000;

type Outcome = "pass" | "fail" | "skip";

interface CheckResult {
  readonly id: string;
  readonly title: string;
  readonly outcome: Outcome;
  readonly detail: string;
}

interface Options {
  readonly baseUrl: string;
  readonly token?: string;
  readonly readOnlyToken?: string;
}

/**
 * A fetch that reports a hang as a distinct outcome rather than an exception.
 *
 * Not a generic convenience: an MCP endpoint that answers `GET` by opening a
 * stream it never closes is one of the failures this script exists to catch,
 * and it presents as a request that never settles. Reading the body matters as
 * much as receiving the headers — the observed hang sent headers in 14ms and
 * then nothing at all.
 */
async function probe(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<
  | { ok: true; status: number; headers: Headers; body: string }
  | { ok: false; timedOut: boolean; error: string }
> {
  const { timeoutMs = TIMEOUT_MS, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    const body = await res.text();
    return { ok: true, status: res.status, headers: res.headers, body };
  } catch (err) {
    const timedOut = controller.signal.aborted;
    return {
      ok: false,
      timedOut,
      error: timedOut
        ? `no response within ${timeoutMs}ms — the request never completed`
        : err instanceof Error
          ? err.message
          : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

const jsonRpcHeaders = (token?: string): Record<string, string> => ({
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const rpc = (method: string, params: unknown = {}, id = 1) =>
  JSON.stringify({ jsonrpc: "2.0", id, method, params });

const INITIALIZE = rpc("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "mcp-conformance", version: "1.0.0" },
});

/**
 * The transport answers a POST as SSE, so a JSON-RPC result arrives as
 * `event: message\ndata: {…}`. Plain JSON is accepted too — a deployment that
 * enables `enableJsonResponse` is still conformant.
 */
function parseRpc(body: string): Record<string, unknown> | undefined {
  const payload = body.includes("data:")
    ? body
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice("data:".length).trim())
        .join("")
    : body.trim();
  if (!payload) return undefined;
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/**
 * One check's verdict, bound to its identity so each branch below reads as the
 * judgement it is rather than restating which check is speaking. There are
 * twenty-odd of these branches; the id and title are the same in every one.
 */
function verdict(id: string, title: string) {
  const at = (outcome: Outcome) => (detail: string) => ({ id, title, outcome, detail });
  return { pass: at("pass"), fail: at("fail"), skip: at("skip") };
}

/**
 * The metadata URL the endpoint tells an anonymous caller to go to.
 *
 * Checks 1 and 2 both need it — one to confirm it is offered, the other to
 * follow it — and they stay independent (each is separately runnable) rather
 * than one feeding the other, so the extraction lives here instead of being
 * written twice.
 */
async function discoverPointer(baseUrl: string): Promise<{
  pointer?: string;
  response: Awaited<ReturnType<typeof probe>>;
}> {
  const response = await probe(`${baseUrl}${MCP_PATH}`, {
    method: "POST",
    headers: jsonRpcHeaders(),
    body: INITIALIZE,
  });
  const pointer = response.ok
    ? response.headers.get("www-authenticate")?.match(/resource_metadata="([^"]+)"/)?.[1]
    : undefined;
  return { pointer, response };
}

// --- checks ---------------------------------------------------------------

/** 1 — the endpoint refuses an anonymous caller, and says how to fix that. */
async function checkUnauthenticated(o: Options): Promise<CheckResult> {
  const v = verdict(
    "1 endpoint-401",
    "POST refuses an anonymous caller with an RFC 9728 pointer",
  );
  const { pointer, response } = await discoverPointer(o.baseUrl);
  if (!response.ok) return v.fail(response.error);
  if (response.status !== 401) {
    return v.fail(
      `expected 401, got ${response.status}. ${
        response.status === 500 && response.body.includes("Only HTML")
          ? `${MCP_PATH} is not routed to the backend — it reached a web front end instead`
          : `body: ${response.body.slice(0, 200)}`
      }`,
    );
  }
  if (!pointer) {
    return v.fail(
      `401 carried no resource_metadata pointer (WWW-Authenticate: ${
        response.headers.get("www-authenticate") ?? "absent"
      }). A client cannot discover how to authenticate`,
    );
  }
  return v.pass(`points at ${pointer}`);
}

/** 2 — the pointer from check 1 resolves. A 401 naming a 503 is a dead end. */
async function checkDiscovery(o: Options): Promise<CheckResult> {
  const v = verdict(
    "2 discovery-resolves",
    "The metadata URL named by the 401 returns a usable document",
  );
  const { pointer } = await discoverPointer(o.baseUrl);
  if (!pointer) return v.skip("check 1 produced no pointer to follow");

  // A local deployment advertising a production issuer is a real
  // misconfiguration and an easy one to misread — the check would report the
  // production failure while appearing to describe localhost.
  const origin = new URL(o.baseUrl).origin;
  const offHost = pointer.startsWith(`${origin}/`)
    ? ""
    : ` (note: the pointer leaves ${origin} — this deployment advertises another origin's issuer)`;

  const res = await probe(pointer);
  // Always name the URL that failed. "fetch failed" on its own tells an
  // operator nothing they can act on; the address is the actionable half.
  if (!res.ok) return v.fail(`${pointer} is unreachable: ${res.error}${offHost}`);
  if (res.status !== 200) {
    const parsed = parseRpc(res.body);
    const reason = typeof parsed?.error === "string" ? ` (${parsed.error})` : "";
    return v.fail(
      `${pointer} returned ${res.status}${reason}. The 401 points clients into a hole: they cannot discover the authorization server and cannot authenticate at all${offHost}`,
    );
  }
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(res.body) as Record<string, unknown>;
  } catch {
    return v.fail("metadata is not valid JSON");
  }
  if (!doc.resource) {
    return v.fail("metadata has no `resource` — not a usable RFC 9728 document");
  }
  return v.pass(`resource: ${String(doc.resource)}${offHost}`);
}

/** 3 — GET and DELETE are refused, and the response actually completes. */
async function checkMethodRefusal(o: Options): Promise<CheckResult> {
  const v = verdict(
    "3 method-refusal",
    "GET and DELETE return 405 + Allow: POST, and complete",
  );
  if (!o.token) {
    return v.skip(
      "needs --token: the method check runs after authentication, so an anonymous probe only reproduces check 1",
    );
  }
  const failures: string[] = [];
  for (const method of ["GET", "DELETE"]) {
    const res = await probe(`${o.baseUrl}${MCP_PATH}`, {
      method,
      headers: { Accept: "text/event-stream", Authorization: `Bearer ${o.token}` },
    });
    if (!res.ok) {
      failures.push(
        res.timedOut
          ? `${method}: ${res.error} — the endpoint is holding a stream open that will never carry anything`
          : `${method}: ${res.error}`,
      );
      continue;
    }
    if (res.status !== 405) {
      failures.push(`${method}: expected 405, got ${res.status}`);
      continue;
    }
    const allow = res.headers.get("allow");
    if (allow !== "POST") {
      failures.push(
        `${method}: 405 without \`Allow: POST\` (got ${allow ?? "no Allow header"})`,
      );
    }
  }
  return failures.length
    ? v.fail(failures.join("; "))
    : v.pass("both refused and completed");
}

/** 4 — a real credential reaches the tools, and they publish their contract. */
async function checkToolsList(o: Options): Promise<CheckResult> {
  const v = verdict(
    "4 tools-list",
    "A ledger-scoped credential reaches initialize + tools/list",
  );
  if (!o.token) return v.skip("needs --token");

  const init = await probe(`${o.baseUrl}${MCP_PATH}`, {
    method: "POST",
    headers: jsonRpcHeaders(o.token),
    body: INITIALIZE,
  });
  if (!init.ok) return v.fail(init.error);
  if (init.status === 403) {
    return v.fail(
      "403 — the credential is not bound to a ledger. Mint it with a ledger scope (`owner/name`); MCP has no per-call ledger argument to fall back on",
    );
  }
  if (init.status !== 200) {
    return v.fail(
      `initialize returned ${init.status}: ${init.body.slice(0, 200)}`,
    );
  }

  const listed = await probe(`${o.baseUrl}${MCP_PATH}`, {
    method: "POST",
    headers: jsonRpcHeaders(o.token),
    body: rpc("tools/list", {}, 2),
  });
  if (!listed.ok) return v.fail(listed.error);

  const tools = (
    parseRpc(listed.body)?.result as
      | { tools?: { name: string; outputSchema?: unknown }[] }
      | undefined
  )?.tools;
  if (!Array.isArray(tools) || tools.length === 0) {
    return v.fail(`tools/list returned no tools: ${listed.body.slice(0, 200)}`);
  }
  const undeclared = tools.filter((t) => !t.outputSchema).map((t) => t.name);
  if (undeclared.length) {
    return v.fail(
      `${tools.length} tools, but these publish no outputSchema: ${undeclared.join(", ")}. Clients receive structured content they cannot validate`,
    );
  }
  return v.pass(`${tools.length} tools, all publishing an outputSchema`);
}

/** 5 — a refusal is an isError result, not a dead connection. */
async function checkScopeRefusal(o: Options): Promise<CheckResult> {
  const v = verdict(
    "5 refusal-dialect",
    "A refused write comes back as an isError result",
  );
  if (!o.readOnlyToken) {
    return v.skip(
      "needs --read-only-token: a credential holding ledger.read but not ledger.write",
    );
  }
  const res = await probe(`${o.baseUrl}${MCP_PATH}`, {
    method: "POST",
    headers: jsonRpcHeaders(o.readOnlyToken),
    body: rpc(
      "tools/call",
      {
        name: "editLedgerFiles",
        arguments: {
          description: "conformance probe — expected to be refused",
          files: [{ operation: "delete", path: ".mcp-conformance-probe" }],
        },
      },
      3,
    ),
  });
  if (!res.ok) return v.fail(res.error);
  if (res.status !== 200) {
    return v.fail(
      `expected a 200 carrying an isError result, got ${res.status}. A transport error ends the agent's session instead of telling it what it lacked`,
    );
  }
  const result = parseRpc(res.body)?.result as { isError?: boolean } | undefined;
  if (result?.isError !== true) {
    return v.fail(
      "the refusal did not set isError — an agent branching on it reads this as success",
    );
  }
  return v.pass("refused with isError: true");
}

/** 6 — no internal error message reaches a caller. */
async function checkErrorMasking(o: Options): Promise<CheckResult> {
  const v = verdict(
    "6 error-masking",
    "An internal failure does not leak its message",
  );
  // A syntactically valid but unknown key. The point is the *shape* of whatever
  // comes back: a clean refusal, or a masked 500 — never an internal message.
  const res = await probe(`${o.baseUrl}${MCP_PATH}`, {
    method: "POST",
    headers: jsonRpcHeaders("bcio_mcp_conformance_probe_not_a_real_key"),
    body: INITIALIZE,
  });
  if (!res.ok) return v.fail(res.error);

  const leaks = ["Failed query", 'select "', "params:", "at Object.", "node_modules"];
  const found = leaks.filter((needle) => res.body.includes(needle));
  if (found.length) {
    return v.fail(
      `the ${res.status} response body leaks internal detail (matched: ${found.join(", ")}) to an unauthenticated caller`,
    );
  }
  if (res.status >= 500) {
    return v.fail(
      `an unknown credential produced ${res.status} rather than a clean refusal — the message is masked, but the endpoint is erroring where it should be refusing`,
    );
  }
  return v.pass(`unknown credential refused with ${res.status}, nothing leaked`);
}

/** 7 — the address people are told to use is an address that works. */
async function checkAdvertisedPath(o: Options): Promise<CheckResult> {
  const v = verdict(
    "7 advertised-path",
    "The documented URL reaches the MCP handler",
  );
  const reach = async (path: string) => {
    const res = await probe(`${o.baseUrl}${path}`, {
      method: "POST",
      headers: jsonRpcHeaders(),
      body: INITIALIZE,
    });
    if (!res.ok) return `unreachable (${res.error})`;
    if (res.headers.get("www-authenticate")) return "reaches MCP";
    if (res.status === 500 && res.body.includes("Only HTML")) {
      return "reaches a web front end, not the backend";
    }
    return `${res.status}, not MCP`;
  };
  const canonical = await reach(MCP_PATH);
  const vanity = await reach(VANITY_PATH);
  const detail = `${MCP_PATH}: ${canonical} | ${VANITY_PATH}: ${vanity}`;
  return canonical === "reaches MCP" ? v.pass(detail) : v.fail(detail);
}

// --- runner ---------------------------------------------------------------

function parseArgs(argv: string[]): Options {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const flag = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const baseUrl = positional[0];
  if (!baseUrl) {
    console.error(
      "usage: yarn mcp:conformance <base-url> [--token <bcio_…>] [--read-only-token <bcio_…>]\n" +
        "  e.g. yarn mcp:conformance http://localhost:4104",
    );
    process.exit(2);
  }
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    token: flag("token"),
    readOnlyToken: flag("read-only-token"),
  };
}

const MARK: Record<Outcome, string> = { pass: "PASS", fail: "FAIL", skip: "SKIP" };

/**
 * The checklist, in order. Exported so tests can drive an individual check
 * against a server they stand up themselves — the pass paths for checks 3–5
 * need a credential, which is exactly what a test can fabricate and an operator
 * running this by hand often cannot.
 */
export const CHECKS = [
  checkUnauthenticated,
  checkDiscovery,
  checkMethodRefusal,
  checkToolsList,
  checkScopeRefusal,
  checkErrorMasking,
  checkAdvertisedPath,
] as const;

export type { CheckResult, Options, Outcome };

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  console.log(`MCP conformance — ${options.baseUrl}\n`);

  const results: CheckResult[] = [];
  // Sequential on purpose: several checks re-probe the endpoint, and a readable
  // transcript beats saving a few seconds on a seven-request run.
  for (const check of CHECKS) {
    const result = await check(options);
    results.push(result);
    console.log(`${MARK[result.outcome]}  ${result.id} — ${result.title}`);
    console.log(`        ${result.detail}\n`);
  }

  const failed = results.filter((r) => r.outcome === "fail");
  const skipped = results.filter((r) => r.outcome === "skip");
  console.log(
    `${results.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} skipped`,
  );
  if (skipped.length) {
    console.log(
      `Skipped checks did not run — supply the credentials named above to cover them.`,
    );
  }
  if (failed.length) {
    console.log(`\nFailed: ${failed.map((f) => f.id).join(", ")}`);
    process.exit(1);
  }
}

// Only when invoked as a command — importing this module (from a test, or to
// reuse one check) must not fire seven HTTP probes and call process.exit.
if (require.main === module) {
  void main();
}
