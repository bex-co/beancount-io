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
server or SDK is deployed. Backend-v2 executes protected user/profile/lifecycle,
API-key-management, billing, social, ledger control/data-plane, assisted-ingestion,
temporary-asset, AI, and bank actions through a small TypeScript PDP. Its
source-backed evaluator mirrors exact-self User permissions, resolves API-key
ownership from the current `api_keys` row, reads current Gitea/Fava ledger facts,
verifies temporary-asset ownership from the trusted `tmp/{userId}/...` key
invariant, and checks current PostgreSQL Plaid item/user/ledger bindings. The FGA
file remains an executable specification in CI.

## Centralized authorization in a microservice system

Centralized authorization means one trusted policy decision point (PDP) for an
action. It does not require centralized relationship storage and does not mean
representing every request credential as an OpenFGA object. The runtime topology
for this domain is:

```text
GraphQL / REST / MCP alias → resolveIdentity()
signed Plaid webhook / scheduler → runtime-issued background provenance
  → protected application service/workflow boundary
  → authorize(principal, canonicalAction, trustedResource(s), context)
      → credential ceiling
      → exact-self, current api_keys.owner, ledger-rank, temp-key, and Plaid-binding facts
      → every modeled relationship required by the action (AND composition)
      → one fail-closed allow / deny; source failure is an explicit error
      → one audit event per authorization call
  → domain work
```

The PDP lives in `src/server/api/authorization/`. Application services derive
User targets from the authenticated identity; API-key revoke supplies only the
stable key ID, which the evaluator resolves through the database before any
side effect. Plaid background work supplies a runtime-issued, provenance-tagged
principal rather than a fabricated session. The caller provides only:

- the canonical action;
- the typed domain resource ID or explicit composite resource set;
- the already-resolved authenticated identity or trusted Plaid background principal;
- trusted request context, when an action needs it.

Transport adapters do not interpret policy or manufacture relationship tuples.
The operation-class gate isolates the transport operation ID and supplies rate
and observability metadata; it is not a final authority. Account,
API-key, subscription, feed, user-profile, ledger-social/control-plane,
asset-storage, LLM, Plaid suggestion, receipt workflow, and agent execution
methods are protected application boundaries. Each calls the PDP before S3,
ledger, LLM, tool, stream, or other domain work. User-owned resources derive
from `Identity`, so a new GraphQL, REST, internal-agent-tool, or MCP-mediated
caller reaches the same decision without manufacturing another user or
duplicating policy in its adapter.

PDP-routed GraphQL fields that require a caller use the transport-only
`@Authenticated()` decorator. It checks only that `resolveIdentity()` produced
an `Identity`; it does not inspect scopes, credential methods, resources, or
relationships and does not emit an authorization audit. This lets every
authenticated credential reach the application service, where the catalog
produces the one final allow/deny decision and its actionable error. Nullable
identity probes and authentication ceremonies remain undecorated.

The evaluators hold no tuple store, decision memo, or cross-request permission
cache. Protected service methods receive the resolved `Identity` explicitly; the
stable transport operation ID is observability metadata propagated in an
isolated AsyncLocalStorage child context by the GraphQL, REST, and MCP gates.
Concurrent GraphQL root fields and MCP calls therefore cannot overwrite one
another. A direct service call with no request context audits its canonical
action instead. Every authorization call re-evaluates the current relationship,
even when a GraphQL document invokes the same field more than once. PostgreSQL
remains the one copy of API-key ownership, the Gitea-backed ledger source remains
the ledger authority, the object key remains the temporary-asset ownership
binding, PostgreSQL remains the one copy of Plaid item bindings, and exact-self
remains an identity fact.

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
user.social:read
user.social:write
user.ledgers:read
user.ledgers:write
user.public_keys:read
user.public_keys:write

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
The current runtime preserves the existing three ledger scopes and credential
reachability for compatibility, normalizing them to effective capabilities and
authentication assurance; it does not mint or require these future grants.

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

