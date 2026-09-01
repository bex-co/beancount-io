# ADR 0011: The Dashboard is a first-party OAuth 2.1 client

- **Status:** Accepted
- **Date:** 2026-08-31
- **Owners:** Dashboard and backend-v2

## Context

The browser historically used a revocable, symmetric session JWT in the
`authSess:beancount.io` cookie. Mobile and MCP now use the same backend as an
OAuth authorization server, but the Dashboard remained a second credential
authority. Moving the Dashboard cannot sign out every existing browser, expose
a bearer to JavaScript, or broaden Mobile, MCP, Discourse, authorization-code,
interaction, grant, refresh-token, or provider-session lifetimes.

The requested Dashboard access-token lifetime is exactly 365 days. The token is
self-contained: deleting its browser cookie ends that browser's authority, but
does not revoke a copy made before deletion. That limitation is a property of
the requested credential, not something the logout UI may obscure.

## Decision

### D1. One static public browser client

The catalog entry `beancount-dashboard` is a static, public `web` client. It
uses only authorization code with S256 PKCE, has no client secret and no refresh
grant, and requests:

```text
redirect URI: <issuer>/oauth/dashboard/callback
resource:     <issuer>/v1
scopes:       openid ledger.read ledger.write ledger.admin
```

`<issuer>` is deployment configuration and may include a path prefix. The
callback, post-logout URI, API audience, discovery paths, and provider endpoints
are derived from it; no production hostname appears in client policy.

### D2. The year applies only to this access token

`ttl.AccessToken` selects `365 * 24 * 60 * 60` seconds only when the verified
provider client is exactly `beancount-dashboard`. All other access tokens remain
one hour. Mobile keeps its separate one-year rotating refresh token and
366-day sliding grant; default refresh, grant, authorization-code, interaction,
and provider-session policies remain unchanged. Discourse remains identity-only
and DCR clients remain bound to the MCP resource.

### D3. Exchange and storage stay server-side

`/oauth/dashboard/start` creates a state value and S256 verifier, then stores
state, verifier, issuer, resource, callback, safe continuation, creation time,
and version in a ten-minute HMAC-authenticated `Secure`, `HttpOnly`,
`SameSite=Lax` transaction cookie. The callback rejects duplicate parameters,
stale or tampered state, a different authorization-response `iss`, callback,
resource, endpoint origin/path, or unsafe continuation before exchange.

The callback exchanges the single-use code from Dashboard SSR through the
internal backend address. It cryptographically verifies the ES256 access token
against the issuer's pinned JWKS and accepts it only when its issuer, sole
audience, signed `client_id`, complete scope set, `expires_in`, and `exp - iat`
match this decision; any refresh token is rejected. The access token replaces
`authSess:beancount.io` in a `Secure`, `HttpOnly`, `SameSite=Lax`, path-root
cookie. Neither access token nor verifier enters browser storage, a URL,
rendered HTML, analytics, or application logs.

### D4. The first-party boundary comes from verified identity

An interactive identity is either a valid pre-cutover legacy token accepted by
the verify-only compatibility branch or an OAuth identity whose verified signed client id is exactly
`beancount-dashboard`. Request headers such as `x-app-id`, cookie names, scopes,
and caller arguments are not classification inputs.

This predicate gates automatic Dashboard consent, CLI/device credential
approval, browser-only operation classes, profile management, lifecycle,
API-key creation, and billing before relationship/domain work. Mobile, DCR/MCP,
Discourse, API keys, an unknown OAuth client, and a forged exemption bit do not
inherit that authority. Ordinary API operations remain scope- and
relationship-gated under the existing model.

### D5. Dashboard credentials are accepted only inside OAuth

An unauthenticated password, signup, or magic-link entry starts authorization
code + S256 PKCE before a credential form is rendered. The authorization
server redirects only the exact `beancount-dashboard` interaction to the
Dashboard. Dashboard SSR binds that provider-validated interaction id into the
signed HttpOnly PKCE transaction before rendering password or OTP input. Forms
POST back through that same consent route, where the signed binding and the
provider's path-scoped interaction cookie are both present; Dashboard SSR then
forwards the body to the exact backend interaction operation.

The interaction authentication service verifies a password, consumes a
one-time link, or creates an OTP-verified account and returns only the stable
user id to the provider. It cannot create, refresh, return, or set a legacy
application session. Signup OTP state is bound to the same interaction id, so a
session copied to another authorization cannot create a grant. Magic-link
secrets remain in the signed transaction and are consumed server-to-server
inside the interaction. Password reset and forgot-password remain public
account-recovery ceremonies, not credential issuers.

