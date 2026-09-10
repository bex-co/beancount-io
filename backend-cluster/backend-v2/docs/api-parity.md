# API parity implementation contract

The accepted target is the 2026-09-06 operation inventory in
[`parity-baseline.json`](../src/server/api/__tests__/fixtures/parity-baseline.json).
It freezes all 144 operation IDs, their canonical authorization actions and
operational classes, existing bindings, and eligible surfaces independently of
the mutable registry. There are 105 eligible GraphQL operations, 111 REST
operations, and 107 MCP operations. Initial missing bindings are 0, 53, and 63.

The [milestone coverage map](../../../.pm/w1/m10/COVERAGE.md) assigns the missing
families. Backend tests do not import the board, which can move when archived.
`parity-baseline.test.ts` rejects removed operations, changed authorization or
operational classes, lost client bindings, and changed eligibility. The existing
surface-parity test tracks the still-unimplemented bindings; its nonzero counts
must drop only as real adapters land. Passing either test is not a declaration
of complete behavioral parity.

## Preserved authority

The current `AuthorizationService` action catalog is the authority, rather than
old exemption prose or the operation's rate-limit class. In particular:

- `user.delete` accepts session and OAuth credentials and checks the exact-self
  user lifecycle relationship. It does not require a native OAuth client ID or
  `ledger.admin`; API keys remain forbidden. The MCP OAuth audience can therefore
  reach this action once the account-scoped adapter exists. No credential-policy
  expansion is required to close this row.
- User profile updates/search, private social actions, billing, and authentication
  ceremonies retain their existing credential exclusions.
- API-key minting requires OAuth on MCP, admin capability, a paid plan, and scope
  and ledger-pin narrowing. An API key cannot mint a successor.
- Ledger and bank calls select a target, then the protected service checks current
  relationships and the credential pin. Target selection never grants authority.

OAuth audiences remain resource-specific: application API tokens target
`{issuer}/v1`; MCP tokens target `{issuer}/api-gateway/mcp`. API keys can use both
surfaces. Permission parity means the same authorized domain action and current
relationships, not accepting an access token at the wrong resource.

## Named structural exceptions

These are the deliberate, frozen exceptions the parity contract carries. They
are recorded here independently of any counter, so closeout can audit them and
none can dissolve into stale exemption prose:

1. **Legacy first-ledger fallback.** `Mutation.addEntries`, `Query.ledgerMeta`,
   and `Query.journalEntries` preserve their historical explicit-target →
   credential-pin → first-accessible-ledger resolution on every surface. This
   fallback is a compatibility contract only; modern MCP tools never guess a
   ledger — an unpinned credential must select one.
2. **Anonymous denials say "authenticate."** A denied anonymous principal
   receives 401, not 403, on every surface — `authorizeOrThrow`'s deliberate
   mapping. Public-ledger reads that the PDP authorizes anonymously succeed
   without a credential.
3. **Blank API-key ledger scope means inherit.** The one normalization lives in
   `ApiKeyService` (never stored as `""`); transports pass blanks through
   rather than adding a second boundary rule that could drift.
4. **Concealed temp-asset denials.** Operations composing a temp-asset
   ownership relationship (`parseFile`, `parseReceipt`,
   `insertReceiptTransaction`, temp-asset download) conceal relationship
   denials as not-found; credential and ledger-relationship failures stay 403.
5. **Assisted parses keep read-capability ceilings.** File/receipt parsing and
   temp-upload creation permit read-capability credentials by existing policy,
   despite their write-class transport budgets; the operation class is
   rate-limit metadata, not a credential grant.
6. **`user.delete` needs no admin scope.** Sessions and OAuth may delete the
   exact-self account; API keys may not. No native-client or `ledger.admin`
   requirement exists.
7. **Raw-byte and browser-ceremony exclusions.** Archive bytes have no GraphQL
   twin (bytes, not fields); login/OTP/billing/Plaid-Link ceremonies stay on
   their browser surfaces with written reasons in the op-class table.

## Target selection

Ledger tools accept an optional `ledger` argument using `owner/name`:

| Credential | Argument         | Result                                          |
| ---------- | ---------------- | ----------------------------------------------- |
| Pinned     | Omitted          | Use the pin.                                    |
| Pinned     | Same ledger      | Use that ledger.                                |
| Pinned     | Different ledger | Refuse before domain work.                      |
| Unpinned   | Explicit ledger  | Authorize the selected ledger in the service.   |
| Unpinned   | Omitted          | Ask the client to select a ledger; never guess. |

