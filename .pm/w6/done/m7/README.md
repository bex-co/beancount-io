# w6 · m7 — Connect OpenClaw and Hermes Agent to the hosted MCP endpoint

**Worker:** worker1 **Goal:** OpenClaw and Hermes Agent become named hosts in the sense of ADR 019 D8. Each has a fixture that registers the way the host really does, a dated real sign-in against `https://beancount.io/api-gateway/mcp`, and a per-host row in `docs/mcp.md` that tells its users exactly how to connect. **Status:** done

**Research date:** 2026-10-16. Sources: OpenClaw's `tools/mcp` and MCP transport pages at `docs.openclaw.ai`; Hermes Agent's MCP page at `hermes-agent.nousresearch.com/docs/user-guide/features/mcp`. t001 confirms every host behavior below first-hand before any fixture relies on it.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Capture how OpenClaw and Hermes Agent identify themselves and redirect — **DONE** | 45m | — |
| [t002](./done/t002.md) | Add OpenClaw and Hermes fixtures to the OAuth host tests — **DONE** | 45m | t001 |
| [t003](./done/t003.md) | OpenClaw: real sign-in, one read, one `dry_run` write — **DONE** | 45m | t001 |
| [t004](./done/t004.md) | Hermes Agent: real sign-in, one read, one `dry_run` write — **DONE** | 45m | t001 |
| [t005](./done/t005.md) | Add both hosts to the per-host notes and ADR 019 — **DONE** | 30m | t002, t003, t004 |
| [t006](./done/t006.md) | Adoption surface — **DONE** | 30m | t005 |
| [t007](./done/t007.md) | Simplify — **DONE** | 30m | t006 |
| [t008](./done/t008.md) | Test coverage — **DONE** | 45m | t006, t007 |
| [t009](./done/t009.md) | Closeout — **DONE** | 15m | t008 |

## What the hosts do (as documented, 2026-10-16)

- **Neither host has an MCP directory we can submit to.** OpenClaw adds servers by hand (Settings, the composer, `openclaw mcp add`, or config). Hermes's `hermes mcp catalog` lists only Nous-approved entries kept in its own repository. So on these hosts, being listed means a verified connection path documented where their users look.
- **OpenClaw:** `openclaw mcp add <name> --url <url> --transport streamable-http`, with `auth: "oauth"`, then `openclaw mcp login <name>` (a `--code` form exists for when the browser cannot reach the callback), then `openclaw mcp doctor <name> --probe`. CLI sign-in captures a loopback redirect. OpenClaw's docs also describe per-requester OAuth (`oauth.identity: "per-requester"`) on a gateway with a public HTTPS origin. In that mode each sender signs in separately, and the redirect is a web URI on the gateway's own origin. On `insufficient_scope` it asks for a fresh login rather than retrying a refresh. Its docs focus on tools, and they do not confirm that it consumes resources or prompts.
- **Hermes Agent:** `mcp_servers.<name>` in `~/.hermes/config.yaml` with `url` and `auth: oauth`, or the `hermes mcp` commands. Hermes identifies itself by a client ID metadata document (CIMD) when the server supports one and falls back to dynamic registration otherwise. It uses PKCE, opens a browser, and waits for a loopback callback. Tokens are cached in `~/.hermes/mcp-tokens/<server>.json`. It exposes resources and prompts to the model as wrapper tools (`list_resources`, `read_resource`, `list_prompts`, `get_prompt`). Its headless option `hermes mcp login <server> --flow device` needs an OAuth device-authorization grant, which `oidc-route.ts` does not enable today.
- **Our side:** discovery, CIMD, DCR that defaults to `native` when `application_type` is absent, and the consent page that names the requester all shipped in w1/m30–m33 and are deployed. `docs/mcp.md` § Per-host notes calls a host supported only if it has a fixture in `oidc-route.test.ts`.

## Host captures (t001, 2026-10-16)

Live attempts against `https://beancount.io/api-gateway/mcp` with the QA account, stopped on the consent page before approval. Both hosts were installed in isolated prefixes with a throwaway `HOME`. Discovery at the time advertised `client_id_metadata_document_supported: true`, `token_endpoint_auth_methods_supported` including `none`, and `scopes_supported` `openid offline_access profile email ledger.read ledger.write ledger.admin`. The hosted endpoint exposes no deployed revision, so records name the MCP server version instead (as `docs/mcp-agent-eval.md` does).

