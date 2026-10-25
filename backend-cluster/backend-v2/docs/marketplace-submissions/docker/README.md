# Docker MCP Catalog submission

Submitted on **2026-10-24T01:18:20Z** as [Docker PR #6042](https://github.com/docker/mcp-registry/pull/6042), pending Docker review/publication. [Actual receipt](./submission-receipt.json) and [native rehearsal](./native-rehearsal-20261024.md) retain the observed results and limits.

The entry connects to the hosted Beancount.io service at `https://beancount.io/api-gateway/mcp`. It does not package the service or a ledger engine in a Docker image. The three files under `servers/beancount-io/` are intended for the same directory in [docker/mcp-registry](https://github.com/docker/mcp-registry).

The entry uses Streamable HTTP, OAuth and dynamic tool discovery. `tools.json` is deliberately `[]`; its contents are discovered after the user authorizes the connection. `beancount-io.personal_access_token` and `BEANCOUNT_IO_PERSONAL_ACCESS_TOKEN` are Docker credential identifiers, not credentials or instructions to publish a key. The [MCP guide](../../mcp.md) explains scopes, the hosted-ledger boundary and confirmation requirements.

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
contains no credential. At01:50UTC the existing PR is still open/mergeable,
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
8resources and64templates. No credential is copied to this packet.

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
jobs at2026-10-25T00:13UTC. That is a concrete upstream workflow-approval gate,
not an executed failing test. The private reviewer form remains accepted;
publication/native catalog installation stays under m9/t017.