Resource URIs select the ledger using their owner/name components. Discovery and
account-scoped operations do not require a fabricated ledger ID. MCP remains
stateless and resolves identity for each HTTP request. Existing pinned clients
continue to work. Account-wide OAuth grants require explicit user consent.

## Contract evidence required per operation

Each adapter family must record and exercise its actual arguments and defaults,
optional filters and pagination, output representations, domain effects, and
failure behavior through HTTP REST, GraphQL execution, and an MCP client.
Shared service mocks alone do not prove the adapter contract. In particular:

| Family                             | Required comparisons                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Reports and journals               | account/filter/time/interval/conversion, page boundaries, ordering, empty results, hierarchy, currencies and exact numeric values.    |
| BQL                                | Typed columns/rows and text rendering, including nulls and non-table results.                                                         |
| File and entry writes              | Safe paths, structured validation, source hashes, atomic batches, commit effects, source ranges, and equivalent supported previews.   |
| API keys                           | Expiry, names, scopes, inherited restriction, public metadata, one-time plaintext and revocation.                                     |
| Bank operations                    | Every discriminator branch, account filters, explicit ledger target, preview support, staging/submit effects and composite authority. |
| Downloads                          | Selection, expiry, authorization of the full download path, content type and actual bytes; a link alone is not proof.                 |
| Administrative/assisted operations | Exact target, current authority, quotas, ownership, side effects and dependency failure handling.                                     |
| All families                       | Wrong audience/scope/target, revocation, source outage, rate budget, audit operation/target and concurrent request isolation.         |

Grouped MCP tools must enumerate executable branches and select the operation's
exact protected service. Approximate BQL or raw-file alternatives cannot close a
structured operation without proving its input, result and effect contract.
Protocol envelopes and documented field-name aliases may differ. An input
supported by one eligible adapter cannot simply be discarded by another.

## Development-deployment verification (2026-09-07)

Verified against the `deploy/docker-mac` stack (real Gitea, PostgreSQL ×2,
Redis, ledger service; disposable user and ledger; no production data, paid
provider calls, or committed secrets):

- Full signup ceremony over GraphQL (OTP from dev logs), session sign-in,
  paid-plan-gated API-key minting over REST — one unpinned admin key, one
  pinned read-only key.
- Writes and readback across surfaces on one real repository: REST entry
  batch → typed BQL rows → journal; an MCP `addLedgerEntries` note read back
  through a pinned credential's journal resource; rename there-and-back;
  stale source-slice refusal without mutation.
- Reads with live data: statements, accounts, trial balance, commits, file
  contents, archive ZIP bytes, legacy metadata (compat `userId` does not
  select the caller), anonymous tier quotas.
- Denials with no side effects: read-only star 403, read-only collaborator
  read 403, MCP read-only write `isError`, pin-widening refusal.
- MCP client contract: `yarn mcp:conformance` 7/7 against the deployment
  (RFC 9728 pointer, discovery, method refusal, 24 tools with output
  schemas, refusal dialect, error masking, advertised path), plus a real
  Streamable HTTP SDK client discovering 66 resource templates and running
  the workflows above.

Not covered live: S3-backed asset flows and Plaid bank flows (no external
credentials in routine verification — their contracts are held by the
in-process adapter suites with controlled fixtures), live LLM provider
quality, and driving the Codex binary itself; both coding agents consume the
same MCP contract the conformance checklist and SDK client exercised.

## Completion

Completion requires zero deferred eligible bindings, complete contract evidence,
generated schema compatibility, a running CI parity gate, development workflow
verification, and documented Claude Code/Codex usage. The frozen exclusions and
baseline IDs remain visible. An unfinished adapter or required verification keeps
the milestone open even if all currently implemented tests pass.

## Implemented adapter work awaiting milestone completion

- MCP ledger tools accept an explicit `ledger` target for unpinned credentials;
  pins remain ceilings, and account tools need no ledger.
- Analysis resources advertise and validate optional query parameters. Resource
  paths decode once; duplicate and unknown report query parameters fail before
  domain work. `analysis-parity.test.ts` compares actual REST routes and MCP SDK
  calls with every supported report parameter.
