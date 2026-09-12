# ADR: `.well-known` paths — one index for every one of them

- Status: Accepted
- Date: 2026-08-25
- Decision owners: Backend (`backend-cluster/backend-v2`)
- Scope: every `/.well-known/*` path served by, proxied to, or referenced about Beancount.io. What exists today, who serves it, and every file that has to change together when a path is added or moved.

## Context

Beancount.io's `.well-known` traffic includes OAuth/OIDC discovery (RFC 8414 + RFC 9728), RFC 9116 security contact metadata, and MCP client discovery. The implementation is correctly centralized in the backend's well-known route files, but the _knowledge_ of these paths is not: the OAuth routes live in `oidc-route.ts`, the migrated security and MCP routes live in `well-known-route.ts`, their public-access justification lives in `always-public.ts`, their rate-limit bucket lives in `rate-limit.ts`, the dev proxy that forwards them lives in `dashboard/vite.config.ts`, a client-side mirror of the OAuth URL-building logic lives in `mobile/src/common/oauth/discovery.ts`, and deployment warnings about what breaks when OAuth discovery 503s are duplicated across `bex.yaml`, `deploy/docker/docker-compose.yml`, and `.env.tmpl`. Nothing tied these together, so a new well-known path could be added to a route file without anyone updating the proxy, the gate census, or the deployment docs.

This ADR is that index. It does not re-implement or re-decide anything — `oidc-route.ts` is still the source of truth for behavior, and [ADR0007 D4](./ADR007-backend-v2-mcp-surface.md) is still the source of truth for _why_ the MCP endpoint depends on this discovery chain. This document exists so the full set of paths, and the full set of places a change to them touches, is readable in one place.

## The paths

