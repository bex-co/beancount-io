# w3 · m44 — One introspection endpoint for all three credential kinds

**Worker:** worker3 **Goal:** An external token validator — an API gateway, a reverse proxy, a partner service — can ask Beancount.io whether a presented credential is live, and get a correct answer whether that credential is an OAuth access token, a `bcio_` API key, or a session JWT. **Status:** done

## Tasks (in order)

| id   | title                                                          | est | depends_on |
| ---- | -------------------------------------------------------------- | --- | ---------- |
| t001 | Write down the introspection contract as an ADR                  | 45m | —          | — **DONE**
| t002 | Give `Identity` the credential's lifetime                        | 45m | t001       | — **DONE**
| t003 | A side-effect-free resolve path for introspection                | 30m | t002       | — **DONE**
| t004 | The REST introspection endpoint, its gate entry, its rate bucket | 60m | t003       | — **DONE**
| t005 | Advertise the endpoint where a validator will look for it        | 30m | t004       | — **DONE**
| t006 | Register the verb for parity: twin or written exemption          | 45m | t004       | — **DONE**
| t007 | Adoption surface                                                 | 20m | t005, t006 | — **DONE**
| t008 | Simplify                                                         | 20m | t007       | — **DONE**
| t009 | Test coverage                                                    | 45m | t007       | — **DONE**
| t010 | Closeout                                                         | 20m | t009       | — **DONE**

## Why this and not "publish a JWKS for session tokens"

The question that produced this milestone was "can an external validator verify our tokens against our OIDC infra". Half of that already ships: OAuth access tokens are ES256 with `iss`, `aud` and `kid`, and their public keys are served at `/api-gateway/oauth/jwks` behind RFC 8414 discovery. Any standard validator can verify one today.

The other half cannot be solved the same way. Session JWTs are HS256 off `AUTH_SECRET` (`src/features/auth/utils/jwt-crypto-utils.ts` — `jsonwebtoken` defaults), so publishing the key would publish the ability to mint them; making them externally verifiable means migrating them to asymmetric signing, with a year-long dual-accept tail (`AUTH_JWT_EXP_MINUTES` defaults to 525600) and a rewrite of the algorithm-based discriminator that `oidc-verify.ts` uses to tell session tokens from OAuth tokens. And `bcio_` API keys are not JWTs at all — no signature exists to verify.

Introspection answers all three at once, and answers a question offline verification structurally cannot: **is this credential still live right now**. Session tokens are revoked by deleting a `jwts` row; API keys by `isApiKeyLive`; OAuth grants by the revocation endpoint. An offline validator sees none of that and honors a revoked credential until `exp`.

The asymmetric-session-JWT migration is deliberately **not** in this milestone. It may never be needed once this ships.

## The shape this takes

`resolveIdentity` (`src/server/api/identity.ts:294`) is already the three-way disambiguator: OAuth → API key → session, returning one uniform `Identity` or `undefined`, with absent, malformed, expired and revoked all collapsed into the same `undefined`. That collapse is exactly what RFC 7662 §2.2 asks for. The endpoint is close to a projection of that function onto the spec's response body.

`oidc-provider`'s own `features.introspection` is **not** the vehicle. It knows only its own grants, so it would answer `active: false` for a live `bcio_` key or session JWT — a confidently wrong answer, worse than no endpoint.

## Known traps, all of which have a task

- **`Identity` carries no expiry.** No `exp`/`iat` anywhere on it. Each source holds the data and drops it: `models.jwt.verify` returns only a `userId` though the `jwts` row has `expireAt`; `resolveApiKeyIdentity` checks `isApiKeyLive` but never projects the key's expiry; `OidcIdentity` keeps `authenticatedAt` and discards the token's `exp`. (t002)
- **`scope` is a semantic trap.** Sessions carry `scopes: EMPTY_SCOPES` and `capabilities: ALL_OPERATION_CAPABILITIES` — full authority, empty scope set. Emitting `scope: ""` tells a gateway the credential may do nothing when the truth is the opposite, and a gateway written against that denies every dashboard request. The response must project `effectiveCapabilities()`, not `scopes`. (t001 decides, t004 implements)
- **`stampLastUsed` is a side effect.** Introspecting an API key would bump its `lastUsedAt`, which exists so a person can see which key their cron job actually uses. Introspection must not write it. (t003)
- **The gate catch-all — the one that makes anonymous access the accident, not the choice.** `always-public.ts` carries `REST ALL /api-gateway/oauth/{*path}`, so mounting under that prefix makes the endpoint anonymous *and keeps the census test green*, because the catch-all already covers the path and nothing is missing. That matters because this endpoint turns a stolen credential into "valid, user X, may write ledger Y" and is a free brute-force oracle against the API-key digest lookup. The endpoint is authenticated; t001 decides which credential admits a caller, t004 mounts it so the catch-all cannot apply and verifies the refusal against the running route, and t009 keeps a regression test on it.
- **The rate bucket follows the path string.** `rate-limit.ts:200` assigns the `oauth` budget to any path containing `/oauth` or `/.well-known/`. A mount outside those strings gets no bucket unless one is added. (t004)

## Definition of done

