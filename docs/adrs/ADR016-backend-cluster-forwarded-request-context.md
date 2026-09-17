# ADR 016: Forwarded request context between backend-v2 and the ledger service

- Status: Accepted (2026-09-16).
- Decision owner: backend-v2 (`backend-cluster/backend-v2`) and the ledger service (`backend-cluster/ledger`), jointly — the two ends of one wire format.

## Context

backend-v2 has had per-request correlation since it was written: `asyncContextMiddleware` mints or adopts a request ID, stores it in `AsyncLocalStorage`, and the logger stamps it on every line. The ledger service has the receiving half of that machinery — `shared/async-context.ts` defines `RequestContext { requestId, userId }` and the logger's `mergeContext()` reads it — but **nothing ever called `asyncContext.run()` in production code**. `getRequestContext()` always returned `undefined`, `mergeContext()` returned its argument unchanged, and every ledger log line was uncorrelated. A request could not be followed across the boundary between the two services, which is where most of the interesting failures live.

Separately, a recurring request is to make some piece of the originating request available deep inside the ledger service (the motivating case was a session cookie for a login-gated price route). Answering that one value at a time means threading a parameter through `loadCachedFileMapForRepo` → `withManagedPrices` → `overlayManagedPrices` → `resolveManagedPriceFeed` every time. The question this ADR settles is what the channel looks like, so the next field costs nothing.

Two facts constrain the design:

1. **The ledger service already reads two request headers as authority.** `server/auth.ts:70` reads `Authorization` (Basic, `token …`, or the private `Anonymous` marker) and `server/auth.ts:111` reads `x-directive-limit-exempt`. The second is trusted with no authentication at all — its own doc comment says so — and its only protection is that the service is unreachable from the internet (`bex.yaml` deploys it as a pserv with no public port). Any mechanism that lets caller-controlled data land in the header bag those two read turns a tier limit into an opt-out and breaks authentication outright.
2. **backend-v2 accepts an inbound `X-Request-Id`.** Whatever correlation ID exists is therefore attacker-influenced end to end. It is safe for logs and unsafe for anything else.

## Decision

One header, `x-bcio-context`, carries cross-cutting context from backend-v2 to the ledger service. It is untrusted at the receiving end and carries no authorization decision. It carries exactly one credential — the caller's own token, relayed rather than trusted — under the conditions in section 7.

### 1. One envelope, not one header per field

The grammar is the W3C Baggage shape: `key=value` pairs, comma-separated, human-readable, unknown keys preserved and ignored. That format's rationale applies directly here — a single header is one thing to allowlist at a proxy and one thing to strip at a trust boundary, an intermediary cannot drop half of it (a flat set silently arrives incomplete when one name is missed), and the receiving side needs no change to tolerate a field it does not know. Human-readable is deliberate: a cryptic envelope would hide what is being disclosed.

The standard `baggage` header name is **not** reused. A private name guarantees no tracing SDK auto-propagates this envelope onward — in particular, not onto the outbound managed-price fetch, which leaves for a third-party origin.

### 2. The envelope is untrusted, and authority never travels in it

Nothing parsed from `x-bcio-context` may be read for authentication, authorization, or a limit decision. Those keep their existing named channels — `Authorization` and `x-directive-limit-exempt` — which `server/auth.ts` reads directly off the request and which the envelope must never carry. This is what preserves the property that makes the current design safe: the ledger service can tell what backend-v2 *decided* from what a caller merely *said*.

Credentials are excluded by default on a separate ground: the envelope's whole purpose is onward propagation and broad readability, and a credential needs the opposite of both. Section 7 admits exactly one, under stated conditions, and is the only place that exception may be widened.

### 3. The parser is bounded, and the bounds are checked first

