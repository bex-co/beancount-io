# w1 · m5 — OAuth 2.1-aligned native mobile authentication

**Worker:** worker1 **Goal:** hosted and self-hosted mobile users authenticate through an external-browser authorization-code flow with PKCE, scoped API access, and safely rotated refresh credentials **Status:** todo (t001–t010 done; t011 next)

## Tasks (in order)

| id   | title                                                   | est | depends_on                  |
| ---- | ------------------------------------------------------- | --- | --------------------------- |
| t001 | Externalize and rotate OAuth signing keys               | 1h  | —                           | — **DONE**
| t002 | Enforce OAuth resources and access-token audiences      | 1h  | t001                        | — **DONE**
| t003 | Enforce the OAuth operation-scope matrix                | 1h  | t002                        | — **DONE**
| t004 | Make issuer configuration and discovery self-host safe  | 1h  | t002                        | — **DONE**
| t005 | Register a code-only public native mobile client        | 45m | t003, t004                  | — **DONE**
| t006 | Add account-wide mobile OAuth consent                   | 1h  | t005                        | — **DONE**
| t007 | Launch native authorization code plus PKCE              | 1h  | t005, t006                  | — **DONE**
| t008 | Add secure OAuth session and refresh management         | 1h  | t007                        | — **DONE**
| t009 | Integrate OAuth refresh and logout with Apollo          | 1h  | t008                        | — **DONE**
| t010 | Stage legacy-session compatibility and bridge retirement | 45m | t009                      | — **DONE**
| t011 | Verify the hosted and self-hosted deployment contract   | 1h  | t004, t005, t006, t009, t010 |
| t012 | Adoption surface                                        | 30m | t011                        |
| t013 | Simplify                                                | 30m | t012                        |
| t014 | Test coverage                                           | 1h  | t012                        |
| t015 | Closeout                                                | 15m | t014                        |

## Definition of done

- Production OAuth signing keys are sourced from deployment secrets rather than tracked files, the replaced key is no longer accepted, and no private JWK material remains in the public repository.
- The authorization server advertises and accepts authorization code rather than implicit response flows for the first-party clients, requires S256 PKCE, restricts resource indicators, and issues the native public client no secret.
- GraphQL, REST, and MCP reject OAuth access tokens with a missing or incorrect audience and reject operations without the required `ledger.read`, `ledger.write`, or `ledger.admin` scope; legacy full-power session JWT behavior remains intentionally unchanged during migration.
- A mobile client can start from the selected server, discover exact protected-resource and authorization-server metadata, validate issuer/resource consistency, and complete the flow against both `https://beancount.io/` and a compatible self-hosted deployment, including a documented localhost-only development exception.
- iOS and Android use the external system browser and reverse-domain app redirects for authorization code plus PKCE. New sign-ins do not receive a session JWT through an embedded WebView or decode an OAuth access token to discover the user.
- Mobile stores OAuth credentials in OS secure storage, performs single-flight refresh with atomic refresh-token rotation, retries one authenticated Apollo operation after refresh, survives transient offline failures, and clears the account only on terminal authorization failure.
- Logout revokes the refresh credential, clears all server-scoped local state and Apollo caches, and documents the maximum lifetime of an already-issued self-contained access token.
- Existing installed sessions remain usable during a defined compatibility window; new authentication uses OAuth, no custom token-exchange grant is introduced, and retirement criteria for the dashboard `postMessage` bridge are explicit.
- Backend, dashboard, mobile, and deployment checks pass, including negative audience/scope/resource cases and warm/cold redirect, refresh-race, logout, hosted-server, and self-hosted-server behavior.

## Source + Goal linkage

- **Source:** `/pm` handoff on 2026-08-22 of the repository investigation into replacing mobile's embedded-WebView session-token bridge with OAuth 2.1-aligned native authentication.
- **Goal linkage:** A2 — Frictionless onboarding. A standards-based native flow lets hosted and self-hosted users authenticate through the same secure, interoperable path without rebuilding the app or trusting a custom WebView message contract. It also supports A3 by making the public self-hosting promise credible to security-conscious adopters.
- **Expected outcome:** a newcomer can select a compatible server, authenticate in the system browser, return to the app, and remain signed in through safe token refresh; server operators can expose a documented OAuth contract rather than reproducing dashboard-specific token handoff behavior.
- **Why now:** m4 made the mobile server selectable at runtime, but the authorization issuer is still production-specific and the current WebView bridge prevents that self-hosting path from becoming a standards-compliant login. The investigation also identified signing-key, audience, and scope controls that must precede broader OAuth issuance, so security hardening is deliberately first in the sequence.
- **Adoption surface:** included because this changes first-run login, compatible-server requirements, and public operator guidance across mobile, backend, and self-host deployment documentation.