| Canonical action                       | Transport aliases                              | Preserved credential ceiling                         | Relationship requirement                         |
| -------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| `user.profile.read`                    | `GQL Query.userProfile`                        | session, or OAuth/API key with `ledger.read`         | `user#can_read_profile`                          |
| `user.profile.search`                  | `GQL Query.getUserByExactMatch`                | browser session only                                 | exact-self `user#can_read_profile`               |
| `user.profile.update`                  | `GQL Mutation.updateUsername`, `updateProfile` | browser session only                                 | exact-self `user#can_write_profile`              |
| `user.delete`                          | `GQL Mutation.deleteAccount`                   | browser session or OAuth                             | exact-self `user#can_write_lifecycle`            |
| `user.credentials.list`                | GraphQL/REST/MCP API-key list                  | session, or OAuth/API key with `ledger.admin`        | exact-self `user#can_read_credentials`           |
| `user.credentials.create`              | GraphQL/REST/MCP API-key create                | session, or OAuth with `ledger.admin`; never API key | exact-self `user#can_write_credentials`          |
| `user.credentials.revoke`              | GraphQL/REST/MCP API-key revoke                | session, or OAuth/API key with `ledger.admin`        | key owner has `user#can_write_credentials`       |
| `user.billing.status.read`             | `GQL Query.subscriptionStatus`                 | browser session only                                 | exact-self `user#can_read_billing`               |
| `user.billing.checkout.create`         | `GQL Mutation.createSubscriptionSession`       | browser session only                                 | exact-self `user#can_write_billing`              |
| `user.billing.portal.create`           | `GQL Mutation.createStripePortalSession`       | browser session only                                 | exact-self `user#can_write_billing`              |
| `user.billing.subscription.cancel`     | `GQL Mutation.cancelSubscription`              | browser session only                                 | exact-self `user#can_write_billing`              |
| `user.billing.subscription.resume`     | `GQL Mutation.resumeSubscription`              | browser session only                                 | exact-self `user#can_write_billing`              |
| `user.billing.subscription.upgrade`    | `GQL Mutation.upgradeSubscription`             | browser session only                                 | exact-self `user#can_write_billing`              |
| `user.ai_usage.read`                   | `GQL Query.aiCfoUsage`                         | session, or OAuth/API key with `ledger.read`         | exact-self `user#owner`                          |
| `user.social.feed.read`                | `GQL Query.getFeed`                            | browser session only                                 | exact-self `user#can_read_social`                |
| `user.social.follow.create`            | `GQL Mutation.followUser`                      | browser session only                                 | exact-self `user#can_write_social`               |
| `user.social.follow.delete`            | `GQL Mutation.unfollowUser`                    | browser session only                                 | exact-self `user#can_write_social`               |
| `ledger.social.star.status.read`       | authenticated `Ledger.isStarred`               | session, or OAuth/API key with `ledger.read`         | current `ledger#can_read_contents`               |
| `ledger.social.star.create`            | `GQL Mutation.starLedger`                      | session, or OAuth/API key with `ledger.write`        | current `ledger#can_read_contents`               |
| `ledger.social.star.delete`            | `GQL Mutation.unstarLedger`                    | session, or OAuth/API key with `ledger.write`        | current `ledger#can_read_contents`               |
| `ledger.catalog.read`                  | ledger list/search GraphQL + REST              | session, or OAuth/API key with `ledger.read`         | exact-self `user#can_read_ledgers`               |
| `ledger.metadata.read`                 | ledger metadata GraphQL + REST                 | anonymous only when public; otherwise read scope     | current `ledger#can_read_contents`               |
| `ledger.reports.read`                  | reports/vocabulary/analysis GraphQL/REST/MCP   | anonymous only when public; otherwise read scope     | current `ledger#can_read_contents`               |
| `ledger.journal.read`                  | journal/context GraphQL + REST/MCP             | anonymous only when public; otherwise read scope     | current `ledger#can_read_contents`               |
| `ledger.accounts.read`                 | account GraphQL + REST/MCP                     | anonymous only when public; otherwise read scope     | current `ledger#can_read_contents`               |
| `ledger.files.read`                    | file GraphQL + REST/MCP resource/tool          | anonymous only when public; otherwise read scope     | current `ledger#can_read_contents`               |
| `ledger.files.write`                   | file GraphQL + REST/MCP edit                   | session, or OAuth/API key with `ledger.write`        | current `ledger#can_write_contents`              |
| `ledger.repository.read`               | commit GraphQL                                 | anonymous only when public; otherwise read scope     | current `ledger#can_read_contents`               |
| `ledger.shell.read`                    | BQL GraphQL + REST/MCP                         | anonymous only when public; otherwise read scope     | current `ledger#can_read_contents`               |
| `ledger.archive.read`                  | archive REST and signed-URL GraphQL            | anonymous only when public; otherwise read scope     | current `ledger#can_read_contents`               |
| `ledger.entries.write`                 | entry GraphQL + REST/MCP edit                  | session, or OAuth/API key with `ledger.write`        | current `ledger#can_write_contents`              |
| `ledger.pull_request.read`             | pull-request details GraphQL                   | session, or OAuth/API key with `ledger.read`         | current `ledger#can_read_contents`               |
| `ledger.pull_request.create`           | pull-request creation GraphQL                  | session, or OAuth/API key with `ledger.write`        | current `ledger#can_write_contents`              |
| `ledger.pull_request.approve`          | pull-request approval GraphQL                  | session, or OAuth/API key with `ledger.write`        | current `ledger#can_write_contents`              |
| `ledger.pull_request.reject`           | pull-request rejection GraphQL                 | session, or OAuth/API key with `ledger.write`        | current `ledger#can_write_contents`              |
| `ledger.create`                        | `GQL Mutation.createLedger`                    | session, or OAuth/API key with `ledger.admin`        | exact-self `user#can_write_ledgers`              |
| `ledger.administration.update`         | `GQL Mutation.updateLedger`                    | session, or OAuth/API key with `ledger.admin`        | current `ledger#can_write_administration`        |
| `ledger.administration.delete`         | `GQL Mutation.deleteLedger`                    | session, or OAuth/API key with `ledger.admin`        | current `ledger#can_write_administration`        |
| `ledger.collaborators.list`            | `GQL Query.listLedgerCollaborators`            | session, or OAuth/API key with `ledger.admin`        | current `ledger#can_read_collaborators`          |
| `ledger.collaborators.permission.read` | `GQL Query.getLedgerCollaboratorPermission`    | session, or OAuth/API key with `ledger.admin`        | current `ledger#can_read_collaborators`          |
| `ledger.collaborators.update`          | `GQL Mutation.addOrUpdateLedgerCollaborator`   | session, or OAuth/API key with `ledger.admin`        | current `ledger#can_write_collaborators`         |
| `ledger.collaborators.delete`          | `GQL Mutation.deleteLedgerCollaborator`        | session, or OAuth/API key with `ledger.admin`        | current `ledger#can_write_collaborators`         |
| `ledger.collaborators.leave`           | `GQL Mutation.leaveLedger`                     | session, or OAuth/API key with `ledger.admin`        | current explicit collaborator `ledger#can_leave` |
| `user.public_keys.list`                | `GQL Query.listPublicKeys`                     | session, or OAuth/API key with `ledger.admin`        | exact-self `user#can_read_public_keys`           |
| `user.public_keys.read`                | `GQL Query.getPublicKey`                       | session, or OAuth/API key with `ledger.admin`        | exact-self `user#can_read_public_keys`           |
| `user.public_keys.create`              | `GQL Mutation.createPublicKey`                 | session, or OAuth/API key with `ledger.admin`        | exact-self `user#can_write_public_keys`          |
| `user.public_keys.delete`              | `GQL Mutation.deletePublicKey`                 | session, or OAuth/API key with `ledger.admin`        | exact-self `user#can_write_public_keys`          |