Every published DoS against this class of header — the OpenTelemetry Java and Datadog baggage advisories — came from parsing an unbounded attacker-supplied value on the extract side. The ledger service refuses a header over 8192 characters before splitting it, examines at most 32 entries, and drops any key over 64 or value over 2048 characters (sized for the credential of section 7). The entry cap is applied by `split(",", MAX_ENTRIES)` rather than by counting accepted entries: the bound has to limit entries *examined*, or a header of bare separators costs a full scan while the counter never moves. Entries are dropped whole, never truncated, so a partial value cannot be mistaken for a complete one. A malformed envelope is never an error: parsing yields whatever was well-formed and the request proceeds.

### 4. `request-id` is the first and only field

Values must match `[A-Za-z0-9._:-]{1,128}` at both ends. A value that does not is dropped and the ledger service mints a UUID instead — an ID is only worth adopting if it is safe to print, and this one reaches every log line, so separators and control characters would let a caller forge log structure. Outside a request (a scheduler job, a script, a test) backend-v2 sends no header and the ledger service mints its own.

The ledger service echoes the ID as `X-Request-Id`, matching backend-v2, so the value is observable with curl rather than only in logs.

### 5. Injection is per request, not per client

The envelope is attached inside `ApiClient`'s request wrapper rather than in `baseApiParams`. A fava client can outlive the request that built it (the anonymous client is process-wide), and the envelope describes the request in flight. A caller's own header of the same name wins, and header shapes this codebase never produces (`Headers`, `[key, value][]`) pass through untouched rather than being normalized, so no existing call site changes behavior.

### 6. The parser is not shared code

Packages in this repository are independent and do not import across package boundaries. backend-v2 only serializes and the ledger service only parses, so the two ends implement opposite directions of the format rather than duplicating one implementation. This ADR is the contract that keeps them in agreement; each side's tests pin the header name and grammar.

### 7. One credential travels, as a named exception

`session-token` carries the caller's own credential, which section 2's general rule would otherwise forbid. It is admitted deliberately, and only because the receiving side never trusts it.

**What it is for.** `beancount.io/prices/<ALIAS>` sits behind beancount.io's own login gate: a plain GET answers 302 to `/auth/login`, and the price fetcher refuses redirects, so every managed price include reports as unavailable. Relaying the caller's credential lets the ledger service fetch that feed on the caller's behalf instead of failing.

**Why it is safe to relay.** The ledger service does not verify, interpret, or act on this value. It copies it into a `Cookie: authSess:beancount.io=<token>` header on one outbound request and nothing else. beancount.io verifies it, exactly as it would have if the caller had requested the URL directly. A forged value therefore buys nothing that a caller could not already do from a browser — which is what keeps section 2's rule intact in substance: no *decision* is being taken on an untrusted input.

**Not narrowed by kind.** `getTokenFromCtx` already collapses the three inlets — `Authorization: Bearer`, `x-api-key`, and the session cookie — into one string, and `resolveIdentity` tries OAuth, then the API-key store, then the session model against whatever it produced, regardless of which inlet carried it. A `bcio_` key presented as the cookie value resolves the same way a session JWT does, so filtering by shape at the sending end would break working cases without preventing anything. The dashboard's SSR converts the cookie into a bearer carrying the *same* JWT, so cookie and bearer are two containers for one string and only one field is needed.

**Scope.** The cookie is attached only to requests whose host matches `MANAGED_PRICE_GATED_HOST` (default `beancount.io`) and whose path satisfies `PRICES_PATH_RE` — the same expression `parseManagedPriceUrl` uses, so the cookie decision cannot drift looser than the "is this a managed price URL" decision. The host is configurable for the same reason the origin allowlist is: a staging or local deployment points elsewhere, and a hardcoded host would make the fetch there go out anonymous, take the redirect, and report every include unavailable with nothing naming the cause. An empty value disables the relay without disabling feeds. Matching on host rather than full origin is deliberate: the include is written `https://` and the gate redirects to `http://`, so both schemes must qualify. Redirects remain unfollowed, so the credential cannot travel to another host. Outside a request — a refresh with no caller — there is no token and the fetch goes out anonymous.

