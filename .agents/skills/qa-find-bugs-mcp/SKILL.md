---
name: qa-find-bugs-mcp
description: >-
  Hunt bugs in the Beancount.io remote MCP server by driving the real
  POST /api-gateway/mcp endpoint with JSON-RPC and real MCP clients, checking
  transport, discovery, credential boundaries, tool and resource results, the
  result envelope and prompts against REST/GraphQL controls, reproducing
  failures, tracing root causes, and deduplicating findings. Use for MCP QA or
  an agent-endpoint bug hunt. Skip ordinary code review, bug implementation,
  browser, native-mobile, and CLI QA.
---

# MCP QA bug hunt

Read [the shared QA contract](../qa-shared/contract.md) first, then
`backend-cluster/backend-v2/AGENTS.md`, `backend-cluster/backend-v2/docs/mcp.md`
(the customer contract: tools, resources, prompts, envelope, failure codes),
ADR 0007 (`docs/adrs/ADR007-backend-v2-mcp-surface.md`, the endpoint contract)
and ADR 0008 (surface parity). Exercise the real endpoint over HTTP; unit tests
and source inspection support a finding but do not replace a live journey.

Arguments: optional base URL, journey names, ledger `owner/name`, `wN`,
`SHIP=1`, `DRY_RUN=1`. Default to `https://beancount.io` and report mode.
A base URL changes the deployment under test; record the server name and
version `initialize` reports and whether it matches local HEAD before calling a
source fix missing from production. `DRY_RUN=1` still allows disposable writes
on a designated QA ledger needed to reproduce bugs.

## Prepare targets and credentials

- Record branch, HEAD, dirty files, Node version, target base URL, the
  `initialize` response's `serverInfo` and negotiated `protocolVersion`, the
  credential kind (API key or OAuth token), its scopes and pin, and the chosen
  synthetic ledger. Never record the credential itself.
- The endpoint is `POST {base}/api-gateway/mcp`. Send
  `Accept: application/json, text/event-stream`, a JSON content type and
  `MCP-Protocol-Version`. Responses may be SSE-framed; parse `data:` lines
  rather than assuming one JSON document. The server is stateless: every POST
  is independent, `initialize` is not a prerequisite for a call, and there is
  no session id.
- Make requests with the bundled helper so the credential never reaches argv,
  a transcript or a tool call:

  ```sh
  node .agents/skills/qa-shared/scripts/qa-mcp.mjs [--credentials-file FILE] [--url URL] <command>
  ```

  Commands: `initialize`, `tools-list`, `resources-list`, `prompts-list`,
  `call <tool> [json]`, `read <uri>`, `prompt <name> [json]`,
  `rpc <method> [json]`, and `raw --method GET|DELETE|POST [--accept TEXT]
  [--body TEXT]` for transport checks. `--anonymous` omits the credential. It
  reads `QA_MCP_TOKEN` (falling back to `BEANCOUNT_MCP_TOKEN`) from the
  environment or `--credentials-file` (not `--env-file`, which Node itself
  consumes after the script path), prints status, an allowlist of headers and the parsed
  JSON-RPC messages, redacts `bcio_` prefixes and the token value, exits `2`
  for usage or credential problems and `3` for network failures or hangs. Run
  it from the repo root; `--url` defaults to the production endpoint and
  accepts HTTP only on loopback.
- Use a user-designated QA credential: a `bcio_` key minted on a dedicated QA
  account for a synthetic ledger, ideally one read/write key pinned to the
  ledger and one `ledger.read` key on the same ledger, both short-lived. Ask
  for the variable names or environment-file path, never for the value. Do not
  mint keys on, or point tools at, a personal account or ledger. Browser
  cookies from `qa-login.mjs` are not MCP credentials; the endpoint refuses
  them by design.
- Without a credential, continue the anonymous transport and discovery checks
  and mark every authenticated journey unverified.