These actions are permissions; the `read`/`write` operational class in
`op-class.ts` is only the stable rate-budget and legacy audit category. Every
alias in a row reaches the protected method and the same action before data
access. A signed caller who lacks the relationship receives the existing
actionable forbidden error; an anonymous caller to a private ledger receives
authentication-required. A Gitea/database relationship-source outage is logged
and audited as `error` and surfaces as service unavailable, never as forbidden,
not-found, or empty data. Composite authorization reads one fresh source snapshot
per resource for all relationships in that action and emits one decision; a
later call re-reads every source and audits independently.

Plaid uses a runtime-only `bank_connection` locator that contains the canonical
ledger ID and, when targeted, internal item row IDs. The locator is never a
tuple. Each targeted evaluator call re-reads the item and requires its current
user and immutable ledger binding to match the current Gitea repository.

| Canonical action                      | Customer/background entry point | Preserved credential/provenance ceiling                         | Current relationship requirement                                |
| ------------------------------------- | ------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| `bank.connections.list`               | list connections                | session, or OAuth/API key with `ledger.admin`                   | bank-connection read                                            |
| `bank.connection.read`                | read one connection             | session, or OAuth/API key with `ledger.admin`                   | bound item + bank-connection read                               |
| `bank.accounts.read`                  | read item/ledger accounts       | session, or OAuth/API key with `ledger.admin`                   | current user/ledger query; bound item when targeted + bank read |
| `bank.link.create`                    | create Link token               | interactive session/OAuth with `ledger.admin`; never API key    | bank-connection write                                           |
| `bank.link.update`                    | create update-mode Link token   | interactive session/OAuth with `ledger.admin`; never API key    | bound item + bank-connection write                              |
| `bank.link.exchange`                  | exchange Link public token      | interactive session/OAuth with `ledger.admin`; never API key    | bank-connection write                                           |
| `bank.connection.unlink`              | unlink item                     | session, or OAuth/API key with `ledger.admin`                   | bound item + bank-connection write                              |
| `bank.accounts.reconcile`             | reconcile shared accounts       | session, or OAuth/API key with `ledger.admin`                   | bound item + bank-connection write                              |
| `bank.account.mapping.update`         | update account mapping          | session, or OAuth/API key with `ledger.admin`                   | bound item + bank-connection write                              |
| `bank.account.currency.update`        | update account currency         | session, or OAuth/API key with `ledger.admin`                   | bound item + bank-connection write                              |
| `bank.connection.status.refresh`      | refresh item status             | session, or OAuth/API key with `ledger.admin`                   | bound item + bank-connection write                              |
| `bank.transactions.read`              | list staged transactions        | session, or OAuth/API key with `ledger.read`                    | bank read + ledger-content read                                 |
| `bank.transaction.categories.suggest` | suggest categories              | session, or OAuth/API key with `ledger.read`                    | bank read + ledger-content read + AI write                      |
| `bank.account.mapping.suggest`        | suggest account mappings        | session, or OAuth/API key with `ledger.read`                    | bound item + bank read + ledger-content read + AI write         |
| `bank.transactions.sync`              | manual/webhook/scheduled sync   | session/OAuth/API key with `ledger.write`; webhook or scheduler | bound item + bank write + ledger-content write                  |
| `bank.transactions.submit`            | submit staged transactions      | session, or OAuth/API key with `ledger.write`                   | all bound items + bank write + ledger-content write             |
| `bank.transactions.delete`            | delete staged transactions      | session, or OAuth/API key with `ledger.write`                   | all bound items + bank write + ledger-content write             |
| `bank.webhook.item.apply`             | apply verified item webhook     | runtime-issued `plaid_webhook` only                             | bound item + bank-connection write                              |

