# Glama ownership verified and authenticated health restored

At **2026-10-24T07:05:54Z**, the existing
[Beancount.io connector](https://glama.ai/mcp/connectors/io.beancount/beancount)
displays **Ownership verified**, **Healthy** and **44 available tools**.
Its private Test Profile reports a successful connection at
**2026-10-24T07:01:01Z**, taking 1348ms.
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

## Authenticated monitoring restored; full healthy day pending

The real [Test Profile](https://glama.ai/mcp/connectors/io.beancount/beancount/admin/test-profile)
now uses **API Key / Bearer Authentication**. A dedicated QA-account credential,
`glama-mcp-health-readonly`, has only `ledger.read` and is restricted to the
synthetic `mcp-agent-eval` ledger. The browser identity was checked against the
local QA configuration before creating it. No write/admin scope is granted.
The token is retained privately in Glama; plaintext is absent from this packet
and cleared from automation memory after verifying persistence.

Saving triggers Glama's native connection test: **success — 1348ms — Healthy**
at **2026-10-24T07:01:01Z**. Reload preserves **API Key Configured** and the
successful history entry. The first-party token metadata confirms actual use at
that time with the same read scope, synthetic restriction and expiry. The public
connector independently changes to Healthy and exposes 44 tools. Its historical
uptime is **0.1% over 20 days**; earlier failures remain in that denominator.
The browser hydrates timestamps into America/Los_Angeles: 00:01:01 PDT on
October 24 is 07:01:01 UTC. The public initial render also reports 07:01 UTC.

The selected expiry is **2026-11-23 UTC day-end** (displayed locally as Nov 23,
03:59 PM PST). **Renew before 2026-11-23 UTC**, retaining the same read-only,
synthetic-only boundary, then verify another actual check. Keep the DNS proof
published for Glama's daily ownership checks.

**Remaining unblock condition:** at or after **2026-10-25T07:01:01Z**, inspect
subsequent actual check history and public health to establish one full healthy
day. A later failure requires investigation and a fresh successful-day window.
Existing w2/088 retains sole ownership of this observation; it is not yet closed.
w6/m8/t003 retains its dependency and original metadata/native acceptance.
Successful initialization and discovery do not establish a ledger query or write
preview through Glama's native client.

## Previous authentication state

Before setup, checks returned HTTP401 with no test credentials. OAuth mode
requested `openid offline_access ledger.read ledger.write ledger.admin` without
an individual scope editor. The supported API-key mode permits the narrower
read-only synthetic monitor used above. A transient authentication-type UI error
recovered on reload before credential creation; it is not a current blocker.
Dated prior observations remain in [claim-progress.json](./claim-progress.json).