`POST` to the introspection endpoint with a live OAuth access token, a live `bcio_` API key, and a live session JWT each return `active: true` with a correct `sub`, credential-kind, effective capability projection, `exp`, and — where the credential has one — `client_id`, `jti`, and the single-ledger ceiling; the same three after revocation (grant revoked, key revoked, `jwts` row deleted by logout) each return `{"active": false}` and nothing else; an expired credential, a malformed string, and a garbage string are indistinguishable from each other in the response; **the endpoint is authenticated and never answers anonymously** — a request with no `Authorization` header, no cookie and no `x-api-key` is refused with an authentication failure rather than `{"active": false}`, proven against the mounted route and not inferred from the handler, and the path is provably outside the `REST ALL /api-gateway/oauth/{*path}` always-public entry or overrides it; introspecting an API key does not move its `lastUsedAt`; the endpoint has an `always-public.ts` census entry or is under the gate with a written reason, has a rate-limit bucket, is registered in `op-class.ts` with either both twins or written `restExempt`/`mcpExempt` reasons, and the surface-parity zero-debt gate stays green; `docs/adrs/ADR017-backend-v2-token-introspection.md` records the contract; `yarn test`, `yarn lint`, `yarn typecheck` pass.

## Closeout notes (2026-09-18)

**Shipped:** `POST /api-gateway/v1/token/introspect` and `Query.introspectToken`, over `TokenIntrospectionService`, which is a projection of `resolveIdentity` — the same seam every request authenticates through. 288 suites / 4556 tests green; lint, dead-code, and typecheck clean; `docs/openapi/v1.json` regenerated.

**ADR 0017's two decisions worth knowing.** *Who may call it:* any authenticated caller with `admin` capability through a new PDP action `user.credentials.introspect`, reusing the existing `can_read_credentials` relationship — so no OpenFGA model change. On top of that, **the submitted credential must resolve to the calling user**; anyone else's token reads as `{"active": false}`, identical to a garbage string. That confinement is what keeps this from being a cross-tenant oracle, and it is why operator-wide introspection (even behind `x-admin-token`) was deliberately *not* offered. *What `scope` means:* effective capability projected into the ledger scope vocabulary, never the raw `scopes` set — a session carries no scopes and full authority, so the literal set would tell a gateway a signed-in user may do nothing.

**Parity outcome: GraphQL twin built, MCP exempted, count raised 4 → 5.** The exemption is a *shape* argument, not a credential one — the caller is a token validator, and an MCP client is the thing being validated, not the thing validating. Recorded in `op-class.ts`'s `mcpExempt`, in the `surface-parity.test.ts` comment, and as named structural exception 8 in `docs/api-parity.md`. `manageApiKeys` is the counter-example that keeps it honest: credential reads do reach MCP when an agent has a use for them.

**Not advertised in RFC 8414 metadata** (D9), which reverses t005's original assumption. `introspection_endpoint` names the *authorization server's* endpoint, which the specs tell a client to reach with OAuth client credentials about OAuth tokens; ours does neither. Advertising it would make a discovery-driven client send credentials we reject. Documented in the backend README beside the offline JWKS path instead, and the absence is recorded in ADR 0009 so it does not read as an oversight.

**Two things the work found that the plan did not.**

1. *`yarn generate-v1-openapi` has its own fragment list.* The script registers fragments individually rather than importing the composition root, so a new v1 fragment is silently missing from the generated spec until added there too — the snapshot test catches it, but the failure points at the snapshot, not the cause. Added; worth knowing for the next v1 fragment.
2. *A "does not record usage" test can pass against an implementation that records.* `stampLastUsed` throttles per key id in a module-level map that outlives a test, so a shared fixture key id let an earlier test's stamp suppress a later one. The test passed against a deliberately broken implementation until each fixture got a fresh key id. Found by mutation-testing rather than by reading it.

**Every behavioral guarantee was mutation-tested,** not assumed: removing the cross-user confinement fails 3 tests, reporting the raw grant fails 2, recording usage fails 1, leaking a field into the inactive answer fails 7, and breaking the identity gate fails the anonymous-refusal guard. Opting the route into anonymous access does not even compile — `V1Route` accepts only `authentication?: "required"`, so anonymous access is a different function (`anonymousV1Route`) and a visible one.

## Source + Goal linkage

- **Source:** direct user request, 2026-09-18, arrived as "support `iss` in the JWT auth token and make it publicly verifiable against our OIDC infra" and narrowed through investigation into this — see "Why this and not…" above.
- **Goal linkage:** **A3 — community & distribution** primarily. A self-hoster or integrator who wants to put an API gateway, a reverse proxy, or a partner service in front of Beancount.io currently has no supported way to validate a credential they were handed; they either re-implement our three-way resolution or proxy every request through us. One documented endpoint makes Beancount.io something you can integrate *around*, not only *with*. Secondary **A1** — an agent runtime brokering a token on a user's behalf can check it is still live before acting, instead of discovering revocation as a mid-workflow 401.
- **Expected outcome:** a third party holding any Beancount.io credential can determine, in one documented request, whether it is live and what it may do — including for the two credential kinds no amount of public key material can describe. Observable as: the three-kind matrix in the DoD passing, and the endpoint documented in `backend-cluster/backend-v2/README.md` with a worked example.
- **Why now:** the OAuth half of the original request already works and needs only documentation, so the only remaining gap is the one offline verification cannot close. Doing this first also tests whether the cheaper answer makes the session-JWT signing migration unnecessary — which is a multi-day change with a year-long rollout tail, and is much easier not to start than to stop.
- **Adoption surface task included:** the milestone ships a user- and agent-facing HTTP endpoint plus its discovery advertisement.

## Dependencies

t002 and t003 both touch `identity.ts` and should not run in parallel. t005 and t006 are independent of each other and both only need the endpoint from t004.