- `runBqlQueryStructured` exposes `ledger.queryShell` without changing
  `runBqlQuery`'s text envelope. `bql-parity.test.ts` exercises REST routing,
  GraphQL execution, and an MCP client against the real `LedgerShellService`,
  with controlled authorization and ledger-client dependencies. It checks typed
  cells, text results, and refusal before querying. These are adapter/service
  contract tests, not deployment or live-PDP evidence.

The live registry now has 0 REST and 0 MCP deferred operations. The frozen
baseline remains unchanged; none of these changes closes the milestone or
substitutes for its remaining workflow, authorization, and deployment checks.

Metadata and accessible/owned/search catalog operations now have MCP resource
bindings; owned listing and search also have REST bindings. Pinned accessible
listing is implemented in `LedgerWorkflow`, so REST, GraphQL, and MCP all return
only the pinned ledger on page one, with later pages empty. Owned and search
operations preserve upstream page/filter/sort inputs and omit other ledger IDs
from the returned page when pinned. Unpinned callers retain the existing catalog
workflow. Legacy `ledgerMeta` now delegates to the same workflow from all
three adapters. Its compatibility `userId` argument does not select the caller;
only the authenticated identity does. The named legacy operation preserves its
historical explicit-target → credential-pin → first-ledger resolution order.
This legacy default must remain visible in the final contract audit; it is not
the default for ordinary MCP ledger tools.

Income statement, balance sheet, overview, documents, and account listing now
have MCP resources; overview and documents also have REST routes. Statements
and overview use GraphQL's USD/monthly defaults and accept the account filter.
`statement-parity.test.ts` exercises real domain services and the PDP through
all three adapters, comparing supported field-name mappings, decimal strings,
full filters, defaults, status semantics, and revocation refusals.

Structured, plaintext, and account journals plus source-file listing have MCP
resources; plaintext/account journals and source files also have REST routes.
The structured REST journal now accepts all four subtype arrays as JSON-encoded
query parameters. `journal-parity.test.ts` exercises the real services/PDP via
all adapters. Source-file reads now use the registry's canonical file-read
action. Legacy `journalEntries` now has separate REST/MCP bindings over
`LedgerWorkflow.getLegacyJournal`; posting conversions, computed fields,
filter mappings, and pagination metadata are shared with GraphQL. Its legacy
pin/first-ledger selection is preserved. The legacy adapter tests exercise
both default choices, empty pages, all query arguments, and revoked access.

Latest commit, paginated commit history, and commit details now have REST and
MCP bindings backed by the existing repository services. Branch defaults and
pagination match GraphQL. Empty latest-commit reads return JSON `null` with
HTTP 200. `commit-parity.test.ts` exercises actual adapters and the real PDP
with controlled relationship and upstream clients, including revoked access,
Unicode branch names, diff statistics, and empty repositories.

Collaborator listing, permission inspection, add/update, deletion, and leaving
now have REST/MCP adapters over `LedgerCollaboratorsWorkflow`. The two reads
remain administrative resources; `manageLedgerCollaborators` dispatches the
three mutations to their distinct canonical actions. `collaborator-parity.test.ts`
uses the real workflow, PDP, and source-backed relationship evaluator with
controlled upstream membership data. It verifies persisted membership effects,
subsequent revocation, owner-leave refusal, tier limits, default permissions,
encoded identifiers, pagination, scope/pin ceilings, and source outages.
Relationship denials retain the existing 404 concealment, while credential
failures are 403. The existing missing-member and partial permission-fetch
behavior is preserved rather than replaced by a transport-specific fallback.

SSH public-key list/get/create/delete now have REST and MCP bindings through
`LedgerPublicKeyService`. They preserve exact-self administrative authorization
and account behavior for ledger-pinned credentials. The `managePublicKeys`
create/delete branches retain separate canonical actions and validate their
own inputs. `public-key-parity.test.ts` runs the actual adapters, service, PDP,
and exact-self relationship evaluator with controlled per-user key storage;
it checks ownership refusals, pagination, creation/deletion effects, duplicate
failures, default/read-only flags, and insufficient-scope refusals before
upstream work. Repository key-format validation remains upstream; these tests
do not establish live Gitea integration.

