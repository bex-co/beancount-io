# ADR: Token introspection — one endpoint for three credential kinds

- Status: Accepted
- Date: 2026-09-18
- Decision owners: Backend (`backend-cluster/backend-v2`)
- Scope: the contract of the token introspection endpoint — what `active` means for each credential kind, who may call it, what the response says, and what it deliberately does not try to be.

## Context

Beancount.io issues three request credentials, and `resolveIdentity` (`src/server/api/identity.ts`) is the one place that tells them apart:

| Kind | Shape | Externally verifiable? | Revoked by |
| --- | --- | --- | --- |
| OAuth access token | ES256 JWT with `iss`, `aud`, `kid` | **Yes** — public keys at `/api-gateway/oauth/jwks`, discoverable per RFC 8414 | the revocation endpoint |
| Session JWT | HS256 off `AUTH_SECRET` | No — the key that verifies it is the key that mints it | deleting the `jwts` row (logout) |
| API key | opaque `bcio_` string, stored as a digest | No — it is not a JWT and has no signature | `isApiKeyLive` (revoked or expired) |

A third party — an API gateway, a reverse proxy, a partner service, an agent runtime brokering a token — that wants to know whether a credential it was handed is usable has no supported way to ask. Today it either re-implements our three-way resolution, which it cannot do for two of the three kinds, or proxies every request through us and reads the status code.

Publishing key material does not solve this. For the session JWT, publishing the key publishes the ability to mint; making it externally verifiable means migrating to asymmetric signing, with a dual-accept tail as long as the token lifetime (`AUTH_JWT_EXP_MINUTES` defaults to 525600 — one year) and a rewrite of the algorithm-based discriminator in `oidc-verify.ts`. For the API key there is nothing to publish at all.

More importantly, offline verification cannot answer the question that actually matters. A signature proves a credential *was* issued. All three of our kinds are revocable at any moment, and a validator checking signatures offline honors a revoked credential until `exp`.

## Decisions

### D1 — The endpoint is a v1 route, and authentication is structural

`POST /api-gateway/v1/token/introspect`, declared with `v1Route` in `src/features/apikeys/api/token-introspection-rest.ts`.

Two things follow from that choice, and both are the point:

**It is outside the OAuth catch-all.** `always-public.ts` carries `REST ALL /api-gateway/oauth/{*path}`, justified as "part of the OAuth 2.1 ceremony itself: requiring a token to obtain a token would close the only door in". That reason is true of the ceremony and false of introspection. Worse, a mount under that prefix would be anonymous *and the census test would stay green*, because the catch-all already covers the path and nothing would be missing. The trap is silence, so the mount avoids the prefix entirely.

**Anonymous access is an explicit opt-in it does not take.** A `v1Route` requires an identity unless it declares `authentication: "optional"`. The safe state is the default and the unsafe state has to be typed out, so this cannot regress by omission — only by someone writing the words.

This matters because an anonymous introspection endpoint is not merely under-protected. It converts any stolen credential into "valid, user X, may write ledger Y", and it is a free oracle against the API-key digest lookup: submit candidates, read `active`.

RFC 7662 §2.1 requires the caller to authenticate. We are not making an exception to that; what remains is *which* credential admits a caller.

### D2 — You may introspect your own credentials, and only your own

The endpoint is gated by a new PDP action, `user.credentials.introspect`, mapped to the existing `can_read_credentials` relationship — the same relationship `user.credentials.list` uses, because this is the same kind of fact about the same objects. Like that action it accepts every credential method at `admin` capability: a machine holding an API key is exactly the caller this endpoint exists for, and refusing it would defeat the purpose. No OpenFGA model change is needed; the relationship already exists and already resolves to `owner`.

On top of the PDP decision, **the submitted credential must resolve to the calling user**. If it resolves to somebody else, the answer is `{"active": false}` — the same answer a garbage string gets.

This is the decision that keeps the endpoint from being a cross-tenant oracle. Without it, any paying user could probe whether an arbitrary captured token is live, and learn when one was revoked.

It is also why **operator-wide introspection is deliberately not offered**, even behind `x-admin-token`. On the managed deployment that would be a cross-tenant oracle wearing an operator's hat, and on a self-hosted deployment the operator holding that secret already has database access and does not need an HTTP endpoint to learn this. If a genuine multi-tenant gateway case appears later, it should arrive as its own decision with its own threat model, not as a flag on this one.

What this serves: a gateway or agent runtime that holds its own credential for the same user as the token it is validating. What it does not serve: a third party validating tokens for users it has no relationship with. That second case is not one we can serve safely, and pretending otherwise with a permissive endpoint would be the wrong trade.

### D3 — `scope` reports effective capability, not the raw grant

An `Identity` from a session carries `scopes: EMPTY_SCOPES` and `capabilities: ALL_OPERATION_CAPABILITIES` — full authority, empty scope set. The raw set is an implementation fact: sessions are not scope-constrained, so there is nothing in it.

Reporting that fact literally would be a lie in the standard field. A gateway reading `scope: ""` concludes the credential may do nothing and denies every request a signed-in user makes. The failure is silent, arrives only in production, and looks like an authentication bug rather than a reporting bug.

So `scope` carries `effectiveCapabilities()` projected back into the API scope vocabulary (`ledger.read ledger.write ledger.admin`). For an OAuth token or API key that is what was granted. For a session it is all three. In every case the field means the same thing: **the operation classes this credential can perform**, which is the question a validator is asking.

### D4 — Extension fields are prefixed `bio_`

