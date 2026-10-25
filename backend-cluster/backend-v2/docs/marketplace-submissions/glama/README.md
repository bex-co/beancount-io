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
free-account Terms/Privacy step had already completed at 00:53 UTC.

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

## Scheduled-monitoring follow-through — 2026-10-24T19:56:22Z

The saved private credential remains configured. Glama's ten displayed recent
checks are all successful, from14:19 UTC through the latest check at
**19:53:19 UTC**, which takes1197ms. The public connector remains Healthy and
its historical uptime improves to **3.2% over20days**. Initial server-rendered
UTC times agree with the current UTC clock; hydrated browser times are PDT.
Only the displayed ten-check history is inspected, not an inferred complete
history. The full healthy-day gate remains pending until at least
**2026-10-25T07:01:01Z**; no additional manual test, credential or grant is made.

## Native inspector accounting verified — 2026-10-25T00:19:03Z

The existing public connector's **Try in Browser** link opens Glama's actual
MCP Inspector with the canonical endpoint. Native OAuth identifies Glama MCP
Inspector and returns to glama.ai; only the dedicated synthetic ledger is
selected, with all-ledger access unselected. The previously authorized synthetic
QA boundary is retained, including the native identity/offline/read/write/admin
scopes. No production ledger, model call, payment or new connector is used.

The authenticated native UI discovers **44 tools, 8 resources, 64 resource
templates and 4 prompts**. Structured Cash BQL returns **49.75 USD** before and
after preview. Rendered native request logs expose actual structured
`checkLedger` responses: zero errors, the same commit and identical complete
directive counts before/after (16 transactions, 12 opens, 1 balance, 0 notes).

The first preview exposes a client form limitation: its text field is a
single-line HTML input and removes transaction newlines, producing one projected
parse error. It remains `dry_run: true`, `allowInvalid: false`, `wrote: []`.
The valid single-line note preview then reports **Would add 1 directive to
main.bean. No new bean-check errors.**, with zero projected errors and
`wrote: []`. There are exactly two append tool requests in the native request
log, both previews; no committed directive is written.

Independent authenticated read-only controls surround the native preview and
confirm the identical main-file SHA-256, commit, full directive counts, zero
errors, Cash49.75USD and zero preview-payee rows. These controls are explicitly
separate from the actual Glama UI calls. [Public-safe native and control
evidence](./native-rehearsal-20261025.json) omits tokens, account/contact details
and raw ledger contents. Inspector build and deployed revision are not exposed.

The connector is Healthy with44tools; the newly observed public uptime is4.5%
over20days and its displayed last test is 2026-10-24T23:59 UTC. This is still
short of the full-day gate. w2/088 retains that observation, earliest
2026-10-25T07:01:01Z; no health-day completion or new fixture-qualified host
support is inferred. The separate Install in Client modal generates a direct
Bearer-key recipe; it does not establish OAuth for every listed client.

## Monitor credential coordination — 2026-10-25T01:58:28Z

Read-only [first-party key metadata](https://beancount.io/settings/api-keys)
confirms the existing monitor is **Active**, **ledger.read only**, restricted
to the same synthetic ledger and expiring at the **end of 2026-11-23 UTC**.
Its last use is 2026-10-25T01:53 UTC (minute precision). Key use alone is not
another observed Glama health result or full healthy-day completion.

**Worker assesses by 2026-11-20 UTC**, or earlier actual access failure, through
the existing w2/088 / w6/m8/t003 ownership. If the monitor still needs access
beyond expiry, issue a bounded replacement through the first-party key settings
with exactly the same read-only synthetic restriction, update the existing
[private Test Profile](https://glama.ai/mcp/connectors/io.beancount/beancount/admin/test-profile)
API Key / Bearer field, save and verify actual check success plus persistence.
Keep the DNS proof published. Retain prior grants; let an unneeded key expire.
[Exact dates, routes and responsibility](./claim-progress.json) are recorded
without plaintext. No early replacement, renewal, revocation or polling job
is performed by this coordination change.

## After-one-day health follow-up — 2026-10-25T07:27:41.741369Z

The retained private API Key/Bearer profile remains configured. A new scheduled
check at **2026-10-25T07:20:43.866904Z** succeeds in1252ms, more than24hours
after the first success at2026-10-24T07:01:01Z. The current ten displayed recent
checks all succeed. Public ownership is verified, status **Healthy**, with
**44tools**, canonical endpoint/source and historical uptime**6.1%over21days**.

This completes w2/088's original instruction to recheck after a day and record
observed uptime. [Exact timestamps, current metadata and limits](./health-followup-20261025.json)
retain that the UI exposes only ten recent records: this is not an exhaustive
full-interval export or a continuous100%availability claim. No unseen check
is inferred successful. Existing earlier cohorts and native accounting proof
remain separate, and no manual check/new credential/revocation occurs. Keep
DNS proof and the read-only synthetic monitor; assess renewal by2026-11-20UTC
before end2026-11-23UTC expiry, or earlier actual failure.