**Never logged.** Both services' `mergeContext()` previously spread every unrecognized context field into the log line, which would have written the credential to Loki on every request. Dropping it by name would have worked, but leaves a mechanism whose default is to disclose and a comment as its only enforcement. Both loggers now copy an allowlist — `LOGGABLE_CONTEXT_KEYS` — so a new context field is invisible to logs until someone deliberately adds it. Per-call detail belongs in the `meta` argument, which every logger method already takes and which still wins over context. Both sides assert on what winston actually receives rather than that nothing threw.

**Only consumed fields are stored.** The ledger middleware puts `requestId` and `sessionToken` on the context, not the whole parsed envelope. The parser still tolerates unknown keys, so a new field can ship without a lockstep deploy, but unread caller-controlled data stays out of reach of code that has no reason to see it. Both services name the credential `sessionToken`, so there is one rule to remember rather than two.

**Sizing.** `MAX_VALUE_LENGTH` is 2048 at both ends. A session JWT of this service's shape measures 220–248 characters; the 256 the envelope started with left as little as 8 characters of headroom, and an over-long entry is dropped silently, so one added claim would have turned this into an invisible failure.

**What this does not fix.** The feed cache is keyed by URL alone and coalesces concurrent loads, so the credential actually presented is whichever caller's request performed the refresh, and every other caller is served that result for the refresh window. This is acceptable only because a price feed is public market data, identical for every caller — if a managed URL ever returned caller-specific content, the cache key would have to include the caller. Mounting `/prices/<ALIAS>` as a public route retires this whole section.

## Consequences

- Every ledger log line now carries a `requestId`, and it is the same ID backend-v2 logged and returned to the client, so one request can be followed across both services.
- The machinery in `shared/async-context.ts` and the logger's `mergeContext()` stops being dead code.
- Adding a second field is a change to two small files and their tests, with no plumbing through the load path. A field added on the sending side is safely ignored by an older ledger service, so the two can deploy in either order.
- `forwarded` is kept on the ledger's `RequestContext` with every parsed entry, named for its provenance, so a future consumer reads it knowing it is untrusted.
- A reviewer's standing obligation: any new read of `forwarded` must answer what happens if a caller chose the value. Section 2 is the rule to apply.

## Alternatives considered

- **Merge the inbound request's headers into the outbound call.** Rejected: this is the mechanism that collides with the two authority headers in fact 1. A user-supplied `x-directive-limit-exempt: 1` would reach a service that trusts it unconditionally, and a browser's `Authorization: Bearer …` would displace the Gitea Basic credential and 401 every request. This is the documented `x-user-*` confused-deputy pattern, and edge stripping is a mitigation for a design that should not be chosen here in the first place.
- **One header per field.** Rejected for the reasons in section 1; it is also the option that grows the proxy allowlist and the trust-boundary strip list without bound.
- **Reuse the standard `baggage` header.** Rejected for section 1's last paragraph: a shared name invites automatic propagation by tooling that does not know this envelope must stop at the ledger service.
- **Forward the raw `Cookie` and `Authorization` headers instead of one normalized field.** Rejected. They are two containers for the same string, so forwarding both forwards it twice; the browser `Cookie` header additionally carries every other `.beancount.io` cookie, and `Authorization` may carry an OAuth token or API key that the price gate does not want. Normalizing to one token at the sending end and rebuilding the cookie at the receiving end sends exactly what is needed.
- **Narrow the relayed credential to session JWTs by shape.** Rejected. `getTokenFromCtx` collapses three credential kinds into one string, and `resolveIdentity` resolves each of them from whichever inlet carried it, so more than a session JWT is accepted at the far end. Filtering by shape at the sending end would drop credentials that legitimately work while preventing nothing: the value is relayed, never trusted here, and verified where it lands (section 7).