Three facts are worth more to a validator than most of RFC 7662 and appear in none of it: which kind of credential this is, how the holder authenticated, and whether the credential is confined to a single ledger.

- `bio_credential_kind` — `session` | `oauth` | `apikey`
- `bio_assurance` — `interactive` | `delegated` | `workload`, from `identityAssurance`
- `bio_ledger_scope` — the single ledger this credential may touch, present only when confined

RFC 7662 §3.1 asks extensions to use collision-resistant names. The prefix also marks them as ours at a glance, so a reader can tell which half of the response is portable across providers and which is not.

### D5 — `token_type_hint` is accepted and ignored

The spec permits ignoring it. `resolveIdentity` already orders its attempts cheaply — the `bcio_` prefix check short-circuits before any digest work, and `isAsymmetricJwt` rejects a session token before `jwtVerify` touches a key — so a hint would buy nothing and add a branch that could disagree with the resolver's own ordering. Accepting it keeps spec-compliant clients working.

### D6 — An authentication failure is never `{"active": false}`

The caller's own credential is checked before the submitted token is read. A caller who fails that check gets `401`/`403` and the submitted token is not looked at at all.

Returning `{"active": false}` to an unauthenticated caller would be worse than it looks: it would mean the endpoint answers anonymously, and an attacker would read that answer as "not live" and keep going. The oracle would be open while appearing shut.

### D7 — `{"active": false}` carries nothing else

Expired, malformed, revoked, belonging to someone else, and never-issued all produce the identical body. `resolveIdentity` already collapses these — "returns `undefined` for an absent, malformed, expired, or revoked credential — never throws, and never distinguishes the failure modes to the caller" — and this endpoint preserves that collapse rather than re-deriving detail the resolver deliberately discarded.

### D8 — Introspection observes; it does not record

`resolveApiKeyIdentity` stamps `lastUsedAt` on every successful resolve, so a person can see which key their cron job is actually using. Introspection is a third party asking *about* a key, not that key being used. Stamping it would make the timestamp mean "someone asked about this", which is not a question anyone is asking it.

The endpoint therefore resolves through the same `resolveIdentity` with usage recording suppressed — one resolution path with an option, not a second copy. Two resolution paths that can disagree about who is authenticated is the failure ADR 0006 problem 2 already records.

### D9 — It is not advertised as `introspection_endpoint` in RFC 8414 metadata

The obvious move is to add `introspection_endpoint` to
`/.well-known/oauth-authorization-server` so a validator discovers this the way
it discovers everything else. We deliberately do not.

That field names *the authorization server's* introspection endpoint, and a
client reading it is told, by RFC 7662 §2.1 and RFC 8414 together, to
authenticate with OAuth client credentials and to ask about OAuth tokens. Ours
does neither: it authenticates with our own identity gate (D1, D2) and answers
about three credential kinds, two of which the authorization server never
issued. A client that discovered it and followed the specs' implications would
send client credentials we reject, and conclude we are broken.

There is a mechanical reason too, and it is the weaker one: the metadata
document is streamed straight out of `oidc-provider` (`ctx.respond = false` in
`serveAuthorizationServerMetadata`), so adding a field means intercepting and
rewriting a response body we currently pass through untouched. That alone would
not have decided it; the false claim does.

The endpoint is documented in `backend-cluster/backend-v2/README.md` instead,
next to the offline JWKS path, so the two appear together and an integrator
picks between them deliberately.

If introspection ever becomes OAuth-client-authenticated and OAuth-token-only,
advertising it becomes correct — and that change should be argued here rather
than added as a field.

### D10 — It answers on a deployment with no OAuth

`setOidcRoutes` replaces OAuth discovery with `503 oauth_not_configured` when `config.oauth.jwks` is unset. Introspection is not part of that chain: API keys and session tokens exist on a deployment that has never configured OAuth signing keys, and they are the kinds that most need this endpoint. On such a deployment an OAuth token simply reports `active: false`, which is true there.

## Non-goal — migrating session JWTs to asymmetric signing

This ADR does not make session JWTs externally verifiable, and the work is not deferred so much as made unnecessary.

The original request was to add `iss` to the session token and publish keys for it. Adding `iss` is two lines and buys nothing on its own; the value would come from publishing a key, which for HS256 means publishing the ability to mint. The real change is a migration to ES256 with a year-long dual-accept window, plus a rewrite of the discriminator `oidc-verify.ts` uses to tell session tokens from OAuth tokens — it keys on the algorithm being asymmetric, and making session tokens asymmetric breaks exactly that.

The end state would still not tell a validator whether a credential was revoked, and would still say nothing about API keys. Introspection answers both, for all three kinds, today. If a case appears that genuinely needs offline session verification — a validator that cannot make a network call — it should be argued on that requirement, with this ADR as the thing it has to beat.

## Consequences

- A validator now needs a credential and a network call. That is the cost of a live answer, and it is stated plainly in the backend README next to the offline JWKS path so integrators pick deliberately.
- The endpoint is a read against the credential stores on every call. It is rate-limited per caller and buckets with the other `admin`-class credential operations.
- `Identity` gained `issuedAt`/`expiresAt`, which every resolver now projects. Nothing else reads them yet; they exist because a response that cannot say when a credential expires is not worth calling twice.

## See also

- `docs/adrs/ADR009-backend-v2-well-known-paths.md` — the discovery documents a validator reads first.
- `docs/adrs/ADR010-backend-v2-authz-model.md` — the PDP and the relationships `user.credentials.introspect` reuses.
- `backend-cluster/backend-v2/README.md` — the worked example, including which credentials verify offline and which cannot.