| | OpenClaw 2026.10.4 (`383c124`), CLI login | Hermes Agent 0.19.0 (`hermes-agent[mcp]`, `mcp` 1.26.0) |
| --- | --- | --- |
| Add the server | `openclaw mcp add beancount --url https://beancount.io/api-gateway/mcp --transport streamable-http --auth oauth`, then `openclaw mcp login beancount` | `mcp_servers.beancount` with `url` and `auth: oauth` in `~/.hermes/config.yaml`, then `hermes mcp login beancount` |
| Identifies itself by | Dynamic registration (an opaque registered `client_id`). It did not use CIMD, although discovery advertises it | Dynamic registration (an opaque registered `client_id`). It did not use CIMD, although discovery advertises it |
| Name on consent | "OpenClaw MCP" | "Hermes Agent" |
| Redirect | `http://127.0.0.1:8989/oauth/callback` (fixed port) | `http://127.0.0.1:<ephemeral>/callback` (64849 in this run) |
| Scope requested | `openid offline_access ledger.read ledger.write ledger.admin` (everything advertised except `profile`/`email`) | the same |
| `prompt` | `consent` | none |
| `resource` | `https://beancount.io/api-gateway/mcp` | the same |
| PKCE | `S256` | `S256` |
| Consent page | Returns to `127.0.0.1:8989`, loopback-only warning, lists "Stay signed in securely until you revoke access" | Returns to `127.0.0.1:64849`, loopback-only warning. **Does not** list "Stay signed in": the consent URL's scope no longer holds `offline_access` |

**From source (read-only, at the release tags).**

- **OpenClaw v2026.10.4** (`383c124c`) uses `@modelcontextprotocol/sdk` 1.31.0. Its DCR body is `{client_name: "OpenClaw MCP", redirect_uris: [redirectUrl], grant_types: [authorization_code, refresh_token], response_types: [code], token_endpoint_auth_method: "none"}` plus the discovered `scope`, with no `application_type` (`src/agents/mcp-oauth-provider.ts:63-72`).
  - **CIMD** is used only when an operator sets `oauth.clientMetadataUrl`.
  - **CLI redirect** is `http://127.0.0.1:8989/oauth/callback` (`src/agents/mcp-oauth-store.mutations.ts:4`). It retries once with `localhost` when the server refuses the redirect.
  - **Per-requester gateway mode** redirects to `<gateway.publicOrigin>/oauth/mcp/callback` (`src/agents/agent-bundle-mcp-requester-connect.ts:30`).
  - **`offline_access`:** the SDK adds `prompt=consent` whenever the scope includes it.
  - **Primitives:** resources and prompts become `<server>__resources_*` / `__prompts_*` tools.
  - **Transport:** omitting `--transport` defaults an HTTP server to SSE.
