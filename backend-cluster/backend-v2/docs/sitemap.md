# Public ledger sitemap

`GET /api-gateway/sitemap.xml` is an anonymous crawler artifact. It lists active
user profiles and public repositories, with seven URLs per repository: overview,
journal, balance sheet, income statement, trial balance, statistics, and holdings.
It keeps the existing outside-gate registration and always-public census entry;
it does not introduce a customer operation on GraphQL or MCP.

Generation reads users in ID order, in pages of 1,000. At most ten users are
processed concurrently, with 100 ms between batches. Each user's unauthenticated
Gitea repository requests advance one page at a time until an empty page. The
requested page size is 100, but a smaller server-side cap does not indicate the
last page. Private repositories are excluded after traversal progress is checked.
Overlapping repository entries are deduplicated; repeated pages without progress
and traversal safety limits fail generation instead of publishing a prefix.

A first-page 404 from the user repository endpoint means that the upstream user
is missing and can be omitted. Later-page 404s, permission errors, throttling,
timeouts, malformed responses, and database errors make the generation incomplete.
They must not replace the cached artifact. Logs describe the stage/page and public
username, without including upstream response bodies or credentials.

## Caching and failures

The application file cache lives in `.cache/` and retains a complete successful
generation for 24 hours. Expired XML is served immediately while one in-process
refresh runs. Concurrent cold requests share that same generation. Failed refreshes
retain the previous artifact; without a cached artifact, failure returns HTTP 500.
HTTP responses separately carry `Cache-Control: public, max-age=3600` (one hour).
Sitemap URLs are discovery information; ledger authorization is always checked by
the requested page/API, independently of old sitemap entries.

Profile and overview entries are slashless and path segments are URL-encoded.
XML escaping is applied after constructing the canonical URLs. The current
single sitemap rejects generations beyond 50,000 URLs or 50 MiB of uncompressed
UTF-8 XML, without truncating. If a complete inventory exceeds either limit,
introduce a sitemap index and complete child documents before publishing the
larger inventory. Raising traversal limits or silently dropping URLs is not a fix.

## Release verification

The pre-change public artifact observed on 2026-10-02 had 9,341 URLs and was below
both protocol limits. It included only 50 `open_ledger` overview URLs and omitted
`stock-example`. The exact live Gitea page-size cap was not established.

After deployment, allow the application cache to regenerate and downstream HTTP
caches to expire before treating a public response as evidence for the new code.
A previously generated cache is not automatically certified complete by a deploy.
Verify fresh XML counts/byte size, exactly one canonical stock-example overview
plus each eligible report, excluded private fixtures, and direct HTTP 200 responses
for sampled profile/overview URLs. Inspect generation-failure diagnostics if the
artifact stays stale. Do not flush unrelated application caches.

The artifact's Search Console submission is separate from production robots.txt
ownership. Preserve its existing submission; advertising it through the owning
robots.txt service is an independent discovery improvement.
