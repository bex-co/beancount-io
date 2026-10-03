# ADR 0019: MCP hosts — one endpoint for ChatGPT, Claude, Cursor, Copilot, and Muse, and what the authorization server must accept to let them in

- Status: Proposed (2026-09-25). D1 and D2 write down what is already true; D3–D9 are unimplemented — see [Implementation status](#implementation-status-2026-09-25).
- Date: 2026-09-25
- Decision owners: Backend (`backend-cluster/backend-v2`: OAuth provider, MCP surface), Dashboard (`dashboard/`: the consent page), Deploy (edge rules)
- Scope: which third-party MCP hosts the `POST /api-gateway/mcp` endpoint serves, the credential path each one uses, what the authorization server must accept for each to register, sign in, and stay signed in, and which parts of the surface a host that only calls tools can reach. The transport stays [ADR 0007](./ADR007-backend-v2-mcp-surface.md); the tool/resource split stays [ADR 0008](./ADR008-backend-v2-surface-parity.md), amended by D7; the well-known paths stay [ADR 0009](./ADR009-backend-v2-well-known-paths.md).

Paths are relative to `backend-cluster/backend-v2/` unless they start with `dashboard/`. `oidc-provider` line references are to version 9.12.0, the version installed there.

## Context

A **host** here is the application a person actually uses — ChatGPT, Claude, Cursor, VS Code, Muse — which runs an MCP client against our endpoint. The question this record answers is whether one backend can sit behind all of these:

```text
                      ┌── ChatGPT app
                      ├── Claude connector
Beancount.io backend ─┼── Remote MCP ── Cursor
                      │              ├─ GitHub Copilot
                      │              └─ Muse Code
                      └── Muse connector
```

ADR 0007 made the endpoint reachable and ADR 0008 filled it. Neither asked the question that decides whether a host works: can it get a token, keep it, and use what the endpoint serves? That depends on each host's OAuth client and on which MCP primitives it consumes, and every host answers differently. Nothing in the repository exercises a host's OAuth sign-in: the one real-client harness, `yarn mcp:agent-eval`, authenticates Claude Code and Codex with API keys.

### What each host requires (as documented on 2026-09-25)

| Host | Identifies itself to our authorization server by | Redirect URI(s) | Static API key in a header | Primitives it consumes |
| --- | --- | --- | --- | --- |
| Claude (claude.ai, Desktop, mobile, Cowork) | CIMD when the server advertises it **and** lists `none` among token-endpoint auth methods; otherwise DCR | `https://claude.ai/api/mcp/auth_callback` | Beta, entered once by an organization Owner for the whole organization | Tools, resources, prompts |
| Claude Code | Its own [CIMD document](https://claude.ai/oauth/claude-code-client-metadata), or DCR | Loopback on an ephemeral port; the CIMD document declares port-less `http://localhost/callback` and `http://127.0.0.1/callback` and states no `application_type` | Yes | Tools, resources, prompts |
| ChatGPT | CIMD (preferred), DCR, or a predefined client; `none` or `private_key_jwt` at the token endpoint | `https://chatgpt.com/connector_platform_oauth_redirect` when the server supports RFC 9207 `iss`, else `https://chatgpt.com/connector/oauth/{callback_id}` | **No** — OpenAI states ChatGPT cannot present custom API keys | Tool-driven; resources carry UI templates |
| Cursor | DCR | `http://localhost:8787/callback`, `cursor://anysphere.cursor-mcp/oauth/callback`, and `https://www.cursor.com/agents/mcp/oauth/callback`, registered in one request | Yes (`headers` in `mcp.json`) | Not checked here |
| GitHub Copilot in VS Code | DCR | `https://insiders.vscode.dev/redirect`, `https://vscode.dev/redirect`, `http://127.0.0.1/`, `http://127.0.0.1:33418/`; a random loopback port when 33418 is busy | Yes | Not checked here |
| GitHub Copilot cloud agent and code review | — remote servers that use OAuth are unsupported | — | Yes — the only path | **Tools only** |
| Muse Code (Meta) | OAuth 2.1 through `muse mcp login <server>`; registration method unpublished | Unpublished | Yes (`streamable_http`: URL and headers) | Tools (reported) |
| Muse app and Muse Connector Platform (Meta) | Custom Connectors: Muse writes its own client, reportedly DCR with PKCE `S256`. Platform: the submission form offers "API keys", "OAuth with PKCE", "Other" | Unpublished | Offered by the platform form | Unpublished |

Every OAuth host requires PKCE `S256` advertised in the authorization-server metadata, sends the RFC 8707 `resource` parameter, and follows the `401` + `resource_metadata` pointer that ADR 0007 D4 guarantees. The Muse rows are third-party reporting; Meta has published no connector specification (see [Meta Muse](#meta-muse--what-is-known-2026-09-25)).

Two specification facts frame the decisions. The [MCP authorization specification (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration) now ranks client registration as pre-registration, then CIMD, then DCR; marks DCR **deprecated**; and says a client "MUST specify an appropriate `application_type`" during DCR, because omitting it "defaults to `"web"` under OIDC, which can conflict with native-style redirect URIs". Its [security considerations](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations) require the authorization server to "clearly display the redirect URI hostname during authorization", to warn for localhost-only redirect URIs, and to rotate refresh tokens for public clients.

### What a probe found (2026-09-25)

**Live discovery, unauthenticated and read-only, against `https://beancount.io`.** The chain ADR 0007 D4 requires is intact. `POST /api-gateway/mcp` answers `401` with `WWW-Authenticate: Bearer resource_metadata="https://beancount.io/.well-known/oauth-protected-resource"`; that document names `resource: https://beancount.io/api-gateway/mcp` and the issuer; the authorization-server metadata advertises a `registration_endpoint`, `code_challenge_methods_supported: ["S256"]`, `authorization_response_iss_parameter_supported: true`, and `none` among token-endpoint auth methods. It does **not** advertise `client_id_metadata_document_supported`. `https://beancount.io/mcp` is not an MCP endpoint: it answers an `initialize` with `406 application/problem+json`.

**Registration and authorization, against oidc-provider 9.12.0** with dynamic registration enabled, as `src/features/oauth/api/oidc-route.ts:136` enables it, and each host's documented payload:

| Case | Current provider (`application_type` defaults to `web`) | With `clientDefaults.application_type: "native"` |
| --- | --- | --- |
| Claude hosted: register `https://claude.ai/api/mcp/auth_callback` | 201 | 201 |
| ChatGPT: register `https://chatgpt.com/connector_platform_oauth_redirect` | 201 | 201 |
| Claude Code through DCR: register `http://localhost:<port>/callback` | 201 | 201 |
| VS Code: register its four URIs | 201 | 201 |
| VS Code: authorize from `http://127.0.0.1:50123/` (33418 busy) | **400 `invalid_redirect_uri`** | 303 → consent |
| Cursor: register its three URIs, no `application_type` | **400 `invalid_redirect_uri: redirect_uris must only contain web uris`** | 201 |
| Cursor: same URIs, stating `application_type: "native"` | 201 | 201 |
| CIMD enabled; Claude Code's published document; authorize from `http://localhost:3118/callback` | **400 `invalid_redirect_uri`** | 303 → consent |

No host was driven through a full browser sign-in for this record. "Registers" and "303 → consent" mean the registration and authorization steps pass. The rest of the flow is the one ADR 0007 found working on 2026-08-25, apart from the browser consent step it could not script.

### Four gaps behind those results

1. **Registration defaults to `web`.** oidc-provider applies OIDC Registration's default (`lib/consts/client_attributes.js:31`). A `web` client may register only `http:` and `https:` redirects (`lib/helpers/client_schema.js:625–628`), and only a `native` client's loopback redirects match on any port (`lib/models/client.js:486–500`; the loopback hosts are `localhost`, `127.0.0.1`, and `[::1]`). `oidc-route.ts` sets no default: its `clientDefaults` (`:267`) sets only the ID-token algorithm. Cursor loses its whole registration to one URI and never reaches our consent page, so nothing on our side tells the person why. VS Code fails whenever its preferred port is taken. And Claude Code, which registers successfully today through DCR, would break the day we advertise CIMD.
2. **The consent page does not say who is asking.** `/oauth/consent` reads only `uid` and `scope` (`dashboard/src/features/oauth/pages/consent.tsx:284`) and says "An app wants to access your Beancount ledger." (`dashboard/src/features/auth/locales/en.ts:409`). The interaction-details endpoint returns the `client_id` but no name or redirect URI (`oidc-route.ts:374–383`), and the page does not call it. A person cannot tell Claude from Cursor from a client registered five minutes ago under a borrowed name.
3. **Every third-party connection ends on day 14.** Dynamic clients' grants last 14 days (`src/features/oauth/data/config.ts:73`), and only the mobile client's grant slides on refresh (`oidc-route.ts:314–345`; the mobile check is at `:319`). The refresh fails with `invalid_grant` however recently the connector was used, and the host asks the person to reconnect. The README's lifetime table records this as "Unchanged" — accurate, and never a decision anyone made for connectors.
4. **A tools-only host cannot run the bank flow.** Copilot's cloud agent consumes tools only, and OpenAI describes ChatGPT integrations as tool-driven. `manageBankImport`'s `sync` requires an `item_id`; its `submit` and `discard` require staged transaction ids, and `sync` returns only counts (`PlaidSyncResult` in `src/features/plaid/service/plaid-sync-service.ts`). Every `manageBankConnection` operation requires a connection or account id (`bankImportInputSchema` and `bankConnectionInputSchema` in `src/features/ai-agent/tools/bank-import-tool.ts`). All of those ids are listed only by resources (`bankList`, `bankAccounts`, `bankAccountsForItem`, `bankUnsyncedTransactions` in `src/features/ai-agent/api/mcp-resources.ts`). `managePublicKeys`' `delete` has the same shape: its `keyId` is listed only by `beancount://account/public-keys`.

## Decision Drivers

- **A registration failure is invisible.** It happens before our consent page and before any MCP request, so the person sees "couldn't connect" in the host and we see nothing anyone can act on. ADR 0007's lesson — the parts of the contract outside a tool handler must be somebody's stated responsibility — applies to the authorization server too.
- **We do not control hosts.** The specification tells clients to state `application_type`; Cursor's documented registration does not show it. Waiting for every host to comply is waiting indefinitely.
- **Letting more hosts in must not weaken consent.** Every host payload we accept is also a template an attacker can copy, and the consent screen is the only place a person can tell them apart.
- **A tools-only host is a named host,** not a degraded client to ignore. Two of the hosts in scope consume nothing else.
- **Host-specific code is where parity erodes.** ADR 0006 and ADR 0008 made one decision serve three surfaces; one surface must not fork per host.

## Decision

### D1 — One endpoint and one surface for every host

`https://beancount.io/api-gateway/mcp` — for a self-hosted issuer, `{issuer}/api-gateway/mcp` — is the address in every host's configuration and every directory submission. No host gets its own endpoint, tool set, tool description, or code path, and the server never branches on `clientInfo`, `User-Agent`, or client ID. Host differences are absorbed by what hosts already negotiate — protected-resource and authorization-server metadata, and MCP capability negotiation — so what one host is offered, every host is offered, and the parity tests keep meaning something.

`/mcp` is not an address (see the probe). Whether it should become an alias remains ADR 0007 D1's open question; listings do not wait for it.

### D2 — Two credential paths, and the host chooses

- **OAuth** for a person at a browser: Claude, ChatGPT, Copilot in VS Code, Cursor, Muse. The grant is the person's own, approved on our consent page and bound to the MCP audience.
- **A `bcio_` API key in the `Authorization` header** for hosts that cannot run OAuth or run unattended: Copilot's cloud agent and code review, Muse Code, CI; and Cursor, until D3 lands.

ChatGPT has only the first path, and Copilot's cloud agent only the second. Both paths exist today; this record makes them the contract. Two consequences, stated rather than changed:

- Minting a key requires a paid plan (w1/m22), so a free user cannot use a header-only host at all. That pricing decision is out of scope here; this records that it gates a host.
- Claude's `static_headers` (beta) sends one Owner-entered key for everyone in an organization. A `bcio_` key is one person's credential and carries that person's ledger authority, so we do not recommend `static_headers` for Beancount.io; Claude users connect with OAuth.

Tools also declare OpenAI's per-tool `securitySchemes`: OAuth 2 with the scope the tool's op class requires (`read` → `ledger.read`, `write` → `ledger.write`, `admin` → `ledger.admin`; a grouped tool declares its most privileged branch). ChatGPT uses the declaration to decide when to link an account and when to ask for a broader scope; other hosts ignore it. The declaration is derived from `VERB_TABLE` and never hand-written — the rule ADR 0007 D8 applied to output schemas. Where the field sits on the wire follows OpenAI's current Apps SDK reference.

### D3 — A registration that does not state `application_type` is native

`oidc-route.ts` sets `clientDefaults.application_type: "native"`, and the Discourse static client states `"web"` explicitly in `buildStaticOAuthClients`; the mobile client already states `"native"`. A client that states `"web"` keeps web rules; only the default moves. Measured against oidc-provider 9.12.0:

- Cursor's three-URI registration is accepted.
- Loopback redirects match on any port, as RFC 8252 §7.3 requires of the authorization server. VS Code's fallback port works, and so do Claude Code's port-less CIMD redirects (D6).
- Hosted apps' `https` redirects register exactly as before.
- Every authorization by such a client shows our consent page, even when a grant already exists. This is oidc-provider's `native_client_prompt` check (`lib/helpers/interaction_policy/prompts/consent.js:11–22`), RFC 8252 §8.6's rule for redirects another app could claim. Consent should identify the client and requested operation scopes, with access to all authorized ledgers as [decided on 2026-09-27](./ADR007-backend-v2-mcp-surface.md#rejection-rationale-2026-09-27); a returning user sees one screen per re-authorization.
- Newly refused: `http://` redirects to a non-loopback host, and `https` redirects to a loopback address. Neither is a legitimate host redirect in production.

**This deviates from one MCP requirement, on purpose.** The specification's security section says every redirect URI MUST be `localhost` or HTTPS, and `cursor://…` is neither. We admit it for three reasons. RFC 8252 §7.1 and OAuth 2.1 allow private-use schemes for native apps, and the specification's own client-registration section anticipates "native-style redirect URIs". The risk such a scheme adds — another app claiming it — is exactly what `native_client_prompt` and D4 answer. And refusing it does not make Cursor compliant; it makes Cursor fail before consent, invisibly. oidc-provider still refuses `javascript:`, `data:`, and its other forbidden schemes.

Why a default rather than waiting: the specification lets a client retry a rejected registration with an adjusted `application_type`, which a client may or may not do. A default we control fixes every non-compliant host at once, including hosts we have not tested.

### D4 — The consent page names who is asking

Before any third-party authorization can be approved, `/oauth/consent` shows:

- **The redirect URI's host.** It is the one thing a requester cannot choose freely, because the authorization code goes there. The specification requires it.
- **The client's name, labelled as the name the app gave itself.** Names in DCR and CIMD metadata are self-asserted.
- **For a CIMD client, the host of its `client_id` URL** — the domain vouching for that metadata.
- **A warning when every registered redirect is loopback.** Any local process can bind a loopback port; the specification says to warn.

`GET /api-gateway/oauth/interaction/:uid` gains the interaction's `redirect_uri` and the client's `client_name`, and the consent page fetches and renders them. This lands before D6: CIMD turns a client's name into a document anyone can publish, and the specification's display requirement is written for exactly that.

### D5 — A third-party connection lasts while it is used, and is re-approved yearly

For every client that is not one of the two static clients — every DCR and CIMD host:

- **An idle window, like the native app's.** The grant is re-saved on each successful refresh, and a connection unused for the whole window re-authorizes. The window is **45 days**, not the current 30-day refresh-token lifetime: a bookkeeping connector's natural rhythm is the monthly close, and a 30-day window lapses for anyone whose closes fall 31 days apart. The refresh token lasts 45 days and the grant one day longer — the same slack the mobile client keeps.
- **A yearly ceiling.** The re-save never extends a grant past one year after the authorization. Hosts keep these refresh tokens on their own servers, with ledger write authority, and a year bounds what a leak there is worth. The mobile app has no ceiling because its tokens live on the person's own device.
- **Rotation on every refresh for public clients.** `shouldRotateRefreshToken` (`config.ts:144`) stops rotating once a chain is 365.25 days old — oidc-provider's default — which the specification's "MUST rotate refresh tokens" for public clients does not allow. Native hosts are public clients by nature (RFC 8252 §8.4), Claude registers as one, and ChatGPT uses either `none` or `private_key_jwt`. The yearly ceiling ends the grant first, but rotation for public clients becomes unconditional anyway, so the rule does not depend on two numbers staying in order.

Both windows are reviewed code values in `src/features/oauth/data/config.ts`, as the mobile window is, and never environment variables. The README's lifetime table changes with them.

### D6 — Advertise CIMD once D3 and D4 hold

`oidc-route.ts` enables `features.clientIdMetadataDocument`. oidc-provider ships it as experimental (draft-02, `lib/helpers/features.js:45–48`), so it takes `ack: "draft-02"` and must be re-acknowledged whenever an upgrade moves the draft. Discovery then carries `client_id_metadata_document_supported: true`; `none` is already among the token-endpoint auth methods, the other half of Claude's condition.

Why: the specification prefers CIMD and deprecates DCR; Claude and ChatGPT both prefer it; and DCR registers a new client for every fresh connection. Claude's documentation warns of "very large numbers of registered clients" from directory traffic, and each one is a row in our OAuth store that is never swept (`src/features/oauth/data/oauth-adapter-model/postgres-impl.ts:127–128`).

**The order is the decision.** With CIMD on and the current `web` default, Claude Code's own published document is refused at authorization (see the probe), and Claude Code chooses CIMD as soon as the metadata advertises it. Enabling CIMD first would break a host that registers successfully today. D4 comes first because the display requirement is written for CIMD.

What needs no change: `resourceForClient` (`oidc-route.ts:100–106`) already binds every non-static client to the MCP audience, and oidc-provider fetches metadata documents through a dispatcher that refuses special-use addresses, with a 2.5-second timeout and a bounded cache (`lib/helpers/fetch_request.js:207–239`). `allowFetch` and `allowClient` stay permissive: hosts choose CIMD from the metadata flag, not from a refusal, so an allowlist would turn an unknown host into a failed one rather than a DCR one. DCR stays enabled for every host that does not do CIMD.

### D7 — Tools are the surface every host can reach, and an identifier a tool needs must come from a tool

ADR 0008 D2 put reads in resources, and its 2026-09-09 amendment set the exception rule: a read becomes a tool "when agent runs show it is the first thing an agent looks for and clients do not surface the resource". That rule stands, and a tools-only host is by definition a client that does not surface resources.

A tools-only host keeps every tool: BQL (`runBqlQuery`, `runBqlQueryStructured`), which derives what the statement and analysis resources serve; file listing and reading; the four promoted discovery tools; and every write and admin tool. It loses the resource-only reads and the prompts. Most of that loss is inconvenience, and ADR 0008's evidence rule governs it.

One part is structural and needs no agent run: **a tool whose required argument can only be discovered through a resource is unusable on a tools-only host.** Three exist today:

| Tool | Needs | Listed only by |
| --- | --- | --- |
| `manageBankImport` — `sync`, `submit`, `discard` | `item_id` for `sync`; staged transaction ids for `submit` and `discard`, which `sync` never returns (its result is counts only) | `banks`; `bank-transactions/unsynced` |
| `manageBankConnection` — every operation | A connection or account id | `banks`, `bank-accounts` |
| `managePublicKeys` — `delete` | `keyId` | `beancount://account/public-keys` |

Each listing becomes a read-only tool beside its resource twin, wrapping the same service call and authorized exactly as the resource is — ADR 0008's "one list, two adapters". Working names: `listBankConnections` (connections with their accounts), `listStagedBankTransactions`, and `listPublicKeys`. They are annotated read-only, so no host asks a person to confirm a listing, and the `tools/list` size gate rises by what they measure, in the same change, as the 2026-09-09 amendment did. From now on, review applies the rule to any new tool argument that names an existing object: some tool's output must contain it.

This amends that amendment's "no other read is promoted". ADR 0008's Amendments section gets a pointer here when D7 lands.

Pull-request numbers are a different case: no surface lists pull requests, since `pullRequestDetails` reads one by number. `managePullRequests`' `approve` and `reject` therefore rely on the number `create` returned or on the person supplying it, on every host alike, which puts it outside this record.

### D8 — Every host we name has a fixture, and conformance checks what hosts gate on

The failures in this record are invisible to every existing test: registration and authorization happen before any MCP request, and each host's payload differs. So:

- `src/features/oauth/api/__tests__/oidc-route.test.ts` registers each named host's documented payload — Claude hosted, Claude Code through DCR, ChatGPT, VS Code with its four URIs, and Cursor with its three URIs and no `application_type` — and authorizes each with the redirect the host really uses, including a loopback port other than the registered one. Once D6 lands it adds a local copy of Claude Code's metadata document. Documentation and listings call a host supported only when it has a fixture.
- `yarn mcp:conformance` gains read-only checks for what hosts refuse to proceed without: `S256` in `code_challenge_methods_supported`; `authorization_response_iss_parameter_supported: true`, on which ChatGPT's stable redirect depends; a `registration_endpoint`; `none` in `token_endpoint_auth_methods_supported`; a protected-resource `resource` equal to the probed URL; and, after D6, `client_id_metadata_document_supported`. It still registers nothing against a deployment, because a registration writes a row, so registration stays a unit-test property.

### D9 — The OAuth and MCP paths are machine endpoints at the edge

Hosts call `/.well-known/*`, `/api-gateway/oauth/*`, and `/api-gateway/mcp` from their own servers rather than a browser. Claude, for example, calls from `160.79.104.0/21` and allows 10 seconds for discovery, registration, and token calls and 30 seconds for a refresh. A bot challenge, JavaScript interstitial, or WAF rule on those paths fails a host's sign-in before the request reaches the backend. The edge exempts them from interactive challenges; throttling stays in the backend's single rate limiter, where it is keyed on the credential. The dashboard's consent pages are browser traffic and keep the dashboard's rules.

## What each host gets

| Host | Credential path | Today | With D3–D9 | Still outside this record |
| --- | --- | --- | --- | --- |
| Claude connector | OAuth | Registers through DCR | CIMD; the connection survives day 14; consent names the redirect host | Directory submission |
| Claude Code | OAuth or key | Registers through DCR | CIMD; any loopback port | — |
| ChatGPT | OAuth only | Registers through DCR; expected to run as a tool-driven app, not yet exercised | CIMD; the connection survives day 14; `securitySchemes`; the bank flow works | In-chat UI (non-goal); app-directory review |
| Cursor | OAuth or key | Key only — OAuth is refused at registration | OAuth works | — |
| Copilot in VS Code | OAuth or key | Registers through DCR; authorization fails when port 33418 is busy | Any loopback port | — |
| Copilot cloud agent and code review | Key only; tools only | Tools work; the bank flow cannot run | The bank flow works | Keys need a paid plan |
| Muse Code | Key; OAuth | The key path should work; OAuth untried | D3 covers a private-use redirect if it uses one | An end-to-end check |
| Muse connector (app and platform) | Platform-defined | Untried; no published specification | Nothing host-specific | Re-check when Meta publishes |

## Meta Muse — what is known (2026-09-25)

Everything in this section is third-party reporting; Meta has published no connector specification.

- **Timeline.** The Muse app launched on 2026-09-08, and the Muse Connector Platform (`muse.ai/platform`) opened to developers on 2026-09-18. Access is reported to be US-only.
- **Muse Connector Platform.** A submission chooses "Existing MCP", gives the hosted endpoint, offers "API keys", "OAuth with PKCE", or "Other" for authentication, and supplies a documentation URL, access requirements, example prompts, and a 512×512 icon. Meta reviews "functional, security, and legal requirements" with end-to-end testing. No SDK, API specification, redirect URI, or developer terms had been published as of 2026-09-19.
- **Muse app, Custom Connectors.** The app has no MCP setting. Muse writes integration code on its own VM from an MCP URL or API documentation. One integrator reports that it performs DCR with PKCE `S256`, and that it invents OAuth endpoints unless told to start from `/.well-known/oauth-protected-resource`.
- **Muse Code.** A terminal coding agent. Servers go in the `mcp_servers` block of its settings as `stdio` or `streamable_http` (URL and headers), and `muse mcp login` and `muse mcp logout` run OAuth 2.1.

Stance: no Muse-specific code. A submission uses D1's URL, offers both paths — OAuth with PKCE, and API keys for paid plans — and names `/.well-known/oauth-protected-resource` as the starting point in its documentation. If Muse's redirect turns out to be a private-use scheme, D3 already covers it. Re-check this section when Meta publishes a specification.

## Non-goals

- **In-chat UI for ChatGPT** (MCP Apps `ui://` resources, Apps SDK components). That is a product decision needing its own record; ChatGPT gets the tool surface.
- **Host-specific tools, descriptions, or endpoints** — see D1.
- **Anthropic-held credentials or a predefined ChatGPT client.** Both end per-connection registration, but each is a per-host secret to hold and rotate, and CIMD ends it with no secret. Revisit if a directory requires one.
- **Submitting directory listings.** Listing on Claude's directory, ChatGPT's app directory, or Muse's is a product decision; this record makes the technical prerequisites true. The official MCP Registry is the one exception, taken up in [Amendments](#amendments): it needs none of this record's decisions.
- **The paid-plan rule for API keys.** D2 records its effect; it does not change it.

## Alternatives Considered

### Keep the strict default and wait for hosts to state `application_type` (rejected)

The specification is on this side: a client MUST state it. But the cost of waiting lands on our users, invisibly, and is paid again for every host we have not tested. A default costs one line and a consent screen.

### Infer `application_type` from the redirect URIs (rejected)

This would treat a registration as native only when it names a private-use scheme or a loopback redirect, leaving `https`-only hosts on web rules. The difference from D3 that matters is that Claude's and ChatGPT's users would skip the consent screen on re-authorization. We want that screen — it is the point of D4 — and the inference needs code ahead of oidc-provider's own parsing of the registration body. `src/server/start-server.ts:64–67` deliberately routes `/api-gateway/oauth/*` past the app's body parser, and that is a path where a parsing mistake is a security bug.

### Allowlist the hosts whose CIMD documents we fetch (rejected)

Hosts choose CIMD from the metadata flag, not from a refusal, so an unlisted CIMD host would fail rather than fall back to DCR. oidc-provider's fetch already refuses special-use addresses, which covers the SSRF risk an allowlist would have addressed.

### A generic `readResource` tool for tools-only hosts (deferred, not rejected)

One tool could restore every resource read. But an agent would have to build a URI from templates it cannot list, which needs a second tool or a template catalogue inside a description — the `tools/list` size that ADR 0008's amendment pins. D7 fixes what is broken, not what is merely inconvenient. Build the bridge if tools-only hosts' transcripts show them missing reads that BQL cannot produce.

### `list` operations on the existing grouped tools (rejected)

This would keep the tool count flat. But a grouped write tool carries write or destructive annotations, and hosts ask a person to confirm those, so every listing would cost a confirmation click.

### An endpoint per host (rejected)

ADR 0007 D1 already rules this out, and each host would need its own discovery documents and audience.

## Consequences

### Positive

- Cursor gains OAuth, VS Code survives a busy port, and Claude Code keeps working when CIMD is advertised.
- Connectors stop failing on day 14. A connector used at least every 45 days stays connected for up to a year.
- A person approving a grant can see who is asking.
- The bank flow and key deletion work on ChatGPT and Copilot's cloud agent.
- CIMD hosts stop adding an OAuth client row per connection.

### Negative

- A returning user sees the consent screen at every re-authorization (`native_client_prompt`), and a year-old connection must be re-approved.
- An experimental oidc-provider feature sits on the authorization path and must be re-acknowledged on upgrades that move the draft.
- Private-use-scheme redirects are admitted — a deliberate deviation from one MCP requirement (D3).
- Three more tools, and a higher `tools/list` size gate.
- The host tables here age quickly. The fixtures in D8 are what keep this record honest.

## Implementation status (2026-09-25)

Nothing has landed. D3, D4, and D6 land in that order, each depending on the one before. D5 and D7 are independent. D8's fixtures grow with each change. D9 is a deployment check: the edge rules on the three path families have not been reviewed.

| Decision | Change |
| --- | --- |
| D2 | `securitySchemes` derived from the op class on each tool descriptor, where `src/server/api/composition-root.ts` registers them |
| D3 | `clientDefaults.application_type` in `src/features/oauth/api/oidc-route.ts`; Discourse states `"web"` in `buildStaticOAuthClients` (`src/features/oauth/data/config.ts`) |
| D4 | `redirect_uri` and `client_name` on `GET /api-gateway/oauth/interaction/:uid`; `dashboard/src/features/oauth/pages/consent.tsx` renders them, with copy in every locale |
| D5 | `oauthLifetimes`, `shouldRotateRefreshToken`, and the TTLs in `config.ts`; the grant re-save in `oidc-route.ts` extended from the mobile client to every non-static client and capped at one year; the README lifetime table |
| D6 | `features.clientIdMetadataDocument: { enabled: true, ack: "draft-02" }` in `oidc-route.ts` |
| D7 | The three list tools in `src/features/ai-agent/api/mcp-tools.ts` with their `VERB_TABLE` bindings; the `tools/list` size gate; the pointer in ADR 0008's Amendments |
| D8 | Host fixtures in `oidc-route.test.ts`; metadata checks in `scripts/mcp-conformance.ts` |
| D9 | Edge-rule review for `/.well-known/*`, `/api-gateway/oauth/*`, and `/api-gateway/mcp` |
| Docs | Per-host setup notes in `docs/mcp.md` under "Connect a client", once each host has a fixture |
| Listing | `backend-cluster/backend-v2/server.json`, the `/.well-known/mcp-registry-auth` route behind `MCP_REGISTRY_AUTH_PROOF`, and `.github/workflows/publish-mcp-registry.yml` — see [Amendments](#amendments) (2026-10-02); tracked as `.pm/w2/m36` |

## Open Questions

Ledger scope was settled on 2026-09-27: [MCP connections should access all authorized ledgers](./ADR007-backend-v2-mcp-surface.md#rejection-rationale-2026-09-27), without choosing one ledger or a subset. The current consent selector predates that decision; removing it and handling existing pinned credentials remain implementation work.

- **Is Codex a fair stand-in for a tools-only host** in `yarn mcp:agent-eval`? ChatGPT cannot be driven by the harness, and D7's deferred bridge needs transcripts from a host that never reads resources.
- **Does ChatGPT surface MCP resources to the model at all?** OpenAI's documentation describes integrations as tool-driven and resources as carriers for UI, but nobody has examined a transcript.
- **Which directory comes first** — answered in part on 2026-10-02 ([Amendments](#amendments)): the official MCP Registry listing ships first, because it needs none of D3–D9. The order among Claude's, ChatGPT's, and Muse's directories remains open.

## Amendments

### 2026-10-02 — The official MCP Registry listing goes first

The open question "which directory comes first" is answered for a directory this record did not name. The hosted endpoint is published to the official MCP Registry (`registry.modelcontextprotocol.io`) as `io.beancount/beancount`, from `backend-cluster/backend-v2/server.json`, by `.github/workflows/publish-mcp-registry.yml`; the work is tracked as `.pm/w2/m36`. It goes first because it depends on none of D3–D9: the listing names D1's URL and nothing else — no header, no package — so a client that installs from it meets the same `401` and discovery chain as one configured by hand; the registry checks only that the remote is HTTPS and that the publisher controls `beancount.io`; and subregistries and aggregators — Smithery and PulseMCP among those the registry's own documentation names — read its API, so one listing reaches several hosts at once. Domain control is proven over HTTP: `GET /.well-known/mcp-registry-auth` serves the signing key's public record from `MCP_REGISTRY_AUTH_PROOF`, and answers 404 when unset so a self-host never vouches for Beancount.io's key (ADR 0009 indexes the path). Published versions are immutable, so a listing change bumps `version`. Claude's, ChatGPT's, and Muse's directories still wait on D3–D9 and on each host's own review; their order remains open.

## References

Internal:

- `src/features/oauth/api/oidc-route.ts` — provider configuration (`clientDefaults`, features, grant re-save), interaction details, discovery documents
- `src/features/oauth/data/config.ts` — client catalog, lifetimes, rotation policy
- `src/features/oauth/data/oauth-adapter-model/postgres-impl.ts` — which OAuth rows the cleanup job never sweeps
- `dashboard/src/features/oauth/pages/consent.tsx` — the third-party consent page
- `src/features/ai-agent/api/mcp-tools.ts`, `src/features/ai-agent/api/mcp-resources.ts`, `src/features/ai-agent/tools/bank-import-tool.ts` — the tool and resource surface D7 audits
- `src/server/start-server.ts` — which OAuth routes bypass the app's body parser
- `scripts/mcp-conformance.ts` — the read-only deployment checks D8 extends
- oidc-provider 9.12.0 — `lib/consts/client_attributes.js`, `lib/helpers/client_schema.js`, `lib/models/client.js`, `lib/helpers/interaction_policy/prompts/consent.js`, `lib/helpers/features.js`, `lib/helpers/fetch_request.js`
- [ADR 0007](./ADR007-backend-v2-mcp-surface.md) — transport contract; D1 (address), D4 (discovery), and the 2026-09-27 rejection of ledger pinning
- [ADR 0008](./ADR008-backend-v2-surface-parity.md) — resources versus tools, and its 2026-09-09 amendment
- [ADR 0009](./ADR009-backend-v2-well-known-paths.md) — well-known paths; D6 adds a metadata field, not a path

External (read 2026-09-25):

- MCP specification 2026-07-28 — [client registration](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration), [security considerations](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations)
- Anthropic — [Authentication for connectors](https://claude.com/docs/connectors/building/authentication); [Claude Code's client metadata document](https://claude.ai/oauth/claude-code-client-metadata); [Get started with custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- OpenAI — [Apps SDK authentication](https://developers.openai.com/apps-sdk/build/auth/); [MCP server concepts](https://developers.openai.com/plugins/concepts/mcp-server)
- GitHub — [MCP and Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/mcp-and-cloud-agent)
- Cursor — [staff reply on the redirect URIs Cursor registers](https://forum.cursor.com/t/oauth-redirect-uri-changed-from-cursor-to-http-localhost-for-streamable-http-mcp/165019)
- VS Code — [redirect URIs registered, and the busy-port mismatch (microsoft/vscode#278512)](https://github.com/microsoft/vscode/issues/278512)
- Meta Muse, third-party reporting — [Does Meta Muse support MCP?](https://www.aiagentslibrary.com/blog/meta-muse-mcp/); [How to submit an MCP server to Muse](https://manufact.com/blog/submit-mcp-server-to-muse); [Muse Connector Platform](https://cellcog.ai/blog/muse-connector-platform/); [an integrator's Muse OAuth notes (vectorize-io/hindsight#4684)](https://github.com/vectorize-io/hindsight/pull/4684); [a Muse spike noting US-only access (ima-jin/imajin-ai#2250)](https://github.com/ima-jin/imajin-ai/issues/2250)
- RFC 8252 (§7.1 private-use schemes, §7.3 loopback ports, §8.6 client impersonation), RFC 9207 (`iss`), RFC 8707 (`resource`)
