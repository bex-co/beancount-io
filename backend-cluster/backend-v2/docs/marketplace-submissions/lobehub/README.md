# LobeHub hosted connector preparation

Checked 2026-10-21 UTC. The [current first-party publishing guide](https://market.lobehub.com/s/publish-mcp) supports an existing Streamable HTTP service. The [manifest reference](https://market.lobehub.com/s/publish-mcp/references/manifest) defines `cloudEndpoint` as a URL string; `lhm.plugin.json` points directly to the canonical Beancount.io hosted endpoint. The LobeHub identifier `beancount-io` is a platform slug; the official registry identity stays `io.beancount/beancount`.

The published CLI 0.0.42 requires Node ≥22 and nonempty identifier, name, version
and description before first publication. The identifier uses lowercase letters,
digits, underscores and hyphens. No undocumented auth, transport, capability or
JSON-schema fields are invented. Authentication remains OAuth as explained in
the linked MCP guide; the manifest carries no user token or client secret.

## Publisher procedure

1. Search the actual marketplace for canonical endpoint/repository before
   publishing. The current Beancount search has other authors' projects, not a
   confirmed bex-co hosted connector. Do not claim unrelated records.
2. Use the official CLI's browser login and separate `github connect` flow.
   Verify ownership/push access to `bex-co/beancount-io` without a personal fork.
3. With this manifest on public main, run the documented `plugin publish`
   repository command using `--dir` for this directory. Inspect current help
   before using a command; keep auth state outside tracked files.
4. Record the resulting actual listing/processing state and then verify the
   real hosted OAuth/synthetic query/preview path. A processing receipt is not a
   verified public connection.

Current [command reference](https://market.lobehub.com/s/publish-mcp/references/lhm-commands) says `publish` accepts owner/push/admin repository access and can converge a matching unclaimed record. The `claim` discovery command still matches direct GitHub usernames rather than organization collaborators. Org access is a check to perform, not a reason to invent a personal-repository identity or declare the hosted deployment unsupported.

No native LobeHub client journey or server-side publication acceptance has been
established by this manifest. Use the shared [reviewer rehearsal](../../mcp-marketplaces.md#reviewer-rehearsal) with the dedicated synthetic QA ledger and record any interactive account, ownership, agreement or review gate explicitly.

## Actual publisher preflight

Official CLI 0.0.42 read this manifest and reached its user-auth guard:
`Not logged in. Run lhm login first.` The interactive login then reached
LobeHub’s live sign-in page, which requires an explicit checkbox agreeing to
[Terms and Conditions](https://lobehub.com/terms) and
[Privacy Policy](https://lobehub.com/privacy). That agreement is awaiting the
operator’s action-time confirmation under the browser-control policy. No box
was checked, no publisher grant was completed, no GitHub connection was made and
no plugin was submitted. A local format/preflight check is not server-side
validation or ownership proof. The supported hosted deployment remains eligible.

## Fresh publisher follow-through — 2026-10-23 UTC

The current actual marketplace search shows four unrelated authors' projects
and no canonical bex-co hosted connector in its complete displayed result.
The Publish tab still points to the native publishing flow. Official CLI
0.0.42 is restored only to ignored task cache; no tracked dependency changes.

The real native login opens the official app.lobehub.com sign-in and market
OIDC flow. A page-read timeout interrupts browser control; fresh inventory
shows Chrome running but no connected browser. No agreement or GitHub grant
is accepted, and no authenticated publisher or submission receipt is verified.
Restore the existing extension connection, then inspect the actual sign-in,
agreement and repository-permission steps. Restart the native callback if it
expires. This temporary access failure is not a platform eligibility rejection.

### Restored browser and concrete agreement — 2026-10-23T21:22:14Z

The actual sign-in page is now readable. It offers Google/GitHub/Apple sign-in
and the unchecked “I have read and agree” Terms/Privacy control. The exact
agreement confirmation is pending; no checkbox or sign-in provider is activated.
The original native callback expired without successful authentication and must
be restarted after confirmation. Browser connectivity is no longer the remaining
gate. Preserve the canonical manifest and intended publisher identity, then
complete native login, the actual GitHub/repository permission checks and the
supported publication route. No user grant or submission receipt is claimed.
