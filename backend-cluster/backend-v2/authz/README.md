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
server or SDK is deployed. Backend-v2 now executes the `user.delete` slice
through its small TypeScript PDP and a local relationship adapter that mirrors
`user#can_write_lifecycle`; the rest of this model remains
documentation-as-code until an ADR 0010 trigger fires.

## Centralized authorization in a microservice system

Centralized authorization means one trusted policy decision point (PDP) for an
action. It does not mean representing every request credential as an OpenFGA
object. The only runtime slice implemented today is:

```text
GraphQL Mutation.deleteAccount
  → resolveIdentity()
  → authorize(principal, user.delete, user:<principal.userId>)
  → permit browser-session or OAuth user credentials
  → check exact-self user#can_write_lifecycle
  → one allow / deny decision before AccountService
```

The module lives in `src/server/api/authorization/`. Its local relationship
adapter evaluates the exact-self fact modeled by
`user#can_write_lifecycle`. It does not deploy OpenFGA or implement any other
action. The caller provides only:

- the canonical action;
- the domain resource ID;
- the already-resolved authenticated identity.

The resolver does not interpret ledger scopes or manufacture relationship
tuples. The account service receives an already-authorized user ID and does not
repeat authorization policy.

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
The current `user.delete` runtime slice does not mint or require such a grant.

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

An action is a stable, transport-independent business verb. The implemented
mapping is deliberately one row:

```text
GQL Mutation.deleteAccount → user.delete
```

Its complete requirement is:

| Action        | Accepted credential                 | Relationship requirement                            |
| ------------- | ----------------------------------- | --------------------------------------------------- |
| `user.delete` | browser session or OAuth user token | `user#can_write_lifecycle` on that same `user:<id>` |

API keys, cross-user resources, unknown actions, and relationship-evaluator
failures deny. Denials carry the action, resource, and stable reason metadata.

There is intentionally no inert operation-policy file in this directory. The
implemented `user.delete` action lives directly in the TypeScript authorization
module; transport classification admits the request to that module but cannot
authorize it. Keeping a second documentation-only catalog would create drift.

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

## Tuple ownership

Only durable or source-derived domain facts enter the model:

- `user#owner` from the user database, only when subject ID equals object ID;
- `ledger#owner` from the ledger owner lookup;
- exactly one effective `ledger#collaborator_*` rank per caller;
- `ledger#public_reader@user:*` iff the ledger is public.

Today ledger relationships are resolved from the external Gitea-backed ledger
service. Under engine adoption they may initially be supplied to the PDP for a
Check and later synchronized to OpenFGA when ADR 0010's reverse-query trigger
is reached. No microservice may write credential-derived or request-derived
tuples.

## Invariants

1. **The authorization module is the only final authority for `user.delete`.**
   The resolver calls it once and the account service does not repeat policy.
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
8. **The runtime slice is fail-closed.** Unknown actions do not inherit a
   default policy; expanding beyond `user.delete` is separate work.
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
and monotonic rank semantics. The TypeScript suite separately covers supported
credential kinds, unknown actions, wrong-user resources, relationship denial,
and relationship-evaluator failure. Credentials and request context never
become FGA tuples.