Ledger creation, update, and deletion now have REST bindings and a grouped
`manageLedgers` MCP tool over `LedgerWorkflow`. Creation uses account authority;
update/delete resolve an existing ledger under its pin and administrative
relationship. Nullable command types now accurately describe GraphQL's existing
nullable inputs. The lifecycle adapter tests exercise actual workflows, the PDP,
repository state, templates, quotas, and transactional local cleanup with
controlled external dependencies. The existing failure ordering remains: remote
bank revocation precedes repository deletion; repository failure rolls back
local metadata but cannot undo that revocation. Failed repository-ID lookup
continues to skip bank cleanup without blocking deletion, as in GraphQL.

Pull-request inspection, file-change creation, merge approval, and close rejection
now have REST/MCP bindings. `PullRequestWorkflow` shares the former GraphQL
credential checks and result shaping across adapters; missing credentials and
repository review failures retain their domain results. MCP marks unsuccessful
results as `isError` while preserving `result`. PR details now use the configured
Gitea client factory rather than a hard-coded internal URL. The service validates
all repository-relative patch paths before branch creation. Adapter tests compare
branch contents, review state, diffs/statistics, defaults, malformed-path
refusals, ledger-pin/scope restrictions, and per-call revocation using the real
workflow/service/PDP with controlled repository and relationship dependencies.
These tests do not prove live Gitea merge behavior or remove the existing risk
of a partially populated branch after a later upstream failure.

Asset URL discovery now has REST/MCP adapters, and archive URL discovery has an
MCP resource plus an anonymous-capable REST route at
`GET /api-gateway/v1/ledgers/{owner}/{name}/archive-download-url`. Anonymous
callers reach it only for ledgers the PDP authorizes publicly; a denied
anonymous request gets 401 (authenticate), and PDP outages surface as 503
without touching the archive origin. Repository-ID and asset-path validation live in the shared
`LedgerAssetService`, so every adapter rejects invalid targets before signing.
`download-url-parity.test.ts` follows generated URLs through controlled HTTP
object-store/archive fixtures, compares file bytes and response metadata, tests
fixture URL expiry, and verifies that revoked archive access fails before
upstream download. This is not live S3 expiry evidence: production presigned
asset URLs retain their configured lifetime after issue. MCP archive-byte operations are implemented separately below; discovery URLs
alone do not close those coverage rows.

Canonical and legacy archive downloads now use `LedgerArchiveService` across
REST and MCP. REST streams the protected response; MCP returns the same bytes
as a base64 blob with upstream MIME type and Content-Disposition metadata.
The canonical MCP resource joins the existing REST archive counter and 30/minute budget (the legacy alias left MCP in w2/m27; its REST twin keeps the counter).
The archive adapter tests consume real HTTP fixture responses and MCP SDK
resources, comparing ZIP bytes and extracted tar content, checking revocation,
pin/path refusals, and upstream failure handling. Missing archives remain 404;
other upstream/network failures now become shared service-unavailable errors.
The raw-byte GraphQL exclusion and legacy public HTTP behavior remain intact.

The public health and feature-flag reads now have REST and MCP resource bindings.
REST explicitly permits anonymous callers for these declarations; its other
routes retain their credential requirement. Adapter tests preserve the GraphQL
feature-flag argument contract and verify that public configuration access does
not bypass authentication on protected ledger routes.

The public tier-quota catalog also has REST and MCP bindings backed by the same
subscription-service method as GraphQL. Adapter tests compare all fields and
unlimited sentinels and reject any access to billing dependencies during this read.

Profile reads now use AccountService through REST and MCP as well as GraphQL.
REST preserves the nullable anonymous identity probe; authenticated requests
retain the shared read capability and exact-self checks. MCP defaults an omitted
userId to its authenticated caller and keeps the same protected service boundary.

Account deletion now has REST and MCP bindings that retain the canonical
USER_DELETE policy: interactive sessions and OAuth are eligible, API keys are
not, and no extra admin scope or target selector is introduced. Real adapter
tests run the account service against controlled external dependencies and local
transaction state, checking cleanup order and its existing partial-failure
boundaries. This is not live Stripe/Plaid/Gitea deletion evidence.

Public follower, following, and starred-repository lists now have REST and MCP
resource adapters. Real-adapter tests preserve pagination defaults, page-sized
totals, encoded usernames, date/field mappings, empty pages, and the existing
service fallback to empty results on upstream failure. Ledger star mutations remain separate work.

Public profile discovery now also has REST and MCP resource bindings. Adapter
tests exercise the existing authenticated self-enrichment, public-only other-user
and anonymous views, optional follow status, dates, source failures, and partial
activity enrichment. The original public-profile credential exception remains
unchanged; this does not introduce a new scope or ledger-pin policy.

