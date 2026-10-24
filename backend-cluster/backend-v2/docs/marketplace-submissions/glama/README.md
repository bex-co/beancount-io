# Glama existing-connector claim progress

At **2026-10-24T00:53:46Z**, normal existing Google identity sign-in and the
explicitly approved Terms/Privacy step complete the free publisher account.
The actual existing-connector claim dialog supplies domain verification for
`beancount.io`. This completes the prior agreement/account gate; it is not an
accepted claim or a healthy connector.

The supported DNS method is a TXT record named `_glama-claim.beancount.io`,
using the exact account-bound verification value displayed in that dialog.
The value is intended for public DNS publication and contains no personal
information according to the actual form; it is retained in ignored task
preparation rather than copied here. Glama re-checks daily, so keep the eventual
proof published. The supported HTTP alternative is `/.well-known/glama.json`;
its current response is 404. Current TXT lookup returns no value, and no
successful Glama claim state is observed.

The DNS operator entry is the real [Cloudflare login](https://dash.cloudflare.com/login).
Its saved publisher Google identity is available, but the actual login button
also accepts a newly displayed Subscription Agreement/privacy/cookie policy.
That concrete additional agreement decision is pending under the browser tool
policy, or the publisher can add the prepared TXT record directly. No record,
claim, private Test Profile or ledger grant is created yet. No backend deployment
or duplicate listing is used as a substitute for domain verification.

The [existing connector admin](https://glama.ai/mcp/connectors/io.beancount/beancount/admin)
will permit the private synthetic Test Profile after ownership is verified.
Public health remains Unhealthy, 0.0% over 20 days, latest displayed check
2026-10-24 00:32 UTC. w2/088 retains the claim/test-profile/full-healthy-day repair;
w6/m8/t003 coordinates later metadata/native checks. See
[claim-progress.json](./claim-progress.json) for the actual state and next action.