Here, bank read/write means `ledger#can_read_bank_connections` or
`ledger#can_write_bank_connections`; ledger-content read/write means the
matching `ledger#can_*_contents` relationship. The two MCP bank tools group
operations of one operational class. Their tool ID therefore has no single
transport-level action; the selected service method performs the exact action
above before doing work. GraphQL and REST aliases map directly to the same
actions. Operation IDs remain AsyncLocalStorage audit metadata and are never
service parameters, relationship facts, or tuples.

Every operation-table row has exactly one of a canonical action or an explicit
`nonPdpReason`. Authentication ceremonies, public product configuration, public
probes, and the public social exclusions therefore cannot become silent gaps.
Mounts outside the application gate—including signed webhooks, metrics/admin
ingress, infrastructure routes, and discovery—are independently exhaustive in
`always-public.ts`. Protected actions invoked below a transport root are listed
with their rationale in `DIRECT_ONLY_ACTIONS`. Coverage tests enforce all three
inventories in both directions.

Additional composite assisted-ingestion and AI actions:

| Canonical action              | Transport aliases                                | Preserved credential ceiling                          | Relationship requirement                  |
| ----------------------------- | ------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------- |
| `assisted.file.parse`         | `GQL Mutation.parseFile`                         | session, or OAuth/API key with `ledger.read`          | exact-self + temporary-asset owner        |
| `assisted.receipt.parse`      | GraphQL and agent receipt parser                 | session, or OAuth/API key with `ledger.read`          | temp owner + ledger contents/assets read  |
| `assisted.categories.suggest` | `GQL Query.suggestTransactionCategories`         | session, or OAuth/API key with `ledger.read`          | ledger contents read + AI write           |
| `assisted.receipt.insert`     | GraphQL and agent receipt insertion              | session, or OAuth/API key with `ledger.write`         | temp owner + ledger contents/assets write |
| `temp_asset.upload.create`    | `GQL Mutation.generateTempAssetUploadUrl`        | session, or OAuth/API key with `ledger.read`          | exact-self uploader                       |
| `temp_asset.download.read`    | `GQL Query.generateTempAssetDownloadUrl`         | session, or OAuth/API key with `ledger.read`          | temporary-asset owner                     |
| `ai.model.invoke`             | OpenAI- and Anthropic-compatible REST routes     | session, or OAuth/API key with `ledger.write`         | exact-self AI caller                      |
| `ai.ledger.ask`               | all agent routes and effective read-only mode    | session, or OAuth/API key with `ledger.read`          | ledger contents read                      |
| `ai.ledger.agent`             | write upgrade for self-hosted and sandbox agents | session, OAuth/API key with `ledger.write`, or system | ledger contents write + AI write          |