Ledger star/unstar now use the existing LedgerWorkflow through REST and a grouped
MCP tool. Adapter tests check both branches, idempotent starring, failed-write
results, pin and scope refusals, relationship outages, and revocation between
calls. They preserve read-relationship plus write-capability authority.

Temporary asset URL creation now has REST and MCP bindings alongside GraphQL:
`POST /api-gateway/v1/temp-assets/upload-url`,
`GET /api-gateway/v1/temp-assets/download-url?objectKey=...`, the
`generateTempAssetUploadUrl` tool, and the `tempAssetDownloadUrl` resource.
All delegate to `AssetStorageService` with the authenticated identity. The current
read-capability ceiling applies to both operations; denial for object ownership
is concealed as not found. Optional filename/MIME metadata and configured URL
lifetimes are retained. Cross-adapter tests use the real service and source-backed
PDP with a controlled S3 signer. Actual byte transfers, expired URL behavior,
and storage cleanup remain deployment verification work; no live storage result
is implied by these tests.

AI CFO usage is available at `GET /api-gateway/v1/account/ai-cfo-usage` and the
`beancount://account/ai-cfo-usage` resource. Both use the existing protected usage
service and GraphQL's two-field mapping, with no caller-selected account. Tests
execute all three adapters through real usage services and the source-backed PDP
with controlled billing and usage-model fixtures. They cover current-month and
cross-account isolation, pinned and unpinned grants, API keys, missing capability,
unknown account selectors, and usage-store failure. No usage increments occur.
The existing tier lookup's FREE fallback on billing errors is unchanged.

File parsing is exposed through `POST /api-gateway/v1/import/parse-file` and the
`parseFile` MCP tool. Both accept GraphQL's `s3ObjectKey` and `fileFormat` and
return its complete `rows` contract. Real LLM-service/PDP tests execute all three
adapters with controlled storage, quota, and extraction boundaries, comparing
Unicode text, signed amounts, per-actor charging, ownership and capability
refusals, exhausted quota, and provider failure. These fixtures perform no paid
model calls and do not prove live provider extraction quality.

Receipt parsing now has `POST /api-gateway/v1/ledgers/{owner}/{name}/import/parse-receipt`
and the `parseReceipt` MCP tool. REST uses `s3ObjectKey`; MCP reuses the existing
chat tool's `objectKey` argument and adds explicit/pinned ledger selection.
The service owns current content/asset access, temporary ownership, MIME checks,
quota checks, and combined extraction/recommendation charging. Unknown dates
remain null; absent account recommendations map from GraphQL null to omitted
REST/MCP fields. Tests use real service, account-directive processing, and PDP
with controlled ledger/storage/provider fixtures. Live model quality and
provider/storage deployment behavior remain separate verification work.

File renaming now has `POST /api-gateway/v1/ledgers/{owner}/{name}/rename-file`
and the `renameLedgerFile` MCP tool. Both delegate to `LedgerWorkflow` with
GraphQL's oldPath/newPath/message inputs. MCP adds the existing explicit/pinned
ledger selection contract. The workflow uses the repository's `from_path`
operation; it has no client-SHA or preview parameter. Tests execute real adapters,
workflow, and source-backed authorization against an isolated repository fixture,
checking content preservation, supplied commit messages, collisions, unsafe paths,
and write-access refusals. Actual Gitea commit/atomicity behavior and the broader
file-preview contract still require milestone verification.

Source-slice updates and single/batch deletions now have REST bindings below
`/api-gateway/v1/ledgers/{owner}/{name}/entry-source` and the MCP
`editEntrySource` tool. The three branches preserve GraphQL inputs, checksum
fields, updated checksum results, and deleted-hash arrays through the protected
`LedgerJournalService`. Cross-adapter tests use a source-backed PDP and isolated
ledger fixture to exercise successful changes, stale hashes including a stale
second batch item, denied write access, and unsupported preview arguments.
These tests verify adapter delegation and normalized effects; live ledger-service
atomicity and concurrency behavior remain deployment/integration verification.

