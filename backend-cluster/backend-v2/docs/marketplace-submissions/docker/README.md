# Docker MCP Catalog submission

Submitted on **2026-10-24T01:18:20Z** as [Docker PR #6042](https://github.com/docker/mcp-registry/pull/6042), pending Docker review/publication. [Actual receipt](./submission-receipt.json) and [native rehearsal](./native-rehearsal-20261024.md) retain the observed results and limits.

The entry connects to the hosted Beancount.io service at `https://beancount.io/api-gateway/mcp`. It does not package the service or a ledger engine in a Docker image. The three files under `servers/beancount-io/` are intended for the same directory in [docker/mcp-registry](https://github.com/docker/mcp-registry).

The entry uses Streamable HTTP, OAuth and dynamic tool discovery. `tools.json` is deliberately `[]`; its contents are discovered after the user authorizes the connection. `beancount-io.personal_access_token` and `BEANCOUNT_IO_PERSONAL_ACCESS_TOKEN` are Docker credential identifiers, not credentials or instructions to publish a key. The [MCP guide](../../mcp.md) explains scopes, the hosted-ledger boundary and confirmation requirements.

## Current maintainer review gate — 2026-10-28 UTC

PR6042 remains OPEN/unmerged with zero reviews/comments. Separate reads of the
two existing workflow runs still report **action_required**; no new workflow
execution or actionable failure is observed. [Current review evidence](./review-followup-20261028.json)
keeps this distinct from [completed Oct26native expiry/renewal acceptance](./secretservice-native-acceptance-20261026.json).
Docker maintainers must approve/run, review/merge/import; worker then verifies
the published catalog installation. Next manual reviewOct31UTC or actual
workflow/feedback/publication earlier. Reviewer-key assessment remains dueOct29,
with current expiry endOct31; no key/grant or native run is repeated today.

## Verified preparation

On 2026-10-21, the actual upstream Go commands passed against Docker MCP Registry revision `49b643ce3fc73e6ee80bb962719b6e2990e3d397`, using Go 1.26.4 and the existing Prettier 3.8.1. From a checkout of that upstream revision, copy this `servers/beancount-io/` directory into its `servers/`, then run:

```sh
go run -mod=readonly ./cmd/validate --name=beancount-io
go run -mod=readonly ./cmd/catalog beancount-io
```

The corresponding Taskfile commands are `task validate -- --name=beancount-io` and `task catalog -- beancount-io`. Generation writes `catalogs/beancount-io/catalog.yaml`. The authored registry entry uses an `oauth` list; the generated gateway catalog converts it to `oauth.providers`. These formats are related, but are not interchangeable.

The validator checked formatting, the public icon, remote transport and dynamic OAuth configuration. It did not authenticate or execute a ledger tool. Its license check explicitly skips remote entries without a source project. Beancount.io repository code uses MIT; the generated local test catalog's default owner/license metadata does not establish the hosted service's source license.

## Runtime and submission gates

Use the dedicated QA account with synthetic ledgers for the OAuth/tool rehearsal.
`DOCKER_CONFIG` alone does not isolate this gateway version's home-directory
catalog database; use uniquely named temporary catalog records and remove only
those records afterward. Keep credentials in the runtime secret store.

On 2026-10-21, digest-verified standalone v0.44.1, using a temporary OCI catalog
and `DOCKER_MCP_IN_CONTAINER=1`, completed OAuth discovery and dynamic client
registration. The first browser attempt had the wrong account and was canceled;
its Chrome-blocked cancellation redirect was not bypassed or counted as a
successful callback. Supported cleanup confirmed no OAuth token was present.

A later rehearsal established the dedicated QA browser session and selected
only its intended synthetic ledger on the real consent page. Authorization
explicitly requested `ledger.read ledger.write` through
`oauth authorize beancount-io --scopes 'ledger.read ledger.write'`; omitting
`--scopes` had requested only identity access, which would not prove ledger
access. No grant was approved or token obtained. The callback process has since
exited, so restart that same narrowly scoped native flow after approval. The
remaining gate is the specific temporary access decision, then authenticated
discovery, one known read, a supported `dry_run` preview, unchanged-state and
callback verification, followed by review. Docker Desktop and QA sign-in are
not the current gates. Consent alone does not establish an authorized journey.

Docker MCP Gateway v0.44.1 is a prerelease, published 2026-09-23. Its CLI has changed since the registry contribution guide: `catalog import` is absent, while current catalog commands support conversion from legacy catalogs. Inspect the chosen version's help and use its supported catalog/profile flow. The gateway README documents `DOCKER_MCP_IN_CONTAINER=1` for feature checks outside Docker Desktop; this alone does not prove that every OAuth service is available. No persistent Docker Desktop configuration is part of this preparation.

For this version, a successful legacy-catalog conversion produced an empty
server list with the generated fixture. The supported
`catalog server add <temporary-oci-reference> --server file://<entry-file>`
path accepted a single-server entry with the gateway's `oauth.providers`
shape and made the server available for OAuth. Local entry files must resolve
under `~/.docker/mcp/catalogs`. Inspect the actual catalog contents rather than
treating command exit status as proof that the server was imported; no remote
catalog was published by this local operation.

The [remote contribution guide](https://github.com/docker/mcp-registry/blob/main/CONTRIBUTING.md#-adding-a-remote-mcp-server) requires these three files and OAuth testing, followed by a Docker-team-reviewed upstream pull request. The actual contribution is now submitted as PR #6042; this does not establish approved public catalog availability. Use the private credential-sharing channel linked by Docker only when the operator proceeds with review; never attach credentials to a commit, pull request, or public board.

## Renewed native preparation — 2026-10-22 UTC

The standalone gateway is restored in task scratch from the official v0.44.1
Darwin arm64 release. The downloaded archive matches the release API's SHA-256
`4c00011371aa1e04931aed31bf4f3fd044ec58c4fc7ddeaaf6c5a5c445307321`,
and the executable reports v0.44.1. The existing Docker engine answers version
29.8.2 through its existing OrbStack context; no second engine or backend stack
is created and no global CLI plugin is installed.

A uniquely named local OCI catalog and profile each contain exactly one remote
server. Actual `catalog show` and `profile show` confirm the canonical endpoint,
Streamable HTTP and the generated `oauth.providers` shape. No client is
automatically connected. These records remain ready for the narrow synthetic-QA
rehearsal. They establish configuration preparation, not OAuth, tool discovery,
a ledger query, a write preview or publication.

At this preparation snapshot, Chrome opens but browser control is unavailable,
so no native authorization callback is started. The later restored-browser
attempt below clears that access limitation. The retained Cursor grant does
not provide Docker authorization.

## Restored-browser consent preparation — 2026-10-22 UTC

Browser control is restored. Official standalone gateway 0.44.1 starts the
same supported authorization flow with explicit `ledger.read ledger.write`.
The actual consent identifies “MCP Gateway - beancount-io”, the official
`mcp.docker.com/oauth/callback` return proxy, and the existing canonical MCP
resource. Only the intended synthetic QA ledger is selected; all-ledger access
remains unselected. The final access action awaits its exact action-time
confirmation. No OAuth grant or token is obtained and no accounting tool runs.

The native listener at `127.0.0.1:54321/callback` times out and exits with
`callback timeout: context deadline exceeded`. After approval, restart the
same client/scope flow and inspect its fresh consent before completing it;
the old page cannot prove a successful callback. Native query, supported
dry-run preview, unchanged-state checks and the separately authorized upstream
review remain open. The prepared page and expired-listener log are retained
under ignored `backend-cluster/backend-v2/tmp/w6-native-20261022T0818/`.

## Primary references

- [Remote entry example](https://github.com/docker/mcp-registry/blob/49b643ce3fc73e6ee80bb962719b6e2990e3d397/servers/linear/server.yaml)
- [Registry validation command](https://github.com/docker/mcp-registry/blob/49b643ce3fc73e6ee80bb962719b6e2990e3d397/cmd/validate/main.go)
- [Registry catalog command](https://github.com/docker/mcp-registry/blob/49b643ce3fc73e6ee80bb962719b6e2990e3d397/cmd/catalog/main.go)
- [Gateway server-entry specification](https://github.com/docker/mcp-gateway/blob/main/docs/server-entry-spec.md)
- [Gateway standalone usage](https://github.com/docker/mcp-gateway#usage)
- [Gateway v0.44.1 prerelease assets](https://github.com/docker/mcp-gateway/releases/tag/v0.44.1)

## Current native and submission outcome — 2026-10-24 UTC

The publisher confirms the previously displayed synthetic-only access steps.
The actual native OAuth callback/code exchange and official Gateway
query/preview/unchanged-state journey complete; detailed CLI/keychain and Desktop
visibility limits are in the [dated rehearsal](./native-rehearsal-20261024.md).
The current upstream validator, catalog generator and all Go tests pass. Actual
PR #6042 contains exactly the three reviewed files, including tested minimal
ledger scopes in its setup readme. No credentials are included.

The receipt-stage task is complete. Docker reviewers still own approval and
publication. The official private test-credentials form is now submitted with an
accepted receipt, as recorded below; the PR checklist is updated without secret
content. The reviewer credential remains limited to the approved synthetic ledger. Follow
this existing PR and its actual checks, then verify the public catalog path;
no duplicate contribution or live-publication claim is made.

## Earlier private review-access preparation — 2026-10-24T01:50:07Z

The real Docker private form requires the PR URL, contact email and testing
credentials. No field was filled with a credential or account password. The
first-party token dialog supports a single ledger restriction, read/write
without administration and an expiration date. A draft named
`docker-mcp-review-6042` is prepared for only the synthetic QA ledger, with
`ledger.read ledger.write`, no `ledger.admin`, expiring at the end of
2026-10-31 UTC. **No token has been created or shared.**

The exact decision to generate that credential and transmit it to Docker Inc.'s
private review form is pending. This is separate from the already completed
native Docker client's OAuth grant. The [public-safe progress record](./reviewer-access-progress.json)
contains no credential. At01:50 UTC the existing PR is still open/mergeable,
with no comments or reported checks; no upstream CI pass is inferred.
Continue other targets while this private-access/reviewer condition remains.

## Private reviewer access submitted — 2026-10-24T19:52:18Z

After the publisher's explicit approval, the first-party UI creates exactly one
`docker-mcp-review-6042` credential: **ledger.read + ledger.write**, **no admin**,
restricted to the dedicated synthetic `mcp-agent-eval` ledger. Saved metadata
confirms that restriction and expiration at the **end of 2026-10-31 UTC**
(Oct31,16:59 PDT in the local UI). No new subscription, account password or
account-wide key is supplied. These are saved-metadata checks; the new key has
not been used for an accounting request. Earlier official Gateway native
OAuth/query/dry-run evidence remains independently recorded above.

The [official private form](https://forms.gle/6Lw3nsvu2d6nFg8e6) receives the
existing PR URL, contact address, credential and synthetic-only review
instructions. One Submit action reaches the actual receipt, observed at
**2026-10-24T19:51:56Z**: **Got it. We'll email you with a resolution.**
Instructions require read/query first and `appendLedgerText` write previews
with `dry_run: true`, `allowInvalid: false`, without committed accounting changes.
The retained key is private; its plaintext is absent from public files and
cleared from automation memory after the accepted receipt.

The existing [PR #6042](https://github.com/docker/mcp-registry/pull/6042) now has
its test-credential checkbox checked, with only scope/expiry/receipt metadata.
The API update response remains open, unmerged and mergeable, with the same
three-file contribution. No new review or upstream-check result is inferred
from that metadata update. The finite submission task w6/m9/t002 can close;
actual review/publication and public catalog/native verification remain under
t006. If review needs access after October31, arrange renewal through the same
private channel. Do not resubmit the form or create another PR.

## Current native session repaired — 2026-10-25T00:28:48Z

The later failure previously recorded only in the LobeHub metadata packet is
now reproduced in its owning Docker record. Actual Gateway discovery exposes
only eight management tools, no service resources/templates, and logs
`initialize: Unauthorized` with the stored OAuth credential. The existing
engine is available; the local profile and canonical endpoint are retained.

Supported same-client `oauth authorize --scopes 'ledger.read ledger.write'`
completes the native callback for only the synthetic QA ledger. It explicitly
reports **access:true / refresh:false**. The known macOS legacy-keychain erasure
error still yields CLI exit1 after the new collision-resistant credential is
stored; this is not reported as a clean CLI exit. The actual unmodified Gateway
then successfully uses that credential:44service tools plus8management tools,
8 resources and64templates. No credential is copied to this packet.

The fresh native journey,2026-10-25T00:27:27.707Z–00:27:31.993Z, passes one
balanced-transaction `appendLedgerText` preview with `dry_run:true`,
`allowInvalid:false`, zero new errors and `wrote:[]`. Native before/after reads
prove identical commit, all entry counts, main-file SHA-256, zero validation
errors, Cash49.75USD and zero preview-payee rows.
[Current repair and precise limits](./native-repair-20261025.json) preserve
the earlier successful rehearsal rather than replacing it with this later run.

**Renewal is separate:** the minimal read/write command returns no refresh
token. Adding offline_access, with and without openid, reaches repeated
synthetic-ledger consent rather than an observed callback/token exchange.
Those incomplete callback listeners are stopped; the working scoped grant
is retained. Public DCR metadata supports offline_access but does not retain
server-side grant_types, so a narrow-registration or server-side grant cause
is not proved. Current access repair is complete; **w6/046** owns the
independent renewable-flow diagnosis/fix. Reauthorize through the supported
scoped flow if the current access token later expires. Do not claim automatic
refresh, revoke the retained grant or replace the private reviewer key.

The actual upstream [Security Review](https://github.com/docker/mcp-registry/actions/runs/40049180641)
and [Code/Server Validation](https://github.com/docker/mcp-registry/actions/runs/40049180736)
runs are `action_required`, awaiting maintainer approval, with zero executed
jobs at 2026-10-25T00:13 UTC. That is a concrete upstream workflow-approval gate,
not an executed failing test. The private reviewer form remains accepted;
publication/native catalog installation stays under m9/t017.

## Reviewer credential coordination — 2026-10-25T01:58:28Z

Read-only [first-party API-key metadata](https://beancount.io/settings/api-keys)
confirms the existing reviewer credential is **Active**, limited to the same
synthetic ledger, **ledger.read + ledger.write / no admin**, and expires at
the **end of 2026-10-31 UTC**. Last used is **Never used**; this is metadata,
not a reviewer-key runtime test or a conclusion about code review.

**Worker / m9/t017 assesses by 2026-10-29 UTC**, or earlier actual access failure
or private reviewer request. If access is needed beyond expiry, preserve the
same recipient/scope/ledger boundary and coordinate a bounded replacement
through Docker's [already accepted private review channel](https://forms.gle/6Lw3nsvu2d6nFg8e6).
Use a supported response edit or existing private reviewer reply when offered.
A separate renewal/edit URL is unverified: if needed, Docker must supply its
secure update route under existing PR6042; do not duplicate the accepted form
or publish credentials in a public comment. Verify saved bounds/expiry and
actual recipient use when observable. Keep retained grants and let an unneeded
key expire. [Exact coordination and read-only evidence](./reviewer-access-progress.json)
record the future condition; no new key, renewal, revocation or automation occurs.
Native OAuth renewal remains the separate w6/046.

## Renewable consent source repair — 2026-10-25 UTC

The same native offline/read/write flow still loops after the earlier consent
binding deployment. A real-provider regression proves the owning source bug:
a fresh Grant incorrectly copies only the missing-scope delta from the old
SSO grant, losing its existing read/write scopes. Two shared-cookie upgrades
fail, while fresh-cookie offline and same-scope controls pass. The minimum
fix grants the complete supported request for that selected resource, keeping
the newly approved ledger selection and existing credential checks.

Five cases now pass, including actual provider refresh exchanges. Required
backend validation passes 389 suites/6,976 tests, typecheck, formatting/targeted
lint and unchanged OpenAPI. [Source proof, native-runtime limits and next action](./oauth-renewal-repair-20261025.json)
keep hosted rollout/native refresh acceptance pending. The current standalone
macOS launcher bypasses Desktop through DOCKER_MCP_IN_CONTAINER=1, which also
skips the vendor's initial refresh scheduler. Neither a new access token nor
waiting under that launcher proves automatic renewal. No reviewer key or
retained grant is replaced/revoked.

The source repair is shipped in **37f5a25b6**. At2026-10-25T02:38Z its rollout
is **unverified**, following loss of the existing deployment browser connection;
the available CLI/strict SSH checks do not provide a verified alternate route.
[w6/046](../../../../../.pm/w6/done/046.md) is parked with exact access and
normal-runtime/expiry conditions. Inspect deployment history before retrying
the rollout. Controlled refresh tests are complete; deployed native callback,
refresh capability and actual scheduled refresh are still pending.

## Actual rollout and offline callback repair — 2026-10-25 UTC

The browser connection recovered. After checking existing deployment history,
the worker deployed public4d4857a6824bc5965cc3dff841a3d319c6df2121 containing
37f5a25b6; actual UI reports Deploy live/SUCCESS, backend healthy and all three
commands exit0. Deployment access is no longer an operator blocker.

At04:05UTC the same original Gateway0.44.1 client completes offline consent,
callback and token exchange with **access:true, refresh:true**. The native CLI
still exits1 on its known legacy-keychain erase AFTER storing the new
credential. The subsequent unmodified Gateway passes nine accounting/resource
calls and one preview, with zero errors and unchanged commit/counts/file
SHA256/Cash49.75USD/marker absence. This proves the stored credential works.

[Updated evidence](./oauth-renewal-repair-20261025.json) retains the nonzero
CLI result and the distinction from actual automatic refresh. Only an observed
scheduled refresh across real expiry remains. The worker is checking supported
Linux CE on the existing daemon with a fresh secure credential store; Docker
Desktop is not asserted to be required. No host tokens are exported or borrowed.

## Supported Linux CE expiry test — 2026-10-25T19:16:55.137Z

The supported native scheduler now runs in a client-only Linux container on
the existing Docker daemon. Official release Gateway0.44.1 and
docker-credential-pass0.9.12 archives pass their published SHA256 checks. The
base image reports HEAD, so the actual executable is the unchanged release
binary that reports v0.44.1. A fresh isolated pass/GPG store holds only this
client's new synthetic-only DCR grant; no host credential is copied. The
transient GPG key has no passphrase and private files have owner-only access.

The [vendor-supported CE mode](https://github.com/docker/mcp-gateway/blob/v0.44.1/docs/oauth-ce-mode.md)
uses `DOCKER_MCP_USE_CE=true`, `DOCKER_MCP_IN_CONTAINER=0` and Docker's
`credsStore: pass`. Register the one-server local OCI catalog with the
supported `catalog create --server file://...` command, and make the same
remote server available in the default legacy catalog for initial scheduling.
Use `oauth authorize beancount-io --scopes 'openid offline_access ledger.read ledger.write'`,
select only the intended synthetic ledger, then run the native Gateway with
`--servers beancount-io --catalog docker-mcp.yaml --secrets <empty-env-file>`.
The task-specific callback port54339 has host-loopback-only exposure and a
container-local TCP bridge to the native loopback listener. This is a client
runtime; the hosted MCP endpoint, backend and existing daemon are reused.

Native callback succeeds with access+refresh. The CLI again exits1 after
saving the current credential because absent legacy-entry removal fails,
now reproduced with Linux pass as well as macOS. Do not seed a legacy entry
or hide the result. The unchanged Gateway connects, discovers44service
tools/8 resources/64templates/4 prompts, completes baseline read controls and
logs its running CE OAuth provider loop.

**Acceptance is in flight:** original real expiry is
**2026-10-25T20:09:12.214754078Z**. The connected test observes metadata only
while the native scheduler runs, then requires access/refresh rotation and
post-expiry accounting plus exactly one dry-run with unchanged-state controls.
No automatic refresh or post-expiry success has yet been observed.
[Exact runtime, checksums and acceptance boundary](./oauth-renewal-repair-20261025.json)
replace the earlier runtime-setup blocker; worker owns the pending observation,
with no new operator input. [The newer0.44.2 release comparison](https://github.com/docker/mcp-gateway/compare/v0.44.1...v0.44.2)
changes only Go build/toolchain files, not this OAuth implementation.

## Actual scheduled rotation and remaining native failure — 2026-10-25 UTC

The real-expiry test has finished. Native scheduling initiates refresh at
approximately20:09:02UTC, ten seconds before the original20:09:12UTC expiry.
The in-client observer sees changed access/refresh fingerprints and advanced
expiry21:09:02.981908656UTC at20:09:13UTC. No new authorization occurs during
this observation. This proves an actual native scheduled refresh exchange.

Full acceptance **fails**: after the original expiry, the first native
`appendLedgerText` dry-run returns Unauthorized. One preview is attempted,
zero previews succeed, and the later read/unchanged-state controls are not
reached. Those controls are not reported as passing. The background test has
exited; it is no longer awaiting expiry.

The Gateway log shows the new token was saved, but deleting the absent
legacy pass entry fails. [TokenStore.Save](https://github.com/docker/mcp-gateway/blob/v0.44.1/pkg/oauth/token_store.go)
returns that error; [refreshTokenCE](https://github.com/docker/mcp-gateway/blob/v0.44.1/pkg/oauth/provider.go)
returns before the [connection reload](https://github.com/docker/mcp-gateway/blob/v0.44.1/pkg/gateway/run.go#L716-L739).
The cached native connection therefore retains its expired bearer. No reload
appears in the actual log. This is the supported client/helper integration
gate, not another unobserved Beancount consent-loop failure.

**Unblock:** Docker supplies a supported client/helper fix or runtime that
handles absent legacy entries and reloads its cached OAuth connection. Worker
then proves native post-expiry query/one-preview/unchanged-state acceptance.
The0.44.2 release changes no relevant OAuth code. Keep retained grants; do not
seed a legacy credential or patch a vendor binary to manufacture acceptance.
The [evidence packet](./oauth-renewal-repair-20261025.json) preserves the exact
partial success and failure. Docker listing review remains independently pending.


## Supported SecretService alternative prepared — 2026-10-26T05:17:24Z

The official credential-secretservice 0.9.12 binary matches release checksums.
In an isolated non-root client-only Linux runtime, absent-entry deletion
returns zero twice and a synthetic store/get/erase roundtrip passes, with
network disabled and no OAuth credential used. This is a supported alternative
to the pass-helper cleanup error; no vendor binary or old store is patched.

The fresh native Gateway 0.44.1 profile/catalog and private D-Bus/keyring are
ready. Native public-client DCR registration succeeds; the new helper contains
one client-metadata entry and zero OAuth-token entries. The authorization page
is prepared for exactly the existing synthetic evaluation ledger, with global
ledger access unselected. Creating this new client grant requires browser
action-time confirmation, which has been requested; Approve access is not
clicked. Actual expiry, rotation/reload and post-expiry accounting are unproved.
[Exact source, preflight and grant boundary](./secretservice-preflight-20261026.json)
retain the current result separately from the earlier actual pass failure.

The original PR #6042 is independently OPEN/REVIEW_REQUIRED with zero reviews
and comments. Both original workflow runs still conclude action_required,
requiring Docker maintainer approval. The new helper does not clear that review
gate. No submission, comment, reminder, reviewer-key rotation or deploy repeats.

Observed at05:22:09UTC: the unapproved authorization listener has exited on callback timeout;
zero OAuth tokens are stored. After confirmation, renew the request for the
same registered client and inspect the fresh ledger boundary before approval.
Do not click the expired interaction or infer a grant/test result from it.


## Confirmed native grant and actual-expiry test — 2026-10-26T06:26:12Z

The publisher confirms the scoped test. The same registered client completes
one fresh synthetic-only consent; native authorize exits zero with securely
stored access+refresh and no error. Four initial ledger/read-state controls
pass, and the unmodified CE provider loop runs. Original token expiry is
**2026-10-26T07:18:05.161089714Z**. The [current record](./secretservice-preflight-20261026.json)
retains the successful callback and in-flight boundary; automatic rotation,
connection reload and post-expiry accounting are not yet claimed.

The [live 046 note](../../../../../.pm/w6/done/046.md) is owned by the worker while
this bounded observation runs. It then requires exactly one dry-run plus
unchanged commit, entry counts, file hash, cash and zero persisted marker.
No further publisher input, token export, grant revocation, manual refresh,
new deployment or duplicate submission is needed. Earlier timeout and pass
failures remain historical evidence. Listing review remains separate.

## Actual rotation and first-party resource repair — 2026-10-26T07:20:39Z

The resumed unmodified SecretService native attempt crosses original expiry
07:18:05UTC and observes access+refresh rotation. Native save succeeds and reload
is attempted. MCP initialize returns Unauthorized and the Gateway removes
capabilities; the attempted dry-run cannot reach the server. Fresh connection
control also fails with the same retained credential. Metadata-only diagnosis
shows opaque access format, rather than the required MCP-audience JWT.

[Exact new source repair](./refresh-resource-repair-20261026.json) proves that
an `openid` refresh omitting `resource` selects UserInfo by default. Three real
provider regressions fail before the minimal backend repair; all 118 OAuth tests
pass afterward, including scope narrowing, ledger pins and audience rejection.
Full backend checks, source ship, existing-service rollout and retained-grant
native acceptance continue under046. The earlier observer timeout and original
pass-helper failure remain separately recorded. No new approval or token export.

## Resource repair deployed; native recovery running — 2026-10-26T07:40:36Z

`cd20fa75f` ships the minimal refresh-resource repair after398backend suites,
7,463 tests, typecheck, targeted lint and unchanged OpenAPI pass. The existing
service reports Deploy live/SUCCESS, all three commands exit0, and backend and
ledger health checks pass. The logs identify the same public source revision.

The same grant/keyring remains in use. An unmodified native CE scheduler is
already running from 07:30:09 UTC across its retained credential's actual expiry
**08:17:55.56880575UTC**. Initial tools are absent with the earlier opaque access;
after automatic refresh/reload, require restored tools and native query/one
preview/unchanged-state controls. No new authorization, fake expiry or manual
refresh is used. [Current rollout and acceptance boundary](./refresh-resource-repair-20261026.json).

## Actual native renewal acceptance complete — 2026-10-26T08:18:07Z

[Full actual acceptance](./secretservice-native-acceptance-20261026.json) closes
w6/046. The retained grant's native CE scheduler crosses its original actual
expiry 08:17:55.56880575 UTC, rotates access+refresh and reloads44 tools,4 prompts,
8 resources and67 resource templates. Refreshed access is now the expected JWT,
with the original read/write scopes and exact synthetic ledger pin preserved.

All9 native accounting/resource calls succeed after expiry:four controls before and
four after exactly one dry-run. The preview has `dry_run:true`, `wrote:[]`, one directive
and zero validation errors. Commit, entry counts, file hash, cash and zero
persisted marker remain unchanged. The SDK/Gateway process exits0. No manual
refresh, expiry edit, reauthorization, credential export or vendor patch is used.

This is recovery from the earlier opaque credential: the process starts with
zero tools and automatically restores them after the deployed repair and next
scheduled rotation. Earlier failed attempts remain historical; the pass-helper
defect is not claimed fixed. Official Docker gallery publication/install remains
under maintainer review. Source CI passes398 suites/7,480 tests and Secret scan.
The owned client runtime is stopped; the keyring volume and all grants remain.

## Due reviewer-access assessment — 2026-10-29 UTC

Actual first-party saved metadata still shows the retained Docker reviewer
credential Active, read/write without admin and pinned to the same synthetic
ledger. It is Never used and retains the Oct31expiry; no plaintext token or
runtime success is inferred. [Current assessment](./reviewer-access-assessment-20261029.json)
records that PR6042/comments and both existing runs remain unchanged/open/
action_required. Current-window access remains valid; access after expiry is
not arranged. No longer review window or supported secure response-edit route
is observed. Browser control becomes unavailable after the successful metadata
read, so no new private-form/mailbox check is claimed.

Reassess byOct30UTC or actual reviewer/private renewal request. If longer
access is required, obtain Docker's supported secure update route through the
accepted channel before bounded replacement. No orphan key, public credential,
duplicate form, new grant, expiry extension or revocation is performed.