Agent mode always authorizes `ai.ledger.ask` first. If the caller can read a
public or shared ledger but the independent `ai.ledger.agent` write upgrade is
denied, the turn continues in read-only mode: edit tools are absent, the sandbox
remote is removed, and read-only instructions prohibit mutation. A relationship
source error still fails closed instead of being mistaken for an ordinary
read-only downgrade.

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

Operational `read`/`write` classes continue to select rate budgets and carry
transport operation IDs; they are not permissions. A PDP-routed adapter admits
the authenticated request to its protected boundary, where the catalog applies
the exact credential ceiling and relationship composition. Relationship denial
is a policy-shaped forbidden/not-found result. Failure to read an authoritative
ledger or ownership source is logged and audited as `error` and surfaces as
service unavailable.

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
prevents all protected domain work. Audit persistence itself remains fail-open
so an observability outage cannot suppress an otherwise-authorized operation.

## Bank connections and background sync

Gitea remains the source for ledger identity and permissions; PostgreSQL remains
the source for Plaid item ownership and the numeric ledger binding. The bank
evaluator obtains a current user-scoped Gitea client on every relationship
check. Gitea 403/404 is a relationship denial; dependency/authentication/5xx
failures are audited errors and surface as service unavailable. Targeted actions
also load every named `pitm_` row on each relationship check and require both
`item.userId === principal.userId` and `item.ledgerRepoId === repo.id`.

Ledger-wide reads use data-model queries containing both the authorized numeric
repository ID and caller user ID. Mutations repeat the trusted association in
their SQL predicate: item/user/ledger, account/item, or transaction/account. The
item's `userId` and `ledgerRepoId` are immutable through the update model.

Customer service methods receive `Identity`. Webhooks and jobs receive only a
runtime-issued `PlaidBackgroundPrincipal`, whose provenance is separately
cataloged as `plaid_webhook` or `plaid_scheduler`; it has no session method or
scopes. Webhooks may sync and apply verified item events. Schedulers may sync
but cannot apply item events. Both paths derive user and ledger from the current
item row and then authorize the same canonical sync action used by customers.

Authorization occurs before locks and mutation paths. Denials therefore make no
Plaid, database, ledger, or transaction mutation and do not create a failed sync
log. A relationship-source failure follows the same no-side-effect rule. Each
decision emits its result with request method or background provenance, ledger,
and transport operation/canonical fallback; item IDs and financial arguments
are excluded from audit events.

The ledger control plane follows the same split. `ledger.admin` is the
backward-compatible credential ceiling, while current Gitea ownership or an
admin collaborator rank supplies the independent durable relationship for
administration and collaborator actions. The operation's `admin` class remains
only its destructive rate/audit class and cannot grant reachability. Creation
targets the caller's User resource because the ledger does not exist yet;
quota checks remain domain rules, and successful Fava/Gitea creation is the
source of ownership without a tuple write.

Lifecycle and collaborator methods re-read Gitea on every authorization call.
A downgrade, removal, leave, visibility change, or rename therefore changes the
next decision without a request memo or cross-request cache. Relationship
denials are concealed as `Ledger not found`; Gitea source outages are audited
errors and surface as service unavailable before Fava, Gitea mutation, Plaid
cleanup, or database work. Existing Fava owner/rank predicates, creation quotas,
locks, transaction order, and delete cleanup remain defense in depth.

