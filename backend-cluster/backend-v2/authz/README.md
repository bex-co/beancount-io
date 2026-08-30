# Durable authorization relationships

`model.fga` is backend-v2's durable relationship model. It answers one
Zanzibar-shaped question:

> Does stable user **U** have permission **P** on resource **O**?

It models two resource domains, `user` and `ledger`. A `user` is both an
authorization subject and a protected User resource. The model deliberately
does not contain a separate actor type, browser sessions, OAuth tokens, API keys
used for authentication, scopes, request-local resource pins, or authentication
assurance.

This boundary follows OpenFGA's guidance to
[model the application domain rather than a meta-model](https://openfga.dev/docs/best-practices/modeling-design-principles).
The no-engine-yet decision and adoption triggers remain documented in
[ADR 0010](../../../docs/adrs/ADR010-backend-v2-authz-model.md). No OpenFGA
server or SDK is deployed. Backend-v2 executes the protected user/profile/
lifecycle/API-key-management domain through a small TypeScript PDP. Its
source-backed evaluator mirrors exact-self User permissions and resolves
API-key ownership from the current `api_keys` row. Ledger relationships remain
documentation-as-code until their own domain milestone or an ADR 0010 trigger.

## Centralized authorization in a microservice system

Centralized authorization means one trusted policy decision point (PDP) for an
action. It does not require centralized relationship storage and does not mean
representing every request credential as an OpenFGA object. The runtime topology
for this domain is:

```text
GraphQL / REST / MCP alias
  → resolveIdentity()
  → AccountService or ApiKeyService (application-service boundary)
  → authorize(requestIdentity, canonicalAction, trustedResource)
      → credential ceiling
      → exact-self fact or current api_keys.owner lookup
      → modeled user#can_* relationship
      → one fail-closed allow / deny; source failure is an explicit error
      → one audit event per authorization call
  → domain work
```

The PDP lives in `src/server/api/authorization/`. Application services derive
User targets from the authenticated identity; API-key revoke supplies only the
stable key ID, which the evaluator resolves through the database before any
side effect. The caller provides only:

- the canonical action;
- the domain resource ID;
- the already-resolved authenticated identity.

Transport adapters do not interpret policy or manufacture relationship tuples.
The operation-class gate only routes these operations to the PDP. Account,
API-key, and subscription services are the application boundary: each protected
public method calls the PDP before domain work. The migrated profile, lifecycle,
credential, and billing methods derive the protected User from `Identity`, so a
new resolver or internal caller cannot select a different user or bypass
authorization by skipping a wrapper.

PDP-routed GraphQL fields that require a caller use the transport-only
`@Authenticated()` decorator. It checks only that `resolveIdentity()` produced
an `Identity`; it does not inspect scopes, credential methods, resources, or
relationships and does not emit an authorization audit. This lets every
authenticated credential reach the application service, where the catalog
produces the one final allow/deny decision and its actionable error. Nullable
identity probes and authentication ceremonies remain undecorated.

The evaluator holds no tuple store, decision memo, or cross-request cache.
Protected service methods receive the resolved `Identity` explicitly; the
stable transport operation ID is observability metadata propagated in an
isolated AsyncLocalStorage child context by the GraphQL, REST, and MCP gates.
Concurrent GraphQL root fields and MCP calls therefore cannot overwrite one
another. A direct service call with no request context audits its canonical
action instead. Every authorization call re-evaluates the current relationship,
even when a GraphQL document invokes the same field more than once. PostgreSQL
remains the one copy of API-key ownership; exact-self remains an identity fact.

## One permission vocabulary

The relationship model follows GitHub's fine-grained permission shape:
permissions are grouped by resource domain, named after stable noun
capabilities, and assigned an independent access level. An endpoint maps to the
permissions it requires; the endpoint name is not itself a permission.

The canonical grant name is:

```text
<resource>.<capability>:<level>
```

The matching OpenFGA relation is mechanical:

```text
<resource>.<capability>:read  → <resource>#can_read_<capability>
<resource>.<capability>:write → <resource>#can_write_<capability>
```

For example:

| Grant permission              | OpenFGA relation                  |
| ----------------------------- | --------------------------------- |
| `user.profile:read`           | `user#can_read_profile`           |
| `user.lifecycle:write`        | `user#can_write_lifecycle`        |
| `ledger.contents:write`       | `ledger#can_write_contents`       |
| `ledger.administration:write` | `ledger#can_write_administration` |

`write` satisfies `read` only within the same capability family. There is no
cross-family implication: `ledger.administration:write` does not grant ledger
contents, assets, collaborators, or bank connections. The OpenFGA definitions
may derive several families from the same durable owner/collaborator rank, but
a fine-grained grant must name each family independently.

The target vocabulary is:

```text
user.profile:read
user.profile:write
user.credentials:read
user.credentials:write
user.billing:read
user.billing:write
user.lifecycle:write

ledger.contents:read
ledger.contents:write
ledger.administration:read
ledger.administration:write
ledger.collaborators:read
ledger.collaborators:write
ledger.bank_connections:read
ledger.bank_connections:write
ledger.assets:read
ledger.assets:write
ledger.ai:write
```

This vocabulary describes the model's future fine-grained credential ceiling.
The current runtime preserves the existing three ledger scopes and session
restrictions for compatibility; it does not mint or require these future grants.

Do not introduce a global `admin` grant. `administrator` in `model.fga` is the
durable ledger relationship rank inherited from Gitea; it is not a permission
level that silently implies every capability. Destructive lifecycle operations
use an explicit capability such as `user.lifecycle:write` or
`ledger.administration:write`.

This naming is based on GitHub's
[fine-grained PAT permission catalog](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens?apiVersion=2026-03-10),
which separates repository, organization, and user permission families from
their read/write levels and maps REST endpoints to those requirements. We adopt
that shape, not GitHub's product-specific permission names or PAT objects.

## Actions and transport operations

An action is a stable, transport-independent business verb. `op-class.ts`
records GraphQL/REST/MCP aliases, while each executable requirement lives once
beside `AuthorizationService`:

| Canonical action                    | Transport aliases                              | Preserved credential ceiling                         | Relationship requirement                   |
| ----------------------------------- | ---------------------------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| `user.profile.read`                 | `GQL Query.userProfile`                        | session, or OAuth/API key with `ledger.read`         | `user#can_read_profile`                    |
| `user.profile.search`               | `GQL Query.getUserByExactMatch`                | browser session only                                 | exact-self `user#can_read_profile`         |
| `user.profile.update`               | `GQL Mutation.updateUsername`, `updateProfile` | browser session only                                 | exact-self `user#can_write_profile`        |
| `user.delete`                       | `GQL Mutation.deleteAccount`                   | browser session or OAuth                             | exact-self `user#can_write_lifecycle`      |
| `user.credentials.list`             | GraphQL/REST/MCP API-key list                  | session, or OAuth/API key with `ledger.admin`        | exact-self `user#can_read_credentials`     |
| `user.credentials.create`           | GraphQL/REST/MCP API-key create                | session, or OAuth with `ledger.admin`; never API key | exact-self `user#can_write_credentials`    |
| `user.credentials.revoke`           | GraphQL/REST/MCP API-key revoke                | session, or OAuth/API key with `ledger.admin`        | key owner has `user#can_write_credentials` |
| `user.billing.status.read`          | `GQL Query.subscriptionStatus`                 | browser session only                                 | exact-self `user#can_read_billing`         |
| `user.billing.checkout.create`      | `GQL Mutation.createSubscriptionSession`       | browser session only                                 | exact-self `user#can_write_billing`        |
| `user.billing.portal.create`        | `GQL Mutation.createStripePortalSession`       | browser session only                                 | exact-self `user#can_write_billing`        |
| `user.billing.subscription.cancel`  | `GQL Mutation.cancelSubscription`              | browser session only                                 | exact-self `user#can_write_billing`        |
| `user.billing.subscription.resume`  | `GQL Mutation.resumeSubscription`              | browser session only                                 | exact-self `user#can_write_billing`        |
| `user.billing.subscription.upgrade` | `GQL Mutation.upgradeSubscription`             | browser session only                                 | exact-self `user#can_write_billing`        |

Cross-user resources, missing or foreign API-key IDs, unknown actions or
resource types, insufficient credentials, and evaluator failures all deny.
Missing, blank, and foreign key IDs all surface as not found, so revoke does
not become an enumeration oracle. Request-bound audit events carry the exact
transport operation ID; direct service calls use the canonical action. Both
carry subject metadata, including the credential's ledger pin when
present; the operation table maps that ID to the canonical action. Events never
carry secrets or request arguments. Relationship-source failures are logged at
error level, audited as `error`, and surface as service unavailable rather than
as a policy denial.

There is intentionally no inert operation-policy file in this directory. The
actions live directly in the TypeScript authorization module; transport
classification admits the request to that module but cannot authorize it.
Keeping a second documentation-only catalog would create drift.

The `read`/`write` class on protected billing aliases is operational metadata
for rate limits and legacy audit defaults, not credential reachability. The PDP
catalog keeps protected billing operations browser-session-only. The static
tier-quota catalog is explicitly `public` and bypasses the PDP, but an operation
override keeps its pre-cutover 300-per-minute budget. The protected aliases
retain the same budget through the read-class default for subscription status
and explicit overrides for the five mutations, so the cutover does not silently
tighten or loosen abuse controls.

A relationship-source outage is not a policy denial. It is logged and audited
as an authorization `error`, surfaces to clients as service unavailable, and
prevents all Stripe or local billing work. Audit persistence itself remains
fail-open so an observability outage cannot suppress an otherwise-authorized
billing operation.

## What OpenFGA owns

OpenFGA owns stable domain relationships and the permissions derived from them.

### Users

A user is both the caller and a protected User resource. The durable `owner`
relation connects those two roles:

```text
user:usr_alice#owner@user:usr_alice
```

That ownership relation derives eligibility for the User permission families.

`user#can_write_lifecycle` means “this user is operating on itself and is
therefore relationship-eligible for a lifecycle write.” It is necessary but
not sufficient for an authorized deletion request.

API keys used as authentication credentials do not become FGA entities. For a
revoke operation, `api_key:<id>` is only an in-process target locator: the
source-backed evaluator loads the current row, resolves its owner to
`user:<ownerId>`, and applies `user#can_write_credentials`. The locator is never
stored as a tuple and does not extend `model.fga` with credential objects.

### Ledgers

A ledger has durable owner, collaborator, and public-access relationships:

```text
administrator = owner ∪ collaborator_admin
writer        = administrator ∪ collaborator_write
reader        = writer ∪ collaborator_read ∪ public_reader
```

Capability permissions derive from that rank:

```text
can_write_contents       = writer
can_write_administration = administrator
can_write_collaborators  = administrator
can_read_assets          = reader
```

In the broader target model, fine-grained token grants are an independent
ceiling evaluated by the central PDP. For example, a receipt write requires both
`ledger#can_write_contents` and `ledger#can_write_assets`; the PDP must also
require the signed grant to contain both matching permission families. There is
no endpoint-specific `can_write_receipt` relation.

## What OpenFGA does not own

The following are not durable resource relationships:

- credential signature, issuer, audience, expiry, and revocation;
- browser/OAuth/API-key classification;
- OAuth or API-key scopes;
- single-ledger or user resource bounds;
- recent authentication, MFA, confirmation, and one-time proof state;
- service-to-service workload identity;
- operation-to-policy mapping.

Authentication stays outside the relationship model. The current in-process
caller passes the resolved `Identity` to the authorization module; a future
service boundary would need an equivalent trusted subject context.

This separation does not create two independent authorization authorities. The
TypeScript module returns the final decision today; under future engine
adoption, OpenFGA would be a relationship backend inside that decision point,
not another application policy layer.

## User deletion

The complete executed decision is intentionally small:

```text
allow user.delete when
  credential is a browser session or OAuth user token
  AND resource == user:<subject>
  AND RelationshipCheck(user:<subject>, can_write_lifecycle, user:<subject>) is true
```

The server derives the resource from the authenticated identity, so clients
cannot select another user. The existing argument-free GraphQL mutation works
unchanged for both dashboard sessions and the mobile OAuth session. This slice
does not add step-up login, a deletion grant, Redis state, a new OAuth scope, or
a mobile/dashboard contract change.

## Self-service billing

`Query.allTierQuotas` returns static product configuration and is deliberately
reachable without an identity or PDP decision. Every protected GraphQL billing
alias passes the resolved `Identity` to `SubscriptionService`. The protected
service method derives `user:<subject>` from that identity and makes exactly
one PDP call before consulting cached status, account rows, subscription
configuration, or Stripe. OAuth and API-key credentials are denied with the
actionable full-session requirement; existing dashboard and mobile session
flows require no new client step.

Stripe remains authoritative for payment-domain state. Customer binding,
configured products and prices, active/canceling status, and subscription
ownership are validated by the billing and Stripe services and never become
OpenFGA relations or token claims.

## Relationship sources

Only durable or source-derived domain facts enter the model:

- `user#owner` from the user database, only when subject ID equals object ID;
- API-key owner from current `api_keys.user_id`, resolved to that User's
  credentials permission without copying it;
- `ledger#owner` from the ledger owner lookup;
- exactly one effective `ledger#collaborator_*` rank per caller;
- `ledger#public_reader@user:*` iff the ledger is public.

Today ledger relationships are resolved from the external Gitea-backed ledger
service. Under engine adoption they may initially be supplied to the PDP for a
Check and later synchronized to OpenFGA when ADR 0010's reverse-query trigger
is reached. No microservice may write credential-derived or request-derived
tuples.

## Invariants

1. **The authorization module is the only final authority for migrated User
   actions.** Protected Account/API-key/subscription service methods call it
   once before domain work; every GraphQL/REST/MCP alias uses those application
   services.
2. **OpenFGA contains only durable domain relationships.** No credential,
   session, token, grant, or `request_*` type/relation belongs in this model.
3. **Subjects use stable internal user IDs** (`users.id`), never usernames,
   e-mail addresses, client IDs, or token IDs.
4. **`user#owner` always links identical IDs.** The OpenFGA schema cannot
   enforce object-ID equality, so the tuple writer must reject cross-user
   ownership links.
5. **The ledger resolver emits one effective collaborator rank.** A stale
   stronger tuple cannot be repaired by adding a weaker tuple; replacement must
   be atomic, ordered, and reconcilable.
6. **`public_reader` contains only `user:*`.** Anonymous callers use the
   concrete `user:anonymous` sentinel for Checks.
7. **Permission names are resource-scoped capability families.** Endpoint names
   never become permissions, and generic ledger administration cannot imply an
   unrelated user or ledger capability.
8. **The runtime is fail-closed.** Unknown actions/resources and source lookup
   failures do not inherit a default policy.
9. **Authentication facts remain signed and provenance-preserving across
   service hops.** A downstream service cannot upgrade them.

Transport topology (`always-public` routes), rate limiting, audit formatting,
and authentication cryptography remain outside the FGA relationship model.
They cannot independently grant application access.

## Validation

CI (`.github/workflows/ci-authz-model.yml`) validates and executes the model on
every change under this directory. Locally:

```zsh
brew install openfga/tap/fga # once
fga model validate --file model.fga
fga model test --tests model.test.fga.yaml
```

The FGA suite covers user ownership boundaries, capability-level permission
families, ledger rank inheritance, private fail-closed behavior, public reads,
and monotonic rank semantics. The TypeScript suite covers every implemented
action, credential ceiling, wrong-user/foreign-key resources, independent
per-call evaluation and audit, source failure, and GraphQL/REST/MCP aliases.
Credentials and request context never become FGA tuples.