`addLedgerEntries` now exposes structured bulk insertion through MCP, and REST's
existing entries endpoint accepts budget and document directives. All ten types
are compared across real REST, GraphQL, and MCP adapters using the real entry
service, writer, and source-backed PDP. Controlled ledger-client fixtures verify
identical built directives, budget custom values, document tags/links, file
routing, commit failure, and write refusals. These tests do not replace live
Beancount validation. REST/MCP-only batch and posting-count restrictions and
transport-only date validation have been removed in favor of the shared ledger
contract. Optional null values normalize in the writer, and GraphQL now accepts
the existing string-valued transaction metadata field. Cross-adapter tests cover
empty and 101-entry requests, explicit nulls, metadata preservation, and rejection
of non-string metadata. Legacy insertion is implemented through the shared compatibility workflow below.

Bank previews now write nothing anywhere on their path: the manual sync's
additive account refresh runs as a preview when `dry_run=true` (would-be new
accounts still count toward the preview, because a real sync creates them
enabled before filtering), and ledger submission validates the target file
before its preview return, so a dry run refuses exactly what the write would.
Reconcile, unlink, and delete previews were audited write-free as built.

The `editLedgerFiles` preview now runs through the same protected service call
as the commit: `LedgerRepoService.changeFiles` accepts `dryRun`, performing the
identical write authorization and safe-path validation and stopping before the
repository commit. Previously a create-only preview never authorized at all.
Neither the preview nor the commit performs Beancount validation — that parity
holds on both sides and remains the ledger service's own concern.

Entry writes have one documented partial-failure boundary, now pinned by test:
the bcio-routed missing-file creation is its own commit before the bulk write,
so a bulk write that then fails leaves the empty routed file in place. The
path attempts no compensating deletion; creation is additive, never
caller-chosen, and a retry finds the file present without committing it again.
Source-slice conflicts keep their checksum contract: a stale hash — including
a stale second item in a delete-many batch — changes nothing.

Rate-limit counters now key on the classified verb, not the transport op id:
every surface's spelling of one operation spends one budget, and a per-op
override declared for any alias follows the verb to the others (conflicting
alias overrides fail at module load). The archive family keeps its shared
cross-verb bucket. Rotating surfaces can no longer multiply a budget.

Legacy `addEntries` is now available at `POST /api-gateway/v1/legacy/entries`
(and, until w2/m27, as the `addLegacyEntries` MCP tool). GraphQL now delegates to the same
`LegacyEntryWorkflow`, which preserves explicit/pin/first-ledger resolution,
legacy amount-string conversion, ignored metadata, Transaction-only acceptance,
and the `{data:"",success:true}` response. Cross-adapter tests exercise the real
workflow, entry service/writer, and source-backed PDP with controlled ledger
clients; existing GraphQL compatibility tests remain green. The legacy fallback
is explicit and does not change modern MCP target selection.

Category suggestion now has
`POST /api-gateway/v1/ledgers/{owner}/{name}/import/suggest-categories` and the
`transactionCategorySuggestions` MCP resource, whose structured transaction list
arrives as one JSON-encoded query parameter (the established journal-filter
pattern). Both keep GraphQL's full input contract — rowIndex/date/payee/
description/amount with no batch minimum — and its suggestion output including
the optional reasoning field. Cross-adapter tests run the real `LLMService` and
source-backed PDP with controlled Fava and provider fixtures, comparing open-
account selection, recent-example extraction, auto_accounts plugin detection,
AI-usage charging, refusals for missing capability, revoked relationships, and
wrong credential pins before quota, exhausted quota, an unconfigured provider,
provider failure, and strict input rejection.
No paid model call occurs; live suggestion quality is deployment verification.

Receipt insertion now has
`POST /api-gateway/v1/ledgers/{owner}/{name}/import/insert-receipt` and the
`insertReceiptTransaction` MCP tool. Both carry GraphQL's complete contract —
`receiptObjectKey` plus an input of date, payee, description, an
arbitrary-count posting list of string decimal amounts, and `documentAccount` —
deliberately wider than the two-posting chat-tool shape, and with no date
defaulting. Cross-adapter tests run the real `LedgerReceiptWorkflow` and PDP:
the S3 strategy's temp-to-permanent promotion, receipt-URL transaction metadata,
and post-write temp deletion; the git strategy's byte fetch, repository file
commit, and link-tagged document-plus-transaction pair; concealed unowned-key
denials; capability, revoked-relationship, and pin refusals before any effect;
and a failed entry write that keeps the temporary asset (the existing
partial-failure boundary, unchanged). Live Gitea/S3 behavior remains deployment
verification.