## Social graph and starring

Gitea remains the only source for profiles, follows, stars, and repository
visibility. Feed, follow/unfollow, and star/unstar methods receive the resolved
`Identity` explicitly. Feed and follow preferences bind to
`user:<identity.userId>`; caller-supplied target usernames are domain arguments
only after that self relationship is authorized. Star operations bind to the
canonical `ledger:<owner/name>` resource and the evaluator calls Gitea on every
decision with the current user's client. A 403/404 is an unreadable
relationship denial; transport, credential-source, and 5xx failures are
audited authorization errors and surface as service unavailable. No Gitea
mutation client is provisioned after either outcome.

Public profile/follower/following/starred-list queries keep their historical
anonymous and nullable/empty-result contracts. Those are discovery responses,
not fallback authorization decisions. `Ledger.isStarred` remains nullable for
an anonymous parent query; when an identity exists, its preference read is
PDP-protected and repository-readable.

Public discovery plus feed/follow retain their old 300/minute budget through
operation overrides; star and unstar retain the write-class 60/minute budget.
No authorization decision is cached, so duplicate roots and direct calls each
recheck current facts and audit independently.

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

Ledger creation and SSH public-key management also target the caller's exact
self User resource. `user#can_write_ledgers` authorizes only the relationship
half of creating a new ledger; it fabricates no ledger relation. Public-key
list/get/create/delete use `user#can_read_public_keys` and
`user#can_write_public_keys` and preserve the current key format and Fava
ownership/not-found behavior.

### Ledgers

A ledger has durable owner, collaborator, and public-access relationships:

```text
administrator = owner ∪ collaborator_admin
writer        = administrator ∪ collaborator_write
reader        = writer ∪ collaborator_read ∪ public_reader
can_leave     = collaborator_admin ∪ collaborator_write ∪ collaborator_read
```

Capability permissions derive from that rank:

```text
can_write_contents       = writer
can_write_administration = administrator
can_write_collaborators  = administrator
can_read_assets          = reader
```

The runtime now evaluates these relationships for assisted ingestion and AI.
For example, a receipt write requires both `ledger#can_write_contents` and
`ledger#can_write_assets`, while receipt parsing requires only contents/assets
reads. Starting an agent conversation requires ledger read access; the separate
write upgrade retains `ledger#can_write_ai`. There is no endpoint-specific
`can_write_receipt` relation. The current credential ceiling remains the
existing three scopes; this cutover does not mint a new scope vocabulary.

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

Only durable or source-derived domain facts enter the relationship evaluator:

- `user#owner` from the user database, only when subject ID equals object ID;
- exact-self social read/write eligibility from that same stable User owner;
- exact-self ledger-creation and public-key eligibility from that User owner;
- API-key owner from current `api_keys.user_id`, resolved to that User's
  credentials permission without copying it;
- `ledger#owner` from the ledger owner lookup;
- exactly one effective `ledger#collaborator_*` rank per caller;
- `ledger#public_reader@user:*` iff the ledger is public;
- runtime social-star readability from a fresh authenticated Gitea repository
  lookup, without persisting the result.
- runtime administration rank and explicit self-collaborator membership from a
  fresh Gitea lookup for every control-plane decision.
- temporary-asset owner from the current `tmp/{userId}/...` key binding. This
  is a trusted ephemeral invariant, not a durable OpenFGA tuple.

Ledger relationships are resolved afresh from current Gitea/Fava facts for each
authorization call. The `authorizeLedger` adapter supplies their decision to
the same TypeScript PDP contract without creating tuples. Under engine adoption
they may later be synchronized to OpenFGA when ADR 0010's reverse-query trigger
is reached. No microservice may write credential-derived, temp-key-derived, or
request-derived tuples.

## Invariants

1. **The authorization module is the only final authority for protected
   actions and authenticated single-ledger rank decisions.** Protected
   Account/API-key/subscription/social/ledger-control-plane/asset/LLM services,
   receipt/agent workflows, and the thin `authorizeLedger` PEP call
   it before domain work; every alias uses those application boundaries.
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
action, composite permission, credential ceiling, service-principal provenance,
wrong-user/foreign-key/temp-key resources, ledger pins, revocation, independent
per-call evaluation and audit, source failure, and GraphQL/REST/MCP-mediated
aliases. Credentials and request context never become FGA tuples.
