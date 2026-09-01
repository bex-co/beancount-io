# w2 · m21 — Dashboard OAuth 2.1 migration

**Worker:** worker2 **Goal:** make the Dashboard a first-party OAuth 2.1 client with a 365-day access token while preserving existing browser sessions and the narrower Mobile/MCP credential contracts **Status:** done

**Continuation:** m21 proved Dashboard OAuth token issuance and use, but live development validation also confirmed that new password/OTP authentication still issued a legacy Dashboard session as a bootstrap credential. The OAuth-only completion and deletion of new legacy-session issuance are tracked in `w2/m23`; m21 is phase 1, not the final login architecture.

## Tasks (in order)

| id   | title                                                        | est | depends_on |
| ---- | ------------------------------------------------------------ | --- | ---------- |
| t001 | Specify the first-party browser client and lifetime contract — **DONE** | 50m | —          |
| t002 | Add the Dashboard client and client-specific one-year TTL — **DONE**    | 60m | t001       |
| t003 | Admit Dashboard OAuth at consent and PDP boundaries — **DONE**          | 60m | t002       |
| t004 | Implement a server-side authorization-code and PKCE bootstrap — **DONE** | 90m | t003       |
| t005 | Cut login, signup, SSR, and CSR paths over to OAuth — **DONE**          | 90m | t004       |
| t006 | Migrate logout, expiry, and existing browser sessions — **DONE**        | 75m | t005       |
| t007 | Adoption surface — **DONE**                                             | 30m | t006       |
| t008 | Simplify — **DONE**                                                     | 30m | t007       |
| t009 | Test coverage — **DONE**                                                | 90m | t007       |
| t010 | Closeout — **DONE**                                                     | 20m | t008, t009 |

## Definition of done

- The Dashboard is a named static first-party OAuth client using authorization code + S256 PKCE and the application API audience `<issuer>/v1`; its redirect URI works for the official deployment and self-hosted path-prefixed issuers without a production-host constant.
- Every newly authenticated Dashboard browser receives an asymmetric OAuth access token whose `client_id` is the Dashboard client and whose expiry is exactly 365 days; Mobile, MCP, Discourse, authorization-code, interaction, grant, and provider-session lifetimes do not broaden accidentally.
- The bearer token is exchanged server-side and stored only in a `Secure`, `HttpOnly`, appropriately `SameSite` cookie. It never appears in browser JavaScript storage, a URL, analytics, logs, or rendered HTML; OAuth state, issuer, resource, redirect, and PKCE verifier are validated before the cookie is written.
- Password, OTP signup, magic-link callback, protected-route redirect, CSR Apollo, SSR Apollo, REST/agent calls, account deletion, and logout work with the OAuth identity and retain their current user-visible navigation and error behavior.
- Credential policy identifies the exact first-party Dashboard OAuth client where an interactive browser identity is required. A DCR/MCP token, API key, Mobile token, or arbitrary issuer-signed OAuth client does not inherit billing, profile-management, credential-approval, or OAuth-consent authority.
- Existing valid Dashboard session cookies continue to work and can move to the OAuth credential without a forced sign-in or cache/account leak; rollback can restore prior Dashboard session issuance without changing the issuer or invalidating Mobile or MCP grants.
- The one-year self-contained bearer limitation is explicit: clearing the browser cookie logs out that browser but cannot revoke a copied access token before expiry. Documentation and UI do not claim immediate server-side revocation, and the operational response for compromise is recorded.
- Dashboard and backend checks, protocol/failure tests, guidance validation, secret scan, and a deployed development smoke test pass. Production deployment remains a separate explicit action.

## Source + Goal linkage

- **Source:** user request on 2026-08-30 to migrate the Dashboard to OAuth 2.1 and give its access token a one-year lifetime, assigned explicitly to `w2`.
- **Goal linkage:** **A2 — Frictionless onboarding** — web, native, and integration clients use one discoverable OAuth authority while existing Dashboard users keep a continuous sign-in experience.
- **Expected outcome:** a newcomer or self-hosted operator can sign in through the Dashboard and receive the same issuer/resource identity model used by API clients, with no flag-day logout and no bearer token exposed to browser code.
- **Why now:** the centralized OAuth client/resource catalog and Mobile `/v1` compatibility contract are now in place; doing this after the pending authz convergence avoids preserving `session-only` as a second long-term authority.
- **Adoption surface:** included because login, signup, logout, self-host configuration, and contributor-facing authentication guidance all change.
- **Security decision:** the requested 365-day value applies only to the Dashboard access token. It is not a global OAuth TTL change, and its lack of immediate revocation must remain visible in implementation, tests, docs, and review.