- **Hermes Agent v0.22.2** (`d923a5eb`, the latest GitHub release; PyPI's newest is 0.19.0) pins `mcp` 2.0.0.
  - **CIMD by default:** it presents `https://nousresearch.github.io/hermes-agent/docs/oauth/client-metadata.json` (`tools/mcp_oauth.py:939`). The document is `application_type: native`, `token_endpoint_auth_method: none`, with redirects `http://{127.0.0.1,localhost}:{27890–27894}/callback`.
  - **DCR fallback:** after an `invalid_client`, or with explicit client settings, it falls back to DCR with `client_name: "Hermes Agent"` and `application_type: native`.
  - **`offline_access`:** it appends it, with `prompt=consent`, when the server's `scopes_supported` lists it.
  - **Device flow** needs an RFC 8628 `device_authorization_endpoint` and does not fall back.
  - **Resources and prompts** are exposed as four wrapper tools.

So the 0.19.0 behaviour captured live (DCR, an ephemeral port, no `prompt`) is the PyPI release's, not the current one's. The fixtures cover both.

**Finding — Hermes gets no refresh token.** oidc-provider 9.11.5 drops `offline_access` from any authorization request whose `prompt` lacks `consent` (`lib/actions/authorization/check_scope.js`), and its default `issueRefreshToken` requires `offline_access`. OpenClaw sends `prompt=consent` and keeps it. Hermes does not, so its grant has no refresh token and the connection lapses when the one-hour access token expires. That contradicts ADR 019 D5 ("a third-party connection lasts while it is used"). Our consent page is always interactive for these hosts, so the OIDC rationale for the rule (no silent offline grant) does not apply. t002 encodes Hermes's real request in a fixture and fixes the root cause, or files it with evidence. t004 confirms with the tokens Hermes actually stores.

**Install notes for the docs (t005).** A plain `pip install hermes-agent` has no MCP support. OAuth fails with "MCP SDK auth module not available" until the `[mcp]` extra is installed. `hermes mcp add … --auth oauth` and `hermes mcp login` refuse to start OAuth without a terminal ("non-interactive environment and no cached tokens found").

## Closeout (2026-10-16)

Checked against `main` at `14aaebee` and the recorded runs:

- **Fixtures.** `oidc-route.test.ts` covers OpenClaw's CLI login (`127.0.0.1:8989`), its `localhost` retry, and its per-requester gateway callback, plus Hermes Agent's CIMD document, its DCR fallback, and 0.19.0's ephemeral-port DCR. All pass, and t008 broke each rule they depend on and watched them fail.
- **Real runs.** Both hosts made real sign-ins on production with the QA account: OpenClaw 2026.10.4 through DCR (t003) and Hermes Agent v0.22.2 through CIMD (t004). Each made one read and one `appendLedgerText` `dry_run` against the synthetic `mcp-agent-eval` ledger. Both are recorded with the date, host version, and MCP server `beancount` 1.0.0 (the endpoint exposes no deployed revision).
- **Docs.** `docs/mcp.md` has a row per host with the commands that were run, how each identifies itself, its redirect, and what it consumes. Hermes's `--flow device` is marked unsupported, with the paste-back alternative. The root README names both hosts (t006).
- **ADR and gaps.** ADR 019 has the 2026-10-16 amendment. The one gap found, a missing `prompt=consent` costing the refresh token, is fixed in `oidc-route.ts` with a test (`1bc31bd0`, simplified in `dac61d05`). Production gets it at the next backend-v2 deploy. Until then only Hermes 0.19.0 from PyPI, an unsupported channel, lacks a refresh token there; the current Hermes release and OpenClaw send `prompt=consent` and were verified with refresh tokens.

## Definition of done

- `oidc-route.test.ts` has a fixture for OpenClaw's CLI sign-in and for Hermes Agent's. Each registers, or presents its CIMD document, exactly as t001 recorded, then authorizes with the redirect that host really uses. Both pass. If OpenClaw's per-requester gateway mode differs, it has its own fixture or a documented reason why not.
- Each host completed a real sign-in with the dedicated QA account, one read, and one `dry_run` write on the hosted endpoint. Each run is recorded with its date, host version, and the deployed backend revision.
- `docs/mcp.md` has an OpenClaw row and a Hermes Agent row. Each row gives the exact add-and-login commands and states how the host identifies itself, which redirect it uses, and what it consumes (tools only, or resources and prompts through wrapper tools). Hermes's device-code flow is marked unsupported, with the paste-back or port-forward alternative.
- ADR 019 records both hosts in an amendment. Every gap found is either fixed with a test or filed as a `w6` inbox note.

## Source + Goal linkage

- **Source:** user request 2026-10-16 to list Beancount.io on OpenClaw and Hermes Agent. [ADR 019](../../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md) D1 (one endpoint for every host) and D8 (every named host has a fixture). Research the same day into both hosts' MCP documentation.
- **Goal linkage:** **A1 — Agent-native accounting.** Two widely used open-source agents can read and write a hosted ledger through the same endpoint that Claude, ChatGPT, Cursor, and Copilot use. Secondary **A3 — Community & distribution**: a documented, verified connection is the listing these hosts offer, and it is the evidence a future Hermes catalog entry would need.
- **Expected outcome:** an OpenClaw or Hermes user pastes two documented commands, approves Beancount.io's consent page, and the agent works on their ledger. Signals: MCP sessions per host on the hosted endpoint.
- **Why now:** the authorization work these hosts depend on is on production (w1/m30–m33, deployed 2026-10-08), and both hosts already speak CIMD or DCR with PKCE, so the remaining work is evidence and docs, not new protocol. Unlike [w1/m34](../../../w1/blocked/m34/README.md), whose hosts need the user's own accounts on hosted services, both hosts here run locally from open source. Only the QA account and, for an agent turn, a model provider key are needed. Per [DO_NOT_DO](../../../DO_NOT_DO.md), real-client runs use the hosted endpoint, the QA account, and synthetic ledgers, never a second stack. Adoption surface is included because the milestone changes the public MCP connection docs.

## Out of scope

- A pull request to Hermes's `optional-mcps/` catalog. Nous curates it, and the docs describe no community submissions. Revisit only if Nous invites one.
- OAuth device-authorization grant on the authorization server. If t004 shows headless Hermes users need it, file it as its own milestone with the REST/GraphQL/MCP parity check.
- Skills on ClawHub ([w6/m6](../../m6/README.md)). Host-specific MCP endpoints, tools, or code (ADR 019 D1).