A valid pre-cutover session on a protected SSR route may silently approve the
Dashboard interaction with its current safe destination. This is a one-way
upgrade using the read-only compatibility verifier; failure preserves the
still-valid legacy cookie and never renews it.

CSR sends the new cookie to the same-origin `/api-gateway/` proxy; SSR reads the
same cookie and forwards it as a bearer only on the server. GraphQL, REST,
streaming agent calls, protected routing, and Apollo account isolation therefore
resolve one identity without exposing or copying the token into client state.

### D6. Compatibility is verify-only and one-way

New Dashboard authentication never issues a legacy session. Already-issued
valid tokens remain accepted with their historical authority through their own
expiry, no later than 365 days after the separately authorized production
cutover. They
cannot be refreshed, rotated, or reached from a newly unauthenticated Dashboard
login. The compatibility verifier may be removed after that maximum expiry and
30 consecutive days without legacy Dashboard use.

There is no runtime rollback to legacy issuance. Operational rollback means
fixing or reverting the OAuth implementation as a deployment while preserving
already-valid credentials; it must not create a second Dashboard login
authority. This does not change issuer keys, Mobile grants, MCP registrations,
or the generic legacy contracts still owned by non-Dashboard consumers.

### D7. Logout is local revocation, not bearer revocation

Logout clears analytics and the document/Apollo identity, destroys provider browser state through the provider
end-session ceremony, and deletes the OAuth and transaction cookies. The UI and
documentation say only that this browser is signed out.

A copied access token remains valid until its `exp`. For a confirmed compromise,
operators rotate the OAuth signing key, remove the compromised public key from
the accepted JWKS, redeploy, review authorization audit events, and require
affected users to sign in again. This invalidates every token signed only by
that key, so it is an issuer-wide emergency response rather than per-token
revocation.

### D8. One public front door

Browser API requests and OAuth endpoints use the issuer/dashboard origin. The
Dashboard server proxies `/api-gateway/*` (including streaming responses) and
the RFC well-known paths to backend-v2 over `SSR_API_URL`. This is required when
Dashboard and API containers have different internal or public hostnames: a
host-only OAuth cookie must not depend on a parent-domain cookie or cross-site
credential behavior.

## Entry-point ownership

| Existing path | Migration owner |
| --- | --- |
| Password login | Dashboard PKCE starts first; password verification completes that exact interaction |
| Signup + OTP | Dashboard PKCE starts first; the OTP session is bound to and completes that exact interaction |
| Magic link | The historical callback starts Dashboard PKCE; the token is consumed inside that exact interaction |
| Existing session | Root protected SSR detects the legacy signing algorithm only after `userProfile` verifies it, then attempts a one-way upgrade without deleting the valid cookie on failure |
| Mobile consent | Existing mobile page; approver may be legacy session or exact Dashboard OAuth |
| MCP consent | Existing ledger consent page; same exact approver predicate |
| Discourse consent | Existing identity page; same exact approver predicate |
| CSR GraphQL/REST/agent | Same-origin proxy carries only the HttpOnly cookie |
| SSR GraphQL | Server reads the cookie and emits an internal bearer header |
| Logout | Provider end-session plus local cookie/cache/analytics cleanup |

## Legacy-surface disposition

| Surface | Final disposition and live owner |
| --- | --- |
| Dashboard password, signup, OTP, and magic-link pages | Replaced by the OAuth-bound interaction operations in D5; they cannot call a legacy issuer |
| Dashboard post-login bootstrap, token bridge, one-time-token callback exchange, and runtime fallback flag | Deleted |
| `authSess:beancount.io` identity read | Retained only to verify an already-issued token until its original expiry, or to verify the exact Dashboard OAuth access token; it cannot issue or extend either credential |
| GraphQL legacy sign-in, signup verification, magic-link exchange, refresh, and revocation | Retained for the live Mobile, MCP, and identity-consent clients; they are not imported or called by the Dashboard login/signup routes |
| OAuth provider interaction, session, grant, authorization-code, and PKCE transaction records | Retained protocol state owned by the authorization server; none is the retired application session |
| Dashboard callback cookie write | Retained as the sole new Dashboard credential write and accepts only a cryptographically verified `beancount-dashboard` access token |

## Consequences

The Dashboard, Mobile, MCP, and Discourse now share issuer and resource
semantics without sharing credential authority or lifetimes. The tradeoff is a
long-lived bearer with issuer-wide, rather than per-token, emergency
invalidation. A future reference-token or revocation service would require a
separate decision; it is not simulated here.
