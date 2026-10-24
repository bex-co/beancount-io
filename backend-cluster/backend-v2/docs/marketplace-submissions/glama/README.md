# Glama ownership verified; health authentication remains

At **2026-10-24T06:21:30Z**, the existing
[Beancount.io connector](https://glama.ai/mcp/connectors/io.beancount/beancount)
displays **Ownership verified** and exposes its administration controls.
The canonical connector is retained; no duplicate listing was created.

## DNS and claim completed

The existing Cloudflare `cf` CLI 0.15.0 has a valid authenticated profile and DNS
edit access to `beancount.io`. After an empty exact-name lookup and a successful
dry run, it creates one TXT record, `_glama-claim.beancount.io`, at
2026-10-24T06:11:16.775195Z, with Auto TTL 1. Cloudflare's API readback returns
exactly that one matching record. Authoritative `ajay.ns.cloudflare.com` and
public recursive `1.1.1.1` resolve the exact prepared verification value.

The value's SHA-256 is
`4eaff609b57f793da5c479c26525e0f3dd0af7d43f1a4eabc60d18db4ccacce3`.
The account-bound value is intended for public DNS; this packet retains its hash
instead of copying the value, Cloudflare credentials or private account IDs.
Keep the record published because Glama rechecks domain verification daily.

The actual Glama **Check DNS record** action succeeds. Its existing connector
now shows the ownership badge and permits access to the private Test Profile.
No new Cloudflare authorization, browser login/agreement acceptance, subscription,
backend deployment or existing DNS-record replacement is used.

The earlier Cloudflare-browser agreement gate is therefore resolved by the
already authorized CLI route. The earlier domain/account preparation history is
retained in [claim-progress.json](./claim-progress.json); the approved Glama
free-account Terms/Privacy step had already completed at 00:53UTC.

## Remaining private Test Profile and healthy day

The real [Test Profile](https://glama.ai/mcp/connectors/io.beancount/beancount/admin/test-profile)
was initially set to None and its recorded checks return HTTP401. Its supported
authentication choices are OAuth 2.0 and API Key. OAuth mode is now selected for
preparation, and the page explicitly reports **Not Authenticated**; its automatic
unauthenticated test also returns 401. No OAuth grant, API key or ledger
credential has been supplied to Glama.

The expanded **What Glama sends to your authorization server** panel reports
`openid offline_access ledger.read ledger.write ledger.admin` against the
canonical MCP resource. This UI does not expose an individual scope editor.
Actual private test access remains a separate decision. Prefer the narrowest
supported access to a dedicated synthetic ledger when completing it.

Health still shows Unhealthy, 0.0% over 20 days. The claim is complete, while the
private authenticated check and full healthy day remain under existing w2/088
ownership. w6/m8/t003 subsequently aligns/verifies metadata and the native path.
Prepared auth controls are not successful authentication or repaired health.
