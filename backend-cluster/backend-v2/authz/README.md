# Durable authorization relationships

`model.fga` is the durable relationship model used by backend-v2's target
centralized authorization service. It answers one Zanzibar-shaped question:

> Does stable user **U** have permission **P** on resource **O**?

It models two resource domains, `user` and `ledger`. A `user` is both an
authorization subject and a protected User resource. The model deliberately
does not contain a separate actor type, browser sessions, OAuth tokens, API keys
used for authentication, scopes, request-local resource pins, or authentication
assurance.

This boundary follows OpenFGA's guidance to
[model the application domain rather than a meta-model](https://openfga.dev/docs/best-practices/modeling-design-principles).
The no-engine-yet decision and adoption triggers remain documented in
[ADR 0010](../../../docs/adrs/ADR010-backend-v2-authz-model.md). The model is
documentation-as-code today; backend-v2 does not evaluate it at runtime yet.

## Centralized authorization in a microservice system

Centralized authorization means one trusted policy decision point (PDP) and one
service contract. It does not mean representing every request credential as an
OpenFGA object.

The target flow is:

```text
external request
  → central AuthN / STS validates the credential
  → signed subject context or durable grant reference
  → microservice calls Authorize(action, resource, signed context)
  → central PDP validates grant, resource bound, and assurance
  → central PDP performs OpenFGA Check(user, relation, resource)
  → one allow / deny decision
```

Microservices provide only:

- the canonical action;
- the domain resource ID;
- signed subject context issued by the trusted AuthN/STS boundary.

They do not interpret OAuth scopes, manufacture relationship tuples, assert
that reauthentication happened, or decide which credential kinds an operation
accepts. Those rules belong to the central PDP. For multi-hop calls, the PDP may
issue a short-lived, downscoped internal capability bound to the action and
resource; downstream services verify or exchange that capability instead of
forwarding ambient browser credentials.

## One permission vocabulary

The target PDP follows GitHub's fine-grained permission shape: permissions are
grouped by resource domain, named after stable noun capabilities, and assigned
an independent access level. An endpoint maps to the permissions it requires;
the endpoint name is not itself a permission.

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

| Grant permission | OpenFGA relation |
| --- | --- |
| `user.profile:read` | `user#can_read_profile` |
| `user.lifecycle:write` | `user#can_write_lifecycle` |
| `ledger.contents:write` | `ledger#can_write_contents` |
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

An action is a stable, transport-independent business verb. GraphQL fields,
REST routes, and MCP tools are aliases for that action. The centralized PDP
owns the only operation-to-action mapping and the only action requirements.

```text
GQL Mutation.deleteAccount         → user.delete
GQL Mutation.insertReceiptTransaction → ledger.receipt.create
REST GET .../files/{path}          → ledger.file.read
MCP editLedgerFiles                → ledger.file.write
```

Action requirements compose permission families explicitly:

| Action | Grant requirement | OpenFGA requirement | Assurance |
| --- | --- | --- | --- |
| `user.profile.read` | `user.profile:read` | `user#can_read_profile` | authenticated |
| `user.profile.update` | `user.profile:write` | `user#can_write_profile` | authenticated |
| `user.delete` | `user.lifecycle:write` | `user#can_write_lifecycle` | recent authentication and purpose-bound one-time grant |
| `ledger.file.read` | `ledger.contents:read` | `ledger#can_read_contents` | authenticated or public relationship |
| `ledger.file.write` | `ledger.contents:write` | `ledger#can_write_contents` | authenticated |
| `ledger.receipt.create` | `ledger.contents:write` **and** `ledger.assets:write` | `ledger#can_write_contents` **and** `ledger#can_write_assets` | authenticated |
| `ledger.delete` | `ledger.administration:write` | `ledger#can_write_administration` | recent authentication |

Some operations may accept alternatives (`anyOf`) and some may require several
permissions (`allOf`), matching GitHub's endpoint tables. Missing mappings and
unknown actions fail closed. A denial should return structured
`requiredPermissions` and `requiredAssurance` metadata so every transport can
explain the same decision without reimplementing it.

There is intentionally no inert operation-policy file in this directory. When
the centralized PDP is implemented, the mapping above becomes its directly
executed registry and its coverage test must compare that registry against all
live GraphQL, REST, and MCP operations. Keeping a second documentation-only
catalog today would create drift without centralizing enforcement.

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

Fine-grained token grants are an independent ceiling evaluated by the central
PDP. For example, a receipt write requires both
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

The central AuthN/STS layer verifies credentials and emits a signed subject
context. The central PDP, not each microservice, interprets that context and
combines its grant/assurance policy with the OpenFGA relationship result.

This separation does not create two independent authorization authorities:
OpenFGA is a relationship data and evaluation backend inside the PDP. The PDP
is the only component that returns the application's final authorization
decision.

## User deletion

The complete target decision is:

```text
allow user.delete when
  signed grant contains user.lifecycle:write
  AND grant resource == user:<subject>
  AND credential flow is permitted for user deletion
  AND authentication age <= 5 minutes
  AND one-time deletion proof is valid and atomically consumed
  AND OpenFGA Check(user:<subject>, can_write_lifecycle, user:<subject>) is true
```

For mobile, the ordinary OAuth access token should not satisfy this policy. The
client completes a step-up ceremony with the central AuthN/STS service and
receives a short-lived, purpose-bound deletion grant containing `sub`, action,
resource, `jti`, and `exp`. The PDP validates and consumes that grant before the
domain service performs the destructive operation.

The one-time grant is a capability exchanged between trusted services, not an
OpenFGA relationship tuple. FGA neither authenticates it nor prevents replay.

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

1. **The PDP is the only final authorization authority.** Microservices call
   `Authorize`; they do not locally reinterpret scopes or assurance.
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
8. **Operation mapping is centralized and fail-closed.** Runtime adoption must
   cover every live GraphQL, REST, and MCP operation in both directions.
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

The test suite covers user ownership boundaries, capability-level permission
families, ledger rank inheritance, private fail-closed behavior, public reads,
and monotonic rank semantics. Credential/grant/assurance tests belong to the
future centralized PDP suite, not the OpenFGA model suite.

Because this work is scoped to `authz/`, it does not change the current runtime
gates in `identity.ts`, `op-class.ts`, or `authorize-ledger.ts`. Mobile user
deletion will change only after the centralized PDP and deletion-grant ceremony
are implemented.