- Disposable writes, accounts and admin journeys belong on the already running
  local `deploy/docker-mac` stack (`http://localhost:42601`, see its README for
  ports and `DEV_PREMIUM_USER_IDS` for local key minting). Use it only when it
  is already up; `.pm/DO_NOT_DO.md` forbids provisioning a second stack for
  MCP testing. Label local results as local, with the backend image or HEAD
  they ran.
- `yarn mcp:conformance <base-url> [--token …] [--read-only-token …]` inside
  `backend-cluster/backend-v2/` runs ADR 0007's checklist and only observes;
  run it first against the target and treat a failed check as a candidate.
  `yarn mcp:agent-eval` drives real Claude Code and Codex sessions and is
  billed; run it only when the user asks for client journeys.
- Store evidence under `backend-cluster/backend-v2/tmp/qa-<date>/`: the exact
  helper command, sanitized request and response, status, headers and
  timings. Bound every request with a timeout; a hang is a result.

## Sweep whole journeys

Use selected journey names to narrow this table; otherwise survey the surface
and deepen the journeys that show failures. Report each skipped group and why.

| Journey | Observable promise |
| --- | --- |
| transport | Anonymous `POST` returns `401` with `WWW-Authenticate: Bearer resource_metadata=…`, and that URL returns `200` with an RFC 9728 document naming an authorization server that also resolves. Authenticated `GET`/`DELETE` return `405` with `Allow: POST` and complete; anonymous `GET` still returns `401`. Missing `Accept` values or a wrong content type fail before tool execution. A notification returns `202`; an unknown method returns a JSON-RPC error. `/mcp` behaves as `docs/mcp.md` states. |
| discovery | `initialize` negotiates each supported protocol version and returns `serverInfo` and instructions. `tools/list`, `resources/templates/list` and `prompts/list` match the documented inventory: every tool has a title, description, `inputSchema` and an object `outputSchema`; names are unique; prompt arguments are declared; `resources/list` emptiness is documented. Compare with `mcp-tools.ts`, `mcp-resources.ts`, `mcp-prompts.ts`. |
| boundaries | A `ledger.read` key gets `isError: true` with `FORBIDDEN` on every write and admin tool, never a success or an internal error. A pinned key naming another `ledger` is refused; an unpinned key without `ledger` is refused with a hint naming `listLedgers`; resource URIs obey the same pin. A revoked or expired credential fails on the next request with `UNAUTHENTICATED` or `401`. A browser session cookie is refused with the discovery hint. |
| reads | `runBqlQuery` and `runBqlQueryStructured` agree with REST `query` and GraphQL `queryShell` on rows, columns, decimals and dates; `structuredContent` and the text block describe the same result. `listLedgers` paging, `checkLedger`, `getLedgerContext`, `getEntryContext`, `listLedgerFiles` and `readLedgerFiles` line ranges match ledger contents and their REST counterparts. Empty, missing and forbidden cases return the documented code, not an empty success. |
| resources | Vocabulary, analysis, journal, statement and file templates expand as documented, including reserved `{+path}`, query parameters and JSON-encoded array filters. MIME types and `contents` shapes match the doc; a failure is a JSON-RPC error whose `data.code` matches the table, with the message unprefixed. Each read matches the REST route with the same suffix. |
| writes | `dry_run` previews leave the ledger unchanged in a fresh request and in REST. `appendLedgerText` inserts in date order and `checkLedger` stays clean; `addLedgerEntries` refuses unbalanced input with `UNBALANCED` and honors `allowInvalid`; `editLedgerFiles` batches create/update/delete into one commit; `editEntrySource` returns `CONFLICT` on a stale `sha256sum`; `renameLedgerFile` preserves content. Verify persistence through `readLedgerFiles` and REST, and confirm exactly one commit per operation. |
| prompts | `prompts/get` returns each playbook; malformed `month` or `ledger` is refused; every tool and `beancount://` URI the text cites exists in this deployment's lists; a pinned credential is told its ledger. Compare served text with `mcp-prompts.ts` and classify a difference as deployment lag. |
| envelope | Every failure carries `isError: true` and `{ ok: false, error: { code, message, hint } }`; success carries `{ ok: true, result }`; `retryAfter` appears only with `RATE_LIMITED`. Missing required arguments are `BAD_USER_INPUT`, not `INTERNAL_SERVER_ERROR`. Unexpected errors are masked in production; a `DomainError` keeps its message. `ok` and `isError` never disagree. |
| limits | The handshake methods are not charged; write budgets are smaller than read budgets; `RATE_LIMITED` names `retryAfter`. Probe at human pace with a few extra calls, never a flood, and never against production for write budgets. |
| account | `manageApiKeys list`, `managePublicKeys`, `manageLedgerCollaborators`, `manageLedgers`, `setLedgerStar` and account resources honor scopes and relationships. Create or delete only `qa-<yyyymmdd>-` resources on the designated QA account; never call `deleteAccount` or change collaborators, banks or billing on a pre-existing account. |
| clients | Only when requested: a real Claude Code or Codex session connects with a bearer key, lists the same tools, exposes the four prompts, and completes a read journey; `yarn mcp:agent-eval` is the deep, billed harness. Record client versions and cost. |