| Path                                                                                                  | RFC                                 | Registered by                                                                                                            | Serves                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/.well-known/oauth-authorization-server[/{issuer-path}]`                                             | RFC 8414                            | `oidc-route.ts` (`authorizationServerMetadataPath`, built by `oauthWellKnownPath("oauth-authorization-server", issuer)`) | OAuth authorization-server metadata: endpoints, supported grants, signing algorithms.                                                              |
| `/.well-known/oauth-protected-resource`                                                               | RFC 9728                            | `oidc-route.ts` (literal)                                                                                                | Protected-resource metadata for the MCP resource; MCP clients discover it through this stable unqualified path.                                    |
| `/.well-known/oauth-protected-resource/v1` (`/.well-known/oauth-protected-resource/{issuer-path}/v1`) | RFC 9728                            | `oidc-route.ts` (`oauthWellKnownPath` over the catalog's application-API resource binding)                               | Path-derived metadata for the historical application API resource shared by GraphQL and REST; the resource identifier is not an HTTP mount.        |
| `/.well-known/security.txt`                                                                           | RFC 9116                            | `well-known-route.ts`                                                                                                    | Security contact, policy, expiry, and preferred language metadata. Migrated from the CMS project's static `public/.well-known/security.txt`.       |
| `/.well-known/mcp.json`                                                                               | Beancount.io MCP discovery contract | `well-known-route.ts`                                                                                                    | MCP transport endpoint, tool names, resource URI templates, OAuth endpoints, and public API contract pointer. Every machine-reachable URL derives from the issuer (see below). Migrated from the CMS project's MCP manifest handler. |
| `/.well-known/apple-app-site-association`                                                             | Apple Universal Links               | `well-known-route.ts`                                                                                                    | AASA voucher for `io.beancount.ios` on `/ledger/*`. Served only when `APP_LINKS_APPLE_TEAM_ID` is set; otherwise 404.                              |
| `/.well-known/assetlinks.json`                                                                        | Android App Links (Digital Asset Links) | `well-known-route.ts`                                                                                                | Asset-links voucher for `io.beancount.android` on `/ledger`. Served only when `APP_LINKS_ANDROID_SHA256` is set; otherwise 404.                    |

When OAuth signing keys are absent (`config.oauth.jwks` unset), all three OAuth discovery routes are replaced with a `503 oauth_not_configured` handler instead of removed — the path still exists, it just can't answer (the early no-JWKS branch in `setOidcRoutes`).

### The MCP manifest's origins (w2/m29)

Every URL in `/.well-known/mcp.json` that a *client* follows — `endpoint`,
`auth.authorizationUrl`, `auth.tokenUrl`, `openapi` — is derived from
`config.oauth.issuer`, the API's own origin. The dashboard URL appears only
under `links`, where a person goes to mint a key or read the guide.

This was not always true: `endpoint` and `openapi` came from the dashboard URL
while `auth` came from the issuer. That is indistinguishable from correct on a
deployment where both are the same host, and wrong on every deployment where
they are not — on `deploy/docker-mac` the dashboard is `:42600` and the API is
`:42601`, so the manifest advertised an MCP endpoint that serves the
dashboard's HTML. The 401's `WWW-Authenticate` pointer and
`oauth-protected-resource` already used the issuer and were right, so the
manifest was the one document disagreeing with the rest.

The scope of that fix is bounded by what `AppConfig` can express. Outside
production `oauth.issuer` is `SERVER_URL`, so the manifest now names the API
origin — which is what makes the local split-origin stack correct. In
production `config.ts` sets `oauthIssuer = dashboardUrl` and
`assertOAuthInteractionHost` requires them to share a host, so the two
expressions are identical and the manifest is unchanged. A production-mode
deployment that genuinely splits dashboard and API origins still cannot say so:
there is no `api.publicUrl` distinct from the OIDC issuer identity. Adding that
concept — and deriving the manifest, the `WWW-Authenticate` pointer, and the
issuer from it — is tracked as `w2/015`.

`yarn mcp:conformance` check 11 holds the invariant: it reads the manifest and
proves the advertised `endpoint` answers an unauthenticated POST with the MCP
handler's 401 challenge, and that the `auth` and `openapi` URLs resolve.

The manifest lists tool **names** and resource **URI templates**, not
descriptions or JSON schemas. Publishing every tool's input and output schema
made it ~20 KB on an anonymous, cached GET whose only job is to say what exists
and where. `tools/list` and `resources/templates/list` answer authoritatively
and per credential; the manifest has no caller to answer for.

### How the issuer path segment works

`oauthWellKnownPath(kind, absoluteUrl)` (`oidc-route.ts`) and its client-side mirror `wellKnownUrl` (`mobile/src/common/oauth/discovery.ts`) both compute `/.well-known/{kind}[/{path}]`, where `{path}` is the given URL's pathname with leading/trailing slashes stripped. This is what lets one backend serve discovery documents for multiple issuer prefixes (multi-tenant ledger owners). Example, from `README.md`, for issuer `https://books.example.test/beancount`:

```text
resource:                       https://books.example.test/beancount/v1
protected resource metadata:    https://books.example.test/.well-known/oauth-protected-resource/beancount/v1
authorization server metadata:  https://books.example.test/.well-known/oauth-authorization-server/beancount
```

In production, where the issuer has no extra path segment, the three paths collapse to the literal forms in the table above.

## Touchpoints — what else changes when a well-known path is added or moved

1. **Route** — `backend-cluster/backend-v2/src/features/oauth/api/oidc-route.ts` for OAuth/OIDC paths, or `backend-cluster/backend-v2/src/features/well-known/api/well-known-route.ts` for security and MCP discovery. OAuth routes also have an `unavailable` twin in the no-JWKS branch.
2. **Scope gate census** — `backend-cluster/backend-v2/src/server/api/always-public.ts`. Every well-known op needs an entry with a written reason; `__tests__/always-public.test.ts` fails in both directions (undocumented mount, or stale entry) if it's missing or wrong.
3. **Rate limiter** — `backend-cluster/backend-v2/src/server/api/rate-limit.ts` buckets any path containing `/.well-known/` under the shared `"oauth"` budget. A path that doesn't literally contain that substring won't get it.
4. **MCP's discovery pointer** — `backend-cluster/backend-v2/src/features/ai-agent/api/mcp-route.ts` names `{issuer}/.well-known/oauth-protected-resource` in the `WWW-Authenticate: Bearer resource_metadata="..."` header on every 401. Moving that path without updating this header breaks MCP client discovery per ADR0007 D4.
5. **Dashboard dev proxy** — `dashboard/vite.config.ts` forwards `/.well-known/**` (wildcard) to the backend at `localhost:4104`. New paths under `/.well-known/` are covered automatically; a well-known path served from somewhere other than backend-v2 would not be.
6. **Mobile client mirror** — `mobile/src/common/oauth/discovery.ts` reimplements the same path-building logic for the mobile app's own discovery flow. Keep it and `oauthWellKnownPath` in sync; both have their own test file (`__tests__/discovery.test.ts`, `oidc-route.test.ts`).
7. **Deployment secret docs** — `bex.yaml`, `deploy/docker/docker-compose.yml`, and `backend-cluster/backend-v2/.env.tmpl` each carry a comment warning that missing `OAUTH_JWKS` makes `/.well-known/oauth-protected-resource` answer `503`, which breaks MCP authentication. Update all three if the warning's target path changes.
8. **SEO / analytics exclusion** — `dashboard/scripts/search-console-report-core.ts` classifies `/.well-known` under `apiPrefixes` so Search Console reporting doesn't misattribute discovery-document traffic to dashboard-owned pages (see `dashboard/CLAUDE.md`).
9. **Backend README** — `backend-cluster/backend-v2/README.md`'s "OAuth deployment contract" section is the canonical worked example of the issuer → resource → well-known path chain; update it if the derivation logic changes.
10. **ADR0007** — `docs/adrs/ADR007-backend-v2-mcp-surface.md` D4 documents _why_ the protected-resource document is part of MCP's contract rather than a neighbouring OAuth feature. This ADR indexes the paths; ADR0007 explains that one consequence in depth. Don't duplicate its prose here.

## Decision

Keep this file as the single list of every `.well-known` path in the system and the files that reference it. Adding, renaming, or removing a well-known path is not done until every touchpoint above is updated and this table reflects the result.