After a surprising response, capture the full sanitized exchange, then repeat
it in a fresh request. Compare with the same operation on REST
(`/api-gateway/v1/…`) or GraphQL using the same credential where the surface
accepts it; a discrepancy is a parity candidate owned by backend-v2, not
automatically an MCP bug. Distinguish `BAD_USER_INPUT`, `NOT_FOUND`,
`FORBIDDEN`, `UNAUTHENTICATED`, `PREMIUM_REQUIRED`, `RATE_LIMITED`,
`SERVICE_UNAVAILABLE` and `INTERNAL_SERVER_ERROR` before naming a defect. A
Cloudflare or bot-protection page is not an application error.

## Reproduce, research, and hand off

Reproduce from a fresh request with the same credential kind and target, and
check a nearby working control (another tool, the REST route, or a second
ledger). Documented behaviors are not bugs: `405` on authenticated `GET`, an
empty `resources/list`, SSE framing, a loosened published `outputSchema`,
`manageApiKeys create` requiring OAuth and a paid plan, and `PREMIUM_REQUIRED`
on a free account. Deployment lag is not a bug either: when the served
inventory or prompt text differs from HEAD, cite the commit that already
changed it.

Trace the route in `src/features/ai-agent/api/mcp-route.ts` (identity, pin,
method set), the registry and result wrapper in
`src/server/api/composition-root.ts`, tool descriptors in `mcp-tools.ts` and
`src/features/ai-agent/tools/`, resources in `mcp-resources.ts` and
`mcp-resource-template.ts`, error translation in `mcp-errors.ts` and
`mcp-result-text.ts`, prompts in `mcp-prompts.ts`, the op table in
`src/server/api/op-class.ts`, the limiter in `rate-limit.ts` and the
protected services the adapters delegate to. Existing suites to compare with:
`mcp-route-methods`, `mcp-errors`, `mcp-output-schema`, `mcp-prompt-list`,
`mcp-tool-list`, `mcp-resources-list`, `surface-parity` and the `*-parity`
contract tests. A proposed fix names the owning package and, per the parity
workflow, every eligible REST/GraphQL/MCP surface it must change together.

Apply the shared root-cause, caller search, board/history dedupe and optional
`pm`/`ship` steps. In the finding record, replace route/device evidence with
base URL, `serverInfo`, protocol version, credential kind, scopes and pin
(never the value), the exact helper command or JSON-RPC body, status,
relevant headers, the sanitized response and the REST/GraphQL control. Include
a minimal synthetic reproducer in public filing text.

Finish with findings by severity, coverage/skips, dedupe/filing status, and
cleanup: revoke keys minted by this run, delete only `qa-<yyyymmdd>-`
resources, and report anything left behind. Do not implement fixes unless
requested; if requested, add contract coverage through the adapters and run
`yarn typecheck`, `yarn test` and `yarn generate-v1-openapi` inside
`backend-cluster/backend-v2/` before handoff.
